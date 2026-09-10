"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistStore {
  slugs: string[];
  toggle: (slug: string) => void;
  remove: (slug: string) => void;
  clear: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set) => ({
      slugs: [],
      toggle: (slug) =>
        set((state) => ({
          slugs: state.slugs.includes(slug)
            ? state.slugs.filter((s) => s !== slug)
            : [...state.slugs, slug],
        })),
      remove: (slug) =>
        set((state) => ({
          slugs: state.slugs.filter((s) => s !== slug),
        })),
      clear: () => set({ slugs: [] }),
    }),
    { name: "crispo-wishlist", skipHydration: true }
  )
);