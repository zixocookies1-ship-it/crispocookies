"use client";

import Link from "next/link";
import { Truck, ShieldCheck, Leaf, MessageCircle } from "lucide-react";
import { WHATSAPP_LINK } from "@/lib/storefront";

const benefits = [
  {
    icon: Truck,
    title: "Fast Delivery",
    desc: "Baked fresh, shipped in 24 hrs · 2–3 day delivery.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Checkout",
    desc: "100% secure payments via Razorpay.",
  },
  {
    icon: Leaf,
    title: "100% ZERO MAIDHA",
    desc: "Made with pure oats. No preservatives, ever.",
  },
  {
    icon: MessageCircle,
    title: "We're Here to Help",
    desc: "Chat with us on WhatsApp anytime.",
    href: WHATSAPP_LINK,
  },
];

export default function BenefitsSection() {
  return (
    <section aria-label="Why shop with us" className="bg-white border-y border-royal/5">
      <div className="container-tight py-6">
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 lg:grid lg:grid-cols-4 lg:gap-6 lg:mx-0 lg:px-0">
          {benefits.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <span className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-11 h-11 rounded-full bg-royal/5 text-royal flex items-center justify-center shrink-0">
                    <Icon size={22} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-royal truncate">
                      {item.title}
                    </span>
                    <span className="block text-xs text-muted mt-0.5 truncate">
                      {item.desc}
                    </span>
                  </span>
                </span>
              </>
            );
            const cls =
              "shrink-0 w-[240px] lg:w-auto bg-cream rounded-2xl px-4 py-3 flex items-center gap-3";
            return item.href ? (
              <Link
                key={item.title}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cls + " hover:shadow-soft transition-shadow"}
              >
                {content}
              </Link>
            ) : (
              <div key={item.title} className={cls}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}