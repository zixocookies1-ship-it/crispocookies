"use client";

import { useState } from "react";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import toast from "react-hot-toast";

const contactCards = [
  {
    icon: MapPin,
    label: "Address",
    value: "12 Baker Street, Bandra West, Mumbai 400001",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+91 98765 43210",
  },
  {
    icon: Mail,
    label: "Email",
    value: "hello@crispocookies.in",
  },
  {
    icon: Clock,
    label: "Business Hours",
    value: "Mon–Sat: 9:00 AM – 7:00 PM",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", message: "" });
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-cream-dark min-h-screen">
      <div className="container-tight py-8">
        <h1 className="font-heading text-4xl text-navy font-bold">
          Get in Touch
        </h1>
      </div>

      <div className="container-tight pb-16 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Form */}
        <div className="lg:col-span-3">
          <h2 className="font-heading text-xl font-semibold text-navy mb-6">
            Send Us a Message
          </h2>
          <div className="bg-surface rounded-2xl shadow-warm p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1">
                  Message
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  className="input-field min-h-[140px] resize-y"
                  placeholder="How can we help?"
                  rows={5}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-gold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Info Cards */}
        <div className="lg:col-span-2 space-y-4">
          {contactCards.map((card) => (
            <div
              key={card.label}
              className="bg-surface rounded-2xl shadow-warm p-6 flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                <card.icon size={20} className="text-gold" />
              </div>
              <div>
                <p className="font-heading font-semibold text-navy">
                  {card.label}
                </p>
                <p className="text-muted text-sm mt-0.5">{card.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
