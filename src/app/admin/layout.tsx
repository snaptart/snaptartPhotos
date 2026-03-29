import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AdminSidebar } from "@/components/admin/Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

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

  return (
    <div className="flex min-h-screen font-sans">
      <AdminSidebar />
      <main className="flex-1 bg-neutral-50 p-8">{children}</main>
    </div>
  );
}
