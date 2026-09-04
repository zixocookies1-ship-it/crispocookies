"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatPrice } from "@/lib/helpers";

interface OrderItem {
  productName: string;
  variant: string;
  quantity: number;
  price: number;
}

interface OrderData {
  _id: string;
  orderId: string;
  customerName: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  paymentStatus: string;
  razorpayPaymentId?: string;
  status: string;
  createdAt: string;
}

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/admin/orders/${params.id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setOrder(data);
        setNewStatus(data.status);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [params.id]);

  const updateStatus = async () => {
    if (!order || newStatus === order.status) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${order._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrder({ ...order, status: newStatus });
        setToast("Status updated successfully!");
      } else {
        setToast("Failed to update status");
      }
    } catch {
      setToast("Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  const printInvoice = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="card rounded-2xl p-6">
              <div className="space-y-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded w-3/4" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-20">
        <p className="text-[#DC2626] text-lg mb-4">Failed to load order</p>
        <Link href="/admin/orders" className="btn-gold text-sm">
          Back to Orders
        </Link>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Processing: "badge-blue",
      Shipped: "badge-indigo",
      Delivered: "badge-green",
      Cancelled: "badge-grey",
    };
    return styles[status] || "badge-grey";
  };

  const paymentBadge = (status: string) => {
    const styles: Record<string, string> = {
      Paid: "badge-green",
      Failed: "badge-red",
      Pending: "badge-amber",
    };
    return styles[status] || "badge-grey";
  };

  return (
    <>
      {toast && (
        <div className="fixed top-4 right-4 bg-[#16A34A] text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 no-print">
          <span>{toast}</span>
          <button onClick={() => setToast("")} className="ml-2 text-white/80 hover:text-white">✕</button>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 no-print">
        <Link href="/admin/orders" className="text-sm text-[#8B6410] hover:text-[#7A5A0E] font-medium">
          ← Back to Orders
        </Link>
        <button onClick={printInvoice} className="btn-navy-outline text-sm">
          🖨️ Print Invoice
        </button>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card rounded-2xl p-6">
          <h3 className="font-heading font-bold text-[#1B1B4B] mb-3">Order Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#5A5A7A]">Order ID</span>
              <span className="font-medium text-[#1B1B4B]">{order.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5A5A7A]">Date</span>
              <span className="text-[#1B1B4B]">
                {new Date(order.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5A5A7A]">Payment ID</span>
              <span className="text-[#1B1B4B] font-mono text-xs">
                {order.razorpayPaymentId || "-"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#5A5A7A]">Payment Status</span>
              <span className={paymentBadge(order.paymentStatus)}>
                {order.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="card rounded-2xl p-6">
          <h3 className="font-heading font-bold text-[#1B1B4B] mb-3">Customer Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#5A5A7A]">Name</span>
              <span className="font-medium text-[#1B1B4B]">{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5A5A7A]">Phone</span>
              <span className="text-[#1B1B4B]">{order.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5A5A7A]">Email</span>
              <span className="text-[#1B1B4B]">{order.email || "-"}</span>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <span className="text-[#5A5A7A] block mb-1">Address</span>
              <p className="text-[#1B1B4B]">
                {order.address?.street}
                <br />
                {order.address?.city}, {order.address?.state} - {order.address?.pincode}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card rounded-2xl p-6 mb-6">
        <h3 className="font-heading font-bold text-[#1B1B4B] mb-4">Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#5A5A7A] border-b border-gray-100">
                <th className="pb-3 font-medium">Item</th>
                <th className="pb-3 font-medium">Variant</th>
                <th className="pb-3 font-medium text-center">Qty</th>
                <th className="pb-3 font-medium text-right">Price</th>
                <th className="pb-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FAF7F2] rounded-lg flex items-center justify-center text-sm">
                      🍪
                    </div>
                    <span className="font-medium text-[#1B1B4B]">{item.productName}</span>
                  </td>
                  <td className="py-3 text-[#5A5A7A]">{item.variant}</td>
                  <td className="py-3 text-center text-[#5A5A7A]">{item.quantity}</td>
                  <td className="py-3 text-right text-[#5A5A7A]">{formatPrice(item.price)}</td>
                  <td className="py-3 text-right font-medium text-[#1B1B4B]">
                    {formatPrice(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-100 mt-4 pt-4 space-y-2 max-w-xs ml-auto text-sm">
          <div className="flex justify-between">
            <span className="text-[#5A5A7A]">Subtotal</span>
            <span className="text-[#1B1B4B]">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5A5A7A]">Delivery</span>
            <span className="text-[#1B1B4B]">
              {order.deliveryCharge === 0 ? "Free" : formatPrice(order.deliveryCharge)}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-gray-100 pt-2">
            <span className="text-[#1B1B4B]">Total</span>
            <span className="text-[#1B1B4B]">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Update Status */}
      <div className="card rounded-2xl p-6 no-print">
        <h3 className="font-heading font-bold text-[#1B1B4B] mb-4">Update Status</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="input-field text-sm"
          >
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button
            onClick={updateStatus}
            disabled={updating || newStatus === order.status}
            className="btn-gold text-sm disabled:opacity-50"
          >
            {updating ? "Updating..." : "Update Status"}
          </button>
          <span className={statusBadge(order.status)}>
            Current: {order.status}
          </span>
        </div>
      </div>

      {/* Print Invoice Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .card { box-shadow: none !important; border: 1px solid #eee !important; }
        }
      `}</style>
    </>
  );
}
