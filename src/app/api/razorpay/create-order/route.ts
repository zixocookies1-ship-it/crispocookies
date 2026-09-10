export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";

interface CartItem {
  productId: string;
  variant: string;
  qty: number;
}

export async function POST(request: NextRequest) {
  try {
    const { items } = (await request.json()) as { items: CartItem[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        {
          error:
            "Razorpay keys are not configured on the server. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the deployment environment variables (Production, Preview and Development scopes).",
        },
        { status: 500 }
      );
    }

    await connectDB();

    let subtotal = 0;
    const resolvedItems: Array<{
      productId: string;
      name: string;
      image: string;
      variant: string;
      qty: number;
      price: number;
    }> = [];

    for (const item of items) {
      const product = await Product.findById(item.productId).lean();
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 400 }
        );
      }

      const variant = product.variants.find(
        (v: { weight: string }) => v.weight === item.variant
      );
      if (!variant) {
        return NextResponse.json(
          { error: `Variant not found: ${item.variant}` },
          { status: 400 }
        );
      }

      if (variant.stock < item.qty) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name} (${item.variant})` },
          { status: 400 }
        );
      }

      const price = variant.price;
      subtotal += price * item.qty;

      resolvedItems.push({
        productId: product._id.toString(),
        name: product.name,
        image: product.images?.[0] || "",
        variant: item.variant,
        qty: item.qty,
        price,
      });
    }

    const deliveryCharge = subtotal >= 499 ? 0 : 49;
    const total = subtotal + deliveryCharge;
    const amountInPaise = total * 100;

    if (amountInPaise <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      subtotal,
      deliveryCharge,
      total,
      items: resolvedItems,
    });
  } catch (error) {
    console.error("POST /api/razorpay/create-order error:", error);
    const message =
      error instanceof Error && error.message.includes("environment variables")
        ? error.message
        : "Failed to create order. Please try again or contact support.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
