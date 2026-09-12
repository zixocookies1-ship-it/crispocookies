"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PackageSearch, Calendar, RefreshCw } from "lucide-react";
import { Suspense, useState, useEffect, useCallback } from "react";

interface TrackData {
  found: boolean;
  orderId?: string;
  status?: string;
  shipmentStatus?: string;
  lastScan?: string | null;
  lastScanTime?: string | null;
  placedAt?: string | null;
  total?: number;
  trackingUrl?: string | null;
  items?: { name: string; qty: number }[];
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  processing: { label: "Order Confirmed", color: "text-gold" },
  shipped: { label: "Shipped", color: "text-gold" },
  delivered: { label: "Delivered", color: "text-green" },
  cancelled: { label: "Cancelled", color: "text-red" },
};

function TrackContent() {
  const searchParams = useSearchParams();
  const [orderId] = useState(() => searchParams.get("order") || "");
  const [data, setData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    setError(false);
    try {
      const res = await fetch(`/api/track?order=${encodeURIComponent(orderId)}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="bg-cocoa min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  const notFound = !orderId || error || !data?.found;

  return (
    <div className="bg-cocoa min-h-screen">
      <div className="container-tight py-8">
        <h1 className="font-heading text-4xl text-cream font-bold mb-2">
          Track Your Order
        </h1>
        <p className="text-muted text-sm">
          Enter the order ID from your confirmation, e.g.{" "}
          <span className="font-mono text-gold">CR…</span>
        </p>

        <div className="bg-chocolate rounded-2xl shadow-soft p-6 sm:p-8 mt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <input
              defaultValue={orderId}
              id="track-input"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = (e.target as HTMLInputElement).value.trim();
                  window.location.href = `/track?order=${encodeURIComponent(v)}`;
                }
              }}
              className="input-field flex-1"
              placeholder="Enter order ID"
              autoComplete="off"
            />
            <button
              onClick={() => {
                const v = (
                  document.getElementById("track-input") as HTMLInputElement
                )?.value.trim();
                if (v) window.location.href = `/track?order=${encodeURIComponent(v)}`;
              }}
              className="crispo-btn-gold px-5 py-3 sm:w-auto w-full"
            >
              Track
            </button>
          </div>

          {notFound && (
            <div className="mt-6 text-muted text-sm">
              {error
                ? "We couldn't reach the tracking service. Please try again."
                : "No order found with that ID. Please double-check your order ID."}
            </div>
          )}

          {data?.found && (
            <div className="mt-6 space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs text-muted">Order</p>
                  <p className="font-mono text-cream font-medium">
                    {data.orderId}
                  </p>
                </div>
                <span
                  className={`font-heading font-bold ${
                    STATUS_LABEL[data.status || ""]?.color || "text-cream"
                  }`}
                >
                  {STATUS_LABEL[data.status || ""]?.label ||
                    (data.status
                      ? data.status.charAt(0).toUpperCase() + data.status.slice(1)
                      : "Processing")}
                </span>
              </div>

              {data.placedAt && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Calendar className="h-4 w-4 shrink-0" />
                  Placed{" "}
                  {new Date(data.placedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              )}

              {data.shipmentStatus && (
                <div className="bg-cacao rounded-xl p-4 flex items-start gap-3">
                  <PackageSearch className="text-gold h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-cream font-medium">
                      {data.shipmentStatus}
                    </p>
                    {data.lastScan && (
                      <>
                        <p className="text-xs text-muted mt-0.5">{data.lastScan}</p>
                        {data.lastScanTime && (
                          <p className="text-xs text-muted mt-0.5">
                            {new Date(data.lastScanTime).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {data.items && data.items.length > 0 && (
                <div className="text-sm text-muted">
                  {data.items
                    .map((item) => `${item.qty} × ${item.name}`)
                    .join(" · ")}
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                {data.trackingUrl && (
                  <a
                    href={data.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border-2 border-gold-soft/60 text-gold-soft font-semibold px-5 py-2.5 text-sm transition-colors hover:bg-gold/10"
                  >
                    Live courier tracking ↗
                  </a>
                )}
                <button
                  onClick={load}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-gold-soft/40 text-cream font-semibold px-5 py-2.5 text-sm transition-colors hover:bg-gold/10"
                >
                  <RefreshCw className="h-4 w-4" /> Refresh
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-gold/20 mt-6 pt-4">
            <Link href="/shop" className="text-sm text-muted hover:text-gold">
              ← Back to shop
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-cocoa min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}