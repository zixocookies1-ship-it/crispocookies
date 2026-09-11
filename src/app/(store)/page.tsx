"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Leaf,
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
import { fetchProducts, StoreProduct, WHATSAPP_LINK } from "@/lib/storefront";
import { getActivePromotion } from "@/lib/promotion";
import { ActivePromotion } from "@/lib/pricing-math";
import { ProductCardSkeleton } from "@/components/skeleton";
import ProductCard from "@/components/product-card";
import BenefitsSection from "@/components/benefits-section";
import { InstagramIcon, YoutubeIcon, SOCIAL_LINKS } from "@/components/social-icons";

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

// Hero banner videos — hero 2 shows first, hero 1 second.
const HERO_BANNERS = [
  { src: "/hero-2.mp4", label: "The Bake" },
  { src: "/hero-1.mp4", label: "Our Story" },
];

const STORY_BADGES = [
  "100% ZERO MAIDHA",
  "MADE WITH OATS",
  "PREMIUM INGREDIENTS",
  "HANDCRAFTED",
  "MADE WITH LOVE",
];

export default function StoreHomePage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [promotion, setPromotion] = useState<ActivePromotion | null>(null);
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerRefs = useRef<(HTMLVideoElement | null)[]>([null, null]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % HERO_BANNERS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const current = bannerRefs.current[activeBanner];
    if (current) {
      current.play().catch(() => {});
    }
  }, [activeBanner]);

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

  const cookieProducts = products.filter(
    (p) => p.category?.name.toLowerCase() === "cookies"
  );
  const brownieProducts = products.filter(
    (p) => p.category?.name.toLowerCase() === "brownies"
  );

  return (
    <>
      {/* ─── BANNER CAROUSEL ─── */}
      <section className="crispo-banner" aria-label="Featured banner">
        {HERO_BANNERS.map((banner, i) => (
          <video
            key={banner.src}
            ref={(el) => {
              bannerRefs.current[i] = el;
            }}
            className={cn(
              "crispo-banner__media transition-opacity duration-[900ms]",
              activeBanner === i ? "opacity-100" : "opacity-0"
            )}
            autoPlay
            muted
            loop
            playsInline
            preload={i === 0 ? "auto" : "metadata"}
            aria-hidden="true"
          >
            <source src={banner.src} type="video/mp4" />
          </video>
        ))}
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-cocoa/40"
          aria-hidden="true"
        />
        <div className="crispo-banner__dots" role="tablist" aria-label="Banner slides">
          {HERO_BANNERS.map((banner, i) => (
            <button
              key={banner.src}
              role="tab"
              aria-selected={activeBanner === i}
              aria-label={`Show ${banner.label} banner`}
              onClick={() => setActiveBanner(i)}
              className={cn(
                "crispo-banner__dot",
                activeBanner === i && "is-active"
              )}
            />
          ))}
        </div>
      </section>

      {/* ─── HERO CONTENT ─── */}
      <section
        className="relative overflow-hidden bg-gradient-to-b from-espresso via-cocoa to-cocoa py-14 lg:py-24"
        aria-label="Hero"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(80% 60% at 50% 0%, rgba(224,179,74,0.08), transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div className="relative container-wide px-5 sm:px-6">
          <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
            {promotion && (
              <span className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/15 text-gold-soft text-[10px] font-bold tracking-[0.2em] uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" aria-hidden="true" />
                Launch Offer — {promotion.discountValue}% OFF
              </span>
            )}

            <span className="crispo-pill mb-6 inline-flex items-center gap-2 rounded-full px-5 py-2 text-[10px] sm:text-[11px] font-bold uppercase">
              100% ZERO MAIDHA
            </span>

            <h1 className="font-heading font-bold leading-[1.06] text-[2.6rem] sm:text-[3.4rem] lg:text-7xl mb-7">
              <span className="block text-lavender">Baked to Impress.</span>
              <span className="block text-gradient-gold">Made to Crave.</span>
            </h1>

            <Leaf
              size={22}
              strokeWidth={1.25}
              className="crispo-leaf mb-7 -rotate-[24deg]"
              aria-hidden="true"
            />

            <div className="crispo-gold-card w-[92%] max-w-[560px] rounded-3xl px-7 py-6 sm:px-9 sm:py-7 mb-9">
              <p className="text-[15px] sm:text-[17px] font-semibold leading-relaxed text-[#2B1803]">
                Premium oat-based cookies &amp; brownies, handcrafted with love.
                Delivered fresh, baked to perfection.
              </p>
            </div>

            <div className="flex w-full max-w-[520px] flex-col sm:flex-row items-stretch justify-center gap-3 sm:gap-4 mb-7">
              <Link
                href="/cookies"
                className="crispo-btn-gold w-full sm:flex-1 px-6 py-3.5 text-[10px] sm:text-[11px]"
              >
                Explore Cookies
              </Link>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="crispo-btn-wa w-full sm:flex-1 px-6 py-3.5 text-[10px] sm:text-[11px]"
              >
                Order on WhatsApp
              </a>
            </div>

            <a
              href="tel:+917569831560"
              className="inline-flex items-center gap-2.5 text-cremel/90 hover:text-gold-soft transition-colors"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
                <Phone size={15} className="text-gold-soft" />
              </span>
              <span className="font-body text-sm sm:text-base font-semibold tracking-wide">
                +91 75698 31560
              </span>
            </a>
          </div>
        </div>
      </section>

      <BenefitsSection />

      {/* ─── OUR STORY ─── */}
      <section className="py-16 lg:py-24 bg-espresso" aria-label="Our Story">
        <div className="container-tight max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-14 items-center">
            <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
              <p className="eyebrow mb-4 text-left">Our Story</p>
              <h2 className="font-heading text-4xl lg:text-5xl font-bold leading-[1.12] mb-6">
                <span className="block text-cream">A Little Crisp.</span>
                <span className="block text-gradient-gold">A Lot of Love.</span>
              </h2>
              <p className="text-muted text-lg leading-relaxed max-w-xl mb-8">
                At CRISPO COOKIES, every bite is made to bring together great
                taste, quality ingredients and wholesome goodness. From
                indulgent chocolate cookies to fruity and nutritious creations,
                our cookies are crafted with care and baked to make every
                moment a little sweeter.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-2.5 mb-9">
                {STORY_BADGES.map((badge) => (
                  <span
                    key={badge}
                    className="crispo-badge rounded-full px-4 py-2 text-[10px] font-bold uppercase"
                  >
                    {badge}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-5">
                <Link href="/about" className="crispo-btn-gold px-8 py-3 text-[11px]">
                  Explore Our Story
                </Link>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-1.5 text-sm font-bold tracking-[0.14em] uppercase text-gold-soft hover:text-lavender transition-colors"
                >
                  Shop the Range
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md aspect-[4/3] rounded-3xl overflow-hidden shadow-lift ring-1 ring-gold/20 relative">
                <Image
                  src="/our story.jpg"
                  alt="Crispo Cookies — handcrafted oat-based treats"
                  fill
                  sizes="(max-width: 1024px) 90vw, 40vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cocoa/45 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── THE COLLECTION ─── */}
      <section className="py-16 lg:py-24 bg-cocoa" aria-label="The Collection">
        <div className="container-tight">
          <div className="text-center mb-12">
            <p className="eyebrow mb-4">The Collection</p>
            <h2 className="section-heading mb-3">Crispo Cookies</h2>
            <p className="section-subheading max-w-2xl mx-auto">
              Baked fresh in small batches — every cookie and brownie is{" "}
              <span className="text-gold-soft font-semibold">100% ZERO MAIDHA</span>.
            </p>
          </div>

          {(loading || error) && (
            <>
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <h3 className="font-heading text-xl text-cream mb-2">We couldn&apos;t load the products</h3>
                  <button onClick={() => setAttempt((a) => a + 1)} className="btn-primary mt-4">
                    <RefreshCw size={16} />
                    Retry
                  </button>
                </div>
              )}
            </>
          )}

          {!loading && !error && cookieProducts.length === 0 && (
            <p className="text-center text-muted py-16">
              New treats are being baked — check back soon.
            </p>
          )}

          {!loading && !error && cookieProducts.length > 0 && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <span className="h-px flex-1 bg-gold/25" aria-hidden="true" />
                <h3 className="font-heading text-2xl sm:text-3xl font-semibold text-cream">
                  Cookies
                </h3>
                <span className="h-px flex-1 bg-gold/25" aria-hidden="true" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                {cookieProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}

          {!loading && !error && brownieProducts.length > 0 && (
            <>
              <div className="flex items-center gap-4 mb-6 mt-16">
                <span className="h-px flex-1 bg-gold/25" aria-hidden="true" />
                <h3 className="font-heading text-2xl sm:text-3xl font-semibold text-cream">
                  Brownies
                </h3>
                <span className="h-px flex-1 bg-gold/25" aria-hidden="true" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                {brownieProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}

          <div className="text-center mt-12">
            <Link href="/shop" className="crispo-btn-gold px-9 py-3.5 text-xs">
              Shop All Products
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── SHOP BY CATEGORY ─── */}
      <section className="py-16 lg:py-24 bg-espresso" aria-label="Shop by Category">
        <div className="container-tight">
          <div className="text-center mb-10">
            <p className="eyebrow mb-4">From Our Oven</p>
            <h2 className="section-heading">
              Baked fresh, straight from our oven.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                href: "/cookies",
                emoji: "🍪",
                label: "Handcrafted Cookies",
                sub: "100% ZERO MAIDHA oat-based cookies",
                cta: "Shop Cookies",
              },
              {
                href: "/brownies",
                emoji: "🍫",
                label: "Fudgy Brownies",
                sub: "Rich, wholesome oat-based brownies",
                cta: "Shop Brownies",
              },
            ].map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="group rounded-3xl overflow-hidden shadow-soft hover:shadow-lift hover:-translate-y-1 transition-all duration-300 relative bg-gradient-to-br from-chocolate via-cacao to-chocolate ring-1 ring-gold/15 hover:ring-gold/40 flex flex-col items-center justify-center text-center p-8 sm:p-10"
              >
                <span className="text-6xl select-none mb-3 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
                  {card.emoji}
                </span>
                <h3 className="font-heading text-xl font-semibold text-cream">
                  {card.label}
                </h3>
                <p className="text-muted text-sm mt-1.5 mb-5">{card.sub}</p>
                <span className="inline-flex items-center gap-2 text-sm font-bold tracking-wider uppercase text-gold-soft group-hover:text-lavender transition-colors">
                  {card.cta}
                  <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CHOOSE YOUR CRAVE ─── */}
      <section className="py-16 lg:py-24 bg-cocoa" aria-label="Choose Your Crave">
        <div className="container-tight">
          <div className="text-center mb-10">
            <p className="eyebrow mb-4">Choose Your Crave</p>
            <h2 className="section-heading mb-4">
              Five moods. One box away.
            </h2>
            <p className="section-subheading max-w-2xl mx-auto">
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
                className="bg-cacao rounded-3xl p-6 text-center border border-gold/12 shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all duration-300"
              >
                <span className="text-5xl block mb-3 select-none">
                  {mood.emoji}
                </span>
                <h3 className="font-heading text-lg font-semibold text-cream">
                  {mood.label}
                </h3>
                <span className="mt-2 block h-1 w-8 mx-auto rounded-full bg-gradient-to-r from-gold to-gold-light" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY CRISPO ─── */}
      <section className="py-16 lg:py-24 bg-espresso" aria-label="Why Crispo">
        <div className="container-tight">
          <h2 className="section-heading text-center mb-10">Why Crispo?</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {whyFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-cacao rounded-2xl p-6 text-center border border-gold/12 shadow-soft hover:shadow-lift transition-shadow duration-300"
                >
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gold/12 ring-1 ring-gold/30 flex items-center justify-center">
                    <Icon size={26} className="text-gold-soft" />
                  </div>
                  <h3 className="font-heading text-base font-semibold text-cream mb-2">
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

      {/* ─── ABOUT CRISPO ─── */}
      <section className="py-16 lg:py-24 bg-cocoa" aria-label="About Crispo">
        <div className="container-tight">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
            <div className="flex justify-center order-2 lg:order-1">
              <div className="w-full max-w-md aspect-square rounded-3xl overflow-hidden shadow-lift ring-1 ring-gold/20 relative">
                <Image
                  src="/our story.jpg"
                  alt="Crispo Cookies — about us"
                  fill
                  sizes="(max-width: 1024px) 90vw, 40vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cocoa/35 to-transparent pointer-events-none" />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <p className="eyebrow mb-4">About Crispo</p>
              <h2 className="font-heading text-4xl lg:text-section text-cream font-bold mb-5">
                Baked to Impress.{" "}
                <span className="text-gradient-gold">Baked With Purpose.</span>
              </h2>
              <p className="text-muted text-lg leading-relaxed mb-4">
                Crispo was born from a simple passion for healthy snacking.
                Based in Nellore, Andhra Pradesh, we set out to prove that
                treats made with pure oats can be every bit as delicious as
                traditional baked goods.
              </p>
              <p className="text-muted text-lg leading-relaxed mb-6">
                Every bite reflects our commitment:{" "}
                <span className="text-gold-soft font-semibold">
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
                  <li key={point} className="flex items-center gap-3 text-cream">
                    <span className="text-gold font-bold">✓</span>
                    <span className="font-medium">{point}</span>
                  </li>
                ))}
              </ul>
              <Link href="/about" className="crispo-btn-gold px-9 py-3.5 text-xs">
                Our Story
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOLLOW US ─── */}
      <section className="py-16 lg:py-24 bg-espresso" aria-label="Follow Us">
        <div className="container-tight">
          <div className="text-center mb-12">
            <p className="eyebrow mb-4">Stay Connected</p>
            <h2 className="section-heading mb-4">Follow Us</h2>
            <p className="section-subheading max-w-2xl mx-auto">
              Behind-the-scenes bakes, drool-worthy close-ups, and the latest
              Crispo drops — straight to your feed.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-cacao rounded-[2rem] p-8 sm:p-10 flex flex-col items-center text-center border border-gold/12 shadow-soft hover:shadow-lift hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-amber flex items-center justify-center mb-5 shadow-gold">
                <InstagramIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-cream mb-1">
                Instagram
              </h3>
              <p className="text-gold-soft font-semibold mb-3">@rahul.bites</p>
              <p className="text-muted text-sm">
                Daily bakes, reels, and behind-the-scenes.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-gold-soft font-semibold text-sm tracking-wider uppercase group-hover:text-lavender transition-colors">
                Follow @rahul.bites
                <ArrowRight size={15} />
              </span>
            </a>
            <a
              href={SOCIAL_LINKS.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-cacao rounded-[2rem] p-8 sm:p-10 flex flex-col items-center text-center border border-gold/12 shadow-soft hover:shadow-lift hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-lavender to-rose flex items-center justify-center mb-5 shadow-[0_16px_32px_-16px_rgba(231,169,232,0.5)]">
                <YoutubeIcon className="w-8 h-8 text-cocoa" />
              </div>
              <h3 className="font-heading text-2xl font-bold text-cream mb-1">
                YouTube
              </h3>
              <p className="text-gold-soft font-semibold mb-3">@Rahul-Bites</p>
              <p className="text-muted text-sm">
                Full baking videos and crispy content.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-gold-soft font-semibold text-sm tracking-wider uppercase group-hover:text-lavender transition-colors">
                Subscribe @Rahul-Bites
                <ArrowRight size={15} />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ─── CONTACT ─── */}
      <section className="py-16 lg:py-24 bg-cocoa" aria-label="Contact Crispo">
        <div className="container-tight">
          <div className="text-center mb-12">
            <p className="eyebrow mb-4">Get In Touch</p>
            <h2 className="section-heading mb-4">
              Let&apos;s Talk Cookies
            </h2>
            <p className="section-subheading max-w-2xl mx-auto">
              Questions, bulk orders, or custom gifts? We&apos;d love to hear
              from you.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            <a
              href="mailto:ccrispocookies@gmail.com"
              className="group bg-cacao rounded-3xl p-7 text-left border border-gold/12 shadow-soft hover:shadow-lift hover:-translate-y-1 hover:border-gold/35 transition-all duration-300"
            >
              <div className="w-12 h-12 mb-4 rounded-2xl bg-gold/12 flex items-center justify-center group-hover:bg-gold/22 ring-1 ring-gold/30 transition-colors">
                <Mail size={22} className="text-gold-soft" />
              </div>
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-lavender/70 mb-1.5">
                Email
              </p>
              <p className="font-heading text-base font-semibold text-cream break-all leading-snug">
                ccrispocookies@gmail.com
              </p>
              <p className="text-faded text-xs mt-2">Replies within a day</p>
            </a>
            <a
              href="tel:+917569831560"
              className="group bg-cacao rounded-3xl p-7 text-left border border-gold/12 shadow-soft hover:shadow-lift hover:-translate-y-1 hover:border-gold/35 transition-all duration-300"
            >
              <div className="w-12 h-12 mb-4 rounded-2xl bg-gold/12 flex items-center justify-center group-hover:bg-gold/22 ring-1 ring-gold/30 transition-colors">
                <Phone size={22} className="text-gold-soft" />
              </div>
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-lavender/70 mb-1.5">
                Phone
              </p>
              <p className="font-heading text-base font-semibold text-cream leading-snug">
                +91 75698 31560
              </p>
              <p className="text-faded text-xs mt-2">Mon–Sat, 9am–8pm IST</p>
            </a>
            <div className="group bg-cacao rounded-3xl p-7 text-left border border-gold/12 shadow-soft hover:shadow-lift hover:-translate-y-1 hover:border-gold/35 transition-all duration-300">
              <div className="w-12 h-12 mb-4 rounded-2xl bg-gold/12 flex items-center justify-center group-hover:bg-gold/22 ring-1 ring-gold/30 transition-colors">
                <MapPin size={22} className="text-gold-soft" />
              </div>
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-lavender/70 mb-1.5">
                Location
              </p>
              <p className="font-heading text-base font-semibold text-cream leading-snug">
                Nellore, Andhra Pradesh
              </p>
              <p className="text-faded text-xs mt-2">Baked fresh &amp; shipped across India</p>
            </div>
            <Link
              href="/contact"
              className="group crispo-gold-card rounded-3xl p-7 text-left shadow-soft hover:shadow-gold hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-12 h-12 mb-4 rounded-2xl bg-[#2B1803]/15 flex items-center justify-center ring-1 ring-[#2B1803]/25 group-hover:bg-[#2B1803]/25 transition-colors">
                <ArrowRight size={22} className="text-[#2B1803]" />
              </div>
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#2B1803]/75 mb-1.5">
                Bulk Orders
              </p>
              <p className="font-heading text-base font-semibold text-[#2B1803] leading-snug">
                Gifting &amp; events
              </p>
              <p className="text-[#2B1803]/65 text-xs mt-2">Send an enquiry in a minute</p>
            </Link>
          </div>
          <div className="max-w-md mx-auto mt-10">
            <Link href="/shop" className="crispo-btn-gold w-full px-8 py-3.5 text-xs">
              Order Now
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}