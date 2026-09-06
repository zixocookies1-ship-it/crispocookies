"use client";

import { useState, useEffect } from "react";

interface Settings {
  storeName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  freeDeliveryAbove: number;
  deliveryCharge: number;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
}

const TABS = ["Store Info", "Delivery", "Payment Keys", "Social Links"] as const;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>("Store Info");
  const [settings, setSettings] = useState<Settings>({
    storeName: "",
    tagline: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    freeDeliveryAbove: 500,
    deliveryCharge: 50,
    razorpayKeyId: "",
    razorpayKeySecret: "",
    instagram: "",
    facebook: "",
    whatsapp: "",
  });
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") {
          setSettings((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: keyof Settings, value: string | number) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setToast("Settings saved successfully!");
      } else {
        const data = await res.json();
        setToast(data.error || "Failed to save settings");
      }
    } catch {
      setToast("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-32" />
        <div className="card rounded-2xl p-6">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-10 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 bg-[#16A34A] text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <span>{toast}</span>
          <button onClick={() => setToast("")} className="ml-2 text-white/80 hover:text-white">✕</button>
        </div>
      )}

      <h1 className="font-heading font-bold text-[#1B1B4B] text-2xl">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab
                ? "border-[#8B6410] text-[#8B6410]"
                : "border-transparent text-[#5A5A7A] hover:text-[#1B1B4B]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card rounded-2xl p-6">
        {activeTab === "Store Info" && (
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Store Name</label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => handleChange("storeName", e.target.value)}
                className="input-field w-full"
                placeholder="Crispo Cookies"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Tagline</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => handleChange("tagline", e.target.value)}
                className="input-field w-full"
                placeholder="Freshly baked happiness"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Contact Email</label>
              <input
                type="email"
                value={settings.contactEmail}
                onChange={(e) => handleChange("contactEmail", e.target.value)}
                className="input-field w-full"
                placeholder="hello@crispo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Contact Phone</label>
              <input
                type="tel"
                value={settings.contactPhone}
                onChange={(e) => handleChange("contactPhone", e.target.value)}
                className="input-field w-full"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Address</label>
              <textarea
                value={settings.address}
                onChange={(e) => handleChange("address", e.target.value)}
                className="input-field w-full h-20 resize-y"
                placeholder="Store address"
              />
            </div>
          </div>
        )}

        {activeTab === "Delivery" && (
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">
                Free Delivery Above (₹)
              </label>
              <input
                type="number"
                value={settings.freeDeliveryAbove}
                onChange={(e) => handleChange("freeDeliveryAbove", Number(e.target.value))}
                className="input-field w-full"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">
                Standard Delivery Charge (₹)
              </label>
              <input
                type="number"
                value={settings.deliveryCharge}
                onChange={(e) => handleChange("deliveryCharge", Number(e.target.value))}
                className="input-field w-full"
                min="0"
              />
            </div>
          </div>
        )}

        {activeTab === "Payment Keys" && (
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">
                Razorpay Key ID
              </label>
              <input
                type="password"
                value={settings.razorpayKeyId}
                onChange={(e) => handleChange("razorpayKeyId", e.target.value)}
                className="input-field w-full"
                placeholder="rzp_test_xxxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">
                Razorpay Key Secret
              </label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={settings.razorpayKeySecret}
                  onChange={(e) => handleChange("razorpayKeySecret", e.target.value)}
                  className="input-field w-full pr-10"
                  placeholder="xxxxxxxxxxxxxx"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A5A7A] hover:text-[#1B1B4B] transition-colors"
                >
                  {showSecret ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Social Links" && (
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Instagram</label>
              <input
                type="url"
                value={settings.instagram}
                onChange={(e) => handleChange("instagram", e.target.value)}
                className="input-field w-full"
                placeholder="https://instagram.com/crispocookies"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Facebook</label>
              <input
                type="url"
                value={settings.facebook}
                onChange={(e) => handleChange("facebook", e.target.value)}
                className="input-field w-full"
                placeholder="https://facebook.com/crispocookies"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">WhatsApp</label>
              <input
                type="tel"
                value={settings.whatsapp}
                onChange={(e) => handleChange("whatsapp", e.target.value)}
                className="input-field w-full"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pb-8">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="btn-gold px-8 py-3 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
