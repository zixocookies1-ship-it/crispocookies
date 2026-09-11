import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "No Refunds & Returns",
  description:
    "Our returns and refund policy for Crispo Cookies orders — all sales are final.",
};

const sections = [
  {
    h: "No returns",
    p: "All sales are final. Because our cookies and brownies are fresh food items baked to order, we cannot accept returns or exchanges for any order once it is placed.",
  },
  {
    h: "No refunds",
    p: "We do not offer refunds on any order — for change of mind, incorrect choice, late delivery or any other reason. Please review your selection carefully before you pay.",
  },
  {
    h: "Order confirmation",
    p: "Please double-check the products, quantities and your delivery address at checkout. Orders cannot be cancelled, changed or refunded after payment is completed.",
  },
  {
    h: "Food safety",
    p: "For hygiene and food-safety reasons, fresh baked goods are non-returnable and non-refundable under any circumstances.",
  },
  {
    h: "Have a question?",
    p: "If you are unsure before ordering, WhatsApp us at +91 75698 31560 or email ccrispocookies@gmail.com and we will help you choose the right box before you pay.",
  },
];

export default function RefundsPage() {
  return (
    <div className="bg-cocoa min-h-screen">
      <section className="py-14 sm:py-16 text-center">
        <div className="container-tight">
          <p className="eyebrow">Please Note</p>
          <h1 className="font-heading text-4xl sm:text-section text-cream font-bold mt-3">
            No Refunds &amp; Returns
          </h1>
          <p className="text-muted mt-3 max-w-xl mx-auto">
            All sales are final — no returns, no refunds, no exchanges.
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
          <Link href="/contact" className="crispo-btn-gold">
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
