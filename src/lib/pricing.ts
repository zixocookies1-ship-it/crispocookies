import { connectDB } from "./mongodb";
import Promotion from "@/models/Promotion";
import {
  ActivePromotion,
  FREE_DELIVERY_THRESHOLD,
  DELIVERY_CHARGE,
  priceLines,
  computeOrderTotals,
  PricedLine,
} from "./pricing-math";

/**
 * Server-side source of truth for which promotion is live and how prices are
 * derived. create-order / verify-payment / active-promotion-API use this.
 * Pure math lives in pricing-math (importable from the client bundle).
 */

export type PromotionStatus =
  | "scheduled"
  | "active"
  | "expired"
  | "disabled";

export { FREE_DELIVERY_THRESHOLD, DELIVERY_CHARGE, priceLines, computeOrderTotals };
export type { PricedLine };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializePromotion(raw: any): ActivePromotion | null {
  if (!raw) return null;
  return {
    id: String(raw._id),
    name: raw.name,
    discountType: "percentage",
    discountValue: Number(raw.discountValue),
    startDate: new Date(raw.startDate).toISOString(),
    endDate: new Date(raw.endDate).toISOString(),
  };
}

/** Current live promotion (started, not yet ended, admin-enabled). Server-only. */
export async function getActivePromotion(): Promise<ActivePromotion | null> {
  await connectDB();
  const now = new Date();
  const promo = await Promotion.findOne({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .sort({ createdAt: -1 })
    .lean();
  return serializePromotion(promo);
}

/** Status of a promotion record for admin display. */
export function promotionStatus(promo: {
  isActive: boolean;
  startDate: string | Date;
  endDate: string | Date;
}): PromotionStatus {
  if (!promo.isActive) return "disabled";
  const now = Date.now();
  const start = new Date(promo.startDate).getTime();
  const end = new Date(promo.endDate).getTime();
  if (now < start) return "scheduled";
  if (now > end) return "expired";
  return "active";
}