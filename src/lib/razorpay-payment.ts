/**
 * Server-side payment lifecycle for Razorpay.
 *
 * Flow (all server-side, browser is never trusted):
 *
 *   checkout → createPendingOrder() persists a PENDING order + price snapshot
 *           → Razorpay order is created and attached to that document
 *           → customer pays
 *           → finalizeOrderPayment() verifies the signature, then confirms the
 *             payment entity with Razorpay, then flips pending → paid with ONE
 *             atomic conditional update (called from BOTH verify-payment AND
 *             the Razorpay webhook)
 *           → the customer response is returned immediately
 *           → local bookkeeping runs on the same (fast, in-database) path and
 *             the external Delhivery call is handed off
 *
 * Why the order is created before the gateway call: the previous order was that
 * Razorpay was called first and the local document second, so a database error
 * left money moved with no order anywhere. Now the durable record always exists
 * first, and the gateway id is attached to it atomically.
 *
 * Why nothing external is awaited: Delhivery shipment creation is an outbound
 * HTTP call with its own retry ladder. Awaiting it held the HTTP response open
 * for minutes, which is exactly the reported "payment succeeded but the site
 * takes 4-5 minutes" symptom.
 */
import { connectDB } from "@/lib/mongodb";
import crypto from "crypto";
import Order from "@/models/Order";
import type { IOrder } from "@/models/Order";
import Customer from "@/models/Customer";
import Notification from "@/models/Notification";
import Product from "@/models/Product";
import { generateOrderId } from "@/lib/helpers";
import { getRazorpay } from "@/lib/razorpay";
import {
  couponCustomerKey,
  claimCouponUsage,
  recordCouponUsage,
} from "@/lib/coupons";
import { attemptAutoShipment, type AutoShipmentResult } from "@/lib/delhivery";

export interface PendingOrderData {
  /** Optional client-generated idempotency key for a single checkout attempt. */
  checkoutAttemptId?: string;
  customerName: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  items: Array<{
    productId: string;
    name: string;
    image?: string;
    variant: string;
    qty: number;
    mrp?: number;
    unitPrice?: number;
    basePrice?: number;
    offerDiscount?: number;
    price: number;
  }>;
  subtotal: number;
  subtotalBeforeDiscount: number;
  /** MRP catalog subtotal (Σ base × qty) — display-only "Subtotal". */
  catalogSubtotal: number;
  discount: number;
  promotion?: IOrder["promotion"];
  couponDiscount: number;
  eligibleSubtotal: number;
  coupon?: IOrder["coupon"];
  deliveryCharge: number;
  deliveryProvider?: string;
  shippingWeightGrams: number;
  total: number;
}

export interface FinalizeResult {
  ok: boolean;
  orderId?: string;
  alreadyFinalized?: boolean;
  code?: string;
  error?: string;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * Persist a PENDING order capturing the full checkout snapshot, before any
 * money can move. Idempotent per checkoutAttemptId, so a double click or a
 * retried request reuses the same document instead of creating a second order.
 */
export async function createPendingOrder(
  input: PendingOrderData
): Promise<IOrder> {
  await connectDB();

  if (input.checkoutAttemptId) {
    const existing = await Order.findOne({
      checkoutAttemptId: input.checkoutAttemptId,
    });
    if (existing) {
      console.log("[razorpay-payment] reusing pending checkout attempt", {
        orderId: existing.orderId,
        checkoutAttemptId: input.checkoutAttemptId,
      });
      return existing;
    }
  }

  const address = {
    line1: input.address.line1,
    line2: input.address.line2 ?? "",
    city: input.address.city,
    state: input.address.state,
    pincode: input.address.pincode,
    country: input.address.country || "India",
  };

  const created = await Order.create({
    orderId: generateOrderId(),
    checkoutAttemptId: input.checkoutAttemptId,
    customerName: input.customerName,
    email: input.email,
    phone: input.phone,
    address,
    items: input.items,
    subtotal: input.subtotal,
    subtotalBeforeDiscount: input.subtotalBeforeDiscount,
    catalogSubtotal: input.catalogSubtotal,
    discount: input.discount,
    promotion: input.promotion,
    couponDiscount: input.couponDiscount,
    eligibleSubtotal: input.eligibleSubtotal,
    coupon: input.coupon,
    deliveryCharge: input.deliveryCharge,
    deliveryProvider: input.deliveryProvider,
    shippingWeightGrams: input.shippingWeightGrams,
    total: input.total,
    razorpayOrderId: "",
    paymentStatus: "pending" as const,
    orderStatus: "processing" as const,
    paymentInitiatedAt: new Date(),
  });

  console.log("[razorpay-payment] pending order persisted", {
    orderId: created.orderId,
    checkoutAttemptId: input.checkoutAttemptId,
    total: created.total,
  });
  return created;
}

/**
 * Attach the Razorpay order id to the already-persisted pending order. The
 * empty-string guard makes this a single-shot transition, so two concurrent
 * requests can never bind two gateway orders to the same local order.
 */
export async function attachRazorpayOrderId(
  orderObjectId: string,
  razorpayOrderId: string
): Promise<IOrder | null> {
  const attached = await Order.findOneAndUpdate(
    { _id: orderObjectId, razorpayOrderId: "" },
    { $set: { razorpayOrderId } },
    { new: true }
  );
  if (!attached) {
    console.error("[razorpay-payment] could not attach razorpay order id", {
      orderObjectId,
      razorpayOrderId,
    });
  }
  return attached;
}

/**
 * Mark a pending order as failed when the gateway could not be initialised, so
 * the admin never sees an abandoned "pending" order that can never be paid.
 */
export async function failPendingOrder(
  orderObjectId: string,
  reason: string
): Promise<void> {
  await Order.updateOne(
    { _id: orderObjectId, paymentStatus: "pending" },
    { $set: { paymentStatus: "failed", updatedAt: new Date() } }
  );
  console.error("[razorpay-payment] pending order marked failed", {
    orderObjectId,
    reason: reason.slice(0, 200),
  });
}

/**
 * Close a gateway order that could not be linked to a local order, so a retry
 * cannot leave a payable-but-unknown Razorpay order behind. Best effort: a
 * failure here is logged, never thrown, because the client response must still
 * be an error page rather than a crash.
 */
export async function cancelOrphanGatewayOrder(
  razorpayOrderId: string
): Promise<void> {
    try {
      const razorpay = getRazorpay();
      // Razorpay's own typings omit the cancel endpoint even though it exists.
      const cancellable = razorpay.orders as unknown as {
        cancel: (id: string) => Promise<unknown>;
      };
      await cancellable.cancel(razorpayOrderId);
      console.warn("[razorpay-payment] cancelled orphan gateway order", {
        razorpayOrderId,
      });
    } catch (error) {
    console.error("[razorpay-payment] failed to cancel orphan gateway order", {
      razorpayOrderId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Atomically flips a pending order to PAID after the payment has been verified
 * with Razorpay, then runs the local bookkeeping.
 *
 * Only the first caller to win the conditional update performs the work; every
 * later caller (callback retry, webhook, refresh, browser/webhook race) finds
 * the already-paid order and returns immediately.
 */
export async function finalizeOrderPayment(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  source: "verify" | "webhook" | "reconcile";
}): Promise<FinalizeResult> {
  await connectDB();

  console.log("[razorpay-payment] verification started", {
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    source: input.source,
  });

  // ------------------------------------------------------------------
  // Authenticate the callback BEFORE any idempotency short-circuit, so a
  // request that merely knows a payment id cannot be answered "success".
  // The webhook path authenticates in its own route via the raw-body HMAC.
  // ------------------------------------------------------------------
  if (input.razorpaySignature) {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return { ok: false, code: "GATEWAY_UNREACHABLE" };
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
      .digest("hex");
    if (!timingSafeEqualHex(expected, input.razorpaySignature)) {
      console.error("[razorpay-payment] callback signature mismatch", {
        razorpayOrderId: input.razorpayOrderId,
        source: input.source,
      });
      return { ok: false, code: "SIGNATURE_INVALID" };
    }
  }

  const existing = await Order.findOne({
    razorpayOrderId: input.razorpayOrderId,
  });
  if (!existing) {
    console.error("[razorpay-payment] no local order for razorpay order", {
      razorpayOrderId: input.razorpayOrderId,
      source: input.source,
    });
    return { ok: false, code: "ORDER_NOT_FOUND" };
  }

  // Already settled or refunded: nothing left to do, and never re-run
  // the bookkeeping. A refunded order must not be re-marked paid by a
  // late callback or webhook.
  if (
    existing.paymentStatus === "paid" ||
    existing.paymentStatus === "refunded"
  ) {
    console.log("[razorpay-payment] duplicate callback detected", {
      orderId: existing.orderId,
      razorpayOrderId: input.razorpayOrderId,
      source: input.source,
      paymentStatus: existing.paymentStatus,
    });
    // Self-healing: the FIRST attempt may have died after the paid flip but
    // before Delhivery answered (serverless kills post-response work), which
    // is exactly how paid orders end up with no AWB. Every later duplicate
    // callback — browser retry, Razorpay webhook retry — gets another chance
    // to finish the shipment instead of returning a false "all done".
    if (existing.paymentStatus === "paid" && !existing.waybill) {
      await dispatchShipment(String(existing._id));
    }
    return {
      ok: true,
      orderId: existing.orderId,
      alreadyFinalized: true,
    };
  }

  if (existing.paymentStatus === "failed") {
    return { ok: false, code: "PAYMENT_FAILED" };
  }

  // ------------------------------------------------------------------
  // Authoritative server-side verification with the gateway.
  //
  // The order's own status only says "a payment exists". We additionally fetch
  // the payment entity and require that THIS payment is captured, belongs to
  // THIS order, and matches the amount we calculated and charged. The amount is
  // always taken from the stored order — never from the browser, the webhook
  // body or an admin request.
  // ------------------------------------------------------------------
  const expectedPaise = Math.round(Number(existing.total ?? 0) * 100);
  try {
    const razorpay = getRazorpay();
    const rpOrder = await razorpay.orders.fetch(input.razorpayOrderId);

    if (rpOrder.status !== "paid") {
      console.error("[razorpay-payment] razorpay order not paid", {
        razorpayOrderId: input.razorpayOrderId,
        status: rpOrder.status,
        source: input.source,
      });
      return { ok: false, code: "NOT_PAID" };
    }

    const payment = await razorpay.payments.fetch(input.razorpayPaymentId);

    if (payment.status !== "captured") {
      console.error("[razorpay-payment] payment not captured", {
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        status: payment.status,
        source: input.source,
      });
      return { ok: false, code: "NOT_CAPTURED" };
    }

    if (String(payment.order_id) !== input.razorpayOrderId) {
      console.error("[razorpay-payment] payment belongs to another order", {
        razorpayOrderId: input.razorpayOrderId,
        paymentOrderId: String(payment.order_id),
        source: input.source,
      });
      return { ok: false, code: "PAYMENT_ORDER_MISMATCH" };
    }

    if (Number(payment.amount) !== expectedPaise) {
      console.error("[razorpay-payment] amount mismatch", {
        razorpayOrderId: input.razorpayOrderId,
        expectedPaise,
        actualPaise: Number(payment.amount),
        source: input.source,
      });
      return { ok: false, code: "AMOUNT_MISMATCH" };
    }

    if (payment.currency && String(payment.currency) !== "INR") {
      console.error("[razorpay-payment] unexpected currency", {
        razorpayOrderId: input.razorpayOrderId,
        currency: String(payment.currency),
        source: input.source,
      });
      return { ok: false, code: "CURRENCY_MISMATCH" };
    }
  } catch (error) {
    console.error("[razorpay-payment] gateway verification failed", {
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      message: error instanceof Error ? error.message : String(error),
      source: input.source,
    });
    return { ok: false, code: "GATEWAY_UNREACHABLE" };
  }

  // ------------------------------------------------------------------
  // Atomic transition — the single source of truth for "paid".
  // ------------------------------------------------------------------
  const paid = await Order.findOneAndUpdate(
    { _id: existing._id, paymentStatus: "pending" },
    {
      $set: {
        paymentStatus: "paid",
        orderStatus: "confirmed",
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature ?? existing.razorpaySignature ?? "",
        paymentVerifiedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { new: true }
  ).lean();

  if (!paid) {
    const current = await Order.findById(existing._id).lean();
    if (current?.paymentStatus === "paid") {
      console.log("[razorpay-payment] duplicate callback detected (race)", {
        orderId: current.orderId,
        source: input.source,
      });
      if (!current.waybill) {
        await dispatchShipment(String(current._id));
      }
      return { ok: true, orderId: current.orderId, alreadyFinalized: true };
    }
    console.error("[razorpay-payment] could not finalize order", {
      orderId: existing.orderId,
      source: input.source,
    });
    return { ok: false, code: "FINALIZE_RACE" };
  }

  console.log("[razorpay-payment] payment status changed to paid", {
    orderId: paid.orderId,
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    amountPaise: expectedPaise,
    source: input.source,
  });

  // The order is already PAID and visible to the admin at this point, so no
  // failure below may turn a completed payment into an error response. Any
  // interrupted step stays "pending" in the fulfillment ledger and is retried by
  // the reconciliation cron.
  try {
    await runLocalPostPaymentEffects(paid);
  } catch (error) {
    console.error("[razorpay-payment] local post-payment effects threw", {
      orderId: paid.orderId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
  // Delhivery hand-off is awaited ON PURPOSE. It used to be fire-and-forget
  // after the HTTP response was sent, and on a serverless platform the
  // function is frozen as soon as the response goes out — so the shipment
  // request never happened and the order sat paid with no AWB until (at best)
  // the next daily cron. Awaiting it keeps the work inside a live invocation.
  await dispatchShipment(String(paid._id));

  return { ok: true, orderId: paid.orderId };
}

function markStep(orderObjectId: string, step: string, value: string) {
  return Order.updateOne(
    { _id: orderObjectId },
    { $set: { [`fulfillment.${step}`]: value, "fulfillment.updatedAt": new Date() } }
  ).catch((error) => {
    console.error("[razorpay-payment] could not record fulfillment step", {
      orderObjectId,
      step,
      message: error instanceof Error ? error.message : String(error),
    });
  });
}

/**
 * Post-payment bookkeeping. Every step is a local database write, so the whole
 * thing completes in milliseconds. Each step is recorded on the order so an
 * interrupted run can be resumed by the reconciliation cron instead of being
 * silently lost.
 */
export async function runLocalPostPaymentEffects(
  order: IOrder & { _id: unknown }
): Promise<void> {
  const orderId = String(order._id);

  // Coupon claim + usage history.
  if (order.coupon?.id) {
    try {
      const claimed = await claimCouponUsage(order.coupon.id);
      if (!claimed) {
        console.warn("[razorpay-payment] coupon usage claim lost", {
          couponCode: order.coupon.code,
          orderId: order.orderId,
        });
      }
      await recordCouponUsage({
        couponId: order.coupon.id,
        couponCode: order.coupon.code,
        orderObjectId: orderId,
        orderId: order.orderId,
        customerName: order.customerName,
        email: order.email,
        phone: order.phone,
        customerKey: couponCustomerKey(order.email, order.phone),
        discountAmount: order.couponDiscount || 0,
        orderSubtotal: order.subtotal || 0,
        orderTotal: order.total || 0,
      });
      await markStep(orderId, "coupon", "done");
    } catch (error) {
      await markStep(orderId, "coupon", "failed");
      console.error("[razorpay-payment] coupon claim failed", {
        orderId: order.orderId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  } else {
    await markStep(orderId, "coupon", "skipped");
  }

  // Customer upsert — normalised so "A@x.com" and "a@x.com" stay one record.
  try {
    const email = String(order.email || "").trim().toLowerCase();
    await Customer.findOneAndUpdate(
      { email },
      {
        name: order.customerName,
        email,
        phone: order.phone,
      },
      { upsert: true, new: true }
    );
    await markStep(orderId, "customer", "done");
  } catch (error) {
    await markStep(orderId, "customer", "failed");
    console.error("[razorpay-payment] customer upsert failed", {
      orderId: order.orderId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  // Admin notification.
  try {
    await Notification.create({
      message: `New order #${order.orderId} from ${order.customerName} - ₹${order.total}${
        (order.couponDiscount || 0) > 0 ? ` (coupon ${order.coupon?.code})` : ""
      }`,
      type: "order",
      orderId,
    });
    await markStep(orderId, "notification", "done");
  } catch (error) {
    await markStep(orderId, "notification", "failed");
    console.error("[razorpay-payment] notification failed", {
      orderId: order.orderId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  await decrementStockForOrder(order);
}

/**
 * Idempotent stock decrement, claimed line by line.
 *
 * Each order line is handled in three steps:
 *  1. CLAIM — a conditional $push that only matches while no entry exists for
 *     that product/variant. Two concurrent runs (browser callback + webhook +
 *     cron) therefore cannot both proceed on the same line.
 *  2. APPLY — the $inc only applies when the variant still has enough stock
 *     (`stock >= qty`), so a product can never go negative. The recovery retry
 *     repeats the same guard, so it cannot oversell either.
 *  3. SETTLE — the outcome is written back onto the claimed entry, making the
 *     line terminal.
 *
 * A line left claimed but unsettled means a previous run died between steps, so
 * it is retried. Exactly-once across that single crash window would need a
 * MongoDB transaction, which needs a replica set and is not assumed here; the
 * reconciliation cron and the oversell notification are the safety net.
 */
export async function decrementStockForOrder(
  order: Pick<IOrder, "orderId" | "_id" | "items" | "fulfillment">
): Promise<void> {
  const orderObjectId = String(order._id);
  const settledLines = new Map<string, number>();
  for (const line of order.fulfillment?.stockLines ?? []) {
    if (line.settled) {
      settledLines.set(`${line.productId}::${line.variant}`, line.shortfall);
    }
  }
  let shortfall = 0;

  for (const item of order.items || []) {
    const key = `${item.productId}::${item.variant}`;
    const previous = settledLines.get(key);
    if (previous !== undefined) {
      shortfall += previous;
      continue;
    }

    // 1. Claim the line. $not/$elemMatch matches only while this variant has no
    //    entry, so the first caller wins and the others move on.
    try {
      const claim = await Order.updateOne(
        {
          _id: orderObjectId,
          "fulfillment.stockLines": {
            $not: { $elemMatch: { productId: item.productId, variant: item.variant } },
          },
        },
        {
          $push: {
            "fulfillment.stockLines": {
              productId: item.productId,
              variant: item.variant,
              applied: false,
              shortfall: 0,
              settled: false,
            },
          },
        }
      );
      if (claim.modifiedCount !== 1) {
        // Another run owns this line; it will settle it.
        continue;
      }
    } catch (error) {
      console.error("[razorpay-payment] stock line claim failed", {
        orderId: order.orderId,
        productId: String(item.productId),
        variant: item.variant,
        message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    let recorded: { shortfall: number; applied: boolean } = { shortfall: 0, applied: false };

    try {
      // 2. Apply, guarded so the stock can never go negative.
      const result = await Product.updateOne(
        {
          _id: item.productId,
          variants: {
            $elemMatch: { weight: item.variant, stock: { $gte: item.qty } },
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { $inc: { "variants.$.stock": -item.qty } as any }
      );

      if (result.modifiedCount === 1) {
        recorded = { shortfall: 0, applied: true };
      } else {
        // Either the variant vanished, or there is not enough stock left. The
        // order is already paid, so never cancel it — flag it for the team.
        const product = await Product.findById(item.productId)
          .select("name variants")
          .lean();
        const variant = product?.variants?.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (v: any) => v.weight === item.variant
        );
        const available = Number(variant?.stock ?? 0);

        // Recovery for a non-stock mismatch: retry with the SAME guard, so this
        // can never oversell — it only succeeds if the stock is genuinely there.
        if (variant && available >= item.qty) {
          const retry = await Product.updateOne(
            {
              _id: item.productId,
              variants: {
                $elemMatch: { weight: item.variant, stock: { $gte: item.qty } },
              },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { $inc: { "variants.$.stock": -item.qty } as any }
          );
          if (retry.modifiedCount === 1) {
            recorded = { shortfall: 0, applied: true };
          }
        }

        if (!recorded.applied) {
          recorded = { shortfall: item.qty, applied: false };
          console.error("[razorpay-payment] stock oversold at payment time", {
            orderId: order.orderId,
            productId: String(item.productId),
            variant: item.variant,
            qty: item.qty,
            available,
          });
          await Notification.create({
            message: `Stock oversold on order #${order.orderId} — ${item.name} (${item.variant}) x${item.qty}. Restock manually.`,
            type: "stock",
            orderId: orderObjectId,
          });
        }
      }
    } catch (error) {
      recorded = { shortfall: item.qty, applied: false };
      console.error("[razorpay-payment] stock decrement error", {
        orderId: order.orderId,
        productId: String(item.productId),
        variant: item.variant,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    shortfall += recorded.shortfall;

    // 3. Settle the claim so no later run can decrement this line again.
    await Order.updateOne(
      {
        _id: orderObjectId,
        "fulfillment.stockLines": {
          $elemMatch: { productId: item.productId, variant: item.variant },
        },
      },
      {
        $set: {
          "fulfillment.stockLines.$.applied": recorded.applied,
          "fulfillment.stockLines.$.shortfall": recorded.shortfall,
          "fulfillment.stockLines.$.settled": true,
        },
      }
    ).catch((error) => {
      console.error("[razorpay-payment] could not settle stock line", {
        orderId: order.orderId,
        productId: String(item.productId),
        variant: item.variant,
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }

  await markStep(orderObjectId, "stock", shortfall > 0 ? "attention" : "done");
}

/**
 * Hand the paid order to Delhivery.
 *
 * This is AWAITED by every caller. It must never throw: the payment is
 * already recorded as paid, so a Delhivery failure is logged, written onto
 * the order (syncState / shipmentError / syncRetryCount) and left for the
 * recovery cron or the admin retry button — it can never turn a completed
 * payment into an error response.
 */
export async function dispatchShipment(
  orderObjectId: string
): Promise<AutoShipmentResult | null> {
  try {
    const order = await Order.findById(orderObjectId);
    if (!order) return null;
    const result = await attemptAutoShipment(order);
    if (result.ok) {
      await markStep(orderObjectId, "shipment", "done");
      if (result.code === "SHIPMENT_CREATED") {
        console.log("[razorpay-payment] shipment handed off to Delhivery", {
          orderId: order.orderId,
          waybill: result.waybill,
        });
      }
    } else {
      await markStep(orderObjectId, "shipment", "pending");
      console.error("[razorpay-payment] shipment handoff failed", {
        orderId: order.orderId,
        code: result.code,
        message: result.error,
        retryable: result.retryable,
        retryCount: order.syncRetryCount,
      });
    }
    return result;
  } catch (error) {
    await markStep(orderObjectId, "shipment", "pending");
    console.error("[razorpay-payment] shipment handoff threw", {
      orderObjectId,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Resume any local bookkeeping that never completed (e.g. the function was
 * killed mid-run). Used by the reconciliation cron and the admin panel.
 */
export async function resumePostPaymentEffects(
  orderObjectId: string
): Promise<boolean> {
  const order = await Order.findById(orderObjectId);
  if (!order) return false;
  if (order.paymentStatus !== "paid") return false;

  const fulfillment = order.fulfillment ?? {};
  // A line that was claimed but never settled means a previous run died between
  // claiming and applying, so the stock state for it is still unknown.
  const stockLines: Array<{ settled?: boolean }> = fulfillment.stockLines ?? [];
  const unsettledStockLine = stockLines.some((l) => !l.settled);
  const needsWork =
    fulfillment.coupon === "pending" ||
    fulfillment.coupon === "failed" ||
    fulfillment.customer === "pending" ||
    fulfillment.customer === "failed" ||
    fulfillment.notification === "pending" ||
    fulfillment.notification === "failed" ||
    fulfillment.stock === "pending" ||
    fulfillment.stock === "failed" ||
    fulfillment.stock === "attention" ||
    unsettledStockLine;
  if (!needsWork) return false;

  console.log("[razorpay-payment] resuming incomplete post-payment effects", {
    orderId: order.orderId,
  });
  await runLocalPostPaymentEffects(order);
  return true;
}
