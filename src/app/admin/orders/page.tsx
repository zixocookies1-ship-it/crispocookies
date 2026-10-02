"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/helpers";

interface Order {
  _id: string;
  orderId: string;
  customerName: string;
  phone: string;
  totalItems: number;
  total: number;
  paymentStatus: string;
  status: string;
  waybill?: string | null;
  shipmentStatus?: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface MissingPayment {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaise: number;
  status: string;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50 animate-pulse">
      {[...Array(9)].map((_, i) => (
        <td key={i} className="py-4 px-4">
          <div className="h-4 bg-gray-200 rounded w-20" />
        </td>
      ))}
    </tr>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const perPage = 10;
  const [missing, setMissing] = useState<MissingPayment[]>([]);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileError, setReconcileError] = useState("");
  const [delhiveryPending, setDelhiveryPending] = useState<number | null>(null);
  const [syncingDelhivery, setSyncingDelhivery] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const fetchReconcile = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/payments/reconcile");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMissing(data.missing || []);
    } catch {
      setReconcileError("Could not load reconciliation data.");
    }
  }, []);

  /** How many paid orders still have no Delhivery AWB. */
  const fetchDelhiveryPending = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/shipping/sync-pending");
      if (!res.ok) return;
      const data = await res.json();
      setDelhiveryPending(
        typeof data.awaiting === "number" ? data.awaiting : 0
      );
    } catch {
      // Leave it unknown rather than showing a wrong 0.
      setDelhiveryPending(null);
    }
  }, []);

  useEffect(() => {
    fetchReconcile();
    fetchDelhiveryPending();
  }, [fetchReconcile, fetchDelhiveryPending]);

  /**
   * Batch "Sync Pending Delhivery Orders" — recovers paid orders that never
   * received an AWB without waiting for the daily cron. Runs server-side and
   * asks for confirmation first: this talks to a live courier API.
   */
  const syncPendingShipments = async () => {
    if (!delhiveryPending) return;
    if (
      !window.confirm(
        `Sync ${delhiveryPending} paid order(s) that have no Delhivery AWB yet?\n\n` +
          "Each one is sent to Delhivery individually; failures are reported per order."
      )
    ) {
      return;
    }
    setSyncingDelhivery(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/admin/shipping/sync-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100, includeBlocked: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncMessage(data.error || "Batch sync failed.");
        return;
      }
      setSyncMessage(
        `Sync finished: ${data.synced ?? 0} AWB created, ` +
          `${data.failed ?? 0} failed, ${data.remaining ?? 0} still pending.` +
          (data.stoppedEarly ? " Ran out of time — press again for the rest." : "")
      );
      setDelhiveryPending(
        typeof data.remaining === "number" ? data.remaining : 0
      );
    } catch {
      setSyncMessage("Batch sync failed.");
    } finally {
      setSyncingDelhivery(false);
    }
  };

  const finalizePayment = async (entry: MissingPayment) => {
    setReconciling(true);
    setReconcileError("");
    try {
      const res = await fetch("/api/admin/payments/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: entry.razorpayOrderId,
          razorpayPaymentId: entry.razorpayPaymentId,
          amountPaise: entry.amountPaise,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data.code === "ORDER_NOT_FOUND") {
          setReconcileError(
            "No local snapshot exists for this payment — the customer may have used an old page. Order can't be reconstructed automatically."
          );
        } else {
          setReconcileError(data.error || data.code || "Finalization failed.");
        }
        return;
      }
      setMissing((prev) =>
        prev.filter((p) => p.razorpayOrderId !== entry.razorpayOrderId)
      );
    } catch {
      setReconcileError("Finalization failed. Please retry.");
    } finally {
      setReconciling(false);
    }
  };

  const fetchOrders = useCallback(
    async (opts?: { silent?: boolean }) => {
      // A background refresh must not blank out the table the admin is reading.
      if (!opts?.silent) {
        setLoading(true);
        setError(false);
      }
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(perPage),
        });
        if (search) params.set("search", search);
        if (paymentFilter) params.set("paymentStatus", paymentFilter);
        if (statusFilter) params.set("status", statusFilter);
        if (dateFrom) params.set("from", dateFrom);
        if (dateTo) params.set("to", dateTo);

        const res = await fetch(`/api/admin/orders?${params}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setOrders(data.orders || []);
        setTotalPages(data.totalPages || 1);
        setTotalOrders(data.total || 0);
      } catch {
        if (!opts?.silent) setError(true);
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [page, search, statusFilter, paymentFilter, dateFrom, dateTo]
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Keep the list honest about payment status without hammering the API.
  // `paymentStatus` is now written to "paid" by the server the moment the
  // gateway confirms, so a modest interval is enough to reflect it; the tab is
  // only refreshed while it is actually visible, and it pauses while a request
  // is already in flight.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.visibilityState === "hidden") return;

    let cancelled = false;
    const interval = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      if (cancelled) return;
      void fetchOrders({ silent: true });
    }, 30_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchOrders({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchOrders]);

  const exportCSV = () => {
    if (orders.length === 0) return;
    const headers = ["Order ID", "Customer", "Phone", "Items", "Total", "Payment", "Status", "Date"];
    const rows = orders.map((o) => [
      o.orderId,
      o.customerName,
      o.phone,
      o.totalItems,
      o.total,
      o.paymentStatus,
      o.status,
      new Date(o.createdAt).toLocaleDateString("en-IN"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const paymentBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: "badge-green",
      failed: "badge-red",
      pending: "badge-amber",
      refunded: "badge-indigo",
    };
    return styles[String(status).toLowerCase()] || "badge-grey";
  };

  const paymentFilterLabels: Record<string, string> = {
    paid: "Paid",
    pending: "Payment Pending",
    failed: "Payment Failed",
    refunded: "Refunded",
  };

  const hasActiveFilters = Boolean(
    search || statusFilter || paymentFilter || dateFrom || dateTo
  );

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPaymentFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Processing: "badge-blue",
      Confirmed: "badge-gold",
      Shipped: "badge-indigo",
      Delivered: "badge-green",
      Cancelled: "badge-grey",
    };
    return styles[status] || "badge-grey";
  };

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by ID, name, phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input-field text-sm"
        />
        <select
          value={paymentFilter}
          onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
          className="input-field text-sm"
          title="Payment Status"
        >
          <option value="">All Orders</option>
          <option value="paid">Paid</option>
          <option value="pending">Payment Pending</option>
          <option value="failed">Payment Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field text-sm"
        >
          <option value="">All Status</option>
          <option value="Processing">Processing</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Shipped">Shipped</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="input-field text-sm"
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="input-field text-sm"
          placeholder="To"
        />
        <button onClick={exportCSV} className="btn-navy-outline text-sm whitespace-nowrap">
          Export CSV
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="btn-navy-outline text-sm whitespace-nowrap"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Active payment filter summary + count */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-sm text-[#666666]">
          Payment Status:{" "}
          <span className="font-medium text-black">
            {paymentFilter ? paymentFilterLabels[paymentFilter] : "All Orders"}
          </span>{" "}
          ·{" "}
          <span className="font-semibold text-black">
            {totalOrders} orders
          </span>
        </p>
        {paymentFilter === "refunded" && (
          <p className="text-xs text-[#666666]">
            Refunds aren&apos;t tracked by the current payment schema, so this
            list is expected to be empty.
          </p>
        )}
      </div>

      {/* Payment reconciliation */}
      <div className={`card rounded-2xl p-5 ${missing.length ? "border-2 border-red/30" : ""}`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-bold text-black text-sm">Razorpay Reconciliation</h2>
          <button
            onClick={() => { setReconcileError(""); fetchReconcile(); }}
            className="text-xs text-black hover:text-gray-700 font-medium"
          >
            Refresh
          </button>
        </div>
        {reconcileError && (
          <p className="text-[#DC2626] text-xs mb-3">{reconcileError}</p>
        )}
        {missing.length === 0 ? (
          <p className="text-xs text-[#666666]">
            No paid Razorpay payments are missing a local order. ✓
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#666666] border-b border-gray-100">
                  <th className="py-2 px-3 font-medium text-xs">Razorpay Order</th>
                  <th className="py-2 px-3 font-medium text-xs">Payment</th>
                  <th className="py-2 px-3 font-medium text-xs">Amount</th>
                  <th className="py-2 px-3 font-medium text-xs">Status</th>
                  <th className="py-2 px-3 font-medium text-xs" />
                </tr>
              </thead>
              <tbody>
                {missing.map((p) => (
                  <tr key={p.razorpayPaymentId} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 px-3 font-mono text-xs">{p.razorpayOrderId}</td>
                    <td className="py-2.5 px-3 font-mono text-xs">{p.razorpayPaymentId}</td>
                    <td className="py-2.5 px-3 text-xs">{formatPrice(p.amountPaise / 100)}</td>
                    <td className="py-2.5 px-3">
                      <span className="badge-red">{p.status}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => finalizePayment(p)}
                        disabled={reconciling}
                        className="btn-gold text-xs px-3 py-1.5 disabled:opacity-60"
                      >
                        {reconciling ? "Finalizing..." : "Finalize"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delhivery sync backlog */}
      {delhiveryPending !== null && delhiveryPending > 0 && (
        <div className="card rounded-2xl p-5 border-2 border-amber-300">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-black text-sm">Delhivery sync</h2>
              <p className="text-xs text-[#666666] mt-1">
                {delhiveryPending} paid order
                {delhiveryPending === 1 ? "" : "s"} still{" "}
                {delhiveryPending === 1 ? "has" : "have"} no AWB.
              </p>
              {syncMessage && (
                <p className="text-xs text-black mt-1">{syncMessage}</p>
              )}
            </div>
            <button
              onClick={syncPendingShipments}
              disabled={syncingDelhivery}
              className="btn-gold text-xs px-3 py-1.5 disabled:opacity-60"
            >
              {syncingDelhivery ? "Syncing..." : "Sync pending Delhivery orders"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#666666] border-b border-gray-100 bg-gray-50/50">
                <th className="py-3 px-4 font-medium">Order ID</th>
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">Phone</th>
                <th className="py-3 px-4 font-medium">Items</th>
                <th className="py-3 px-4 font-medium">Total</th>
                <th className="py-3 px-4 font-medium">Payment</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">AWB</th>
                <th className="py-3 px-4 font-medium">Date</th>
                <th className="py-3 px-4 font-medium">View</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : error ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <p className="text-[#DC2626] mb-3">Failed to load orders</p>
                    <button onClick={() => void fetchOrders()} className="btn-gold text-sm">Retry</button>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-[#666666]">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4 font-medium text-black">
                      {order.orderId}
                    </td>
                    <td className="py-4 px-4 text-[#666666]">{order.customerName}</td>
                    <td className="py-4 px-4 text-[#666666]">{order.phone}</td>
                    <td className="py-4 px-4 text-[#666666]">{order.totalItems}</td>
                    <td className="py-4 px-4 font-medium text-black">
                      {formatPrice(order.total)}
                    </td>
                    <td className="py-4 px-4">
                      <span className={paymentBadge(order.paymentStatus)}>
                        {String(order.paymentStatus).toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={statusBadge(order.status)}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-[#666666]">
                      {order.waybill || "—"}
                    </td>
                    <td className="py-4 px-4 text-[#666666] text-xs">
                      {new Date(order.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-4 px-4">
                      <Link
                        href={`/admin/orders/${order._id}`}
                        className="text-black hover:text-gray-800 transition-colors"
                        title="View Order"
                      >
                        👁️
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-navy-outline text-sm disabled:opacity-40"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? "bg-black text-white"
                  : "text-[#666666] hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-navy-outline text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
