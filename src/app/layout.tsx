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
import { loadSiteIconSettings } from "@/lib/site-icon";
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
  const site = await loadSiteIconSettings();
  const v = `?v=${site.version}`;

  return {
    title: site.siteTitle,
    description: siteConfig.siteDescription,
    icons: {
      icon: [
        { url: `/favicon.ico${v}`, sizes: "48x48" },
        { url: `/site-icon/icon-32.png${v}`, sizes: "32x32", type: "image/png" },
        { url: `/site-icon/icon-192.png${v}`, sizes: "192x192", type: "image/png" },
        // Swaps to the dark icon with the browser's colour scheme
        ...(site.faviconDarkUrl ? [{ url: `/site-icon/icon.svg${v}`, type: "image/svg+xml" }] : []),
      ],
      apple: [{ url: `/site-icon/apple-icon.png${v}`, sizes: "180x180", type: "image/png" }],
    },
    openGraph: site.shareImageUrl ? { images: [site.shareImageUrl] } : undefined,
  };
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
