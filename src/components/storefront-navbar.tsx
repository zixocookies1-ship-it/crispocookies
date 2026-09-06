"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag, Menu, X, ChevronRight } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "About", href: "/about" },
  { label: "Cookies", href: "/cookies" },
  { label: "Brownies", href: "/brownies" },
  { label: "Contact", href: "/contact" },
];

export default function StorefrontNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const cartCount = useCartStore((s) => s.getCount());

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
      <nav className="sticky inset-x-0 top-0 z-50 border-b border-lavender/40 bg-cream/85 backdrop-blur-md">
        {/* Desktop */}
        <div className="hidden md:flex items-center justify-between max-w-7xl mx-auto px-6 h-[72px]">
          <Link href="/" className="flex-shrink-0 flex items-center gap-2">
            <img
              src="/logo.jpeg"
              alt="Crispo Cookies"
              className="h-11 w-auto object-contain"
            />
            <span className="font-heading text-xl font-bold text-plum tracking-[0.12em] uppercase">
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
                    "font-body text-[13px] font-medium tracking-wide uppercase transition-colors relative py-1",
                    isActive
                      ? "text-gold"
                      : "text-plum/70 hover:text-gold"
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
              className="text-plum/60 hover:text-gold transition-colors p-2.5"
            >
              <Search size={20} strokeWidth={1.5} />
            </Link>

            <Link
              href="/cart"
              className="relative text-plum/60 hover:text-gold transition-colors p-2.5"
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute top-1.5 right-1 w-4 h-4 bg-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link
              href="/cookies"
              className="btn-gold ml-2 px-5 py-2 text-xs font-bold tracking-wider uppercase rounded-full"
            >
              SHOP COOKIES
            </Link>
          </div>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center justify-between px-4 h-[64px]">
          <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-1.5">
            <img
              src="/logo.jpeg"
              alt="Crispo Cookies"
              className="h-9 w-auto object-contain"
            />
            <span className="font-heading text-lg font-bold text-plum tracking-[0.12em] uppercase">
              CRISPO
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/cart"
              className="relative text-plum/60 hover:text-gold transition-colors p-2"
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileOpen(true)}
              className="text-plum/60 hover:text-gold transition-colors p-2"
              aria-label="Open menu"
            >
              <Menu size={24} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Dark backdrop */}
          <div
            className="absolute inset-0 bg-plum/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Slide-in panel */}
          <div className="absolute inset-y-0 right-0 w-[85%] max-w-[300px] bg-cream shadow-2xl flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between px-5 h-[64px] border-b border-lavender/30">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-1.5"
              >
                <img
                  src="/logo.jpeg"
                  alt="Crispo Cookies"
                  className="h-9 w-auto object-contain"
                />
                <span className="font-heading text-lg font-bold text-plum tracking-[0.12em] uppercase">
                  CRISPO
                </span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-plum/60 hover:text-gold transition-colors p-2"
                aria-label="Close menu"
              >
                <X size={24} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex flex-col flex-1 px-6 py-6 gap-1">
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
                      "flex items-center justify-between font-body text-lg py-3 px-3 rounded-lg transition-colors",
                      isActive
                        ? "bg-gold/10 text-gold font-semibold"
                        : "text-plum/80 hover:bg-lavender/20 hover:text-gold"
                    )}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    {link.label}
                    <ChevronRight
                      size={18}
                      strokeWidth={1.5}
                      className={cn(
                        "transition-colors",
                        isActive ? "text-gold/60" : "text-plum/30"
                      )}
                    />
                  </Link>
                );
              })}
            </div>

            <div className="px-6 pb-8">
              <Link
                href="/cookies"
                onClick={() => setMobileOpen(false)}
                className="btn-gold block w-full text-center px-5 py-3 text-sm font-bold tracking-wider uppercase rounded-full"
              >
                SHOP COOKIES
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 pb-6 border-t border-lavender/20 pt-5">
              <Link
                href="/shop"
                onClick={() => setMobileOpen(false)}
                className="text-plum/50 hover:text-gold transition-colors p-2"
              >
                <Search size={22} strokeWidth={1.5} />
              </Link>
              <Link
                href="/cart"
                onClick={() => setMobileOpen(false)}
                className="relative text-plum/50 hover:text-gold transition-colors p-2"
              >
                <ShoppingBag size={22} strokeWidth={1.5} />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
