"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  variant: { weight: string; price: number };
  qty: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">) => void;
  removeItem: (productId: string, variant: string) => void;
  updateQty: (productId: string, variant: string, qty: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          const key = `${item.productId}-${item.variant.weight}`;
          const existing = state.items.find(
            (i) => `${i.productId}-${i.variant.weight}` === key
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                `${i.productId}-${i.variant.weight}` === key
                  ? { ...i, qty: i.qty + 1 }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, qty: 1 }] };
        });
      },

      removeItem: (productId, variant) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.variant.weight === variant)
          ),
        }));
      },

      updateQty: (productId, variant, qty) => {
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter(
                  (i) => !(i.productId === productId && i.variant.weight === variant)
                )
              : state.items.map((i) =>
                  i.productId === productId && i.variant.weight === variant
                    ? { ...i, qty }
                    : i
                ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotal: () =>
        get().items.reduce((sum, i) => sum + i.variant.price * i.qty, 0),

      getCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    { name: "crispo-cart" }
  )
);
