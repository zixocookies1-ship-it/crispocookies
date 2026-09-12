export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";
import { connectDB } from "@/lib/mongodb";
import { calculateOrderTotals } from "@/lib/order-totals";
import { CouponError } from "@/lib/coupons";

interface CartItem {
  productId: string;
  variant: string;
  qty: number;
}

const MAX_ORDER_AMOUNT_PAISE = 10000000;

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
  };

  try {
    payload = (await request.json()) as {
      items?: CartItem[];
      couponCode?: string;
      email?: string;
      phone?: string;
      deliveryPincode?: string;
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
      customerEmail: payload?.email || null,
      customerPhone: payload?.phone || null,
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

  return NextResponse.json({
    success: true,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
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