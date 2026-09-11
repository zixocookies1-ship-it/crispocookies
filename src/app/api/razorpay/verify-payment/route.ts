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
import {
  getActivePromotion,
  priceLines,
  computeOrderTotals,
} from "@/lib/pricing";

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
    console.error("[verify-payment] Razorpay secrets not configured on server");
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
      { success: false, error: "Payment verification temporarily unavailable" },
      { status: 500 }
    );
  }

  const existing = await Order.findOne({ razorpayOrderId: razorpay_order_id });
  if (existing) {
    if (existing.paymentStatus === "paid") {
      return NextResponse.json({ success: true, orderId: existing.orderId });
    }
    return NextResponse.json({ success: false, orderId: existing.orderId });
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

  for (const item of items as Array<{
    productId?: string;
    name?: string;
    image?: string;
    variant?: string;
    qty?: number;
    price?: number;
  }>) {
    if (!item?.productId || typeof item.qty !== "number" || item.qty <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid order items" },
        { status: 400 }
      );
    }

    const product = await Product.findById(item.productId).lean();
    if (!product) {
      return NextResponse.json(
        { success: false, error: `Product not found: ${item.productId}` },
        { status: 400 }
      );
    }

    const variant = product.variants?.find(
      (v: { weight: string }) => v.weight === item?.variant
    );
    if (!variant) {
      return NextResponse.json(
        { success: false, error: `Variant not found: ${item?.variant}` },
        { status: 400 }
      );
    }

    rawLines.push({ unitPrice: variant.price, qty: item.qty });
    resolvedItems.push({
      productId: String(product._id),
      name: product.name,
      image: item?.image || product.images?.[0] || "",
      variant: String(item?.variant),
      qty: item.qty,
      price: variant.price, // replaced with discounted unit price below
    });
  }

  const promotion = await getActivePromotion();
  const pricedLines = priceLines(rawLines, promotion);
  const totals = computeOrderTotals(pricedLines);

  resolvedItems.forEach((item, i) => {
    // Items store the discounted unit price the customer actually paid.
    item.price = pricedLines[i].unitFinal;
  });

  const subtotal = totals.finalSubtotal;
  const deliveryCharge = totals.deliveryCharge;
  const total = totals.total;

  let razorpayOrder;
  try {
    const razorpay = getRazorpay();
    razorpayOrder = await razorpay.orders.fetch(String(razorpay_order_id));
  } catch (error) {
    console.error("[verify-payment] could not fetch Razorpay order", {
      message: error instanceof Error ? error.message : String(error),
    });
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
    razorpayOrder.amount_paid === Math.round(total * 100);
  const paid = signatureValid && amountMatches && razorpayOrder.status === "paid";

  const orderId = generateOrderId();

  if (!paid) {
    console.error("[verify-payment] payment not confirmed", {
      razorpay_order_id,
      signatureValid,
      amountMatches,
      razorpayStatus: razorpayOrder.status,
    });
    return NextResponse.json(
      { success: false, error: "Payment could not be confirmed" },
      { status: 400 }
    );
  }

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
    subtotal,
    subtotalBeforeDiscount: totals.originalSubtotal,
    discount: totals.discount,
    promotion: promotion
      ? {
          name: promotion.name,
          discountType: promotion.discountType,
          discountValue: promotion.discountValue,
        }
      : undefined,
    deliveryCharge,
    total,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
    paymentStatus: "paid",
    orderStatus: "processing",
  });

  await Customer.findOneAndUpdate(
    { email },
    { name: customerName, email, phone },
    { upsert: true, new: true }
  );

  await Notification.create({
    message: `New order #${orderId} from ${customerName} - ₹${total}`,
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