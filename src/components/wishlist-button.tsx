"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useWishlistStore } from "@/store/useWishlistStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  slug: string;
  name?: string;
  className?: string;
  iconClassName?: string;
  showLabel?: boolean;
}

export default function WishlistButton({
  slug,
  name,
  className,
  iconClassName,
  showLabel = false,
}: WishlistButtonProps) {
  const toggle = useWishlistStore((s) => s.toggle);
  const isIn = useWishlistStore((s) => s.slugs.includes(slug));
  const [pressed, setPressed] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(slug);
    setPressed(true);
    setTimeout(() => setPressed(false), 300);
    toast.success(
      isIn ? "Removed from wishlist" : `${name || "Product"} added to wishlist`
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isIn ? `Remove ${name || "item"} from wishlist` : `Add ${name || "item"} to wishlist`}
      aria-pressed={isIn}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-white text-royal border border-royal/10 shadow-soft hover:scale-105 active:scale-95 transition-transform",
        showLabel ? "gap-2 px-4 py-2" : "w-9 h-9",
        className
      )}
    >
      <Heart
        size={18}
        className={cn(
          "transition-colors",
          pressed && "animate-[crispoRise_0.3s_ease]",
          isIn ? "fill-red text-red" : "text-royal",
          iconClassName
        )}
      />
      {showLabel && (
        <span className="text-sm font-semibold">{isIn ? "Wishlisted" : "Wishlist"}</span>
      )}
    </button>
  );
}