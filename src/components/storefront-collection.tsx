"use client";

import { useState, useEffect, useMemo } from "react";
import { PackageSearch, RefreshCw } from "lucide-react";
import { fetchProducts, StoreProduct } from "@/lib/storefront";
import { ProductCardSkeleton } from "@/components/skeleton";
import ProductCard from "@/components/product-card";

interface StorefrontCollectionProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  category?: string;
}

export default function StorefrontCollection({
  eyebrow,
  title,
  subtitle,
  category,
}: StorefrontCollectionProps) {
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

  const list = useMemo(() => {
    if (!category) return products;
    return products.filter((p) => p.category?.name === category);
  }, [products, category]);

  return (
    <div className="bg-cocoa min-h-screen">
      <section className="bg-gradient-to-b from-chocolate to-cocoa border-b border-gold/12 py-10 sm:py-14 text-center">
        <div className="container-tight">
          <p className="eyebrow mb-3">{eyebrow}</p>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-cream">{title}</h1>
          <p className="text-muted mt-3 max-w-xl mx-auto">{subtitle}</p>
        </div>
      </section>

      <section className="container-tight py-8 pb-20">
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-20">
            <h3 className="font-heading text-xl text-cream mb-2">We couldn&apos;t load the products</h3>
            <p className="text-muted mb-6">Please check your connection and try again.</p>
            <button onClick={() => setAttempt((a) => a + 1)} className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gold-soft/60 text-gold-soft font-semibold px-6 py-3 text-sm transition-colors hover:bg-gold/10">
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        )}

        {!loading && !error && list.length === 0 && (
          <div className="text-center py-20">
            <PackageSearch className="w-12 h-12 mx-auto text-muted mb-4" />
            <h3 className="font-heading text-xl text-cream mb-2">Products coming soon</h3>
            <p className="text-muted mb-6">New treats are being baked. Check back shortly.</p>
            <a href="/shop" className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gold-soft/60 text-gold-soft font-semibold px-6 py-3 text-sm transition-colors hover:bg-gold/10">
              Browse All
            </a>
          </div>
        )}

        {!loading && !error && list.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {list.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}