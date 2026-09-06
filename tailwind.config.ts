import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream:    { DEFAULT: "#FAF7F2", dark: "#F0EBE0" },
        beige:    { DEFAULT: "#F4EFE8" },
        gold:     { DEFAULT: "#C4972A", light: "#D4A94A", hover: "#B08820", 50: "#FDF8ED" },
        royal:    { DEFAULT: "#1B1B4B", light: "#2A2A6B" },
        plum:     { DEFAULT: "#3A2A5C", light: "#5A4A7C" },
        lavender: { DEFAULT: "#B8A9D4", light: "#D4C9E8" },
        espresso: { DEFAULT: "#1A1413" },
        chocolate:{ DEFAULT: "#3D2B1F", light: "#5C3D2E" },
        surface:  { DEFAULT: "#FFFFFF" },
        muted:    { DEFAULT: "#7A6E8A", light: "#9A8EAA" },
        red:      { DEFAULT: "#DC2626" },
        green:    { DEFAULT: "#16A34A" },
        amber:    { DEFAULT: "#D97706" },
      },
      fontFamily: {
        heading: ["var(--font-cormorant)", "Georgia", "serif"],
        body:    ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display": ["4.5rem",    { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "hero":    ["3.5rem",    { lineHeight: "1.1",  letterSpacing: "-0.015em" }],
        "section": ["2.5rem",    { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        "card":    ["1.5rem",    { lineHeight: "1.25" }],
      },
      boxShadow: {
        soft:       "0 2px 6px -2px rgba(28,9,24,0.12), 0 14px 40px -18px rgba(28,9,24,0.28)",
        lift:       "0 6px 12px -6px rgba(28,9,24,0.2), 0 30px 60px -24px rgba(28,9,24,0.36)",
        gold:       "0 0 0 1px rgba(196,151,42,0.45), 0 18px 44px -20px rgba(196,151,42,0.4)",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      animation: {
        "float":       "crispoFloat 6s ease-in-out infinite",
        "rise":        "crispoRise 1s cubic-bezier(.22,1,.36,1) both",
        "reveal":      "crispoReveal 0.7s ease-out both",
        "pulse-ring":  "crispoPulseRing 2s ease-in-out infinite",
        "marquee":     "marquee 25s linear infinite",
      },
      keyframes: {
        crispoFloat: {
          "0%, 100%": { transform: "translateY(0) rotate(-1deg)" },
          "50%":      { transform: "translateY(-14px) rotate(1deg)" },
        },
        crispoRise: {
          "0%":   { opacity: "0", transform: "translateY(40px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        crispoReveal: {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        crispoPulseRing: {
          "0%":   { boxShadow: "0 0 0 0 rgba(99,179,123,0.5)" },
          "100%": { boxShadow: "0 0 0 12px rgba(99,179,123,0)" },
        },
        marquee: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
