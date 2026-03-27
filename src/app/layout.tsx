import type { Metadata } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import "./globals.css";

const ebGaramond = EB_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SnaptArt — Photography by Michael Schroeder",
  description:
    "Photography from Minnesota, France, and other places by Michael Schroeder",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${ebGaramond.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
