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
import { InstagramIcon, YoutubeIcon } from "@/components/social-icons";

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
      <section className="py-12 sm:py-16 text-center">
        <div className="container-tight">
          <p className="eyebrow">Get In Touch</p>
          <h1 className="font-heading text-4xl sm:text-section text-royal font-bold mt-3">
            Let&apos;s Talk Cookies
          </h1>
          <p className="text-muted mt-3 max-w-xl mx-auto text-lg">
            Questions, bulk orders, or custom gifts? We&apos;d love to hear
            from you — we reply personally, usually within a day.
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
                className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    SEND ENQUIRY
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT — Contact Info */}
          <div className="flex flex-col gap-4">
            <div className="surface-card rounded-3xl p-7 sm:p-8">
              <h2 className="font-heading text-xl font-semibold text-royal mb-6">
                Contact Information
              </h2>
              <div className="space-y-5">
                {[
                  {
                    icon: <MapPin size={20} className="text-gold" />,
                    label: "Visit Us",
                    primary: "Nellore, Andhra Pradesh",
                    sub: "Baked fresh & shipped across India",
                    href: undefined as string | undefined,
                  },
                  {
                    icon: <Phone size={20} className="text-gold" />,
                    label: "Call Us",
                    primary: "+91 75698 31560",
                    sub: "Mon–Sat, 9am–8pm IST",
                    href: "tel:+917569831560",
                  },
                  {
                    icon: <Mail size={20} className="text-gold" />,
                    label: "Email Us",
                    primary: "ccrispocookies@gmail.com",
                    sub: "Replies within a day",
                    href: "mailto:ccrispocookies@gmail.com",
                  },
                  {
                    icon: <InstagramIcon className="w-5 h-5 text-gold" />,
                    label: "Instagram",
                    primary: "@rahul.bites",
                    sub: "Daily bakes & behind-the-scenes",
                    href: "https://www.instagram.com/rahul.bites",
                  },
                  {
                    icon: <YoutubeIcon className="w-5 h-5 text-gold" />,
                    label: "YouTube",
                    primary: "@Rahul-Bites",
                    sub: "Full baking videos",
                    href: "https://www.youtube.com/@Rahul-Bites",
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-start gap-4 group">
                    <div className="w-11 h-11 rounded-2xl bg-gold/10 flex items-center justify-center shrink-0 group-hover:bg-gold/20 transition-colors">
                      {row.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-muted">
                        {row.label}
                      </p>
                      {row.href ? (
                        <a
                          href={row.href}
                          target={row.href.startsWith("http") ? "_blank" : undefined}
                          rel={row.href.startsWith("http") ? "noopener noreferrer" : undefined}
                          className="font-heading font-semibold text-royal hover:text-gold transition-colors break-all"
                        >
                          {row.primary}
                        </a>
                      ) : (
                        <p className="font-heading font-semibold text-royal">
                          {row.primary}
                        </p>
                      )}
                      <p className="text-muted text-xs mt-0.5">{row.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <a
              href="https://wa.me/917569831560"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-3xl p-7 bg-royal text-cream shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4"
            >
              <span className="w-12 h-12 rounded-2xl bg-gold/20 flex items-center justify-center shrink-0">
                <MessageCircle size={22} className="text-gold-soft" />
              </span>
              <span>
                <span className="block text-[11px] font-bold tracking-[0.18em] uppercase text-cream/60">
                  Fastest Response
                </span>
                <span className="block font-heading font-semibold text-lg">
                  Chat on WhatsApp
                </span>
              </span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
