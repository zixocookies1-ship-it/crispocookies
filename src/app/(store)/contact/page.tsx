"use client";

import { useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Send,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="5"/>
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.56 12 19.56 12 19.56s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z"/>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
  </svg>
);

const products = [
  "Double Chocolate Cookie",
  "Rose Cookie",
  "Pineapple Cookie",
  "Dry Seeds Cookie",
  "All Mix Cookies",
  "Double Chocolate Oats Brownie",
  "Kaju Oats Brownie",
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    product: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Please fill in name and phone number.");
      return;
    }

    setLoading(true);

    const lines = [
      "Hello CRISPO COOKIES! I would like to enquire about your cookies and brownies.",
      `Name: ${form.name}`,
      `Phone: ${form.phone}`,
      `Email: ${form.email || "N/A"}`,
      `Product: ${form.product || "N/A"}`,
      `Message: ${form.message || "N/A"}`,
    ];
    const message = encodeURIComponent(lines.join("\n"));
    const url = `https://wa.me/917569831560?text=${message}`;
    window.open(url, "_blank");

    toast.success("Redirecting to WhatsApp...");
    setForm({ name: "", phone: "", email: "", product: "", message: "" });
    setLoading(false);
  };

  return (
    <div className="bg-cream-dark min-h-screen">
      {/* Hero Section */}
      <section className="py-16 text-center">
        <div className="container-tight">
          <p className="eyebrow">GET IN TOUCH</p>
          <h1 className="font-heading text-section text-royal font-bold mt-3">
            Contact Us
          </h1>
          <p className="text-muted mt-3 max-w-xl mx-auto">
            Have questions about our cookies or brownies? We&apos;d love to hear
            from you.
          </p>
        </div>
      </section>

      {/* Two-Column Layout */}
      <section className="container-tight pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* LEFT — Enquiry Form */}
          <div className="surface-card rounded-3xl p-8">
            <h2 className="font-heading text-xl font-semibold text-royal mb-6">
              Send an Enquiry
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-royal mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-royal mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-royal mb-1">
                  Email <span className="text-muted text-xs">(optional)</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-royal mb-1">
                  Product Interested In
                </label>
                <select
                  name="product"
                  value={form.product}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Select a product</option>
                  {products.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-royal mb-1">
                  Message
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={4}
                  className="input-field min-h-[120px] resize-y"
                  placeholder="Quantity, delivery date, gifting ideas…"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-gold flex items-center gap-2 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                SEND ENQUIRY
              </button>
            </form>
          </div>

          {/* RIGHT — Contact Info */}
          <div className="surface-card rounded-3xl p-8 flex flex-col justify-between">
            <div className="space-y-8">
              <h2 className="font-heading text-xl font-semibold text-royal">
                Contact Information
              </h2>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                  <MapPin size={20} className="text-gold" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-royal">Location</p>
                  <p className="text-muted text-sm mt-0.5">
                    Nellore, Andhra Pradesh
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                  <Phone size={20} className="text-gold" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-royal">Phone</p>
                  <a
                    href="tel:+917569831560"
                    className="text-muted text-sm mt-0.5 hover:text-gold transition-colors"
                  >
                    +91 75698 31560
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                  <Mail size={20} className="text-gold" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-royal">Email</p>
                  <a
                    href="mailto:ccrispocookies@gmail.com"
                    className="text-muted text-sm mt-0.5 hover:text-gold transition-colors"
                  >
                    ccrispocookies@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                  <InstagramIcon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-royal">Instagram</p>
                  <a
                    href="https://www.instagram.com/rahul.bites"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted text-sm mt-0.5 hover:text-gold transition-colors"
                  >
                    @rahul.bites
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                  <YoutubeIcon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-royal">YouTube</p>
                  <a
                    href="https://www.youtube.com/@Rahul-Bites"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted text-sm mt-0.5 hover:text-gold transition-colors"
                  >
                    @Rahul-Bites
                  </a>
                </div>
              </div>
            </div>

            <a
              href="https://wa.me/917569831560"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold flex items-center gap-2 w-full justify-center mt-10"
            >
              <MessageCircle size={18} />
              CHAT ON WHATSAPP
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
