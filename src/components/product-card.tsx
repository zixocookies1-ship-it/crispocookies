"use client";

import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/helpers";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore } from "@/store/useWishlistStore";
import type { IProduct } from "@/models/Product";

interface ProductCardProps {
  product: IProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const toggle = useWishlistStore((s) => s.toggle);
  const isWishlisted = useWishlistStore((s) => s.isWishlisted(String(product._id)));

  const lowestPrice = product.variants?.length
    ? Math.min(...product.variants.map((v) => v.price))
    : 0;

  const hasRating = "rating" in product;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const variant = product.variants?.[0];
    if (variant) {
      addItem({
        productId: String(product._id),
        name: product.name,
        variant: variant.weight,
        price: variant.price,
        image: product.images?.[0] || "",
      });
    }
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(String(product._id));
  };

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="block bg-surface rounded-2xl shadow-warm overflow-hidden transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-1 cursor-pointer group"
    >
      <div className="aspect-square relative overflow-hidden img-zoom bg-gradient-to-br from-cream via-gold/8 to-navy/5 flex items-center justify-center">
        <span className="text-[64px] select-none" role="img" aria-label="cookie">
          🍪
        </span>

        {product.tags?.includes("bestseller") && (
          <span className="absolute top-3 left-3 bg-gold text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            Bestseller
          </span>
        )}
        {!product.tags?.includes("bestseller") && product.tags?.includes("eggless") && (
          <span className="absolute top-3 left-3 bg-navy text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            Eggless
          </span>
        )}

        <button
          onClick={handleToggleWishlist}
          className="absolute top-3 right-3 p-2 rounded-full bg-surface/80 backdrop-blur-sm transition-colors hover:scale-110"
          aria-label="Toggle wishlist"
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-colors",
              isWishlisted ? "fill-gold text-gold" : "text-muted hover:text-gold"
            )}
          />
        </button>

        <div className="absolute bottom-3 right-3 hidden group-hover:block">
          <span className="bg-navy/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
            Quick View
          </span>
        </div>
      </div>

      <div className="p-5">
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full",
                  tag === "bestseller"
                    ? "bg-gold/10 text-gold"
                    : "bg-navy/10 text-navy"
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <h3 className="font-heading text-lg font-semibold text-navy leading-snug mb-1.5 group-hover:text-gold transition-colors">
          {product.name}
        </h3>

        {product.shortDescription && (
          <p className="text-muted text-sm leading-relaxed line-clamp-2 mb-3">
            {product.shortDescription}
          </p>
        )}

        {hasRating && (
          <div className="flex items-center gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "w-3.5 h-3.5",
                  i < Math.round((product as { rating?: number }).rating ?? 0)
                    ? "fill-gold text-gold"
                    : "fill-gray-200 text-gray-200"
                )}
              />
            ))}
            {"reviewCount" in product && (product as { reviewCount?: number }).reviewCount !== undefined && (
              <span className="text-muted text-xs ml-1">
                ({(product as { reviewCount?: number }).reviewCount})
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            {product.variants && product.variants.length > 1 && (
              <span className="text-muted text-xs">From</span>
            )}
            <span className="text-gold font-bold text-xl">
              {formatPrice(lowestPrice)}
            </span>
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          className="w-full bg-gold hover:bg-gold-hover text-white font-semibold py-2.5 rounded-full text-sm transition-all duration-200 hover:shadow-gold"
        >
          Add to Cart
        </button>
      </div>
    </Link>
  );
}
