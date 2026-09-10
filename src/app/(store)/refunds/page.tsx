import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refunds & Returns",
  description:
    "Our refund and replacement policy for Crispo Cookies orders.",
};

const sections = [
  {
    h: "Damaged or wrong items",
    p: "If your order arrives damaged, melted, or with the wrong items, tell us within 48 hours of delivery with your order ID and a photo of the issue. We will arrange a replacement or a full refund — your choice.",
  },
  {
    h: "Taste & quality promise",
    p: "Every batch is baked fresh with no preservatives. If something tastes off or stale on arrival, contact us within 48 hours and we will make it right with a replacement or refund.",
  },
  {
    h: "How refunds work",
    p: "Approved refunds are issued to your original payment method within 5–7 working days through Razorpay. Prepaid order cancellations made before dispatch receive a full refund; once dispatched, the damaged-item process above applies.",
  },
  {
    h: "Non-returnable",
    p: "Because our products are fresh food items, we cannot accept returns for change-of-mind once delivered. If you are unsure, start with a small box — or message us first and we will help you choose.",
  },
  {
    h: "How to reach us",
    p: "WhatsApp us at +91 75698 31560 or email ccrispocookies@gmail.com with your order ID. We respond personally — no bots, no ticket queues.",
  },
];

export default function RefundsPage() {
  return (
    <div className="bg-cream-dark min-h-screen">
      <section className="py-14 sm:py-16 text-center">
        <div className="container-tight">
          <p className="eyebrow">No Worries</p>
          <h1 className="font-heading text-4xl sm:text-section text-royal font-bold mt-3">
            Refunds & Returns
          </h1>
          <p className="text-muted mt-3 max-w-xl mx-auto">
            Fresh food, honest policy. If we get it wrong, we fix it.
          </p>
        </div>
      </section>
      <section className="container-tight max-w-3xl pb-20 space-y-5">
        {sections.map((s) => (
          <article key={s.h} className="surface-card rounded-2xl p-6 sm:p-8">
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
