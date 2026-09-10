"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Search,
  ShoppingBag,
  Heart,
  Menu,
  X,
  Home,
  Store,
  Info,
  Phone,
  Cookie,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore } from "@/store/useWishlistStore";
import { cn } from "@/lib/utils";
import StorefrontSearch from "@/components/storefront-search";

const navLinks = [
  { label: "About", href: "/about" },
  { label: "Cookies", href: "/cookies" },
  { label: "Brownies", href: "/brownies" },
  { label: "Contact", href: "/contact" },
];

const menuLinks = [
  { label: "Home", href: "/", icon: Home },
  { label: "Shop All", href: "/shop", icon: Store },
  { label: "Cookies", href: "/cookies", icon: Cookie },
  { label: "Brownies", href: "/brownies", icon: Cookie },
  { label: "About", href: "/about", icon: Info },
  { label: "Contact", href: "/contact", icon: Phone },
];

export default function StorefrontNavbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const rawCartCount = useCartStore((s) => s.getCount());
  const rawWishCount = useWishlistStore((s) => s.slugs.length);
  // Render 0 until mounted so server HTML and first client paint match
  // (persisted cart/wishlist rehydrate right after mount).
  const cartCount = mounted ? rawCartCount : 0;
  const wishCount = mounted ? rawWishCount : 0;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    if (menuOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const isActive = (href: string, exact = false) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <nav
        aria-label="Primary"
        className={cn(
          "sticky inset-x-0 top-0 z-50 bg-cream/90 backdrop-blur-md border-b transition-shadow duration-300",
          scrolled
            ? "border-royal/10 shadow-[0_8px_30px_-12px_rgba(27,27,75,0.25)]"
            : "border-transparent"
        )}
      >
        {/* Desktop */}
        <div className="hidden md:grid grid-cols-[1fr_auto_1fr] items-center max-w-7xl mx-auto px-6 h-[72px]">
          <Link href="/" className="flex items-center gap-2 justify-self-start">
            <Image
              src="/logo.jpeg"
              alt="Crispo Cookies"
              width={44}
              height={44}
              className="h-11 w-auto object-contain"
              priority
            />
          </Link>

          <div className="flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "group font-body text-[13px] font-bold tracking-[0.14em] uppercase transition-colors relative py-1.5",
                  isActive(link.href)
                    ? "text-royal"
                    : "text-plum/60 hover:text-royal"
                )}
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -bottom-0.5 left-0 h-0.5 rounded-full bg-gradient-to-r from-gold to-gold-light transition-all duration-300",
                    isActive(link.href)
                      ? "w-full"
                      : "w-0 group-hover:w-full"
                  )}
                />
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1 justify-self-end">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search products"
              className="text-plum/60 hover:text-royal transition-colors p-2.5"
            >
              <Search size={20} strokeWidth={1.75} />
            </button>
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="relative text-plum/60 hover:text-royal transition-colors p-2.5"
            >
              <Heart size={20} strokeWidth={1.75} />
              {wishCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-royal text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {wishCount > 9 ? "9+" : wishCount}
                </span>
              )}
            </Link>
            <Link
              href="/cart"
              aria-label="Shopping cart"
              className="relative text-plum/60 hover:text-royal transition-colors p-2.5"
            >
              <ShoppingBag size={20} strokeWidth={1.75} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-royal text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
            <Link href="/shop" className="btn-primary ml-2 px-6 py-2.5 text-xs">
              Shop Now
            </Link>
          </div>
        </div>

        {/* Mobile */}
        <div className="relative flex md:hidden items-center justify-between px-3 h-[56px]">
          <button
            onClick={() => setMenuOpen(true)}
            className="text-plum/70 p-2"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <Menu size={24} strokeWidth={1.75} />
          </button>

          <Link
            href="/"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center"
            aria-label="Crispo Cookies home"
          >
            <Image
              src="/logo.jpeg"
              alt="Crispo Cookies"
              width={96}
              height={40}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setSearchOpen(true)}
              className="text-plum/70 p-2"
              aria-label="Search products"
            >
              <Search size={21} strokeWidth={1.75} />
            </button>
            <Link
              href="/cart"
              className="relative text-plum/70 p-2.5"
              aria-label="Shopping cart"
            >
              <ShoppingBag size={21} strokeWidth={1.75} />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-royal text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div id="mobile-menu" className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-plum/50 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-[320px] bg-cream shadow-2xl flex flex-col animate-[slide-in-left_0.28s_ease-out]">
            <div className="flex items-center justify-between px-5 h-[56px] border-b border-royal/10">
              <Image
                src="/logo.jpeg"
                alt="Crispo Cookies"
                width={96}
                height={40}
                className="h-8 w-auto object-contain"
              />
              <button
                onClick={() => setMenuOpen(false)}
                className="text-plum/60 p-2"
                aria-label="Close menu"
              >
                <X size={24} strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex flex-col flex-1 px-4 py-4 gap-1 overflow-y-auto">
              {menuLinks.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.href === "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3.5 font-body text-[15px] font-semibold py-3.5 px-4 rounded-xl transition-colors",
                      active
                        ? "bg-royal text-cream shadow-lift"
                        : "text-plum/80 hover:bg-gold/10 hover:text-royal"
                    )}
                  >
                    <Icon
                      size={20}
                      strokeWidth={1.75}
                      className={active ? "text-gold-soft" : "text-muted"}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="px-5 pb-8 space-y-3">
              <Link
                href="/wishlist"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 border-2 border-royal text-royal font-semibold rounded-full px-5 py-3 text-sm"
              >
                <Heart size={16} />
                My Wishlist
                {wishCount > 0 && (
                  <span className="w-5 h-5 bg-royal text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {wishCount}
                  </span>
                )}
              </Link>
              <Link
                href="/shop"
                onClick={() => setMenuOpen(false)}
                className="btn-primary w-full"
              >
                Shop Now
              </Link>
            </div>
          </div>
        </div>
      )}

      <StorefrontSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}