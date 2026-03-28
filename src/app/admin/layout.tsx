import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AdminSidebar } from "@/components/admin/Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";

  // Login page renders without the admin layout
  const isLoginPage = pathname === "/admin/login";
  const session = await auth();

  if (!session && !isLoginPage) {
    redirect("/admin/login");
  }

  if (!session) {
    return <>{children}</>;
  }

  // Puck editor gets a full-screen layout (no sidebar)
  const isPuckEditor = /\/admin\/pages\/[^/]+\/edit/.test(pathname);

  if (isPuckEditor) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen font-sans">
      <AdminSidebar />
      <main className="flex-1 bg-neutral-50 p-8">{children}</main>
    </div>
  );
}
