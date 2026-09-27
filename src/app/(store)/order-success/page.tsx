"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle, Clock, Package, RefreshCw } from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/helpers";

interface ReceiptItem {
  name: string;
  image: string;
  variant: string;
  qty: number;
  mrp: number | null;
  unitPrice: number | null;
  offerDiscount: number | null;
  price: number;
}

interface Receipt {
  found: boolean;
  orderId: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  orderStatus: string;
  verifiedAt: string | null;
  placedAt: string | null;
  customerName: string;
  items: ReceiptItem[];
  pricing: {
    catalogSubtotal: number;
    subtotalBeforeDiscount: number;
    /** Product total after the launch offer, before the coupon. */
    finalSubtotal: number;
    offerDiscount: number;
    couponDiscount: number;
    deliveryCharge: number;
    total: number;
  };
  promotion: { name: string; discountValue: number } | null;
  coupon: { code: string } | null;
  payment: { razorpayOrderId: string | null; razorpayPaymentId: string | null };
  shipment: { waybill: string | null; trackingUrl: string | null };
}

/** While a payment is unconfirmed the endpoint returns the state only. */
interface PendingState {
  found: true;
  orderId: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  orderStatus: string;
  placedAt: string | null;
  receiptAvailable: false;
}

const MAX_POLL_ATTEMPTS = 10;

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";

  const [state, setState] = useState<Receipt | PendingState | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setNotFound(res.status === 404);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as Receipt | PendingState;
      setState(data);
      setNotFound(false);
    } catch {
      // Network hiccup: leave the state alone and let the next poll retry.
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Only poll while the payment is genuinely unconfirmed, and stop as soon as
  // the server says it is paid. A normal checkout renders exactly once.
  useEffect(() => {
    if (!state || state.paymentStatus === "paid") return;
    let attempt = 0;
    const timer = setInterval(() => {
      attempt += 1;
      if (attempt > MAX_POLL_ATTEMPTS) {
        clearInterval(timer);
        return;
      }
      void load();
    }, 3000);
    return () => clearInterval(timer);
  }, [state, load]);

  if (loading) {
    return (
      <div className="bg-cocoa min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
          <p className="text-muted text-sm mt-4">Confirming your order…</p>
        </div>
      </div>
    );
  }

  if (notFound || !state?.found) {
    return (
      <div className="bg-cocoa min-h-screen flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="text-gold-soft h-10 w-10" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-cream mb-3">
            Order not found
          </h1>
          <p className="text-muted mb-8">
            We could not find that order reference. If you were charged, contact
            us with your payment id and we will reconcile it.
          </p>
          <Link href="/shop" className="crispo-btn-gold">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const paid = state.paymentStatus === "paid";
  const failed = state.paymentStatus === "failed";
  const receipt = paid ? (state as Receipt) : null;

  return (
    <div className="bg-cocoa min-h-screen flex items-center justify-center">
      <div className="max-w-lg mx-auto px-4 py-16 text-center w-full">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-[scale-in_0.5s_ease-out] ${
            paid ? "bg-green/10" : "bg-gold/10"
          }`}
        >
          {paid ? (
            <CheckCircle className="text-green h-10 w-10" />
          ) : (
            <Clock className="text-gold-soft h-10 w-10" />
          )}
        </div>

        <h1 className="font-heading text-3xl font-bold text-cream mb-2">
          {paid
            ? "Payment Successful"
            : failed
              ? "Payment Not Completed"
              : "Payment Processing"}
        </h1>
        <h2 className="font-heading text-xl font-semibold text-gold-soft mb-3">
          {paid ? "Order Confirmed" : "Awaiting Confirmation"}
        </h2>
        <p className="text-muted mb-2">
          {paid
            ? "Thank you for your order. We're baking your cookies with love."
            : failed
              ? "The payment was not completed, so no order was created. You can safely try again."
              : "Your bank is still confirming the payment. This page updates itself — no need to refresh."}
        </p>
        <p className="text-gold font-bold text-lg mb-8 font-mono break-all">
          {state.orderId}
        </p>

        {receipt && (
        <div className="bg-cacao rounded-2xl shadow-soft p-6 mb-6 text-left">
          <div className="flex justify-between items-baseline pb-3 mb-3 border-b border-gold/15">
            <span className="text-muted text-sm">Amount paid</span>
            <span className="font-heading text-xl font-bold text-cream">
              {formatPrice(receipt.pricing.total)}
            </span>
          </div>

          <ul className="space-y-3 mb-4">
            {receipt.items.map((item, i) => {
              const reference = item.mrp ?? null;
              const hasOffer = typeof reference === "number" && reference > item.price;
              return (
              <li key={`${item.name}-${item.variant}-${i}`} className="flex justify-between gap-3">
                <span className="text-muted text-sm min-w-0">
                  {item.name}
                  {item.variant ? (
                    <span className="text-faded"> · {item.variant}</span>
                  ) : null}
                  <span className="text-faded"> × {item.qty}</span>
                  {hasOffer ? (
                    <span className="block text-[11px] text-faded">
                      MRP {formatPrice(reference as number)} ·{" "}
                      {Math.round(
                        (((reference as number) - item.price) / (reference as number)) *
                          100
                      )}
                      % off
                    </span>
                  ) : null}
                </span>
                <span className="text-cream text-sm font-medium whitespace-nowrap">
                  {formatPrice(item.price * item.qty)}
                </span>
              </li>
              );
            })}
          </ul>

          <div className="space-y-2 pt-3 border-t border-gold/15 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal (MRP)</span>
              <span className="text-cream font-medium">
                {formatPrice(receipt.pricing.catalogSubtotal)}
              </span>
            </div>
            {receipt.pricing.offerDiscount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">
                  Offer{receipt.promotion ? ` (${receipt.promotion.name})` : ""}
                </span>
                <span className="text-[#16A34A] font-semibold">
                  −{formatPrice(receipt.pricing.offerDiscount)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted">After offer</span>
              <span className="text-cream font-medium">
                {formatPrice(receipt.pricing.finalSubtotal)}
              </span>
            </div>
            {receipt.pricing.couponDiscount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">
                  Coupon{receipt.coupon ? ` (${receipt.coupon.code})` : ""}
                </span>
                <span className="text-[#16A34A] font-semibold">
                  −{formatPrice(receipt.pricing.couponDiscount)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted">Delivery</span>
              <span className="text-cream font-medium">
                {receipt.pricing.deliveryCharge === 0
                  ? "Free"
                  : formatPrice(receipt.pricing.deliveryCharge)}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-1">
              <span className="font-heading font-bold text-cream">Total</span>
              <span className="font-heading font-bold text-cream">
                {formatPrice(receipt.pricing.total)}
              </span>
            </div>
          </div>

          {receipt.payment.razorpayPaymentId && (
            <p className="text-[11px] text-faded mt-4 pt-3 border-t border-gold/15 break-all">
              Payment ID: {receipt.payment.razorpayPaymentId}
            </p>
          )}
        </div>
        )}

        <div className="bg-cacao rounded-2xl shadow-soft p-6 mb-8 text-left">
          <div className="flex items-center gap-3 mb-4">
            <Package className="text-gold h-5 w-5" />
            <h3 className="font-heading font-semibold text-cream">
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
          <Link
            href={`/track?order=${encodeURIComponent(state.orderId)}`}
            className="inline-flex items-center gap-1.5 text-sm text-gold mt-4 hover:opacity-80 transition-opacity"
          >
            Track your order →
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/shop" className="crispo-btn-gold">
            Continue Shopping
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gold-soft/60 text-gold-soft font-semibold px-6 py-3 text-sm transition-colors hover:bg-gold/10"
          >
            Back to Home
          </Link>
        </div>

        {!paid && !failed && (
          <button
            onClick={() => void load()}
            className="mt-6 inline-flex items-center gap-2 text-xs text-muted hover:text-cream"
          >
            <RefreshCw size={12} /> Check payment status
          </button>
        )}

        {failed && (
          <Link href="/checkout" className="crispo-btn-gold mt-6">
            Try again
          </Link>
        )}
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-cocoa min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
