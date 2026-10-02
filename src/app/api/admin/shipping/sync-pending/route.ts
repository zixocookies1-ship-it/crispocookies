export const dynamic = "force-dynamic";
// Each candidate costs up to two outbound Delhivery calls (15s timeout each),
// so the batch runs under an explicit time budget rather than being cut off
// mid-loop by the platform default.
export const maxDuration = 60;
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { attemptAutoShipment } from "@/lib/delhivery";

/**
 * Batch "Sync Pending Delhivery Orders".
 *
 * Recovers the backlog of PAID orders that never received an AWB (e.g. the
 * fire-and-forget hand-off was frozen before it reached Delhivery) without
 * waiting for the daily cron — which runs once a day and only when
 * CRON_SECRET is set.
 *
 * Unlike the cron, this deliberately INCLUDES orders whose last failure was a
 * validation error (syncRetryable === false): the admin is expected to have
 * corrected the address / pickup location first, and is confirming the action
 * explicitly. Every order is attempted independently, so one rejection never
 * aborts the batch.
 */

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
/**
 * Stop starting new candidates once this much time has elapsed, so the loop
 * finishes (and reports what is left) instead of being killed by the
 * function timeout with half the batch unsaved. The admin simply presses the
 * button again for the remainder.
 */
const TIME_BUDGET_MS = 45_000;

function pendingQuery(): Record<string, unknown> {
  return { paymentStatus: "paid", orderStatus: { $ne: "cancelled" }, waybill: null };
}

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** GET = dry run: what would be synced, and why each order is waiting. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  await connectDB();

  const [awaiting, blocked, syncing, synced] = await Promise.all([
    Order.countDocuments(pendingQuery()),
    Order.countDocuments({ ...pendingQuery(), syncRetryable: false }),
    Order.countDocuments({ ...pendingQuery(), syncState: "syncing" }),
    Order.countDocuments({ paymentStatus: "paid", waybill: { $ne: null } }),
  ]);

  const oldest = await Order.find(pendingQuery())
    .select("orderId createdAt syncState syncRetryCount syncRetryable shipmentError")
    .sort({ createdAt: 1 })
    .limit(10)
    .lean();

  return NextResponse.json({
    awaiting,
    blocked,
    syncing,
    synced,
    oldest: oldest.map((o) => ({
      orderId: o.orderId,
      createdAt: o.createdAt,
      syncState: o.syncState ?? "pending",
      syncRetryCount: o.syncRetryCount ?? 0,
      syncRetryable: o.syncRetryable !== false,
      error: o.shipmentError ?? null,
    })),
  });
}

/** POST = actually run the sync. Body: { limit?, includeBlocked? }. */
export async function POST(request: NextRequest) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    await connectDB();

    let limit = DEFAULT_LIMIT;
    let includeBlocked = true;
    try {
      const body = await request.json();
      if (body && typeof body === "object") {
        if (body.limit !== undefined) limit = Number(body.limit);
        if (body.includeBlocked !== undefined) {
          includeBlocked = Boolean(body.includeBlocked);
        }
      }
    } catch {
      // No/invalid body → defaults.
    }
    if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
    limit = Math.min(Math.floor(limit), MAX_LIMIT);

    const filter = pendingQuery();
    if (!includeBlocked) filter.syncRetryable = { $ne: false };

    const candidates = await Order.find(filter)
      .select("_id orderId")
      .sort({ createdAt: 1 })
      .limit(limit);

    const results: Array<{
      orderId: string;
      ok: boolean;
      code?: string;
      waybill?: string;
      error?: string;
      retryable?: boolean;
    }> = [];
    let synced = 0;
    let failed = 0;
    let processed = 0;
    let stoppedEarly = false;
    const startedAt = Date.now();

    for (const summary of candidates) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        stoppedEarly = true;
        break;
      }
      processed += 1;
      try {
        const order = await Order.findById(summary._id);
        if (!order) continue;
        const result = await attemptAutoShipment(order);
        results.push({
          orderId: order.orderId,
          ok: result.ok,
          code: result.code,
          waybill: result.waybill,
          error: result.ok ? undefined : result.error,
          retryable: result.retryable,
        });
        if (result.ok) synced += 1;
        else failed += 1;
      } catch (error) {
        failed += 1;
        results.push({
          orderId: summary.orderId,
          ok: false,
          code: "SHIPMENT_CREATION_FAILED",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const remaining = await Order.countDocuments(filter);

    console.log("[admin] batch delhivery sync", {
      attempted: processed,
      synced,
      failed,
      remaining,
      stoppedEarly,
    });

    return NextResponse.json({
      attempted: processed,
      requested: candidates.length,
      synced,
      failed,
      remaining,
      stoppedEarly,
      results,
    });
  } catch (error) {
    console.error("POST /api/admin/shipping/sync-pending error:", error);
    return NextResponse.json(
      { error: "Batch sync failed" },
      { status: 500 }
    );
  }
}
