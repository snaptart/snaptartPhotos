import { ReactNode } from "react";

interface SettingGroupProps {
  title: string;
  desc?: string;
  children: ReactNode;
}

export function SettingGroup({ title, desc, children }: SettingGroupProps) {
  return (
    <section className="mb-12">
      <div className="mb-5 pb-3.5 border-b border-admin-border">
        <h2 className="font-serif italic text-[24px] leading-[1.1] text-admin-ink tracking-[-0.3px]">
          {title}
        </h2>
        {desc && (
          <p className="text-[13px] text-admin-ink-soft mt-1">{desc}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
