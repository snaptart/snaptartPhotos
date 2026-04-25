import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { FooterShell } from "./FooterShell";

export async function Footer() {
  let settings: {
    footerText: string | null;
    footerAlignment: string;
    contactEmail: string | null;
  } | null = null;

  try {
    const rows = await db.select().from(siteSettings).limit(1);
    settings = rows[0] ?? null;
  } catch {
    // DB not available — render nothing
  }

  if (!settings) return null;

  return (
    <FooterShell
      footerText={settings.footerText}
      footerAlignment={settings.footerAlignment}
      contactEmail={settings.contactEmail}
    />
  );
}
