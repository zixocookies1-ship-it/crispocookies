"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, PackageSearch, RefreshCw } from "lucide-react";
import { useWishlistStore } from "@/store/useWishlistStore";
import { fetchProducts, StoreProduct } from "@/lib/storefront";
import { ProductCardSkeleton } from "@/components/skeleton";
import ProductCard from "@/components/product-card";

export default function WishlistPage() {
  const [mounted, setMounted] = useState(false);
  const slugs = useWishlistStore((s) => s.slugs);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => setMounted(true), []);

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

  const wishlist = products.filter((p) => slugs.includes(p.slug));

  if (!mounted) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-cream min-h-screen">
      <section className="bg-gradient-to-b from-white to-cream border-b border-royal/5 py-10 sm:py-14 text-center">
        <div className="container-tight">
          <p className="eyebrow mb-3">Saved For Later</p>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-royal">
            My Wishlist
          </h1>
        </div>
      </section>

      <div className="container-tight py-8 pb-20">
        {slugs.length === 0 && !loading ? (
          <div className="text-center py-20">
            <Heart className="w-12 h-12 mx-auto text-muted mb-4" strokeWidth={1.5} />
            <h3 className="font-heading text-xl text-royal mb-2">
              Your wishlist is empty
            </h3>
            <p className="text-muted mb-6">
              Tap the ♡ on any product to save it here.
            </p>
            <Link href="/shop" className="btn-primary">
              Browse Products
            </Link>
          </div>
        ) : (
          <>
            <p className="text-muted text-sm mb-4">
              {wishlist.length} item{wishlist.length !== 1 ? "s" : ""}
            </p>

            {loading && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="text-center py-20">
                <h3 className="font-heading text-xl text-royal mb-2">Something went wrong</h3>
                <p className="text-muted mb-6">We couldn&apos;t load your wishlist.</p>
                <button onClick={() => setAttempt((a) => a + 1)} className="btn-royal">
                  <RefreshCw size={16} />
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && wishlist.length === 0 && (
              <div className="text-center py-20">
                <PackageSearch className="w-12 h-12 mx-auto text-muted mb-4" />
                <h3 className="font-heading text-xl text-royal mb-2">
                  Saved items are no longer available
                </h3>
                <p className="text-muted mb-6">They may have been removed or sold out.</p>
                <Link href="/shop" className="btn-royal">
                  Browse Products
                </Link>
              </div>
            )}

            {!loading && !error && wishlist.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                {wishlist.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}