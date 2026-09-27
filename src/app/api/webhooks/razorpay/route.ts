export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { getRazorpay } from "@/lib/razorpay";
import { finalizeOrderPayment } from "@/lib/razorpay-payment";

/**
 * Server-side recovery webhook. The browser callback (verify-payment) can be
 * lost — closed tab, killed browser, offline Vercel function — but Razorpay
 * keeps retrying this endpoint until it returns 2xx. Only a verified payment
 * can finalize an order here; the HMAC gate below is the only way in.
 *
 * Events handled: payment.captured, order.paid. Everything else is acked.
 */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error(
      "[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not configured"
    );
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(raw, "utf8")
    .digest("hex");

  if (!signature || !safeEqual(expected, signature)) {
    console.error("[razorpay-webhook] signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: {
    event?: string;
    payload?: {
      payment?: { entity?: Record<string, unknown> };
      order?: { entity?: Record<string, unknown> };
    };
  };
  try {
    body = JSON.parse(raw || "{}") as typeof body;
  } catch {
    console.error("[razorpay-webhook] invalid JSON body");
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const event = body?.event ?? "";
  if (event !== "payment.captured" && event !== "order.paid") {
    // Ack-and-drop anything we do not act on so Razorpay stops retrying.
    return NextResponse.json({ received: true });
  }

  let razorpayOrderId = "";
  let razorpayPaymentId = "";

  const payment = body?.payload?.payment?.entity;
  const order = body?.payload?.order?.entity;

  if (payment && typeof payment === "object") {
    razorpayOrderId = String(payment.order_id ?? "");
    razorpayPaymentId = String(payment.id ?? "");
  }
  if (order && typeof order === "object") {
    razorpayOrderId = razorpayOrderId || String(order.id ?? "");
  }

  if (!razorpayOrderId) {
    console.error("[razorpay-webhook] event without razorpay order id", {
      event,
    });
    return NextResponse.json({ received: true });
  }

  console.log("[razorpay-webhook] event received", {
    event,
    razorpayOrderId,
    razorpayPaymentId,
  });

  await connectDB();

  // order.paid carries no payment id. Resolve it from the gateway rather than
  // trusting the webhook body, and only accept a CAPTURED payment — an
  // authorised-but-uncaptured payment is not money the customer actually paid
  // and must never mark an order as paid.
  if (!razorpayPaymentId) {
    try {
      const razorpay = getRazorpay();
      const payments = await razorpay.orders.fetchPayments(razorpayOrderId);
      const captured = Array.isArray(payments.items)
        ? payments.items.find((p) => p.status === "captured")
        : undefined;
      if (captured) {
        razorpayPaymentId = String(captured.id ?? "");
      }
    } catch (error) {
      console.error(
        "[razorpay-webhook] could not resolve payment id for order.paid",
        { razorpayOrderId, message: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  if (!razorpayPaymentId) {
    // Transient: the payment entity may not be visible yet. Ask Razorpay to
    // retry instead of acknowledging a captured payment we could not apply.
    console.error("[razorpay-webhook] no captured payment resolvable", {
      razorpayOrderId,
    });
    return NextResponse.json({ error: "Retry later" }, { status: 500 });
  }

  const result = await finalizeOrderPayment({
    razorpayOrderId,
    razorpayPaymentId,
    source: "webhook",
  });

  if (result.ok) {
    console.log("[razorpay-webhook] payment finalized", {
      razorpayOrderId,
      razorpayPaymentId,
      orderId: result.orderId,
      alreadyFinalized: Boolean(result.alreadyFinalized),
      event,
    });
    return NextResponse.json({ received: true, orderId: result.orderId });
  }

  // Transient conditions must not be acknowledged, or Razorpay stops retrying
  // and captured money never reaches the admin panel.
  if (
    result.code === "GATEWAY_UNREACHABLE" ||
    result.code === "FINALIZE_RACE" ||
    result.code === "ORDER_NOT_FOUND"
  ) {
    console.error("[razorpay-webhook] retryable failure", {
      razorpayOrderId,
      razorpayPaymentId,
      code: result.code,
    });
    return NextResponse.json({ error: "Retry later" }, { status: 500 });
  }

  // Permanently unfinalizable here (bad signature, amount mismatch, payment not
  // captured). Alert the admin so a manual reconcile can happen — the customer
  // was charged at Razorpay and no local order reflects it.
  try {
    await Notification.create({
      message: `Paid Razorpay order ${razorpayOrderId} could not be applied (${result.code}) — reconcile manually`,
      type: "payment",
    });
  } catch (error) {
    console.error("[razorpay-webhook] reconciliation notification failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  console.error("[razorpay-webhook] payment not finalized", {
    razorpayOrderId,
    razorpayPaymentId,
    code: result.code,
    error: result.error,
  });

  return NextResponse.json({ received: true });
}