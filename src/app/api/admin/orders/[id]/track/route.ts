export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { getShipmentTracking, mapDelhiveryState } from "@/lib/delhivery";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();

    const order = await Order.findById(params.id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (!order.waybill) {
      return NextResponse.json(
        { error: "No shipment exists for this order yet" },
        { status: 400 }
      );
    }

    const { entries, latest } = await getShipmentTracking([order.waybill]);

    if (latest) {
      const mapped = mapDelhiveryState(latest);
      order.lastScan = latest.scan || latest.status || null;
      order.lastScanType = latest.statusType || latest.scanType || null;
      order.lastScanTime = latest.statusDateTime
        ? new Date(latest.statusDateTime)
        : new Date();
      order.shipmentStatus = mapped.shipmentStatus ?? order.shipmentStatus;
      if (
        mapped.orderStatus &&
        order.orderStatus !== "delivered" &&
        order.orderStatus !== "cancelled"
      ) {
        order.orderStatus = mapped.orderStatus;
      }
      await order.save();
    }

    return NextResponse.json({
      entries,
      latest,
      shipmentStatus: order.shipmentStatus,
      orderStatus: order.orderStatus,
    });
  } catch (error) {
    console.error("GET /api/admin/orders/[id]/track error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking" },
      { status: 500 }
    );
  }
}