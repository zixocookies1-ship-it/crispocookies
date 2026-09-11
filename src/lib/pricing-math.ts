/**
 * Pure promotion/pricing mathematics.
 * Safe to import from BOTH client and server bundles (no DB, no env access).
 */

export const DELIVERY_CHARGE = 100;

export interface ActivePromotion {
  id: string;
  name: string;
  discountType: "percentage";
  discountValue: number; // e.g. 60 = 60%
  startDate: string; // ISO
  endDate: string; // ISO
}

/**
 * discount = round(unitPrice * percent / 100)
 * final    = unitPrice - discount
 */
export function applyDiscount(unitPrice: number, discountPercent: number) {
  const pct = Math.min(100, Math.max(0, discountPercent || 0));
  const discount = Math.round((unitPrice * pct) / 100);
  const final = Math.max(0, unitPrice - discount);
  return { discount, final };
}

export interface PricedLine {
  unitPrice: number;
  qty: number;
  unitDiscount: number;
  unitFinal: number;
  lineDiscount: number;
  lineTotal: number;
}

/** Price one cart line (unit price × qty) against the active promotion. */
export function priceLine(
  unitPrice: number,
  qty: number,
  promo: ActivePromotion | null
): PricedLine {
  const { discount, final } = promo
    ? applyDiscount(unitPrice, promo.discountValue)
    : { discount: 0, final: unitPrice };
  return {
    unitPrice,
    qty,
    unitDiscount: discount,
    unitFinal: final,
    lineDiscount: discount * qty,
    lineTotal: final * qty,
  };
}

export type CouponDiscountType = "percentage" | "fixed";

/**
 * Coupon discount math (pure).
 * - percentage: round(eligibleSubtotal * value / 100)
 * - fixed:      value
 * Capped by maximumDiscount (when > 0) and NEVER the eligible subtotal, so a
 * coupon can never make the payable amount negative on its own.
 */
export function computeCouponDiscount(opts: {
  discountType: CouponDiscountType;
  discountValue: number;
  eligibleSubtotal: number;
  maximumDiscount?: number | null;
}): number {
  const eligible = Math.max(0, Math.round(opts.eligibleSubtotal));
  if (eligible <= 0) return 0;
  const value = Math.max(0, opts.discountValue || 0);
  const discount =
    opts.discountType === "percentage"
      ? Math.round((eligible * Math.min(100, value)) / 100)
      : Math.round(value);
  const cap =
    opts.maximumDiscount && opts.maximumDiscount > 0
      ? Math.max(0, Math.round(opts.maximumDiscount))
      : null;
  return Math.min(discount, cap === null ? eligible : Math.min(cap, eligible));
}

export interface OrderTotals {
  /** Sum of original (pre-discount) line totals the customer sees. */
  originalSubtotal: number;
  /** Total launch-offer discount applied. */
  discount: number;
  /** Final product total after launch-offer discount (before coupon). */
  finalSubtotal: number;
  /** Coupon discount (0 when none). Never exceeds finalSubtotal. */
  couponDiscount: number;
  /** offer discount + coupon discount. */
  totalDiscount: number;
  deliveryCharge: number;
  /**
   * The amount actually charged:
   * finalSubtotal - couponDiscount + deliveryCharge (never negative).
   * With no coupon this is exactly finalSubtotal + deliveryCharge, preserving
   * every pre-coupon order's arithmetic.
   */
  total: number;
  freeDelivery: boolean;
}

export function computeOrderTotals(
  lines: PricedLine[],
  overrides?: { threshold?: number; charge?: number; couponDiscount?: number }
): OrderTotals {
  const charge = overrides?.charge ?? DELIVERY_CHARGE;
  const originalSubtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const discount = lines.reduce((s, l) => s + l.lineDiscount, 0);
  const finalSubtotal = Math.max(0, originalSubtotal - discount);
  const couponDiscount = Math.min(
    Math.max(0, Math.round(overrides?.couponDiscount ?? 0)),
    finalSubtotal
  );
  // Flat ₹100 delivery charge on every order (no free-delivery threshold).
  const deliveryCharge = charge;
  return {
    originalSubtotal,
    discount,
    finalSubtotal,
    couponDiscount,
    totalDiscount: discount + couponDiscount,
    deliveryCharge,
    total: Math.max(0, finalSubtotal - couponDiscount) + deliveryCharge,
    freeDelivery: false,
  };
}

/** Build PricedLine[] from raw unit-price/qty pairs. */
export function priceLines(
  lines: Array<{ unitPrice: number; qty: number }>,
  promo: ActivePromotion | null
): PricedLine[] {
  return lines.map((l) => priceLine(l.unitPrice, l.qty, promo));
}