export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { calculateOrderTotals } from "@/lib/order-totals";
import { CouponError } from "@/lib/coupons";

/**
 * POST /api/coupons/validate
 * Server-side coupon preview. The response is informative — create-order and
 * verify-payment recompute the authoritative amount before any money moves.
 */
export async function POST(request: NextRequest) {
  let payload: {
    code?: string;
    items?: Array<{ productId: string; variant: string; qty: number }>;
    email?: string;
    phone?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { valid: false, error: "Invalid coupon code." },
      { status: 400 }
    );
  }

  const code = typeof payload?.code === "string" ? payload.code.trim() : "";
  if (!code)
    return NextResponse.json(
      { valid: false, error: "Invalid coupon code." },
      { status: 400 }
    );

  const items = payload?.items;
  if (!Array.isArray(items) || items.length === 0)
    return NextResponse.json(
      { valid: false, error: "Your cart is empty." },
      { status: 400 }
    );

  try {
    await connectDB();

    // Resolve catalog subtotal server-side so min-order checks never trust
    // a frontend subtotal. calculateOrderTotals revalidates the coupon fully.
    const resolved = await calculateOrderTotals({
      rawItems: items.map((i) => ({
        productId: String(i.productId || ""),
        variant: String(i.variant || ""),
        qty: Number(i.qty),
      })),
      couponCode: code,
      customerEmail: typeof payload?.email === "string" ? payload.email : null,
      customerPhone: typeof payload?.phone === "string" ? payload.phone : null,
    });

    return NextResponse.json({
      valid: true,
      couponCode: resolved.coupon?.code ?? code,
      couponId: resolved.coupon?.id ?? "",
      discountType: resolved.coupon?.discountType ?? "percentage",
      discountValue: resolved.coupon?.discountValue ?? 0,
      discountAmount: resolved.couponDiscount,
      eligibleSubtotal: resolved.eligibleSubtotal,
      description: resolved.coupon?.description ?? "",
      message: "Coupon applied successfully",
    });
  } catch (error) {
    if (error instanceof CouponError) {
      return NextResponse.json(
        { valid: false, error: error.message },
        { status: error.status }
      );
    }
    console.error("[coupons/validate] unexpected error:", error);
    return NextResponse.json(
      { valid: false, error: "Coupon could not be validated. Please try again." },
      { status: 500 }
    );
  }
}