import type { Metadata } from "next";
import StorefrontNavbar from "@/components/storefront-navbar";
import StorefrontFooter from "@/components/storefront-footer";
import FloatingWhatsApp from "@/components/floating-whatsapp";
import AnnouncementBar from "@/components/announcement-bar";

export const metadata: Metadata = {
  title: {
    default: "Crispo Cookies — Premium Handcrafted Cookies Delivered",
    template: "%s | Crispo Cookies",
  },
  description:
    "Premium artisan cookies baked fresh daily with the finest ingredients. Classic chocolate chip, buttery crunch, oatmeal delights and more. Order online for fast delivery.",
  openGraph: {
    title: "Crispo Cookies — Premium Handcrafted Cookies Delivered",
    description: "Premium artisan cookies baked fresh daily with the finest ingredients.",
    type: "website",
    locale: "en_IN",
  },
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <StorefrontNavbar />
      <main className="flex-1">{children}</main>
      <StorefrontFooter />
      <FloatingWhatsApp />
    </div>
  );
}
