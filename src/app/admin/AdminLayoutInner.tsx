"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, ReactNode } from "react";
import NotificationDropdown from "@/components/admin/notification-dropdown";

const NAV_ITEMS = [
  { label: "Dashboard", icon: "📊", href: "/admin" },
  { label: "Products", icon: "📦", href: "/admin/products" },
  { label: "Orders", icon: "🛒", href: "/admin/orders" },
  { label: "Customers", icon: "👥", href: "/admin/customers" },
  { label: "Categories", icon: "📁", href: "/admin/categories" },
  { label: "Settings", icon: "⚙️", href: "/admin/settings" },
];

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#8B6410] border-t-transparent" />
    </div>
  );
}

export default function AdminLayoutInner({
  children,
}: {
  children: ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (status === "unauthenticated" && !isLoginPage) {
      router.push("/admin/login");
    }
  }, [status, isLoginPage, router]);

  useEffect(() => {
    if (!isLoginPage) {
      fetch("/api/admin/notifications")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setNotificationCount(
              data.filter((n: { read: boolean }) => !n.read).length
            );
          }
        })
        .catch(() => {});
    }
  }, [isLoginPage, pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return <Spinner />;
  }

  if (!session) {
    return <Spinner />;
  }

  const initials = session.user?.name
    ? session.user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "A";

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-[#0F0F2D] z-50 transition-all duration-300 flex flex-col
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
          ${sidebarOpen ? "w-[260px]" : "w-16"}`}
      >
        <div className="h-16 flex items-center px-4 border-b border-white/10">
          <span className="text-2xl flex-shrink-0">🍪</span>
          {sidebarOpen && (
            <span className="ml-2 text-[#8B6410] font-heading font-bold text-lg whitespace-nowrap">
              Admin Panel
            </span>
          )}
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-all text-sm font-medium
                  ${
                    isActive
                      ? "border-l-4 border-[#8B6410] text-[#8B6410] bg-[#8B6410]/10"
                      : "border-l-4 border-transparent text-white/60 hover:text-white hover:bg-white/5"
                  }
                  ${!sidebarOpen ? "justify-center" : ""}`}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {sidebarOpen && (
                  <span className="ml-3 whitespace-nowrap">{item.label}</span>
                )}
              </a>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          {sidebarOpen ? (
            <>
              <p className="text-white/70 text-xs truncate px-2 mb-2">
                {session.user?.email}
              </p>
              <button
                onClick={() => signOut({ callbackUrl: "/admin/login" })}
                className="btn-red w-full text-sm py-2"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
              className="w-full flex justify-center py-2 text-[#DC2626] hover:text-red-400"
              title="Logout"
            >
              🚪
            </button>
          )}
        </div>
      </aside>

      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? "lg:ml-[260px]" : "lg:ml-16"
        }`}
      >
        <header className="h-16 bg-[#1B1B4B] flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileOpen(!mobileOpen);
                } else {
                  setSidebarOpen(!sidebarOpen);
                }
              }}
              className="text-[#8B6410] hover:text-[#A07820] transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <div className="hidden sm:block relative">
              <input
                type="text"
                placeholder="Search..."
                className="bg-white/10 text-white placeholder-white/40 rounded-full px-4 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#8B6410]/50"
              />
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationOpen(!notificationOpen);
                  setAvatarOpen(false);
                }}
                className="relative text-white/80 hover:text-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#8B6410] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                )}
              </button>
              {notificationOpen && (
                <NotificationDropdown
                  onClose={() => setNotificationOpen(false)}
                  onCountChange={setNotificationCount}
                />
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setAvatarOpen(!avatarOpen);
                  setNotificationOpen(false);
                }}
                className="w-9 h-9 rounded-full bg-[#8B6410] flex items-center justify-center text-white font-bold text-sm"
              >
                {initials}
              </button>
              {avatarOpen && (
                <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-[#1B1B4B]">
                      {session.user?.name || "Admin"}
                    </p>
                    <p className="text-xs text-[#5A5A7A]">
                      {session.user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/admin/login" })}
                    className="w-full text-left px-4 py-2 text-sm text-[#DC2626] hover:bg-red-50 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
