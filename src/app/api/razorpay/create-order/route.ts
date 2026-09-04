import { NextRequest, NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { amount, receipt } = await request.json();
    const razorpay = getRazorpay();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: receipt || `receipt_${Date.now()}`,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("POST /api/razorpay/create-order error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
