export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const matchFilter: Record<string, unknown> = { paymentStatus: "paid" };

    if (search) {
      matchFilter.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const aggregation: mongoose.PipelineStage[] = [
      { $match: matchFilter },
      {
        $group: {
          _id: "$email",
          name: { $first: "$customerName" },
          email: { $first: "$email" },
          phone: { $first: "$phone" },
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$total" },
          lastOrderDate: { $max: "$createdAt" },
        },
      },
      { $sort: { lastOrderDate: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ];

    const result = await Order.aggregate(aggregation);
    const customers = result[0].data;
    const total = result[0].metadata[0]?.total || 0;

    return NextResponse.json({
      customers,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/admin/customers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
