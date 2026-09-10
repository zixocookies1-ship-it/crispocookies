import { MessageCircle } from "lucide-react";
import { WHATSAPP_LINK } from "@/lib/storefront";

export default function FloatingWhatsApp() {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed right-4 md:right-6 z-40 flex items-center gap-2.5 bg-[#1FA855] text-white pl-4 pr-4 sm:pr-5 py-3 rounded-full shadow-[0_16px_32px_-12px_rgba(31,168,85,0.65)] ring-1 ring-white/25 hover:bg-[#25D366] hover:shadow-[0_16px_36px_-10px_rgba(37,211,102,0.7)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 bottom-[calc(72px+env(safe-area-inset-bottom))] md:bottom-6"
    >
      <span className="relative shrink-0">
        <MessageCircle size={22} fill="white" className="text-[#1FA855] group-hover:text-[#25D366] transition-colors" />
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-white ring-2 ring-[#1FA855] group-hover:ring-[#25D366] transition-all" aria-hidden="true" />
      </span>
      <span className="hidden sm:inline text-sm font-bold tracking-wide">Need help?</span>
      <span className="hidden sm:inline text-[11px] font-medium text-white/80">Chat with us</span>
    </a>
  );
}