export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Notification from "@/models/Notification";
import { mapDelhiveryState } from "@/lib/delhivery";

/**
 * Delhivery Scan Push webhook.
 *
 * Delhivery webhooks use whatever header YOUR account is configured to send
 * (there is no HMAC/signature scheme). Setup: in the Delhivery One portal,
 * register this endpoint and an `Authorization` header set to the value of
 * DELHIVERY_WEBHOOK_TOKEN. Until that env var is configured this endpoint
 * refuses requests, so an exposed route can never mutate orders.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.DELHIVERY_WEBHOOK_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Webhook not enabled" }, { status: 401 });
  }

  const auth = request.headers.get("authorization") || "";
  const matches =
    auth === `Bearer ${expected}` || auth === `Token ${expected}` || auth === expected;
  if (!matches) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const shipment =
    (payload as { Shipment?: Record<string, unknown> })?.Shipment || null;
  const waybill = shipment?.AWB;
  if (!waybill) {
    return NextResponse.json({ error: "Missing AWB" }, { status: 400 });
  }

  try {
    await connectDB();
    const status =
      (shipment.Status as { Status?: string; StatusType?: string })?.Status ||
      null;
    const statusType =
      (shipment.Status as { StatusType?: string })?.StatusType || null;

    const order = await Order.findOne({ waybill: String(waybill) });
    if (!order) {
      // Respond OK so Delhivery stops retrying (nothing we can re-push to).
      return NextResponse.json({ received: true, matched: false });
    }

    const mapped = mapDelhiveryState({
      status: status || undefined,
      statusType: statusType || undefined,
    });

    order.lastScan = status || order.lastScan;
    order.lastScanType = statusType || order.lastScanType;
    order.lastScanTime = new Date();
    order.shipmentStatus = mapped.shipmentStatus ?? order.shipmentStatus;
    if (mapped.orderStatus) {
      const wasDelivered = order.orderStatus === "delivered";
      if (order.orderStatus !== "cancelled") {
        order.orderStatus = mapped.orderStatus;
      }
      if (!wasDelivered && mapped.orderStatus === "delivered") {
        await Notification.create({
          message: `Order #${order.orderId} delivered — waybill ${waybill}`,
          type: "order",
          orderId: String(order._id),
        });
      }
    }
    await order.save();

    return NextResponse.json({ received: true, matched: true });
  } catch (error) {
    console.error("[delhivery-webhook] processing failed", {
      waybill,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}