import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Crispo Cookies — Baked with Love, Delivered Fresh",
  description:
    "Premium artisan cookies baked fresh daily. Classic chocolate chip, buttery crunch, oatmeal delights and more. Order online for fast delivery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${cormorant.variable} ${manrope.variable} font-body antialiased`}
      >
        {children}
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              background: "#FFFCF8",
              color: "#1B1B4B",
              border: "1px solid #C4972A",
              fontWeight: 500,
            },
          }}
        />
      </body>
    </html>
  );
}
