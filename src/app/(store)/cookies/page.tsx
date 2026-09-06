"use client";

import Link from "next/link";

import { ShoppingBag, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice } from "@/lib/helpers";

const cookies = [
  {
    name: "Double Chocolate Cookie",
    slug: "double-chocolate-cookie",
    price: 179,
    mrp: 299,
    weight: "200g",
    packQuantity: "4 cookies",
    description:
      "Rich, indulgent and deeply chocolatey, made with pure oats powder and loaded with chocolate goodness.",
    emoji: "\uD83C\uDF6A",
  },
  {
    name: "Rose Cookie",
    slug: "rose-cookie",
    price: 179,
    mrp: 299,
    weight: "200g",
    packQuantity: "4 cookies",
    description:
      "A delicate floral twist with homemade rose syrup prepared with fresh rose petals.",
    emoji: "\uD83C\uDF39",
  },
  {
    name: "Pineapple Cookie",
    slug: "pine-apple-cookie",
    price: 179,
    mrp: 299,
    weight: "200g",
    packQuantity: "4 cookies",
    description:
      "Tropical, refreshing cookie with homemade pineapple syrup and wholesome oats.",
    emoji: "\uD83C\uDF4D",
  },
  {
    name: "Dry Seeds Cookie",
    slug: "dry-seed-cookies",
    price: 219,
    mrp: 399,
    weight: "300g",
    packQuantity: "4 cookies",
    description:
      "Nutrient-rich cookie loaded with four powerful seeds for crunch, nutrition and taste.",
    emoji: "\uD83C\uDF31",
  },
  {
    name: "All Mix Cookies",
    slug: "all-mix-cookies",
    price: 219,
    mrp: 399,
    weight: "300g",
    packQuantity: "6 cookies",
    description:
      "Assortment of our finest cookies \u2014 a perfect way to try everything.",
    emoji: "\uD83C\uDF81",
  },
];

export default function CookieCollectionPage() {
  const addItem = useCartStore((s) => s.addItem);

  const handleAddToCart = (cookie: (typeof cookies)[number]) => {
    addItem({
      productId: cookie.slug,
      name: cookie.name,
      variant: { weight: cookie.weight, price: cookie.price },
      image: "",
    });
    toast.success(`${cookie.name} added to cart`);
  };

  return (
    <div className="bg-cream-dark min-h-screen">
      {/* Hero Section */}
      <section className="bg-royal py-20">
        <div className="container-tight text-center">
          <p className="eyebrow mb-4">OUR COLLECTION</p>
          <h1 className="font-heading text-section text-white font-bold mb-4">
            Cookie Collection
          </h1>
          <p className="text-cream/60 text-lg max-w-xl mx-auto">
            Discover our handcrafted oat-based cookies \u2014 100% ZERO MAIDHA,
            made with pure oats, real butter, and premium ingredients.
          </p>
        </div>
      </section>

      {/* Product Grid */}
      <section className="container-tight py-12 pb-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cookies.map((cookie) => {
            const discount = Math.round(((cookie.mrp - cookie.price) / cookie.mrp) * 100);
            return (
              <div key={cookie.slug} className="scene-3d">
                <div className="surface-card rounded-3xl overflow-hidden flex flex-col h-full">
                  {/* Emoji Header */}
                  <div className="bg-gradient-to-br from-gold/10 via-cream to-royal/5 aspect-[4/3] flex items-center justify-center relative">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gold/20 to-royal/5 flex items-center justify-center">
                      <span className="text-5xl select-none">{cookie.emoji}</span>
                    </div>
                    <span className="absolute top-3 right-3 bg-gold text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      {discount}% OFF
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-heading text-lg font-semibold text-royal mb-1.5">
                      {cookie.name}
                    </h3>
                    <p className="text-muted text-sm leading-relaxed line-clamp-2 mb-3 flex-1">
                      {cookie.description}
                    </p>

                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gold font-bold text-xl">
                        {formatPrice(cookie.price)}
                      </span>
                      <span className="text-muted text-sm line-through">
                        {formatPrice(cookie.mrp)}
                      </span>
                    </div>
                    <p className="text-muted text-xs mb-4">
                      {cookie.weight} / {cookie.packQuantity}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 mt-auto">
                      <button
                        onClick={() => handleAddToCart(cookie)}
                        className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 text-white font-semibold py-2.5 rounded-full text-sm transition-all duration-300 hover:shadow-gold"
                      >
                        <ShoppingBag size={16} />
                        Add to Cart
                      </button>
                      <div className="flex gap-2">
                        <Link
                          href={`/shop/${cookie.slug}`}
                          className="flex-1 flex items-center justify-center gap-1.5 border-2 border-royal text-royal hover:bg-royal hover:text-white font-semibold py-2.5 rounded-full text-xs transition-all duration-300 uppercase tracking-wider"
                        >
                          VIEW PRODUCT
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
