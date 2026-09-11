export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Promotion from "@/models/Promotion";
import { promotionStatus } from "@/lib/pricing";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const update: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json(
          { error: "Promotion name is required" },
          { status: 400 }
        );
      }
      update.name = name;
    }
    if (body.discountValue !== undefined) {
      const discountValue = Number(body.discountValue);
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
      update.discountValue = discountValue;
    }
    if (body.isActive !== undefined) {
      update.isActive = body.isActive === true;
    }
    if (body.startDate !== undefined) {
      const startDate = new Date(body.startDate);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid start date" },
          { status: 400 }
        );
      }
      update.startDate = startDate;
    }
    if (body.endDate !== undefined) {
      const endDate = new Date(body.endDate);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid end date" },
          { status: 400 }
        );
      }
      update.endDate = endDate;
    }

    await connectDB();

    const existing = await Promotion.findById(params.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 }
      );
    }

    const nextStart = (update.startDate as Date | undefined) ?? existing.startDate;
    const nextEnd = (update.endDate as Date | undefined) ?? existing.endDate;
    if (new Date(nextEnd).getTime() <= new Date(nextStart).getTime()) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    const promotion = await Promotion.findByIdAndUpdate(params.id, update, {
      new: true,
    }).lean();

    return NextResponse.json({
      ...promotion,
      status: promotionStatus({
        isActive: promotion.isActive,
        startDate: promotion.startDate,
        endDate: promotion.endDate,
      }),
    });
  } catch (error) {
    console.error("PATCH /api/admin/promotions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update promotion" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const deleted = await Promotion.findByIdAndDelete(params.id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/promotions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete promotion" },
      { status: 500 }
    );
  }
}