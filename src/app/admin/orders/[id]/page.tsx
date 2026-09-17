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
  shipmentId?: string;
  shipmentStatus?: string;
  shipmentCreatedAt?: string;
  lastScan?: string;
  lastScanTime?: string;
  trackingUrl?: string;
  labelUrl?: string;
  shipmentError?: string;
  syncState?: string;
  pickedUp?: boolean;
  pickedUpAt?: string;
  shippingWeightGrams?: number;
  shippingWeightOverrideGrams?: number;
  shippingModeOverride?: string;
  packageDescription?: string;
  packageDimensions?: {
    lengthCm?: number;
    breadthCm?: number;
    heightCm?: number;
  };
  shippingCost?: number;
  total: number;
  paymentStatus: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  delhiveryEnv?: {
    configured: boolean;
    pickupLocationConfigured: boolean;
    pickupLocation?: string | null;
    originPincodeConfigured: boolean;
    originPincode?: string | null;
    baseUrl?: string;
    shippingMode?: string;
  };
}

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState<"success" | "error">("success");
  const showToast = (message: string, tone: "success" | "error" = "success") => {
    setToast(message);
    setToastTone(tone);
  };
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [shipmentState, setShipmentState] = useState<{
    waybill?: string;
    shipmentStatus?: string;
    trackingUrl?: string;
    labelUrl?: string;
  }>({});
  const [showEditForm, setShowEditForm] = useState(false);
  const [trackHistory, setTrackHistory] = useState<
    Array<{
      scan?: string;
      scanType?: string;
      location?: string;
      statusDateTime?: string;
    }>
  >([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    address: { line1: "", line2: "", city: "", state: "", pincode: "" },
    shipmentWeightOverrideGrams: "",
    shippingMode: "",
    packageDescription: "",
    packageDimensions: { lengthCm: "", breadthCm: "", heightCm: "" },
  });

  const openEditForm = () => {
    if (!order) return;
    setEditForm({
      customerName: order.customerName || "",
      phone: order.phone || "",
      email: order.email || "",
      address: {
        line1: order.address?.line1 || "",
        line2: order.address?.line2 || "",
        city: order.address?.city || "",
        state: order.address?.state || "",
        pincode: order.address?.pincode || "",
      },
      shipmentWeightOverrideGrams:
        order.shippingWeightOverrideGrams != null
          ? String(order.shippingWeightOverrideGrams)
          : "",
      shippingMode: order.shippingModeOverride || "",
      packageDescription: order.packageDescription || "",
      packageDimensions: {
        lengthCm:
          order.packageDimensions?.lengthCm != null
            ? String(order.packageDimensions.lengthCm)
            : "",
        breadthCm:
          order.packageDimensions?.breadthCm != null
            ? String(order.packageDimensions.breadthCm)
            : "",
        heightCm:
          order.packageDimensions?.heightCm != null
            ? String(order.packageDimensions.heightCm)
            : "",
      },
    });
    setEditError("");
    setShowEditForm(true);
  };

  const saveEditForm = async () => {
    if (!order) return;
    setSavingEdit(true);
    setEditError("");
    try {
      const payload: Record<string, unknown> = {
        address: editForm.address,
        packageDescription: editForm.packageDescription,
        packageDimensions: {
          lengthCm:
            editForm.packageDimensions.lengthCm.trim() === ""
              ? null
              : editForm.packageDimensions.lengthCm,
          breadthCm:
            editForm.packageDimensions.breadthCm.trim() === ""
              ? null
              : editForm.packageDimensions.breadthCm,
          heightCm:
            editForm.packageDimensions.heightCm.trim() === ""
              ? null
              : editForm.packageDimensions.heightCm,
        },
      };
      // Once manifested, Delhivery holds the original customer/weight values
      // for the AWB — don't even send them (the server would reject them).
      if (!order.waybill) {
        payload.customerName = editForm.customerName;
        payload.phone = editForm.phone;
        payload.email = editForm.email;
        payload.shipmentWeightOverrideGrams =
          editForm.shipmentWeightOverrideGrams.trim() === ""
            ? null
            : editForm.shipmentWeightOverrideGrams;
        if (
          editForm.shippingMode === "S" ||
          editForm.shippingMode === "E"
        ) {
          payload.shippingMode = editForm.shippingMode;
        }
      }
      const res = await fetch(`/api/admin/orders/${order._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to save");
        return;
      }
      const refreshed = await fetch(`/api/admin/orders/${order._id}`);
      if (refreshed.ok) {
        const fresh = await refreshed.json();
        setOrder(fresh);
      } else {
        setOrder(data);
      }
      setShowEditForm(false);
      setToast("Delivery & package details saved");
    } catch {
      setEditError("Something went wrong");
    } finally {
      setSavingEdit(false);
    }
  };

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
        const data = await res.json().catch(() => ({}));
        setToast(
          data.error || "Failed to update status"
        );
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
      latest?: { status?: string; scan?: string; location?: string };
      entries?: Array<{
        scan?: string;
        scanType?: string;
        location?: string;
        statusDateTime?: string;
      }>;
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
        const backendError =
          typeof data.error === "string" && data.error.trim()
            ? data.error.trim()
            : "";
        const friendly =
          data.code === "DELHIVERY_NOT_CONFIGURED"
            ? "Shipping is not configured on this server (missing env vars). Add them in Admin → Settings → Delhivery."
            : data.code === "DELHIVERY_AUTH_FAILED"
              ? "Delhivery rejected the API token — check it in Admin → Settings → Delhivery."
              : data.code === "PICKUP_LOCATION_NOT_CONFIGURED"
                ? "Delhivery pickup location is not configured. Add it in Admin → Settings → Delhivery."
                : data.code === "PICKUP_LOCATION_INVALID" ||
                    data.code === "DELHIVERY_PICKUP_LOCATION_INVALID"
                  ? "The Delhivery pickup location name is invalid. It must exactly match the warehouse registered at Delhivery (Admin → Settings → Delhivery)."
                  : data.code === "INVALID_CUSTOMER_ADDRESS" ||
                      data.code === "INVALID_PINCODE"
                    ? "The delivery address is invalid. Fix it, then press Create Shipment again."
                    : data.code === "PICKUP_ALREADY_EXISTS" ||
                        data.code === "PICKUP_ALREADY_REQUESTED"
                      ? backendError ||
                        "A pickup has already been requested for this shipment."
                      : data.code === "PICKUP_AUTO_ENABLED"
                        ? backendError ||
                          "Automatic pickup is enabled for this Delhivery account, so a pickup request is not needed."
                        : data.code === "PICKUP_LOCATION_INACTIVE"
                          ? backendError ||
                            "The Delhivery pickup location is inactive. Ask Delhivery to activate the warehouse."
                          : backendError ||
                            (typeof data.safeMessage === "string" &&
                              data.safeMessage.trim()) ||
                            "Request failed";
        showToast(friendly, "error");
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
        setToast(
          data.alreadyCreated
            ? `Shipment already created — AWB ${data.waybill}`
            : `Shipment created — AWB ${data.waybill}`
        );
      } else if (action === "pickup") {
        const when = data.pickupDate
          ? ` for ${data.pickupDate}${data.pickupTime ? ` ${data.pickupTime}` : ""}`
          : "";
        setToast(`Pickup requested — ID ${data.pickupId}${when}`);
      }
      onSuccess?.(data);
    } catch {
      setToast("Something went wrong");
    } finally {
      setBusyAction(null);
    }
  };

  const openLabel = async () => {
    if (!order) return;
    setBusyAction("label");
    // Open the tab synchronously inside the click gesture so popup blockers
    // allow it; it is navigated to the PDF once the blob is ready.
    const newTab = window.open("", "_blank");
    try {
      const res = await fetch(`/api/admin/orders/${order._id}/label`);
      if (!res.ok) {
        if (newTab) newTab.close();
        let message = "Could not fetch the shipping label from Delhivery.";
        try {
          const data = await res.json();
          if (data && typeof data.error === "string" && data.error.trim()) {
            message = data.error;
          }
        } catch {
          // Non-JSON (unexpected) error body — keep the generic message.
        }
        showToast(message, "error");
        return;
      }

      const blob = await res.blob();
      if (blob.size === 0) {
        if (newTab) newTab.close();
        showToast("Delhivery returned an empty label. Please try again.", "error");
        return;
      }

      const url = URL.createObjectURL(blob);
      if (newTab) {
        newTab.location.href = url;
      } else {
        window.open(url, "_blank");
      }
      // Give the new tab time to load before releasing the object URL.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      if (newTab) newTab.close();
      showToast("Could not fetch the shipping label. Please try again.", "error");
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
      Confirmed: "badge-gold",
      Shipped: "badge-indigo",
      Delivered: "badge-green",
      Cancelled: "badge-grey",
    };
    return styles[status] || "badge-grey";
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

  return (
    <>
      {toast && (
        <div
          className={`fixed top-4 right-4 ${
            toastTone === "error"
              ? "bg-[#DC2626]"
              : "bg-[#16A34A]"
          } text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 no-print`}
        >
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

      {/* Print-only shipping label with the full delivery address data */}
      <div className="print-only mb-6">
        <div className="card rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4 gap-4">
            <div>
              <p className="font-heading font-bold text-black text-lg mb-1">Shipping Label</p>
              <p className="text-xs text-black">Order #{order.orderId}</p>
              <p className="text-xs text-black">
                Date:{" "}
                {new Date(order.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              {order.waybill && (
                <p className="text-xs font-bold text-black mt-1">AWB: {order.waybill}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-heading font-bold text-black">Crispo Cookies</p>
              <p className="text-xs text-black">Baked with 100% Oats</p>
            </div>
          </div>

          <div className="border border-gray-300 rounded-lg p-4 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-black mb-2">
              Deliver To
            </p>
            <p className="text-sm font-bold text-black">{order.customerName}</p>
            <p className="text-sm text-black">
              Phone: {order.phone}
              {order.email ? ` · Email: ${order.email}` : ""}
            </p>
            <p className="text-sm text-black mt-3">
              {order.address?.line1}
              {order.address?.line2 ? `, ${order.address.line2}` : ""}
              <br />
              {order.address?.city}, {order.address?.state} - {order.address?.pincode}
            </p>
          </div>

          <div className="flex justify-between text-xs text-black">
            <span>
              Payment: {order.paymentStatus} · Delivery:{" "}
              {order.deliveryCharge === 0 ? "Free" : formatPrice(order.deliveryCharge)}
              {order.deliveryProvider === "delhivery" ? " (Delhivery)" : ""}
            </span>
            <span>Subtotal {formatPrice(order.subtotal)} · Total {formatPrice(order.total)}</span>
          </div>
        </div>
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
            to push this order.{" "}
            <Link
              href="/admin/settings"
              className="underline underline-offset-2 hover:text-amber-900 font-medium"
            >
              Go to Settings → Delhivery
            </Link>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-5 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[#666666]">Charge</span>
              <span className="font-medium text-black">
                {order.deliveryCharge === 0
                  ? "Free"
                  : formatPrice(order.deliveryCharge)}
                {order.deliveryProvider === "delhivery" ? " (Delhivery)" : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Payment mode</span>
              <span className="font-medium text-black">Pre-paid</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Shipping mode</span>
              <span className="font-medium text-black">
                {order.shippingModeOverride === "E"
                  ? "Express (override)"
                  : order.shippingModeOverride === "S"
                    ? "Surface (override)"
                    : order.delhiveryEnv?.shippingMode || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Route</span>
              <span className="font-medium text-black">
                {order.delhiveryEnv?.originPincode
                  ? `${order.delhiveryEnv.originPincode} → ${order.address?.pincode}`
                  : `${order.address?.pincode || "—"}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Pickup location</span>
              <span className="font-medium text-black text-right max-w-[220px]">
                {order.pickedUp
                  ? "Requested"
                  : order.delhiveryEnv?.pickupLocation
                    ? order.delhiveryEnv.pickupLocation
                    : order.delhiveryEnv?.pickupLocationConfigured === false
                      ? "Not configured"
                      : "—"}
                {order.pickedUpAt
                  ? ` · ${new Date(order.pickedUpAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}`
                  : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Package weight</span>
              <span className="font-medium text-black">
                {order.shippingWeightOverrideGrams
                  ? `${(order.shippingWeightOverrideGrams / 1000).toFixed(2)} kg`
                  : order.shippingWeightGrams
                    ? `${(order.shippingWeightGrams / 1000).toFixed(2)} kg`
                    : "—"}
                {order.shippingWeightOverrideGrams ? " (override)" : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Package description</span>
              <span className="font-medium text-black text-right max-w-[240px]">
                {order.packageDescription || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Package dimensions</span>
              <span className="font-medium text-black">
                {order.packageDimensions?.lengthCm ||
                order.packageDimensions?.breadthCm ||
                order.packageDimensions?.heightCm
                  ? `L ${order.packageDimensions.lengthCm || "-"} × B ${
                      order.packageDimensions.breadthCm || "-"
                    } × H ${order.packageDimensions.heightCm || "-"} cm`
                  : "—"}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[#666666]">Shipment status</span>
              <span className="font-medium text-black">
                {order.shipmentStatus || "Not shipped"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Delhivery shipment ID</span>
              <span className="font-medium text-black font-mono text-xs break-all max-w-[200px] text-right">
                {order.shipmentId || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Latest scan</span>
              <span className="font-medium text-black max-w-[220px] text-right">
                {order.lastScan || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Shipment created</span>
              <span className="font-medium text-black">
                {order.shipmentCreatedAt
                  ? new Date(order.shipmentCreatedAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : order.syncState === "synced" && order.waybill
                    ? new Date(order.updatedAt || order.createdAt).toLocaleString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )
                    : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Last updated</span>
              <span className="font-medium text-black">
                {order.updatedAt
                  ? new Date(order.updatedAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Sync state</span>
              <span className="font-medium text-black capitalize">
                {order.syncState || "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={openEditForm}
            disabled={busyAction !== null}
            className="btn-navy-outline text-sm disabled:opacity-50"
          >
            Edit Delivery &amp; Package Details
          </button>

          {!order.waybill && (
            <button
              onClick={() =>
                runShipmentAction("create", `/api/admin/orders/${order._id}/shipment`)
              }
              disabled={busyAction !== null}
              className="btn-gold text-sm disabled:opacity-50"
            >
              {busyAction === "create"
                ? "Creating Shipment…"
                : "Create Shipment"}
            </button>
          )}

          {order.waybill && (
            <>
              <button
                onClick={openLabel}
                disabled={busyAction !== null}
                className="btn-navy-outline text-sm disabled:opacity-50"
              >
                {busyAction === "label" ? "Loading Label…" : "Print / View Label"}
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
                      if (data.entries && data.entries.length > 0) {
                        setTrackHistory(data.entries);
                      }
                      if (data.latest) {
                        setOrder((prev) =>
                          prev
                            ? {
                                ...prev,
                                lastScan:
                                  data.latest?.scan || data.latest?.status,
                                shipmentStatus:
                                  data.shipmentStatus || prev.shipmentStatus,
                              }
                            : prev
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

        {showEditForm && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-heading font-semibold text-black">
                Edit Delivery &amp; Package Details
              </h4>
              <button
                onClick={() => setShowEditForm(false)}
                className="text-sm text-[#666666] hover:text-black"
              >
                Close
              </button>
            </div>

            {order.waybill && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl p-3.5 mb-4">
                This order is already manifested with Delhivery (AWB{" "}
                {order.waybill}). Customer, phone, email and package weight are
                locked — Delhivery holds the original values for that AWB. Only
                package description and dimensions can be changed here, for the
                local record. Tracking remains authoritative for shipment
                status.
              </div>
            )}

            {editError && (
              <div className="bg-[#DC2626]/5 border border-[#DC2626]/20 text-[#DC2626] text-sm rounded-xl p-3.5 mb-4">
                {editError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-1">
                  Customer name
                </label>
                <input
                  value={editForm.customerName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, customerName: e.target.value })
                  }
                  disabled={Boolean(order.waybill)}
                  className="input-field text-sm disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-1">
                  Phone
                </label>
                <input
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  disabled={Boolean(order.waybill)}
                  className="input-field text-sm disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-1">
                  Email
                </label>
                <input
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  disabled={Boolean(order.waybill)}
                  className="input-field text-sm disabled:bg-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-[#666666] mb-1">
                  Address line 1
                </label>
                <input
                  value={editForm.address.line1}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      address: { ...editForm.address, line1: e.target.value },
                    })
                  }
                  className="input-field text-sm"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-[#666666] mb-1">
                  Address line 2
                </label>
                <input
                  value={editForm.address.line2}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      address: { ...editForm.address, line2: e.target.value },
                    })
                  }
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-1">
                  Pincode
                </label>
                <input
                  value={editForm.address.pincode}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      address: { ...editForm.address, pincode: e.target.value },
                    })
                  }
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-1">
                  City
                </label>
                <input
                  value={editForm.address.city}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      address: { ...editForm.address, city: e.target.value },
                    })
                  }
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-1">
                  State
                </label>
                <input
                  value={editForm.address.state}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      address: { ...editForm.address, state: e.target.value },
                    })
                  }
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-1">
                  Package weight (grams)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50000}
                  value={editForm.shipmentWeightOverrideGrams}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      shipmentWeightOverrideGrams: e.target.value,
                    })
                  }
                  disabled={Boolean(order.waybill)}
                  placeholder={
                    order.shippingWeightGrams
                      ? `Current ${order.shippingWeightGrams}g`
                      : "e.g. 600"
                  }
                  className="input-field text-sm disabled:bg-gray-100"
                />
                {!order.shippingWeightOverrideGrams &&
                  order.shippingWeightGrams && (
                    <p className="text-[11px] text-[#999999] mt-1">
                      Product-derived weight is{" "}
                      {(order.shippingWeightGrams / 1000).toFixed(2)} kg. Enter
                      an override only if the actual packed weight differs.
                    </p>
                  )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-1">
                  Package description
                </label>
                <input
                  value={editForm.packageDescription}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      packageDescription: e.target.value,
                    })
                  }
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-1">
                  Shipping mode
                </label>
                <select
                  value={editForm.shippingMode}
                  onChange={(e) =>
                    setEditForm({ ...editForm, shippingMode: e.target.value })
                  }
                  disabled={Boolean(order.waybill)}
                  className="input-field text-sm disabled:bg-gray-100"
                >
                  <option value="">Server default (Surface)</option>
                  <option value="S">Surface</option>
                  <option value="E">Express</option>
                </select>
                <p className="text-[11px] text-[#999999] mt-1">
                  Used only when the shipment is created. Leave as server
                  default unless the courier service needs differently.
                </p>
              </div>
              <div className="sm:col-span-2 grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#666666] mb-1">
                    L (cm)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={editForm.packageDimensions.lengthCm}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        packageDimensions: {
                          ...editForm.packageDimensions,
                          lengthCm: e.target.value,
                        },
                      })
                    }
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#666666] mb-1">
                    B (cm)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={editForm.packageDimensions.breadthCm}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        packageDimensions: {
                          ...editForm.packageDimensions,
                          breadthCm: e.target.value,
                        },
                      })
                    }
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#666666] mb-1">
                    H (cm)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={editForm.packageDimensions.heightCm}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        packageDimensions: {
                          ...editForm.packageDimensions,
                          heightCm: e.target.value,
                        },
                      })
                    }
                    className="input-field text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={saveEditForm}
                disabled={savingEdit || busyAction !== null}
                className="btn-gold text-sm disabled:opacity-50"
              >
                {savingEdit ? "Saving…" : "Save Details"}
              </button>
              <button
                onClick={() => setShowEditForm(false)}
                className="text-sm text-[#666666] hover:text-black"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {trackHistory.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <h4 className="font-heading font-semibold text-black mb-3">
              Tracking history
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#666666] border-b border-gray-100">
                    <th className="py-2 pr-3 font-medium">Date &amp; time</th>
                    <th className="py-2 pr-3 font-medium">Event</th>
                    <th className="py-2 font-medium">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {trackHistory.map((entry, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td className="py-2.5 pr-3 text-[#666666] whitespace-nowrap">
                        {entry.statusDateTime
                          ? new Date(entry.statusDateTime).toLocaleString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-black">
                        {entry.scan || entry.scanType || "—"}
                      </td>
                      <td className="py-2.5 text-[#666666]">
                        {entry.location || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
            <option value="Confirmed">Confirmed</option>
            <option value="Shipped" disabled={!order.waybill}>
              Shipped{order.waybill ? "" : " (requires shipment)"}
            </option>
            <option value="Delivered" disabled={!order.waybill}>
              Delivered{order.waybill ? "" : " (requires shipment)"}
            </option>
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
        {!order.waybill && (
          <p className="text-xs text-[#999999] mt-3">
            Shipped / Delivered are Delhivery-observed facts and can only be set
            after a real shipment (AWB) exists. They will also update
            automatically from real tracking via “Track Shipment”.
          </p>
        )}
      </div>

      {/* Print Invoice Styles */}
      <style>{`
        .print-only { display: none !important; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .card { box-shadow: none !important; border: 1px solid #eee !important; }
          .print-only { display: block !important; }
        }
      `}</style>
    </>
  );
}
