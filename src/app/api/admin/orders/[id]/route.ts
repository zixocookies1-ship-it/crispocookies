export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

const order = await Order.findById(params.id).lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Map stored items (name/qty/price) to the shape the admin UI consumes.
    const items = (order.items || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: any) => ({
        productName: item.name || "Product",
        image: item.image || "",
        variant: item.variant || "",
        quantity: item.qty ?? 0,
        price: item.price ?? 0,
      })
    );

    return NextResponse.json({
      ...order,
      items,
      status:
        typeof order.orderStatus === "string"
          ? order.orderStatus.charAt(0).toUpperCase() +
            order.orderStatus.slice(1)
          : order.orderStatus,
    });
  } catch (error) {
    console.error("GET /api/admin/orders/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { status } = await request.json();
    const orderStatus = status;

    if (
      !orderStatus ||
      !["processing", "shipped", "delivered", "cancelled"].includes(
        orderStatus
      )
    ) {
      return NextResponse.json(
        { error: "Invalid order status" },
        { status: 400 }
      );
    }

    const order = await Order.findByIdAndUpdate(
      params.id,
      { orderStatus },
      { new: true }
    ).lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("PATCH /api/admin/orders/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
