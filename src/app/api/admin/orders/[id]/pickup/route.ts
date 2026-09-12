export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { requestPickup } from "@/lib/delhivery";

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
    if (!order.waybill) {
      return NextResponse.json(
        { error: "No shipment exists for this order yet" },
        { status: 400 }
      );
    }

    const packageCount = (order.items || []).reduce(
      (sum: number, item: { qty?: number }) => sum + (Number(item.qty) || 0),
      0
    );

    const result = await requestPickup({ packageCount: Math.max(1, packageCount) });

    order.pickedUp = true;
    order.pickedUpAt = new Date();
    await order.save();

    return NextResponse.json({ success: true, pickupId: result.pickupId });
  } catch (error) {
    console.error("POST /api/admin/orders/[id]/pickup error:", error);
    return NextResponse.json(
      { error: "Failed to request pickup" },
      { status: 500 }
    );
  }
}