"use client";

import { useState, useEffect, useCallback } from "react";
import { slugify } from "@/lib/helpers";

interface Category {
  _id: string;
  name: string;
  slug: string;
  productCount: number;
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
      {[...Array(4)].map((_, i) => (
        <td key={i} className="py-4 px-4">
          <div className="h-4 bg-gray-200 rounded w-24" />
        </td>
      ))}
    </tr>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({
    open: false,
    id: "",
    name: "",
  });
  const [toast, setToast] = useState("");

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (!slugEdited) {
      setNewSlug(slugify(newName));
    }
  }, [newName, slugEdited]);

  const createCategory = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), slug: newSlug }),
      });
      if (res.ok) {
        setToast("Category created!");
        setNewName("");
        setNewSlug("");
        setSlugEdited(false);
        setShowForm(false);
        fetchCategories();
      } else {
        const data = await res.json();
        setToast(data.error || "Failed to create category");
      }
    } catch {
      setToast("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const updateCategory = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), slug: editSlug }),
      });
      if (res.ok) {
        setToast("Category updated!");
        setEditingId(null);
        fetchCategories();
      } else {
        const data = await res.json();
        setToast(data.error || "Failed to update");
      }
    } catch {
      setToast("Something went wrong");
    }
  };

  const deleteCategory = async () => {
    try {
      const res = await fetch(`/api/admin/categories/${deleteModal.id}`, { method: "DELETE" });
      if (res.ok) {
        setToast("Category deleted!");
        setDeleteModal({ open: false, id: "", name: "" });
        fetchCategories();
      } else {
        const data = await res.json();
        setToast(data.error || "Cannot delete category with products");
      }
    } catch {
      setToast("Something went wrong");
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat._id);
    setEditName(cat.name);
    setEditSlug(cat.slug);
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 bg-[#16A34A] text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <span>{toast}</span>
          <button onClick={() => setToast("")} className="ml-2 text-white/80 hover:text-white">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-[#1B1B4B] text-xl">Categories</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold text-sm">
          + Add Category
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setSlugEdited(false); }}
                className="input-field w-full"
                placeholder="Category name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Slug</label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => { setNewSlug(e.target.value); setSlugEdited(true); }}
                className="input-field w-full"
                placeholder="category-slug"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={createCategory} disabled={saving || !newName.trim()} className="btn-gold text-sm disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewName(""); setNewSlug(""); setSlugEdited(false); }}
              className="px-4 py-2 text-sm text-[#5A5A7A] hover:text-[#1B1B4B] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#5A5A7A] border-b border-gray-100 bg-gray-50/50">
                <th className="py-3 px-4 font-medium">Name</th>
                <th className="py-3 px-4 font-medium">Slug</th>
                <th className="py-3 px-4 font-medium">Products</th>
                <th className="py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
              ) : error ? (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <p className="text-[#DC2626] mb-3">Failed to load categories</p>
                    <button onClick={fetchCategories} className="btn-gold text-sm">Retry</button>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-[#5A5A7A]">
                    No categories yet
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4">
                      {editingId === cat._id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="input-field text-sm py-1.5"
                        />
                      ) : (
                        <span className="font-medium text-[#1B1B4B]">{cat.name}</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {editingId === cat._id ? (
                        <input
                          type="text"
                          value={editSlug}
                          onChange={(e) => setEditSlug(e.target.value)}
                          className="input-field text-sm py-1.5"
                        />
                      ) : (
                        <span className="text-[#5A5A7A] text-xs">{cat.slug}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-[#5A5A7A]">{cat.productCount}</td>
                    <td className="py-4 px-4">
                      {editingId === cat._id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateCategory(cat._id)}
                            className="text-[#16A34A] hover:text-green-700 text-sm font-medium transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-[#5A5A7A] hover:text-[#1B1B4B] text-sm transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(cat)}
                            className="text-[#8B6410] hover:text-[#7A5A0E] transition-colors"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setDeleteModal({ open: true, id: cat._id, name: cat.name })}
                            className="text-[#DC2626] hover:text-red-700 transition-colors"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={deleteModal.open}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteModal.name}"? Products using this category will need to be reassigned.`}
        onConfirm={deleteCategory}
        onCancel={() => setDeleteModal({ open: false, id: "", name: "" })}
      />
    </div>
  );
}
