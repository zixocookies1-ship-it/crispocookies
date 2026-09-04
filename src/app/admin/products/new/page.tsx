import ProductForm from "@/components/admin/product-form";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="font-heading font-bold text-[#1B1B4B] text-2xl mb-6">
        Add New Product
      </h1>
      <ProductForm />
    </div>
  );
}
