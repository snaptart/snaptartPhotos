import { Resend } from "resend";

/**
 * Email sending via Resend. Both env vars are per-site (set in Vercel):
 * - RESEND_API_KEY    — API key from resend.com
 * - RESEND_FROM_EMAIL — verified sender, e.g. "Gardens à la Carte <contact@gardensalacarte.com>"
 * If either is missing, sending is silently skipped so sites without email
 * configured keep working (submissions are still stored in the DB).
 */

let client: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendFormNotification({
  to,
  formName,
  data,
  siteTitle,
}: {
  to: string;
  formName: string;
  data: Record<string, unknown>;
  siteTitle?: string | null;
}): Promise<{ sent: boolean; error?: string }> {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !from) {
    return { sent: false, error: "Email not configured" };
  }

  const rows = Object.entries(data)
    .map(
      ([key, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;font-weight:600;vertical-align:top;white-space:nowrap;">${escapeHtml(key)}</td><td style="padding:6px 0;">${escapeHtml(String(value ?? ""))}</td></tr>`
    )
    .join("");

  const subject = `New "${formName}" submission${siteTitle ? ` — ${siteTitle}` : ""}`;
  const replyTo = Object.entries(data).find(
    ([key, value]) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "")) &&
      /email/i.test(key)
  )?.[1] as string | undefined;

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      replyTo,
      html: `
        <h2 style="font-family:Georgia,serif;">${escapeHtml(subject)}</h2>
        <table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse;">${rows}</table>
      `,
      text: Object.entries(data)
        .map(([key, value]) => `${key}: ${String(value ?? "")}`)
        .join("\n"),
    });
    if (error) {
      console.error("Resend error:", error);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (err) {
    console.error("Resend send failed:", err);
    return { sent: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
