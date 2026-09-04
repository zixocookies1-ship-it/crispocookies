"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  Star,
  Minus,
  Plus,
  Truck,
  Package,
} from "lucide-react";
import ProductCard from "@/components/product-card";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/helpers";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore } from "@/store/useWishlistStore";

/* eslint-disable @typescript-eslint/no-explicit-any */
const sampleProduct: any = {
  _id: "1",
  name: "Classic Butter Cookie",
  slug: "classic-butter",
  shortDescription: "Rich, buttery perfection that melts in your mouth.",
  fullDescription:
    "Our Classic Butter Cookie is crafted with the finest European-style butter, organic flour, and a touch of Madagascar vanilla. Each cookie is baked in small batches to ensure consistent quality and that signature melt-in-your-mouth texture that has made this our bestseller for over three years. Perfect with your morning chai or as an afternoon treat.",
  ingredients: [
    "European-style Butter",
    "Organic Flour",
    "Madagascar Vanilla",
    "Cane Sugar",
    "Sea Salt",
  ],
  images: [],
  category: "Signature",
  tags: ["bestseller"],
  variants: [
    { weight: "200g", price: 349, stock: 45 },
    { weight: "250g", price: 399, stock: 30 },
    { weight: "500g", price: 699, stock: 15 },
  ],
  isActive: true,
  createdAt: "",
};

const relatedProducts: any[] = [
  { _id: "5", name: "Salted Caramel Crunch", slug: "salted-caramel", shortDescription: "Sweet caramel meets the perfect pinch of sea salt.", fullDescription: "", ingredients: [], images: [], category: "Signature", tags: ["bestseller"], variants: [{ weight: "250g", price: 479, stock: 25 }], isActive: true, createdAt: "" },
  { _id: "3", name: "Eggless Vanilla Biscuit", slug: "eggless-vanilla", shortDescription: "Delicate vanilla biscuits, completely egg-free.", fullDescription: "", ingredients: [], images: [], category: "Eggless", tags: ["eggless"], variants: [{ weight: "200g", price: 349, stock: 60 }], isActive: true, createdAt: "" },
  { _id: "6", name: "Almond Biscotti", slug: "almond-biscotti", shortDescription: "Crunchy, nutty biscotti for dipping and savoring.", fullDescription: "", ingredients: [], images: [], category: "Nuts", tags: [], variants: [{ weight: "200g", price: 399, stock: 30 }], isActive: true, createdAt: "" },
  { _id: "8", name: "Hazelnut Delight", slug: "hazelnut-delight", shortDescription: "Premium hazelnuts in every buttery bite.", fullDescription: "", ingredients: [], images: [], category: "Nuts", tags: [], variants: [{ weight: "250g", price: 499, stock: 20 }], isActive: true, createdAt: "" },
];

const rating = 4.8;
const reviewCount = 127;

export default function ProductDetailPage() {
  const addItem = useCartStore((s) => s.addItem);
  const toggle = useWishlistStore((s) => s.toggle);
  const isWishlisted = useWishlistStore((s) => s.isWishlisted(String(sampleProduct._id)));

  const [selectedVariant, setSelectedVariant] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"description" | "ingredients">(
    "description"
  );
  const [activeImage, setActiveImage] = useState(0);

  const variant = sampleProduct.variants[selectedVariant];

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        productId: String(sampleProduct._id),
        name: sampleProduct.name,
        variant: variant.weight,
        price: variant.price,
        image: sampleProduct.images?.[0] || "",
      });
    }
  };

  const handleToggleWishlist = () => {
    toggle(String(sampleProduct._id));
  };

  const stockStatus =
    variant.stock > 10
      ? { label: "In Stock", color: "text-green" }
      : variant.stock > 0
      ? { label: "Low Stock", color: "text-amber" }
      : { label: "Out of Stock", color: "text-red" };

  return (
    <div className="bg-cream-dark min-h-screen">
      <div className="container-tight py-4">
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="hover:text-gold transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-gold transition-colors">
            Shop
          </Link>
          <span>/</span>
          <span className="text-navy">{sampleProduct.name}</span>
        </nav>
      </div>

      <div className="container-tight py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <div className="aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-cream via-gold/10 to-navy/5 flex items-center justify-center shadow-warm-lg">
              <span
                className="text-[120px] select-none"
                role="img"
                aria-label="cookie"
              >
                🍪
              </span>
            </div>

            <div className="flex gap-3 mt-4">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    "aspect-square w-20 rounded-xl bg-gradient-to-br from-cream via-gold/10 to-navy/5 flex items-center justify-center border-2 transition-all",
                    activeImage === i
                      ? "border-gold"
                      : "border-transparent hover:border-gold/50"
                  )}
                >
                  <span className="text-2xl select-none">🍪</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-gold text-xs font-semibold uppercase tracking-widest mb-2 block">
              {sampleProduct.category}
            </span>

            <h1 className="font-heading text-4xl font-bold text-navy mb-3">
              {sampleProduct.name}
            </h1>

            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-4 h-4",
                      i < Math.round(rating)
                        ? "fill-gold text-gold"
                        : "fill-gray-200 text-gray-200"
                    )}
                  />
                ))}
              </div>
              <span className="text-muted text-sm">
                {rating} ({reviewCount} reviews)
              </span>
            </div>

            <div className="font-heading text-3xl font-bold text-gold mb-6">
              {formatPrice(variant.price)}
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-navy mb-3">Select Weight</p>
              <div className="flex flex-wrap gap-3">
                {sampleProduct.variants.map((v: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedVariant(i)}
                    className={cn(
                      "px-5 py-2 rounded-full text-sm font-medium border-2 transition-all",
                      selectedVariant === i
                        ? "bg-gold border-gold text-white"
                        : "border-navy/20 text-navy hover:border-gold/50"
                    )}
                  >
                    {v.weight} — {formatPrice(v.price)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-navy mb-3">Quantity</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-full border-2 border-navy/20 flex items-center justify-center hover:border-gold transition-colors"
                >
                  <Minus className="w-4 h-4 text-navy" />
                </button>
                <span className="w-10 text-center font-semibold text-lg text-navy">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity((q) => Math.min(variant.stock, q + 1))
                  }
                  className="w-10 h-10 rounded-full border-2 border-navy/20 flex items-center justify-center hover:border-gold transition-colors"
                >
                  <Plus className="w-4 h-4 text-navy" />
                </button>
              </div>
            </div>

            <p className={cn("text-sm mb-6", stockStatus.color)}>
              {stockStatus.label}
              {variant.stock > 0 && variant.stock <= 10 && (
                <span className="text-muted ml-1">
                  — Only {variant.stock} left
                </span>
              )}
            </p>

            <div className="flex gap-3 mb-6">
              <button
                onClick={handleAddToCart}
                className="btn-gold flex-1"
              >
                Add to Cart
              </button>
              <button
                onClick={handleToggleWishlist}
                className="btn-navy-outline px-4"
              >
                <Heart
                  className={cn(
                    "w-5 h-5",
                    isWishlisted
                      ? "fill-gold text-gold"
                      : "text-navy"
                  )}
                />
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-navy/10 space-y-3">
              <div className="flex items-center gap-3 text-muted text-sm">
                <Truck className="w-4 h-4 text-navy" />
                <span>Free delivery above ₹499</span>
              </div>
              <div className="flex items-center gap-3 text-muted text-sm">
                <Package className="w-4 h-4 text-navy" />
                <span>Delivered in 2–3 days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-tight mt-16">
        <div className="flex border-b border-navy/10 gap-8">
          <button
            onClick={() => setActiveTab("description")}
            className={cn(
              "pb-3 text-sm font-medium transition-all",
              activeTab === "description"
                ? "text-navy border-b-2 border-gold"
                : "text-muted hover:text-navy"
            )}
          >
            Description
          </button>
          <button
            onClick={() => setActiveTab("ingredients")}
            className={cn(
              "pb-3 text-sm font-medium transition-all",
              activeTab === "ingredients"
                ? "text-navy border-b-2 border-gold"
                : "text-muted hover:text-navy"
            )}
          >
            Ingredients
          </button>
        </div>

        <div className="bg-surface rounded-2xl p-8 shadow-warm mt-6">
          {activeTab === "description" ? (
            <p className="text-muted leading-relaxed">
              {sampleProduct.fullDescription}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sampleProduct.ingredients.map((ing: string) => (
                <span
                  key={ing}
                  className="bg-cream px-4 py-2 rounded-full text-sm text-navy font-medium"
                >
                  {ing}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container-tight py-16">
        <h2 className="font-heading text-2xl text-navy font-bold mb-8">
          You May Also Like
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
