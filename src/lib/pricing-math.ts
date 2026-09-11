/**
 * Pure promotion/pricing mathematics.
 * Safe to import from BOTH client and server bundles (no DB, no env access).
 */

export const FREE_DELIVERY_THRESHOLD = 499;
export const DELIVERY_CHARGE = 49;

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

export interface OrderTotals {
  /** Sum of original (pre-discount) line totals the customer sees. */
  originalSubtotal: number;
  /** Total launch-offer discount applied. */
  discount: number;
  /** Final payable product total after discount. */
  finalSubtotal: number;
  deliveryCharge: number;
  /** finalSubtotal + deliveryCharge === the amount charged. */
  total: number;
  freeDelivery: boolean;
}

export function computeOrderTotals(
  lines: PricedLine[],
  overrides?: { threshold?: number; charge?: number }
): OrderTotals {
  const threshold = overrides?.threshold ?? FREE_DELIVERY_THRESHOLD;
  const charge = overrides?.charge ?? DELIVERY_CHARGE;
  const originalSubtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const discount = lines.reduce((s, l) => s + l.lineDiscount, 0);
  const finalSubtotal = Math.max(0, originalSubtotal - discount);
  // Free-delivery threshold is evaluated on the ORIGINAL cart value so the
  // existing "free above ₹499" promise stays stable during the campaign.
  const deliveryCharge = originalSubtotal >= threshold ? 0 : charge;
  return {
    originalSubtotal,
    discount,
    finalSubtotal,
    deliveryCharge,
    total: finalSubtotal + deliveryCharge,
    freeDelivery: deliveryCharge === 0,
  };
}

/** Build PricedLine[] from raw unit-price/qty pairs. */
export function priceLines(
  lines: Array<{ unitPrice: number; qty: number }>,
  promo: ActivePromotion | null
): PricedLine[] {
  return lines.map((l) => priceLine(l.unitPrice, l.qty, promo));
}