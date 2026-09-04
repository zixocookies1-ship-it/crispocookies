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
        navy:     { DEFAULT: "#1B1B4B", dark: "#0F0F2D", light: "#2A2A6B" },
        gold:     { DEFAULT: "#8B6410", light: "#A07820", hover: "#7A5A0E", 50: "#FDF8ED" },
        cream:    { DEFAULT: "#FAF7F2", dark: "#F0EBE0" },
        surface:  { DEFAULT: "#FFFFFF" },
        muted:    { DEFAULT: "#5A5A7A", light: "#8888A4" },
        brown:    { DEFAULT: "#3D2B1F", light: "#5C3D2E" },
        red:      { DEFAULT: "#DC2626" },
        green:    { DEFAULT: "#16A34A" },
        amber:    { DEFAULT: "#D97706" },
      },
      fontFamily: {
        heading: ["var(--font-playfair)", "serif"],
        body:    ["var(--font-dm-sans)", "sans-serif"],
      },
      fontSize: {
        "display": ["4.5rem",    { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "hero":    ["3.5rem",    { lineHeight: "1.1",  letterSpacing: "-0.015em" }],
        "section": ["2.5rem",    { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        "card":    ["1.5rem",    { lineHeight: "1.25" }],
      },
      boxShadow: {
        warm:       "0 4px 20px rgba(27,27,75,0.06)",
        "warm-md":  "0 6px 24px rgba(27,27,75,0.08)",
        "warm-lg":  "0 12px 40px rgba(27,27,75,0.10)",
        "warm-xl":  "0 20px 60px rgba(27,27,75,0.12)",
        "gold":     "0 4px 20px rgba(139,100,16,0.15)",
        "gold-lg":  "0 8px 30px rgba(139,100,16,0.20)",
        "inner-warm": "inset 0 2px 4px rgba(27,27,75,0.06)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        "fade-up":     "fadeUp 0.6s ease-out forwards",
        "fade-in":     "fadeIn 0.5s ease-out forwards",
        "slide-up":    "slideUp 0.7s ease-out forwards",
        "scale-in":    "scaleIn 0.4s ease-out forwards",
        "float":       "float 6s ease-in-out infinite",
        "marquee":     "marquee 25s linear infinite",
        "pulse-soft":  "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(40px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%":   { opacity: "0", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-12px)" },
        },
        marquee: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
