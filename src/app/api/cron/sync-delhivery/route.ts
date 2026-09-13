export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { attemptAutoShipment } from "@/lib/delhivery/order-shipment";

/**
 * Reconciliation job: re-attempts Delhivery sync for paid orders that never
 * received a waybill (transient failures, or orders created while the
 * integration was not configured yet). Triggered by vercel.json cron;
 * authenticated with the CRON_SECRET header Vercel injects as
 * `Authorization: Bearer <CRON_SECRET>`.
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
    attempted: candidates.length,
    synced,
    failed,
    errored: errored.slice(0, 30),
    sampleErrors,
  });
}

export const GET = handle;
export const POST = handle;