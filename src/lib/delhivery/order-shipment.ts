import type { HydratedDocument } from "mongoose";
import type { IOrder } from "@/models/Order";
import Notification from "@/models/Notification";
import {
  createDelhiveryShipment,
  getShippingLabelUrl,
  resolveShipmentLines,
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
 * waybill / label / tracking url on the order so a failed attempt can be
 * retried from the admin panel.
 *
 * This is called automatically right after Razorpay verification so prepaid
 * orders are handed to Delhivery for scanning as early as possible.
 */
export async function attemptAutoShipment(
  order: HydratedDocument<IOrder>
): Promise<AutoShipmentResult> {
  if (!isDelhiveryConfigured()) {
    return { ok: false, error: "Delhivery is not configured." };
  }
  if (order.paymentStatus !== "paid") {
    return { ok: false, error: "Order is not paid yet." };
  }
  if (order.waybill && order.shipmentStatus) {
    return { ok: true, waybill: order.waybill };
  }

  try {
    const lines = await resolveShipmentLines(order.items as Array<{
      productId?: unknown;
      name?: string;
      variant?: string;
      qty?: number;
    }>, { requireWeights: true });

    const response = await createDelhiveryShipment({
      orderId: order.orderId,
      orderedAt: order.createdAt || new Date(),
      customerName: order.customerName,
      address: order.address,
      phone: order.phone,
      lines,
      totalAmount: order.total,
    });

    const pkg = response.packages?.[0];
    const waybill = pkg?.waybill || response.upload_wbn;
    if (!waybill) {
      throw new Error("Delhivery did not return a waybill for the shipment.");
    }

    // Label is best-effort; a packing-slip hiccup must not fail the shipment.
    let labelUrl: string | null = null;
    try {
      labelUrl = await getShippingLabelUrl(waybill);
    } catch (error) {
      console.warn("[delhivery] label fetch failed", {
        waybill,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    order.waybill = waybill;
    order.shipmentId = response.upload_wbn || "";
    order.shipmentStatus = "Manifested";
    order.shipmentCreatedAt = new Date();
    order.trackingUrl = buildDhlTrackingUrl(waybill);
    if (labelUrl) order.labelUrl = labelUrl;
    order.shipmentError = undefined;
    await order.save();

    await Notification.create({
      message: `Shipment created for order #${order.orderId} — AWB ${waybill}`,
      type: "order",
      orderId: String(order._id),
    });

    return { ok: true, waybill };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Shipment creation failed";
    order.shipmentError = message.slice(0, 500);
    await order.save().catch(() => {});
    console.error("[delhivery] auto-shipment failed", {
      orderId: order.orderId,
      message,
    });
    return { ok: false, error: message };
  }
}