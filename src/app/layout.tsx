import type { Metadata } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import siteConfig from "@/lib/site.config";

const ebGaramond = EB_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  let title = siteConfig.siteName;
  let description = siteConfig.siteDescription;

  try {
    const [settings] = await db.select().from(siteSettings).limit(1);
    if (settings?.siteTitle) title = settings.siteTitle;
  } catch {
    // DB not available — use config defaults
  }

  return { title, description };
}

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
