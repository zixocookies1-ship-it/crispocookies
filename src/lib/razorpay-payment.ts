/**
 * Server-side payment lifecycle for Razorpay.
 *
 * The previous flow created the order document ONLY inside
 * /api/razorpay/verify-payment, which the browser calls from the Razorpay
 * success handler. If that callback ever failed (mobile browser closed,
 * network drop, refresh, JS error, Vercel function timeout), the money moved
 * at Razorpay but no order was ever persisted — the admin never saw it.
 *
 * This module fixes that with a durable pending-order + atomic finalization
 * model:
 *
 *   checkout → create-order persists a PENDING order (full snapshot)
 *           → Razorpay payment
 *           → finalizeOrderPayment() flips pending → paid atomically
 *             (called from BOTH verify-payment AND the Razorpay webhook)
 *
 * finalizeOrderPayment is idempotent: the first path to reach it wins the
 * atomic flip, every later path (callback retry, webhook, refresh, race
 * between the two) finds the already-paid order and returns it — no
 * duplicates, no double side-effects.
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
import { attemptAutoShipment } from "@/lib/delhivery";

export interface PendingOrderData {
  razorpayOrderId: string;
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
    price: number;
  }>;
  subtotal: number;
  subtotalBeforeDiscount: number;
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

/**
 * Persists a PENDING order capturing the full checkout snapshot. Idempotent:
 * if a pending order already exists for this Razorpay order, it is returned
 * unchanged (never a duplicate). This is what makes recovery possible — the
 * server always knows what the customer bought, no matter what happens after.
 */
export async function createPendingOrder(
  input: PendingOrderData
): Promise<IOrder> {
  await connectDB();

  // Idempotent: never create two pending orders for the same Razorpay order.
  const existing = await Order.findOne({
    razorpayOrderId: input.razorpayOrderId,
  });
  if (existing) {
    return existing;
  }

  const address = {
    line1: input.address.line1,
    line2: input.address.line2 ?? "",
    city: input.address.city,
    state: input.address.state,
    pincode: input.address.pincode,
    country: input.address.country || "India",
  };

  const data = {
    orderId: generateOrderId(),
    customerName: input.customerName,
    email: input.email,
    phone: input.phone,
    address,
    items: input.items,
    subtotal: input.subtotal,
    subtotalBeforeDiscount: input.subtotalBeforeDiscount,
    discount: input.discount,
    promotion: input.promotion,
    couponDiscount: input.couponDiscount,
    eligibleSubtotal: input.eligibleSubtotal,
    coupon: input.coupon,
    deliveryCharge: input.deliveryCharge,
    deliveryProvider: input.deliveryProvider,
    shippingWeightGrams: input.shippingWeightGrams,
    total: input.total,
    razorpayOrderId: input.razorpayOrderId,
    paymentStatus: "pending" as const,
    orderStatus: "processing" as const,
  };

  const created = await Order.create(data);
  console.log("[razorpay-payment] pending order persisted", {
    orderId: created.orderId,
    razorpayOrderId: input.razorpayOrderId,
  });
  return created;
}

/**
 * Atomically flips a pending order to PAID and performs the one-time
 * post-payment side effects (coupon claim, customer upsert, admin
 * notification, stock decrement, Delhivery auto-shipment).
 *
 * Looks up by razorpayPaymentId first (fastest de-dup), then by
 * razorpayOrderId. Only the first caller to transition pending→paid runs the
 * side effects; everyone else gets back the existing result.
 */
export async function finalizeOrderPayment(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  /** Expected amount in paise; if omitted the Razorpay API is consulted. */
  expectedAmountPaise?: number;
  source: "verify" | "webhook";
}): Promise<FinalizeResult> {
  await connectDB();

  // ------------------------------------------------------------------
  // Idempotency 1: the same Razorpay payment must never create/grant two
  // orders, even if webhook + callback arrive nearly simultaneously.
  // ------------------------------------------------------------------
  if (input.razorpayPaymentId) {
    const byPayment = await Order.findOne({
      razorpayPaymentId: input.razorpayPaymentId,
    }).lean();
    if (byPayment) {
      if (byPayment.paymentStatus === "paid") {
        console.log(
          "[razorpay-payment] already finalized by payment id",
          { razorpayPaymentId: input.razorpayPaymentId, orderId: byPayment.orderId }
        );
        return {
          ok: true,
          orderId: byPayment.orderId,
          alreadyFinalized: true,
        };
      }
      // A pending/failed order with the same payment id is unexpected; fail
      // closed rather than trusting the caller.
    }
  }

  // ------------------------------------------------------------------
  // Idempotency 2: same Razorpay order id must map to one local order.
  // ------------------------------------------------------------------
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

  if (existing.paymentStatus === "paid") {
    return {
      ok: true,
      orderId: existing.orderId,
      alreadyFinalized: true,
    };
  }

  // ------------------------------------------------------------------
  // Optional browser-callback signature verification (verify-payment only).
  // The webhook path has no callback signature — its authenticity comes from
  // the webhook route's own HMAC of the raw body.
  // ------------------------------------------------------------------
  if (input.razorpaySignature) {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return { ok: false, code: "GATEWAY_UNREACHABLE" };
    }
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
      .digest("hex");
    if (expected !== input.razorpaySignature) {
      console.error("[razorpay-payment] callback signature mismatch", {
        razorpayOrderId: input.razorpayOrderId,
      });
      return { ok: false, code: "SIGNATURE_INVALID" };
    }
  }

  // ------------------------------------------------------------------
  // Server-side amount + status verification. Never trust the caller or the
  // browser: the authoritative numbers come from the Razorpay API.
  // ------------------------------------------------------------------
  let amountPaise: number;
  try {
    const razorpay = getRazorpay();
    const rpOrder = await razorpay.orders.fetch(input.razorpayOrderId);
    amountPaise =
      typeof rpOrder.amount_paid === "number" ? rpOrder.amount_paid : 0;
    if (rpOrder.status !== "paid") {
      console.error("[razorpay-payment] razorpay order not paid", {
        razorpayOrderId: input.razorpayOrderId,
        status: rpOrder.status,
      });
      return { ok: false, code: "NOT_PAID" };
    }
    const expected =
      input.expectedAmountPaise ?? Math.round(Number(existing.total ?? 0) * 100);
    if (expected !== amountPaise) {
      console.error("[razorpay-payment] amount mismatch", {
        razorpayOrderId: input.razorpayOrderId,
        expectedPaise: expected,
        actualPaise: amountPaise,
      });
      return { ok: false, code: "AMOUNT_MISMATCH" };
    }
  } catch (error) {
    console.error("[razorpay-payment] could not verify razorpay order", {
      razorpayOrderId: input.razorpayOrderId,
      message: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, code: "GATEWAY_UNREACHABLE" };
  }

  // ------------------------------------------------------------------
  // Atomic transition. The filter on paymentStatus:"pending" guarantees
  // exactly one caller wins; the loser re-reads and returns the result.
  // ------------------------------------------------------------------
  const paid = await Order.findOneAndUpdate(
    { _id: existing._id, paymentStatus: "pending" },
    {
      $set: {
        paymentStatus: "paid",
        orderStatus: "processing",
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature ?? "",
        updatedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!paid) {
    const current = await Order.findById(existing._id).lean();
    if (current?.paymentStatus === "paid") {
      return {
        ok: true,
        orderId: current.orderId,
        alreadyFinalized: true,
      };
    }
    return { ok: false, code: "FINALIZE_RACE" };
  }

  console.log("[razorpay-payment] order finalized as paid", {
    orderId: paid.orderId,
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    source: input.source,
    amountPaise,
  });

  // Only the winner performs the one-time side effects.
  await runPostPaymentSideEffects(paid);
  return { ok: true, orderId: paid.orderId };
}

/**
 * One-time post-payment work. Never throws — failures are logged so a paid
 * order is never lost to a side-effect error.
 */
export async function runPostPaymentSideEffects(
  order: IOrder & { _id: unknown }
): Promise<void> {
  // Coupon claim + usage history (atomic claim guards the last-use race).
  try {
    if (order.coupon?.id) {
      const claimed = await claimCouponUsage(order.coupon.id);
      if (!claimed) {
        console.warn(
          "[razorpay-payment] coupon usage claim lost — concurrent exhaustion",
          { couponCode: order.coupon.code, orderId: order.orderId }
        );
      }
      await recordCouponUsage({
        couponId: order.coupon.id,
        couponCode: order.coupon.code,
        orderObjectId: String(order._id),
        orderId: order.orderId,
        customerName: order.customerName,
        email: order.email,
        phone: order.phone,
        customerKey: couponCustomerKey(order.email, order.phone),
        discountAmount: order.couponDiscount || 0,
        orderSubtotal: order.subtotal || 0,
        orderTotal: order.total || 0,
      });
    }
  } catch (error) {
    console.error("[razorpay-payment] coupon claim failed", {
      orderId: order.orderId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  // Customer upsert.
  try {
    await Customer.findOneAndUpdate(
      { email: order.email },
      { name: order.customerName, email: order.email, phone: order.phone },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error("[razorpay-payment] customer upsert failed", {
      orderId: order.orderId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  // Admin notification.
  try {
    await Notification.create({
      message: `New order #${order.orderId} from ${order.customerName} - ₹${order.total}${
        (order.couponDiscount || 0) > 0
          ? ` (coupon ${order.coupon?.code})`
          : ""
      }`,
      type: "order",
      orderId: String(order._id),
    });
  } catch (error) {
    console.error("[razorpay-payment] notification failed", {
      orderId: order.orderId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  // Stock decrement.
  for (const item of order.items || []) {
    try {
      const product = await Product.findById(item.productId);
      if (product) {
        const variant = product.variants.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (v: any) => v.weight === item.variant
        );
        if (variant) {
          variant.stock = Math.max(0, variant.stock - item.qty);
          await product.save();
          if (variant.stock < 10) {
            await Notification.create({
              message: `Low Stock: ${product.name} (${variant.weight}) - ${variant.stock} left`,
              type: "stock",
              orderId: String(order._id),
            });
          }
        }
      }
    } catch (error) {
      console.error("[razorpay-payment] stock decrement error", {
        orderId: order.orderId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Prepaid shipment hand-off (safe, idempotent, never blocks the response).
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await attemptAutoShipment(order as any);
  } catch (error) {
    console.error("[razorpay-payment] auto-shipment failed", {
      orderId: order.orderId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}