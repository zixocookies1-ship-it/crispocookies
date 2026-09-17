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
    if (order.pickedUp) {
      return NextResponse.json(
        {
          error: `A pickup has already been requested for this shipment${
            order.pickedUpAt
              ? ` on ${new Date(order.pickedUpAt).toLocaleDateString("en-IN")}`
              : ""
          }.`,
          code: "PICKUP_ALREADY_REQUESTED",
        },
        { status: 409 }
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

    return NextResponse.json({
      success: true,
      pickupId: result.pickupId,
      pickupDate: result.pickupDate,
      pickupTime: result.pickupTime,
      pickupLocation: result.pickupLocation,
    });
  } catch (error) {
    console.error("POST /api/admin/orders/[id]/pickup error:", error);
    if (error instanceof Error && "safeMessage" in error) {
      const delhiveryError = error as unknown as {
        message?: string;
        safeMessage: string;
        code?: string;
        status?: number;
      };
      return NextResponse.json(
        {
          error:
            delhiveryError.message ||
            delhiveryError.safeMessage ||
            "Failed to request pickup",
          safeMessage: delhiveryError.safeMessage,
          code: delhiveryError.code,
        },
        { status: delhiveryError.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to request pickup" },
      { status: 500 }
    );
  }
}