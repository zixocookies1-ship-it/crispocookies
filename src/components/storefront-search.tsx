"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, PackageSearch, RefreshCw } from "lucide-react";
import { fetchProducts, StoreProduct } from "@/lib/storefront";
import { ProductCardSkeleton } from "@/components/skeleton";
import ProductCard from "@/components/product-card";

interface StorefrontSearchProps {
  open: boolean;
  onClose: () => void;
}

export default function StorefrontSearch({ open, onClose }: StorefrontSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [searched, setSearched] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => {
        document.body.style.overflow = "";
        clearTimeout(t);
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSearched(false);
      setError(false);
      return;
    }

    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    const timer = setTimeout(async () => {
      try {
        const data = await fetchProducts({ search: q });
        setResults(data);
        setSearched(true);
      } catch {
        setResults([]);
        setError(true);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open, attempt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-cream flex flex-col" role="dialog" aria-modal="true" aria-label="Search products">
      <div className="sticky top-0 bg-white border-b border-royal/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-cream rounded-full px-4 h-12">
            <Search size={18} className="text-muted shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cookies, brownies…"
              className="w-full bg-transparent outline-none text-royal placeholder:text-muted/70"
              aria-label="Search products"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="text-muted hover:text-royal p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-royal font-semibold px-2 py-2"
            aria-label="Close search"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="container-tight py-6">
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && !error && !searched && (
            <p className="text-center text-muted py-16">
              Search for &quot;Chocolate Cookie&quot;, &quot;Brownie&quot; or &quot;Oats&quot;…
            </p>
          )}

          {!loading && !error && searched && results.length === 0 && (
            <div className="text-center py-16">
              <PackageSearch className="w-12 h-12 mx-auto text-muted mb-4" />
              <h3 className="font-heading text-xl text-royal mb-2">No results found</h3>
              <p className="text-muted text-sm">
                Try a different keyword or{" "}
                <button
                  onClick={() => setQuery("")}
                  className="text-royal font-semibold underline-offset-2 hover:underline"
                >
                  clear the search
                </button>
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-16">
              <h3 className="font-heading text-xl text-royal mb-2">Something went wrong</h3>
              <p className="text-muted text-sm mb-6">We couldn&apos;t load search results.</p>
              <button
                onClick={() => setAttempt((a) => a + 1)}
                className="btn-royal"
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <>
              <p className="text-muted text-sm mb-4">
                {results.length} result{results.length !== 1 ? "s" : ""} for &quot;{query}&quot;
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}