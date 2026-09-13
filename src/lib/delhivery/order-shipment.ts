import type { HydratedDocument } from "mongoose";
import type { IOrder } from "@/models/Order";
import Notification from "@/models/Notification";
import {
  createDelhiveryShipment,
  resolveShipmentLines,
  totalWeightGrams,
  buildDhlTrackingUrl,
  isDelhiveryConfigured,
} from "./index";

export interface AutoShipmentResult {
  ok: boolean;
  waybill?: string;
  error?: string;
}

/**
 * Create a Delhivery shipment for a PAID order. Idempotent: only runs when
 * there is no waybill yet AND the integration is configured. Persists the
 * waybill / tracking url / syncState on the order so a failed attempt can be
 * retried from the admin panel or the sync cron.
 *
 * This is called automatically right after Razorpay verification so prepaid
 * orders are handed to Delhivery for scanning as early as possible.
 */
export async function attemptAutoShipment(
  order: HydratedDocument<IOrder>
): Promise<AutoShipmentResult> {
  if (!isDelhiveryConfigured()) {
    order.syncState = "unconfigured";
    order.syncAttemptedAt = new Date();
    await order.save().catch(() => {});
    return { ok: false, error: "Delhivery is not configured." };
  }
  if (order.paymentStatus !== "paid") {
    return { ok: false, error: "Order is not paid yet." };
  }
  if (order.waybill && order.shipmentStatus) {
    order.syncState = "synced";
    order.syncAttemptedAt = new Date();
    return { ok: true, waybill: order.waybill };
  }

  try {
    const lines = await resolveShipmentLines(order.items as Array<{
      productId?: unknown;
      name?: string;
      variant?: string;
      qty?: number;
    }>);

    // Prefer the weight that was actually used for the checkout shipping
    // quote so sync never depends on product records being unchanged.
    const storedWeight =
      typeof order.shippingWeightGrams === "number"
        ? order.shippingWeightGrams
        : 0;
    const resolvedWeight = totalWeightGrams(lines);
    const weightGrams =
      storedWeight > 0 ? storedWeight : resolvedWeight > 0 ? resolvedWeight : 0;
    if (weightGrams <= 0) {
      throw new Error(
        "Order has no shipping weight. Update product shipping weights in the admin panel."
      );
    }

    const response = await createDelhiveryShipment({
      orderId: order.orderId,
      orderedAt: order.createdAt || new Date(),
      customerName: order.customerName,
      address: order.address,
      phone: order.phone,
      lines,
      totalAmount: order.total,
      weightGrams,
    });

    const pkg = response.packages?.[0];
    const waybill = pkg?.waybill || response.upload_wbn;
    if (!waybill) {
      throw new Error("Delhivery did not return a waybill for the shipment.");
    }

    order.waybill = String(waybill);
    order.shipmentId = response.upload_wbn ? String(response.upload_wbn) : "";
    order.shipmentStatus = "Manifested";
    order.shipmentCreatedAt = new Date();
    order.trackingUrl = buildDhlTrackingUrl(String(waybill));
    // Label endpoint streams the PDF fresh from Delhivery — never store a URL.
    order.labelUrl = null;
    order.shipmentError = undefined;
    order.syncState = "synced";
    order.syncAttemptedAt = new Date();
    await order.save();

    await Notification.create({
      message: `Shipment created for order #${order.orderId} — AWB ${waybill}`,
      type: "order",
      orderId: String(order._id),
    });

    return { ok: true, waybill: String(waybill) };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Shipment creation failed";
    order.shipmentError = message.slice(0, 500);
    order.syncState = "failed";
    order.syncAttemptedAt = new Date();
    await order.save().catch(() => {});
    console.error("[delhivery] auto-shipment failed", {
      orderId: order.orderId,
      message,
    });
    await Notification.create({
      message: `Delhivery sync failed for order #${order.orderId} — ${message.slice(0, 200)}`,
      type: "order",
      orderId: String(order._id),
    }).catch(() => {});
    return { ok: false, error: message };
  }
}