"use client";

import { useState, useEffect } from "react";
import { formatPrice } from "@/lib/helpers";

interface CouponStats {
  activeCoupons: number;
  totalCoupons: number;
  totalUses: number;
  totalDiscountGiven: number;
  mostUsedCoupon: { code: string; uses: number } | null;
  highestDiscountCoupon: { couponCode?: string; couponDiscount?: number } | null;
}

export default function CouponAnalytics() {
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/coupons/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStats(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card rounded-2xl p-5">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) return null;

  const cards = [
    { title: "Active Coupons", value: String(stats.activeCoupons), icon: "✅" },
    { title: "Total Coupons", value: String(stats.totalCoupons), icon: "🏷️" },
    { title: "Total Coupon Uses", value: String(stats.totalUses), icon: "🎯" },
    {
      title: "Discount Given",
      value: formatPrice(stats.totalDiscountGiven),
      icon: "💰",
    },
  ];

  return (
    <div className="card rounded-2xl p-5 border-t-2 border-t-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-bold text-black text-lg">
          Coupon Analytics
        </h2>
        <a
          href="/admin/coupons"
          className="text-sm text-black hover:text-gray-800 font-medium"
        >
          Manage Coupons →
        </a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.title}
            className="bg-gray-50 rounded-xl p-4 flex flex-col gap-1"
          >
            <span className="text-xs text-[#666666] font-medium">
              {c.icon} {c.title}
            </span>
            <span className="font-heading font-bold text-black text-xl">
              {c.value}
            </span>
            {c.title === "Total Coupon Uses" && stats.mostUsedCoupon && (
              <span className="text-[10px] text-[#666666] truncate">
                Top: {stats.mostUsedCoupon.code}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}