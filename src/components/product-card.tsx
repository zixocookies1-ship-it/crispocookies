"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StoreProduct, cheapestVariant, discountOf, formatINR } from "@/lib/storefront";
import { getActivePromotion, unitPriceWithDiscount } from "@/lib/promotion";
import { ActivePromotion } from "@/lib/pricing-math";

interface ProductCardProps {
  product: StoreProduct;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [imgFailed, setImgFailed] = useState(false);
  const [promotion, setPromotion] = useState<ActivePromotion | null>(null);

  useEffect(() => {
    let cancelled = false;
    getActivePromotion()
      .then((promo) => {
        if (!cancelled) setPromotion(promo);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const hasImages = product.images.length > 0;
  const showImage = hasImages && !imgFailed;
  const image = product.images[0];

  const variant =
    product.variants.find((v) => v.stock > 0) || cheapestVariant(product);
  const price = variant?.price ?? 0;
  const mrp = variant?.mrp ?? 0;
  const discount = variant ? discountOf(variant) : 0;
  const outOfStock = !variant || variant.stock <= 0;
  const multiVariant = product.variants.length > 1;

  const promoPricing = unitPriceWithDiscount(price, promotion, mrp);
  const promoActive = !!promotion && promoPricing.discount > 0;
  const showPromoChip = promoActive && !outOfStock;

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (multiVariant) {
      router.push(`/shop/${product.slug}`);
      return;
    }
    if (!variant || variant.stock <= 0) {
      toast.error(`${product.name} is currently out of stock`);
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      variant: { weight: variant.weight, price: variant.price, mrp },
      image: image || product.emoji,
    });
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="relative flex flex-col h-full bg-cacao rounded-2xl border border-gold/12 shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group">
      <Link
        href={`/shop/${product.slug}`}
        aria-label={product.name}
        className="relative block aspect-square overflow-hidden bg-gradient-to-br from-chocolate via-cacao to-chocolate"
      >
        {showImage ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 31vw, 22vw"
            className="object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-[1.06]"
            priority={priority}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span
            className="absolute inset-0 flex items-center justify-center text-6xl select-none"
            role="img"
            aria-label={product.name}
          >
            {product.emoji}
          </span>
        )}

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
          {product.badge && (
            <span className="bg-gold text-[#2B1803] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
              {product.badge}
            </span>
          )}
          {showPromoChip && (
            <span className="bg-[#E11D48] text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full">
              {promotion.discountValue}% OFF
            </span>
          )}
          {!showPromoChip && discount > 0 && multiVariant && (
            <span className="discount-chip">{discount}% OFF</span>
          )}
        </div>
      </Link>

      <div className="p-3 sm:p-4 flex flex-col flex-1 gap-1.5 min-w-0">
        <Link href={`/shop/${product.slug}`}>
          <h3 className="font-body text-sm sm:text-[15px] font-bold text-cream leading-snug line-clamp-2 min-h-[2.5em] group-hover:text-lavender transition-colors">
            {product.name}
          </h3>
        </Link>

        {variant && (
          <p className="text-[11px] sm:text-xs text-muted truncate">
            {variant.weight}
            {outOfStock && <span className="text-red font-semibold"> · Out of stock</span>}
          </p>
        )}

        <div className="mt-auto pt-1.5 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-base sm:text-lg font-extrabold text-gold-soft">
            {promoActive ? formatINR(promoPricing.final) : formatINR(price)}
          </span>
          {promoActive ? (
            <span className="text-xs text-faded line-through">{formatINR(promoPricing.base)}</span>
          ) : (
            mrp > price && (
              <span className="text-xs text-faded line-through">{formatINR(mrp)}</span>
            )
          )}
          {promoActive ? (
            <span className="bg-[#E11D48] text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">
              {promotion.discountValue}% OFF
            </span>
          ) : (
            discount > 0 &&
            !multiVariant && <span className="discount-chip">{discount}% OFF</span>
          )}
        </div>

        <button
          onClick={handleAddToCart}
          disabled={outOfStock}
          className={cn(
            "mt-2 w-full rounded-full py-2.5 text-xs font-bold uppercase tracking-wide transition-all duration-300 flex items-center justify-center gap-1.5",
            outOfStock
              ? "bg-chocolate text-faded cursor-not-allowed"
              : "crispo-btn-gold"
          )}
        >
          <Plus size={14} strokeWidth={2.5} />
          {outOfStock ? "Out of Stock" : multiVariant ? "Select Options" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}