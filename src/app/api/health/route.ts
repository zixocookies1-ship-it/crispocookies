export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { authorizeInternalRequest } from "@/lib/internal-route-auth";

/**
 * Deployment health probe. Returns only operational facts — never credential
 * material, connection strings, document contents or password hashes.
 *
 * Access is restricted to a signed-in admin session or a CRON_SECRET bearer
 * token. It must also use the shared cached connection: closing it here would
 * leave every later route on this warm instance holding a dead connection.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeInternalRequest(request);
  if (!auth.ok) return auth.response;

  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    mongodbUriSet: !!process.env.MONGODB_URI,
    nextauthSecretSet: !!process.env.NEXTAUTH_SECRET,
    razorpayKeyIdSet: !!process.env.RAZORPAY_KEY_ID,
    razorpayKeySecretSet: !!process.env.RAZORPAY_KEY_SECRET,
    razorpayWebhookSecretSet: !!process.env.RAZORPAY_WEBHOOK_SECRET,
    razorpayMode: process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_")
      ? "LIVE"
      : process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_")
        ? "TEST"
        : "UNKNOWN",
  };

  if (!process.env.MONGODB_URI) {
    result.status = "FAIL";
    result.error = "MONGODB_URI is not set";
    return NextResponse.json(result, { status: 500 });
  }

  try {
    await connectDB();
    result.mongodbConnected = true;
    result.status = "OK";
    return NextResponse.json(result);
  } catch (err) {
    result.mongodbConnected = false;
    result.status = "FAIL";
    result.error = err instanceof Error ? err.message : String(err);
    return NextResponse.json(result, { status: 500 });
  }
}
