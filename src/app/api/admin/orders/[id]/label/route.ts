export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { getShippingLabelUrl } from "@/lib/delhivery";

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

    const labelUrl = await getShippingLabelUrl(order.waybill);
    if (!labelUrl) {
      return NextResponse.json(
        { error: "Delhivery did not return a label for this waybill" },
        { status: 422 }
      );
    }

    order.labelUrl = labelUrl;
    await order.save();
    return NextResponse.json({ labelUrl, waybill: order.waybill });
  } catch (error) {
    console.error("GET /api/admin/orders/[id]/label error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipping label" },
      { status: 500 }
    );
  }
}