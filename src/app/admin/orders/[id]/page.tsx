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
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  items: OrderItem[];
  subtotal: number;
  subtotalBeforeDiscount?: number;
  discount?: number;
  promotion?: {
    name: string;
    discountType: string;
    discountValue: number;
  };
  couponDiscount?: number;
  eligibleSubtotal?: number;
  coupon?: {
    code: string;
    discountType: string;
    discountValue: number;
    description?: string;
  };
  deliveryCharge: number;
  deliveryProvider?: string;
  waybill?: string;
  shipmentStatus?: string;
  lastScan?: string;
  lastScanTime?: string;
  trackingUrl?: string;
  labelUrl?: string;
  shipmentError?: string;
  syncState?: string;
  pickedUp?: boolean;
  pickedUpAt?: string;
  shippingWeightGrams?: number;
  shippingCost?: number;
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
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [shipmentState, setShipmentState] = useState<{
    waybill?: string;
    shipmentStatus?: string;
    trackingUrl?: string;
    labelUrl?: string;
  }>({});

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/admin/orders/${params.id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setOrder(data);
        setNewStatus(data.status);
        setShipmentState({
          waybill: data.waybill,
          shipmentStatus: data.shipmentStatus,
          trackingUrl: data.trackingUrl,
          labelUrl: data.labelUrl,
        });
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

  const runShipmentAction = async (
    action: string,
    url: string,
    method: "POST" | "GET" = "POST",
    onSuccess?: (data: {
      labelUrl?: string;
      trackingUrl?: string;
      waybill?: string;
      shipmentStatus?: string;
      latest?: { status?: string };
    }) => void
  ) => {
    if (!order) return;
    setBusyAction(action);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        setToast(`Error: ${data.error || "Request failed"}`);
        return;
      }
      if (action === "create") {
        setShipmentState((prev) => ({
          ...prev,
          waybill: data.waybill,
          shipmentStatus: data.shipmentStatus,
          trackingUrl: data.trackingUrl,
          labelUrl: data.labelUrl,
        }));
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                waybill: data.waybill,
                shipmentStatus: data.shipmentStatus,
                trackingUrl: data.trackingUrl,
                labelUrl: data.labelUrl,
                syncState: data.syncState || "synced",
                shipmentError: undefined,
              }
            : prev
        );
        setToast(`Shipment created — AWB ${data.waybill}`);
      } else if (action === "pickup") {
        setToast(`Pickup requested — ID ${data.pickupId}`);
      }
      onSuccess?.(data);
    } catch {
      setToast("Something went wrong");
    } finally {
      setBusyAction(null);
    }
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
    const normalized =
      status.length > 0
        ? status.charAt(0).toUpperCase() + status.slice(1)
        : status;
    const styles: Record<string, string> = {
      Paid: "badge-green",
      Failed: "badge-red",
      Pending: "badge-amber",
    };
    return styles[normalized] || "badge-grey";
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
        <Link href="/admin/orders" className="text-sm text-black hover:text-gray-800 font-medium">
          ← Back to Orders
        </Link>
        <button onClick={printInvoice} className="btn-navy-outline text-sm">
          🖨️ Print Invoice
        </button>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card rounded-2xl p-6">
          <h3 className="font-heading font-bold text-black mb-3">Order Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#666666]">Order ID</span>
              <span className="font-medium text-black">{order.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Date</span>
              <span className="text-black">
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
              <span className="text-[#666666]">Payment ID</span>
              <span className="text-black font-mono text-xs break-all min-w-0">
                {order.razorpayPaymentId || "-"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#666666]">Payment Status</span>
              <span className={paymentBadge(order.paymentStatus)}>
                {order.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="card rounded-2xl p-6">
          <h3 className="font-heading font-bold text-black mb-3">Customer Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#666666]">Name</span>
              <span className="font-medium text-black">{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Phone</span>
              <span className="text-black">{order.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Email</span>
              <span className="text-black">{order.email || "-"}</span>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <span className="text-[#666666] block mb-1">Address</span>
              <p className="text-black">
                {order.address?.line1}
                {order.address?.line2 && <>, {order.address.line2}</>}
                <br />
                {order.address?.city}, {order.address?.state} - {order.address?.pincode}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card rounded-2xl p-6 mb-6">
        <h3 className="font-heading font-bold text-black mb-4">Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#666666] border-b border-gray-100">
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
                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-sm">
                      🍪
                    </div>
                    <span className="font-medium text-black">{item.productName}</span>
                  </td>
                  <td className="py-3 text-[#666666]">{item.variant}</td>
                  <td className="py-3 text-center text-[#666666]">{item.quantity}</td>
                  <td className="py-3 text-right text-[#666666]">{formatPrice(item.price)}</td>
                  <td className="py-3 text-right font-medium text-black">
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
            <span className="text-[#666666]">Subtotal</span>
            <span className="text-black">{formatPrice(order.subtotal)}</span>
          </div>
          {order.discount && order.discount > 0 ? (
            <div className="flex justify-between">
              <span className="text-[#666666]">
                Discount
                {order.promotion?.name
                  ? ` (${order.promotion.name})`
                  : ""}
              </span>
              <span className="text-[#16A34A] font-medium">
                - {formatPrice(order.discount)}
              </span>
            </div>
          ) : null}
          {order.couponDiscount && order.couponDiscount > 0 ? (
            <>
              <div className="flex justify-between">
                <span className="text-[#666666]">
                  Coupon: {order.coupon?.code || "—"}
                </span>
                <span className="text-[#16A34A] font-medium">
                  - {formatPrice(order.couponDiscount)}
                </span>
              </div>
              {order.eligibleSubtotal ? (
                <div className="flex justify-between">
                  <span className="text-[#666666] text-xs">
                    Coupon eligible subtotal
                  </span>
                  <span className="text-[#666666] text-xs">
                    {formatPrice(order.eligibleSubtotal)}
                  </span>
                </div>
              ) : null}
            </>
          ) : null}
          <div className="flex justify-between">
            <span className="text-[#666666]">Delivery</span>
            <span className="text-black">
              {order.deliveryCharge === 0 ? "Free" : formatPrice(order.deliveryCharge)}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-gray-100 pt-2">
            <span className="text-black">Total</span>
            <span className="text-black">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Delivery / Delhivery */}
      <div className="card rounded-2xl p-6 mb-6 no-print">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-black">Delivery</h3>
          {order.waybill && (
            <span className="flex items-center gap-2">
              <span className="badge-green">AWB {order.waybill}</span>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(String(order.waybill));
                    setToast("AWB copied");
                  } catch {
                    setToast("Could not copy AWB");
                  }
                }}
                className="text-xs text-black underline underline-offset-2 hover:text-gray-700"
              >
                Copy AWB
              </button>
            </span>
          )}
        </div>

        {order.syncState === "unconfigured" && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-3.5 mb-4">
            Delhivery is not configured on the server (DELHIVERY_API_TOKEN missing).
            Paid orders will NOT be handed to Delhivery until it is set — until then
            syncing fails silently. Set the env vars, then use “Create Shipment” once
            to push this order.
          </div>
        )}

        {order.syncState === "failed" && !order.waybill && (
          <div className="bg-[#DC2626]/5 border border-[#DC2626]/20 text-[#DC2626] text-sm rounded-xl p-3.5 mb-4">
            Delhivery sync failed — see the reason below, fix it, then press “Create
            Shipment” to retry.
          </div>
        )}

        {order.shipmentError && (
          <div className="bg-[#DC2626]/5 border border-[#DC2626]/20 text-[#DC2626] text-sm rounded-xl p-3.5 mb-4">
            Last shipment attempt failed: {order.shipmentError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[#666666]">Charge</span>
              <span className="font-medium text-black">
                {order.deliveryCharge === 0
                  ? "Free"
                  : formatPrice(order.deliveryCharge)}
                {order.deliveryProvider === "delhivery"
                  ? " (Delhivery)"
                  : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Shipping weight</span>
              <span className="font-medium text-black">
                {order.shippingWeightGrams
                  ? `${(order.shippingWeightGrams / 1000).toFixed(2)} kg`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Shipment status</span>
              <span className="font-medium text-black">
                {order.shipmentStatus || "Not shipped"}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[#666666]">Pickup</span>
              <span className="font-medium text-black">
                {order.pickedUp ? "Requested" : "Not requested"}
                {order.pickedUpAt
                  ? ` · ${new Date(order.pickedUpAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}`
                  : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Latest scan</span>
              <span className="font-medium text-black max-w-[220px] text-right">
                {order.lastScan || "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!order.waybill && (
            <button
              onClick={() =>
                runShipmentAction("create", `/api/admin/orders/${order._id}/shipment`)
              }
              disabled={busyAction !== null}
              className="btn-gold text-sm disabled:opacity-50"
            >
              {busyAction === "create" ? "Creating…" : "Create Shipment"}
            </button>
          )}

          {order.waybill && (
            <>
              <button
                onClick={() =>
                  window.open(`/api/admin/orders/${order._id}/label`, "_blank")
                }
                disabled={busyAction !== null}
                className="btn-navy-outline text-sm disabled:opacity-50"
              >
                Print / View Label
              </button>

              <button
                onClick={() =>
                  runShipmentAction(
                    "pickup",
                    `/api/admin/orders/${order._id}/pickup`
                  )
                }
                disabled={busyAction !== null || order.pickedUp}
                className="btn-navy-outline text-sm disabled:opacity-50"
              >
                {busyAction === "pickup" ? "Requesting…" : "Request Pickup"}
              </button>

              <button
                onClick={() =>
                  runShipmentAction(
                    "track",
                    `/api/admin/orders/${order._id}/track`,
                    "GET",
                    (data) => {
                      if (data.trackingUrl) {
                        setShipmentState((prev) => ({
                          ...prev,
                          trackingUrl: data.trackingUrl,
                        }));
                        window.open(
                          order.trackingUrl || data.trackingUrl,
                          "_blank"
                        );
                        setToast(
                          data.latest?.status
                            ? `Latest: ${data.latest.status}`
                            : "Tracking refreshed"
                        );
                      }
                    }
                  )
                }
                disabled={busyAction !== null}
                className="btn-navy-outline text-sm disabled:opacity-50"
              >
                {busyAction === "track" ? "Refreshing…" : "Track Shipment"}
              </button>
            </>
          )}

          {order.shipmentStatus && (
            <a
              href={order.trackingUrl || shipmentState.trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-black underline underline-offset-2 hover:text-gray-700"
            >
              Delhivery tracking page ↗
            </a>
          )}
        </div>
      </div>

      {/* Update Status */}
      <div className="card rounded-2xl p-6 no-print">
        <h3 className="font-heading font-bold text-black mb-4">Update Status</h3>
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
