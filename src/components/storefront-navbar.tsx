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

function Wordmark() {
  return (
    <span className="flex flex-col leading-none">
      <span className="font-heading text-[19px] sm:text-[22px] font-bold tracking-[0.14em] text-cream">
        CRISPO
      </span>
      <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.52em] text-gold-soft uppercase mt-0.5">
        Cookies
      </span>
    </span>
  );
}

export default function StorefrontNavbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const rawCartCount = useCartStore((s) => s.getCount());
  const rawWishCount = useWishlistStore((s) => s.slugs.length);
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
          "sticky inset-x-0 top-0 z-50 bg-[#1E160F]/95 backdrop-blur-md border-b transition-shadow duration-300",
          scrolled
            ? "border-gold/25 shadow-[0_10px_34px_-16px_rgba(0,0,0,0.8)]"
            : "border-gold/10"
        )}
      >
        {/* Desktop */}
        <div className="hidden md:grid grid-cols-[1fr_auto_1fr] items-center max-w-7xl mx-auto px-6 h-[76px]">
          <Link href="/" className="flex items-center gap-3 justify-self-start">
            <Image
              src="/logo.jpeg"
              alt="Crispo Cookies"
              width={52}
              height={52}
              className="h-12 w-auto object-contain"
              priority
            />
            <Wordmark />
          </Link>

          <div className="flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "group font-body text-[13px] font-bold tracking-[0.16em] uppercase transition-colors relative py-1.5",
                  isActive(link.href)
                    ? "text-gold-soft"
                    : "text-lavender/75 hover:text-cream"
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
              className="text-lavender/80 hover:text-gold-soft transition-colors p-2.5"
            >
              <Search size={20} strokeWidth={1.5} />
            </button>
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="relative text-lavender/80 hover:text-gold-soft transition-colors p-2.5"
            >
              <Heart size={20} strokeWidth={1.5} />
              {wishCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {wishCount > 9 ? "9+" : wishCount}
                </span>
              )}
            </Link>
            <Link
              href="/cart"
              aria-label="Shopping cart"
              className="relative text-lavender/80 hover:text-gold-soft transition-colors p-2.5"
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
            <Link href="/shop" className="crispo-btn-gold ml-3 px-6 py-2.5 text-[11px]">
              Shop Now
            </Link>
          </div>
        </div>

        {/* Mobile — logo left, search / cart / menu right */}
        <div className="relative flex md:hidden items-center justify-between pl-3 pr-2 h-[60px]">
          <Link
            href="/"
            className="flex items-center gap-2.5 pr-1"
            aria-label="Crispo Cookies home"
          >
            <Image
              src="/logo.jpeg"
              alt="Crispo Cookies"
              width={44}
              height={44}
              className="h-10 w-auto object-contain shrink-0"
              priority
            />
            <Wordmark />
          </Link>

          <div className="flex items-center justify-end shrink-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="text-lavender/85 p-2"
              aria-label="Search products"
            >
              <Search size={21} strokeWidth={1.5} />
            </button>
            <Link
              href="/cart"
              className="relative text-lavender/85 p-2"
              aria-label="Shopping cart"
            >
              <ShoppingBag size={21} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              className="text-lavender/85 p-2"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <Menu size={22} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div id="mobile-menu" className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 right-0 w-[86%] max-w-[340px] bg-[#1E160F] border-l border-gold/15 shadow-2xl flex flex-col animate-[slide-in-left_0.28s_ease-out]">
            <div className="flex items-center justify-between px-5 h-[60px] border-b border-gold/15">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/logo.jpeg"
                  alt="Crispo Cookies"
                  width={40}
                  height={40}
                  className="h-9 w-auto object-contain"
                />
                <Wordmark />
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="text-lavender/70 p-2"
                aria-label="Close menu"
              >
                <X size={24} strokeWidth={1.5} />
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
                        ? "bg-gold/15 text-gold-soft ring-1 ring-gold/30"
                        : "text-cream/85 hover:bg-cream/5 hover:text-gold-soft"
                    )}
                  >
                    <Icon
                      size={20}
                      strokeWidth={1.5}
                      className={active ? "text-gold-soft" : "text-lavender/70"}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="px-5 pb-[max(2rem,env(safe-area-inset-bottom))] space-y-3">
              <Link
                href="/wishlist"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 border-2 border-lavender/40 text-lavender font-semibold rounded-full px-5 py-3 text-sm"
              >
                <Heart size={16} />
                My Wishlist
                {wishCount > 0 && (
                  <span className="w-5 h-5 bg-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {wishCount}
                  </span>
                )}
              </Link>
              <Link
                href="/shop"
                onClick={() => setMenuOpen(false)}
                className="crispo-btn-gold w-full py-3 text-xs"
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