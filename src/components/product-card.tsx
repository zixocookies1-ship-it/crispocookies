"use client";

import Link from "next/link";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { toast } from "sonner";
import type { IProduct } from "@/models/Product";

interface ProductCardProps {
  product: IProduct;
}

const formatPrice = (p: number) => `₹${p}`;

export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  const variant = product.variants?.[0];
  const price = variant?.price ?? 0;
  const mrp = variant?.mrp ?? 0;
  const discount = mrp > price ? Math.round((mrp - price) / mrp * 100) : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (variant) {
      addItem({
        productId: String(product._id),
        name: product.name,
        variant: { weight: variant.weight, price: variant.price },
        image: product.images?.[0] || "",
      });
      toast.success(`${product.name} added to cart`);
    }
  };

  return (
    <div className="scene-3d">
      <div className="surface-card rounded-3xl overflow-hidden group h-full flex flex-col">
        <Link href={`/shop/${product.slug}`} className="flex flex-col h-full">
          <div className="relative rounded-2xl overflow-hidden bg-beige aspect-square flex items-center justify-center">
            <span className="text-[64px] select-none" role="img" aria-label="cookie">
              🍪
            </span>

            <div className="absolute top-3 left-3 flex flex-col gap-2">
              <span className="bg-green-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                100% Zero Maidha
              </span>
              {discount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  {discount}% OFF
                </span>
              )}
            </div>
          </div>

          <div className="p-5 flex flex-col flex-1">
            <h3 className="font-heading text-lg font-semibold text-royal leading-snug mb-1.5 group-hover:text-gold transition-colors">
              {product.name}
            </h3>

            {product.shortDescription && (
              <p className="text-muted text-sm leading-relaxed line-clamp-2 mb-3 flex-1">
                {product.shortDescription}
              </p>
            )}

            <div className="flex items-center gap-2 mb-3">
              <span className="text-royal font-bold text-xl">
                {formatPrice(price)}
              </span>
              {mrp > price && (
                <span className="text-muted text-sm line-through">
                  {formatPrice(mrp)}
                </span>
              )}
              {discount > 0 && (
                <span className="text-green-600 text-sm font-semibold">
                  ({discount}% OFF)
                </span>
              )}
            </div>

            <div className="flex gap-2 mt-auto">
              <button
                onClick={handleAddToCart}
                className="flex-1 bg-royal text-white rounded-full py-2.5 text-sm font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                Add to Cart
              </button>
              <Link
                href={`/shop/${product.slug}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 border border-royal text-royal rounded-full py-2.5 text-sm font-semibold transition-all hover:bg-royal hover:text-white flex items-center justify-center gap-2"
              >
                VIEW PRODUCT
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
