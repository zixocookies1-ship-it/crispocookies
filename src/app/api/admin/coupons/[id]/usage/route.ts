export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Coupon from "@/models/Coupon";
import CouponUsage from "@/models/CouponUsage";
import Order from "@/models/Order";

/** GET /api/admin/coupons/[id]/usage — real usage history from CouponUsage. */
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

    const coupon = await Coupon.findById(params.id).lean();
    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const [usages, total] = await Promise.all([
      CouponUsage.find({ couponId: coupon._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CouponUsage.countDocuments({ couponId: coupon._id }),
    ]);

    const orderIds = usages
      .map((u) => u.orderObjectId)
      .filter((id): id is NonNullable<typeof id> => !!id);
    const orders = await Order.find({
      _id: { $in: orderIds },
    })
      .select("orderId paymentStatus orderStatus")
      .lean();

    const orderMap = new Map(
      orders.map((o) => [String(o._id), o])
    );

    const rows = usages.map((u) => {
      const order = orderMap.get(String(u.orderObjectId));
      return {
        couponCode: u.couponCode,
        orderId: u.orderId,
        orderObjectId: String(u.orderObjectId),
        customerName: u.customerName,
        email: u.email,
        phone: u.phone,
        discountAmount: u.discountAmount,
        orderSubtotal: u.orderSubtotal,
        orderTotal: u.orderTotal,
        usedAt: u.createdAt,
        orderStatus: order?.orderStatus ?? "unknown",
        paymentStatus: order?.paymentStatus ?? "unknown",
      };
    });

    return NextResponse.json({
      couponCode: coupon.code,
      usage: rows,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error("GET /api/admin/coupons/[id]/usage error:", error);
    return NextResponse.json(
      { error: "Failed to fetch coupon usage" },
      { status: 500 }
    );
  }
}