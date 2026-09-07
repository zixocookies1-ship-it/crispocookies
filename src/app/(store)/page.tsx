"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Wheat,
  Heart,
  Gem,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { fetchProducts, StoreProduct } from "@/lib/storefront";
import { ProductCardSkeleton } from "@/components/skeleton";
import ProductCard from "@/components/product-card";
import BenefitsSection from "@/components/benefits-section";

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="5"/>
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.56 12 19.56 12 19.56s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z"/>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
  </svg>
);

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
  const [activeCollection, setActiveCollection] = useState<"cookies" | "brownies">("cookies");
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const collectionProducts =
    activeCollection === "cookies"
      ? products.filter((p) => p.category?.name.toLowerCase() === "cookies")
      : products.filter((p) => p.category?.name.toLowerCase() === "brownies");

  return (
    <>
      {/* ─── SECTION 1: HERO ─── */}
      <section
        className="relative min-h-screen min-h-[100svh] flex items-center overflow-hidden bg-gradient-to-br from-espresso via-plum to-royal"
        aria-label="Hero"
      >
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-gradient-to-r from-espresso/70 via-plum/40 to-transparent"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-cream via-transparent to-plum/20"
            aria-hidden="true"
          />
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
              <Link href="/cookies" className="btn-primary">
                Explore Cookies
              </Link>
              <Link
                href="/cart"
                className="inline-flex items-center justify-center font-body font-semibold px-8 py-3.5 rounded-full border-2 border-cream/40 text-cream hover:bg-cream hover:text-plum transition-all duration-300 text-sm tracking-wider uppercase"
              >
                View Cart
              </Link>
            </div>
          </div>
        </div>
      </section>

      <BenefitsSection />

      {/* ─── SECTION 2: OUR STORY ─── */}
      <section className="py-16 lg:py-24 bg-cream" aria-label="Our Story">
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

          <div className="flex justify-center mb-10">
            <div className="inline-flex p-1.5 rounded-full bg-white border border-royal/10 shadow-soft">
              {(["cookies", "brownies"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveCollection(tab)}
                  className={cn(
                    "px-6 sm:px-8 py-2.5 rounded-full text-sm font-bold tracking-wider uppercase transition-all duration-300 cursor-pointer",
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

          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-16">
              <h3 className="font-heading text-xl text-royal mb-2">We couldn&apos;t load the products</h3>
              <button onClick={() => setAttempt((a) => a + 1)} className="btn-royal mt-4">
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          )}

          {!loading && !error && collectionProducts.length === 0 && (
            <p className="text-center text-muted py-16">
              New treats are being baked — check back soon.
            </p>
          )}

          {!loading && !error && collectionProducts.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {collectionProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Link href="/shop" className="btn-primary">
              Shop All Products
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── SECTION 4: FROM OUR OVEN ─── */}
      <section className="py-16 lg:py-24 bg-cream" aria-label="From Our Oven">
        <div className="container-tight">
          <div className="text-center mb-10">
            <p className="eyebrow mb-4">From Our Oven</p>
            <h2 className="font-heading text-4xl lg:text-section text-royal font-bold">
              Baked fresh, straight from our oven.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { emoji: "🍪", label: "Handcrafted Cookies", sub: "100% ZERO MAIDHA oat-based cookies" },
              { emoji: "🍫", label: "Fudgy Brownies", sub: "Rich, wholesome oat-based brownies" },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-3xl overflow-hidden shadow-lift relative aspect-video bg-gradient-to-br from-gold/10 via-cream to-royal/5 flex flex-col items-center justify-center text-center p-6"
              >
                <span className="text-6xl select-none mb-3" aria-hidden="true">
                  {card.emoji}
                </span>
                <h3 className="font-heading text-xl font-semibold text-royal">
                  {card.label}
                </h3>
                <p className="text-muted text-sm mt-1">{card.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 5: CHOOSE YOUR CRAVE ─── */}
      <section className="py-16 lg:py-24 bg-cream" aria-label="Choose Your Crave">
        <div className="container-tight">
          <div className="text-center mb-10">
            <p className="eyebrow mb-4">Choose Your Crave</p>
            <h2 className="font-heading text-4xl lg:text-section text-royal font-bold mb-4">
              Five moods. One box away.
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Match your moment with oat-based cookies and brownies. No
              compromise on taste.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
            {[
              { emoji: "🍫", label: "Indulgent" },
              { emoji: "🌹", label: "Floral" },
              { emoji: "🍍", label: "Fruity" },
              { emoji: "🌱", label: "Nutty" },
              { emoji: "🥜", label: "Rich" },
            ].map((mood) => (
              <div
                key={mood.label}
                className="bg-white rounded-3xl p-6 text-center border border-royal/5 shadow-soft hover:shadow-lift transition-shadow duration-300"
              >
                <span className="text-5xl block mb-3 select-none">
                  {mood.emoji}
                </span>
                <h3 className="font-heading text-lg font-semibold text-royal">
                  {mood.label}
                </h3>
              </div>
            ))}
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
                  className="bg-white rounded-2xl p-6 text-center border border-royal/5 shadow-soft"
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

      {/* ─── SECTION 7: ABOUT CRISPO ─── */}
      <section className="py-16 lg:py-24 bg-cream" aria-label="About Crispo">
        <div className="container-tight">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
            <div className="flex justify-center order-2 lg:order-1">
              <div className="w-full max-w-md aspect-square rounded-3xl overflow-hidden shadow-lift relative">
                <Image
                  src="/our story.jpg"
                  alt="Crispo Cookies — about us"
                  fill
                  sizes="(max-width: 1024px) 90vw, 40vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-plum/30 to-transparent pointer-events-none" />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <p className="eyebrow mb-4">About Crispo</p>
              <h2 className="font-heading text-4xl lg:text-section text-royal font-bold mb-5">
                Baked to Impress. Baked With Purpose.
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
              <ul className="space-y-3 mb-8">
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
              <Link href="/about" className="btn-primary">
                Our Story
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 8: FOLLOW US ─── */}
      <section className="py-16 lg:py-24 bg-cream-dark" aria-label="Follow Us">
        <div className="container-tight">
          <div className="text-center mb-12">
            <p className="eyebrow mb-4">Stay Connected</p>
            <h2 className="font-heading text-4xl lg:text-section text-royal font-bold mb-4">
              Follow Us
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Behind-the-scenes bakes, drool-worthy close-ups, and the latest
              Crispo drops — straight to your feed.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <a
              href="https://www.instagram.com/rahul.bites"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-[2rem] p-8 sm:p-10 flex flex-col items-center text-center border border-royal/5 shadow-soft hover:shadow-lift hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-royal flex items-center justify-center mb-5">
                <InstagramIcon className="w-8 h-8 text-cream" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-royal mb-1">
                Instagram
              </h3>
              <p className="text-gold font-semibold mb-3">@rahul.bites</p>
              <p className="text-muted text-sm">
                Daily bakes, reels, and behind-the-scenes.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-royal font-semibold text-sm tracking-wider uppercase group-hover:text-gold transition-colors">
                Follow @rahul.bites
                <ArrowRight size={15} />
              </span>
            </a>
            <a
              href="https://www.youtube.com/@Rahul-Bites"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-[2rem] p-8 sm:p-10 flex flex-col items-center text-center border border-royal/5 shadow-soft hover:shadow-lift hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-plum to-royal flex items-center justify-center mb-5">
                <YoutubeIcon className="w-8 h-8 text-cream" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-royal mb-1">
                YouTube
              </h3>
              <p className="text-gold font-semibold mb-3">@Rahul-Bites</p>
              <p className="text-muted text-sm">
                Full baking videos and crispy content.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-royal font-semibold text-sm tracking-wider uppercase group-hover:text-gold transition-colors">
                Subscribe @Rahul-Bites
                <ArrowRight size={15} />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ─── SECTION 9: CONTACT ─── */}
      <section className="py-16 lg:py-24 bg-cream" aria-label="Contact Crispo">
        <div className="container-tight">
          <div className="text-center mb-12">
            <p className="eyebrow mb-4">Get In Touch</p>
            <h2 className="font-heading text-4xl lg:text-section text-royal font-bold mb-4">
              Let&apos;s Talk Cookies
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Questions, bulk orders, or custom gifts? We&apos;d love to hear
              from you.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl p-8 text-center border border-royal/5 shadow-soft hover:shadow-lift transition-shadow duration-300">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
                <Mail size={22} className="text-gold" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-royal mb-2">
                Email
              </h3>
              <a
                href="mailto:ccrispocookies@gmail.com"
                className="text-muted text-sm hover:text-gold transition-colors break-all"
              >
                ccrispocookies@gmail.com
              </a>
            </div>
            <div className="bg-white rounded-3xl p-8 text-center border border-royal/5 shadow-soft hover:shadow-lift transition-shadow duration-300">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
                <Phone size={22} className="text-gold" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-royal mb-2">
                Phone
              </h3>
              <a
                href="tel:+917569831560"
                className="text-muted text-sm hover:text-gold transition-colors"
              >
                +91 75698 31560
              </a>
            </div>
            <div className="bg-white rounded-3xl p-8 text-center border border-royal/5 shadow-soft hover:shadow-lift transition-shadow duration-300">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
                <MapPin size={22} className="text-gold" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-royal mb-2">
                Location
              </h3>
              <p className="text-muted text-sm">Nellore, Andhra Pradesh</p>
            </div>
          </div>
          <div className="max-w-md mx-auto mt-10">
            <Link href="/shop" className="btn-primary w-full">
              Order Now
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}