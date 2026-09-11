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
        cream:    { DEFAULT: "#F7F2EA", dark: "#201810", soft: "#EEDFC6" },
        beige:    { DEFAULT: "#EFE5D3" },
        gold:     { DEFAULT: "#C99528", light: "#E0B34A", soft: "#E0B34A", hover: "#A5771B", deep: "#A5771B", 50: "#2A2116" },
        royal:    { DEFAULT: "#1B1B4B", light: "#2A2A6B" },
        plum:     { DEFAULT: "#3A2A5C", light: "#5A4A7C" },
        lavender: { DEFAULT: "#E7A9E8", light: "#D99BE0", soft: "#CBB8F0" },
        rose:     { DEFAULT: "#D99BE0" },
        espresso: { DEFAULT: "#201810" },
        cocoa:    { DEFAULT: "#19130C" },
        chocolate:{ DEFAULT: "#2A2116", light: "#342A1C" },
        cacao:    { DEFAULT: "#342A1C" },
        surface:  { DEFAULT: "#342A1C" },
        muted:    { DEFAULT: "#C4B5A0", light: "#D8C9AF" },
        faded:    { DEFAULT: "#9A8B76" },
        creamel:  { DEFAULT: "#EADFCB" },
        red:      { DEFAULT: "#DC2626" },
        green:    { DEFAULT: "#16A34A" },
        whatsapp: { DEFAULT: "#25D366", deep: "#1FA855" },
        amber:    { DEFAULT: "#D97706" },
      },
      fontFamily: {
        heading: ["var(--font-playfair)", "Georgia", "serif"],
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
      transitionDuration: {
        "1500": "1500ms",
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
