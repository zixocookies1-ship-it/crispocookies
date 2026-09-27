export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { getRazorpay } from "@/lib/razorpay";
import { finalizeOrderPayment, resumePostPaymentEffects } from "@/lib/razorpay-payment";

interface MissingEntry {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaise: number;
  status: string;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const razorpay = getRazorpay();
    let payments: Array<{
      id: string;
      order_id: string;
      amount: number;
      status: string;
    }> = [];

    try {
      const res = await razorpay.payments.all({ count: 100 });
      payments = Array.isArray(res.items)
        ? res.items
            .filter((p) => p.status === "captured")
            .map((p) => ({
              id: String(p.id ?? ""),
              order_id: String(p.order_id ?? ""),
              amount: Number(p.amount ?? 0),
              status: String(p.status ?? ""),
            }))
        : [];
    } catch (error) {
      console.error("[reconcile] could not fetch razorpay payments", {
        message: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Could not reach payment gateway" },
        { status: 502 }
      );
    }

    // One query for every gateway order id instead of one findOne per payment.
    const gatewayOrderIds = Array.from(
      new Set(
        payments.map((p) => p.order_id).filter((id) => Boolean(id))
      )
    );
    const localOrderIds = gatewayOrderIds.length
      ? await Order.find({ razorpayOrderId: { $in: gatewayOrderIds } })
          .select({ razorpayOrderId: 1 })
          .lean()
      : [];
    const known = new Set(
      localOrderIds.map((o) => String(o.razorpayOrderId))
    );

    const missing: MissingEntry[] = payments
      .filter((p) => p.order_id && !known.has(p.order_id))
      .map((p) => ({
        razorpayOrderId: p.order_id,
        razorpayPaymentId: p.id,
        amountPaise: p.amount,
        status: p.status,
      }));

    // Paid orders whose local bookkeeping never finished (function killed
    // mid-run, transient database error). These are repairable without any
    // customer action, so they are surfaced next to the unlinkable payments.
    const incomplete = await Order.find({
      paymentStatus: "paid",
      $or: [
        { "fulfillment.notification": { $in: ["pending", "failed"] } },
        { "fulfillment.customer": { $in: ["pending", "failed"] } },
        { "fulfillment.stock": { $in: ["pending", "failed", "attention"] } },
        { "fulfillment.coupon": { $in: ["pending", "failed"] } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean()
      .select({ _id: 1, orderId: 1, fulfillment: 1 });

    return NextResponse.json({
      missing,
      total: missing.length,
      incompleteFulfillment: incomplete.map((o) => ({
        orderObjectId: String(o._id),
        orderId: o.orderId,
        fulfillment: o.fulfillment,
      })),
    });
  } catch (error) {
    console.error("[reconcile] GET failed", error);
    return NextResponse.json(
      { error: "Reconciliation failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: {
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      orderObjectId?: string;
      action?: "finalize" | "resume";
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    await connectDB();

    // Repairing an already-paid order only needs the local id: the payment
    // itself was verified when it was first marked paid, so the local
    // bookkeeping is simply re-run through the idempotent fulfillment ledger.
    if (body?.action === "resume") {
      const orderObjectId = String(body?.orderObjectId ?? "");
      if (!/^[a-f\d]{24}$/i.test(orderObjectId)) {
        return NextResponse.json(
          { error: "Missing orderObjectId" },
          { status: 400 }
        );
      }
      const resumed = await resumePostPaymentEffects(orderObjectId);
      return NextResponse.json({ success: resumed, action: "resume" });
    }

    const razorpayOrderId = body?.razorpayOrderId;
    const razorpayPaymentId = body?.razorpayPaymentId;
    if (!razorpayOrderId || !razorpayPaymentId) {
      return NextResponse.json(
        { error: "Missing razorpayOrderId / razorpayPaymentId" },
        { status: 400 }
      );
    }

    // The amount is deliberately NOT taken from the request. finalizeOrderPayment
    // compares the gateway payment against the immutable total stored on the
    // local order, so a reconciliation action can never mark a mismatched
    // payment as paid.
    const result = await finalizeOrderPayment({
      razorpayOrderId: String(razorpayOrderId),
      razorpayPaymentId: String(razorpayPaymentId),
      source: "reconcile",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[reconcile] POST failed", error);
    return NextResponse.json(
      { error: "Reconciliation action failed" },
      { status: 500 }
    );
  }
}
