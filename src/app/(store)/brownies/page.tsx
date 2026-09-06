"use client";

import Link from "next/link";

import { ShoppingBag, ArrowRight, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice } from "@/lib/helpers";

const brownies = [
  {
    name: "Double Chocolate Oats Brownie",
    slug: "double-chocolate-oats-brownie",
    price: 250,
    mrp: 499,
    weight: "403 kcal",
    packQuantity: "1 brownie",
    description:
      "Rich, fudgy chocolate brownie crafted with oats. Crisp outside, fudgy inside.",
    emoji: "\uD83C\uDF6B",
  },
  {
    name: "Kaju Oats Brownie",
    slug: "kaju-oats-brownie",
    price: 250,
    mrp: 499,
    weight: "300g",
    packQuantity: "6 pieces",
    description:
      "Rich fudgy brownie with premium cashews and wholesome oats.",
    emoji: "\uD83E\uDD5E",
  },
];

export default function BrownieCollectionPage() {
  const addItem = useCartStore((s) => s.addItem);

  const handleAddToCart = (brownie: (typeof brownies)[number]) => {
    addItem({
      productId: brownie.slug,
      name: brownie.name,
      variant: { weight: brownie.weight, price: brownie.price },
      image: "",
    });
    toast.success(`${brownie.name} added to cart`);
  };

  const whatsappUrl = (name: string, packQuantity: string, weight: string, price: number) =>
    `https://wa.me/917569831560?text=${encodeURIComponent(
      `Hello CRISPO COOKIES! I would like to order: ${name} \u2014 ${packQuantity} / ${weight} \u00D7 1 = \u20B9${price}. Please confirm availability and delivery.`
    )}`;

  return (
    <div className="bg-cream-dark min-h-screen">
      {/* Hero Section */}
      <section className="bg-royal py-20">
        <div className="container-tight text-center">
          <p className="eyebrow mb-4">OUR COLLECTION</p>
          <h1 className="font-heading text-section text-white font-bold mb-4">
            Brownie Collection
          </h1>
          <p className="text-cream/60 text-lg max-w-xl mx-auto">
            Fudgy, rich and irresistibly chocolatey \u2014 our oat-based brownies
            are 100% ZERO MAIDHA and baked with love.
          </p>
        </div>
      </section>

      {/* Product Grid */}
      <section className="container-tight py-12 pb-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {brownies.map((brownie) => {
            const discount = Math.round(((brownie.mrp - brownie.price) / brownie.mrp) * 100);
            return (
              <div key={brownie.slug} className="scene-3d">
                <div className="surface-card rounded-3xl overflow-hidden flex flex-col h-full">
                  {/* Emoji Header */}
                  <div className="bg-gradient-to-br from-brown/20 via-cream to-royal/5 aspect-[4/3] flex items-center justify-center relative">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-chocolate/20 to-royal/5 flex items-center justify-center">
                      <span className="text-5xl select-none">{brownie.emoji}</span>
                    </div>
                    <span className="absolute top-3 right-3 bg-gold text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      {discount}% OFF
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-heading text-lg font-semibold text-royal mb-1.5">
                      {brownie.name}
                    </h3>
                    <p className="text-muted text-sm leading-relaxed line-clamp-2 mb-3 flex-1">
                      {brownie.description}
                    </p>

                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gold font-bold text-xl">
                        {formatPrice(brownie.price)}
                      </span>
                      <span className="text-muted text-sm line-through">
                        {formatPrice(brownie.mrp)}
                      </span>
                    </div>
                    <p className="text-muted text-xs mb-4">
                      {brownie.weight} / {brownie.packQuantity}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 mt-auto">
                      <button
                        onClick={() => handleAddToCart(brownie)}
                        className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 text-white font-semibold py-2.5 rounded-full text-sm transition-all duration-300 hover:shadow-gold"
                      >
                        <ShoppingBag size={16} />
                        Add to Cart
                      </button>
                      <div className="flex gap-2">
                        <Link
                          href={`/shop/${brownie.slug}`}
                          className="flex-1 flex items-center justify-center gap-1.5 border-2 border-royal text-royal hover:bg-royal hover:text-white font-semibold py-2.5 rounded-full text-xs transition-all duration-300 uppercase tracking-wider"
                        >
                          VIEW PRODUCT
                          <ArrowRight size={14} />
                        </Link>
                        <a
                          href={whatsappUrl(brownie.name, brownie.packQuantity, brownie.weight, brownie.price)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 bg-green hover:bg-green/90 text-white font-semibold py-2.5 rounded-full text-xs transition-all duration-300 uppercase tracking-wider"
                        >
                          <MessageCircle size={14} />
                          ORDER ON WHATSAPP
                        </a>
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
