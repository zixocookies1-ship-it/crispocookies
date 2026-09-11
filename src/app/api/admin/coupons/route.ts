export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Coupon from "@/models/Coupon";
import {
  couponStatus,
  normalizeCouponCode,
  isValidCouponCodeFormat,
  CouponStatus,
} from "@/lib/coupons";

const VALID_STATUSES: CouponStatus[] = [
  "active",
  "scheduled",
  "expired",
  "exhausted",
  "inactive",
];

function isObjectIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v)
  );
}

function serializeCoupon(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any
) {
  const status = couponStatus(raw);
  const maxTotal = raw.maxTotalUses || 0;
  return {
    ...raw,
    _id: String(raw._id),
    code: raw.code,
    status,
    remainingUses: maxTotal > 0 ? Math.max(0, maxTotal - (raw.totalUsed || 0)) : null,
    discountLabel:
      raw.discountType === "percentage"
        ? `${raw.discountValue}%`
        : `₹${raw.discountValue}`,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const statusFilter = searchParams.get("status") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { code: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const coupons = await Coupon.find(query).sort({ createdAt: -1 }).lean();

    let mapped = coupons.map(serializeCoupon);
    if (VALID_STATUSES.includes(statusFilter as CouponStatus)) {
      mapped = mapped.filter((c) => c.status === statusFilter);
    }

    const total = mapped.length;
    const pages = Math.ceil(total / limit) || 1;
    const slice = mapped.slice((page - 1) * limit, page * limit);

    return NextResponse.json({ coupons: slice, total, page, pages });
  } catch (error) {
    console.error("GET /api/admin/coupons error:", error);
    return NextResponse.json(
      { error: "Failed to fetch coupons" },
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

    const code = normalizeCouponCode(
      typeof body.code === "string" ? body.code : ""
    );
    if (!code || !isValidCouponCodeFormat(code)) {
      return NextResponse.json(
        { error: "Coupon code is required (2–32 letters, numbers, - or _)" },
        { status: 400 }
      );
    }

    const discountType =
      body.discountType === "fixed" ? "fixed" : "percentage";
    const discountValue = Number(body.discountValue);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return NextResponse.json(
        { error: "Discount must be greater than 0" },
        { status: 400 }
      );
    }
    if (discountType === "percentage" && discountValue > 100) {
      return NextResponse.json(
        { error: "Percentage discount must be 100 or less" },
        { status: 400 }
      );
    }

    const minimumOrderValue = Math.max(0, Number(body.minimumOrderValue) || 0);
    const maximumDiscount = Math.max(0, Number(body.maximumDiscount) || 0);

    const startDate = body.startDate ? new Date(body.startDate) : null;
    const expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    if (!startDate || isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: "Start date is required" },
        { status: 400 }
      );
    }
    if (!expiryDate || isNaN(expiryDate.getTime())) {
      return NextResponse.json(
        { error: "Expiry date is required" },
        { status: 400 }
      );
    }
    if (expiryDate.getTime() <= startDate.getTime()) {
      return NextResponse.json(
        { error: "Expiry must be after the start date" },
        { status: 400 }
      );
    }

    const maxTotalUses =
      body.maxTotalUses === undefined || body.maxTotalUses === null
        ? 0
        : Math.round(Number(body.maxTotalUses));
    if (
      !Number.isFinite(maxTotalUses) ||
      maxTotalUses < 0 ||
      !Number.isInteger(maxTotalUses)
    ) {
      return NextResponse.json(
        { error: "Maximum total uses must be a whole number (0 = unlimited)" },
        { status: 400 }
      );
    }

    const maxUsesPerCustomer =
      body.maxUsesPerCustomer === undefined || body.maxUsesPerCustomer === null
        ? 0
        : Math.round(Number(body.maxUsesPerCustomer));
    if (
      !Number.isFinite(maxUsesPerCustomer) ||
      maxUsesPerCustomer < 0 ||
      !Number.isInteger(maxUsesPerCustomer)
    ) {
      return NextResponse.json(
        { error: "Per-customer limit must be a whole number (0 = unlimited)" },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await Coupon.findOne({ code });
    if (existing) {
      return NextResponse.json(
        { error: "A coupon with this code already exists" },
        { status: 409 }
      );
    }

    const coupon = await Coupon.create({
      code,
      description:
        typeof body.description === "string" ? body.description.trim() : "",
      discountType,
      discountValue,
      minimumOrderValue,
      maximumDiscount,
      startDate,
      expiryDate,
      maxTotalUses,
      maxUsesPerCustomer,
      totalUsed: 0,
      active: body.active !== false,
      firstOrderOnly: body.firstOrderOnly === true,
      applicableProducts: isObjectIdArray(body.applicableProducts),
      excludedProducts: isObjectIdArray(body.excludedProducts),
      applicableCategories: isObjectIdArray(body.applicableCategories),
      excludedCategories: isObjectIdArray(body.excludedCategories),
      createdBy: session.user?.email || "",
    });

    return NextResponse.json(serializeCoupon(coupon.toObject()), {
      status: 201,
    });
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
    console.error("POST /api/admin/coupons error:", error);
    return NextResponse.json(
      { error: "Failed to create coupon" },
      { status: 500 }
    );
  }
}