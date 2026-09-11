import type { Metadata } from "next";
import { Playfair_Display, Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-playfair",
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
        className={`${playfair.variable} ${manrope.variable} font-body antialiased`}
      >
        {children}
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              background: "#2A2116",
              color: "#F7F2EA",
              border: "1px solid #C99528",
              fontWeight: 500,
            },
          }}
        />
      </body>
    </html>
  );
}
