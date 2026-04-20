import { SettingsSubNav } from "./SettingsSubNav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-m-8">
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] min-h-[calc(100vh-0px)]">
        <aside className="border-b md:border-b-0 md:border-r border-admin-border bg-admin-surface">
          <div className="sticky top-0 p-6">
            <div className="font-serif italic text-[22px] text-admin-ink leading-none mb-1">
              Settings
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[2px] text-admin-ink-soft">
              Site configuration
            </div>
            <nav className="mt-6">
              <SettingsSubNav />
            </nav>
          </div>
        </aside>
        <section className="bg-admin-bg p-8 md:p-10">
          <div className="max-w-[640px]">{children}</div>
        </section>
      </div>
    </div>
  );
}
