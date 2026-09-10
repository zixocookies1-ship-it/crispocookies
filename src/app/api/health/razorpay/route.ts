export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";

function describeError(err: unknown): string {
  if (err instanceof Error) {
    const e = err as {
      code?: string;
      reason?: string;
      description?: string;
      error?: { code?: string; description?: string; step?: string; reason?: string };
    };
    const detail =
      e?.error?.description || e?.description || e?.error?.reason || e?.reason;
    const code = e?.error?.code || e?.code;
    let out = err.message || "no message";
    if (detail) out += ` — ${detail}`;
    if (code) out += ` (code: ${code})`;
    return out.slice(0, 400);
  }
  if (typeof err === "string") return err.slice(0, 400);
  try {
    const s = JSON.stringify(err);
    if (s && s !== "{}") return s.slice(0, 400);
  } catch {
    /* ignore */
  }
  return String(err).slice(0, 400);
}

export async function GET() {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    razorpayKeyIdSet: !!process.env.RAZORPAY_KEY_ID,
    razorpayKeySecretSet: !!process.env.RAZORPAY_KEY_SECRET,
    nextPublicKeySet: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    razorpayKeyIdPrefix: process.env.RAZORPAY_KEY_ID?.substring(0, 7) || "NOT SET",
    nextPublicKeyPrefix:
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.substring(0, 7) || "NOT SET",
    mode: process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_")
      ? "LIVE"
      : process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_")
        ? "TEST"
        : "UNKNOWN",
    keyMismatch:
      !!process.env.RAZORPAY_KEY_ID &&
      !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_ID !== process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
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
    result.authTest = "FAIL";
    result.authError = describeError(err);
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