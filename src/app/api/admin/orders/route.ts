export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const fromDate = searchParams.get("from") || searchParams.get("fromDate");
    const toDate = searchParams.get("to") || searchParams.get("toDate");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      filter.orderStatus = status;
    }

    // Payment status is filtered server-side against the authoritative
    // `paymentStatus` field, which is only set to "paid" after the server-side
    // Razorpay signature + amount verification in finalizeOrderPayment().
    if (paymentStatus) {
      const normalized = paymentStatus.toLowerCase();
      if (
        normalized === "paid" ||
        normalized === "pending" ||
        normalized === "failed"
      ) {
        filter.paymentStatus = normalized;
      } else if (normalized === "refunded") {
        // The Order schema only tracks pending/paid/failed. Refund state is
        // not represented anywhere in the existing payment data, so this
        // matches nothing rather than inventing an unsupported status.
        filter.paymentStatus = "refunded";
      }
    }

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate)
        (filter.createdAt as Record<string, unknown>).$gte = new Date(
          fromDate
        );
      if (toDate)
        (filter.createdAt as Record<string, unknown>).$lte = new Date(
          toDate + "T23:59:59.999Z"
        );
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    const mappedOrders = orders.map((o) => ({
      _id: o._id,
      orderId: o.orderId,
      customerName: o.customerName,
      phone: o.phone,
      totalItems: Array.isArray(o.items) ? o.items.reduce((sum: number, i: { qty?: number }) => sum + (i.qty ?? 0), 0) : 0,
      total: o.total,
      paymentStatus:
        typeof o.paymentStatus === "string"
          ? o.paymentStatus.charAt(0).toUpperCase() +
            o.paymentStatus.slice(1)
          : o.paymentStatus,
      status:
        typeof o.orderStatus === "string"
          ? o.orderStatus.charAt(0).toUpperCase() + o.orderStatus.slice(1)
          : o.orderStatus,
      waybill: o.waybill || null,
      shipmentStatus: o.shipmentStatus || null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt || o.createdAt,
    }));

    return NextResponse.json({
      orders: mappedOrders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/admin/orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
