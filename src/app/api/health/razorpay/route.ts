export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { authorizeInternalRequest } from "@/lib/internal-route-auth";
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

export async function GET(request: NextRequest) {
  const auth = await authorizeInternalRequest(request);
  if (!auth.ok) return auth.response;

  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    razorpayKeyIdSet: !!process.env.RAZORPAY_KEY_ID,
    razorpayKeySecretSet: !!process.env.RAZORPAY_KEY_SECRET,
    nextPublicKeySet: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    razorpayKeyIdPrefix: process.env.RAZORPAY_KEY_ID?.substring(0, 7) || "NOT SET",
    nextPublicKeyIdPrefix:
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

  // Credential check only. This used to create a real ₹100 Razorpay order on
  // every unauthenticated hit, which polluted the live dashboard and let anyone
  // probe the account. A read-only list call authenticates just as well.
  try {
    const { getRazorpay } = await import("@/lib/razorpay");
    const razorpay = getRazorpay();
    await razorpay.orders.all({ count: 1 });
    result.authTest = "PASS";
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