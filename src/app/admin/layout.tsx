import { auth, getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  if (!session) {
    // Only the login page should ever render without a session.
    // If auth() fails for any other admin page, redirect rather than
    // silently dropping the sidebar.
    const pathname = (await headers()).get("x-pathname") ?? "";
    if (pathname !== "/admin/login") {
      redirect("/admin/login");
    }
    return <>{children}</>;
  }

  // The sidebar carries the site's own name and logo (Settings → Identity).
  const [settings] = await db
    .select({ siteTitle: siteSettings.siteTitle, logoUrl: siteSettings.logoUrl })
    .from(siteSettings)
    .limit(1)
    .catch(() => []);

  return (
    <div className="flex min-h-screen bg-admin-bg text-admin-ink font-sans">
      <AdminSidebar
        userEmail={session.user?.email ?? ""}
        siteTitle={settings?.siteTitle}
        logoUrl={settings?.logoUrl}
      />
      <main className="flex-1 min-w-0 overflow-x-clip p-8">{children}</main>
    </div>
  );
}
