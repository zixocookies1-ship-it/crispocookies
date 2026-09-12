export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import {
  isDelhiveryConfigured,
  getShipmentTracking,
  mapDelhiveryState,
} from "@/lib/delhivery";

/**
 * Public order tracking. Reads only enough data to show status/scan timeline —
 * never address, phone or email.
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("order")?.trim();
  if (!orderId) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  try {
    await connectDB();
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }

  const order = await Order.findOne({ orderId }).lean();
  if (!order) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  let shipmentStatus = order.shipmentStatus;
  let lastScan = order.lastScan;
  let lastScanTime = order.lastScanTime
    ? order.lastScanTime.toISOString()
    : null;

  // Refresh from Delhivery when a shipment exists but the stored scan is
  // stale (older than 20 minutes), so the customer sees progress without
  // hammering the API on every refresh.
  const stale =
    !lastScanTime || Date.now() - new Date(lastScanTime).getTime() > 20 * 60 * 1000;
  if (order.waybill && isDelhiveryConfigured() && stale) {
    try {
      const { latest } = await getShipmentTracking([String(order.waybill)]);
      if (latest) {
        const mapped = mapDelhiveryState(latest);
        shipmentStatus = mapped.shipmentStatus ?? shipmentStatus;
        lastScan = latest.scan || latest.status || lastScan;
        lastScanTime = latest.statusDateTime || null;
        await Order.updateOne(
          { orderId },
          {
            $set: {
              lastScan,
              lastScanTime: lastScanTime
                ? new Date(lastScanTime)
                : new Date(),
              shipmentStatus,
              ...(mapped.orderStatus && mapped.orderStatus === "delivered"
                ? { orderStatus: "delivered" }
                : {}),
            },
          }
        );
      }
    } catch (error) {
      console.warn("[track] Delhivery refresh failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({
    found: true,
    orderId: order.orderId,
    status: order.orderStatus,
    paymentStatus: order.paymentStatus,
    shipmentStatus,
    lastScan,
    lastScanTime,
    placedAt: order.createdAt ? order.createdAt.toISOString() : null,
    deliveryCharge: order.deliveryCharge,
    total: order.total,
    trackingUrl: order.trackingUrl || null,
    items: (order.items || []).map((item: { name?: string; qty?: number }) => ({
      name: item.name || "Item",
      qty: item.qty || 0,
    })),
  });
}