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
  let amountPaise: number | undefined;

  const payment = body?.payload?.payment?.entity;
  const order = body?.payload?.order?.entity;

  if (payment && typeof payment === "object") {
    razorpayOrderId = String(payment.order_id ?? "");
    razorpayPaymentId = String(payment.id ?? "");
    if (typeof payment.amount === "number") amountPaise = payment.amount;
  }
  if (order && typeof order === "object") {
    razorpayOrderId = razorpayOrderId || String(order.id ?? "");
    if (amountPaise === undefined && typeof order.amount_paid === "number") {
      amountPaise = order.amount_paid;
    }
  }

  if (!razorpayOrderId) {
    console.error("[razorpay-webhook] event without razorpay order id", {
      event,
    });
    return NextResponse.json({ received: true });
  }

  await connectDB();

  // order.paid carries no payment id — the payment is authoritative, so fetch
  // it server-side rather than trusting anything from the webhook body.
  if (!razorpayPaymentId) {
    try {
      const razorpay = getRazorpay();
      const payments = await razorpay.orders.fetchPayments(razorpayOrderId);
      const captured = Array.isArray(payments.items)
        ? payments.items.find(
            (p) => p.status === "captured" || p.status === "authorized"
          )
        : undefined;
      if (captured) {
        razorpayPaymentId = String(captured.id ?? "");
        if (amountPaise === undefined && typeof captured.amount === "number") {
          amountPaise = captured.amount;
        }
      }
    } catch (error) {
      console.error(
        "[razorpay-webhook] could not resolve payment id for order.paid",
        { razorpayOrderId, message: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  if (!razorpayPaymentId) {
    console.error("[razorpay-webhook] no payment id resolvable", {
      razorpayOrderId,
    });
    return NextResponse.json({ received: true });
  }

  const result = await finalizeOrderPayment({
    razorpayOrderId,
    razorpayPaymentId,
    expectedAmountPaise: amountPaise,
    source: "webhook",
  });

  if (result.ok) {
    console.log("[razorpay-webhook] payment finalized", {
      razorpayOrderId,
      razorpayPaymentId,
      orderId: result.orderId,
      event,
    });
    return NextResponse.json({ received: true, orderId: result.orderId });
  }

  if (result.code === "GATEWAY_UNREACHABLE") {
    // Transient — let Razorpay retry.
    return NextResponse.json({ error: "Retry later" }, { status: 500 });
  }

  // Permanently unfinalizable here: alert the admin so a manual reconcile can
  // happen (Razorpay already charged the customer, no local record exists).
  try {
    await Notification.create({
      message: `Paid Razorpay order ${razorpayOrderId} has no local order (${result.code}) — reconcile manually`,
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