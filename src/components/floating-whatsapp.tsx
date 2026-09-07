"use client";

import { MessageCircle } from "lucide-react";
import { WHATSAPP_LINK } from "@/lib/storefront";

export default function FloatingWhatsApp() {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed right-4 md:right-6 z-40 flex items-center gap-2 bg-[#25D366] text-white pl-4 pr-5 py-3 rounded-full shadow-[0_12px_28px_-10px_rgba(37,211,102,0.6)] hover:scale-105 active:scale-95 transition-transform duration-300 bottom-[calc(72px+env(safe-area-inset-bottom))] md:bottom-6"
    >
      <MessageCircle size={22} fill="white" className="shrink-0" />
      <span className="hidden sm:inline text-sm font-bold">Need help?</span>
    </a>
  );
}