"use client";

import { AppliedCoupon } from "@/store/useCartStore";

export interface CouponValidateItem {
  productId: string;
  variant: string;
  qty: number;
}

export interface CouponValidateResponse {
  valid: boolean;
  couponCode?: string;
  couponId?: string;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  discountAmount?: number;
  eligibleSubtotal?: number;
  description?: string;
  message?: string;
  error?: string;
}

/**
 * Client helper — asks the SERVER whether a coupon is valid for the current
 * cart. The server is the authority; this never computes discounts itself.
 */
export async function validateCouponOnServer(opts: {
  code: string;
  items: CouponValidateItem[];
  email?: string;
  phone?: string;
}): Promise<CouponValidateResponse> {
  try {
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: opts.code,
        items: opts.items,
        email: opts.email || undefined,
        phone: opts.phone || undefined,
      }),
    });
    return (await res.json()) as CouponValidateResponse;
  } catch {
    return {
      valid: false,
      error: "Could not reach the coupon service. Please try again.",
    };
  }
}

export function toAppliedCoupon(
  data: CouponValidateResponse
): AppliedCoupon | null {
  if (
    !data.valid ||
    !data.couponCode ||
    !data.couponId ||
    typeof data.discountAmount !== "number"
  )
    return null;
  return {
    id: data.couponId,
    code: data.couponCode,
    discountType: data.discountType === "fixed" ? "fixed" : "percentage",
    discountValue: data.discountValue ?? 0,
    discountAmount: data.discountAmount,
    eligibleSubtotal: data.eligibleSubtotal ?? 0,
    description: data.description ?? "",
  };
}

export function cartItemsForValidation(
  items: Array<{ productId: string; variant: { weight: string }; qty: number }>
): CouponValidateItem[] {
  return items.map((i) => ({
    productId: i.productId,
    variant: i.variant.weight,
    qty: i.qty,
  }));
}