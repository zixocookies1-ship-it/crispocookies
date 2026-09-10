import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Crispo Cookies collects, uses and protects your information when you shop with us.",
};

const sections = [
  {
    h: "Information we collect",
    p: "When you place an order or contact us, we collect your name, phone number, email address and delivery address. Payment details are processed securely by Razorpay — we never see or store your card, UPI or banking credentials.",
  },
  {
    h: "How we use it",
    p: "Your information is used only to confirm, deliver and support your order, and to respond to your enquiries. We do not sell, rent or share your personal information with third parties for marketing.",
  },
  {
    h: "Cookies & site data",
    p: "Our website stores a small amount of data in your browser (such as your cart and wishlist) so the shop works smoothly. No advertising trackers are used.",
  },
  {
    h: "Data security",
    p: "Order and account data is stored securely and is accessible only to our team for fulfilling orders. Payments are handled over encrypted connections by our PCI-DSS compliant payment partner.",
  },
  {
    h: "Your choices",
    p: "You can ask us at any time to correct or delete your personal information by writing to ccrispocookies@gmail.com or messaging us on WhatsApp at +91 75698 31560.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="bg-cream-dark min-h-screen">
      <section className="py-14 sm:py-16 text-center">
        <div className="container-tight">
          <p className="eyebrow">Our Promise</p>
          <h1 className="font-heading text-4xl sm:text-section text-royal font-bold mt-3">
            Privacy Policy
          </h1>
          <p className="text-muted mt-3 max-w-xl mx-auto">
            Simple, honest and transparent — just like our baking.
          </p>
        </div>
      </section>
      <section className="container-tight max-w-3xl pb-20 space-y-5">
        {sections.map((s) => (
          <article
            key={s.h}
            className="surface-card rounded-2xl p-6 sm:p-8"
          >
            <h2 className="font-heading text-xl font-semibold text-royal mb-2">
              {s.h}
            </h2>
            <p className="text-muted leading-relaxed">{s.p}</p>
          </article>
        ))}
        <div className="text-center pt-4">
          <Link href="/contact" className="btn-primary">
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
