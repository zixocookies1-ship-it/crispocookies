export interface ProductVariant {
  weight: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  category: string;
  variants: ProductVariant[];
  image: string;
  images?: string[];
  badge?: string;
  ingredients?: string[];
  shippingInfo?: string;
  dietary?: string[];
  rating?: number;
  reviewCount?: number;
  bestseller?: boolean;
}

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  image: string;
  weight: string;
  price: number;
  quantity: number;
}
