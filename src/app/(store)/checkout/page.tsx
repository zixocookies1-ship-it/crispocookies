"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice } from "@/lib/helpers";

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

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const getTotal = useCartStore((s) => s.getTotal);
  const clearCart = useCartStore((s) => s.clearCart);
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);

  const subtotal = getTotal();
  const delivery = subtotal >= 499 ? 0 : 49;
  const total = subtotal + delivery;

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
    if (!validate()) return;
    setLoading(true);

    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });

      if (!orderRes.ok) throw new Error("Failed to create order");
      const orderData = await orderRes.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Crispo Cookies",
        description: "Order Payment",
        order_id: orderData.id,
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
              }),
            });

            if (!verifyRes.ok) throw new Error("Payment verification failed");
            const verifyData = await verifyRes.json();
            clearCart();
            router.push(`/order-success?orderId=${verifyData.orderId || orderData.id}`);
          } catch {
            toast.error("Payment verification failed. Contact support.");
          }
        },
        prefill: {
          name: form.fullName,
          email: form.email,
          contact: form.phone,
        },
        theme: { color: "#8B6410" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
      });
      rzp.open();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
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
              {items.map((item) => (
                <div
                   key={`${item.productId}-${item.variant.weight}`}
                  className="flex gap-3 items-start"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cream to-gold/10 flex items-center justify-center shrink-0">
                    <span className="text-lg select-none">🍪</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-royal text-sm font-medium truncate">{item.name}</p>
                     <p className="text-muted text-xs">{item.variant.weight} × {item.qty}</p>
                  </div>
                  <span className="text-royal font-medium text-sm whitespace-nowrap">
                     {formatPrice(item.variant.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-royal/10 pt-3 space-y-2 mb-4">
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
              className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
