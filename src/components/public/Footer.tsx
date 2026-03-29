import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { parseLinks } from "@/lib/parseLinks";

const alignClass: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

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

  const alignment = alignClass[settings.footerAlignment] ?? "text-center";

  return (
    <footer
      className={`border-t border-neutral-200 px-6 py-8 ${alignment}`}
      style={{
        backgroundColor: "var(--theme-color-footer-bg)",
        fontFamily: "var(--theme-font-footer)",
        fontSize: "var(--theme-footer-font-size)",
        color: "var(--theme-color-text)",
        opacity: 0.6,
      }}
    >
      {settings.footerText && <p>{parseLinks(settings.footerText)}</p>}
      {settings.contactEmail && (
        <p className="mt-1">
          <a
            href={`mailto:${settings.contactEmail}`}
            className="transition-colors hover:opacity-80"
            style={{ color: "var(--theme-color-accent)" }}
          >
            {settings.contactEmail}
          </a>
        </p>
      )}
    </footer>
  );
}
