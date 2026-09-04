"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/helpers";

interface Variant {
  weight: string;
  price: string;
  stock: string;
}

interface Category {
  _id: string;
  name: string;
}

interface ProductData {
  _id: string;
  name: string;
  slug: string;
  category: { _id: string; name: string } | string;
  tags: string[];
  isActive: boolean;
  shortDescription: string;
  description: string;
  images: string[];
  variants: { weight: string; price: number; stock: number }[];
  ingredients: string;
}

interface Props {
  product?: ProductData;
}

const AVAILABLE_TAGS = ["Bestseller", "Eggless", "Gluten-Free", "Veg"];

export default function ProductForm({ product }: Props) {
  const router = useRouter();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name || "");
  const [slug, setSlug] = useState(product?.slug || "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [categoryId, setCategoryId] = useState(
    typeof product?.category === "object" ? product?.category._id : product?.category || ""
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<string[]>(product?.tags || []);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [shortDescription, setShortDescription] = useState(product?.shortDescription || "");
  const [description, setDescription] = useState(product?.description || "");
  const [images, setImages] = useState<string[]>(product?.images || []);
  const [variants, setVariants] = useState<Variant[]>(
    product?.variants?.map((v) => ({
      weight: v.weight,
      price: String(v.price),
      stock: String(v.stock),
    })) || [{ weight: "", price: "", stock: "" }]
  );
  const [ingredients, setIngredients] = useState(product?.ingredients || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited]);

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addVariant = () => {
    setVariants([...variants, { weight: "", price: "", stock: "" }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length === 1) return;
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof Variant, value: string) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || images.length >= 5) return;
    setUploading(true);

    for (let i = 0; i < files.length && images.length + i < 5; i++) {
      const formData = new FormData();
      formData.append("file", files[i]);
      try {
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          setImages((prev) => [...prev, data.url]);
        }
      } catch {}
    }
    setUploading(false);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Product name is required";
    if (!slug.trim()) newErrors.slug = "Slug is required";
    if (!categoryId) newErrors.category = "Category is required";
    if (variants.length === 0 || variants.every((v) => !v.weight || !v.price)) {
      newErrors.variants = "At least one variant with weight and price is required";
    }
    if (images.length === 0) newErrors.images = "At least one image is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (publish: boolean) => {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      name: name.trim(),
      slug,
      category: categoryId,
      tags,
      isActive: publish,
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      images,
      variants: variants
        .filter((v) => v.weight && v.price)
        .map((v) => ({
          weight: v.weight,
          price: Number(v.price),
          stock: Number(v.stock) || 0,
        })),
      ingredients: ingredients.trim(),
    };

    try {
      const url = isEdit
        ? `/api/admin/products/${product!._id}`
        : "/api/admin/products";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setToast(isEdit ? "Product updated!" : "Product created!");
        setTimeout(() => router.push("/admin/products"), 1000);
      } else {
        const data = await res.json();
        setToast(data.error || "Failed to save product");
      }
    } catch {
      setToast("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleImageUpload(e.dataTransfer.files);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 bg-[#16A34A] text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <span>{toast}</span>
          <button onClick={() => setToast("")} className="ml-2 text-white/80 hover:text-white">✕</button>
        </div>
      )}

      {/* Section 1: Basic Info */}
      <div className="card rounded-2xl p-6">
        <h3 className="font-heading font-bold text-[#1B1B4B] text-lg mb-4">Basic Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Product Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field w-full"
              placeholder="Chocolate Chip Cookies"
            />
            {errors.name && <p className="text-xs text-[#DC2626] mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Slug *</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
              className="input-field w-full"
              placeholder="chocolate-chip-cookies"
            />
            {errors.slug && <p className="text-xs text-[#DC2626] mt-1">{errors.slug}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input-field w-full"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-[#DC2626] mt-1">{errors.category}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Status</label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#16A34A]/10 text-[#16A34A]"
                  : "bg-gray-100 text-[#5A5A7A]"
              }`}
            >
              {isActive ? "Active" : "Draft"}
            </button>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-[#1B1B4B] mb-2">Tags</label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  tags.includes(tag)
                    ? "bg-[#8B6410] text-white"
                    : "border border-[#8B6410] text-[#8B6410] hover:bg-[#8B6410]/10"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: Descriptions */}
      <div className="card rounded-2xl p-6">
        <h3 className="font-heading font-bold text-[#1B1B4B] text-lg mb-4">Descriptions</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Short Description</label>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value.slice(0, 150))}
              className="input-field w-full h-20 resize-none"
              placeholder="Brief description for product cards..."
            />
            <p className="text-xs text-[#5A5A7A] mt-1 text-right">{shortDescription.length}/150</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B1B4B] mb-1">Full Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field w-full h-36 resize-y"
              placeholder="Detailed product description..."
            />
          </div>
        </div>
      </div>

      {/* Section 3: Images */}
      <div className="card rounded-2xl p-6">
        <h3 className="font-heading font-bold text-[#1B1B4B] text-lg mb-4">Images</h3>
        {images.length < 5 && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById("image-input")?.click()}
            className="border-2 border-dashed border-[#8B6410]/30 rounded-xl p-8 text-center cursor-pointer hover:border-[#8B6410]/60 transition-colors"
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#8B6410] border-t-transparent mx-auto" />
            ) : (
              <>
                <p className="text-[#5A5A7A] text-sm mb-1">Drag & drop images or click to browse</p>
                <p className="text-xs text-[#5A5A7A]/60">Max 5 images</p>
              </>
            )}
            <input
              id="image-input"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files)}
            />
          </div>
        )}
        {errors.images && <p className="text-xs text-[#DC2626] mt-2">{errors.images}</p>}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                <div className="aspect-square bg-[#FAF7F2] rounded-xl flex items-center justify-center text-2xl overflow-hidden">
                  🍪
                </div>
                {i === 0 && (
                  <span className="absolute top-2 left-2 bg-[#8B6410] text-white text-xs px-2 py-0.5 rounded-full">
                    Main
                  </span>
                )}
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-2 right-2 w-6 h-6 bg-[#DC2626] text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 4: Variants */}
      <div className="card rounded-2xl p-6">
        <h3 className="font-heading font-bold text-[#1B1B4B] text-lg mb-4">Variants *</h3>
        {errors.variants && <p className="text-xs text-[#DC2626] mb-3">{errors.variants}</p>}
        <div className="space-y-3">
          {variants.map((variant, i) => (
            <div key={i} className="flex items-center gap-3 flex-wrap">
              <input
                type="text"
                value={variant.weight}
                onChange={(e) => updateVariant(i, "weight", e.target.value)}
                className="input-field flex-1 min-w-[120px]"
                placeholder="Weight (e.g. 250g)"
              />
              <input
                type="number"
                value={variant.price}
                onChange={(e) => updateVariant(i, "price", e.target.value)}
                className="input-field flex-1 min-w-[100px]"
                placeholder="Price (₹)"
                min="0"
              />
              <input
                type="number"
                value={variant.stock}
                onChange={(e) => updateVariant(i, "stock", e.target.value)}
                className="input-field flex-1 min-w-[100px]"
                placeholder="Stock"
                min="0"
              />
              <button
                onClick={() => removeVariant(i)}
                disabled={variants.length === 1}
                className="text-[#DC2626] hover:text-red-700 disabled:opacity-30 transition-colors text-lg"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button onClick={addVariant} className="btn-navy-outline text-sm mt-4">
          + Add Variant
        </button>
      </div>

      {/* Section 5: Ingredients */}
      <div className="card rounded-2xl p-6">
        <h3 className="font-heading font-bold text-[#1B1B4B] text-lg mb-4">Ingredients</h3>
        <textarea
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          className="input-field w-full h-24 resize-y"
          placeholder="List of ingredients (optional)"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pb-8">
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="btn-navy-outline text-sm disabled:opacity-50"
        >
          Save as Draft
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="btn-gold text-sm disabled:opacity-50"
        >
          {saving ? "Saving..." : "Publish Product"}
        </button>
      </div>
    </div>
  );
}
