import type { Metadata } from "next";
import {
  EB_Garamond,
  Inter,
  JetBrains_Mono,
  Homemade_Apple,
  Caveat,
  Reenie_Beanie,
  Gloria_Hallelujah,
  IBM_Plex_Mono,
  Courier_Prime,
} from "next/font/google";
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

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Slide handwriting fonts (pencil-feel options)
const homemadeApple = Homemade_Apple({
  variable: "--font-homemade-apple",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});
const reenieBeanie = Reenie_Beanie({
  variable: "--font-reenie-beanie",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});
const gloriaHallelujah = Gloria_Hallelujah({
  variable: "--font-gloria-hallelujah",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

// Slide stamp fonts (monospace options)
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});
const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
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
      <body
        className={`${ebGaramond.variable} ${inter.variable} ${jetbrainsMono.variable} ${homemadeApple.variable} ${caveat.variable} ${reenieBeanie.variable} ${gloriaHallelujah.variable} ${ibmPlexMono.variable} ${courierPrime.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
