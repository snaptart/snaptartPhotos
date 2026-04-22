"use client";

import { useEffect, useState, useCallback } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, X } from "lucide-react";
import { SortableItem } from "@/components/admin/SortableItem";
import { useSortableList } from "@/lib/hooks/useSortableList";
import { useMessage } from "@/lib/hooks/useMessage";
import siteConfig from "@/lib/site.config";
import {
  Button,
  Card,
  Field,
  Input,
  Pill,
  SectionLabel,
  Select,
  Textarea,
} from "@/components/admin/ui";
import { SettingGroup } from "@/components/admin/settings/SettingGroup";

interface MenuItem {
  id: string;
  label: string;
  url: string;
  targetType: string;
  targetId: string | null;
  position: number;
  parentId: string | null;
}

interface LinkOption {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
}

interface FormState {
  label: string;
  url: string;
  targetType: string;
  targetId: string | null;
}

interface FooterDraft {
  footerText: string;
}

type FieldMapStyle = "modern" | "mono" | "blueprint";

interface HomepageDraft {
  homepageType: "page" | "field_map";
  fieldMapStyle: FieldMapStyle;
}

const emptyForm: FormState = {
  label: "",
  url: "",
  targetType: "page",
  targetId: null,
};

function isFieldMapStyle(v: unknown): v is FieldMapStyle {
  return v === "modern" || v === "mono" || v === "blueprint";
}

export default function NavigationSettingsPage() {
  const [loaded, setLoaded] = useState(false);

  // Homepage behaviour
  const [homepage, setHomepage] = useState<HomepageDraft>({
    homepageType: "page",
    fieldMapStyle: "modern",
  });
  const [savingHomepage, setSavingHomepage] = useState(false);
  const {
    message: hpMsg,
    showSuccess: hpOK,
    showError: hpBad,
    clear: hpClear,
    alertClass: hpAlert,
  } = useMessage();

  // Footer settings
  const [footer, setFooter] = useState<FooterDraft>({
    footerText: "",
  });
  const [savingFooter, setSavingFooter] = useState(false);
  const {
    message: footerMsg,
    showSuccess: footerOK,
    showError: footerBad,
    clear: footerClear,
    alertClass: footerAlert,
  } = useMessage();

  // Menu items
  const [items, setItems] = useState<MenuItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pageOptions, setPageOptions] = useState<LinkOption[]>([]);
  const [galleryOptions, setGalleryOptions] = useState<LinkOption[]>([]);
  const {
    message: menuMsg,
    showSuccess: menuOK,
    showError: menuBad,
    alertClass: menuAlert,
  } = useMessage();

  const { sensors, handleDragEnd } = useSortableList({
    items,
    setItems,
    endpoint: "/api/menu-items",
    onError: menuBad,
  });

  const fetchEverything = useCallback(async () => {
    const [settingsRes, itemsRes, pagesRes, galleriesRes] = await Promise.all([
      fetch("/api/settings"),
      fetch("/api/menu-items"),
      fetch("/api/pages"),
      fetch("/api/galleries"),
    ]);
    const settings = await settingsRes.json();
    const items = await itemsRes.json();
    const pages = await pagesRes.json();
    const galleries = await galleriesRes.json();
    if (settings) {
      setFooter({
        footerText: settings.footerText ?? "",
      });
      setHomepage({
        homepageType: settings.homepageType === "field_map" ? "field_map" : "page",
        fieldMapStyle: isFieldMapStyle(settings.fieldMapStyle) ? settings.fieldMapStyle : "modern",
      });
    }
    setItems(items);
    setPageOptions(pages as LinkOption[]);
    setGalleryOptions(galleries as LinkOption[]);
    setLoaded(true);
  }, []);

  useEffect(() => {
    fetchEverything();
  }, [fetchEverything]);

  // ── Homepage save ────────────────────────────────────────────
  async function handleHomepageSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingHomepage(true);
    hpClear();
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homepageType: homepage.homepageType,
        fieldMapStyle: homepage.fieldMapStyle,
      }),
    });
    if (res.ok) hpOK("Homepage saved.");
    else hpBad("Failed to save homepage.");
    setSavingHomepage(false);
  }

  // ── Footer save ────────────────────────────────────────────────
  async function handleFooterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingFooter(true);
    footerClear();
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        footerText: footer.footerText || null,
      }),
    });
    if (res.ok) footerOK("Footer saved.");
    else footerBad("Failed to save footer.");
    setSavingFooter(false);
  }

  // ── Menu item handlers ─────────────────────────────────────────
  function openAddForm() {
    setForm(emptyForm);
    setShowForm(true);
    setEditingId(null);
  }

  function openEditForm(item: MenuItem) {
    setForm({
      label: item.label,
      url: item.url,
      targetType: item.targetType,
      targetId: item.targetId,
    });
    setEditingId(item.id);
    setShowForm(false);
  }

  function handleTargetTypeChange(targetType: string) {
    setForm({ label: "", url: "", targetType, targetId: null });
  }

  function handleTargetSelect(id: string) {
    const options = form.targetType === "page" ? pageOptions : galleryOptions;
    const selected = options.find((o) => o.id === id);
    if (!selected) return;
    const urlPrefix =
      form.targetType === "page" ? "/" : `/${siteConfig.labels.gallerySlug}/`;
    setForm((prev) => ({
      ...prev,
      targetId: selected.id,
      label: prev.label || selected.title,
      url: urlPrefix + selected.slug,
    }));
  }

  async function handleMenuSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = editingId
      ? {
          id: editingId,
          label: form.label,
          url: form.url,
          targetType: form.targetType,
          targetId: form.targetId,
        }
      : {
          label: form.label,
          url: form.url,
          targetType: form.targetType,
          targetId: form.targetId,
          position: items.length,
        };
    const res = await fetch("/api/menu-items", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      menuOK(editingId ? "Menu item updated." : "Menu item added.");
      const refreshed = await fetch("/api/menu-items").then((r) => r.json());
      setItems(refreshed);
    } else {
      menuBad("Failed to save menu item.");
    }
  }

  async function handleMenuDelete(id: string) {
    if (!confirm("Delete this menu item?")) return;
    const res = await fetch(`/api/menu-items?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      menuOK("Menu item deleted.");
      const refreshed = await fetch("/api/menu-items").then((r) => r.json());
      setItems(refreshed);
    } else {
      menuBad("Failed to delete.");
    }
  }

  if (!loaded) return <div className="text-admin-ink-soft">Loading...</div>;

  const currentOptions =
    form.targetType === "page" ? pageOptions : galleryOptions;
  const isLinkType =
    form.targetType === "page" || form.targetType === "gallery";
  const isFormOpen = showForm || !!editingId;

  return (
    <div className="max-w-[640px]">
      {/* ── Homepage behaviour ──────────────────────── */}
      <form onSubmit={handleHomepageSubmit}>
        <SettingGroup
          title="Homepage"
          desc="What visitors see at the site root."
        >
          {hpMsg && <div className={`${hpAlert} mb-2`}>{hpMsg.text}</div>}
          <Field label="Show at /" htmlFor="homepageType" inline hint="Pick an existing page by setting the homepage in the page editor, or serve the Field Map at /.">
            <Select
              id="homepageType"
              value={homepage.homepageType}
              onChange={(e) =>
                setHomepage((h) => ({
                  ...h,
                  homepageType: e.target.value === "field_map" ? "field_map" : "page",
                }))
              }
            >
              <option value="page">A page (default — uses your selected homepage)</option>
              <option value="field_map">The Field Map</option>
            </Select>
          </Field>
          {homepage.homepageType === "field_map" && (
            <Field label="Map style" htmlFor="fieldMapStyle" inline hint="Colors and mood of the world map.">
              <Select
                id="fieldMapStyle"
                value={homepage.fieldMapStyle}
                onChange={(e) =>
                  setHomepage((h) => ({
                    ...h,
                    fieldMapStyle: isFieldMapStyle(e.target.value) ? e.target.value : "modern",
                  }))
                }
              >
                <option value="modern">Modern — white, soft beige land, pale blue ocean</option>
                <option value="mono">Mono — greyscale, quiet</option>
                <option value="blueprint">Blueprint — dark navy, cobalt accents</option>
              </Select>
            </Field>
          )}
        </SettingGroup>
        <div className="flex justify-end mb-4">
          <Button type="submit" kind="primary" disabled={savingHomepage}>
            {savingHomepage ? "Saving..." : "Save homepage"}
          </Button>
        </div>
      </form>

      {/* ── Main menu ───────────────────────────────── */}
      <SettingGroup
        title="Main menu"
        desc="Links in the top navigation. Drag to reorder."
      >
        {menuMsg && (
          <div className={`${menuAlert} mb-2`}>{menuMsg.text}</div>
        )}

        {isFormOpen && (
          <Card
            header={
              <>
                <SectionLabel>
                  {editingId ? "Edit menu item" : "New menu item"}
                </SectionLabel>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                  className="p-1 text-admin-ink-soft hover:text-admin-ink"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            }
          >
            <form onSubmit={handleMenuSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
                <Field label="Link type" htmlFor="m-type">
                  <Select
                    id="m-type"
                    value={form.targetType}
                    onChange={(e) => handleTargetTypeChange(e.target.value)}
                  >
                    <option value="page">Page</option>
                    <option value="gallery">
                      {siteConfig.labels.gallery}
                    </option>
                    <option value="external">External link</option>
                  </Select>
                </Field>
                {isLinkType && (
                  <Field
                    label={`Select ${form.targetType}`}
                    htmlFor="m-target"
                  >
                    <Select
                      id="m-target"
                      value={form.targetId ?? ""}
                      onChange={(e) => handleTargetSelect(e.target.value)}
                    >
                      <option value="">
                        Choose a {form.targetType}...
                      </option>
                      {currentOptions.map((opt) => (
                        <option
                          key={opt.id}
                          value={opt.id}
                          disabled={!opt.isPublished}
                        >
                          {opt.title}
                          {!opt.isPublished ? " (draft)" : ""}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
                <Field label="Label" htmlFor="m-label">
                  <Input
                    id="m-label"
                    value={form.label}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, label: e.target.value }))
                    }
                    required
                  />
                </Field>
                <Field label="URL" htmlFor="m-url">
                  <Input
                    id="m-url"
                    value={form.url}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, url: e.target.value }))
                    }
                    placeholder={
                      isLinkType
                        ? "Auto-filled from selection"
                        : "https://example.com"
                    }
                    required
                  />
                </Field>
              </div>
              <div className="flex gap-2">
                <Button type="submit" kind="primary">
                  {editingId ? "Update" : "Add"}
                </Button>
                <Button
                  type="button"
                  kind="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-admin-border p-6 text-center text-[13px] text-admin-ink-soft">
            No menu items yet.
          </div>
        ) : (
          <Card padded={false}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map((item) => (
                  <SortableItem key={item.id} id={item.id}>
                    <div className="flex items-center justify-between gap-3 border-b border-admin-border px-4 py-3 last:border-0">
                      <div className="min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-admin-ink truncate">
                          {item.label}
                        </span>
                        <span className="text-[12px] text-admin-ink-soft truncate">
                          {item.url}
                        </span>
                        <Pill>{item.targetType}</Pill>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() => openEditForm(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          kind="danger"
                          size="sm"
                          onClick={() => handleMenuDelete(item.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
          </Card>
        )}

        <div className="mt-3">
          <Button
            kind="ghost"
            onClick={openAddForm}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Add menu item
          </Button>
        </div>
      </SettingGroup>

      {/* ── Footer ──────────────────────────────────── */}
      <form onSubmit={handleFooterSubmit}>
        <SettingGroup title="Footer" desc="The text at the bottom of every page.">
          {footerMsg && (
            <div className={`${footerAlert} mb-2`}>{footerMsg.text}</div>
          )}
          <Field label="Footer text" htmlFor="footerText" inline>
            <Textarea
              id="footerText"
              rows={3}
              value={footer.footerText}
              onChange={(e) =>
                setFooter((f) => ({ ...f, footerText: e.target.value }))
              }
              placeholder="© Your name, 2026"
            />
          </Field>
        </SettingGroup>
        <div className="flex justify-end">
          <Button type="submit" kind="primary" disabled={savingFooter}>
            {savingFooter ? "Saving..." : "Save footer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
