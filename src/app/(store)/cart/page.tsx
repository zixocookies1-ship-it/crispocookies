"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, X, ShoppingBag, Ticket } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice } from "@/lib/helpers";
import { getActivePromotion, unitPriceWithDiscount } from "@/lib/promotion";
import { ActivePromotion } from "@/lib/pricing-math";
import {
  validateCouponOnServer,
  toAppliedCoupon,
  cartItemsForValidation,
} from "@/lib/coupon-client";

function CartImage({ src, name, emoji }: { src: string; name: string; emoji: string }) {
  const isUrl = src.startsWith("http");
  if (!isUrl) {
    return (
      <span className="text-2xl sm:text-3xl select-none" role="img" aria-label={name}>
        {emoji}
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt={name}
      fill
      sizes="80px"
      className="object-contain p-1.5"
    />
  );
}

export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((s) => s.items);
  const coupon = useCartStore((s) => s.coupon);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const [promotion, setPromotion] = useState<ActivePromotion | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [applying, setApplying] = useState(false);
  const [revalidating, setRevalidating] = useState(false);

  useEffect(() => setMounted(true), []);

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

  const linePricing = items.map((item) => {
    const pricing = unitPriceWithDiscount(item.variant.price, promotion);
    return {
      key: `${item.productId}-${item.variant.weight}`,
      item,
      ...pricing,
      lineTotal: pricing.final * item.qty,
      originalLineTotal: pricing.original * item.qty,
      lineDiscount: pricing.discount * item.qty,
    };
  });

  const subtotal = linePricing.reduce((s, l) => s + l.originalLineTotal, 0);
  const promoDiscount = linePricing.reduce((s, l) => s + l.lineDiscount, 0);
  const beforeCoupon = Math.max(0, subtotal - promoDiscount);
  const couponAmount = Math.min(coupon?.discountAmount ?? 0, beforeCoupon);
  const delivery = subtotal >= 499 ? 0 : 49;
  const total = beforeCoupon - couponAmount + delivery;
  const freeDeliveryDiff = 499 - subtotal;
  const progress = Math.min(100, Math.round((subtotal / 499) * 100));

  // Revalidate the applied coupon whenever the cart changes (qty/item) so a
  // coupon that no longer meets e.g. the minimum order value is removed.
  const itemsKey = JSON.stringify(
    items.map((i) => [i.productId, i.variant.weight, i.qty])
  );
  useEffect(() => {
    if (!mounted) return;
    const applied = useCartStore.getState().coupon;
    if (!applied) return;
    let cancelled = false;
    setRevalidating(true);
    validateCouponOnServer({
      code: applied.code,
      items: cartItemsForValidation(items),
    })
      .then((res) => {
        if (cancelled) return;
        if (res.valid) {
          const next = toAppliedCoupon(res);
          if (next) setCoupon(next);
          else removeCoupon();
        } else {
          removeCoupon();
          toast(res.error || "Coupon removed because it is no longer valid.");
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRevalidating(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, mounted]);

  const handleApply = async () => {
    const code = couponInput.trim();
    if (!code) {
      toast.error("Please enter a coupon code.");
      return;
    }
    if (applying) return;
    setApplying(true);
    try {
      const res = await validateCouponOnServer({
        code,
        items: cartItemsForValidation(items),
      });
      if (res.valid) {
        const applied = toAppliedCoupon(res);
        if (applied) {
          setCoupon(applied);
          setCouponInput("");
          toast.success(`Coupon ${applied.code} applied — you save ${formatPrice(applied.discountAmount)}!`);
        }
      } else {
        toast.error(res.error || "Invalid coupon code.");
      }
    } finally {
      setApplying(false);
    }
  };

  if (!mounted) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-cream min-h-screen">
        <div className="container-tight py-20 text-center">
          <span className="text-6xl block mb-4">🛒</span>
          <h1 className="font-heading text-2xl text-royal font-bold mb-2">
            Your cart is empty
          </h1>
          <p className="text-muted mb-6">
            Looks like you haven&apos;t added any cookies yet.
          </p>
          <Link href="/shop" className="btn-primary">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cream min-h-screen">
      <div className="container-tight pt-8 pb-2">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-royal">
          Shopping Cart
          <span className="text-muted font-body text-lg font-medium ml-3">
            ({items.length} item{items.length !== 1 ? "s" : ""})
          </span>
        </h1>
      </div>

      <div className="container-tight pb-16 grid grid-cols-1 lg:grid-cols-5 gap-8 mt-6">
        {/* Cart Items */}
        <div className="lg:col-span-3 space-y-4">
          {linePricing.map((line) => (
            <div
              key={line.key}
              className="bg-white rounded-2xl border border-royal/5 shadow-soft p-3.5 sm:p-5 flex gap-3.5 sm:gap-5"
            >
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-cream to-beige flex items-center justify-center shrink-0 overflow-hidden">
                <CartImage src={line.item.image} name={line.item.name} emoji="🍪" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading font-semibold text-royal line-clamp-1">
                    {line.item.name}
                  </h3>
                  <button
                    onClick={() => removeItem(line.item.productId, line.item.variant.weight)}
                    aria-label={`Remove ${line.item.name}`}
                    className="text-muted hover:text-red transition-colors p-1 -mt-1 -mr-1 shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p className="text-muted text-xs mt-0.5">Weight: {line.item.variant.weight}</p>

                <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() =>
                        updateQty(line.item.productId, line.item.variant.weight, line.item.qty - 1)
                      }
                      disabled={line.item.qty <= 1}
                      aria-label="Decrease quantity"
                      className="w-9 h-9 rounded-full border border-royal/20 flex items-center justify-center hover:border-royal transition-colors disabled:opacity-30"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-bold text-royal tabular-nums">
                      {line.item.qty}
                    </span>
                    <button
                      onClick={() =>
                        updateQty(line.item.productId, line.item.variant.weight, line.item.qty + 1)
                      }
                      aria-label="Increase quantity"
                      className="w-9 h-9 rounded-full border border-royal/20 flex items-center justify-center hover:border-royal transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="text-right">
                    {line.discount > 0 && (
                      <p className="text-[11px] text-muted">
                        {formatPrice(line.original)} × {line.item.qty}
                        {line.lineDiscount > 0 && (
                          <span className="text-[#16A34A] font-semibold ml-1">
                            −{formatPrice(line.lineDiscount)}
                          </span>
                        )}
                      </p>
                    )}
                    <span className="font-bold text-royal text-base sm:text-lg">
                      {formatPrice(line.lineTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-royal/5 shadow-soft p-6 sticky top-20 lg:top-24">
            <h2 className="font-heading text-lg font-semibold text-royal mb-4">
              Order Summary
            </h2>

            {delivery !== 0 && (
              <div className="mb-5">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted">Free delivery progress</span>
                  <span className="text-royal font-semibold">
                    Add {formatPrice(freeDeliveryDiff)} more
                  </span>
                </div>
                <div className="h-2 rounded-full bg-royal/10 overflow-hidden">
                  <div
                    className="h-full bg-royal rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              {promoDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Launch Offer ({promotion?.discountValue}% off)</span>
                  <span className="text-[#16A34A] font-semibold">
                    −{formatPrice(promoDiscount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="text-royal font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Delivery</span>
                <span className={delivery === 0 ? "text-green font-bold" : "text-royal font-medium"}>
                  {delivery === 0 ? "Free" : formatPrice(delivery)}
                </span>
              </div>
            </div>

            {/* Coupon */}
            <div className="mt-5 border-t border-royal/10 pt-4">
              {coupon ? (
                <div className="bg-[#16A34A]/8 border border-[#16A34A]/25 rounded-xl p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Ticket size={16} className="text-[#16A34A] shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-royal font-mono">
                          {coupon.code}{" "}
                          <span className="text-[#16A34A] font-semibold">✓</span>
                        </p>
                        <p className="text-xs text-muted">
                          {coupon.discountType === "percentage"
                            ? `${coupon.discountValue}% off`
                            : `INR ${coupon.discountValue} off`}{" "}
                          — you save {formatPrice(couponAmount)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        removeCoupon();
                        toast("Coupon removed.");
                      }}
                      className="text-xs text-muted hover:text-red font-medium shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                  {revalidating && (
                    <p className="text-[11px] text-muted mt-2">
                      Rechecking coupon after cart change…
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted flex items-center gap-1.5 mb-2 font-medium">
                    <Ticket size={15} /> Have a coupon?
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && handleApply()}
                      placeholder="Enter coupon code"
                      className="input-field flex-1 font-mono uppercase text-sm"
                      maxLength={32}
                    />
                    <button
                      onClick={handleApply}
                      disabled={applying}
                      className="btn-navy py-2 px-4 text-sm shrink-0 disabled:opacity-60"
                    >
                      {applying ? "Applying..." : "Apply"}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-royal/10 my-4" />

            <div className="space-y-2 mb-6">
              {couponAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Coupon ({coupon?.code})</span>
                  <span className="text-[#16A34A] font-semibold">
                    −{formatPrice(couponAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-baseline">
                <span className="font-heading text-lg font-bold text-royal">Total</span>
                <span className="font-heading text-2xl font-bold text-royal">
                  {formatPrice(total)}
                </span>
              </div>
            </div>

            <Link href="/checkout" className="btn-primary w-full py-4">
              <ShoppingBag size={18} />
              Proceed to Checkout
            </Link>

            <Link
              href="/shop"
              className="text-center block text-muted text-sm font-medium mt-4 hover:text-royal"
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}