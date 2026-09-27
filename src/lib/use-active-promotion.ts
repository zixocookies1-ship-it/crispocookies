"use client";

import { useEffect, useState } from "react";
import { getActivePromotion } from "@/lib/promotion";
import type { ActivePromotion } from "@/lib/pricing-math";

/**
 * Shared client hook for the active promotion.
 *
 * getActivePromotion() de-duplicates concurrent callers behind a single module
 * cache, so every component using this hook still results in exactly one
 * /api/promotions/active request per page instead of one per component.
 */
export function useActivePromotion(): ActivePromotion | null {
  const [promotion, setPromotion] = useState<ActivePromotion | null>(null);

  useEffect(() => {
    let cancelled = false;
    getActivePromotion()
      .then((promo) => {
        if (!cancelled) setPromotion(promo);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return promotion;
}
