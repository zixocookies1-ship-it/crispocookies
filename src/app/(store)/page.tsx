"use client";

import Link from "next/link";
import ScrollReveal from "@/components/scroll-reveal";
import { AccordionItem } from "@/components/accordion";
import { formatPrice, truncate } from "@/lib/helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sampleProducts: any[] = [
  {
    _id: "1",
    name: "Classic Chocolate Chip",
    slug: "classic-chocolate-chip",
    shortDescription: "Rich buttery dough loaded with premium chocolate chips.",
    fullDescription: "Our signature chocolate chip cookie made with real butter and premium Belgian chocolate chips.",
    ingredients: "Wheat flour, Butter, Chocolate chips, Sugar, Eggs, Vanilla, Baking soda, Salt",
    images: [],
    category: "1",
    tags: ["bestseller", "bestseller"],
    variants: [
      { weight: "250g", price: 299, stock: 20 },
      { weight: "500g", price: 549, stock: 15 },
    ],
    isActive: true,
    createdAt: new Date(),
  },
  {
    _id: "2",
    name: "Double Chocolate Fudge",
    slug: "double-chocolate-fudge",
    shortDescription: "Intensely chocolatey cookies with cocoa dough and chocolate chunks.",
    fullDescription: "For serious chocolate lovers — a triple-layer chocolate experience.",
    ingredients: "Wheat flour, Cocoa powder, Dark chocolate, Butter, Sugar, Eggs, Vanilla, Baking soda",
    images: [],
    category: "1",
    tags: ["bestseller"],
    variants: [
      { weight: "250g", price: 349, stock: 22 },
      { weight: "500g", price: 629, stock: 14 },
    ],
    isActive: true,
    createdAt: new Date(),
  },
  {
    _id: "3",
    name: "Butter Crunch Cookies",
    slug: "butter-crunch-cookies",
    shortDescription: "Crispy, golden butter cookies that melt in your mouth.",
    fullDescription: "Traditional butter cookies with a delightful crunch and rich flavor.",
    ingredients: "Wheat flour, Butter, Sugar, Milk, Vanilla, Baking powder, Salt",
    images: [],
    category: "2",
    tags: ["bestseller"],
    variants: [
      { weight: "200g", price: 249, stock: 25 },
      { weight: "400g", price: 469, stock: 18 },
    ],
    isActive: true,
    createdAt: new Date(),
  },
  {
    _id: "4",
    name: "Oatmeal Raisin Delight",
    slug: "oatmeal-raisin-delight",
    shortDescription: "Wholesome oatmeal cookies with plump raisins and a hint of cinnamon.",
    fullDescription: "A healthy and delicious option packed with rolled oats and natural raisins.",
    ingredients: "Rolled oats, Wheat flour, Raisins, Butter, Brown sugar, Cinnamon, Eggs, Honey",
    images: [],
    category: "3",
    tags: [],
    variants: [
      { weight: "250g", price: 329, stock: 12 },
      { weight: "500g", price: 599, stock: 10 },
    ],
    isActive: true,
    createdAt: new Date(),
  },
];

const collections = [
  {
    title: "Chocolate Collection",
    emoji: "🍫",
    description: "Rich, indulgent, chocolatey",
    gradient: "from-brown to-navy",
    href: "/shop?category=Chocolate",
  },
  {
    title: "Butter Collection",
    emoji: "🧈",
    description: "Classic, buttery, melt-in-mouth",
    gradient: "from-gold/30 to-cream",
    href: "/shop?category=Butter",
  },
  {
    title: "Healthy & Oatmeal",
    emoji: "🌾",
    description: "Wholesome, guilt-free, delicious",
    gradient: "from-green/20 to-cream",
    href: "/shop?category=Oatmeal",
  },
  {
    title: "Gift Boxes",
    emoji: "🎁",
    description: "Perfect for every occasion",
    gradient: "from-gold to-navy",
    href: "/shop?category=Gift+Boxes",
  },
];

const ingredients = [
  { emoji: "🍫", title: "Premium Belgian Chocolate", description: "Rich, velvety chocolate sourced from Belgium" },
  { emoji: "🧈", title: "Real Butter", description: "No margarine, no shortcuts — just pure butter" },
  { emoji: "🌿", title: "Natural Ingredients", description: "No preservatives, no artificial flavours" },
  { emoji: "🥛", title: "Freshly Sourced", description: "Locally sourced dairy and farm-fresh eggs" },
];

const moods = [
  { title: "Chocolate Lover", emoji: "🍫", gradient: "from-brown to-navy-dark", href: "/shop?category=Chocolate" },
  { title: "Tea Time", emoji: "☕", gradient: "from-gold/20 to-cream", href: "/shop?category=Butter" },
  { title: "Gifting", emoji: "🎁", gradient: "from-gold to-navy", href: "/shop?category=Gift+Boxes" },
  { title: "Feel-Good", emoji: "😊", gradient: "from-amber/20 to-cream", href: "/shop?category=Oatmeal" },
];

const steps = [
  { number: "01", title: "Premium Ingredients", description: "Sourced from the finest suppliers" },
  { number: "02", title: "Freshly Prepared", description: "Mixed and shaped by hand" },
  { number: "03", title: "Baked Daily", description: "Fresh from the oven every morning" },
  { number: "04", title: "Carefully Packed", description: "Eco-friendly, food-safe packaging" },
  { number: "05", title: "Delivered To You", description: "Fast delivery, always fresh" },
];

const testimonials = [
  {
    name: "Priya M.",
    location: "Mumbai",
    quote: "The best cookies I've ever ordered. The chocolate chip is absolute perfection!",
  },
  {
    name: "Rahul S.",
    location: "Delhi",
    quote: "Ordered the gift box for my wife's birthday. She loved it!",
  },
  {
    name: "Anita K.",
    location: "Bangalore",
    quote: "Gluten-free and still delicious? Crispo nailed it.",
  },
];

const faqs = [
  {
    question: "How long do cookies stay fresh?",
    answer: "Our cookies stay fresh for up to 15 days at room temperature in an airtight container. For longer storage, refrigerate for up to 30 days.",
  },
  {
    question: "How are cookies packaged?",
    answer: "Each cookie is carefully packed in eco-friendly, food-safe packaging to ensure they arrive in perfect condition.",
  },
  {
    question: "Do you offer COD?",
    answer: "Currently, we accept online payments via Razorpay for a secure and seamless checkout experience.",
  },
  {
    question: "How long does delivery take?",
    answer: "Standard delivery takes 2–3 business days. We ship fresh cookies within 24 hours of your order.",
  },
  {
    question: "Do you offer bulk orders?",
    answer: "Yes! We offer special pricing for bulk orders. Contact us for corporate gifting and event orders.",
  },
  {
    question: "Do you offer corporate gifting?",
    answer: "Absolutely! We have curated gift boxes perfect for corporate events, festivals, and team celebrations.",
  },
];

export default function StoreHomePage() {


  const handleAddToCart = (product: (typeof sampleProducts)[number]) => {
    // Cart integration would go here
    console.log("Add to cart:", product.name);
  };

  return (
    <>
      {/* SECTION 1: HERO */}
      <section className="bg-cream" aria-label="Hero">
        <div className="container-wide py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 lg:gap-16 items-center">
            <ScrollReveal direction="left">
              <div className="space-y-6">
                <p className="text-gold text-xs font-semibold tracking-[0.2em] uppercase">
                  Fresh • Handcrafted • Delicious
                </p>
                <h1 className="font-heading text-5xl lg:text-display text-navy font-bold leading-[1.05]">
                  Cookies Worth Coming Back For.
                </h1>
                <p className="text-muted text-lg leading-relaxed max-w-md">
                  Freshly baked cookies made with premium ingredients, generous chocolate and a whole lot of love.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link href="/shop" className="btn-gold">
                    Shop Cookies
                  </Link>
                  <Link href="/shop" className="btn-navy-outline">
                    Explore Collection
                  </Link>
                </div>
                <div className="flex items-center gap-3 pt-2 text-sm text-muted">
                  <span>10,000+ Happy Customers</span>
                  <span className="text-gold">•</span>
                  <span>4.9/5 Rating</span>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={200}>
              <div className="relative flex justify-center">
                <div className="w-full max-w-md aspect-square rounded-3xl bg-gradient-to-br from-gold/15 via-cream to-navy/5 flex items-center justify-center">
                  <span className="text-[140px] animate-float select-none">🍪</span>
                </div>
                <div className="absolute top-8 right-8 bg-surface shadow-warm-lg rounded-2xl px-4 py-3">
                  <span className="text-sm font-semibold text-navy">✨ Baked Fresh Daily</span>
                </div>
                <div className="absolute bottom-12 left-4 bg-surface shadow-warm-lg rounded-2xl px-4 py-3">
                  <span className="text-sm font-semibold text-navy">⭐ 4.9/5 Customer Rating</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* SECTION 2: TRUST STATISTICS */}
      <section className="bg-navy-dark py-8" aria-label="Trust statistics">
        <div className="container-tight">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "10,000+", label: "Happy Customers" },
              { number: "100%", label: "Freshly Baked" },
              { number: "4.9/5", label: "Customer Rating" },
              { number: "2–3 Days", label: "Fast Delivery" },
            ].map((stat, i) => (
              <ScrollReveal key={stat.label} delay={i * 80}>
                <div className="text-center">
                  <p className="font-heading text-3xl text-gold font-bold">{stat.number}</p>
                  <p className="text-cream/60 text-sm uppercase tracking-wider mt-1">{stat.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: SHOP BY COLLECTION */}
      <section className="container-tight py-20" aria-label="Shop by collection">
        <ScrollReveal>
          <div className="mb-10">
            <h2 className="section-heading mb-3">Explore Our Cookies</h2>
            <p className="section-subheading">
              Discover our handcrafted collections, each made with love and the finest ingredients.
            </p>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {collections.map((col, i) => (
            <ScrollReveal key={col.title} delay={i * 100}>
              <Link
                href={col.href}
                className="group block rounded-3xl overflow-hidden relative cursor-pointer"
                aria-label={`Shop ${col.title}`}
              >
                <div className={`aspect-[3/4] bg-gradient-to-br ${col.gradient} flex items-center justify-center transition-transform duration-500 group-hover:scale-105`}>
                  <span className="text-8xl select-none">{col.emoji}</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="font-heading text-2xl text-white font-bold mb-1">{col.title}</h3>
                  <p className="text-cream/80 text-sm mb-2">{col.description}</p>
                  <span className="text-gold text-sm font-semibold">Shop Now →</span>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* SECTION 4: BEST SELLERS */}
      <section className="bg-cream-dark py-20" aria-label="Best sellers">
        <div className="container-tight">
          <ScrollReveal>
            <div className="mb-10 text-center">
              <h2 className="section-heading mb-3">Our Best Sellers</h2>
              <p className="section-subheading mx-auto">The cookies everyone&apos;s talking about.</p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sampleProducts.map((product, i) => (
              <ScrollReveal key={product._id} delay={i * 100}>
                <div className="bg-surface rounded-2xl shadow-warm overflow-hidden flex flex-col">
                  <div className="relative bg-gradient-to-br from-gold/10 via-cream to-navy/5 aspect-[4/3] flex items-center justify-center">
                    <span className="text-7xl select-none">🍪</span>
                    {product.tags.includes("bestseller") && (
                      <span className="absolute top-3 left-3 bg-gold text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Bestseller
                      </span>
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {product.tags.map((tag: string) => (
                        <span key={tag} className="badge-gold text-[10px] capitalize">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="font-heading font-semibold text-navy text-lg mb-1">{product.name}</h3>
                    <p className="text-muted text-sm mb-3 flex-1">{truncate(product.shortDescription, 60)}</p>
                    <p className="text-gold font-bold text-lg mb-3">
                      {formatPrice(product.variants[0].price)}
                    </p>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="btn-gold btn-sm w-full"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal>
            <div className="mt-10 text-center">
              <Link href="/shop" className="btn-navy-outline">
                View All Products
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* SECTION 5: INGREDIENT STORY */}
      <section className="container-tight py-20" aria-label="Our ingredients">
        <ScrollReveal>
          <div className="mb-10">
            <h2 className="section-heading mb-3">Made With Ingredients You Can Trust</h2>
            <p className="section-subheading">
              We source only the finest ingredients to ensure every bite is pure perfection.
            </p>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {ingredients.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 100}>
              <div className="bg-surface rounded-2xl p-6 text-center shadow-warm">
                <span className="text-5xl block mb-3">{item.emoji}</span>
                <h3 className="font-heading font-semibold text-navy mb-1">{item.title}</h3>
                <p className="text-muted text-sm">{item.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* SECTION 6: COOKIE CLOSE-UP STORY */}
      <section className="container-tight py-20" aria-label="The Crispo difference">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <ScrollReveal direction="left">
            <div className="rounded-3xl overflow-hidden aspect-square bg-gradient-to-br from-gold/10 to-navy/5 flex items-center justify-center">
              <span className="text-[120px] select-none">🍪</span>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="right">
            <div>
              <p className="text-gold text-xs font-semibold tracking-[0.2em] uppercase mb-4">
                The Crispo Difference
              </p>
              <h2 className="font-heading text-4xl text-navy font-bold mb-4">
                One Bite. You&apos;ll Know the Difference.
              </h2>
              <p className="text-muted text-lg leading-relaxed mb-6">
                Crispy on the outside. Soft in the center. Loaded with premium chocolate.
                Every cookie is a little moment of happiness.
              </p>
              <ul className="space-y-3 mb-8">
                {["Premium Belgian Chocolate", "Real Butter, No Shortcuts", "Baked Fresh Every Morning"].map(
                  (point) => (
                    <li key={point} className="flex items-center gap-3 text-navy">
                      <span className="text-gold text-lg">✓</span>
                      <span className="font-medium">{point}</span>
                    </li>
                  )
                )}
              </ul>
              <Link href="/shop" className="btn-gold">
                Discover Our Cookies
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* SECTION 7: COOKIE MOODS */}
      <section className="container-tight py-20" aria-label="Cookie moods">
        <ScrollReveal>
          <div className="mb-10 text-center">
            <h2 className="section-heading mb-3">What&apos;s Your Cookie Mood?</h2>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {moods.map((mood, i) => (
            <ScrollReveal key={mood.title} delay={i * 80}>
              <Link
                href={mood.href}
                className="group block aspect-square rounded-2xl overflow-hidden relative cursor-pointer"
                aria-label={`${mood.title} cookies`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${mood.gradient} transition-transform duration-500 group-hover:scale-110`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl mb-3 select-none">{mood.emoji}</span>
                  <span className="font-heading text-lg font-semibold text-navy">{mood.title}</span>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* SECTION 8: BAKING PROCESS */}
      <section className="bg-navy-dark py-20" aria-label="Our baking process">
        <div className="container-tight">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="font-heading text-section text-white mb-3">From Our Kitchen To Your Door</h2>
              <p className="text-cream/60">Every step is crafted with care</p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 md:gap-4">
            {steps.map((step, i) => (
              <ScrollReveal key={step.number} delay={i * 100}>
                <div className="text-center">
                  <p className="font-heading text-4xl text-gold/30 font-bold">{step.number}</p>
                  <p className="text-white font-semibold text-sm mt-2">{step.title}</p>
                  <p className="text-cream/50 text-xs mt-1">{step.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 9: GIFT BOX SECTION */}
      <section className="container-tight py-20" aria-label="Gift boxes">
        <div className="grid grid-cols-1 md:grid-cols-[55%_45%] gap-12 items-center">
          <ScrollReveal direction="left">
            <div className="bg-gradient-to-br from-gold to-navy rounded-3xl p-10 flex flex-col justify-center">
              <h2 className="font-heading text-4xl text-white font-bold mb-3">
                Make Someone&apos;s Day Sweeter.
              </h2>
              <p className="text-cream/80 mb-6">
                Beautifully packaged gift boxes filled with handcrafted cookies. The perfect surprise for every occasion.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/shop?category=Gift+Boxes"
                  className="border-2 border-white text-white hover:bg-white hover:text-navy font-semibold px-8 py-3.5 rounded-full transition-all duration-300 text-sm tracking-wide uppercase"
                >
                  Shop Gift Boxes
                </Link>
                <span className="text-cream/80 hover:text-white cursor-pointer transition-colors text-sm font-semibold">
                  Corporate Orders
                </span>
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="right">
            <div className="rounded-3xl aspect-[4/5] bg-gradient-to-br from-gold/20 to-cream flex items-center justify-center">
              <span className="text-[120px] select-none">🎁</span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* SECTION 10: BUILD YOUR BOX */}
      <section className="container-tight py-20" aria-label="Build your box">
        <ScrollReveal>
          <div className="mb-10 text-center">
            <h2 className="section-heading mb-3">Create Your Perfect Cookie Box</h2>
            <p className="section-subheading mx-auto">Mix and match your favourites. Coming soon.</p>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={100}>
          <div className="bg-surface rounded-3xl shadow-warm p-12 text-center">
            <span className="text-7xl block mb-4 select-none">🍪</span>
            <span className="badge-gold mb-4 inline-flex">Coming Soon</span>
            <p className="text-muted text-sm max-w-sm mx-auto">
              Build your own custom cookie box by mixing and matching your favourite flavours.
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* SECTION 11: TESTIMONIALS */}
      <section className="bg-cream-dark py-20" aria-label="Customer testimonials">
        <div className="container-tight">
          <ScrollReveal>
            <div className="mb-10 text-center">
              <h2 className="section-heading mb-3">Loved By Cookie Lovers</h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 100}>
                <div className="bg-surface rounded-2xl p-8 shadow-warm h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-gold text-lg">★</span>
                    ))}
                  </div>
                  <p className="font-heading text-lg italic text-navy mb-4 flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div>
                    <p className="text-gold font-semibold">{t.name}</p>
                    <span className="inline-flex items-center text-xs text-green font-medium mt-1">
                      ✓ Verified Customer
                    </span>
                    <p className="text-muted text-sm mt-1">{t.location}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 12: FAQ */}
      <section className="container-tight py-20" aria-label="Frequently asked questions">
        <div className="grid grid-cols-1 md:grid-cols-[40%_60%] gap-12">
          <ScrollReveal direction="left">
            <div className="md:sticky md:top-24 self-start">
              <h2 className="section-heading mb-3">Frequently Asked Questions</h2>
              <p className="text-muted text-lg">
                Everything you need to know about our cookies.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="right">
            <div>
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.question}
                  question={faq.question}
                  answer={faq.answer}
                />
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
