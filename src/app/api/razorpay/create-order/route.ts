export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import {
  getActivePromotion,
  priceLines,
  computeOrderTotals,
} from "@/lib/pricing";

interface CartItem {
  productId: string;
  variant: string;
  qty: number;
}

const MAX_ITEMS_PER_ORDER = 50;
const MAX_QTY_PER_ITEM = 50;
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
  let payload: { items?: CartItem[] };

  try {
    payload = (await request.json()) as { items?: CartItem[] };
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

  if (items.length > MAX_ITEMS_PER_ORDER) {
    return NextResponse.json(
      { success: false, error: "Too many items in order" },
      { status: 400 }
    );
  }

  for (const item of items) {
    if (
      typeof item?.productId !== "string" ||
      !item.productId ||
      typeof item?.variant !== "string" ||
      !item.variant ||
      !Number.isInteger(item.qty) ||
      item.qty <= 0 ||
      item.qty > MAX_QTY_PER_ITEM
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid item data" },
        { status: 400 }
      );
    }
  }

  const keyIdSet = !!process.env.RAZORPAY_KEY_ID;
  const secretSet = !!process.env.RAZORPAY_KEY_SECRET;
  const keyIdPrefix = process.env.RAZORPAY_KEY_ID?.substring(0, 7) || "NOT SET";

  console.log("[create-order] request received", {
    itemCount: items.length,
    keyIdSet,
    secretSet,
  });

  if (!keyIdSet || !secretSet) {
    console.error("[create-order] Razorpay keys not configured on the server", {
      keyIdSet,
      secretSet,
    });
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
      { success: false, error: "Payment service temporarily unavailable" },
      { status: 500 }
    );
  }

  const resolvedItems: Array<{
    productId: string;
    name: string;
    image: string;
    variant: string;
    qty: number;
    price: number;
  }> = [];
  const rawLines: Array<{ unitPrice: number; qty: number }> = [];

  for (const item of items) {
    let product;
    try {
      product = await Product.findById(item.productId).lean();
    } catch (error) {
      console.error("[create-order] product lookup failed", {
        productId: item.productId,
        message: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { success: false, error: "Could not load product details" },
        { status: 500 }
      );
    }

    if (!product) {
      return NextResponse.json(
        { success: false, error: `Product not found: ${item.productId}` },
        { status: 400 }
      );
    }

    const variant = product.variants?.find(
      (v: { weight: string }) => v.weight === item.variant
    );
    if (!variant) {
      return NextResponse.json(
        { success: false, error: `Variant not found: ${item.variant}` },
        { status: 400 }
      );
    }

    if (variant.stock < item.qty) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient stock for ${product.name} (${item.variant})`,
        },
        { status: 400 }
      );
    }

    rawLines.push({ unitPrice: variant.price, qty: item.qty });

    resolvedItems.push({
      productId: String(product._id),
      name: product.name,
      image: product.images?.[0] || "",
      variant: item.variant,
      qty: item.qty,
      price: variant.price, // replaced with discounted unit price below
    });
  }

  const promotion = await getActivePromotion();
  const pricedLines = priceLines(rawLines, promotion);
  const totals = computeOrderTotals(pricedLines);

  resolvedItems.forEach((item, i) => {
    item.price = pricedLines[i].unitFinal;
  });

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
      error instanceof Error && error.message.includes("environment variables");
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
    discount: totals.discount,
    deliveryCharge,
    total,
    items: resolvedItems,
  });
}