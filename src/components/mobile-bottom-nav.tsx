"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, Heart, ShoppingBag, Headphones } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore } from "@/store/useWishlistStore";
import { cn } from "@/lib/utils";

const items = [
  { label: "Home", href: "/", icon: Home, exact: true },
  { label: "Shop", href: "/shop", icon: Store },
  { label: "Wishlist", href: "/wishlist", icon: Heart },
  { label: "Cart", href: "/cart", icon: ShoppingBag },
  { label: "Support", href: "/contact", icon: Headphones },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const rawCartCount = useCartStore((s) => s.getCount());
  const rawWishCount = useWishlistStore((s) => s.slugs.length);
  const cartCount = mounted ? rawCartCount : 0;
  const wishCount = mounted ? rawWishCount : 0;

  useEffect(() => setMounted(true), []);

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-[#1E160F]/95 backdrop-blur-md border-t border-gold/15 shadow-[0_-6px_24px_-12px_rgba(0,0,0,0.7)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5 h-16">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const badge =
            item.href === "/cart"
              ? cartCount
              : item.href === "/wishlist"
                ? wishCount
                : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 py-1.5 transition-colors",
                isActive ? "text-gold-soft" : "text-lavender/60 hover:text-lavender"
              )}
            >
              {badge > 0 && (
                <span className="absolute top-1.5 right-1/2 translate-x-[14px] min-w-4 h-4 px-1 bg-gold text-[#1E160F] text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
              <Icon size={21} strokeWidth={isActive ? 2.25 : 1.5} />
              <span className="text-[10px] font-bold tracking-wide">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute top-0 inset-x-4 h-0.5 bg-gold rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}