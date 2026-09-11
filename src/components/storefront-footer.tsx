import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin } from "lucide-react";
import { InstagramIcon, YoutubeIcon, SOCIAL_LINKS } from "@/components/social-icons";

export default function StorefrontFooter() {
  return (
    <footer className="bg-[#1A1413] text-[#F5F0E8]">
      <div className="container-tight mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        {/* Top Section: Logo + Tagline */}
        <div className="text-center mb-14">
          <Link href="/" className="inline-flex items-center justify-center">
            <Image
              src="/logo.jpeg"
              alt="Crispo Cookies"
              width={128}
              height={64}
              className="h-16 w-auto object-contain mx-auto"
            />
          </Link>
          <p className="text-[#F5F0E8]/70 text-sm mt-4 max-w-xl mx-auto leading-relaxed">
            Baked to impress, made to crave. Premium oat-based cookies and
            brownies with 100% ZERO MAIDHA, handcrafted in Nellore.
          </p>
        </div>

        {/* Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-8">
          {/* Quick Links */}
          <div>
            <h3 className="font-heading text-sm font-semibold text-[#D4A843] uppercase tracking-widest mb-5">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {[{ label: "Home", href: "/" }].map((l) => (
                <li key={l.href + l.label}>
                  <Link
                    href={l.href}
                    className="text-[#F5F0E8]/60 hover:text-[#D4A843] text-sm transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
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
                  href={SOCIAL_LINKS.instagram}
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
                  href={SOCIAL_LINKS.youtube}
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
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D4A843]/60 hover:text-[#D4A843] transition-colors"
              aria-label="Instagram"
            >
              <InstagramIcon className="w-[18px] h-[18px]" />
            </a>
            <a
              href={SOCIAL_LINKS.youtube}
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