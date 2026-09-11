"use client";

import { useState, useEffect, useCallback } from "react";

interface Promotion {
  _id: string;
  name: string;
  discountType: "percentage";
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  status: "scheduled" | "active" | "expired" | "disabled";
  createdAt: string;
}

interface FormState {
  name: string;
  discountValue: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  name: "",
  discountValue: "60",
  startDate: "",
  endDate: "",
  isActive: true,
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function statusBadge(status: Promotion["status"]) {
  const styles: Record<Promotion["status"], string> = {
    active: "badge-green",
    scheduled: "badge-blue",
    expired: "badge-grey",
    disabled: "badge-amber",
  };
  return styles[status] || "badge-grey";
}

function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="font-heading font-bold text-[#1B1B4B] text-lg mb-2">{title}</h3>
        <p className="text-sm text-[#5A5A7A] mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-[#5A5A7A] hover:text-[#1B1B4B] transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-red text-sm">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: "",
    name: "",
  });
  const [toast, setToast] = useState("");

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/promotions");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPromotions(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (p: Promotion) => {
    setEditingId(p._id);
    setForm({
      name: p.name,
      discountValue: String(p.discountValue),
      startDate: toLocalInput(p.startDate),
      endDate: toLocalInput(p.endDate),
      isActive: p.isActive,
    });
    setShowForm(true);
  };

  const savePromotion = async () => {
    const start = fromLocalInput(form.startDate);
    const end = fromLocalInput(form.endDate);
    if (!form.name.trim()) {
      setToast("Promotion name is required");
      return;
    }
    const value = Number(form.discountValue);
    if (!Number.isFinite(value) || value < 1 || value > 100) {
      setToast("Discount must be between 1 and 100");
      return;
    }
    if (!start || !end) {
      setToast("Start and end date are required");
      return;
    }
    if (end.getTime() <= start.getTime()) {
      setToast("End date must be after start date");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        discountValue: value,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        isActive: form.isActive,
      };
      const res = editingId
        ? await fetch(`/api/admin/promotions/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/admin/promotions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (res.ok) {
        setToast(editingId ? "Promotion updated!" : "Promotion created!");
        setShowForm(false);
        resetForm();
        fetchPromotions();
      } else {
        const data = await res.json();
        setToast(data.error || "Failed to save promotion");
      }
    } catch {
      setToast("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Promotion) => {
    try {
      const res = await fetch(`/api/admin/promotions/${p._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      if (res.ok) {
        setToast(p.isActive ? "Promotion disabled" : "Promotion enabled");
        fetchPromotions();
      } else {
        const data = await res.json();
        setToast(data.error || "Failed to update promotion");
      }
    } catch {
      setToast("Something went wrong");
    }
  };

  const deletePromotion = async () => {
    try {
      const res = await fetch(`/api/admin/promotions/${deleteModal.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setToast("Promotion deleted!");
        setDeleteModal({ open: false, id: "", name: "" });
        fetchPromotions();
      } else {
        const data = await res.json();
        setToast(data.error || "Failed to delete promotion");
      }
    } catch {
      setToast("Something went wrong");
    }
  };

  const inputCls = (value: string) =>
    `input-field w-full text-sm ${value ? "" : "text-[#A3A3C2]"}`;

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 bg-[#16A34A] text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <span>{toast}</span>
          <button onClick={() => setToast("")} className="ml-2 text-white/80 hover:text-white">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-[#1B1B4B] text-xl">Promotions</h2>
          <p className="text-xs text-[#5A5A7A] mt-1">
            One active promotion is applied across the store. Being active now ends it for everyone immediately.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="btn-gold text-sm"
        >
          {showForm && !editingId ? "Cancel" : "+ New Promotion"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls(form.name)}
                placeholder="e.g. Launch Offer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">
                Discount (1–100%) <span className="text-xs text-[#5A5A7A]">of variant price</span>
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                className={inputCls(form.discountValue)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Valid From</label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="input-field w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Valid Until</label>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="input-field w-full text-sm"
              />
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm text-[#1B1B4B] cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 accent-[#8B6410]"
            />
            Enabled (show this discount on the store)
          </label>
          <div className="flex gap-3">
            <button onClick={savePromotion} disabled={saving} className="btn-gold text-sm disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Promotion"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-4 py-2 text-sm text-[#5A5A7A] hover:text-[#1B1B4B] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#5A5A7A] border-b border-gray-100 bg-gray-50/50">
                <th className="py-3 px-4 font-medium">Name</th>
                <th className="py-3 px-4 font-medium">Discount</th>
                <th className="py-3 px-4 font-medium">Starts</th>
                <th className="py-3 px-4 font-medium">Ends</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-50 animate-pulse">
                    <td className="py-4 px-4" colSpan={6}>
                      <div className="h-4 bg-gray-200 rounded w-40" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <p className="text-[#DC2626] mb-3">Failed to load promotions</p>
                    <button onClick={fetchPromotions} className="btn-gold text-sm">Retry</button>
                  </td>
                </tr>
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#5A5A7A]">
                    No promotions yet — create your first Launch Offer.
                  </td>
                </tr>
              ) : (
                promotions.map((p) => (
                  <tr key={p._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <span className="font-medium text-[#1B1B4B]">{p.name}</span>
                    </td>
                    <td className="py-4 px-4 text-[#8B6410] font-semibold">{p.discountValue}%</td>
                    <td className="py-4 px-4 text-[#5A5A7A] text-xs">
                      {new Date(p.startDate).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-4 px-4 text-[#5A5A7A] text-xs">
                      {new Date(p.endDate).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-4 px-4">
                      <span className={statusBadge(p.status)}>{p.status}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(p)}
                          className="text-[#8B6410] hover:text-[#7A5A0E] transition-colors"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => toggleActive(p)}
                          className={`text-sm font-medium transition-colors ${
                            p.isActive ? "text-[#5A5A7A] hover:text-[#1B1B4B]" : "text-[#16A34A] hover:text-green-700"
                          }`}
                          title={p.isActive ? "Disable" : "Enable"}
                        >
                          {p.isActive ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => setDeleteModal({ open: true, id: p._id, name: p.name })}
                          className="text-[#DC2626] hover:text-red-700 transition-colors"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={deleteModal.open}
        title="Delete Promotion"
        message={`Are you sure you want to delete "${deleteModal.name}"? Existing orders keep their records; the store simply stops applying it.`}
        onConfirm={deletePromotion}
        onCancel={() => setDeleteModal({ open: false, id: "", name: "" })}
      />
    </div>
  );
}