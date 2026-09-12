export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { attemptAutoShipment } from "@/lib/delhivery";

export async function POST(
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

    const result = await attemptAutoShipment(order);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error || "Shipment creation failed" },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      waybill: result.waybill,
      shipmentStatus: order.shipmentStatus,
      trackingUrl: order.trackingUrl,
      labelUrl: order.labelUrl,
    });
  } catch (error) {
    console.error("POST /api/admin/orders/[id]/shipment error:", error);
    return NextResponse.json(
      { error: "Failed to create shipment" },
      { status: 500 }
    );
  }
}