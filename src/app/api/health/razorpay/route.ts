export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";

export async function GET() {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    razorpayKeyIdSet: !!process.env.RAZORPAY_KEY_ID,
    razorpayKeySecretSet: !!process.env.RAZORPAY_KEY_SECRET,
    nextPublicKeySet: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    razorpayKeyIdPrefix: process.env.RAZORPAY_KEY_ID?.substring(0, 4) || "NOT SET",
    mode: process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_") ? "LIVE" : process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") ? "TEST" : "UNKNOWN",
  };

  try {
    const { getRazorpay } = await import("@/lib/razorpay");
    const razorpay = getRazorpay();
    const testOrder = await razorpay.orders.create({
      amount: 100,
      currency: "INR",
      receipt: `health_check_${Date.now()}`,
    });
    result.authTest = "PASS";
    result.testOrderId = testOrder.id;
  } catch (err) {
    const error = err as { message?: string; error?: { description?: string } } | unknown;
    result.authTest = "FAIL";
    const message =
      typeof error === "object" && error !== null && "message" in error && (error as { message?: string }).message
        ? (error as { message: string }).message
        : String(error);
    const description =
      typeof error === "object" && error !== null && "error" in error && (error as { error?: { description?: string } }).error?.description;
    result.authError = message + (description ? ` — ${description}` : "");
  }

  try {
    await connectDB();
    result.mongodbConnected = true;
    const productCount = await Product.countDocuments();
    result.productCount = productCount;
  } catch {
    result.mongodbConnected = false;
  }

  return NextResponse.json(result);
}
