import { Product } from "./types";

export const products: Product[] = [
  {
    id: "1",
    name: "Classic Chocolate Chip",
    slug: "classic-chocolate-chip",
    description:
      "Our signature cookies loaded with premium Belgian chocolate chips and a hint of sea salt.",
    longDescription:
      "Crafted with the finest Belgian chocolate chips and a delicate touch of sea salt, our Classic Chocolate Chip cookies are the perfect balance of sweet and savory. Each batch is baked fresh daily using traditional recipes passed down through generations.",
    category: "Chocolate Chip",
    variants: [
      { weight: "100g", price: 149 },
      { weight: "250g", price: 329 },
      { weight: "500g", price: 599 },
    ],
    image: "/cookies/chocolate-chip.jpg",
    images: [
      "/cookies/chocolate-chip.jpg",
      "/cookies/chocolate-chip-2.jpg",
      "/cookies/chocolate-chip-3.jpg",
    ],
    badge: "Bestseller",
    ingredients: [
      "Wheat Flour",
      "Belgian Chocolate Chips",
      "Butter",
      "Brown Sugar",
      "White Sugar",
      "Eggs",
      "Vanilla Extract",
      "Sea Salt",
      "Baking Soda",
    ],
    shippingInfo:
      "Shipped in eco-friendly packaging. Stays fresh for 15 days at room temperature.",
    dietary: ["Vegetarian"],
    rating: 4.8,
    reviewCount: 234,
    bestseller: true,
  },
  {
    id: "2",
    name: "Butter Crunch Cookies",
    slug: "butter-crunch-cookies",
    description:
      "Rich, buttery cookies with a golden crunch that melts in your mouth.",
    longDescription:
      "Our Butter Crunch Cookies are made with real European butter and a touch of vanilla, baked to golden perfection. The crispy exterior gives way to a tender, melt-in-your-mouth center.",
    category: "Butter",
    variants: [
      { weight: "100g", price: 129 },
      { weight: "250g", price: 299 },
      { weight: "500g", price: 549 },
    ],
    image: "/cookies/butter-crunch.jpg",
    images: [
      "/cookies/butter-crunch.jpg",
      "/cookies/butter-crunch-2.jpg",
    ],
    badge: "New",
    ingredients: [
      "European Butter",
      "Wheat Flour",
      "Sugar",
      "Vanilla Extract",
      "Salt",
      "Baking Powder",
    ],
    shippingInfo:
      "Shipped in eco-friendly packaging. Stays fresh for 12 days at room temperature.",
    dietary: ["Vegetarian"],
    rating: 4.6,
    reviewCount: 156,
  },
  {
    id: "3",
    name: "Oatmeal Raisin Delight",
    slug: "oatmeal-raisin-delight",
    description:
      "Hearty oatmeal cookies studded with plump raisins and a dash of cinnamon.",
    longDescription:
      "A wholesome treat that combines rolled oats with juicy raisins and warm cinnamon. Our Oatmeal Raisin Delight cookies are both satisfying and delicious, perfect with your morning tea.",
    category: "Oatmeal",
    variants: [
      { weight: "100g", price: 139 },
      { weight: "250g", price: 319 },
      { weight: "500g", price: 579 },
    ],
    image: "/cookies/oatmeal-raisin.jpg",
    ingredients: [
      "Rolled Oats",
      "Wheat Flour",
      "Raisins",
      "Butter",
      "Brown Sugar",
      "Cinnamon",
      "Eggs",
      "Honey",
      "Baking Soda",
    ],
    shippingInfo:
      "Shipped in eco-friendly packaging. Stays fresh for 14 days at room temperature.",
    dietary: ["Vegetarian"],
    rating: 4.5,
    reviewCount: 98,
  },
  {
    id: "4",
    name: "Double Chocolate Fudge",
    slug: "double-chocolate-fudge",
    description:
      "Decadent dark chocolate cookies with cocoa chunks and a fudgy center.",
    longDescription:
      "For the true chocolate lover, our Double Chocolate Fudge cookies feature rich cocoa dough loaded with premium chocolate chunks. The result is an intensely chocolatey experience with a wonderfully fudgy texture.",
    category: "Chocolate Chip",
    variants: [
      { weight: "100g", price: 169 },
      { weight: "250g", price: 369 },
      { weight: "500g", price: 679 },
    ],
    image: "/cookies/double-chocolate.jpg",
    badge: "Popular",
    ingredients: [
      "Dark Chocolate",
      "Cocoa Powder",
      "Wheat Flour",
      "Butter",
      "Sugar",
      "Eggs",
      "Vanilla Extract",
      "Baking Soda",
      "Salt",
    ],
    shippingInfo:
      "Shipped in eco-friendly packaging. Stays fresh for 15 days at room temperature.",
    dietary: ["Vegetarian"],
    rating: 4.9,
    reviewCount: 312,
    bestseller: true,
  },
  {
    id: "5",
    name: "Eggless Choco Walnut",
    slug: "eggless-choco-walnut",
    description:
      "Eggless chocolate cookies with crunchy walnuts, perfect for everyone.",
    longDescription:
      "Our Eggless Choco Walnut cookies prove that eggless can be equally delicious. Loaded with chocolate chips and crunchy walnuts, these cookies are perfect for vegetarians and anyone looking for a rich treat.",
    category: "Chocolate Chip",
    variants: [
      { weight: "100g", price: 159 },
      { weight: "250g", price: 349 },
      { weight: "500g", price: 629 },
    ],
    image: "/cookies/choco-walnut.jpg",
    badge: "Eggless",
    ingredients: [
      "Wheat Flour",
      "Chocolate Chips",
      "Walnuts",
      "Butter",
      "Sugar",
      "Milk",
      "Vanilla Extract",
      "Baking Soda",
      "Salt",
    ],
    shippingInfo:
      "Shipped in eco-friendly packaging. Stays fresh for 12 days at room temperature.",
    dietary: ["Eggless", "Vegetarian"],
    rating: 4.7,
    reviewCount: 187,
  },
  {
    id: "6",
    name: "Almond Biscotti Crunch",
    slug: "almond-biscotti-crunch",
    description:
      "Italian-inspired twice-baked cookies with sliced almonds and a crisp finish.",
    longDescription:
      "Inspired by traditional Italian biscotti, our Almond Biscotti Crunch cookies are twice-baked for the perfect crunch. Packed with sliced almonds and a hint of orange zest, they're ideal for dunking in coffee or tea.",
    category: "Butter",
    variants: [
      { weight: "100g", price: 179 },
      { weight: "250g", price: 399 },
    ],
    image: "/cookies/almond-biscotti.jpg",
    ingredients: [
      "Almonds",
      "Wheat Flour",
      "Sugar",
      "Butter",
      "Eggs",
      "Orange Zest",
      "Vanilla Extract",
      "Baking Powder",
      "Salt",
    ],
    shippingInfo:
      "Shipped in eco-friendly packaging. Stays fresh for 21 days at room temperature.",
    dietary: ["Vegetarian"],
    rating: 4.4,
    reviewCount: 76,
  },
  {
    id: "7",
    name: "Gift Box - Premium Assortment",
    slug: "gift-box-premium-assortment",
    description:
      "A curated selection of our finest cookies in an elegant gift box.",
    longDescription:
      "Our Premium Assortment Gift Box contains a carefully curated selection of our best cookies, beautifully packaged in our signature navy and gold gift box. Perfect for birthdays, festivals, or just to show someone you care.",
    category: "Gift Boxes",
    variants: [
      { weight: "500g", price: 799 },
      { weight: "1kg", price: 1499 },
    ],
    image: "/cookies/gift-box.jpg",
    badge: "Gift",
    ingredients: [
      "Assorted Cookies",
      "Premium Gift Packaging",
    ],
    shippingInfo:
      "Shipped in premium gift packaging with a personalized message card.",
    dietary: ["Vegetarian"],
    rating: 4.9,
    reviewCount: 145,
    bestseller: true,
  },
  {
    id: "8",
    name: "Gluten-Free Peanut Butter",
    slug: "gluten-free-peanut-butter",
    description:
      "Delicious gluten-free peanut butter cookies that everyone can enjoy.",
    longDescription:
      "Made with real peanut butter and almond flour, our Gluten-Free Peanut Butter cookies are proof that gluten-free doesn't mean flavor-free. Rich, nutty, and utterly satisfying.",
    category: "Oatmeal",
    variants: [
      { weight: "100g", price: 189 },
      { weight: "250g", price: 429 },
    ],
    image: "/cookies/peanut-butter.jpg",
    badge: "Gluten-Free",
    ingredients: [
      "Peanut Butter",
      "Almond Flour",
      "Sugar",
      "Eggs",
      "Butter",
      "Baking Soda",
      "Salt",
    ],
    shippingInfo:
      "Shipped in eco-friendly packaging. Stays fresh for 10 days at room temperature.",
    dietary: ["Gluten-Free", "Vegetarian"],
    rating: 4.3,
    reviewCount: 62,
  },
];

export const categories = [
  { name: "Chocolate Chip", icon: "cookie", count: 3 },
  { name: "Butter", icon: "butter", count: 2 },
  { name: "Oatmeal", icon: "oatmeal", count: 2 },
  { name: "Gift Boxes", icon: "gift", count: 1 },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter((p) => p.category === category);
}

export function getBestSellers(): Product[] {
  return products.filter((p) => p.bestseller);
}
