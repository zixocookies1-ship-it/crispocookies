"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import StatsCard from "@/components/admin/stats-card";
import { formatPrice } from "@/lib/helpers";

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  revenueGrowth: number;
  ordersGrowth: number;
  customersGrowth: number;
  productsGrowth: number;
  revenueChart: { day: string; revenue: number }[];
  recentOrders: {
    _id: string;
    orderId: string;
    customerName: string;
    totalItems: number;
    total: number;
    status: string;
    createdAt: string;
  }[];
  categoryBreakdown: { name: string; value: number }[];
  lowStockProducts: { name: string; stock: number; _id: string }[];
}

const PIE_COLORS = ["#8B6410", "#1B1B4B", "#A07820", "#0F0F2D"];

function SkeletonCard() {
  return (
    <div className="card rounded-2xl p-5 border-t-[3px] border-t-gray-200 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
      <div className="h-7 bg-gray-200 rounded w-20 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-16" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="card rounded-2xl p-6 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-40 mb-6" />
      <div className="h-64 bg-gray-100 rounded-xl" />
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/dashboard/stats");
      if (!res.ok) throw new Error();
      setStats(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Processing: "badge-blue",
      Shipped: "badge-indigo",
      Delivered: "badge-green",
      Cancelled: "badge-grey",
      Pending: "badge-amber",
    };
    return styles[status] || "badge-grey";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonChart />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-[#DC2626] text-lg mb-4">Failed to load dashboard</p>
        <button onClick={fetchStats} className="btn-gold">
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          title="Total Revenue"
          value={formatPrice(stats.totalRevenue)}
          icon="💰"
          growth={stats.revenueGrowth}
        />
        <StatsCard
          title="Total Orders"
          value={stats.totalOrders}
          icon="📦"
          growth={stats.ordersGrowth}
        />
        <StatsCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon="👥"
          growth={stats.customersGrowth}
        />
        <StatsCard
          title="Total Products"
          value={stats.totalProducts}
          icon="🍪"
          growth={stats.productsGrowth}
          subtitle={stats.lowStockCount > 0 ? `${stats.lowStockCount} low stock` : undefined}
        />
      </div>

      {/* Revenue Chart */}
      <div className="card rounded-2xl p-6">
        <h2 className="font-heading font-bold text-[#1B1B4B] text-lg mb-6">
          Revenue Overview
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#FAF7F2" />
              <XAxis
                dataKey="day"
                stroke="#5A5A7A"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#5A5A7A"
                fontSize={12}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #eee",
                  borderRadius: "12px",
                  color: "#1B1B4B",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [formatPrice(Number(value)), "Revenue"]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#8B6410"
                strokeWidth={3}
                dot={{ fill: "#1B1B4B", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#8B6410" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column: Recent Orders + Category Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-[#1B1B4B] text-lg">
              Recent Orders
            </h2>
            <Link href="/admin/orders" className="text-sm text-[#8B6410] hover:text-[#7A5A0E] font-medium">
              View All →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#5A5A7A] border-b border-gray-100">
                  <th className="pb-3 font-medium">Order ID</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-[#5A5A7A]">
                      No orders yet
                    </td>
                  </tr>
                ) : (
                  stats.recentOrders.map((order) => (
                    <tr key={order._id} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 font-medium text-[#1B1B4B]">
                        {order.orderId}
                      </td>
                      <td className="py-3 text-[#5A5A7A]">{order.customerName}</td>
                      <td className="py-3 text-right font-medium text-[#1B1B4B]">
                        {formatPrice(order.total)}
                      </td>
                      <td className="py-3">
                        <span className={statusBadge(order.status)}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="card rounded-2xl p-6">
          <h2 className="font-heading font-bold text-[#1B1B4B] text-lg mb-4">
            Orders by Category
          </h2>
          <div className="h-64">
            {stats.categoryBreakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#5A5A7A]">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                  >
                    {stats.categoryBreakdown.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #eee",
                      borderRadius: "12px",
                      color: "#1B1B4B",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {stats.categoryBreakdown.map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-1.5 text-xs text-[#5A5A7A]">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                {cat.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockProducts.length > 0 && (
        <div className="card rounded-2xl p-6 border-l-4 border-l-[#D97706]">
          <h2 className="font-heading font-bold text-[#D97706] text-lg mb-4 flex items-center gap-2">
            ⚠️ Low Stock Alert
          </h2>
          <div className="space-y-2 mb-4">
            {stats.lowStockProducts.map((p) => (
              <div key={p._id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-[#1B1B4B] font-medium truncate">{p.name}</span>
                <span className="text-sm text-[#D97706] font-medium shrink-0">{p.stock} left</span>
              </div>
            ))}
          </div>
          <Link href="/admin/products" className="btn-navy-outline text-sm inline-block">
            Manage Products
          </Link>
        </div>
      )}
    </div>
  );
}
