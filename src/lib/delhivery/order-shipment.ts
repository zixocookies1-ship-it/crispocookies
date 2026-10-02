import type { HydratedDocument } from "mongoose";
import type { IOrder } from "@/models/Order";
import Order from "@/models/Order";
import Notification from "@/models/Notification";
import {
  createDelhiveryShipment,
  resolveShipmentLines,
  totalWeightGrams,
  buildDhlTrackingUrl,
  getDelhiveryConfigStatus,
  DelhiveryError,
} from "./index";

export interface AutoShipmentResult {
  ok: boolean;
  waybill?: string;
  /** Machine-readable error/success code surfaced to the admin API + UI. */
  code?: string;
  error?: string;
  /** Customer-safe explanation for the admin UI (falls back to error). */
  safeMessage?: string;
  /**
   * false when the failure is a validation/configuration error that will not
   * fix itself, so the retry cron must leave this order alone until an admin
   * intervenes. Only meaningful when ok === false.
   */
  retryable?: boolean;
}

/**
 * A `syncing` claim older than this is considered abandoned (the serverless
 * function was killed mid-call) and may be taken over. Delhivery calls are
 * bounded by a 15s per-request timeout, so 2 minutes is comfortably past any
 * live attempt.
 */
const STALE_SYNCING_MS = 2 * 60 * 1000;

/**
 * Failures that are safe to retry automatically: network/timeout/rate-limit
 * conditions, upstream 5xx, and our own "env not configured yet" guards —
 * the latter two make no (or a single harmless) outbound call and start
 * working the moment the environment is fixed.
 *
 * Everything else is a 4xx rejection from Delhivery (bad address, bad phone,
 * unregistered pickup location, rejected token …). Hammering those daily
 * would only generate noise, so they wait for an admin to fix the order or
 * the configuration and press Retry / Sync pending.
 */
const TRANSIENT_CODES = new Set([
  "DELHIVERY_TIMEOUT",
  "DELHIVERY_UNREACHABLE",
  "DELHIVERY_RATE_LIMITED",
  "DELHIVERY_NOT_CONFIGURED",
  "PICKUP_LOCATION_NOT_CONFIGURED",
  "SHIPMENT_CREATION_FAILED",
]);

/** Should the cron keep retrying after this failure? */
function isRetryableFailure(
  code: string | undefined,
  status: number | undefined
): boolean {
  if (code && TRANSIENT_CODES.has(code)) return true;
  if (typeof status === "number") {
    if (status === 429) return true;
    if (status >= 500) return true;
    if (status >= 400 && status < 500) return false;
  }
  // Unknown origin: do not hammer an endpoint we cannot classify.
  return false;
}

/**
 * Create a Delhivery shipment for a PAID order.
 *
 * Idempotency has two layers:
 *  1. A cheap read of `order.waybill` short-circuits any order that already
 *     has a waybill.
 *  2. Before the outbound call we take an ATOMIC claim (`syncState: "syncing"`
 *     guarded by `waybill: null`), so two concurrent callers — browser
 *     verify-payment + Razorpay webhook + cron + admin button — can never
 *     both reach Delhivery's create endpoint for the same order. A claim left
 *     behind by a killed process goes stale after 2 minutes and is reclaimed.
 *
 * Failures are persisted (`syncState`, `shipmentError`, `syncRetryCount`,
 * `syncRetryable`) so the cron, the admin retry button and the batch sync all
 * have something to act on.
 */
export async function attemptAutoShipment(
  order: HydratedDocument<IOrder>
): Promise<AutoShipmentResult> {
  // Cheapest and most durable check first: a waybill already exists, so
  // nothing — not even a missing token — can make us create a second one.
  if (order.waybill) {
    // Repair a drifted syncState (e.g. an older run died after Delhivery had
    // already accepted the shipment but before "synced" was written).
    if (order.syncState !== "synced") {
      order.syncState = "synced";
      order.syncAttemptedAt = new Date();
      order.shipmentError = undefined;
      await persistQuietly(order, "repair sync state for existing waybill");
    }
    return {
      ok: true,
      waybill: String(order.waybill),
      code: "SHIPMENT_ALREADY_EXISTS",
      error: "Shipment already created for this order.",
    };
  }
  // Before any configuration state is written: an unpaid order must not be
  // stamped with a Delhivery sync outcome it has no business having.
  if (order.paymentStatus !== "paid") {
    return { ok: false, code: "ORDER_NOT_PAID", error: "Order is not paid yet." };
  }
  const config = getDelhiveryConfigStatus();
  if (!config.configured) {
    order.syncState = "unconfigured";
    order.syncAttemptedAt = new Date();
    order.syncRetryable = true;
    await persistQuietly(order, "record unconfigured sync state");
    const missing =
      config.missing.length > 0 ? config.missing.join(", ") : "DELHIVERY_API_TOKEN";
    return {
      ok: false,
      code: "DELHIVERY_NOT_CONFIGURED",
      error: `Delhivery is not configured (missing: ${missing}).`,
      retryable: true,
    };
  }

  // ------------------------------------------------------------------
  // Atomic claim — the single guard that makes creation idempotent.
  // ------------------------------------------------------------------
  const claim = await Order.updateOne(
    {
      _id: order._id,
      waybill: null,
      paymentStatus: "paid",
      $or: [
        // Any state other than an active claim is claimable…
        { syncState: { $ne: "syncing" } },
        // …and a claim abandoned by a killed process goes stale.
        {
          syncState: "syncing",
          syncAttemptedAt: { $lt: new Date(Date.now() - STALE_SYNCING_MS) },
        },
      ],
    },
    {
      $set: {
        syncState: "syncing",
        syncAttemptedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  if (claim.matchedCount === 0) {
    const fresh = await Order.findById(order._id);
    if (fresh) {
      // Hand the caller the authoritative shipment fields so the admin UI
      // shows the AWB another concurrent run just created.
      order.waybill = fresh.waybill;
      order.shipmentId = fresh.shipmentId;
      order.shipmentStatus = fresh.shipmentStatus;
      order.trackingUrl = fresh.trackingUrl;
      order.labelUrl = fresh.labelUrl;
      order.syncState = fresh.syncState;
      order.syncAttemptedAt = fresh.syncAttemptedAt;
      order.syncRetryCount = fresh.syncRetryCount;
      order.shipmentError = fresh.shipmentError;
      if (fresh.waybill) {
        return {
          ok: true,
          waybill: String(fresh.waybill),
          code: "SHIPMENT_ALREADY_EXISTS",
          error: "Shipment already created for this order.",
        };
      }
    }
    return {
      ok: false,
      code: "SHIPMENT_SYNC_IN_PROGRESS",
      error: "Another shipment sync is already running for this order. Try again shortly.",
      retryable: true,
    };
  }

  try {
    const lines = await resolveShipmentLines(order.items as Array<{
      productId?: unknown;
      name?: string;
      variant?: string;
      qty?: number;
    }>);

    // Prefer the weight that was actually used for the checkout shipping
    // quote so sync never depends on product records being unchanged. An
    // admin-entered package weight override wins over everything.
    const storedWeight =
      typeof order.shippingWeightGrams === "number"
        ? order.shippingWeightGrams
        : 0;
    const resolvedWeight = totalWeightGrams(lines);
    const overrideWeight =
      typeof order.shipmentWeightOverrideGrams === "number" &&
      order.shipmentWeightOverrideGrams > 0
        ? order.shipmentWeightOverrideGrams
        : 0;
    const weightGrams =
      overrideWeight > 0
        ? overrideWeight
        : storedWeight > 0
          ? storedWeight
          : resolvedWeight > 0
            ? resolvedWeight
            : 0;

    const response = await createDelhiveryShipment({
      orderId: order.orderId,
      orderedAt: order.createdAt || new Date(),
      customerName: order.customerName,
      address: order.address,
      phone: order.phone,
      lines,
      totalAmount: order.total,
      weightGrams,
      packageDescription:
        typeof order.packageDescription === "string"
          ? order.packageDescription
          : undefined,
      shippingMode:
        order.shippingModeOverride === "E" || order.shippingModeOverride === "S"
          ? order.shippingModeOverride
          : undefined,
    });

    // createDelhiveryShipment returns ONLY a real packages[].waybill or throws.
    // It never fabricates an AWB from the UPL… upload_wbn batch reference.
    const waybill = response.waybill;
    if (!waybill) {
      throw new DelhiveryError("Delhivery did not return a waybill for the shipment", {
        status: 422,
        code: "DELHIVERY_API_ERROR",
        safeMessage: "Delhivery did not return a tracking number.",
      });
    }

    order.waybill = String(waybill);
    order.shipmentId = response.shipmentId ? String(response.shipmentId) : "";
    order.shipmentStatus = "Manifested";
    order.shipmentCreatedAt = new Date();
    order.trackingUrl = buildDhlTrackingUrl(String(waybill));
    // Label endpoint streams the PDF fresh from Delhivery — never store a URL.
    order.labelUrl = null;
    order.shipmentError = undefined;
    order.syncState = "synced";
    order.syncAttemptedAt = new Date();
    order.syncRetryable = true;
    // The waybill is the durable record of success — this save must not be
    // swallowed, because losing it would make us re-create the shipment.
    await order.save();

    // A notification failure must NEVER turn a created shipment into a
    // "failed" sync state: the AWB already exists on the order.
    await Notification.create({
      message: `Shipment created for order #${order.orderId} — AWB ${waybill}`,
      type: "order",
      orderId: String(order._id),
    }).catch((error) => {
      console.error("[delhivery] could not create shipment notification", {
        orderId: order.orderId,
        message: error instanceof Error ? error.message : String(error),
      });
    });

    console.log("[delhivery] auto-shipment created", {
      orderId: order.orderId,
      waybill,
      shipmentId: order.shipmentId || undefined,
    });

    return { ok: true, waybill: String(waybill), code: "SHIPMENT_CREATED" };
  } catch (error) {
    const isDelhiveryError = error instanceof DelhiveryError;
    const message = isDelhiveryError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Shipment creation failed";
    const safeMessage = isDelhiveryError
      ? error.safeMessage
      : message;
    const code = isDelhiveryError
      ? error.code || "DELHIVERY_API_ERROR"
      : "SHIPMENT_CREATION_FAILED";
    const status = isDelhiveryError ? error.status : undefined;
    const retryable = isRetryableFailure(code, status);

    const previousError = order.shipmentError || "";
    const previousCount = order.syncRetryCount || 0;
    order.shipmentError = message.slice(0, 500);
    order.syncState = "failed";
    order.syncAttemptedAt = new Date();
    order.syncRetryCount = previousCount + 1;
    order.syncRetryable = retryable;
    // Losing this record would silently reset the retry counter and hide the
    // error from the admin panel, so log instead of swallowing.
    await persistQuietly(order, "record shipment failure");

    console.error("[delhivery] auto-shipment failed", {
      orderId: order.orderId,
      code,
      status,
      retryable,
      retryCount: order.syncRetryCount,
      message,
    });

    // Notify only on a first failure or when the error actually changed —
    // a permanently-broken order must not push a notification every day.
    if (previousCount === 0 || previousError !== message) {
      await Notification.create({
        message: `Delhivery sync failed for order #${order.orderId} — ${message.slice(0, 200)}`,
        type: "order",
        orderId: String(order._id),
      }).catch(() => {});
    }

    return { ok: false, code, error: message, safeMessage, retryable };
  }
}

/** Save an order, logging (never throwing) when the write itself fails. */
async function persistQuietly(
  order: HydratedDocument<IOrder>,
  what: string
): Promise<void> {
  try {
    await order.save();
  } catch (error) {
    console.error("[delhivery] could not persist order after shipment attempt", {
      orderId: order.orderId,
      what,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
