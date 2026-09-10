export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Customer from "@/models/Customer";

interface FacetResult {
  revenue: { total: number }[];
  count: { n: number }[];
  last7: { _id: string; revenue: number }[];
  recent: {
    _id: { toString(): string };
    orderId?: string;
    customerName?: string;
    total?: number;
    orderStatus?: string;
    createdAt?: { toISOString(): string } | string;
    items?: { qty?: number }[];
  }[];
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [orderStats, totalCustomers, totalProducts, lowStockProducts] =
      await Promise.all([
        Order.aggregate([
          {
            $facet: {
              revenue: [
                { $match: { paymentStatus: "paid" } },
                { $group: { _id: null, total: { $sum: "$total" } } },
              ],
              count: [{ $count: "n" }],
              last7: [
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
              ],
              recent: [
                { $sort: { createdAt: -1 } },
                { $limit: 5 },
                {
                  $project: {
                    orderId: 1,
                    customerName: 1,
                    total: 1,
                    orderStatus: 1,
                    createdAt: 1,
                    items: 1,
                  },
                },
              ],
            },
          },
        ]),
        Customer.countDocuments(),
        Product.countDocuments(),
        Product.find({
          isActive: true,
          "variants.stock": { $lt: 10 },
        })
          .select("name variants")
          .lean(),
      ]);

    const facet = (orderStats[0] ?? {
      revenue: [],
      count: [],
      last7: [],
      recent: [],
    }) as FacetResult;

    const revenue = facet.revenue[0]?.total || 0;
    const totalOrders = facet.count[0]?.n || 0;

    const formattedLowStock = lowStockProducts.flatMap((p) =>
      (p.variants ?? [])
        .filter((v: { stock: number }) => v.stock < 10)
        .map((v: { stock: number }) => ({
          _id: p._id?.toString() ?? "",
          name: p.name,
          stock: v.stock,
        }))
    );

    const formattedRecentOrders = (facet.recent ?? []).map((o) => ({
      _id: o._id?.toString() ?? "",
      orderId: o.orderId ?? "",
      customerName: o.customerName ?? "",
      totalItems: Array.isArray(o.items)
        ? o.items.reduce(
            (sum: number, i: { qty?: number }) => sum + (i.qty ?? 0),
            0
          )
        : 0,
      total: o.total ?? 0,
      status: o.orderStatus ?? "Pending",
      createdAt:
        typeof o.createdAt === "string"
          ? o.createdAt
          : (o.createdAt?.toISOString?.() ?? ""),
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
      revenueChart: (facet.last7 ?? []).map((d) => ({
        day: d._id,
        revenue: d.revenue,
      })),
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