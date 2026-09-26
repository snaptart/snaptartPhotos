"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Config } from "@puckeditor/core";
import { Button, Card, Pill, Select } from "@/components/admin/ui";
import { SettingGroup } from "@/components/admin/settings/SettingGroup";
import { useMessage } from "@/lib/hooks/useMessage";
import { puckConfig } from "@/lib/puck/config";
import { DEFAULTS_GROUPS, type ApplyMode, type BlockDefaults } from "@/lib/puck/block-defaults";
import { builtInDefaults, fetchBlockDefaults } from "@/lib/puck/use-block-defaults";
import { STORIES_INDEX_SLUG } from "@/lib/stories/constants";

type Target = { id: string; title: string; slug: string; pageType: string };
type Preview = { pages: (Target & { blocks: number })[]; totalBlocks: number; batchId?: string };

const components = puckConfig.components as Config["components"];
const blockLabel = (type: string) => components[type]?.label ?? type;

/** A field's label, with its group when several fields share one ("Text style"). */
function settingLabel(type: string, prop: string): string {
  const field = components[type]?.fields?.[prop] as { label?: string } | undefined;
  const label = field?.label ?? prop;
  const shared = Object.values(components[type]?.fields ?? {}).filter((f) => (f as { label?: string }).label === label);
  if (shared.length < 2) return label;
  const owner = prop.replace(/(Style|Color|Width)$/, "");
  return `${label} (${owner.replace(/([A-Z])/g, " $1").toLowerCase()})`;
}

function formatValue(v: unknown): string {
  if (v === undefined || v === null || v === "") return "none";
  if (typeof v === "boolean") return v ? "on" : "off";
  if (typeof v !== "object") return String(v);
  const o = v as Record<string, unknown>;
  if (typeof o.style === "string") {
    const extra = Object.entries(o)
      .filter(([k, val]) => k !== "style" && val !== undefined && val !== null && val !== "")
      .map(([k, val]) => `${k} ${String(val).replace(/^token:/, "")}`);
    return [o.style, ...extra].join(", ");
  }
  return JSON.stringify(v);
}

export default function BlockDefaultsSettingsPage() {
  const [defaults, setDefaults] = useState<BlockDefaults | null>(null);
  const [themeName, setThemeName] = useState<string | null>(null);
  const { message, showSuccess, showError, alertClass } = useMessage();
  const router = useRouter();

  const load = useCallback(() => {
    fetchBlockDefaults().then((d) => {
      setDefaults(d.defaults);
      setThemeName(d.themeName);
    });
  }, []);
  useEffect(load, [load]);

  async function reset(type: string) {
    if (!defaults || !confirm(`Put ${blockLabel(type)} back to its built-in defaults? Blocks already on pages don't change.`)) return;
    const next = { ...defaults };
    delete next[type];
    const res = await fetch("/api/block-defaults", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaults: next }),
    });
    if (res.ok) {
      showSuccess(`${blockLabel(type)} is back to its built-in defaults.`);
      load();
    } else showError("Couldn't reset that block.");
  }

  if (!defaults) return <div className="text-admin-ink-soft">Loading...</div>;

  return (
    <div className="max-w-[760px]">
      {message && <div className={`${alertClass} mb-4`}>{message.text}</div>}

      <SettingGroup
        title="Block defaults"
        desc={`The settings a new block starts with — spacing, text styles, rules, colours. Words, photos and links are always set per block.${
          themeName ? ` Saved with the “${themeName}” look, so switching looks switches these too.` : ""
        }`}
      >
        <div className="flex justify-end">
          <Button kind="primary" onClick={() => router.push("/admin/block-defaults")}>
            Edit block defaults
          </Button>
        </div>
        {DEFAULTS_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[2px] text-admin-ink-soft">{group.title}</div>
            <Card padded={false}>
              {group.types.map((type) => {
                const own = defaults[type] ?? {};
                const keys = Object.keys(own);
                const builtIn = builtInDefaults(type);
                return (
                  <div key={type} className="flex items-start justify-between gap-3 border-b border-admin-border px-4 py-3 last:border-0">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-admin-ink">{blockLabel(type)}</div>
                      {keys.length === 0 ? (
                        <div className="text-[12px] text-admin-ink-soft">Built-in defaults</div>
                      ) : (
                        <ul className="mt-1 space-y-0.5 text-[12px] text-admin-ink-soft">
                          {keys.map((k) => (
                            <li key={k}>
                              {settingLabel(type, k)}: <span className="text-admin-ink">{formatValue(own[k])}</span>{" "}
                              <span className="text-admin-ink-faint">(built-in {formatValue(builtIn[k])})</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {keys.length > 0 && (
                      <Button size="sm" kind="subtle" onClick={() => reset(type)}>
                        Reset
                      </Button>
                    )}
                  </div>
                );
              })}
            </Card>
          </div>
        ))}
      </SettingGroup>

      <ApplyTool defaults={defaults} />
    </div>
  );
}

/** Sets the current defaults on blocks already on pages: previewed first, undoable after. */
function ApplyTool({ defaults }: { defaults: BlockDefaults }) {
  const customised = useMemo(
    () => DEFAULTS_GROUPS.flatMap((g) => g.types).filter((t) => Object.keys(defaults[t] ?? {}).length),
    [defaults],
  );
  const [type, setType] = useState<string>("");
  const [props, setProps] = useState<string[]>([]);
  const [mode, setMode] = useState<ApplyMode>("untouched");
  const [scope, setScope] = useState<"all" | "chosen">("all");
  const [chosen, setChosen] = useState<string[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState<Preview | null>(null);
  const [undone, setUndone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ?block=Type (from the defaults editor's "Apply to existing blocks…") picks the block.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("block");
    setType((t) => t || (wanted && customised.includes(wanted) ? wanted : customised[0] ?? ""));
  }, [customised]);

  useEffect(() => {
    setProps(Object.keys(defaults[type] ?? {}));
    setDone(null);
  }, [type, defaults]);

  useEffect(() => {
    Promise.all([fetch("/api/pages"), fetch("/api/stories")])
      .then(async ([p, s]) => [...(p.ok ? await p.json() : []), ...(s.ok ? await s.json() : [])] as Target[])
      .then(setTargets)
      .catch(() => setTargets([]));
  }, []);

  const request = useCallback(
    (dryRun: boolean) => {
      const own = defaults[type] ?? {};
      const builtIn = builtInDefaults(type);
      return fetch("/api/block-defaults/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          label: blockLabel(type),
          values: Object.fromEntries(props.map((p) => [p, own[p]])),
          builtIn: Object.fromEntries(props.map((p) => [p, builtIn[p]])),
          mode,
          pageIds: scope === "chosen" ? chosen : undefined,
          dryRun,
        }),
      });
    },
    [defaults, type, props, mode, scope, chosen],
  );

  // Recount whenever the choices change.
  useEffect(() => {
    if (!type || !props.length) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    const t = setTimeout(async () => {
      const res = await request(true);
      const data = await res.json().catch(() => null);
      if (cancelled) return;
      setChecking(false);
      setPreview(res.ok ? data : null);
      setError(res.ok ? null : data?.error ?? "Couldn't count the blocks.");
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [request, type, props]);

  async function apply() {
    if (!preview?.totalBlocks) return;
    if (!confirm(`Change ${preview.totalBlocks} ${blockLabel(type)} block${preview.totalBlocks === 1 ? "" : "s"} on ${preview.pages.length} page${preview.pages.length === 1 ? "" : "s"}? Published pages change straight away. You can undo it afterwards.`)) return;
    setApplying(true);
    const res = await request(false);
    const data = await res.json().catch(() => null);
    setApplying(false);
    if (res.ok) {
      setDone(data);
      setUndone(false);
      setPreview({ pages: [], totalBlocks: 0 });
    } else setError(data?.error ?? "Couldn't apply the defaults.");
  }

  async function undo() {
    if (!done?.batchId) return;
    const res = await fetch("/api/pages/revisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: done.batchId }),
    });
    if (res.ok) {
      setUndone(true);
      setProps((p) => [...p]); // recount
    } else setError("Couldn't undo. Each page's History (in the Pages or Stories list) can still restore it.");
  }

  const own = defaults[type] ?? {};

  return (
    <SettingGroup
      title="Apply to existing blocks"
      desc="Changing a default doesn't touch blocks already on pages. This brings them in line, one block kind at a time."
    >
      {customised.length === 0 ? (
        <p className="text-[13px] text-admin-ink-soft">
          No block has site defaults yet. Set some with Edit block defaults, then come back here.
        </p>
      ) : (
        <div className="space-y-5">
          <Row label="Block">
            <Select value={type} onChange={(e) => setType(e.target.value)} className="max-w-[280px]">
              {customised.map((t) => (
                <option key={t} value={t}>
                  {blockLabel(t)}
                </option>
              ))}
            </Select>
          </Row>

          <Row label="Settings">
            <div className="space-y-1.5">
              {Object.keys(own).map((p) => (
                <label key={p} className="flex cursor-pointer items-center gap-2 text-[13px] text-admin-ink">
                  <input
                    type="checkbox"
                    className="accent-admin-accent"
                    checked={props.includes(p)}
                    onChange={(e) => setProps((cur) => (e.target.checked ? [...cur, p] : cur.filter((x) => x !== p)))}
                  />
                  {settingLabel(type, p)} → <span className="font-medium">{formatValue(own[p])}</span>
                </label>
              ))}
            </div>
          </Row>

          <Row label="Which blocks">
            <div className="space-y-1.5">
              <Radio checked={mode === "untouched"} onChange={() => setMode("untouched")}>
                Only ones still on a default{" "}
                <span className="text-admin-ink-soft">— skips blocks where someone chose that setting by hand</span>
              </Radio>
              <Radio checked={mode === "all"} onChange={() => setMode("all")}>
                All of them <span className="text-admin-ink-soft">— replaces hand-picked settings too</span>
              </Radio>
            </div>
          </Row>

          <Row label="Where">
            <div className="space-y-1.5">
              <Radio checked={scope === "all"} onChange={() => setScope("all")}>
                Every page and story
              </Radio>
              <Radio checked={scope === "chosen"} onChange={() => setScope("chosen")}>
                Only these:
              </Radio>
              {scope === "chosen" && (
                <div className="ml-6 max-h-56 space-y-1 overflow-y-auto rounded-md border border-admin-border p-2">
                  {targets.map((t) => (
                    <label key={t.id} className="flex cursor-pointer items-center gap-2 text-[13px] text-admin-ink">
                      <input
                        type="checkbox"
                        className="accent-admin-accent"
                        checked={chosen.includes(t.id)}
                        onChange={(e) =>
                          setChosen((cur) => (e.target.checked ? [...cur, t.id] : cur.filter((x) => x !== t.id)))
                        }
                      />
                      <span className="truncate">{t.slug === STORIES_INDEX_SLUG ? "Stories contents page" : t.title}</span>
                      {t.pageType === "story" && <Pill>Story</Pill>}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </Row>

          <Card>
            {error && <p className="mb-2 text-[13px] text-admin-danger">{error}</p>}
            {done && (
              <div className="mb-3 text-[13px] text-admin-ink">
                {undone ? (
                  <>Undone: the {done.pages.length} page{done.pages.length === 1 ? " is" : "s are"} back as they were.</>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span>
                      Changed {done.totalBlocks} block{done.totalBlocks === 1 ? "" : "s"} on {done.pages.length} page
                      {done.pages.length === 1 ? "" : "s"}.
                    </span>
                    {done.batchId && (
                      <Button size="sm" onClick={undo}>
                        Undo
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
            {!props.length ? (
              <p className="text-[13px] text-admin-ink-soft">Choose at least one setting.</p>
            ) : checking && !preview ? (
              <p className="text-[13px] text-admin-ink-soft">Counting…</p>
            ) : preview && preview.totalBlocks > 0 ? (
              <div className="space-y-3">
                <p className="text-[13px] text-admin-ink">
                  {preview.totalBlocks} block{preview.totalBlocks === 1 ? "" : "s"} would change:
                </p>
                <ul className="space-y-0.5 text-[12px] text-admin-ink-soft">
                  {preview.pages.map((p) => (
                    <li key={p.id}>
                      {p.slug === STORIES_INDEX_SLUG ? "Stories contents page" : p.title} — {p.blocks}
                      {p.pageType === "story" ? " (story)" : ""}
                    </li>
                  ))}
                </ul>
                <Button kind="primary" disabled={applying} onClick={apply}>
                  {applying ? "Applying…" : `Apply to ${preview.totalBlocks} block${preview.totalBlocks === 1 ? "" : "s"}`}
                </Button>
              </div>
            ) : (
              <p className="text-[13px] text-admin-ink-soft">
                {done && !undone ? "Everything now matches." : "No blocks would change — they already match, or none are on these pages."}
              </p>
            )}
          </Card>
        </div>
      )}
    </SettingGroup>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-4 xl:grid-cols-[140px_minmax(0,1fr)]">
      <div className="pt-0.5 text-[13px] font-medium text-admin-ink">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function Radio({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-[13px] text-admin-ink">
      <input type="radio" className="mt-0.5 accent-admin-accent" checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}
