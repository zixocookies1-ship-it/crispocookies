"use client";

import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice } from "@/lib/helpers";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const getTotal = useCartStore((s) => s.getTotal);

  const subtotal = getTotal();
  const delivery = subtotal >= 499 ? 0 : 49;
  const total = subtotal + delivery;
  const freeDeliveryDiff = 499 - subtotal;

  if (items.length === 0) {
    return (
      <div className="bg-cream-dark min-h-screen">
        <div className="container-tight py-20 text-center">
          <span className="text-6xl block mb-4">🛒</span>
          <h1 className="font-heading text-2xl text-royal font-bold mb-2">
            Your cart is empty
          </h1>
          <p className="text-muted mb-6">
            Looks like you haven&apos;t added any cookies yet.
          </p>
          <Link href="/shop" className="btn-gold mt-6 inline-flex items-center gap-2">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cream-dark min-h-screen">
      <div className="container-tight py-8">
        <h1 className="font-heading text-4xl text-royal font-bold">
          Shopping Cart
        </h1>
      </div>

      <div className="container-tight pb-16 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-3 space-y-4">
          {items.map((item) => (
            <div
              key={`${item.productId}-${item.variant.weight}`}
              className="bg-surface rounded-2xl shadow-soft p-4 sm:p-5 flex gap-4 sm:gap-5"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-cream to-gold/10 flex items-center justify-center shrink-0">
                <span className="text-2xl sm:text-3xl select-none">🍪</span>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-semibold text-royal hover:text-gold transition-colors truncate">
                  {item.name}
                </h3>
                <p className="text-muted text-sm">{item.variant.weight}</p>

                <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() =>
                        updateQty(item.productId, item.variant.weight, item.qty - 1)
                      }
                      aria-label="Decrease quantity"
                      className="w-10 h-10 rounded-full border border-royal/20 flex items-center justify-center hover:border-gold transition-colors text-sm"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-semibold">
                      {item.qty}
                    </span>
                    <button
                      onClick={() =>
                        updateQty(item.productId, item.variant.weight, item.qty + 1)
                      }
                      aria-label="Increase quantity"
                      className="w-10 h-10 rounded-full border border-royal/20 flex items-center justify-center hover:border-gold transition-colors text-sm"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <span className="font-semibold text-gold text-lg">
                    {formatPrice(item.variant.price * item.qty)}
                  </span>

                  <button
                    onClick={() => removeItem(item.productId, item.variant.weight)}
                    aria-label={`Remove ${item.name}`}
                    className="text-muted hover:text-red transition-colors p-1"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <Link
            href="/shop"
            className="text-gold text-sm font-medium hover:text-gold-hover mt-4 inline-flex items-center gap-1"
          >
            ← Continue Shopping
          </Link>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-2">
          <div className="bg-surface rounded-2xl shadow-soft p-6 sticky top-24">
            <h2 className="font-heading text-lg font-semibold text-royal mb-6">
              Order Summary
            </h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="text-royal font-medium">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Delivery</span>
                <span
                  className={
                    delivery === 0
                      ? "text-green font-medium"
                      : "text-royal font-medium"
                  }
                >
                  {delivery === 0 ? "Free" : formatPrice(delivery)}
                </span>
              </div>
              {delivery !== 0 && (
                <p className="text-gold text-xs">
                  Add {formatPrice(freeDeliveryDiff)} more for free delivery
                </p>
              )}
            </div>

            <div className="border-t border-royal/10 my-4" />

            <div className="flex justify-between items-baseline">
              <span className="font-heading text-lg font-bold text-royal">
                Total
              </span>
              <span className="font-heading text-xl font-bold text-royal">
                {formatPrice(total)}
              </span>
            </div>

            <Link
              href="/checkout"
              className="btn-gold w-full mt-6 flex items-center justify-center text-center"
            >
              Proceed to Checkout
            </Link>

            <Link
              href="/shop"
              className="text-center block text-gold text-sm font-medium mt-4 hover:text-gold-hover"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
