import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Login page renders without the admin layout
  // This layout only wraps authenticated admin pages
  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen font-sans">
      <AdminSidebar />
      <main className="flex-1 bg-neutral-50 p-8">{children}</main>
    </div>
  );
}
