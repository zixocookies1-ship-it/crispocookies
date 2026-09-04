"use client";

import Link from "next/link";
import ScrollReveal from "@/components/scroll-reveal";
import { AccordionItem } from "@/components/accordion";
import { formatPrice, truncate } from "@/lib/helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sampleProducts: any[] = [
  {
    _id: "1",
    name: "Double Chocolate Cookie",
    slug: "double-chocolate-cookie",
    shortDescription: "Rich, indulgent and deeply chocolatey — made with pure oats and loaded with chocolate goodness.",
    fullDescription: "Rich, indulgent and deeply chocolatey, our Double Chocolate Cookie is made with pure oats powder and loaded with chocolate goodness.",
    ingredients: "Oats Powder, Cocoa, Chocolate Chips, Butter, Sugar, Vanilla",
    images: [],
    category: "Cookies",
    tags: ["bestseller", "zero-maida"],
    variants: [{ weight: "300g (6 cookies)", price: 219, stock: 50 }],
    isActive: true,
    createdAt: new Date(),
  },
  {
    _id: "4",
    name: "Dry Seeds Cookie",
    slug: "dry-seeds-cookie",
    shortDescription: "Loaded with 4 super seeds — crunchy, nutritious and satisfying.",
    fullDescription: "A nutrient-rich cookie loaded with four powerful seeds. Packed with 10g protein per cookie.",
    ingredients: "Oats Powder, Pumpkin Seeds, Flax Seeds, Sunflower Seeds, Watermelon Seeds",
    images: [],
    category: "Cookies",
    tags: ["bestseller", "zero-maida", "high-protein"],
    variants: [{ weight: "300g (4 cookies)", price: 219, stock: 30 }],
    isActive: true,
    createdAt: new Date(),
  },
  {
    _id: "7",
    name: "Kaju Oats Brownie",
    slug: "kaju-oats-brownie",
    shortDescription: "Rich fudgy brownie combined with premium cashews and wholesome oats.",
    fullDescription: "A rich and fudgy chocolate brownie combined with premium cashews and wholesome oats.",
    ingredients: "Oats Powder, Cocoa, Premium Cashews, Butter, Sugar, Eggs",
    images: [],
    category: "Brownies",
    tags: ["bestseller", "zero-maida"],
    variants: [{ weight: "300g (6 pieces)", price: 250, stock: 30 }],
    isActive: true,
    createdAt: new Date(),
  },
  {
    _id: "2",
    name: "Rose Cookie",
    slug: "rose-cookie",
    shortDescription: "A delicate floral twist — made with homemade rose syrup and fresh rose petals.",
    fullDescription: "A delicate floral twist on a wholesome cookie made with homemade rose syrup and fresh rose petals.",
    ingredients: "Oats Powder, Homemade Rose Syrup, Fresh Rose Petals, Butter, Sugar",
    images: [],
    category: "Cookies",
    tags: ["zero-maida"],
    variants: [{ weight: "300g (6 cookies)", price: 219, stock: 40 }],
    isActive: true,
    createdAt: new Date(),
  },
];

const collections = [
  {
    title: "Oat Cookies",
    emoji: "🍪",
    gradient: "from-gold/20 to-cream",
    description: "Premium oat-based cookies — 100% ZERO MAIDHA",
    href: "/shop?category=Cookies",
  },
  {
    title: "Brownies",
    emoji: "🍫",
    gradient: "from-brown to-navy",
    description: "Fudgy oats brownies with rich chocolate flavor",
    href: "/shop?category=Brownies",
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
                  100% ZERO MAIDHA • PREMIUM OATS • HANDCRAFTED
                </p>
                <h1 className="font-heading text-5xl lg:text-display text-navy font-bold leading-[1.05]">
                  Baked to Impress.<br />Baked With Purpose.
                </h1>
                <p className="text-muted text-lg leading-relaxed max-w-md">
                  Premium oat-based cookies and brownies, handcrafted in Nellore. 100% pure oats, no maida, no preservatives.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link href="/shop" className="btn-gold">
                    Shop Cookies
                  </Link>
                  <Link href="/about" className="btn-navy-outline">
                    Our Story
                  </Link>
                </div>
                <div className="flex items-center gap-3 pt-2 text-sm text-muted">
                  <span>100% Pure Oats</span>
                  <span className="text-gold">•</span>
                  <span>Zero Maida</span>
                  <span className="text-gold">•</span>
                  <span>No Preservatives</span>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={200}>
              <div className="relative flex justify-center">
                <div className="w-full max-w-md aspect-square rounded-3xl bg-gradient-to-br from-gold/15 via-cream to-navy/5 flex items-center justify-center">
                  <span className="text-[140px] animate-float select-none">🍪</span>
                </div>
                <div className="absolute top-8 right-8 bg-surface shadow-warm-lg rounded-2xl px-4 py-3">
                  <span className="text-sm font-semibold text-navy">🌾 100% Pure Oats</span>
                </div>
                <div className="absolute bottom-12 left-4 bg-surface shadow-warm-lg rounded-2xl px-4 py-3">
                  <span className="text-sm font-semibold text-navy">🚫 Zero Maida</span>
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
              { number: "100%", label: "Zero Maida" },
              { number: "100%", label: "Pure Oats" },
              { number: "No", label: "Preservatives" },
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
      <section className="container-tight py-6" aria-label="Shop by collection">
        <ScrollReveal>
          <div className="mb-4">
            <h2 className="section-heading text-2xl mb-1">Explore Our Cookies</h2>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {collections.map((col, i) => (
            <ScrollReveal key={col.title} delay={i * 100}>
              <Link
                href={col.href}
                className="group flex items-center gap-4 bg-surface rounded-2xl shadow-warm overflow-hidden cursor-pointer hover:shadow-warm-lg transition-shadow"
                aria-label={`Shop ${col.title}`}
              >
                <div className={`w-20 h-20 shrink-0 bg-gradient-to-br ${col.gradient} flex items-center justify-center`}>
                  <span className="text-3xl select-none">{col.emoji}</span>
                </div>
                <div className="py-3 pr-4">
                  <h3 className="font-heading text-base font-semibold text-navy mb-0.5">{col.title}</h3>
                  <p className="text-muted text-xs">{col.description}</p>
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
