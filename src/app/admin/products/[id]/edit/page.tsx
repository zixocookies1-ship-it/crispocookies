"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import ProductForm from "@/components/admin/product-form";

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

export default function EditProductPage() {
  const params = useParams();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/admin/products/${params.id}`);
        if (!res.ok) throw new Error();
        setProduct(await res.json());
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="card rounded-2xl p-6">
            <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center py-20">
        <p className="text-[#DC2626] text-lg mb-4">Failed to load product</p>
        <a href="/admin/products" className="btn-gold text-sm">
          Back to Products
        </a>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading font-bold text-[#1B1B4B] text-2xl mb-6">
        Edit Product
      </h1>
      <ProductForm product={product} />
    </div>
  );
}
