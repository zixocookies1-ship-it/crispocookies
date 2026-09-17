export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { fetchShippingLabelPdf, DelhiveryError } from "@/lib/delhivery";

function jsonError(
  error: string,
  status: number,
  details?: string
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error,
      status,
      ...(details ? { details } : {}),
    }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

/**
 * Streams the A4 shipping-label PDF from Delhivery (the /api/p/packing_slip
 * endpoint returns raw PDF bytes, not JSON) so the browser can open/print it.
 * Requires an existing waybill. The Delhivery token is only ever used
 * server-side here.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return jsonError("Unauthorized", 401);
    }
    await connectDB();

    const order = await Order.findById(params.id);
    if (!order) {
      return jsonError("Order not found", 404);
    }
    if (!order.waybill) {
      return jsonError("No shipment exists for this order yet", 400);
    }

    const pdf = await fetchShippingLabelPdf(order.waybill);

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="delhivery-label-${order.waybill}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof DelhiveryError) {
      // Preserve Delhivery's original HTTP status and return a safe, actionable
      // message. The raw detail is only logged / passed as `details`.
      console.error("GET /api/admin/orders/[id]/label Delhivery error:", {
        status: error.status,
        code: error.code,
        message: error.message,
      });
      const status = error.status >= 400 && error.status < 600 ? error.status : 502;
      return jsonError(error.safeMessage, status, error.message.slice(0, 500));
    }

    console.error("GET /api/admin/orders/[id]/label error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch shipping label";
    return jsonError(
      "Could not fetch the shipping label from Delhivery.",
      500,
      message.slice(0, 500)
    );
  }
}