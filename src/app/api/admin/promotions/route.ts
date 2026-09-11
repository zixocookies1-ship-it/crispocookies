export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Promotion from "@/models/Promotion";
import { promotionStatus } from "@/lib/pricing";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const promotions = await Promotion.find()
      .sort({ createdAt: -1 })
      .lean();

    const withStatus = promotions.map((p) => ({
      ...p,
      status: promotionStatus({
        isActive: p.isActive,
        startDate: p.startDate,
        endDate: p.endDate,
      }),
    }));

    return NextResponse.json(withStatus);
  } catch (error) {
    console.error("GET /api/admin/promotions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch promotions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const discountValue = Number(body.discountValue);
    const isActive = body.isActive !== false;
    const startDate = body.startDate ? new Date(body.startDate) : null;
    const endDate = body.endDate ? new Date(body.endDate) : null;

    if (!name) {
      return NextResponse.json(
        { error: "Promotion name is required" },
        { status: 400 }
      );
    }
    if (
      !Number.isFinite(discountValue) ||
      discountValue < 1 ||
      discountValue > 100
    ) {
      return NextResponse.json(
        { error: "Discount must be between 1 and 100 percent" },
        { status: 400 }
      );
    }
    if (!startDate || isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: "Start date is required" },
        { status: 400 }
      );
    }
    if (!endDate || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "End date is required" },
        { status: 400 }
      );
    }
    if (endDate.getTime() <= startDate.getTime()) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    await connectDB();

    const promotion = await Promotion.create({
      name,
      discountType: "percentage",
      discountValue,
      startDate,
      endDate,
      isActive,
    });

    return NextResponse.json(
      {
        ...promotion.toObject(),
        status: promotionStatus(promotion),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/promotions error:", error);
    return NextResponse.json(
      { error: "Failed to create promotion" },
      { status: 500 }
    );
  }
}