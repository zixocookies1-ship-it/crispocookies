"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/helpers";

interface Product {
  _id: string;
  name: string;
  slug: string;
  category: { name: string; _id: string };
  variants: { weight: string; price: number; stock: number }[];
  images: string[];
  isActive: boolean;
}

interface Category {
  _id: string;
  name: string;
}

function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="font-heading font-bold text-[#1B1B4B] text-lg mb-2">{title}</h3>
        <p className="text-sm text-[#5A5A7A] mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-[#5A5A7A] hover:text-[#1B1B4B] transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-red text-sm">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50 animate-pulse">
      <td className="py-4 px-4"><div className="w-12 h-12 bg-gray-200 rounded-lg" /></td>
      <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
      <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
      <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
      <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
      <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
    </tr>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string }>({ open: false, id: "" });
  const perPage = 10;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(perPage),
      });
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/products?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProducts(data.products || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const toggleStatus = async (product: Product) => {
    try {
      await fetch(`/api/admin/products/${product._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      fetchProducts();
    } catch {}
  };

  const deleteProduct = async () => {
    try {
      await fetch(`/api/admin/products/${deleteModal.id}`, { method: "DELETE" });
      setDeleteModal({ open: false, id: "" });
      fetchProducts();
    } catch {}
  };

  const minPrice = (variants: Product["variants"]) =>
    variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : 0;

  const totalStock = (variants: Product["variants"]) =>
    variants.reduce((sum, v) => sum + v.stock, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/products/new" className="btn-gold text-sm whitespace-nowrap">
          + Add New Product
        </Link>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input-field text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="input-field text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field text-sm"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#5A5A7A] border-b border-gray-100 bg-gray-50/50">
                <th className="py-3 px-4 font-medium">Image</th>
                <th className="py-3 px-4 font-medium">Name</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium">Variants</th>
                <th className="py-3 px-4 font-medium">Min Price</th>
                <th className="py-3 px-4 font-medium">Stock</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : error ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <p className="text-[#DC2626] mb-3">Failed to load products</p>
                    <button onClick={fetchProducts} className="btn-gold text-sm">Retry</button>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-[#5A5A7A]">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const stock = totalStock(product.variants);
                  return (
                    <tr key={product._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="w-12 h-12 bg-[#FAF7F2] rounded-lg flex items-center justify-center text-xl">
                          🍪
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-[#1B1B4B]">{product.name}</p>
                      </td>
                      <td className="py-4 px-4 text-[#5A5A7A]">
                        {product.category?.name || "-"}
                      </td>
                      <td className="py-4 px-4 text-[#5A5A7A] text-xs">
                        {product.variants.map((v) => v.weight).join(", ") || "-"}
                      </td>
                      <td className="py-4 px-4 font-medium text-[#1B1B4B]">
                        {formatPrice(minPrice(product.variants))}
                      </td>
                      <td className="py-4 px-4">
                        {stock === 0 ? (
                          <span className="badge-red text-xs">Out of Stock</span>
                        ) : stock < 10 ? (
                          <span className="badge-amber text-xs flex items-center gap-1">
                            ⚠️ {stock}
                          </span>
                        ) : (
                          <span className="badge-green text-xs">{stock}</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => toggleStatus(product)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            product.isActive
                              ? "bg-[#16A34A]/10 text-[#16A34A] hover:bg-[#16A34A]/20"
                              : "bg-gray-100 text-[#5A5A7A] hover:bg-gray-200"
                          }`}
                        >
                          {product.isActive ? "Active" : "Draft"}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/products/${product._id}/edit`}
                            className="text-[#8B6410] hover:text-[#7A5A0E] transition-colors"
                            title="Edit"
                          >
                            ✏️
                          </Link>
                          <button
                            onClick={() => setDeleteModal({ open: true, id: product._id })}
                            className="text-[#DC2626] hover:text-red-700 transition-colors"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      <ConfirmModal
        open={deleteModal.open}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={deleteProduct}
        onCancel={() => setDeleteModal({ open: false, id: "" })}
      />
    </div>
  );
}
