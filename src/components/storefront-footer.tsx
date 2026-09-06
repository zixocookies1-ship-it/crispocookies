import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="5"/>
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.56 12 19.56 12 19.56s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z"/>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
  </svg>
);

export default function StorefrontFooter() {
  return (
    <footer className="bg-[#1A1413] text-[#F5F0E8]">
      <div className="container-tight mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        {/* Top Section: Logo + Tagline */}
        <div className="text-center mb-14">
          <Link
            href="/"
            className="font-heading text-4xl font-bold text-[#F5F0E8] tracking-[0.2em] uppercase"
          >
            CRISPO
          </Link>
          <p className="text-[#F5F0E8]/70 text-sm mt-4 max-w-xl mx-auto leading-relaxed">
            Baked to impress, made to crave. Premium oat-based cookies and
            brownies with 100% ZERO MAIDHA, handcrafted in Nellore. Order on
            WhatsApp.
          </p>
          <a
            href="https://wa.me/917569831560"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-5 bg-[#D4A843] hover:bg-[#C99A38] text-[#1A1413] font-semibold text-sm px-6 py-2.5 rounded-full transition-colors"
          >
            Order on WhatsApp
          </a>
        </div>

        {/* Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Quick Links */}
          <div>
            <h3 className="font-heading text-sm font-semibold text-[#D4A843] uppercase tracking-widest mb-5">
              Quick Links
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-[#F5F0E8]/60 hover:text-[#D4A843] text-sm transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-[#F5F0E8]/60 hover:text-[#D4A843] text-sm transition-colors"
                >
                  Cookies
                </Link>
              </li>
              <li>
                <Link
                  href="/brownies"
                  className="text-[#F5F0E8]/60 hover:text-[#D4A843] text-sm transition-colors"
                >
                  Brownies
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-[#F5F0E8]/60 hover:text-[#D4A843] text-sm transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-[#F5F0E8]/60 hover:text-[#D4A843] text-sm transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-heading text-sm font-semibold text-[#D4A843] uppercase tracking-widest mb-5">
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/privacy"
                  className="text-[#F5F0E8]/60 hover:text-[#D4A843] text-sm transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-[#F5F0E8]/60 hover:text-[#D4A843] text-sm transition-colors"
                >
                  Terms of Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading text-sm font-semibold text-[#D4A843] uppercase tracking-widest mb-5">
              Contact
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:ccrispocookies@gmail.com"
                  className="flex items-center gap-2 text-[#F5F0E8]/60 hover:text-[#D4A843] text-sm transition-colors"
                >
                  <Mail size={16} />
                  ccrispocookies@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+917569831560"
                  className="flex items-center gap-2 text-[#F5F0E8]/60 hover:text-[#D4A843] text-sm transition-colors"
                >
                  <Phone size={16} />
                  +91 75698 31560
                </a>
              </li>
              <li>
                <span className="flex items-start gap-2 text-[#F5F0E8]/60 text-sm">
                  <MapPin size={16} className="mt-0.5 shrink-0" />
                  Nellore, Andhra Pradesh
                </span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-heading text-sm font-semibold text-[#D4A843] uppercase tracking-widest mb-5">
              Social
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://www.instagram.com/rahul.bites"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#F5F0E8]/60 hover:text-[#D4A843] text-sm transition-colors"
                >
                  <InstagramIcon className="w-4 h-4" />
                  @rahul.bites
                </a>
              </li>
              <li>
                <a
                  href="https://www.youtube.com/@Rahul-Bites"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#F5F0E8]/60 hover:text-[#D4A843] text-sm transition-colors"
                >
                  <YoutubeIcon className="w-4 h-4" />
                  @Rahul-Bites
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* FSSAI */}
        <div className="mt-12 text-center">
          <p className="text-[#F5F0E8]/40 text-xs">
            FSSAI License No. 20126182000873
          </p>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#F5F0E8]/10">
        <div className="container-tight mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#F5F0E8]/40 text-sm">
            © 2026 CRISPO COOKIES. All Rights Reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://www.instagram.com/rahul.bites"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D4A843]/60 hover:text-[#D4A843] transition-colors"
              aria-label="Instagram"
            >
              <InstagramIcon className="w-[18px] h-[18px]" />
            </a>
            <a
              href="https://www.youtube.com/@Rahul-Bites"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D4A843]/60 hover:text-[#D4A843] transition-colors"
              aria-label="YouTube"
            >
              <YoutubeIcon className="w-[18px] h-[18px]" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}