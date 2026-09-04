"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import ProductCard from "@/components/product-card";
import { ProductCardSkeleton } from "@/components/skeleton";
import { cn } from "@/lib/utils";
import type { IProduct } from "@/models/Product";

/* eslint-disable @typescript-eslint/no-explicit-any */
const sampleProducts: any[] = [
  { _id: "1", name: "Classic Butter Cookie", slug: "classic-butter", shortDescription: "Rich, buttery perfection that melts in your mouth.", fullDescription: "", ingredients: [], images: [], category: "Signature", tags: ["bestseller"], variants: [{ weight: "250g", price: 399, stock: 50 }], isActive: true, createdAt: "" },
  { _id: "2", name: "Double Chocolate Chunk", slug: "double-chocolate", shortDescription: "For the serious chocolate lover — rich & indulgent.", fullDescription: "", ingredients: [], images: [], category: "Signature", tags: ["bestseller"], variants: [{ weight: "250g", price: 449, stock: 35 }], isActive: true, createdAt: "" },
  { _id: "3", name: "Eggless Vanilla Biscuit", slug: "eggless-vanilla", shortDescription: "Delicate vanilla biscuits, completely egg-free.", fullDescription: "", ingredients: [], images: [], category: "Eggless", tags: ["eggless"], variants: [{ weight: "200g", price: 349, stock: 60 }], isActive: true, createdAt: "" },
  { _id: "4", name: "Royal Ginger Snap", slug: "royal-ginger", shortDescription: "Bold ginger spice with a snappy golden crunch.", fullDescription: "", ingredients: [], images: [], category: "Spiced", tags: [], variants: [{ weight: "250g", price: 429, stock: 40 }], isActive: true, createdAt: "" },
  { _id: "5", name: "Salted Caramel Crunch", slug: "salted-caramel", shortDescription: "Sweet caramel meets the perfect pinch of sea salt.", fullDescription: "", ingredients: [], images: [], category: "Signature", tags: ["bestseller"], variants: [{ weight: "250g", price: 479, stock: 25 }], isActive: true, createdAt: "" },
  { _id: "6", name: "Almond Biscotti", slug: "almond-biscotti", shortDescription: "Crunchy, nutty biscotti for dipping and savoring.", fullDescription: "", ingredients: [], images: [], category: "Nuts", tags: [], variants: [{ weight: "200g", price: 399, stock: 30 }], isActive: true, createdAt: "" },
  { _id: "7", name: "Eggless Choco Chip", slug: "eggless-choco-chip", shortDescription: "Crispy eggless cookies studded with chocolate chips.", fullDescription: "", ingredients: [], images: [], category: "Eggless", tags: ["eggless"], variants: [{ weight: "250g", price: 379, stock: 45 }], isActive: true, createdAt: "" },
  { _id: "8", name: "Hazelnut Delight", slug: "hazelnut-delight", shortDescription: "Premium hazelnuts in every buttery bite.", fullDescription: "", ingredients: [], images: [], category: "Nuts", tags: [], variants: [{ weight: "250g", price: 499, stock: 20 }], isActive: true, createdAt: "" },
  { _id: "9", name: "Lemon Zest Shortbread", slug: "lemon-zest", shortDescription: "Bright, tangy shortbread with real lemon zest.", fullDescription: "", ingredients: [], images: [], category: "Citrus", tags: [], variants: [{ weight: "200g", price: 369, stock: 35 }], isActive: true, createdAt: "" },
] as unknown as IProduct[];

const categories = ["All", "Signature", "Eggless", "Spiced", "Nuts", "Citrus"];
const dietaryFilters = ["Eggless", "Vegan", "Gluten-Free", "Sugar-Free"];

function ShopContent() {
  const searchParams = useSearchParams();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("featured");
  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const productsPerPage = 6;

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setSelectedCategories([cat]);
    }
  }, [searchParams]);

  const filteredProducts = sampleProducts.filter((product) => {
    if (
      selectedCategories.length > 0 &&
      !selectedCategories.includes("All") &&
      !selectedCategories.includes(product.category)
    )
      return false;
    if (selectedDietary.length > 0) {
      const hasMatch = selectedDietary.some(
        (d) =>
          product.tags?.some((t: string) => t.toLowerCase() === d.toLowerCase()) ||
          product.category.toLowerCase() === d.toLowerCase()
      );
      if (!hasMatch) return false;
    }
    const price = product.variants?.[0]?.price ?? 0;
    if (priceRange.min && price < Number(priceRange.min)) return false;
    if (priceRange.max && price > Number(priceRange.max)) return false;
    return true;
  });

  const sorted = [...filteredProducts].sort((a, b) => {
    const priceA = a.variants?.[0]?.price ?? 0;
    const priceB = b.variants?.[0]?.price ?? 0;
    switch (sortBy) {
      case "price-asc":
        return priceA - priceB;
      case "price-desc":
        return priceB - priceA;
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(sorted.length / productsPerPage);
  const paginatedProducts = sorted.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedDietary([]);
    setPriceRange({ min: "", max: "" });
    setSortBy("featured");
    setCurrentPage(1);
  };

  const FiltersPanel = () => (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <SlidersHorizontal className="w-4 h-4 text-navy" />
          <h3 className="font-heading text-lg font-semibold text-navy">Filters</h3>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-navy mb-3">Category</h4>
        <div className="space-y-2">
          {categories.map((cat) => (
            <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="category"
                checked={
                  selectedCategories.includes(cat) ||
                  (cat === "All" && selectedCategories.length === 0)
                }
                onChange={() => {
                  if (cat === "All") {
                    setSelectedCategories([]);
                  } else {
                    setSelectedCategories([cat]);
                  }
                  setCurrentPage(1);
                }}
                className="accent-gold w-4 h-4"
              />
              <span className="text-sm text-muted group-hover:text-navy transition-colors">
                {cat}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-navy mb-3">Price Range</h4>
        <div className="flex gap-3">
          <input
            type="number"
            placeholder="Min"
            value={priceRange.min}
            onChange={(e) => {
              setPriceRange((p) => ({ ...p, min: e.target.value }));
              setCurrentPage(1);
            }}
            className="input-field w-full text-sm"
          />
          <input
            type="number"
            placeholder="Max"
            value={priceRange.max}
            onChange={(e) => {
              setPriceRange((p) => ({ ...p, max: e.target.value }));
              setCurrentPage(1);
            }}
            className="input-field w-full text-sm"
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-navy mb-3">Dietary</h4>
        <div className="space-y-2">
          {dietaryFilters.map((diet) => (
            <label key={diet} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedDietary.includes(diet)}
                onChange={() => {
                  setSelectedDietary((prev) =>
                    prev.includes(diet)
                      ? prev.filter((d) => d !== diet)
                      : [...prev, diet]
                  );
                  setCurrentPage(1);
                }}
                className="accent-gold w-4 h-4"
              />
              <span className="text-sm text-muted group-hover:text-navy transition-colors">
                {diet}
              </span>
            </label>
          ))}
        </div>
      </div>

      {(selectedCategories.length > 0 ||
        selectedDietary.length > 0 ||
        priceRange.min ||
        priceRange.max) && (
        <button
          onClick={clearFilters}
          className="text-gold text-sm font-medium hover:text-gold-hover transition-colors"
        >
          Clear All
        </button>
      )}
    </div>
  );

  return (
    <div className="bg-cream-dark min-h-screen">
      <div className="container-tight py-8">
        <h1 className="font-heading text-4xl text-navy font-bold mb-2">
          Our Cookies
        </h1>
        <p className="text-muted text-lg">Discover our handcrafted collection</p>
      </div>

      <div className="container-tight pb-20">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 bg-surface rounded-2xl shadow-warm p-6">
              <FiltersPanel />
            </div>
          </aside>

          {sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="absolute left-0 top-0 h-full w-80 bg-surface shadow-warm-lg p-6 overflow-y-auto animate-in slide-in-from-left">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-heading text-lg font-semibold text-navy">
                    Filters
                  </h3>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 rounded-full hover:bg-cream transition-colors"
                  >
                    <X className="w-5 h-5 text-navy" />
                  </button>
                </div>
                <FiltersPanel />
              </div>
            </div>
          )}

          <main className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-xl bg-surface shadow-warm"
                >
                  <SlidersHorizontal className="w-4 h-4 text-navy" />
                </button>
                <span className="text-muted text-sm">
                  {sorted.length} product{sorted.length !== 1 ? "s" : ""}
                </span>
              </div>

              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-field min-w-[180px] text-sm"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name: A–Z</option>
              </select>
            </div>

            {paginatedProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🍪</div>
                <h3 className="font-heading text-xl text-navy mb-2">
                  No cookies found
                </h3>
                <p className="text-muted mb-6">Try adjusting your filters</p>
                <button onClick={clearFilters} className="btn-gold">
                  Clear Filters
                </button>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-10 h-10 rounded-full bg-surface text-navy flex items-center justify-center hover:bg-gold/10 transition-colors disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                      currentPage === i + 1
                        ? "bg-gold text-white"
                        : "bg-surface text-navy hover:bg-gold/10"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 rounded-full bg-surface text-navy flex items-center justify-center hover:bg-gold/10 transition-colors disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-cream-dark min-h-screen py-20">
          <div className="container-tight">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}
