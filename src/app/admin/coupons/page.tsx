"use client";

import { useState, useEffect, useCallback } from "react";
import { formatPrice } from "@/lib/helpers";

type CouponStatus = "active" | "scheduled" | "expired" | "exhausted" | "inactive";

interface Coupon {
  _id: string;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minimumOrderValue: number;
  maximumDiscount: number;
  startDate: string;
  expiryDate: string;
  maxTotalUses: number;
  maxUsesPerCustomer: number;
  totalUsed: number;
  active: boolean;
  firstOrderOnly: boolean;
  applicableProducts: string[];
  excludedProducts: string[];
  applicableCategories: string[];
  excludedCategories: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: CouponStatus;
  remainingUses: number | null;
  discountLabel: string;
}

interface CouponStats {
  activeCoupons: number;
  totalCoupons: number;
  totalUses: number;
  totalDiscountGiven: number;
  mostUsedCoupon: { code: string; uses: number } | null;
  highestDiscountCoupon: { couponCode?: string; couponDiscount?: number } | null;
  expiringSoon: { code: string; expiryDate: string }[];
}

interface UsageRow {
  couponCode: string;
  orderId: string;
  customerName: string;
  email: string;
  phone: string;
  discountAmount: number;
  orderSubtotal: number;
  orderTotal: number;
  usedAt: string;
  orderStatus: string;
  paymentStatus: string;
}

interface ProductOption {
  _id: string;
  name: string;
  category?: { name: string } | null;
}

interface CategoryOption {
  _id: string;
  name: string;
}

const EMPTY_FORM = {
  code: "",
  description: "",
  discountType: "percentage" as "percentage" | "fixed",
  discountValue: "10",
  minimumOrderValue: "",
  maximumDiscount: "",
  startDate: "",
  expiryDate: "",
  maxTotalUses: "",
  maxUsesPerCustomer: "",
  firstOrderOnly: false,
  active: true,
  applicableProducts: [] as string[],
  excludedProducts: [] as string[],
  applicableCategories: [] as string[],
  excludedCategories: [] as string[],
};

type FormState = typeof EMPTY_FORM;

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

const statusBadge = (status: CouponStatus) => {
  const styles: Record<CouponStatus, string> = {
    active: "badge-green",
    scheduled: "badge-blue",
    expired: "badge-grey",
    exhausted: "badge-red",
    inactive: "badge-amber",
  };
  return styles[status] || "badge-grey";
};

const GENERATE_PREFIXES = [
  "WELCOME",
  "SAVE",
  "FESTIVE",
  "NEWUSER",
  "CRISPO",
  "EXTRA",
  "FRESH",
];

function generateCode(existing: string[]): string {
  const prefix =
    GENERATE_PREFIXES[Math.floor(Math.random() * GENERATE_PREFIXES.length)];
  let code = `${prefix}${Math.floor(Math.random() * 90) + 10}`;
  for (let i = 0; i < 20; i++) {
    if (!existing.includes(code)) return code;
    code = `${prefix}${Math.floor(Math.random() * 90) + 10}`;
  }
  return `${prefix}${Date.now().toString().slice(-4)}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  title,
  value,
  icon,
  sub,
}: {
  title: string;
  value: string;
  icon: string;
  sub?: string;
}) {
  return (
    <div className="card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#666666] font-medium">{title}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="font-heading font-bold text-black text-2xl mt-2">
        {value}
      </p>
      {sub && <p className="text-xs text-[#666666] mt-1 truncate">{sub}</p>}
    </div>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-xl w-full my-8"
        style={wide ? { maxWidth: "860px" } : { maxWidth: "720px" }}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="font-heading font-bold text-black text-lg">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-[#666666] hover:text-black text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="font-heading font-bold text-black text-lg mb-2">
          {title}
        </h3>
        <p className="text-sm text-[#666666] mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[#666666] hover:text-black transition-colors"
          >
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-red text-sm">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-black mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-[#A3A3C2] mt-1">{hint}</p>}
    </div>
  );
}

const inputCls =
  "input-field w-full text-sm";

function CheckboxList({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: Array<{ _id: string; label: string }>;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div>
      <p className="text-sm font-medium text-black mb-1">{title}</p>
      <input
        className={inputCls}
        placeholder={`Search ${title.toLowerCase()}...`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-50">
        {filtered.length === 0 && (
          <p className="text-xs text-[#A3A3C2] p-3">No options</p>
        )}
        {filtered.map((o) => {
          const checked = selected.includes(o._id);
          return (
            <label
              key={o._id}
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  onChange(
                    checked
                      ? selected.filter((id) => id !== o._id)
                      : [...selected, o._id]
                  )
                }
                className="w-4 h-4 accent-black"
              />
              <span className="text-black truncate">{o.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTotalUsed, setEditingTotalUsed] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [detail, setDetail] = useState<Coupon | null>(null);
  const [usageFocus, setUsageFocus] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    rows: UsageRow[];
    total: number;
    loaded: boolean;
  }>({ rows: [], total: 0, loaded: false });

  const [confirm, setConfirm] = useState<{
    open: boolean;
    kind: "archive" | "delete";
    id: string;
    code: string;
    used: number;
  } | null>(null);
  const [toast, setToast] = useState("");

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", String(page));
      const res = await fetch(`/api/admin/coupons?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCoupons(Array.isArray(data.coupons) ? data.coupons : []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/coupons/stats");
      if (res.ok) setStats(await res.json());
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const loadFormOptions = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        fetch("/api/admin/products?limit=200"),
        fetch("/api/admin/categories"),
      ]);
      if (pRes.ok) {
        const data = await pRes.json();
        setProducts(Array.isArray(data.products) ? data.products : []);
      }
      if (cRes.ok) {
        const data = await cRes.json();
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch {
      /* options are optional refinements */
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setEditingTotalUsed(0);
  };

  const startCreate = () => {
    resetForm();
    setShowForm(true);
    loadFormOptions();
  };

  const startEdit = (c: Coupon) => {
    setEditingId(c._id);
    setEditingTotalUsed(c.totalUsed);
    setForm({
      code: c.code,
      description: c.description || "",
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      minimumOrderValue: c.minimumOrderValue ? String(c.minimumOrderValue) : "",
      maximumDiscount: c.maximumDiscount ? String(c.maximumDiscount) : "",
      startDate: toLocalInput(c.startDate),
      expiryDate: toLocalInput(c.expiryDate),
      maxTotalUses: c.maxTotalUses ? String(c.maxTotalUses) : "",
      maxUsesPerCustomer: c.maxUsesPerCustomer
        ? String(c.maxUsesPerCustomer)
        : "",
      firstOrderOnly: c.firstOrderOnly,
      active: c.active,
      applicableProducts: c.applicableProducts || [],
      excludedProducts: c.excludedProducts || [],
      applicableCategories: c.applicableCategories || [],
      excludedCategories: c.excludedCategories || [],
    });
    setShowForm(true);
    loadFormOptions();
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const code = generateCode(
        coupons.map((c) => c.code).concat(form.code ? [form.code] : [])
      );
      setForm({ ...form, code });
      setGenerating(false);
    }, 250);
  };

  const validateForm = (): string | null => {
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,32}$/.test(code))
      return "Coupon code must be 2–32 letters, numbers, - or _";
    const value = Number(form.discountValue);
    if (!Number.isFinite(value) || value <= 0)
      return "Discount must be greater than 0";
    if (form.discountType === "percentage" && value > 100)
      return "Percentage discount must be 100 or less";
    const minOrder = Number(form.minimumOrderValue || 0);
    if (form.minimumOrderValue && (!Number.isFinite(minOrder) || minOrder < 0))
      return "Minimum order cannot be negative";
    const maxDisc = Number(form.maximumDiscount || 0);
    if (
      form.maximumDiscount &&
      (!Number.isFinite(maxDisc) || maxDisc < 0)
    )
      return "Maximum discount cannot be negative";
    const start = fromLocalInput(form.startDate);
    const expiry = fromLocalInput(form.expiryDate);
    if (!start) return "Start date is required";
    if (!expiry) return "Expiry date is required";
    if (new Date(expiry).getTime() <= new Date(start).getTime())
      return "Expiry must be after the start date";
    const maxUses = Number(form.maxTotalUses || 0);
    if (
      form.maxTotalUses &&
      (!Number.isFinite(maxUses) || maxUses < 0)
    )
      return "Maximum total uses must be 0 or a positive whole number";
    const perCustomer = Number(form.maxUsesPerCustomer || 0);
    if (
      form.maxUsesPerCustomer &&
      (!Number.isFinite(perCustomer) || perCustomer < 0)
    )
      return "Per-customer limit must be 0 or a positive whole number";
    return null;
  };

  const saveCoupon = async () => {
    const err = validateForm();
    if (err) {
      setToast(err);
      return;
    }
    setSaving(true);
    try {
      const body = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minimumOrderValue: form.minimumOrderValue
          ? Number(form.minimumOrderValue)
          : 0,
        maximumDiscount: form.maximumDiscount
          ? Number(form.maximumDiscount)
          : 0,
        startDate: fromLocalInput(form.startDate),
        expiryDate: fromLocalInput(form.expiryDate),
        maxTotalUses: form.maxTotalUses ? Number(form.maxTotalUses) : 0,
        maxUsesPerCustomer: form.maxUsesPerCustomer
          ? Number(form.maxUsesPerCustomer)
          : 0,
        firstOrderOnly: form.firstOrderOnly,
        active: form.active,
        applicableProducts: form.applicableProducts,
        excludedProducts: form.excludedProducts,
        applicableCategories: form.applicableCategories,
        excludedCategories: form.excludedCategories,
      };
      const res = editingId
        ? await fetch(`/api/admin/coupons/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/admin/coupons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (res.ok) {
        setToast(editingId ? "Coupon updated!" : `Coupon ${body.code} created!`);
        setShowForm(false);
        resetForm();
        fetchCoupons();
        fetchStats();
      } else {
        const data = await res.json();
        setToast(data.error || "Failed to save coupon");
      }
    } catch {
      setToast("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Coupon) => {
    try {
      const res = await fetch(`/api/admin/coupons/${c._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !c.active }),
      });
      if (res.ok) {
        setToast(c.active ? `${c.code} deactivated` : `${c.code} activated`);
        fetchCoupons();
        fetchStats();
      } else {
        const data = await res.json();
        setToast(data.error || "Failed to update coupon");
      }
    } catch {
      setToast("Something went wrong");
    }
  };

  const openUsage = async (id: string, code: string) => {
    setUsageFocus(`${id}:${code}`);
    setUsage({ rows: [], total: 0, loaded: false });
  };

  useEffect(() => {
    if (!usageFocus) return;
    const id = usageFocus.split(":")[0];
    fetch(`/api/admin/coupons/${id}/usage`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setUsage({ rows: data.usage || [], total: data.total || 0, loaded: true });
        } else {
          setUsage({ rows: [], total: 0, loaded: true });
        }
      })
      .catch(() => setUsage({ rows: [], total: 0, loaded: true }));
  }, [usageFocus]);

  const confirmAction = async () => {
    if (!confirm) return;
    try {
      const res = await fetch(`/api/admin/coupons/${confirm.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setToast(`${confirm.code} deleted`);
      } else {
        const data = await res.json();
        setToast(data.error || "Could not delete coupon");
      }
      fetchCoupons();
      fetchStats();
    } catch {
      setToast("Something went wrong");
    } finally {
      setConfirm(null);
    }
  };

  const productLabel = (id: string) =>
    products.find((p) => p._id === id)?.name || id;
  const categoryLabel = (id: string) =>
    categories.find((c) => c._id === id)?.name || id;

  const discounted = editingTotalUsed > 0;
  const productOptions = products.map((p) => ({
    _id: p._id,
    label: p.category?.name ? `${p.name} (${p.category.name})` : p.name,
  }));
  const categoryOptions = categories.map((c) => ({ _id: c._id, label: c.name }));

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 bg-[#16A34A] text-white px-4 py-3 rounded-lg shadow-lg z-[70] flex items-center gap-2 max-w-md">
          <span>{toast}</span>
          <button
            onClick={() => setToast("")}
            className="ml-2 text-white/80 hover:text-white shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading font-bold text-black text-xl">
            Coupons
          </h2>
          <p className="text-xs text-[#666666] mt-1">
            Discount codes validated by the server at checkout and payment.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="btn-gold text-sm"
        >
          + Create Coupon
        </button>
      </div>

      {/* Analytics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Coupons"
          value={String(stats?.activeCoupons ?? "—")}
          icon="✅"
        />
        <StatCard
          title="Total Coupons"
          value={String(stats?.totalCoupons ?? "—")}
          icon="🏷️"
        />
        <StatCard
          title="Total Coupon Uses"
          value={String(stats?.totalUses ?? "—")}
          icon="🎯"
          sub={
            stats?.mostUsedCoupon
              ? `Most used: ${stats.mostUsedCoupon.code}`
              : undefined
          }
        />
        <StatCard
          title="Total Discount Given"
          value={formatPrice(stats?.totalDiscountGiven ?? 0)}
          icon="💰"
          sub={
            stats?.highestDiscountCoupon?.couponCode
              ? `Top: ${stats.highestDiscountCoupon.couponCode}`
              : undefined
          }
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search coupon code..."
          className="input-field text-sm w-56"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field text-sm w-44"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="expired">Expired</option>
          <option value="exhausted">Usage limit reached</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="text-xs text-[#666666]">
          {total} coupon{total !== 1 ? "s" : ""}
        </span>
        {stats && stats.expiringSoon.length > 0 && (
          <span className="text-xs text-[#D97706] font-medium ml-auto">
            ⏳ Expiring soon:{" "}
            {stats.expiringSoon.map((e) => e.code).slice(0, 3).join(", ")}
          </span>
        )}
      </div>

      {/* List */}
      <div className="card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#666666] border-b border-gray-100 bg-gray-50/50">
                <th className="py-3 px-4 font-medium">Code</th>
                <th className="py-3 px-4 font-medium">Description</th>
                <th className="py-3 px-4 font-medium">Discount</th>
                <th className="py-3 px-4 font-medium">Minimum</th>
                <th className="py-3 px-4 font-medium">Usage</th>
                <th className="py-3 px-4 font-medium">Starts</th>
                <th className="py-3 px-4 font-medium">Expires</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-50 animate-pulse">
                    <td className="py-4 px-4" colSpan={9}>
                      <div className="h-4 bg-gray-200 rounded w-40" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <p className="text-[#DC2626] mb-3">Failed to load coupons</p>
                    <button onClick={fetchCoupons} className="btn-gold text-sm">
                      Retry
                    </button>
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-[#666666]">
                    No coupons{search ? " match your search" : " yet"} — create
                    your first coupon.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr
                    key={c._id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <button
                        onClick={() => setDetail(c)}
                        className="font-mono font-bold text-black hover:text-black transition-colors"
                        title="View details"
                      >
                        {c.code}
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[#666666] text-xs line-clamp-2 max-w-[200px] block">
                        {c.description || "-"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-black font-semibold">
                      {c.discountLabel}
                    </td>
                    <td className="py-4 px-4 text-[#666666]">
                      {c.minimumOrderValue
                        ? formatPrice(c.minimumOrderValue)
                        : "—"}
                    </td>
                    <td className="py-4 px-4 text-[#666666] whitespace-nowrap">
                      {c.totalUsed}
                      {c.maxTotalUses ? ` / ${c.maxTotalUses}` : " / ∞"}
                    </td>
                    <td className="py-4 px-4 text-[#666666] text-xs whitespace-nowrap">
                      {formatDateTime(c.startDate)}
                    </td>
                    <td className="py-4 px-4 text-[#666666] text-xs whitespace-nowrap">
                      {formatDateTime(c.expiryDate)}
                    </td>
                    <td className="py-4 px-4">
                      <span className={statusBadge(c.status)}>{c.status}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <button
                          onClick={() => setDetail(c)}
                          className="text-black hover:text-gray-800 transition-colors"
                          title="Details"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => openUsage(c._id, c.code)}
                          className="text-[#666666] hover:text-black transition-colors text-xs font-medium"
                          title="Usage history"
                        >
                          History
                        </button>
                        <button
                          onClick={() => startEdit(c)}
                          className="text-black hover:text-gray-800 transition-colors"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => toggleActive(c)}
                          className={`text-sm font-medium transition-colors ${
                            c.active
                              ? "text-[#666666] hover:text-black"
                              : "text-[#16A34A] hover:text-green-700"
                          }`}
                          title={c.active ? "Deactivate" : "Activate"}
                        >
                          {c.active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() =>
                            setConfirm({
                              open: true,
                              kind: c.totalUsed > 0 ? "archive" : "delete",
                              id: c._id,
                              code: c.code,
                              used: c.totalUsed,
                            })
                          }
                          className="text-[#DC2626] hover:text-red-700 transition-colors"
                          title={c.totalUsed > 0 ? "Archive" : "Delete"}
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

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-[#666666]">
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-[#666666] disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-[#666666] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create / Edit form ─────────────────────────────── */}
      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          resetForm();
        }}
        title={editingId ? `Edit ${form.code}` : "Create Coupon"}
        wide
      >
        <div className="space-y-4">
          {discounted && (
            <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
              This coupon has {editingTotalUsed} successful use(s). To preserve
              order history, code, discount type/value, first-order-only and
              per-customer limit are locked.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Coupon Code" hint="Stored uppercase. wELCOME10 = WELCOME10">
              <div className="flex gap-2">
                <input
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  disabled={discounted}
                  className={`${inputCls} font-mono uppercase disabled:opacity-60`}
                  placeholder="WELCOME10"
                />
                <button
                  onClick={handleGenerate}
                  disabled={generating || discounted}
                  className="btn-navy-outline text-sm shrink-0 disabled:opacity-50"
                >
                  {generating ? "..." : "Generate"}
                </button>
              </div>
            </Field>
            <Field label="Description">
              <input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className={inputCls}
                placeholder="10% off your order"
              />
            </Field>

            <Field label="Discount Type">
              <select
                value={form.discountType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    discountType: e.target.value as "percentage" | "fixed",
                  })
                }
                disabled={discounted}
                className={`${inputCls} disabled:opacity-60`}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </Field>
            <Field
              label={form.discountType === "percentage" ? "Discount Value (%)" : "Discount Value (₹)"}
              hint={
                form.discountType === "percentage"
                  ? "Between 1 and 100"
                  : "Flat amount off the eligible subtotal"
              }
            >
              <input
                value={form.discountValue}
                onChange={(e) =>
                  setForm({ ...form, discountValue: e.target.value })
                }
                disabled={discounted}
                type="number"
                min={0}
                className={`${inputCls} disabled:opacity-60`}
              />
            </Field>

            <Field label="Minimum Order Value (₹)" hint="0 = no minimum">
              <input
                value={form.minimumOrderValue}
                onChange={(e) =>
                  setForm({ ...form, minimumOrderValue: e.target.value })
                }
                type="number"
                min={0}
                className={inputCls}
              />
            </Field>
            <Field
              label="Maximum Discount (₹)"
              hint={
                form.discountType === "percentage"
                  ? "Cap for % coupons. 0 = no cap"
                  : "Usually ignored for fixed coupons"
              }
            >
              <input
                value={form.maximumDiscount}
                onChange={(e) =>
                  setForm({ ...form, maximumDiscount: e.target.value })
                }
                type="number"
                min={0}
                className={inputCls}
              />
            </Field>

            <Field label="Start Date & Time">
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
                className={inputCls}
              />
            </Field>
            <Field label="Expiry Date & Time">
              <input
                type="datetime-local"
                value={form.expiryDate}
                onChange={(e) =>
                  setForm({ ...form, expiryDate: e.target.value })
                }
                className={inputCls}
              />
            </Field>

            <Field
              label="Maximum Total Uses"
              hint="0 = unlimited. Only successful paid orders count."
            >
              <input
                value={form.maxTotalUses}
                onChange={(e) =>
                  setForm({ ...form, maxTotalUses: e.target.value })
                }
                type="number"
                min={0}
                className={inputCls}
              />
            </Field>
            <Field
              label="Maximum Uses Per Customer"
              hint="0 = unlimited. Based on the customer's email/phone."
            >
              <input
                value={form.maxUsesPerCustomer}
                onChange={(e) =>
                  setForm({ ...form, maxUsesPerCustomer: e.target.value })
                }
                disabled={discounted}
                type="number"
                min={0}
                className={`${inputCls} disabled:opacity-60`}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CheckboxList
              title="Applicable Products (empty = all)"
              options={productOptions}
              selected={form.applicableProducts}
              onChange={(ids) => setForm({ ...form, applicableProducts: ids })}
            />
            <CheckboxList
              title="Excluded Products"
              options={productOptions}
              selected={form.excludedProducts}
              onChange={(ids) => setForm({ ...form, excludedProducts: ids })}
            />
            <CheckboxList
              title="Applicable Categories (empty = all)"
              options={categoryOptions}
              selected={form.applicableCategories}
              onChange={(ids) =>
                setForm({ ...form, applicableCategories: ids })
              }
            />
            <CheckboxList
              title="Excluded Categories"
              options={categoryOptions}
              selected={form.excludedCategories}
              onChange={(ids) => setForm({ ...form, excludedCategories: ids })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-3 text-sm text-black cursor-pointer">
              <input
                type="checkbox"
                checked={form.firstOrderOnly}
                onChange={(e) =>
                  setForm({ ...form, firstOrderOnly: e.target.checked })
                }
                disabled={discounted}
                className="w-4 h-4 accent-black disabled:opacity-60"
              />
              First order only
            </label>
            <label className="flex items-center gap-3 text-sm text-black cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 accent-black"
              />
              Active (can be applied now)
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={saveCoupon}
              disabled={saving}
              className="btn-gold text-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Coupon"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-4 py-2 text-sm text-[#666666] hover:text-black transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Details modal ──────────────────────────────────── */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Coupon ${detail.code}` : ""}
      >
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-3 items-center">
              {detail.firstOrderOnly && (
                <span className="badge-blue">First order only</span>
              )}
              <span className={statusBadge(detail.status)}>{detail.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <span className="text-[#666666]">Description</span>
              <span className="text-black text-right">
                {detail.description || "-"}
              </span>
              <span className="text-[#666666]">Discount</span>
              <span className="text-black text-right font-semibold">
                {detail.discountLabel}
              </span>
              <span className="text-[#666666]">Minimum Order</span>
              <span className="text-black text-right">
                {detail.minimumOrderValue
                  ? formatPrice(detail.minimumOrderValue)
                  : "None"}
              </span>
              <span className="text-[#666666]">Maximum Discount</span>
              <span className="text-black text-right">
                {detail.maximumDiscount
                  ? formatPrice(detail.maximumDiscount)
                  : "None"}
              </span>
              <span className="text-[#666666]">Starts</span>
              <span className="text-black text-right">
                {formatDateTime(detail.startDate)}
              </span>
              <span className="text-[#666666]">Expires</span>
              <span className="text-black text-right">
                {formatDateTime(detail.expiryDate)}
              </span>
              <span className="text-[#666666]">Usage</span>
              <span className="text-black text-right">
                {detail.totalUsed} / {detail.maxTotalUses || "∞"}
              </span>
              <span className="text-[#666666]">Remaining</span>
              <span className="text-black text-right">
                {detail.remainingUses === null
                  ? "Unlimited"
                  : detail.remainingUses}
              </span>
              <span className="text-[#666666]">Per Customer</span>
              <span className="text-black text-right">
                {detail.maxUsesPerCustomer || "Unlimited"}
              </span>
              <span className="text-[#666666]">Applicable Products</span>
              <span className="text-black text-right">
                {detail.applicableProducts.length
                  ? detail.applicableProducts.slice(0, 3).map(productLabel).join(", ") +
                    (detail.applicableProducts.length > 3 ? "…" : "")
                  : "All"}
              </span>
              <span className="text-[#666666]">Excluded Products</span>
              <span className="text-black text-right">
                {detail.excludedProducts.length
                  ? detail.excludedProducts.slice(0, 3).map(productLabel).join(", ") +
                    (detail.excludedProducts.length > 3 ? "…" : "")
                  : "None"}
              </span>
              <span className="text-[#666666]">Applicable Categories</span>
              <span className="text-black text-right">
                {detail.applicableCategories.length
                  ? detail.applicableCategories.slice(0, 3).map(categoryLabel).join(", ") +
                    (detail.applicableCategories.length > 3 ? "…" : "")
                  : "All"}
              </span>
              <span className="text-[#666666]">Excluded Categories</span>
              <span className="text-black text-right">
                {detail.excludedCategories.length
                  ? detail.excludedCategories.slice(0, 3).map(categoryLabel).join(", ") +
                    (detail.excludedCategories.length > 3 ? "…" : "")
                  : "None"}
              </span>
              <span className="text-[#666666]">Created</span>
              <span className="text-black text-right">
                {formatDateTime(detail.createdAt)}
              </span>
              <span className="text-[#666666]">Last Updated</span>
              <span className="text-black text-right">
                {formatDateTime(detail.updatedAt)}
              </span>
              <span className="text-[#666666]">Created By</span>
              <span className="text-black text-right">
                {detail.createdBy || "-"}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Usage history modal ────────────────────────────── */}
      <Modal
        open={!!usageFocus}
        onClose={() => setUsageFocus(null)}
        title={`Usage history — ${usageFocus?.split(":")[1] || ""} (${usage.total})`}
        wide
      >
        {!usage.loaded ? (
          <div className="h-24 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
          </div>
        ) : usage.rows.length === 0 ? (
          <p className="text-center text-[#666666] py-8">
            No successful uses yet. Usage is recorded only after a payment is
            verified.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#666666] border-b border-gray-100">
                  <th className="pb-3 font-medium">Order</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Discount</th>
                  <th className="pb-3 font-medium text-right">Subtotal</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                  <th className="pb-3 font-medium">Used At</th>
                </tr>
              </thead>
              <tbody>
                {usage.rows.map((row) => (
                  <tr key={row.orderId} className="border-b border-gray-50 last:border-0">
                    <td className="py-3">
                      <span className="font-medium text-black">
                        {row.orderId}
                      </span>
                      <span className="block text-xs text-[#A3A3C2]">
                        {row.paymentStatus} · {row.orderStatus}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-black">{row.customerName || "-"}</span>
                      <span className="block text-xs text-[#A3A3C2]">
                        {row.email || row.phone || "-"}
                      </span>
                    </td>
                    <td className="py-3 text-[#16A34A] font-semibold">
                      −{formatPrice(row.discountAmount)}
                    </td>
                    <td className="py-3 text-right text-[#666666]">
                      {formatPrice(row.orderSubtotal)}
                    </td>
                    <td className="py-3 text-right font-medium text-black">
                      {formatPrice(row.orderTotal)}
                    </td>
                    <td className="py-3 text-[#666666] text-xs whitespace-nowrap">
                      {formatDateTime(row.usedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* ── Archive / delete confirm ───────────────────────── */}
      <ConfirmModal
        open={!!confirm}
        title={
          confirm?.kind === "archive" ? "Archive Coupon" : "Delete Coupon"
        }
        message={
          confirm?.kind === "archive"
            ? `"${confirm?.code}" has been used ${confirm?.used}×. Deleting would destroy order history, so it will be deactivated instead. Continue?`
            : `Delete "${confirm?.code}"? This cannot be undone.`
        }
        confirmLabel={confirm?.kind === "archive" ? "Deactivate" : "Delete"}
        onConfirm={confirmAction}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}