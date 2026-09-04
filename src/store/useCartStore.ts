"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  variant: string;
  price: number;
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
          const existing = state.items.find(
            (i) => i.productId === item.productId && i.variant === item.variant
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && i.variant === item.variant
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
            (i) => !(i.productId === productId && i.variant === variant)
          ),
        }));
      },

      updateQty: (productId, variant, qty) => {
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter(
                  (i) => !(i.productId === productId && i.variant === variant)
                )
              : state.items.map((i) =>
                  i.productId === productId && i.variant === variant
                    ? { ...i, qty }
                    : i
                ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotal: () =>
        get().items.reduce((sum, item) => sum + item.price * item.qty, 0),

      getCount: () =>
        get().items.reduce((sum, item) => sum + item.qty, 0),
    }),
    { name: "crispo-cart" }
  )
);
