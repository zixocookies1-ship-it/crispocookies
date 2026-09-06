"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ShoppingBag,
  ArrowRight,
  Filter,
  ChevronDown,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

const products = [
  {
    _id: "1",
    name: "Double Chocolate Cookie",
    slug: "double-chocolate-cookie",
    price: 179,
    mrp: 299,
    weight: "200g",
    packQuantity: "4 cookies",
    category: "Cookie",
    description: "Rich, indulgent and deeply chocolatey.",
    emoji: "🍪",
  },
  {
    _id: "2",
    name: "Rose Cookie",
    slug: "rose-cookie",
    price: 179,
    mrp: 299,
    weight: "200g",
    packQuantity: "4 cookies",
    category: "Cookie",
    description: "Delicate floral twist with homemade rose syrup.",
    emoji: "🍪",
  },
  {
    _id: "3",
    name: "Pineapple Cookie",
    slug: "pine-apple-cookie",
    price: 179,
    mrp: 299,
    weight: "200g",
    packQuantity: "4 cookies",
    category: "Cookie",
    description: "Tropical, refreshing with pineapple and oats.",
    emoji: "🍪",
  },
  {
    _id: "4",
    name: "Dry Seeds Cookie",
    slug: "dry-seed-cookies",
    price: 219,
    mrp: 399,
    weight: "300g",
    packQuantity: "4 cookies",
    category: "Cookie",
    description: "Nutrient-rich with four powerful seeds.",
    emoji: "🍪",
  },
  {
    _id: "5",
    name: "All Mix Cookies",
    slug: "all-mix-cookies",
    price: 219,
    mrp: 399,
    weight: "300g",
    packQuantity: "6 cookies",
    category: "Cookie",
    description: "Assortment of our finest cookies.",
    emoji: "🍪",
  },
  {
    _id: "6",
    name: "Double Chocolate Oats Brownie",
    slug: "double-chocolate-oats-brownie",
    price: 250,
    mrp: 499,
    weight: "403 kcal",
    packQuantity: "1 brownie",
    category: "Brownie",
    description: "Rich, fudgy brownie with oats.",
    emoji: "🍫",
  },
  {
    _id: "7",
    name: "Kaju Oats Brownie",
    slug: "kaju-oats-brownie",
    price: 250,
    mrp: 499,
    weight: "250g",
    packQuantity: "1 brownie",
    category: "Brownie",
    description: "Fudgy brownie with premium cashews.",
    emoji: "🍫",
  },
];

const categories = ["All", "Cookies", "Brownies"] as const;
const sortOptions = ["Popular", "Price: Low to High", "Price: High to Low"] as const;

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("Popular");
  const [sortOpen, setSortOpen] = useState(false);

  const addItem = useCartStore((s) => s.addItem);

  const filtered = useMemo(() => {
    let list = [...products];
    if (activeCategory === "Cookies") {
      list = list.filter((p) => p.category === "Cookie");
    } else if (activeCategory === "Brownies") {
      list = list.filter((p) => p.category === "Brownie");
    }
    switch (sortBy) {
      case "Price: Low to High":
        list.sort((a, b) => a.price - b.price);
        break;
      case "Price: High to Low":
        list.sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }
    return list;
  }, [activeCategory, sortBy]);

  const handleAddToCart = (product: (typeof products)[number]) => {
    addItem({
      productId: product._id,
      name: product.name,
      variant: { weight: product.weight, price: product.price },
      image: "",
    });
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="min-h-screen bg-cream-dark">
      {/* Hero */}
      <section className="bg-gradient-to-b from-royal to-royal/90 text-white py-16 text-center">
        <p className="text-gold uppercase tracking-widest text-xs font-medium mb-3">
          Our Collection
        </p>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold">Shop All</h1>
      </section>

      <div className="container-tight py-10">
        {/* Filter & Sort Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-royal" />
            <div className="flex gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    activeCategory === cat
                      ? "bg-gold text-white"
                      : "bg-surface text-royal hover:bg-gold/10"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface text-sm font-medium text-royal hover:bg-gold/10 transition-colors"
            >
              {sortBy}
              <ChevronDown className="w-4 h-4" />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-1 bg-surface rounded-xl shadow-soft z-20 w-48 overflow-hidden">
                {sortOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setSortBy(opt);
                      setSortOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2.5 text-sm hover:bg-gold/10 transition-colors ${
                      sortBy === opt ? "text-gold font-semibold" : "text-royal"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-muted text-sm mb-6">
          {filtered.length} product{filtered.length !== 1 ? "s" : ""}
        </p>

        {/* Product Grid */}
        {filtered.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => {
              const discount = Math.round(
                ((product.mrp - product.price) / product.mrp) * 100
              );

              return (
                <div
                  key={product._id}
                  className="bg-surface rounded-2xl shadow-soft overflow-hidden flex flex-col hover:shadow-lift transition-shadow"
                >
                  {/* Emoji image */}
                  <div className="relative bg-beige rounded-2xl flex items-center justify-center h-48">
                    <span className="text-6xl">{product.emoji}</span>
                    {discount > 0 && (
                      <span className="absolute top-3 left-3 bg-gold text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        -{discount}%
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5 flex flex-col flex-1">
                    <p className="text-xs text-muted uppercase tracking-wide mb-1">
                      {product.packQuantity}
                    </p>
                    <h3 className="font-heading text-lg font-semibold text-royal mb-1">
                      {product.name}
                    </h3>
                    <p className="text-sm text-muted mb-4">{product.description}</p>

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-xl font-bold text-royal">
                        ₹{product.price}
                      </span>
                      <span className="text-sm text-muted line-through">
                        ₹{product.mrp}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex flex-col gap-2">
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-hover text-white font-semibold py-2.5 rounded-xl transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Add to Cart
                      </button>
                      <div className="flex gap-2">
                        <Link
                          href={`/shop/${product.slug}`}
                          className="flex-1 flex items-center justify-center gap-1.5 border border-royal/20 text-royal text-sm font-medium py-2.5 rounded-xl hover:bg-royal/5 transition-colors"
                        >
                          View
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🍪</div>
            <h3 className="font-heading text-xl text-royal mb-2">
              No products found
            </h3>
            <p className="text-muted mb-6">Try adjusting your filters</p>
            <button
              onClick={() => setActiveCategory("All")}
              className="bg-gold hover:bg-gold-hover text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              Show All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
