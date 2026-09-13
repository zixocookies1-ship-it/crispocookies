export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { attemptAutoShipment, DelhiveryError } from "@/lib/delhivery";

const STATUS_BY_CODE: Record<string, number> = {
  DELHIVERY_NOT_CONFIGURED: 503,
  PICKUP_LOCATION_NOT_CONFIGURED: 503,
  ORDER_NOT_PAID: 422,
  INVALID_CUSTOMER_ADDRESS: 422,
  INVALID_PINCODE: 422,
  MISSING_WEIGHT: 422,
  MISSING_ORDER_DATA: 422,
  DELHIVERY_AUTH_FAILED: 502,
  DELHIVERY_RATE_LIMITED: 429,
  DELHIVERY_TIMEOUT: 504,
  DELHIVERY_UNREACHABLE: 502,
  DELHIVERY_API_ERROR: 502,
  SHIPMENT_CREATION_FAILED: 502,
};

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
      const status = STATUS_BY_CODE[result.code || ""] ?? 422;
      return NextResponse.json(
        {
          success: false,
          code: result.code || "SHIPMENT_CREATION_FAILED",
          error: result.error || "Shipment creation failed",
        },
        { status }
      );
    }

    const alreadyCreated = result.code === "SHIPMENT_ALREADY_EXISTS";
    return NextResponse.json({
      success: true,
      code: result.code || "SHIPMENT_CREATED",
      alreadyCreated,
      waybill: result.waybill,
      shipmentStatus: order.shipmentStatus,
      trackingUrl: order.trackingUrl,
      labelUrl: order.labelUrl,
      syncState: order.syncState,
    });
  } catch (error) {
    console.error("POST /api/admin/orders/[id]/shipment error:", error);
    if (error instanceof DelhiveryError) {
      const status = STATUS_BY_CODE[error.code || ""] ?? 502;
      return NextResponse.json(
        {
          success: false,
          code: error.code || "DELHIVERY_API_ERROR",
          error: error.message,
        },
        { status }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create shipment" },
      { status: 500 }
    );
  }
}