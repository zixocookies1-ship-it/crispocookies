"use client";

import { useEffect, useState } from "react";
import { getActivePromotion, invalidatePromotionCache } from "@/lib/promotion";
import { ActivePromotion } from "@/lib/pricing-math";

interface Remaining {
  days: number;
  hours: string;
  minutes: string;
  seconds: string;
}

function remainingParts(promotion: ActivePromotion, now: number): Remaining | null {
  const ms = new Date(promotion.endDate).getTime() - now;
  if (ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { days, hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) };
}

export default function AnnouncementBar() {
  const [promotion, setPromotion] = useState<ActivePromotion | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [promoKnown, setPromoKnown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const load = async () => {
      const promo = await getActivePromotion();
      if (cancelled) return;
      setPromotion(promo);
      setPromoKnown(true);
      if (promo) {
        const ms = new Date(promo.endDate).getTime() - Date.now();
        if (ms > 0) {
          // Re-check shortly after the offer expires so a stale browser tab
          // stops showing the discount when the backend has already stopped.
          timer = window.setTimeout(() => {
            invalidatePromotionCache();
            load();
          }, Math.max(15000, ms + 500));
        }
      }
    };

    load();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!promotion) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [promotion]);

  const items = [
    "Welcome to Crispo Cookies",
    "100% ZERO MAIDHA",
    "Made With Pure Oats",
    "Baked to Impress. Baked With Purpose.",
    "Handcrafted in Nellore",
  ];

  const promoNow = promotion && promoKnown ? promotion : null;
  const countdown = promoNow ? remainingParts(promoNow, now) : null;

  return (
    <div
      className="bg-royal text-gold-soft overflow-hidden py-2.5 relative border-b border-gold/20"
      role="banner"
      aria-label="Announcements"
    >
      <div className="flex animate-marquee whitespace-nowrap">
        {promoNow && (
          <span
            className="mx-8 text-xs font-bold tracking-widest uppercase flex items-center gap-3 text-gold-soft"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" aria-hidden="true" />
            {countdown
              ? `Launch Offer — ${promoNow.discountValue}% OFF · Ends in ${countdown.days}d ${countdown.hours}:${countdown.minutes}:${countdown.seconds}`
              : `Launch Offer — ${promoNow.discountValue}% OFF`}
          </span>
        )}
        {[...items, ...items, ...items, ...items].map((item, i) => (
          <span
            key={i}
            className="mx-8 text-xs font-semibold tracking-widest uppercase flex items-center gap-3"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold/60" aria-hidden="true" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}