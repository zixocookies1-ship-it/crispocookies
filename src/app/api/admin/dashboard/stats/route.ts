export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Customer from "@/models/Customer";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const [
      totalRevenue,
      totalOrders,
      totalCustomers,
      totalProducts,
      lowStockProducts,
      recentOrders,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Order.countDocuments(),
      Customer.countDocuments(),
      Product.countDocuments(),
      Product.find({
        isActive: true,
        "variants.stock": { $lt: 10 },
      })
        .select("name variants weight")
        .lean(),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("orderId customerName total status createdAt items")
        .lean(),
    ]);

    const revenue = totalRevenue[0]?.total || 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const revenueLast7Days = await Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          revenue: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          revenue: 1,
        },
      },
    ]);

    const formattedLowStock = lowStockProducts.flatMap((p) =>
      p.variants
        .filter((v: { stock: number }) => v.stock < 10)
        .map((v: { stock: number; _id?: { toString(): string } }) => ({
          _id: p._id?.toString() ?? "",
          name: p.name,
          stock: v.stock,
        }))
    );

    const formattedRecentOrders = recentOrders.map((o) => ({
      _id: o._id?.toString() ?? "",
      orderId: o.orderId ?? "",
      customerName: o.customerName ?? "",
      totalItems: Array.isArray(o.items) ? o.items.reduce((sum: number, i: { quantity?: number }) => sum + (i.quantity ?? 0), 0) : 0,
      total: o.total ?? 0,
      status: o.status ?? "Pending",
      createdAt: o.createdAt?.toISOString?.() ?? String(o.createdAt ?? ""),
    }));

    return NextResponse.json({
      totalRevenue: revenue,
      totalOrders,
      totalCustomers,
      totalProducts,
      lowStockCount: formattedLowStock.length,
      revenueGrowth: 0,
      ordersGrowth: 0,
      customersGrowth: 0,
      productsGrowth: 0,
      revenueChart: revenueLast7Days.map((d) => ({ day: d.date, revenue: d.revenue })),
      recentOrders: formattedRecentOrders,
      categoryBreakdown: [],
      lowStockProducts: formattedLowStock,
    });
  } catch (error) {
    console.error("GET /api/admin/dashboard/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
