"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, X, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice } from "@/lib/helpers";

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
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const getTotal = useCartStore((s) => s.getTotal);

  useEffect(() => setMounted(true), []);

  const subtotal = getTotal();
  const delivery = subtotal >= 499 ? 0 : 49;
  const total = subtotal + delivery;
  const freeDeliveryDiff = 499 - subtotal;
  const progress = Math.min(100, Math.round((subtotal / 499) * 100));

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
          {items.map((item) => (
            <div
              key={`${item.productId}-${item.variant.weight}`}
              className="bg-white rounded-2xl border border-royal/5 shadow-soft p-3.5 sm:p-5 flex gap-3.5 sm:gap-5"
            >
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-cream to-beige flex items-center justify-center shrink-0 overflow-hidden">
                <CartImage src={item.image} name={item.name} emoji="🍪" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading font-semibold text-royal line-clamp-1">
                    {item.name}
                  </h3>
                  <button
                    onClick={() => removeItem(item.productId, item.variant.weight)}
                    aria-label={`Remove ${item.name}`}
                    className="text-muted hover:text-red transition-colors p-1 -mt-1 -mr-1 shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p className="text-muted text-xs mt-0.5">Weight: {item.variant.weight}</p>

                <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() =>
                        updateQty(item.productId, item.variant.weight, item.qty - 1)
                      }
                      disabled={item.qty <= 1}
                      aria-label="Decrease quantity"
                      className="w-9 h-9 rounded-full border border-royal/20 flex items-center justify-center hover:border-royal transition-colors disabled:opacity-30"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-bold text-royal tabular-nums">
                      {item.qty}
                    </span>
                    <button
                      onClick={() =>
                        updateQty(item.productId, item.variant.weight, item.qty + 1)
                      }
                      aria-label="Increase quantity"
                      className="w-9 h-9 rounded-full border border-royal/20 flex items-center justify-center hover:border-royal transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <span className="font-bold text-royal text-base sm:text-lg">
                    {formatPrice(item.variant.price * item.qty)}
                  </span>
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

            <div className="border-t border-royal/10 my-4" />

            <div className="flex justify-between items-baseline mb-6">
              <span className="font-heading text-lg font-bold text-royal">Total</span>
              <span className="font-heading text-2xl font-bold text-royal">
                {formatPrice(total)}
              </span>
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