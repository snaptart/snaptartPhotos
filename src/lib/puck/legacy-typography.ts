import { fromLegacyTypography } from "@/lib/theme/text-style-value";

// Button, Link List and Galleries Index used to store font role, size, weight,
// spacing (px), case and slant as separate props. These turn them into text
// styles: a setting still at the block's old default follows the theme style,
// one the editor changed is kept as an adjustment. The old keys are cleared so
// a re-saved page carries only the new shape.

type Legacy = Record<string, unknown>;

const str = (v: unknown) => (v == null ? undefined : String(v));
const num = (v: unknown) => (v == null || v === "" ? undefined : Number(v));
const bool = (v: unknown) => (v == null ? undefined : Boolean(v));

function clearKeys<T>(props: T, keys: string[]): T {
  const out = { ...props } as Legacy;
  for (const k of keys) out[k] = undefined;
  return out as T;
}

const BUTTON_LEGACY = ["fontRoleKey", "fontSize", "fontWeight", "letterSpacing", "textTransform", "italic"];

export function migrateButton<T extends object>(props: T): T {
  const p = props as Legacy;
  if (p.labelStyle) return props;
  const labelStyle = fromLegacyTypography(
    "label",
    { role: str(p.fontRoleKey), size: num(p.fontSize), weight: str(p.fontWeight), transform: str(p.textTransform), trackingPx: num(p.letterSpacing), italic: bool(p.italic) },
    { role: "labels", size: 14, weight: "500", transform: "none", trackingPx: 0, italic: false },
  );
  return { ...clearKeys(props, BUTTON_LEGACY), labelStyle };
}

const IMAGE_LEGACY = ["captionFontSize", "captionColor", "captionBold", "captionItalic"];

export function migrateImageBlock<T extends object>(props: T): T {
  const p = props as Legacy;
  if (p.captionStyle) return props;
  const captionStyle = fromLegacyTypography(
    "photoTitle",
    {
      size: num(p.captionFontSize),
      color: str(p.captionColor),
      weight: p.captionBold == null ? undefined : p.captionBold ? 700 : 400,
      italic: bool(p.captionItalic),
    },
    { size: 14, color: "#737373", weight: 400, italic: true },
  );
  return { ...clearKeys(props, IMAGE_LEGACY), captionStyle };
}

const LINKLIST_LEGACY =[...BUTTON_LEGACY, "descriptionSize", "descriptionColor"];

export function migrateLinkList<T extends object>(props: T): T {
  const p = props as Legacy;
  if (p.labelStyle) return props;
  const labelStyle = fromLegacyTypography(
    "body",
    { role: str(p.fontRoleKey), size: num(p.fontSize), weight: str(p.fontWeight), transform: str(p.textTransform), trackingPx: num(p.letterSpacing), italic: bool(p.italic) },
    { role: "body", size: 16, weight: "500", transform: "none", trackingPx: 0, italic: false },
  );
  const descriptionStyle = fromLegacyTypography(
    "body",
    { size: num(p.descriptionSize), color: str(p.descriptionColor) },
    { size: 13, color: "#737373" },
  );
  return { ...clearKeys(props, LINKLIST_LEGACY), labelStyle, descriptionStyle };
}

// Forms had one fixed look before their fields and submit button could be
// styled. A saved Form gets that look written in, so it keeps it until someone
// changes it; new Forms start from the theme (the block's defaultProps).
const FORM_LEGACY_LOOK = {
  fieldTextStyle: { style: "body" },
  placeholderColor: "",
  fieldLook: "box",
  fieldBorderColor: "#d4d4d4",
  fieldBackground: "#ffffff",
  fieldRadius: 4,
  submitTextStyle: { style: "body", size: 14, lineHeight: 1.43 },
  submitBgColor: "#171717",
  submitTextColor: "#ffffff",
  submitHoverBgColor: "#404040",
  submitRadius: 4,
} as const;

export function migrateForm<T extends object>(props: T): T {
  const p = props as Legacy;
  if (p.fieldLook !== undefined) return props;
  return { ...props, ...FORM_LEGACY_LOOK };
}

const GINDEX_LEGACY = [
  "titleFontRole", "titleSize", "titleColor", "titleWeight", "titleTransform",
  "listTitleFontRole", "listTitleSize", "listTitleWeight", "listTitleColor", "listTitleTransform", "listTitleTracking", "listTitleItalic",
  "descriptionSize", "descriptionColor",
];

export function migrateGalleriesIndex<T extends object>(props: T): T {
  const p = props as Legacy;
  if (p.titleStyle) return props;
  const titleStyle = fromLegacyTypography(
    "collectionTitle",
    { role: str(p.titleFontRole), size: num(p.titleSize), weight: str(p.titleWeight), transform: str(p.titleTransform), color: str(p.titleColor) },
    { role: "headings", size: 18, weight: "500", transform: "none", color: "#171717" },
  );
  // The list settings fell back to the grid's when unset, so compare what
  // actually rendered. The new list default is Collection title at 20px.
  const listTitleStyle = {
    size: 20,
    ...fromLegacyTypography(
      "collectionTitle",
      {
        role: str(p.listTitleFontRole ?? p.titleFontRole),
        size: num(p.listTitleSize ?? p.titleSize),
        weight: str(p.listTitleWeight ?? p.titleWeight),
        color: str(p.listTitleColor || p.titleColor),
        transform: str(p.listTitleTransform ?? p.titleTransform),
        trackingPx: num(p.listTitleTracking),
        italic: bool(p.listTitleItalic),
      },
      { role: "headings", size: 20, weight: "300", color: "#171717", transform: "none", trackingPx: 0, italic: false },
    ),
  };
  const descriptionStyle = fromLegacyTypography(
    "body",
    { size: num(p.descriptionSize), color: str(p.descriptionColor) },
    { size: 13, color: "#737373" },
  );
  return { ...clearKeys(props, GINDEX_LEGACY), titleStyle, listTitleStyle, descriptionStyle };
}
