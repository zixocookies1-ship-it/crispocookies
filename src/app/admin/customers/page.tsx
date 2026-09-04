"use client";

import { useState, useEffect, useCallback } from "react";
import { formatPrice, timeAgo } from "@/lib/helpers";

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

interface CustomerOrder {
  _id: string;
  orderId: string;
  total: number;
  status: string;
  createdAt: string;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="py-4 px-4">
          <div className="h-4 bg-gray-200 rounded w-20" />
        </td>
      ))}
    </tr>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<{ open: boolean; customer: Customer | null }>({
    open: false,
    customer: null,
  });
  const [drawerOrders, setDrawerOrders] = useState<CustomerOrder[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/customers?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : data.customers || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openDrawer = async (customer: Customer) => {
    setDrawer({ open: true, customer });
    setDrawerLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${customer._id}/orders`);
      if (res.ok) {
        const data = await res.json();
        setDrawerOrders(Array.isArray(data) ? data.slice(0, 5) : []);
      }
    } catch {
      setDrawerOrders([]);
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawer({ open: false, customer: null });
    setDrawerOrders([]);
  };

  return (
    <div className="space-y-5">
      <input
        type="text"
        placeholder="Search customers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input-field text-sm max-w-sm"
      />

      <div className="card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#5A5A7A] border-b border-gray-100 bg-gray-50/50">
                <th className="py-3 px-4 font-medium">Name</th>
                <th className="py-3 px-4 font-medium">Email</th>
                <th className="py-3 px-4 font-medium">Phone</th>
                <th className="py-3 px-4 font-medium">Total Orders</th>
                <th className="py-3 px-4 font-medium">Total Spent</th>
                <th className="py-3 px-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : error ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <p className="text-[#DC2626] mb-3">Failed to load customers</p>
                    <button onClick={fetchCustomers} className="btn-gold text-sm">Retry</button>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#5A5A7A]">
                    No customers found
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer._id}
                    onClick={() => openDrawer(customer)}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-4 font-medium text-[#1B1B4B]">{customer.name}</td>
                    <td className="py-4 px-4 text-[#5A5A7A]">{customer.email}</td>
                    <td className="py-4 px-4 text-[#5A5A7A]">{customer.phone || "-"}</td>
                    <td className="py-4 px-4 text-[#5A5A7A]">{customer.totalOrders}</td>
                    <td className="py-4 px-4 font-medium text-[#1B1B4B]">
                      {formatPrice(customer.totalSpent)}
                    </td>
                    <td className="py-4 px-4 text-[#5A5A7A] text-xs">
                      {new Date(customer.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer Overlay */}
      {drawer.open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
          <div className="fixed top-0 right-0 h-full w-full max-w-[400px] bg-white shadow-2xl z-50 flex flex-col">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading font-bold text-[#1B1B4B] text-lg">
                  {drawer.customer?.name}
                </h3>
                <button
                  onClick={closeDrawer}
                  className="text-[#5A5A7A] hover:text-[#1B1B4B] text-xl"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-[#5A5A7A]">{drawer.customer?.email}</p>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <h4 className="font-medium text-[#1B1B4B] mb-3 text-sm">Recent Orders</h4>
              {drawerLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />
                  ))}
                </div>
              ) : drawerOrders.length === 0 ? (
                <p className="text-sm text-[#5A5A7A] text-center py-8">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {drawerOrders.map((order) => (
                    <div
                      key={order._id}
                      className="border border-gray-100 rounded-xl p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#1B1B4B]">
                          {order.orderId}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            order.status === "Delivered"
                              ? "bg-[#16A34A]/10 text-[#16A34A]"
                              : order.status === "Cancelled"
                              ? "bg-gray-100 text-[#5A5A7A]"
                              : "bg-[#1B1B4B]/10 text-[#1B1B4B]"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-[#5A5A7A]">{formatPrice(order.total)}</span>
                        <span className="text-xs text-[#5A5A7A]">{timeAgo(new Date(order.createdAt))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-100">
              <a
                href={`/admin/orders?search=${drawer.customer?.phone || drawer.customer?.name}`}
                className="btn-gold text-sm text-center block"
              >
                View All Orders
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
