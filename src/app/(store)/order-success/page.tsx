"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Package } from "lucide-react";
import { Suspense } from "react";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "CR" + Date.now();

  return (
    <div className="bg-cream-dark min-h-screen flex items-center justify-center">
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-6 animate-[scale-in_0.5s_ease-out]">
          <CheckCircle className="text-green h-10 w-10" />
        </div>

        <h1 className="font-heading text-3xl font-bold text-royal mb-3">
          Order Placed Successfully!
        </h1>
        <p className="text-muted mb-2">
          Thank you for your order. We&apos;re baking your cookies with love.
        </p>
        <p className="text-gold font-bold text-lg mb-8">
          {orderId}
        </p>

        <div className="bg-surface rounded-2xl shadow-warm p-6 mb-8 text-left">
          <div className="flex items-center gap-3 mb-4">
            <Package className="text-gold h-5 w-5" />
            <h3 className="font-heading font-semibold text-royal">
              What&apos;s Next?
            </h3>
          </div>
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex items-start gap-2">
              <span className="text-gold mt-0.5">•</span>
              We&apos;ll send you an email confirmation
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold mt-0.5">•</span>
              Cookies baked fresh and shipped within 24 hours
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold mt-0.5">•</span>
              Estimated delivery: 2–3 business days
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/shop" className="btn-gold">
            Continue Shopping
          </Link>
          <Link href="/" className="btn-royal-outline">
            Track Order
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-cream-dark min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
