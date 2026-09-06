"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  Star,
  Minus,
  Plus,
  Truck,
  Package,
  Shield,
  Leaf,
} from "lucide-react";
import ProductCard from "@/components/product-card";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/helpers";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore } from "@/store/useWishlistStore";

/* eslint-disable @typescript-eslint/no-explicit-any */
const allProducts: any[] = [
  {
    _id: "1",
    name: "Double Chocolate Cookie",
    slug: "double-chocolate-cookie",
    shortDescription: "Rich, indulgent and deeply chocolatey — made with pure oats and loaded with chocolate goodness.",
    fullDescription: "Rich, indulgent and deeply chocolatey, our Double Chocolate Cookie is made with pure oats powder and loaded with chocolate goodness. A premium cookie crafted for chocolate lovers who want indulgence with wholesome ingredients. Each box contains 6 handcrafted cookies weighing 300 grams total. 100% ZERO MAIDHA — made with pure oats, no artificial flavors, no preservatives.",
    ingredients: ["Oats Powder", "Cocoa", "Chocolate Chips", "Butter", "Sugar", "Vanilla", "Baking Powder"],
    images: [],
    category: "Cookies",
    tags: ["bestseller", "zero-maida"],
    nutrition: { protein: "4g", calories: "235 kcal", weight: "50g per cookie" },
    benefits: ["100% ZERO MAIDHA", "Pure oats goodness", "Protein packed", "No artificial flavors", "No preservatives", "Pure & wholesome"],
    variants: [{ weight: "300g (6 cookies)", price: 219, mrp: 399, stock: 50 }],
    isActive: true,
    createdAt: "",
  },
  {
    _id: "2",
    name: "Rose Cookie",
    slug: "rose-cookie",
    shortDescription: "A delicate floral twist — made with homemade rose syrup and fresh rose petals.",
    fullDescription: "A delicate floral twist on a wholesome cookie. Our Rose Cookie is made with homemade rose syrup prepared with fresh rose petals, creating a naturally aromatic and beautifully distinctive flavor. Each box contains 6 handcrafted cookies weighing 300 grams total. 100% ZERO MAIDHA.",
    ingredients: ["Oats Powder", "Homemade Rose Syrup", "Fresh Rose Petals", "Butter", "Sugar", "Baking Powder"],
    images: [],
    category: "Cookies",
    tags: ["zero-maida"],
    nutrition: { protein: "3.5g", calories: "220 kcal", weight: "50g per cookie" },
    benefits: ["Homemade rose syrup", "Fresh rose petals", "Natural aroma", "100% ZERO MAIDHA", "Protein packed", "No preservatives"],
    variants: [{ weight: "300g (6 cookies)", price: 219, mrp: 399, stock: 40 }],
    isActive: true,
    createdAt: "",
  },
  {
    _id: "3",
    name: "Pineapple Cookie",
    slug: "pineapple-cookie",
    shortDescription: "A tropical, refreshing cookie with homemade pineapple syrup and wholesome oats.",
    fullDescription: "A tropical, refreshing cookie crafted with homemade pineapple syrup and wholesome oats. Bright pineapple flavor meets a deliciously crisp cookie for a unique tropical experience. Each box contains 6 handcrafted cookies weighing 300 grams total. 100% ZERO MAIDHA.",
    ingredients: ["Oats Powder", "Homemade Pineapple Syrup", "Butter", "Sugar", "Baking Powder"],
    images: [],
    category: "Cookies",
    tags: ["zero-maida"],
    nutrition: { protein: "2g", calories: "225 kcal", weight: "50g per cookie" },
    benefits: ["Homemade pineapple syrup", "100% ZERO MAIDHA", "Pure oats goodness", "No artificial flavors", "No preservatives", "Pure & wholesome"],
    variants: [{ weight: "300g (6 cookies)", price: 219, mrp: 399, stock: 35 }],
    isActive: true,
    createdAt: "",
  },
  {
    _id: "4",
    name: "Dry Seeds Cookie",
    slug: "dry-seeds-cookie",
    shortDescription: "Loaded with 4 super seeds — crunchy, nutritious and satisfying.",
    fullDescription: "A nutrient-rich cookie loaded with four powerful seeds for a satisfying combination of crunch, nutrition and taste. Packed with 10g protein per cookie. Each box contains 4 cookies weighing 300 grams total. 100% ZERO MAIDHA.",
    ingredients: ["Oats Powder", "Pumpkin Seeds", "Flax Seeds", "Sunflower Seeds", "Watermelon Seeds", "Butter", "Sugar"],
    images: [],
    category: "Cookies",
    tags: ["bestseller", "zero-maida", "high-protein"],
    nutrition: { protein: "10g", calories: "403 kcal", weight: "75g per cookie" },
    benefits: ["Packed with 4 super seeds", "High in protein & healthy fats", "100% ZERO MAIDHA", "Guilt-free snack", "No preservatives", "Pure & wholesome"],
    variants: [{ weight: "300g (4 cookies)", price: 219, mrp: 399, stock: 30 }],
    isActive: true,
    createdAt: "",
  },
  {
    _id: "5",
    name: "All Mix Cookies",
    slug: "all-mix-cookies",
    shortDescription: "A discovery box with a mix of CRISPO cookie flavors — find your favourite bite.",
    fullDescription: "A discovery box with a mix of CRISPO cookie flavors — the easiest way to find your favourite bite. Each box contains 4 assorted cookies weighing 200 grams total. 100% ZERO MAIDHA.",
    ingredients: ["Oats Powder", "Butter", "Sugar", "Assorted Flavors"],
    images: [],
    category: "Cookies",
    tags: ["zero-maida", "variety"],
    nutrition: { protein: "3g", calories: "200 kcal", weight: "50g per cookie" },
    benefits: ["100% ZERO MAIDHA", "Mix of CRISPO flavors", "Made with oats", "Pure & wholesome"],
    variants: [{ weight: "200g (4 cookies)", price: 179, mrp: 299, stock: 45 }],
    isActive: true,
    createdAt: "",
  },
  {
    _id: "6",
    name: "Double Chocolate Oats Brownie",
    slug: "double-chocolate-oats-brownie",
    shortDescription: "Rich, fudgy chocolate brownie crafted with oats and deep chocolate flavor.",
    fullDescription: "A rich, fudgy chocolate brownie crafted with oats and deep chocolate flavor. Crisp on the outside, fudgy inside and packed with irresistible chocolate goodness. Each box contains 6 brownie pieces weighing 300 grams total. 100% ZERO MAIDHA.",
    ingredients: ["Oats Powder", "Cocoa", "Chocolate", "Butter", "Sugar", "Eggs", "Vanilla", "Baking Powder"],
    images: [],
    category: "Brownies",
    tags: ["zero-maida"],
    nutrition: { protein: "4g", calories: "203 kcal", weight: "50g per brownie" },
    benefits: ["100% ZERO MAIDHA", "Made with oats", "Deep chocolate flavor", "No preservatives", "Pure & wholesome"],
    variants: [{ weight: "300g (6 pieces)", price: 250, mrp: 499, stock: 25 }],
    isActive: true,
    createdAt: "",
  },
  {
    _id: "7",
    name: "Kaju Oats Brownie",
    slug: "kaju-oats-brownie",
    shortDescription: "Rich fudgy brownie combined with premium cashews and wholesome oats.",
    fullDescription: "A rich and fudgy chocolate brownie combined with the delicious crunch of premium cashews and the wholesome goodness of oats. Each box contains 6 brownie pieces weighing 300 grams total. 100% ZERO MAIDHA.",
    ingredients: ["Oats Powder", "Cocoa", "Premium Cashews", "Butter", "Sugar", "Eggs", "Vanilla", "Baking Powder"],
    images: [],
    category: "Brownies",
    tags: ["bestseller", "zero-maida"],
    nutrition: { protein: "3.5g", calories: "195 kcal", weight: "50g per brownie" },
    benefits: ["100% ZERO MAIDHA", "Premium cashews", "Made with oats", "No preservatives", "Pure & wholesome"],
    variants: [{ weight: "300g (6 pieces)", price: 250, mrp: 499, stock: 30 }],
    isActive: true,
    createdAt: "",
  },
];

const processSteps = [
  { num: "01", title: "Quality Ingredients", description: "Carefully selected ingredients form the foundation of every creation." },
  { num: "02", title: "Crafted With Care", description: "Each product is prepared with attention to flavour, texture and quality." },
  { num: "03", title: "Baked To Perfection", description: "Rich cookies and fudgy brownies made for an unforgettable bite." },
  { num: "04", title: "Made With Love", description: "Every CRISPO creation is made to bring a little more joy to your day." },
];

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const product = allProducts.find((p) => p.slug === slug) || allProducts[0];

  const addItem = useCartStore((s) => s.addItem);
  const toggle = useWishlistStore((s) => s.toggle);
  const isWishlisted = useWishlistStore((s) => s.isWishlisted(String(product._id)));

  const [selectedVariant, setSelectedVariant] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"description" | "ingredients" | "nutrition">("description");

  const variant = product.variants[selectedVariant];

  const relatedProducts = allProducts
    .filter((p) => p._id !== product._id)
    .slice(0, 4);

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        productId: String(product._id),
        name: product.name,
        variant: { weight: variant.weight, price: variant.price },
        image: product.images?.[0] || "",
      });
    }
  };

  const handleToggleWishlist = () => {
    toggle(String(product._id));
  };

  const stockStatus =
    variant.stock > 10
      ? { label: "In Stock", color: "text-green" }
      : variant.stock > 0
      ? { label: "Low Stock", color: "text-amber" }
      : { label: "Out of Stock", color: "text-red" };

  const discount = variant.mrp
    ? Math.round(((variant.mrp - variant.price) / variant.mrp) * 100)
    : 0;

  return (
    <div className="bg-cream-dark min-h-screen">
      <div className="container-tight py-4">
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="hover:text-gold transition-colors">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-gold transition-colors">Shop</Link>
          <span>/</span>
          <span className="text-royal">{product.name}</span>
        </nav>
      </div>

      <div className="container-tight py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <div className="aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-cream via-gold/10 to-royal/5 flex items-center justify-center shadow-warm-lg">
              <span className="text-[120px] select-none" role="img" aria-label="product">🍪</span>
            </div>
          </div>

          <div>
            <span className="text-gold text-xs font-semibold uppercase tracking-widest mb-2 block">
              {product.category}
            </span>

            <h1 className="font-heading text-4xl font-bold text-royal mb-3">
              {product.name}
            </h1>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("w-4 h-4", i < 4 ? "fill-gold text-gold" : "fill-gray-200 text-gray-200")} />
                ))}
              </div>
              <span className="text-muted text-sm">(4.8)</span>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className="font-heading text-3xl font-bold text-gold">{formatPrice(variant.price)}</span>
              {variant.mrp && variant.mrp > variant.price && (
                <>
                  <span className="text-muted text-lg line-through">{formatPrice(variant.mrp)}</span>
                  <span className="bg-green/10 text-green text-sm font-semibold px-2 py-0.5 rounded-full">{discount}% OFF</span>
                </>
              )}
            </div>

            <p className="text-muted leading-relaxed mb-6">{product.shortDescription}</p>

            <div className="mb-6">
              <p className="text-sm font-medium text-royal mb-3">Select Weight</p>
              <div className="flex flex-wrap gap-3">
                {product.variants.map((v: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedVariant(i)}
                    className={cn(
                      "px-5 py-2 rounded-full text-sm font-medium border-2 transition-all",
                      selectedVariant === i
                        ? "bg-gold border-gold text-white"
                        : "border-royal/20 text-royal hover:border-gold/50"
                    )}
                  >
                    {v.weight}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-royal mb-3">Quantity</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-10 h-10 rounded-full border-2 border-royal/20 flex items-center justify-center hover:border-gold transition-colors">
                  <Minus className="w-4 h-4 text-royal" />
                </button>
                <span className="w-10 text-center font-semibold text-lg text-royal">{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.min(variant.stock, q + 1))} className="w-10 h-10 rounded-full border-2 border-royal/20 flex items-center justify-center hover:border-gold transition-colors">
                  <Plus className="w-4 h-4 text-royal" />
                </button>
              </div>
            </div>

            <p className={cn("text-sm mb-6", stockStatus.color)}>
              {stockStatus.label}
              {variant.stock > 0 && variant.stock <= 10 && (
                <span className="text-muted ml-1">— Only {variant.stock} left</span>
              )}
            </p>

            <div className="flex gap-3 mb-6">
              <button onClick={handleAddToCart} className="btn-gold flex-1">Add to Cart</button>
              <button onClick={handleToggleWishlist} className="btn-royal-outline px-4">
                <Heart className={cn("w-5 h-5", isWishlisted ? "fill-gold text-gold" : "text-royal")} />
              </button>
            </div>

            <div className="pt-6 border-t border-royal/10 space-y-3">
              <div className="flex items-center gap-3 text-muted text-sm">
                <Truck className="w-4 h-4 text-royal" />
                <span>Free delivery above ₹499</span>
              </div>
              <div className="flex items-center gap-3 text-muted text-sm">
                <Package className="w-4 h-4 text-royal" />
                <span>Delivered in 2–3 days</span>
              </div>
              <div className="flex items-center gap-3 text-muted text-sm">
                <Shield className="w-4 h-4 text-royal" />
                <span>100% ZERO MAIDHA — Pure Oats</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      {product.benefits && (
        <div className="container-tight mt-8">
          <div className="bg-surface rounded-2xl p-6 shadow-warm">
            <div className="flex items-center gap-2 mb-4">
              <Leaf className="w-5 h-5 text-green" />
              <h3 className="font-heading text-lg font-semibold text-royal">Key Benefits</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {product.benefits.map((b: string) => (
                <div key={b} className="flex items-center gap-2 text-sm text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                  {b}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="container-tight mt-12">
        <div className="flex border-b border-royal/10 gap-8">
          {(["description", "ingredients", "nutrition"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-3 text-sm font-medium transition-all capitalize",
                activeTab === tab
                  ? "text-royal border-b-2 border-gold"
                  : "text-muted hover:text-royal"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="bg-surface rounded-2xl p-8 shadow-warm mt-6">
          {activeTab === "description" && (
            <p className="text-muted leading-relaxed">{product.fullDescription}</p>
          )}
          {activeTab === "ingredients" && (
            <div className="flex flex-wrap gap-2">
              {product.ingredients.map((ing: string) => (
                <span key={ing} className="bg-cream px-4 py-2 rounded-full text-sm text-royal font-medium">{ing}</span>
              ))}
            </div>
          )}
          {activeTab === "nutrition" && product.nutrition && (
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-4 bg-cream rounded-xl">
                <p className="text-gold font-bold text-2xl">{product.nutrition.protein}</p>
                <p className="text-muted text-sm mt-1">Protein</p>
              </div>
              <div className="text-center p-4 bg-cream rounded-xl">
                <p className="text-gold font-bold text-2xl">{product.nutrition.calories}</p>
                <p className="text-muted text-sm mt-1">Calories</p>
              </div>
              <div className="text-center p-4 bg-cream rounded-xl">
                <p className="text-gold font-bold text-2xl">{product.nutrition.weight}</p>
                <p className="text-muted text-sm mt-1">Weight</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Process Steps */}
      <div className="container-tight mt-16">
        <h2 className="font-heading text-2xl text-royal font-bold mb-8 text-center">Our Process</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {processSteps.map((step) => (
            <div key={step.num} className="text-center p-4">
              <span className="font-heading text-3xl text-gold/30 font-bold">{step.num}</span>
              <h4 className="font-heading font-semibold text-royal text-sm mt-2 mb-1">{step.title}</h4>
              <p className="text-muted text-xs leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Related Products */}
      <div className="container-tight py-16">
        <h2 className="font-heading text-2xl text-royal font-bold mb-8">You May Also Like</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedProducts.map((p) => (
            <div key={p._id} className="h-full">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
