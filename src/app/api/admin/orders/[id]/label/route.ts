export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { fetchShippingLabelPdf } from "@/lib/delhivery";

/**
 * Streams the A4 shipping-label PDF straight from Delhivery (the
 * /api/p/packing_slip endpoint returns a raw PDF, not JSON) so the browser
 * can open/print it. Requires an existing waybill.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      // Keep the cleanup contract of the route: a 401 must not leak PDF bytes.
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    await connectDB();

    const order = await Order.findById(params.id);
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!order.waybill) {
      return new Response(
        JSON.stringify({ error: "No shipment exists for this order yet" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const pdf = await fetchShippingLabelPdf(order.waybill);

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="crispo-awb-${order.waybill}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/admin/orders/[id]/label error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch shipping label";
    return new Response(JSON.stringify({ error: message.slice(0, 500) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}