import { auth } from "@/lib/auth";

export default async function AdminDashboard() {
  const session = await auth();

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Dashboard</h1>
      <p className="text-neutral-500">
        Welcome back, {session?.user?.email}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard title="Galleries" href="/admin/galleries" description="Manage photo galleries and sub-galleries" />
        <DashboardCard title="Photos" href="/admin/photos" description="Upload and manage photos" />
        <DashboardCard title="Pages" href="/admin/pages" description="Create and edit pages" />
        <DashboardCard title="Stories" href="/admin/stories" description="Manage short stories" />
        <DashboardCard title="Menus" href="/admin/menus" description="Configure site navigation" />
        <DashboardCard title="Settings" href="/admin/settings" description="Site title, logo, and social links" />
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  href,
  description,
}: {
  title: string;
  href: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="rounded-lg border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
    >
      <h2 className="mb-1 text-lg font-medium">{title}</h2>
      <p className="text-sm text-neutral-500">{description}</p>
    </a>
  );
}
