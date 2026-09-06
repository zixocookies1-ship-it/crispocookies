import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
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
        className={`${playfair.variable} ${dmSans.variable} font-body antialiased`}
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
