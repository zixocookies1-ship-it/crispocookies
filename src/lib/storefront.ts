import { formatPrice } from "./helpers";

export interface StoreVariant {
  weight: string;
  price: number;
  mrp?: number;
  stock: number;
}

export interface StoreProduct {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  fullDescription?: string;
  ingredients: string[];
  images: string[];
  category?: { _id: string; name: string; slug: string };
  tags: string[];
  variants: StoreVariant[];
  emoji: string;
  badge: string;
}

interface ApiProduct {
  _id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  fullDescription?: string;
  ingredients?: string;
  images: string[];
  category?: { _id: string; name: string; slug: string };
  tags?: string[];
  variants?: { weight: string; price: number; mrp?: number; stock?: number }[];
}

const emojiBySlug: Record<string, string> = {
  "double-chocolate-cookie": "🍪",
  "rose-cookie": "🌹",
  "pineapple-cookie": "🍍",
  "pine-apple-cookie": "🍍",
  "dry-seed-cookies": "🌱",
  "all-mix-cookies": "🥣",
  "kaju-cookie": "🥜",
  "double-chocolate-brownie": "🍫",
  "double-chocolate-oats-brownie": "🍫",
  "kaju-oats-brownie": "🥜",
};

export function productEmoji(product: Pick<StoreProduct, "slug" | "name">): string {
  if (emojiBySlug[product.slug]) return emojiBySlug[product.slug];
  if (product.name.toLowerCase().includes("brownie")) return "🍫";
  return "🍪";
}

function splitIngredients(ingredients?: string): string[] {
  if (!ingredients) return [];
  return ingredients
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function mapStoreProduct(raw: ApiProduct): StoreProduct {
  const variants = (raw.variants || []).map((v) => ({
    weight: v.weight,
    price: v.price ?? 0,
    mrp: v.mrp,
    stock: v.stock ?? 0,
  }));

  const product: StoreProduct = {
    id: String(raw._id),
    name: raw.name,
    slug: raw.slug,
    shortDescription: raw.shortDescription,
    fullDescription: raw.fullDescription,
    ingredients: splitIngredients(raw.ingredients),
    images: raw.images || [],
    category: raw.category,
    tags: raw.tags || [],
    variants,
    emoji: "",
    badge: raw.tags?.includes("bestseller") ? "Bestseller" : "",
  };
  product.emoji = productEmoji(product);
  return product;
}

export function cheapestVariant(product: StoreProduct): StoreVariant | undefined {
  if (!product.variants.length) return undefined;
  return [...product.variants].sort((a, b) => a.price - b.price)[0];
}

export function discountOf(variant: StoreVariant): number {
  if (variant.mrp && variant.mrp > variant.price) {
    return Math.round(((variant.mrp - variant.price) / variant.mrp) * 100);
  }
  return 0;
}

export function formatINR(price: number): string {
  return formatPrice(price);
}

export interface FetchProductsOptions {
  category?: string;
  search?: string;
}

// Short-lived in-memory cache: Home, Shop, Cookies, Brownies and
// Search all request the same product list — serve repeat navigations from
// memory instead of refetching identical payloads.
const PRODUCT_CACHE_TTL_MS = 60_000;
const productCache = new Map<string, { at: number; data: StoreProduct[] }>();
const inflight = new Map<string, Promise<StoreProduct[]>>();

export function invalidateProductCache() {
  productCache.clear();
}

export async function fetchProducts(options: FetchProductsOptions = {}): Promise<StoreProduct[]> {
  const key = JSON.stringify(options);
  const cached = productCache.get(key);
  if (cached && Date.now() - cached.at < PRODUCT_CACHE_TTL_MS) {
    return cached.data;
  }
  const pending = inflight.get(key);
  if (pending) return pending;

  const task = (async () => {
    const params = new URLSearchParams({ limit: "100" });
    if (options.category) params.set("category", options.category);
    const res = await fetch(`/api/products?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load products");
    const data = await res.json();
    const list: ApiProduct[] = Array.isArray(data?.products) ? data.products : [];
    let products = list.map(mapStoreProduct);

    if (options.search) {
      const q = options.search.toLowerCase().trim();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.shortDescription || "").toLowerCase().includes(q)
      );
    }
    productCache.set(key, { at: Date.now(), data: products });
    return products;
  })();

  inflight.set(key, task);
  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}

export async function fetchProductBySlug(slug: string): Promise<StoreProduct> {
  const res = await fetch(`/api/products/${slug}`, { cache: "no-store" });
  if (res.status === 404) {
    throw Object.assign(new Error("Product not found"), { notFound: true });
  }
  if (!res.ok) throw new Error("Failed to load product");
  const data: ApiProduct = await res.json();
  return mapStoreProduct(data);
}

export const WHATSAPP_NUMBER = "917569831560";
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;