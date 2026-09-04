"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Heart, ShoppingBag, Menu, X, ChevronRight } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore } from "@/store/useWishlistStore";
import { cn } from "@/lib/utils";
import AnnouncementBar from "@/components/announcement-bar";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },

  { label: "Our Story", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function StorefrontNavbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const cartCount = useCartStore((s) => s.getCount());
  const wishlistItems = useWishlistStore((s) => s.items);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <AnnouncementBar />

      <nav
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          scrolled ? "glass bg-navy/90 shadow-lg" : "bg-navy"
        )}
      >
        {/* Desktop */}
        <div className="hidden md:flex items-center justify-between max-w-7xl mx-auto px-6 h-[76px]">
          <Link href="/" className="flex-shrink-0">
            <span className="font-heading text-xl font-bold text-white tracking-[0.15em] uppercase">
              CRISPO
            </span>
          </Link>

          <div className="flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href + "/"));
              return (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  className={cn(
                    "text-[13px] font-medium tracking-wide uppercase transition-colors relative py-1",
                    isActive
                      ? "text-gold"
                      : "text-white/80 hover:text-gold"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-gold rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1">
            <Link
              href="/shop"
              className="text-white hover:text-gold transition-colors p-2.5"
            >
              <Search size={20} strokeWidth={1.5} />
            </Link>

            <Link
              href="/wishlist"
              className="relative text-white hover:text-gold transition-colors p-2.5"
            >
              <Heart
                size={20}
                strokeWidth={1.5}
                className={cn(
                  wishlistItems.length > 0 && "fill-gold text-gold"
                )}
              />
              {wishlistItems.length > 0 && (
                <span className="absolute top-1.5 right-1 w-4 h-4 bg-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {wishlistItems.length}
                </span>
              )}
            </Link>

            <Link
              href="/cart"
              className="relative text-white hover:text-gold transition-colors p-2.5"
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute top-1.5 right-1 w-4 h-4 bg-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center justify-between px-4 h-[64px]">
          <Link href="/" onClick={() => setMobileOpen(false)}>
            <span className="font-heading text-lg font-bold text-white tracking-[0.15em] uppercase">
              CRISPO
            </span>
          </Link>

          <button
            onClick={() => setMobileOpen(true)}
            className="text-white hover:text-gold transition-colors p-2"
            aria-label="Open menu"
          >
            <Menu size={24} strokeWidth={1.5} />
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-navy flex flex-col animate-slide-in-right">
          <div className="flex items-center justify-between px-5 h-[64px] border-b border-white/10">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex-shrink-0"
            >
              <span className="font-heading text-lg font-bold text-white tracking-[0.15em] uppercase">
                CRISPO
              </span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="text-white hover:text-gold transition-colors p-2"
              aria-label="Close menu"
            >
              <X size={24} strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center flex-1 gap-6">
            {navLinks.map((link, i) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href + "/"));
              return (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 text-2xl font-heading font-semibold transition-colors",
                    isActive ? "text-gold" : "text-white hover:text-gold"
                  )}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {link.label}
                  <ChevronRight
                    size={20}
                    strokeWidth={1.5}
                    className={cn(
                      "transition-colors",
                      isActive ? "text-gold/60" : "text-white/30"
                    )}
                  />
                </Link>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-8 pb-10 border-t border-white/10 pt-8">
            <Link
              href="/shop"
              onClick={() => setMobileOpen(false)}
              className="text-white hover:text-gold transition-colors p-3"
            >
              <Search size={24} strokeWidth={1.5} />
            </Link>
            <Link
              href="/wishlist"
              onClick={() => setMobileOpen(false)}
              className="relative text-white hover:text-gold transition-colors p-3"
            >
              <Heart
                size={24}
                strokeWidth={1.5}
                className={cn(
                  wishlistItems.length > 0 && "fill-gold text-gold"
                )}
              />
              {wishlistItems.length > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {wishlistItems.length}
                </span>
              )}
            </Link>
            <Link
              href="/cart"
              onClick={() => setMobileOpen(false)}
              className="relative text-white hover:text-gold transition-colors p-3"
            >
              <ShoppingBag size={24} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
