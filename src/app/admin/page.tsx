import Link from "next/link";
import Image from "next/image";
import {
  Images,
  LayoutGrid,
  FileText,
  BookOpen,
  AlertCircle,
  ArrowRight,
  Upload,
  Plus,
  Palette,
} from "lucide-react";
import { auth } from "@/lib/auth";
import {
  getDashboardCounts,
  getRecentPhotos,
  getRecentGalleries,
} from "@/lib/admin/dashboard-queries";
import siteConfig from "@/lib/site.config";
import { Card, Pill, SectionLabel } from "@/components/admin/ui";

export default async function AdminDashboard() {
  const session = await auth();
  const [counts, recentPhotos, recentGalleries] = await Promise.all([
    getDashboardCounts(),
    getRecentPhotos(5),
    getRecentGalleries(4),
  ]);

  const needsAttention =
    counts.photosMissingTitle + counts.photosMissingLocation + counts.draftPages;

  return (
    <div className="-m-8 p-8 md:p-10 bg-admin-bg min-h-[calc(100vh-0px)]">
      {/* Header */}
      <header className="mb-8 flex items-end justify-between gap-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[2px] text-admin-ink-soft mb-2">
            Welcome back
          </div>
          <h1 className="font-serif italic text-[32px] leading-none text-admin-ink">
            {session?.user?.email ?? "Dashboard"}
          </h1>
        </div>
        <div className="hidden md:block text-right">
          <div className="font-mono text-[10px] uppercase tracking-[2px] text-admin-ink-soft">
            {siteConfig.siteName}
          </div>
          <div className="font-serif italic text-[15px] text-admin-ink-soft">
            Admin
          </div>
        </div>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={siteConfig.labels.photos}
          value={counts.totalPhotos}
          href="/admin/photos"
          Icon={Images}
        />
        <StatCard
          label={siteConfig.labels.galleries}
          value={counts.totalGalleries}
          subtitle={`${counts.publishedGalleries} published`}
          href="/admin/galleries"
          Icon={LayoutGrid}
        />
        <StatCard
          label="Pages"
          value={counts.totalPages}
          subtitle={counts.draftPages > 0 ? `${counts.draftPages} draft` : "all published"}
          href="/admin/pages"
          Icon={FileText}
        />
        <StatCard
          label="Stories"
          value={counts.totalStories}
          href="/admin/stories"
          Icon={BookOpen}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
        {/* LEFT column */}
        <div className="space-y-6">
          {/* Needs attention */}
          <Card padded={false}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-admin-border">
              <div className="flex items-center gap-2">
                <SectionLabel>Needs attention</SectionLabel>
                {needsAttention > 0 && (
                  <Pill tone="warn">{needsAttention}</Pill>
                )}
              </div>
            </div>
            <div className="p-5">
              {needsAttention === 0 ? (
                <p className="text-[13px] text-admin-ink-soft">
                  All caught up — nothing needs your attention right now.
                </p>
              ) : (
                <ul className="space-y-3">
                  {counts.photosMissingTitle > 0 && (
                    <AttentionItem
                      count={counts.photosMissingTitle}
                      label={`${siteConfig.labels.photos} missing a title`}
                      href="/admin/photos"
                    />
                  )}
                  {counts.photosMissingLocation > 0 && (
                    <AttentionItem
                      count={counts.photosMissingLocation}
                      label={`${siteConfig.labels.photos} missing a location`}
                      href="/admin/photos"
                    />
                  )}
                  {counts.draftPages > 0 && (
                    <AttentionItem
                      count={counts.draftPages}
                      label="Draft pages not yet published"
                      href="/admin/pages"
                    />
                  )}
                </ul>
              )}
            </div>
          </Card>

          {/* Recent photos */}
          <Card padded={false}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-admin-border">
              <SectionLabel>Recent {siteConfig.labels.photos.toLowerCase()}</SectionLabel>
              <Link
                href="/admin/photos"
                className="text-[11px] font-mono uppercase tracking-[1.5px] text-admin-ink-soft hover:text-admin-ink"
              >
                View all
              </Link>
            </div>
            {recentPhotos.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-admin-ink-soft">
                No {siteConfig.labels.photos.toLowerCase()} yet. Upload some to get started.
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2 p-3">
                {recentPhotos.map((photo) => (
                  <Link
                    key={photo.id}
                    href="/admin/photos"
                    className="group relative aspect-square overflow-hidden rounded-md"
                  >
                    <Image
                      src={photo.thumbnailUrl}
                      alt={photo.title ?? photo.filename ?? ""}
                      fill
                      sizes="120px"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT column */}
        <div className="space-y-6">
          {/* Quick actions */}
          <Card padded={false}>
            <div className="px-5 py-4 border-b border-admin-border">
              <SectionLabel>Quick actions</SectionLabel>
            </div>
            <div className="flex flex-col">
              <QuickAction
                Icon={Upload}
                label={`Upload ${siteConfig.labels.photos.toLowerCase()}`}
                href="/admin/photos"
              />
              <QuickAction
                Icon={Plus}
                label={`New ${siteConfig.labels.gallery.toLowerCase()}`}
                href="/admin/galleries"
              />
              <QuickAction Icon={FileText} label="New page" href="/admin/pages" />
              <QuickAction
                Icon={Palette}
                label="Edit look and feel"
                href="/admin/settings/look"
              />
            </div>
          </Card>

          {/* Recent galleries */}
          <Card padded={false}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-admin-border">
              <SectionLabel>Recent {siteConfig.labels.galleries.toLowerCase()}</SectionLabel>
              <Link
                href="/admin/galleries"
                className="text-[11px] font-mono uppercase tracking-[1.5px] text-admin-ink-soft hover:text-admin-ink"
              >
                View all
              </Link>
            </div>
            {recentGalleries.length === 0 ? (
              <div className="p-5 text-[13px] text-admin-ink-soft">
                No {siteConfig.labels.galleries.toLowerCase()} yet.
              </div>
            ) : (
              <ul>
                {recentGalleries.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center gap-3 px-5 py-3 border-b border-admin-border last:border-0"
                  >
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-admin-surface-2 border border-admin-border">
                      {g.coverImageUrl && (
                        <Image
                          src={g.coverImageUrl}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/photos?galleryId=${g.id}`}
                        className="block truncate text-[13px] font-medium text-admin-ink hover:text-admin-accent"
                      >
                        {g.title}
                      </Link>
                      <div className="text-[11px] text-admin-ink-soft">
                        {g.isPublished ? "Published" : "Draft"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  href,
  Icon,
}: {
  label: string;
  value: number;
  subtitle?: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group bg-admin-surface border border-admin-border rounded-lg p-5 hover:border-admin-border-strong transition-colors"
    >
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-admin-ink-faint" />
        <ArrowRight className="h-4 w-4 text-admin-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="mt-4 font-serif italic text-[28px] leading-none text-admin-ink">
        {value.toLocaleString()}
      </div>
      <div className="mt-2 text-[12px] font-medium text-admin-ink">{label}</div>
      {subtitle && (
        <div className="text-[11px] text-admin-ink-soft">{subtitle}</div>
      )}
    </Link>
  );
}

function AttentionItem({
  count,
  label,
  href,
}: {
  count: number;
  label: string;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 -mx-2 px-2 py-1.5 rounded-md hover:bg-admin-surface-2"
      >
        <AlertCircle className="h-4 w-4 text-admin-warn shrink-0" />
        <span className="font-mono text-[13px] font-medium text-admin-ink w-8 text-right">
          {count}
        </span>
        <span className="flex-1 text-[13px] text-admin-ink">{label}</span>
        <ArrowRight className="h-3.5 w-3.5 text-admin-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>
    </li>
  );
}

function QuickAction({
  Icon,
  label,
  href,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-5 py-3 border-b border-admin-border last:border-0 hover:bg-admin-surface-2 transition-colors"
    >
      <Icon className="h-4 w-4 text-admin-ink-faint group-hover:text-admin-accent" />
      <span className="flex-1 text-[13px] text-admin-ink">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-admin-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
