import { SettingsSubNav } from "./SettingsSubNav";

// Below 1536px the section list runs across the top, so pages with a live
// preview (Look and Feel, Typography) have room to keep it beside the settings.
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-m-8">
      <div className="grid grid-cols-1 2xl:grid-cols-[220px_1fr] min-h-[calc(100vh-0px)]">
        <aside className="border-b 2xl:border-b-0 2xl:border-r border-admin-border bg-admin-surface">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-8 py-4 2xl:sticky 2xl:top-0 2xl:block 2xl:p-6">
            <div className="shrink-0">
              <div className="font-serif italic text-[22px] text-admin-ink leading-none mb-1">
                Settings
              </div>
              <div className="hidden font-mono text-[10px] uppercase tracking-[2px] text-admin-ink-soft 2xl:block">
                Site configuration
              </div>
            </div>
            <nav className="2xl:mt-6">
              <SettingsSubNav />
            </nav>
          </div>
        </aside>
        <section className="bg-admin-bg p-8 md:p-10">
          {children}
        </section>
      </div>
    </div>
  );
}
