export const dynamic = "force-dynamic";
// Finalization now awaits the Delhivery hand-off inside this invocation
// (fire-and-forget work is frozen the moment the response is sent), so the
// function needs headroom past the 10s default: two outbound Delhivery calls
// with a 15s timeout each bound the worst case well under 60s.
export const maxDuration = 60;
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { finalizeOrderPayment } from "@/lib/razorpay-payment";

/**
 * Browser payment-verification endpoint.
 *
 * The browser only ever passes the three identifiers Razorpay hands back. It
 * never passes an amount, a total, an item list or a coupon code, and it never
 * creates an order: the order was already persisted as pending by
 * /api/razorpay/create-order with a server-calculated price snapshot.
 *
 * Authentication of the callback and the actual confirmation both happen in
 * finalizeOrderPayment, which verifies the HMAC signature and then confirms the
 * payment entity with Razorpay before the order is flipped to paid. Calling
 * this route twice, or calling it after the webhook already finalised, is safe.
 */
export async function POST(request: NextRequest) {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error(
      "[verify-payment] Razorpay secrets not configured on server"
    );
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

  const razorpayOrderId = String(body.razorpay_order_id ?? "").trim();
  const razorpayPaymentId = String(body.razorpay_payment_id ?? "").trim();
  const razorpaySignature = String(body.razorpay_signature ?? "").trim();

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return NextResponse.json(
      { success: false, error: "Missing payment verification data" },
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

  const finalized = await finalizeOrderPayment({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    source: "verify",
  });

  if (finalized.ok) {
    return NextResponse.json({
      success: true,
      orderId: finalized.orderId,
      alreadyFinalized: Boolean(finalized.alreadyFinalized),
    });
  }

  const status =
    finalized.code === "GATEWAY_UNREACHABLE"
      ? 502
      : finalized.code === "FINALIZE_RACE"
        ? 500
        : 400;

  console.error("[verify-payment] payment verification failed", {
    code: finalized.code,
    razorpayOrderId,
    razorpayPaymentId,
  });

  return NextResponse.json(
    {
      success: false,
      error: "Payment could not be confirmed",
      code: finalized.code,
    },
    { status }
  );
}
