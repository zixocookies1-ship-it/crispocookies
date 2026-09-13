export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { getRazorpay } from "@/lib/razorpay";
import { finalizeOrderPayment } from "@/lib/razorpay-payment";

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
            .filter((p) => p.status === "captured" || p.status === "authorized")
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

    const missing: MissingEntry[] = [];
    for (const p of payments) {
      if (!p.order_id) continue;
      const exists = await Order.findOne({ razorpayOrderId: p.order_id })
        .lean()
        .select({ _id: 1 });
      if (!exists) {
        missing.push({
          razorpayOrderId: p.order_id,
          razorpayPaymentId: p.id,
          amountPaise: p.amount,
          status: p.status,
        });
      }
    }

    return NextResponse.json({ missing, total: missing.length });
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
      amountPaise?: number;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const razorpayOrderId = body?.razorpayOrderId;
    const razorpayPaymentId = body?.razorpayPaymentId;
    if (!razorpayOrderId || !razorpayPaymentId) {
      return NextResponse.json(
        { error: "Missing razorpayOrderId / razorpayPaymentId" },
        { status: 400 }
      );
    }

    await connectDB();

    const result = await finalizeOrderPayment({
      razorpayOrderId,
      razorpayPaymentId,
      expectedAmountPaise: body?.amountPaise,
      source: "webhook",
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
