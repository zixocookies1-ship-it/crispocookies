export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Coupon from "@/models/Coupon";
import CouponUsage from "@/models/CouponUsage";
import Order from "@/models/Order";
import { couponStatus } from "@/lib/coupons";

/** GET /api/admin/coupons/stats — analytics cards for the coupons admin page. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    const [coupons, totalUses, discountAgg, mostUsedAgg, maxDiscountAgg] =
      await Promise.all([
        Coupon.find().select(
          "code active startDate expiryDate maxTotalUses totalUsed discountType discountValue createdAt"
        ).lean(),
        CouponUsage.countDocuments(),
        Order.aggregate([
          {
            $match: { paymentStatus: "paid", couponDiscount: { $gt: 0 } },
          },
          { $group: { _id: null, totalDiscount: { $sum: "$couponDiscount" } } },
        ]),
        CouponUsage.aggregate([
          { $group: { _id: "$couponCode", uses: { $sum: 1 } } },
          { $sort: { uses: -1 } },
          { $limit: 1 },
        ]),
        Order.aggregate([
          { $match: { paymentStatus: "paid", couponDiscount: { $gt: 0 } } },
          { $sort: { couponDiscount: -1 } },
          { $limit: 1 },
          { $project: { couponCode: "$coupon.code", couponDiscount: 1, _id: 0 } },
        ]),
      ]);

    let activeCount = 0;
    const expiringSoon: Array<{ code: string; expiryDate: Date }> = [];
    for (const c of coupons) {
      const status = couponStatus(c);
      if (status === "active") {
        activeCount++;
        const exp = new Date(c.expiryDate).getTime();
        if (exp - now <= sevenDays && exp > now) {
          expiringSoon.push({ code: c.code, expiryDate: new Date(c.expiryDate) });
        }
      }
    }
    expiringSoon.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());

    return NextResponse.json({
      activeCoupons: activeCount,
      totalCoupons: coupons.length,
      totalUses,
      totalDiscountGiven: discountAgg[0]?.totalDiscount ?? 0,
      mostUsedCoupon: mostUsedAgg[0]
        ? { code: mostUsedAgg[0]._id, uses: mostUsedAgg[0].uses }
        : null,
      highestDiscountCoupon: maxDiscountAgg[0] ?? null,
      expiringSoon,
    });
  } catch (error) {
    console.error("GET /api/admin/coupons/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch coupon stats" },
      { status: 500 }
    );
  }
}