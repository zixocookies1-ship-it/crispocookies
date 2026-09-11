"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Truck, Package, Shield, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchProductBySlug,
  fetchProducts,
  StoreProduct,
  formatINR,
  discountOf,
} from "@/lib/storefront";
import { useCartStore } from "@/store/useCartStore";
import { getActivePromotion, unitPriceWithDiscount } from "@/lib/promotion";
import { ActivePromotion } from "@/lib/pricing-math";
import { toast } from "sonner";
import ProductCard from "@/components/product-card";
import BenefitsSection from "@/components/benefits-section";

const highlightLabel: Record<string, string> = {
  "zero-maida": "100% ZERO MAIDHA",
  bestseller: "Bestseller",
  "high-protein": "High Protein",
  variety: "Variety Box",
  eggless: "Eggless",
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const slug = (params?.slug as string) || "";

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [related, setRelated] = useState<StoreProduct[]>([]);

  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"description" | "ingredients">("description");
  const [imgFailed, setImgFailed] = useState(false);
  const [promotion, setPromotion] = useState<ActivePromotion | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(false);
    setProduct(null);
    setActiveImage(0);
    setSelectedVariant(0);
    setQuantity(1);
    setImgFailed(false);

    (async () => {
      try {
        const data = await fetchProductBySlug(slug);
        if (cancelled) return;
        setProduct(data);
        const all = await fetchProducts();
        if (!cancelled) {
          setRelated(
            all.filter((p) => p.id !== data.id && p.category?.slug === data.category?.slug).slice(0, 4)
          );
        }
      } catch (e) {
        if (cancelled) return;
        if ((e as { notFound?: boolean }).notFound) setNotFound(true);
        else setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, attempt]);

  if (loading) {
    return (
      <div className="bg-cocoa min-h-screen">
        <div className="container-tight py-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="aspect-square rounded-3xl bg-chocolate animate-pulse" />
          <div className="space-y-4">
            <div className="h-4 w-24 bg-chocolate rounded-full animate-pulse" />
            <div className="h-8 w-3/4 bg-chocolate rounded animate-pulse" />
            <div className="h-5 w-full bg-chocolate rounded animate-pulse" />
            <div className="h-5 w-2/3 bg-chocolate rounded animate-pulse" />
            <div className="h-12 w-full bg-chocolate rounded-full animate-pulse mt-8" />
            <div className="h-12 w-full bg-chocolate rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="bg-cocoa min-h-screen flex items-center justify-center">
        <div className="text-center px-6 py-20">
          <div className="text-6xl mb-4">🍪</div>
          <h1 className="font-heading text-3xl font-bold text-cream mb-2">Product unavailable</h1>
          <p className="text-muted mb-8">This product may be out of stock or no longer available.</p>
          <Link href="/shop" className="crispo-btn-gold px-8 py-3.5 text-sm">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-cocoa min-h-screen flex items-center justify-center">
        <div className="text-center px-6 py-20">
          <h1 className="font-heading text-2xl font-bold text-cream mb-2">Something went wrong</h1>
          <p className="text-muted mb-8">We couldn&apos;t load this product.</p>
          <button onClick={() => setAttempt((a) => a + 1)} className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gold-soft/60 text-gold-soft font-semibold px-6 py-3 text-sm transition-colors hover:bg-gold/10">
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const images = product.images;
  const variant = product.variants[selectedVariant] || product.variants[0];
  const discount = variant ? discountOf(variant) : 0;
  const stock = variant?.stock ?? 0;
  const outOfStock = stock <= 0;
  const lowStock = stock > 0 && stock <= 10;

  const promoPricing = variant ? unitPriceWithDiscount(variant.price, promotion) : null;
  const promoActive = !!promotion && !!promoPricing && promoPricing.discount > 0;

  const highlights = product.tags
    .map((t) => highlightLabel[t])
    .filter(Boolean) as string[];

  const tags = highlights.filter(
    (t, i) => highlights.indexOf(t) === i
  );

  const handleAddToCart = () => {
    if (!variant || outOfStock) {
      toast.error("This product is currently out of stock");
      return;
    }
    for (let i = 0; i < quantity; i++) {
      addItem({
        productId: product.id,
        name: product.name,
        variant: { weight: variant.weight, price: variant.price },
        image: images[0] || product.emoji,
      });
    }
    toast.success(`${quantity} × ${product.name} added to cart`);
  };

  const handleBuyNow = () => {
    if (!variant || outOfStock) {
      toast.error("This product is currently out of stock");
      return;
    }
    for (let i = 0; i < quantity; i++) {
      addItem({
        productId: product.id,
        name: product.name,
        variant: { weight: variant.weight, price: variant.price },
        image: images[0] || product.emoji,
      });
    }
    router.push("/checkout");
  };

  const selectVariant = (i: number) => {
    setSelectedVariant(i);
    setQuantity(1);
  };

  const hasIngredients = product.ingredients.length > 0;

  return (
    <div className="bg-cocoa min-h-screen">
      <div className="container-tight pt-4">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
          <Link href="/" className="hover:text-lavender transition-colors">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-lavender transition-colors">Shop</Link>
          <span>/</span>
          <span className="text-cream font-medium truncate max-w-[45vw]">{product.name}</span>
        </nav>
      </div>

      <div className="container-tight py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
          {/* Gallery */}
          <div>
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-chocolate via-cacao to-chocolate border border-gold/12 shadow-soft">
              {images.length > 0 && !imgFailed ? (
                <Image
                  src={images[activeImage % images.length]}
                  alt={product.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain p-4 sm:p-8"
                  priority
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <span
                  className="absolute inset-0 flex items-center justify-center text-[96px] sm:text-[120px] select-none"
                  role="img"
                  aria-label={product.name}
                >
                  {product.emoji}
                </span>
              )}

              <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
                {product.badge && (
                  <span className="bg-gold/90 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    {product.badge}
                  </span>
                )}
                {promoActive ? (
                  <span className="bg-[#E11D48] text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full">
                    {promotion!.discountValue}% OFF
                  </span>
                ) : (
                  discount > 0 && (
                    <span className="discount-chip px-2.5 py-1">{discount}% OFF</span>
                  )
                )}
              </div>

              </div>

            {images.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {images.map((img, i) => (
                  <button
                    key={img + i}
                    onClick={() => {
                      setActiveImage(i);
                      setImgFailed(false);
                    }}
                    aria-label={`View image ${i + 1}`}
                    className={cn(
                      "relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-chocolate border-2 transition-all shrink-0",
                      activeImage === i ? "border-gold ring-2 ring-gold" : "border-transparent opacity-80 hover:opacity-100"
                    )}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} thumbnail ${i + 1}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0">
            {product.category?.name && (
              <span className="text-gold text-xs font-bold uppercase tracking-widest block mb-2">
                {product.category.name}
              </span>
            )}

            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-cream leading-tight mb-3">
              {product.name}
            </h1>

            {product.shortDescription && (
              <p className="text-muted leading-relaxed mb-4">{product.shortDescription}</p>
            )}

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {tags.map((t) => (
                  <span key={t} className="highlight-chip">
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="font-heading text-4xl font-bold text-gold-soft">
                {promoActive
                  ? formatINR(promoPricing!.final)
                  : formatINR(variant?.price ?? 0)}
              </span>
              {promoActive ? (
                <>
                  <span className="text-faded text-lg line-through">
                    {formatINR(promoPricing!.original)}
                  </span>
                  <span className="bg-[#E11D48] text-white text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    {promotion!.discountValue}% OFF
                  </span>
                </>
              ) : (
                variant?.mrp &&
                variant.mrp > variant.price && (
                  <>
                    <span className="text-faded text-lg line-through">
                      {formatINR(variant.mrp)}
                    </span>
                    {discount > 0 && (
                      <span className="discount-chip px-2.5 py-1">{discount}% OFF</span>
                    )}
                  </>
                )
              )}
            </div>

            {promoActive && (
              <div className="flex items-center gap-2 mb-6 bg-red/10 border border-red/25 rounded-xl px-4 py-2.5 text-sm text-red font-semibold w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-red animate-pulse" aria-hidden="true" />
                Launch Offer — {promotion!.discountValue}% OFF applied at checkout
              </div>
            )}

            {product.variants.length > 1 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-cream mb-3">Select Weight</p>
                <div className="flex flex-wrap gap-2.5">
                  {product.variants.map((v, i) => {
                    const selected = i === selectedVariant;
                    const soldOut = v.stock <= 0;
                    return (
                      <button
                        key={v.weight}
                        onClick={() => selectVariant(i)}
                        disabled={false}
                        aria-pressed={selected}
                        className={cn(
                          "px-5 py-2.5 rounded-full text-sm font-semibold border-2 transition-all",
                          selected
                            ? "bg-gold border-gold text-[#2B1803]"
                            : soldOut
                              ? "border-gold/15 text-faded line-through opacity-60"
                              : "border-gold/30 text-cream hover:border-gold-soft"
                        )}
                      >
                        {v.weight}
                        {soldOut && <span className="ml-1 normal-case text-[10px] no-underline">· Sold out</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-6 flex items-center gap-5">
              <div>
                <p className="text-sm font-semibold text-cream mb-2.5">Quantity</p>
                <div className="flex items-center gap-3 w-fit bg-chocolate border border-gold/20 rounded-full px-3 py-1.5">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gold-soft hover:bg-gold/10 transition-colors disabled:opacity-30"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center font-bold text-lg text-cream tabular-nums">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                    disabled={outOfStock || quantity >= stock}
                    aria-label="Increase quantity"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gold-soft hover:bg-gold/10 transition-colors disabled:opacity-30"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <p className={cn("text-sm font-medium mt-3", outOfStock ? "text-red" : lowStock ? "text-amber" : "text-green")}>
                  {outOfStock
                    ? "Out of Stock"
                    : lowStock
                      ? `Only ${stock} left in stock`
                      : "In Stock"}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <button
                onClick={handleAddToCart}
                disabled={outOfStock}
                className="crispo-btn-gold w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {outOfStock ? "Out of Stock" : "Add to Cart"}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={outOfStock}
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gold-soft/60 text-gold-soft font-semibold px-6 py-4 text-sm transition-colors hover:bg-gold/10 w-full disabled:opacity-40"
              >
                Buy It Now
              </button>
            </div>

            <div className="space-y-3 rounded-2xl bg-chocolate border border-gold/12 p-5">
              <div className="flex items-center gap-3 text-muted text-sm">
                <Truck className="w-4 h-4 text-gold-soft shrink-0" />
                <span>Flat delivery charge of ₹100 on every order</span>
              </div>
              <div className="flex items-center gap-3 text-muted text-sm">
                <Package className="w-4 h-4 text-gold-soft shrink-0" />
                <span>Baked fresh &amp; delivered in 2–3 days</span>
              </div>
              <div className="flex items-center gap-3 text-muted text-sm">
                <Shield className="w-4 h-4 text-gold-soft shrink-0" />
                <span>100% ZERO MAIDHA · Pure oats, no preservatives</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BenefitsSection />

      {/* Description / Ingredients */}
      <section className="container-tight py-10">
        <div className="max-w-3xl">
          <div className="flex gap-8 border-b border-gold/12">
            {product.fullDescription && (
              <button
                onClick={() => setActiveTab("description")}
                className={cn(
                  "pb-3 text-sm font-bold transition-all capitalize",
                  activeTab === "description"
                    ? "text-gold-soft border-b-2 border-gold-soft"
                    : "text-muted hover:text-lavender"
                )}
              >
                Description
              </button>
            )}
            {hasIngredients && (
              <button
                onClick={() => setActiveTab("ingredients")}
                className={cn(
                  "pb-3 text-sm font-bold transition-all capitalize",
                  activeTab === "ingredients" && hasIngredients
                    ? "text-gold-soft border-b-2 border-gold-soft"
                    : "text-muted hover:text-lavender"
                )}
              >
                Ingredients
              </button>
            )}
          </div>

          <div className="bg-chocolate rounded-2xl border border-gold/12 p-5 sm:p-8 mt-5">
            {activeTab === "description" && product.fullDescription ? (
              <p className="text-muted leading-relaxed whitespace-pre-line">
                {product.fullDescription}
              </p>
            ) : hasIngredients ? (
              <div className="flex flex-wrap gap-2.5">
                {product.ingredients.map((ing) => (
                  <span key={ing} className="bg-cacao border border-gold/15 px-4 py-2 rounded-full text-sm text-cream font-medium">
                    {ing}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="container-tight py-12 pb-24">
          <h2 className="font-heading text-2xl font-bold text-cream mb-8">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}