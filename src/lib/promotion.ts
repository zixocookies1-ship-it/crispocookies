import { ActivePromotion, applyDiscount } from "./pricing-math";

/**
 * Client-side promotion accessor used by announcement bar, hero badge,
 * product cards, cart and checkout. Fetches once per short window and
 * de-duplicates concurrent callers (same pattern as fetchProducts).
 *
 * The server remains the source of truth for the actual charge — this module
 * only informs the UI. If the network fails we optimistically show no
 * discount rather than block the storefront.
 */
const PROMO_CACHE_TTL_MS = 45_000;
let promoCache: { at: number; data: ActivePromotion | null } | null = null;
let inflight: Promise<ActivePromotion | null> | null = null;

export function invalidatePromotionCache() {
  promoCache = null;
}

async function fetchActivePromotionFromApi(): Promise<ActivePromotion | null> {
  try {
    const res = await fetch("/api/promotions/active", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      promotion: ActivePromotion | null;
    };
    return data.promotion ?? null;
  } catch (error) {
    console.error("Failed to fetch active promotion:", error);
    return null;
  }
}

export async function getActivePromotion(): Promise<ActivePromotion | null> {
  if (promoCache && Date.now() - promoCache.at < PROMO_CACHE_TTL_MS) {
    return promoCache.data;
  }
  if (inflight) return inflight;

  inflight = fetchActivePromotionFromApi().then((promotion) => {
    promoCache = { at: Date.now(), data: promotion };
    return promotion;
  });

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Convenience for components: discounted price pair for a unit price. */
export function unitPriceWithDiscount(
  unitPrice: number,
  promotion: ActivePromotion | null
): { original: number; discount: number; final: number } {
  const { discount, final } = promotion
    ? applyDiscount(unitPrice, promotion.discountValue)
    : { discount: 0, final: unitPrice };
  return { original: unitPrice, discount, final };
}