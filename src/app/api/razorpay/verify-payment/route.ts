export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Customer from "@/models/Customer";
import Notification from "@/models/Notification";
import Product from "@/models/Product";
import { getRazorpay } from "@/lib/razorpay";
import { generateOrderId } from "@/lib/helpers";
import { calculateOrderTotals } from "@/lib/order-totals";
import {
  CouponError,
  couponCustomerKey,
  claimCouponUsage,
  recordCouponUsage,
} from "@/lib/coupons";

interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

function isAddressLike(value: unknown): value is Address {
  if (typeof value !== "object" || value === null) return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.line1 === "string" &&
    typeof a.city === "string" &&
    typeof a.state === "string" &&
    typeof a.pincode === "string"
  );
}

export async function POST(request: NextRequest) {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error(
      "[verify-payment] Razorpay secrets not configured on server"
    );
    return NextResponse.json(
      { success: false, error: "Payment verification is not configured" },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    customerName,
    email,
    phone,
    address,
    items,
    couponCode,
  } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json(
      { success: false, error: "Missing payment verification data" },
      { status: 400 }
    );
  }

  if (
    typeof customerName !== "string" ||
    typeof email !== "string" ||
    typeof phone !== "string" ||
    !isAddressLike(address)
  ) {
    return NextResponse.json(
      { success: false, error: "Missing customer details" },
      { status: 400 }
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { success: false, error: "Missing order items" },
      { status: 400 }
    );
  }

  try {
    await connectDB();
  } catch (error) {
    console.error("[verify-payment] database connection failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        error: "Payment verification temporarily unavailable",
      },
      { status: 500 }
    );
  }

  // Idempotency: if this Razorpay order already produced an Order document,
  // return the stored result rather than creating a duplicate or consuming
  // coupon usage a second time.
  const existing = await Order.findOne({ razorpayOrderId: razorpay_order_id });
  if (existing) {
    if (existing.paymentStatus === "paid") {
      return NextResponse.json({ success: true, orderId: existing.orderId });
    }
    return NextResponse.json({ success: false, orderId: existing.orderId });
  }

  // -----------------------------------------------------------------
  // 1. Recalculate the exact same authoritative totals using fresh DB
  //    product prices and current coupon state. If the coupon expired,
  //    was exhausted in the split-second between create-order and
  //    verify, or the product prices changed, the totals will differ
  //    from the Razorpay order amount and verification fails safely.
  // -----------------------------------------------------------------
  let totals;
  try {
    totals = await calculateOrderTotals({
      rawItems: (items as Array<{
        productId?: string;
        variant?: string;
        qty?: number;
      }>).map((i) => ({
        productId: String(i?.productId || ""),
        variant: String(i?.variant || ""),
        qty: Number(i?.qty),
      })),
      couponCode:
        typeof couponCode === "string" && couponCode.trim()
          ? couponCode.trim()
          : null,
      customerEmail: email,
      customerPhone: phone,
    });
  } catch (error) {
    const message =
      error instanceof CouponError
        ? error.message
        : "Could not recalculate order total";
    console.error("[verify-payment] totals recalculation failed", {
      message,
      hasCoupon: !!couponCode,
    });
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }

  // resolvedItems with the offer-discounted unit price (historical snapshot)
  // already provided by the single centralised calculation.
  const resolvedItems = totals.items;

  // ---------------------------------------------------------------
  // 2. Verify Razorpay payment signature + amount.
  // ---------------------------------------------------------------
  let razorpayOrder;
  try {
    const razorpay = getRazorpay();
    razorpayOrder = await razorpay.orders.fetch(String(razorpay_order_id));
  } catch (error) {
    console.error(
      "[verify-payment] could not fetch Razorpay order",
      { message: error instanceof Error ? error.message : String(error) }
    );
    return NextResponse.json(
      { success: false, error: "Could not verify payment with gateway" },
      { status: 502 }
    );
  }

  const hmac = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const signatureValid = hmac === razorpay_signature;
  const amountMatches =
    typeof razorpayOrder.amount_paid === "number" &&
    razorpayOrder.amount_paid === Math.round(totals.total * 100);
  const paid =
    signatureValid &&
    amountMatches &&
    razorpayOrder.status === "paid";

  if (!paid) {
    console.error("[verify-payment] payment not confirmed", {
      razorpay_order_id,
      signatureValid,
      amountMatches,
      razorpayStatus: razorpayOrder.status,
      serverTotalPaise: Math.round(totals.total * 100),
      paidPaise: razorpayOrder.amount_paid,
    });
    return NextResponse.json(
      { success: false, error: "Payment could not be confirmed" },
      { status: 400 }
    );
  }

  const orderId = generateOrderId();
  const customerKey = couponCustomerKey(email, phone);
  const promotion = totals.promotion;

  // ---------------------------------------------------------------
  // 3. Create the order. The coupon snapshot + pricing are embedded
  //    directly so historical records never depend on the live coupon
  //    configuration.
  // ---------------------------------------------------------------
  const order = await Order.create({
    orderId,
    customerName,
    email,
    phone,
    address: {
      line1: (address as Address).line1,
      line2: (address as Address).line2,
      city: (address as Address).city,
      state: (address as Address).state,
      pincode: (address as Address).pincode,
    },
    items: resolvedItems,
    subtotal: totals.finalSubtotal,
    subtotalBeforeDiscount: totals.originalSubtotal,
    discount: totals.offerDiscount,
    promotion: promotion
      ? {
          name: promotion.name,
          discountType: promotion.discountType,
          discountValue: promotion.discountValue,
        }
      : undefined,
    couponDiscount: totals.couponDiscount,
    eligibleSubtotal: totals.eligibleSubtotal,
    coupon: totals.coupon
      ? {
          code: totals.coupon.code,
          id: totals.coupon.id,
          discountType: totals.coupon.discountType,
          discountValue: totals.coupon.discountValue,
          description: totals.coupon.description,
        }
      : undefined,
    deliveryCharge: totals.deliveryCharge,
    total: totals.total,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
    paymentStatus: "paid",
    orderStatus: "processing",
  });

  // ---------------------------------------------------------------
  // 4. Claim coupon usage atomically and record usage history.
  //    claimCouponUsage guards the final-remaining-use race (spec 24).
  // ---------------------------------------------------------------
  if (totals.coupon) {
    const claimed = await claimCouponUsage(totals.coupon.id);
    if (!claimed) {
      // Extremely rare: coupon was exhausted between the recalc above and
      // this claim. The payment was already taken at the quoted price so
      // we proceed — the order stores the coupon snapshot. Log for ops.
      console.warn(
        "[verify-payment] coupon usage claim lost — concurrent exhaustion",
        { couponCode: totals.coupon.code, orderId }
      );
    }
    await recordCouponUsage({
      couponId: totals.coupon.id,
      couponCode: totals.coupon.code,
      orderObjectId: String(order._id),
      orderId,
      customerName,
      email,
      phone,
      customerKey,
      discountAmount: totals.couponDiscount,
      orderSubtotal: totals.finalSubtotal,
      orderTotal: totals.total,
    });
  }

  // ---------------------------------------------------------------
  // 5. Upsert customer, notify admin, decrement stock (existing logic).
  // ---------------------------------------------------------------
  await Customer.findOneAndUpdate(
    { email },
    { name: customerName, email, phone },
    { upsert: true, new: true }
  );

  await Notification.create({
    message: `New order #${orderId} from ${customerName} - ₹${totals.total}${totals.couponDiscount > 0 ? ` (coupon ${totals.coupon?.code})` : ""}`,
    type: "order",
    orderId: order._id.toString(),
  });

  for (const item of resolvedItems) {
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
              orderId: order._id.toString(),
            });
          }
        }
      }
    } catch (stockErr) {
      console.error("Stock decrement error:", stockErr);
    }
  }

  return NextResponse.json({ success: true, orderId });
}