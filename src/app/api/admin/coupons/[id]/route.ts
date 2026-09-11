export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Coupon, { ICoupon } from "@/models/Coupon";
import CouponUsage from "@/models/CouponUsage";
import { couponStatus, normalizeCouponCode, isValidCouponCodeFormat } from "@/lib/coupons";

function isObjectIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v)
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeCoupon(raw: any) {
  const status = couponStatus(raw);
  const maxTotal = raw.maxTotalUses || 0;
  return {
    ...raw,
    _id: String(raw._id),
    status,
    remainingUses: maxTotal > 0 ? Math.max(0, maxTotal - (raw.totalUsed || 0)) : null,
    discountLabel:
      raw.discountType === "percentage"
        ? `${raw.discountValue}%`
        : `₹${raw.discountValue}`,
  };
}

export async function GET(
  _request: NextRequest,
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

    const distinctCustomers = await CouponUsage.distinct("customerKey", {
      couponId: coupon._id,
    });

    return NextResponse.json({
      ...serializeCoupon(coupon),
      distinctCustomers: distinctCustomers.length,
    });
  } catch (error) {
    console.error("GET /api/admin/coupons/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch coupon" },
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

    const body = await request.json();
    const update: Record<string, unknown> = {};
    const errors: string[] = [];

    await connectDB();

    const existing = (await Coupon.findById(params.id)) as ICoupon | null;
    if (!existing) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    const hasUsage =
      typeof existing.totalUsed === "number" && existing.totalUsed > 0;

    // Historical-data protection: once a coupon has been used, core rules that
    // would rewrite what previous orders mean are immutable. Orders already
    // store their own snapshots so nothing is recalculated retroactively.
    if (hasUsage) {
      const protectedFields = [
        "code",
        "discountType",
        "discountValue",
        "firstOrderOnly",
        "maxUsesPerCustomer",
      ];
      const touched = Object.keys(body).filter((k) => body[k] !== undefined);
      const violated = touched.filter((k) => protectedFields.includes(k));
      if (violated.length > 0) {
        return NextResponse.json(
          {
            error: `This coupon has already been used (${existing.totalUsed}×). To preserve historical orders, code, discount type, discount value, first-order-only and per-customer limit cannot be changed.`,
          },
          { status: 400 }
        );
      }
    }

    if (body.code !== undefined) {
      const code = normalizeCouponCode(String(body.code));
      if (!code || !isValidCouponCodeFormat(code))
        errors.push("Coupon code must be 2–32 letters, numbers, - or _");
      else {
        const dup = await Coupon.findOne({
          code,
          _id: { $ne: existing._id },
        });
        if (dup) errors.push("A coupon with this code already exists");
        else update.code = code;
      }
    }

    if (body.description !== undefined)
      update.description = String(body.description).trim();

    if (body.discountType !== undefined) {
      update.discountType = body.discountType === "fixed" ? "fixed" : "percentage";
    }
    if (body.discountValue !== undefined) {
      const v = Number(body.discountValue);
      const maxPctCheck =
        update.discountType === "percentage" || existing.discountType === "percentage" ? 100 : Infinity;
      if (!Number.isFinite(v) || v <= 0)
        errors.push("Discount must be greater than 0");
      else if (v > maxPctCheck) errors.push("Percentage discount must be 100 or less");
      else update.discountValue = v;
    }

    if (body.minimumOrderValue !== undefined) {
      const v = Number(body.minimumOrderValue);
      if (!Number.isFinite(v) || v < 0) errors.push("Minimum order cannot be negative");
      else update.minimumOrderValue = v;
    }

    if (body.maximumDiscount !== undefined) {
      const v = Number(body.maximumDiscount);
      if (!Number.isFinite(v) || v < 0) errors.push("Maximum discount cannot be negative");
      else update.maximumDiscount = v;
    }

    if (body.startDate !== undefined) {
      const d = new Date(body.startDate);
      if (isNaN(d.getTime())) errors.push("Invalid start date");
      else update.startDate = d;
    }
    if (body.expiryDate !== undefined) {
      const d = new Date(body.expiryDate);
      if (isNaN(d.getTime())) errors.push("Invalid expiry date");
      else update.expiryDate = d;
    }

    if (body.maxTotalUses !== undefined) {
      const v = body.maxTotalUses === "" ? 0 : Math.round(Number(body.maxTotalUses));
      if (!Number.isFinite(v) || v < 0)
        errors.push("Maximum total uses must be 0 or a positive whole number");
      else if (v < (existing.totalUsed || 0))
        errors.push(
          `Maximum total uses cannot be lower than the ${existing.totalUsed} already used`
        );
      else update.maxTotalUses = v;
    }

    if (body.maxUsesPerCustomer !== undefined) {
      const v = body.maxUsesPerCustomer === "" ? 0 : Math.round(Number(body.maxUsesPerCustomer));
      if (!Number.isFinite(v) || v < 0)
        errors.push("Per-customer limit must be 0 or a positive whole number");
      else update.maxUsesPerCustomer = v;
    }

    if (body.firstOrderOnly !== undefined)
      update.firstOrderOnly = body.firstOrderOnly === true;
    if (body.active !== undefined) update.active = body.active === true;

    for (const key of [
      "applicableProducts",
      "excludedProducts",
      "applicableCategories",
      "excludedCategories",
    ] as const) {
      if (body[key] !== undefined) update[key] = isObjectIdArray(body[key]);
    }

    const nextStart = (update.startDate as Date | undefined) ?? existing.startDate;
    const nextExpiry = (update.expiryDate as Date | undefined) ?? existing.expiryDate;
    if (new Date(nextExpiry).getTime() <= new Date(nextStart).getTime()) {
      errors.push("Expiry must be after the start date");
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(". ") }, { status: 400 });
    }

    const coupon = await Coupon.findByIdAndUpdate(params.id, update, {
      new: true,
    }).lean();

    return NextResponse.json(serializeCoupon(coupon));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        { error: "A coupon with this code already exists" },
        { status: 409 }
      );
    }
    console.error("PATCH /api/admin/coupons/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update coupon" },
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

    const coupon = await Coupon.findById(params.id);
    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    if ((coupon.totalUsed || 0) > 0) {
      // Never destroy history — deactivate instead of deleting.
      await Coupon.findByIdAndUpdate(params.id, { active: false });
      return NextResponse.json({
        error: `This coupon has been used ${coupon.totalUsed}× and was deactivated instead of deleted to preserve its order history.`,
        archived: true,
      });
    }

    await Coupon.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/coupons/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete coupon" },
      { status: 500 }
    );
  }
}