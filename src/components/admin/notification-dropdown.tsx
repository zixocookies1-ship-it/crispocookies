"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/helpers";

interface Notification {
  _id: string;
  type: "order" | "stock" | "payment";
  message: string;
  orderId?: string;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  order: "🛒",
  stock: "⚠️",
  payment: "💰",
};

interface Props {
  onClose: () => void;
  onCountChange: (count: number) => void;
}

export default function NotificationDropdown({ onClose, onCountChange }: Props) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data.slice(0, 10) : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/admin/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onCountChange(0);
    } catch {}
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.orderId) {
      router.push(`/admin/orders/${notification.orderId}`);
    }
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-12 w-[85vw] max-w-[380px] bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-heading font-bold text-[#1B1B4B]">Notifications</h3>
        <button
          onClick={markAllRead}
          className="text-sm text-[#8B6410] hover:text-[#7A5A0E] font-medium transition-colors"
        >
          Mark All Read
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#8B6410] border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-[#5A5A7A]">No notifications</div>
        ) : (
          notifications.map((n) => (
            <button
              key={n._id}
              onClick={() => handleNotificationClick(n)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0
                ${!n.read ? "bg-[#1B1B4B]/5" : ""}`}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] || "📌"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1B1B4B] leading-snug">{n.message}</p>
                <p className="text-xs text-[#5A5A7A] mt-1">{timeAgo(new Date(n.createdAt))}</p>
              </div>
              {!n.read && (
                <span className="w-2.5 h-2.5 bg-[#8B6410] rounded-full flex-shrink-0 mt-1.5" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
