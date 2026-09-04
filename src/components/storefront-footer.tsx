import Link from "next/link";
import { Globe, MessageCircle, Send } from "lucide-react";

export default function StorefrontFooter() {
  return (
    <footer className="bg-[#0F0F2D] text-cream">
      <div className="container-tight mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="font-heading text-2xl font-bold text-white tracking-[0.15em] uppercase"
            >
              CRISPO
            </Link>
            <p className="text-cream/60 text-sm mt-3">
              Baked with Love, Delivered Fresh
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors"
                aria-label="Instagram"
              >
                <Globe size={20} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors"
                aria-label="Facebook"
              >
                <MessageCircle size={20} />
              </a>
              <a
                href="https://wa.me/1234567890"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:text-gold-light transition-colors"
                aria-label="WhatsApp"
              >
                <Send size={20} />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-heading text-sm font-semibold text-gold uppercase tracking-widest mb-5">
              Shop
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/shop"
                  className="text-cream/60 hover:text-gold text-sm transition-colors"
                >
                  All Cookies
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?category=Gift+Boxes"
                  className="text-cream/60 hover:text-gold text-sm transition-colors"
                >
                  Gift Boxes
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?tag=bestseller"
                  className="text-cream/60 hover:text-gold text-sm transition-colors"
                >
                  Bestsellers
                </Link>
              </li>
              <li>
                <Link
                  href="/shop"
                  className="text-cream/60 hover:text-gold text-sm transition-colors"
                >
                  New Arrivals
                </Link>
              </li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="font-heading text-sm font-semibold text-gold uppercase tracking-widest mb-5">
              Help
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-cream/60 hover:text-gold text-sm transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-cream/60 hover:text-gold text-sm transition-colors"
                >
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-cream/60 hover:text-gold text-sm transition-colors"
                >
                  Returns &amp; Refunds
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-cream/60 hover:text-gold text-sm transition-colors"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-heading text-sm font-semibold text-gold uppercase tracking-widest mb-5">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-cream/60 hover:text-gold text-sm transition-colors"
                >
                  Our Story
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-cream/60 hover:text-gold text-sm transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <a
                  href="#"
                  className="text-cream/60 hover:text-gold text-sm transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-cream/60 hover:text-gold text-sm transition-colors"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container-tight mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-cream/40 text-sm">
            © 2024 Crispo Cookies. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold/60 hover:text-gold transition-colors"
              aria-label="Instagram"
            >
              <Globe size={18} />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold/60 hover:text-gold transition-colors"
              aria-label="Facebook"
            >
              <MessageCircle size={18} />
            </a>
            <a
              href="https://wa.me/1234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold/60 hover:text-gold transition-colors"
              aria-label="WhatsApp"
            >
              <Send size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
