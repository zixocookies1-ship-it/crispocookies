export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { attemptAutoShipment } from "@/lib/delhivery/order-shipment";
import { resumePostPaymentEffects } from "@/lib/razorpay-payment";

/**
 * Reconciliation job. Two jobs in one pass, because a payment is only really
 * complete when every local effect has run:
 *
 *   1. Recover paid orders whose local bookkeeping (coupon usage, customer
 *      upsert, admin notification, stock) never finished — e.g. the function
 *      that was executing was killed when the serverless invocation ended.
 *      The per-order fulfillment ledger makes the retry idempotent.
 *   2. Re-attempt Delhivery sync for paid orders that never received a
 *      waybill (transient failures, or orders created while the integration
 *      was not configured yet).
 *
 * Triggered by vercel.json cron; authenticated with the CRON_SECRET header
 * Vercel injects as `Authorization: Bearer <CRON_SECRET>`.
 *
 * Auto-retry throttle: orders are only retried if the last attempt was more
 * than 30 minutes ago, so permanently-failing orders do not hammer the API.
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured; job disabled" },
      { status: 503 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // ------------------------------------------------------------------
  // 1. Finish any local post-payment bookkeeping that was interrupted.
  // ------------------------------------------------------------------
  const incomplete = await Order.find({
    paymentStatus: "paid",
    orderStatus: { $ne: "cancelled" },
    $or: [
      { "fulfillment.coupon": { $in: ["pending", "failed"] } },
      { "fulfillment.customer": { $in: ["pending", "failed"] } },
      { "fulfillment.notification": { $in: ["pending", "failed"] } },
      { "fulfillment.stock": { $in: ["pending", "failed", "attention"] } },
    ],
  })
    .select("_id orderId")
    .sort({ createdAt: 1 })
    .limit(50);

  let effectsResumed = 0;
  const effectsFailed: string[] = [];
  for (const order of incomplete) {
    try {
      const ok = await resumePostPaymentEffects(String(order._id));
      if (ok) effectsResumed += 1;
      else effectsFailed.push(order.orderId);
    } catch (error) {
      effectsFailed.push(order.orderId);
      console.error("[sync-delhivery] resumePostPaymentEffects failed", {
        orderId: order.orderId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ------------------------------------------------------------------
  // 2. Retry shipment creation for paid orders without a waybill.
  // ------------------------------------------------------------------
  const retryBefore = new Date(Date.now() - 30 * 60 * 1000);
  const candidates = await Order.find({
    $and: [
      { paymentStatus: "paid" },
      { orderStatus: { $ne: "cancelled" } },
      // waybill: null also matches documents where the field is absent.
      { waybill: null },
      {
        $or: [{ syncState: { $ne: "synced" } }, { syncState: { $exists: false } }],
      },
      {
        $or: [
          { syncAttemptedAt: { $exists: false } },
          { syncAttemptedAt: { $lt: retryBefore } },
        ],
      },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(30);

  let synced = 0;
  let failed = 0;
  const sampleErrors: string[] = [];
  const errored: string[] = [];

  for (const order of candidates) {
    const result = await attemptAutoShipment(order);
    if (result.ok) {
      synced += 1;
    } else {
      failed += 1;
      errored.push(order.orderId);
      if (result.error) sampleErrors.push(result.error.slice(0, 200));
    }
  }

  return NextResponse.json({
    effects: {
      scanned: incomplete.length,
      resumed: effectsResumed,
      failed: effectsFailed.slice(0, 30),
    },
    shipment: {
      attempted: candidates.length,
      synced,
      failed,
      errored: errored.slice(0, 30),
      sampleErrors,
    },
  });
}

export const GET = handle;
export const POST = handle;