import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";

export async function Footer() {
  let settings: {
    footerText: string | null;
    contactEmail: string | null;
  } | null = null;

  try {
    const rows = await db.select().from(siteSettings).limit(1);
    settings = rows[0] ?? null;
  } catch {
    // DB not available — use fallback
  }

  const footerText = settings?.footerText ?? "Photography from Minnesota, France, and other places";
  const contactEmail = settings?.contactEmail ?? "snapmaster@snaptart.com";

  return (
    <footer className="border-t border-neutral-200 bg-white px-6 py-8 text-center text-sm text-neutral-400">
      <p>&copy; {new Date().getFullYear()} Michael Schroeder. All rights reserved.</p>
      {footerText && <p className="mt-1">{footerText}</p>}
      <p className="mt-1">
        <a href={`mailto:${contactEmail}`} className="transition-colors hover:text-neutral-600">
          {contactEmail}
        </a>
      </p>
    </footer>
  );
}
