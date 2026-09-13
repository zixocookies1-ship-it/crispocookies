export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";
import { connectDB } from "@/lib/mongodb";
import { calculateOrderTotals } from "@/lib/order-totals";
import { CouponError } from "@/lib/coupons";
import { createPendingOrder } from "@/lib/razorpay-payment";

interface CartItem {
  productId: string;
  variant: string;
  qty: number;
}

interface CheckoutAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

const MAX_ORDER_AMOUNT_PAISE = 10000000;

function isAddressLike(value: unknown): value is CheckoutAddress {
  if (typeof value !== "object" || value === null) return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.line1 === "string" &&
    typeof a.city === "string" &&
    typeof a.state === "string" &&
    typeof a.pincode === "string"
  );
}

function sanitizeRazorpayError(error: unknown) {
  const err = error as {
    message?: string;
    error?: {
      code?: string;
      description?: string;
      step?: string;
      reason?: string;
    };
  };
  return {
    message: error instanceof Error ? error.message : String(error),
    code: err?.error?.code,
    description: err?.error?.description,
    step: err?.error?.step,
    reason: err?.error?.reason,
  };
}

export async function POST(request: NextRequest) {
  let payload: {
    items?: CartItem[];
    couponCode?: string;
    email?: string;
    phone?: string;
    deliveryPincode?: string;
    customerName?: string;
    address?: CheckoutAddress;
  };

  try {
    payload = (await request.json()) as {
      items?: CartItem[];
      couponCode?: string;
      email?: string;
      phone?: string;
      deliveryPincode?: string;
      customerName?: string;
      address?: CheckoutAddress;
    };
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  const items = payload?.items;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { success: false, error: "No items provided" },
      { status: 400 }
    );
  }

  // The pending order (durable payment snapshot) needs the customer details
  // to survive a lost browser callback. Fail closed BEFORE any Razorpay order
  // is created — no money can move until the server has the full snapshot.
  const customerName =
    typeof payload?.customerName === "string"
      ? payload.customerName.trim()
      : "";
  const email = typeof payload?.email === "string" ? payload.email.trim() : "";
  const phone = typeof payload?.phone === "string" ? payload.phone.trim() : "";
  if (!customerName || !email || !phone || !isAddressLike(payload?.address)) {
    return NextResponse.json(
      { success: false, error: "Missing customer details" },
      { status: 400 }
    );
  }

  const keyIdSet = !!process.env.RAZORPAY_KEY_ID;
  const secretSet = !!process.env.RAZORPAY_KEY_SECRET;
  const keyIdPrefix =
    process.env.RAZORPAY_KEY_ID?.substring(0, 7) || "NOT SET";

  console.log("[create-order] request received", {
    itemCount: items.length,
    hasCoupon: !!payload?.couponCode,
    keyIdSet,
    secretSet,
  });

  if (!keyIdSet || !secretSet) {
    console.error(
      "[create-order] Razorpay keys not configured on the server",
      { keyIdSet, secretSet }
    );
    return NextResponse.json(
      {
        success: false,
        error:
          "Razorpay keys are not configured on the server. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the deployment environment variables.",
      },
      { status: 500 }
    );
  }

  try {
    await connectDB();
  } catch (error) {
    console.error("[create-order] database connection failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        error: "Payment service temporarily unavailable",
      },
      { status: 500 }
    );
  }

  // ---------------------------------------------------------------
  // Centralised calculation: products re-fetched from DB, promotion
  // applied, coupon validated & discount computed. Any CouponError
  // contains a customer-safe message.
  // ---------------------------------------------------------------
  let totals;
  try {
    totals = await calculateOrderTotals({
      rawItems: items,
      couponCode: payload?.couponCode || null,
      customerEmail: email,
      customerPhone: phone,
      deliveryPincode: payload?.deliveryPincode || null,
    });
  } catch (error) {
    if (error instanceof CouponError) {
      console.warn("[create-order] coupon rejected", {
        message: error.message,
      });
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error("[create-order] calculation failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not calculate order total",
      },
      { status: 500 }
    );
  }

  const subtotal = totals.finalSubtotal;
  const deliveryCharge = totals.deliveryCharge;
  const total = totals.total;
  const amountInPaise = Math.round(total * 100);

  if (
    !Number.isFinite(subtotal) ||
    subtotal <= 0 ||
    !Number.isInteger(amountInPaise) ||
    amountInPaise <= 0 ||
    amountInPaise > MAX_ORDER_AMOUNT_PAISE
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid payment amount" },
      { status: 400 }
    );
  }

  console.log("[create-order] totals calculated", {
    subtotal,
    offerDiscount: totals.offerDiscount,
    couponDiscount: totals.couponDiscount,
    deliveryCharge,
    total,
    amountInPaise,
    currency: "INR",
  });

  let order;
  try {
    const razorpay = getRazorpay();
    order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    });
  } catch (error) {
    console.error("[create-order] Razorpay order creation failed", {
      payload: sanitizeRazorpayError(error),
      keyIdSet,
      secretSet,
      keyIdPrefix,
    });
    const misconfigured =
      error instanceof Error &&
      error.message.includes("environment variables");
    return NextResponse.json(
      {
        success: false,
        error: misconfigured
          ? "Razorpay is not configured on the server. Contact support."
          : "Payment could not be initialized. Please try again.",
      },
      { status: 500 }
    );
  }

  console.log("[create-order] Razorpay order created", {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
  });

  // ------------------------------------------------------------------
  // Durable snapshot: persist the PENDING order BEFORE the customer can
  // reach the payment modal. If the browser callback is ever lost, the
  // Razorpay webhook recovers by finalizing this exact record.
  // ------------------------------------------------------------------
  let pendingOrder;
  try {
    pendingOrder = await createPendingOrder({
      razorpayOrderId: String(order.id),
      customerName,
      email,
      phone,
      address: {
        line1: payload.address!.line1,
        line2: payload.address!.line2 ?? "",
        city: payload.address!.city,
        state: payload.address!.state,
        pincode: payload.address!.pincode,
      },
      items: totals.items as Array<{
        productId: string;
        name: string;
        image?: string;
        variant: string;
        qty: number;
        price: number;
      }>,
      subtotal: totals.finalSubtotal,
      subtotalBeforeDiscount: totals.originalSubtotal,
      discount: totals.offerDiscount,
      promotion: totals.promotion
        ? {
            name: totals.promotion.name,
            discountType: totals.promotion.discountType,
            discountValue: totals.promotion.discountValue,
          }
        : undefined,
      couponDiscount: totals.couponDiscount,
      eligibleSubtotal: totals.eligibleSubtotal,
      coupon: totals.coupon ?? undefined,
      deliveryCharge: totals.deliveryCharge,
      deliveryProvider: totals.deliveryProvider,
      shippingWeightGrams: totals.shippingWeightGrams,
      total: totals.total,
    });
  } catch (error) {
    console.error("[create-order] failed to persist pending order", {
      message: error instanceof Error ? error.message : String(error),
      razorpayOrderId: order.id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Payment could not be initialized. Please try again.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    internalOrderId: pendingOrder.orderId,
    subtotal,
    subtotalBeforeDiscount: totals.originalSubtotal,
    discount: totals.offerDiscount,
    couponDiscount: totals.couponDiscount,
    eligibleSubtotal: totals.eligibleSubtotal,
    coupon: totals.coupon,
    deliveryCharge,
    deliveryProvider: totals.deliveryProvider,
    shippingWeightGrams: totals.shippingWeightGrams,
    total,
    items: totals.items,
  });
}