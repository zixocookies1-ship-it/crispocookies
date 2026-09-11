"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice } from "@/lib/helpers";
import { getActivePromotion, unitPriceWithDiscount } from "@/lib/promotion";
import { ActivePromotion } from "@/lib/pricing-math";

interface FormData {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
}

const initialForm: FormData = {
  fullName: "",
  phone: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const SRC = "https://checkout.razorpay.com/v1/checkout.js";
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [promotion, setPromotion] = useState<ActivePromotion | null>(null);
  const processingRef = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    getActivePromotion()
      .then((promo) => {
        if (!cancelled) setPromotion(promo);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const linePricing = items.map((item) => {
    const pricing = unitPriceWithDiscount(item.variant.price, promotion);
    return {
      key: `${item.productId}-${item.variant.weight}`,
      item,
      ...pricing,
      lineTotal: pricing.final * item.qty,
      originalLineTotal: pricing.original * item.qty,
      lineDiscount: pricing.discount * item.qty,
    };
  });

  // Client-side preview only — create-order/verify-payment recompute these
  // authoritative totals on the server before any money moves.
  const subtotal = linePricing.reduce((s, l) => s + l.originalLineTotal, 0);
  const promoDiscount = linePricing.reduce((s, l) => s + l.lineDiscount, 0);
  const delivery = subtotal >= 499 ? 0 : 49;
  const total = subtotal - promoDiscount + delivery;

  if (!mounted) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = (): boolean => {
    if (!form.fullName.trim()) { toast.error("Please enter your name"); return false; }
    if (!/^\d{10}$/.test(form.phone)) { toast.error("Please enter a valid 10-digit phone number"); return false; }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) { toast.error("Please enter a valid email"); return false; }
    if (!form.addressLine1.trim()) { toast.error("Please enter your address"); return false; }
    if (!form.city.trim()) { toast.error("Please enter your city"); return false; }
    if (!form.state.trim()) { toast.error("Please enter your state"); return false; }
    if (!/^\d{6}$/.test(form.pincode)) { toast.error("Please enter a valid 6-digit pincode"); return false; }
    return true;
  };

  const handlePayment = async () => {
    if (processingRef.current) return;
    if (!validate()) return;
    processingRef.current = true;
    setLoading(true);

    try {
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        toast.error("Payment gateway failed to load. Please try again.");
        return;
      }

      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            variant: item.variant.weight,
            qty: item.qty,
          })),
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create order");
      }
      const orderData = await orderRes.json();

      const options = {
        key: orderData.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Crispo Cookies",
        description: "Order Payment",
        order_id: orderData.orderId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                customerName: form.fullName,
                email: form.email,
                phone: form.phone,
                address: {
                  line1: form.addressLine1,
                  line2: form.addressLine2,
                  city: form.city,
                  state: form.state,
                  pincode: form.pincode,
                },
                items: orderData.items,
                subtotal: orderData.subtotal,
                deliveryCharge: orderData.deliveryCharge,
                total: orderData.total,
              }),
            });

            if (!verifyRes.ok) throw new Error("Payment verification failed");
            const verifyData = await verifyRes.json();
            clearCart();
            router.push(`/order-success?orderId=${verifyData.orderId}`);
          } catch {
            toast.error("Payment verification failed. Contact support.");
          }
        },
        prefill: {
          name: form.fullName,
          email: form.email,
          contact: form.phone,
        },
        theme: { color: "#1B1B4B" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
      });
      rzp.open();
    } catch {
      toast.error("Payment could not be initialized. Please try again.");
    } finally {
      processingRef.current = false;
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-cream-dark min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-royal font-heading text-xl mb-4">Your cart is empty</p>
          <a href="/shop" className="btn-gold">Start Shopping</a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cream-dark min-h-screen">
      <div className="container-tight py-8">
        <h1 className="font-heading text-4xl text-royal font-bold">
          Checkout
        </h1>
      </div>

      <div className="container-tight pb-16 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-3">
          <h2 className="font-heading text-xl font-semibold text-royal mb-6">
            Delivery Details
          </h2>
          <div className="bg-surface rounded-2xl shadow-soft p-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-royal mb-1">Full Name</label>
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="John Doe"
                  autoComplete="name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-royal mb-1">Phone</label>
                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="9876543210"
                  maxLength={10}
                  autoComplete="tel-national"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-royal mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-royal mb-1">Address Line 1</label>
                <input
                  name="addressLine1"
                  value={form.addressLine1}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="123 Main Street"
                  autoComplete="address-line1"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-royal mb-1">Address Line 2 (Optional)</label>
                <input
                  name="addressLine2"
                  value={form.addressLine2}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Apartment, suite, etc."
                  autoComplete="address-line2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-royal mb-1">City</label>
                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Mumbai"
                  autoComplete="address-level2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-royal mb-1">State</label>
                <select
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  className="input-field"
                  autoComplete="address-level1"
                  required
                >
                  <option value="" disabled>Select your state</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                  <option value="Assam">Assam</option>
                  <option value="Bihar">Bihar</option>
                  <option value="Chhattisgarh">Chhattisgarh</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Goa">Goa</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Haryana">Haryana</option>
                  <option value="Himachal Pradesh">Himachal Pradesh</option>
                  <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                  <option value="Jharkhand">Jharkhand</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Manipur">Manipur</option>
                  <option value="Meghalaya">Meghalaya</option>
                  <option value="Mizoram">Mizoram</option>
                  <option value="Nagaland">Nagaland</option>
                  <option value="Odisha">Odisha</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Sikkim">Sikkim</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Telangana">Telangana</option>
                  <option value="Tripura">Tripura</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Uttarakhand">Uttarakhand</option>
                  <option value="West Bengal">West Bengal</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-royal mb-1">Pincode</label>
                <input
                  name="pincode"
                  value={form.pincode}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="400001"
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary */}
        <div className="lg:col-span-2">
          <div className="bg-surface rounded-2xl shadow-soft p-6 sticky top-24">
            <h2 className="font-heading text-lg font-semibold text-royal mb-6">
              Order Summary
            </h2>

            <div className="max-h-60 overflow-y-auto space-y-3 mb-4 pr-1">
              {linePricing.map((line) => (
                <div
                  key={line.key}
                  className="flex gap-3 items-start"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cream to-gold/10 flex items-center justify-center shrink-0">
                    <span className="text-lg select-none">🍪</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-royal text-sm font-medium truncate">{line.item.name}</p>
                    <p className="text-muted text-xs">{line.item.variant.weight} × {line.item.qty}</p>
                    {line.discount > 0 && (
                      <p className="text-muted text-[11px] line-through">
                        {formatPrice(line.original)} each
                      </p>
                    )}
                  </div>
                  <span className="text-royal font-medium text-sm whitespace-nowrap">
                    {formatPrice(line.lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-royal/10 pt-3 space-y-2 mb-4">
              {promoDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Launch Offer ({promotion?.discountValue}% off)</span>
                  <span className="text-[#16A34A] font-semibold">
                    −{formatPrice(promoDiscount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="text-royal font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Delivery</span>
                <span className={delivery === 0 ? "text-green font-medium" : "text-royal font-medium"}>
                  {delivery === 0 ? "Free" : formatPrice(delivery)}
                </span>
              </div>
            </div>

            <div className="border-t border-royal/10 my-4" />

            <div className="flex justify-between items-baseline mb-6">
              <span className="font-heading text-lg font-bold text-royal">Total</span>
              <span className="font-heading text-xl font-bold text-royal">{formatPrice(total)}</span>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="btn-primary w-full py-4 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                "Pay with Razorpay"
              )}
            </button>

            <p className="text-muted text-xs text-center mt-3">🔒 100% Secure Payment</p>
          </div>
        </div>
      </div>
    </div>
  );
}
