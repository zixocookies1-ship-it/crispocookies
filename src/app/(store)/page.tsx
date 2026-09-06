"use client";

import { useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/store/useCartStore";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  Wheat,
  Heart,
  Gem,
  ShieldCheck,
} from "lucide-react";

const formatPrice = (p: number) => `₹${p}`;
const calcDiscount = (mrp: number, price: number) =>
  Math.round(((mrp - price) / mrp) * 100);

interface Product {
  slug: string;
  name: string;
  emoji: string;
  price: number;
  mrp: number;
  weight: string;
  category: "Cookie" | "Brownie";
}

const products: Product[] = [
  {
    slug: "double-chocolate-cookie",
    name: "Double Chocolate Cookie",
    emoji: "🍪",
    price: 179,
    mrp: 299,
    weight: "200g (4 cookies)",
    category: "Cookie",
  },
  {
    slug: "rose-cookie",
    name: "Rose Cookie",
    emoji: "🌹",
    price: 179,
    mrp: 299,
    weight: "200g (4 cookies)",
    category: "Cookie",
  },
  {
    slug: "pineapple-cookie",
    name: "Pineapple Cookie",
    emoji: "🍍",
    price: 179,
    mrp: 299,
    weight: "200g (4 cookies)",
    category: "Cookie",
  },
  {
    slug: "dry-seed-cookies",
    name: "Dry Seeds Cookie",
    emoji: "🌱",
    price: 219,
    mrp: 399,
    weight: "300g (4 cookies)",
    category: "Cookie",
  },
  {
    slug: "all-mix-cookies",
    name: "All Mix Cookies",
    emoji: "🥣",
    price: 219,
    mrp: 399,
    weight: "300g (6 cookies)",
    category: "Cookie",
  },
  {
    slug: "double-chocolate-oats-brownie",
    name: "Double Chocolate Oats Brownie",
    emoji: "🍫",
    price: 250,
    mrp: 499,
    weight: "300g (6 pieces)",
    category: "Brownie",
  },
  {
    slug: "kaju-oats-brownie",
    name: "Kaju Oats Brownie",
    emoji: "🥜",
    price: 250,
    mrp: 499,
    weight: "300g (6 pieces)",
    category: "Brownie",
  },
];

const cookieProducts = products.filter((p) => p.category === "Cookie");
const brownieProducts = products.filter((p) => p.category === "Brownie");

const whyFeatures = [
  {
    icon: Wheat,
    title: "100% Pure Oats",
    desc: "Every product is made with 100% pure oats — zero maida, zero compromise.",
  },
  {
    icon: Heart,
    title: "Made With Love",
    desc: "Handcrafted in small batches with genuine care in every bite.",
  },
  {
    icon: Gem,
    title: "Premium Ingredients",
    desc: "Only the finest ingredients sourced to guarantee exceptional taste.",
  },
  {
    icon: ShieldCheck,
    title: "Zero Preservatives",
    desc: "No artificial preservatives, no shortcuts — just clean, honest baking.",
  },
];

export default function StoreHomePage() {
  const addItem = useCartStore((s) => s.addItem);
  const [activeCollection, setActiveCollection] = useState<"cookies" | "brownies">("cookies");

  const handleAddToCart = (product: Product) => {
    addItem({
      productId: product.slug,
      name: product.name,
      variant: { weight: product.weight, price: product.price },
      image: product.emoji,
    });
  };

  return (
    <>
      {/* ─── SECTION 1: HERO ─── */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden"
        aria-label="Hero"
      >
        {/* Video background */}
        <div className="absolute inset-0 z-0">
          <video
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster="/logo.jpeg"
          >
            <source src="/hero-1.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-espresso/70 via-plum/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-cream via-transparent to-plum/20" />
        </div>

        <div className="container-wide relative z-10 py-20 lg:py-0">
          <div className="max-w-2xl mx-auto text-center lg:text-left lg:mx-0">
            <p className="eyebrow mb-4 text-gold-soft">Baked to Perfection</p>
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-display text-cream font-bold leading-[1.05] mb-5">
              Baked to Impress.
            </h1>
            <p className="text-cream/85 text-lg mb-3">
              Made with love for every bite.
            </p>
            <p className="text-gold-soft font-medium text-base mb-8">
              A Little Crisp. A Lot of Love.
            </p>
            <div className="flex flex-wrap items-center gap-4 justify-center lg:justify-start">
              <Link href="/cookies" className="btn-gold">
                Explore Cookies
              </Link>
              <a
                href="https://wa.me/917569831560"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center font-body font-semibold px-8 py-3.5 rounded-full border-2 border-cream/40 text-cream hover:bg-cream hover:text-plum transition-all duration-300 text-sm tracking-wider uppercase"
              >
                Order on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: OUR STORY ─── */}
      <section className="py-16 lg:py-24" aria-label="Our Story">
        <div className="container-tight max-w-4xl mx-auto text-center">
          <p className="eyebrow mb-4">Our Story</p>
          <h2 className="font-heading text-4xl lg:text-section text-royal font-bold mb-6">
            A Little Crisp. A Lot of Love.
          </h2>
          <p className="text-muted text-lg leading-relaxed max-w-3xl mx-auto mb-10">
            At CRISPO COOKIES, every bite is made to bring together great taste,
            quality ingredients and wholesome goodness. From indulgent chocolate
            cookies to fruity and nutritious creations, our cookies are crafted
            with care and baked to make every moment a little sweeter.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "100% ZERO MAIDHA",
              "MADE WITH OATS",
              "PREMIUM INGREDIENTS",
              "HANDCRAFTED",
              "MADE WITH LOVE",
            ].map((badge) => (
              <span
                key={badge}
                className="px-5 py-2.5 rounded-full border border-gold/30 bg-gold/10 text-plum text-xs font-bold tracking-widest uppercase"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: THE COLLECTION ─── */}
      <section className="py-16 lg:py-24 bg-cream-dark" aria-label="The Collection">
        <div className="container-tight">
          <div className="text-center mb-10">
            <p className="eyebrow mb-4">The Collection</p>
            <h2 className="font-heading text-4xl lg:text-section text-royal font-bold mb-3">
              Crispo Cookies
            </h2>
            <p className="text-muted text-lg">
              Switch between cookies and brownies — every box is{" "}
              <span className="text-royal font-semibold">100% ZERO MAIDHA</span>.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex p-1.5 rounded-full bg-cream border border-lavender/40 shadow-soft">
              {(["cookies", "brownies"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveCollection(tab)}
                  className={cn(
                    "px-8 py-2.5 rounded-full text-sm font-bold tracking-wider uppercase transition-all duration-300 cursor-pointer",
                    activeCollection === tab
                      ? "bg-royal text-cream shadow-lift"
                      : "text-plum/60 hover:text-plum"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {(activeCollection === "cookies" ? cookieProducts : brownieProducts).map(
              (product) => {
                const discount = calcDiscount(product.mrp, product.price);
                return (
                  <div
                    key={product.slug}
                    className="surface-card rounded-2xl overflow-hidden flex flex-col hover:shadow-lift transition-shadow duration-300"
                  >
                    <div className="bg-gradient-to-br from-gold/10 via-cream to-beige h-48 flex items-center justify-center">
                      <span className="text-7xl select-none">
                        {product.emoji}
                      </span>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-heading text-lg font-semibold text-royal mb-2">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gold font-bold text-lg">
                          {formatPrice(product.price)}
                        </span>
                        <span className="text-muted text-sm line-through">
                          {formatPrice(product.mrp)}
                        </span>
                      </div>
                      <span className="text-green text-xs font-semibold mb-4">
                        {discount}% OFF
                      </span>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="btn-gold btn-sm w-full mt-auto flex items-center justify-center gap-2"
                      >
                        <ShoppingCart size={14} />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </section>

      {/* ─── SECTION 4: FROM OUR OVEN ─── */}
      <section className="py-16 lg:py-24" aria-label="From Our Oven">
        <div className="container-tight">
          <div className="text-center mb-10">
            <p className="eyebrow mb-4">From Our Oven</p>
            <h2 className="font-heading text-4xl lg:text-section text-royal font-bold">
              Watch the goodness come to life.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-3xl overflow-hidden shadow-lift relative aspect-video">
              <video
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              >
                <source src="/hero-1.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-plum/40 to-transparent pointer-events-none" />
            </div>
            <div className="rounded-3xl overflow-hidden shadow-lift relative aspect-video">
              <video
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              >
                <source src="/hero-2.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-plum/40 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 5: ABOUT / OUR STORY ─── */}
      <section className="py-16 lg:py-24" aria-label="Our Story">
        <div className="container-tight">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
            {/* Left – image */}
            <div className="flex justify-center">
              <div className="w-full max-w-md aspect-square rounded-3xl overflow-hidden shadow-lift relative">
                <img
                  src="/our story.jpg"
                  alt="Crispo Cookies — baked with love"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-plum/30 to-transparent pointer-events-none" />
              </div>
            </div>

            {/* Right – text */}
            <div>
              <p className="eyebrow mb-4">Our Story</p>
              <h2 className="font-heading text-4xl lg:text-section text-royal font-bold mb-5">
                Crafted with Purpose
              </h2>
              <p className="text-muted text-lg leading-relaxed mb-4">
                Crispo was born from a simple passion for healthy snacking.
                Based in Nellore, Andhra Pradesh, we set out to prove that
                treats made with pure oats can be every bit as delicious as
                traditional baked goods.
              </p>
              <p className="text-muted text-lg leading-relaxed mb-6">
                Every bite reflects our commitment:{" "}
                <span className="text-royal font-semibold">
                  100% ZERO MAIDHA
                </span>
                , premium oats, and zero preservatives. We bake with love so
                you can snack without guilt.
              </p>
              <ul className="space-y-3">
                {[
                  "100% pure oats, zero maida",
                  "No preservatives, ever",
                  "Handcrafted in Nellore, Andhra Pradesh",
                ].map((point) => (
                  <li key={point} className="flex items-center gap-3 text-royal">
                    <span className="text-gold font-bold">✓</span>
                    <span className="font-medium">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 6: WHY CRISPO ─── */}
      <section
        className="py-16 lg:py-20 bg-cream-dark"
        aria-label="Why Crispo"
      >
        <div className="container-tight">
          <h2 className="section-heading text-center mb-10">Why Crispo?</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {whyFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="surface-card rounded-2xl p-6 text-center"
                >
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
                    <Icon size={26} className="text-gold" />
                  </div>
                  <h3 className="font-heading text-base font-semibold text-royal mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
