export const dynamic = "force-dynamic";
// Resuming bookkeeping and retrying shipments both make outbound calls, so
// give the job headroom past the platform default instead of being killed
// mid-pass (which is how a paid order could stay without an AWB).
export const maxDuration = 60;
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
  //
  //    Deliberately excludes orders whose last failure was a validation
  //    error (syncRetryable === false): bad address, unregistered pickup
  //    location, rejected token… Those never fix themselves, so retrying
  //    them daily would only spam Delhivery and the admin notifications.
  //    They wait for an admin to correct the order and press Retry, or to
  //    run the batch sync.
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
      { $or: [{ syncRetryable: { $ne: false } }, { syncRetryable: { $exists: false } }] },
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

  // Orders waiting on a human: paid, no AWB, and the last error was a
  // 4xx rejection. Reported so the admin sees WHY they are not moving.
  const blocked = await Order.countDocuments({
    paymentStatus: "paid",
    orderStatus: { $ne: "cancelled" },
    waybill: null,
    syncRetryable: false,
  });

  let synced = 0;
  let failed = 0;
  let processed = 0;
  let stoppedEarly = false;
  const startedAt = Date.now();
  const sampleErrors: string[] = [];
  const errored: string[] = [];

  for (const order of candidates) {
    if (Date.now() - startedAt > 45_000) {
      // Report what is left rather than being killed by the function timeout
      // with no response at all. The next scheduled run picks up the rest.
      stoppedEarly = true;
      break;
    }
    processed += 1;
    try {
      const result = await attemptAutoShipment(order);
      if (result.ok) {
        synced += 1;
      } else {
        failed += 1;
        errored.push(order.orderId);
        if (result.error) sampleErrors.push(result.error.slice(0, 200));
      }
    } catch (error) {
      // One bad order (or one bad DB write) must never abort the whole pass
      // — the remaining candidates still need their chance.
      failed += 1;
      errored.push(order.orderId);
      const message = error instanceof Error ? error.message : String(error);
      sampleErrors.push(message.slice(0, 200));
      console.error("[sync-delhivery] attemptAutoShipment threw", {
        orderId: order.orderId,
        message,
      });
    }
  }

  return NextResponse.json({
    effects: {
      scanned: incomplete.length,
      resumed: effectsResumed,
      failed: effectsFailed.slice(0, 30),
    },
    shipment: {
      attempted: processed,
      queued: candidates.length,
      stoppedEarly,
      synced,
      failed,
      blocked,
      errored: errored.slice(0, 30),
      sampleErrors,
    },
  });
}

export const GET = handle;
export const POST = handle;