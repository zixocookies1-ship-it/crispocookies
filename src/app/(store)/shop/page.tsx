"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, SlidersHorizontal, PackageSearch, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchProducts, StoreProduct } from "@/lib/storefront";
import { ProductCardSkeleton } from "@/components/skeleton";
import ProductCard from "@/components/product-card";

const sortOptions = ["Popular", "Price: Low to High", "Price: High to Low"] as const;

export default function ShopPage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]>("Popular");
  const [sortOpen, setSortOpen] = useState(false);
  const [query, setQuery] = useState("");

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

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category?.name) set.add(p.category.name);
    });
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (activeCategory !== "All") {
      list = list.filter((p) => p.category?.name === activeCategory);
    }
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "Price: Low to High":
        list.sort((a, b) => {
          const pa = a.variants[0]?.price ?? 0;
          const pb = b.variants[0]?.price ?? 0;
          return pa - pb;
        });
        break;
      case "Price: High to Low":
        list.sort((a, b) => {
          const pa = a.variants[0]?.price ?? 0;
          const pb = b.variants[0]?.price ?? 0;
          return pb - pa;
        });
        break;
      default: {
        const rank = (p: StoreProduct) =>
          p.tags.includes("bestseller") ? 0 : p.tags.includes("zero-maida") ? 1 : 2;
        list.sort((a, b) => rank(a) - rank(b));
      }
    }
    return list;
  }, [products, activeCategory, sortBy, query]);

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <section className="bg-gradient-to-b from-white to-cream border-b border-royal/5 py-10 sm:py-14 text-center">
        <div className="container-tight">
          <p className="eyebrow mb-3">Our Collection</p>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-royal">
            Shop All
          </h1>
          <p className="text-muted mt-3 max-w-xl mx-auto">
            100% ZERO MAIDHA oat-based cookies and brownies, baked fresh and delivered to your doorstep.
          </p>
        </div>
      </section>

      <div className="container-tight py-8 pb-20">
        {/* Filter & Sort Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="w-full sm:w-auto flex items-center gap-2 min-w-0">
            <SlidersHorizontal size={16} className="text-royal shrink-0" />
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 w-full sm:w-auto">
              <button
                onClick={() => setActiveCategory("All")}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all",
                  activeCategory === "All"
                    ? "bg-royal text-white"
                    : "bg-white text-plum border border-royal/10 hover:border-royal/30"
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all",
                    activeCategory === cat
                      ? "bg-royal text-white"
                      : "bg-white text-plum border border-royal/10 hover:border-royal/30"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-52">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                aria-label="Search products"
                className="w-full bg-white border border-royal/10 rounded-full pl-9 pr-4 py-2 text-sm text-royal placeholder:text-muted/70 outline-none focus:border-royal focus:ring-2 focus:ring-royal/10"
              />
            </div>

            <div className="relative shrink-0">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-royal/10 text-sm font-semibold text-royal hover:border-royal/30 transition-colors"
                aria-haspopup="listbox"
                aria-expanded={sortOpen}
              >
                {sortBy}
                <ChevronDown className={cn("w-4 h-4 transition-transform", sortOpen && "rotate-180")} />
              </button>
              {sortOpen && (
                <div
                  role="listbox"
                  className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-lift border border-royal/10 z-20 w-52 overflow-hidden"
                >
                  {sortOptions.map((opt) => (
                    <button
                      key={opt}
                      role="option"
                      aria-selected={sortBy === opt}
                      onClick={() => {
                        setSortBy(opt);
                        setSortOpen(false);
                      }}
                      className={cn(
                        "block w-full text-left px-4 py-3 text-sm hover:bg-royal/5 transition-colors",
                        sortBy === opt ? "text-royal font-bold" : "text-plum/70"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🍪</div>
            <h3 className="font-heading text-xl text-royal mb-2">
              We couldn&apos;t load the products
            </h3>
            <p className="text-muted mb-6">Please check your connection and try again.</p>
            <button onClick={() => setAttempt((a) => a + 1)} className="btn-royal">
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20">
            <PackageSearch className="w-12 h-12 mx-auto text-muted mb-4" />
            <h3 className="font-heading text-xl text-royal mb-2">No products found</h3>
            <p className="text-muted mb-6">Try adjusting your filters or search.</p>
            <button
              onClick={() => {
                setActiveCategory("All");
                setQuery("");
              }}
              className="btn-royal"
            >
              Show All
            </button>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <p className="text-muted text-sm mb-4">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}