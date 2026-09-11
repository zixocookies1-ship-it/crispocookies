import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that apply when you shop with Crispo Cookies.",
};

const sections = [
  {
    h: "Orders & pricing",
    p: "All prices are listed in Indian Rupees and include applicable taxes. An order is confirmed only after successful payment through our checkout. We reserve the right to cancel an order (with a full refund) if a product is unavailable or a pricing error occurred.",
  },
  {
    h: "Delivery",
    p: "Products are baked fresh and dispatched within 24 hours. Typical delivery takes 2–3 working days depending on your location. A flat delivery charge of ₹100 applies to every order. Please share a complete address and reachable phone number at checkout.",
  },
  {
    h: "Freshness & storage",
    p: "Our cookies and brownies contain no preservatives. For best taste, store them in an airtight container in a cool, dry place and consume within the best-before period mentioned on the pack.",
  },
  {
    h: "No returns & no refunds",
    p: "All sales are final. Because our products are fresh baked-to-order food items, we do not accept returns, exchanges or refunds for any reason. Please review your order and delivery details carefully before paying.",
  },
  {
    h: "Fair use",
    p: "Product photos, descriptions and branding on this website belong to Crispo Cookies and may not be copied or reused without permission. Please use the website lawfully and do not place fraudulent orders.",
  },
  {
    h: "Changes",
    p: "We may update these terms from time to time. Continued use of the website after changes means you accept the updated terms. For questions, reach us at ccrispocookies@gmail.com or +91 75698 31560.",
  },
];

export default function TermsPage() {
  return (
    <div className="bg-cocoa min-h-screen">
      <section className="py-14 sm:py-16 text-center">
        <div className="container-tight">
          <p className="eyebrow">Good To Know</p>
          <h1 className="font-heading text-4xl sm:text-section text-cream font-bold mt-3">
            Terms of Service
          </h1>
          <p className="text-muted mt-3 max-w-xl mx-auto">
            Clear terms for a smooth, sweet experience.
          </p>
        </div>
      </section>
      <section className="container-tight max-w-3xl pb-20 space-y-5">
        {sections.map((s) => (
          <article key={s.h} className="surface-card rounded-2xl p-6 sm:p-8">
            <h2 className="font-heading text-xl font-semibold text-cream mb-2">
              {s.h}
            </h2>
            <p className="text-muted leading-relaxed">{s.p}</p>
          </article>
        ))}
        <div className="text-center pt-4">
          <Link href="/shop" className="crispo-btn-gold">
            Shop Now
          </Link>
        </div>
      </section>
    </div>
  );
}
