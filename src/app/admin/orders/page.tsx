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
  createdAt: string;
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 10;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(perPage),
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const res = await fetch(`/api/admin/orders?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchOrders();
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
      Paid: "badge-green",
      Failed: "badge-red",
      Pending: "badge-amber",
    };
    return styles[status] || "badge-grey";
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Processing: "badge-blue",
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
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field text-sm"
        >
          <option value="">All Status</option>
          <option value="Processing">Processing</option>
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
      </div>

      {/* Table */}
      <div className="card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#5A5A7A] border-b border-gray-100 bg-gray-50/50">
                <th className="py-3 px-4 font-medium">Order ID</th>
                <th className="py-3 px-4 font-medium">Customer</th>
                <th className="py-3 px-4 font-medium">Phone</th>
                <th className="py-3 px-4 font-medium">Items</th>
                <th className="py-3 px-4 font-medium">Total</th>
                <th className="py-3 px-4 font-medium">Payment</th>
                <th className="py-3 px-4 font-medium">Status</th>
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
                    <button onClick={fetchOrders} className="btn-gold text-sm">Retry</button>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-[#5A5A7A]">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4 font-medium text-[#1B1B4B]">
                      {order.orderId}
                    </td>
                    <td className="py-4 px-4 text-[#5A5A7A]">{order.customerName}</td>
                    <td className="py-4 px-4 text-[#5A5A7A]">{order.phone}</td>
                    <td className="py-4 px-4 text-[#5A5A7A]">{order.totalItems}</td>
                    <td className="py-4 px-4 font-medium text-[#1B1B4B]">
                      {formatPrice(order.total)}
                    </td>
                    <td className="py-4 px-4">
                      <span className={paymentBadge(order.paymentStatus)}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={statusBadge(order.status)}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-[#5A5A7A] text-xs">
                      {new Date(order.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-4 px-4">
                      <Link
                        href={`/admin/orders/${order._id}`}
                        className="text-[#8B6410] hover:text-[#7A5A0E] transition-colors"
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
                  ? "bg-[#8B6410] text-white"
                  : "text-[#5A5A7A] hover:bg-gray-100"
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
