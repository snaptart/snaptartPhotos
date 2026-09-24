import type { Components } from "@/lib/puck/config";
import { COLOR_TOKENS, TEXT_STYLE_LABELS, type TextStyleKey } from "@/lib/theme/types";
import { SPACE_SCALE } from "@/lib/theme/layout";
import { colorTokenOf } from "@/lib/theme/color";
import { hasAdjustments, type TextStyleValue } from "@/lib/theme/text-style-value";
import { columnsSummary } from "@/lib/puck/responsive";

/**
 * How each block's settings are laid out in the properties panel: which tab
 * a setting sits on, the group it belongs to, and when it's hidden because it
 * doesn't apply (columns in a list layout, lightbox options while the block
 * uses the global lightbox, …).
 *
 *   Content — what the block shows: text, images, links, sources, playback.
 *   Style   — how it looks: text styles, colours, borders, hover.
 *   Layout  — size, arrangement, alignment and the space around it.
 *
 * A block with no entry here keeps Puck's flat list. A field left out of its
 * block's groups still shows, in a "More" group, so nothing goes missing.
 */

export type PanelTab = "content" | "style" | "layout";

export const PANEL_TABS: { key: PanelTab; label: string }[] = [
  { key: "content", label: "Content" },
  { key: "style", label: "Style" },
  { key: "layout", label: "Layout" },
];

export type PanelGroup<P> = {
  tab: PanelTab;
  /** Omit for a block whose whole panel is one group. */
  title?: string;
  fields: readonly (keyof P & string)[];
  /** One line shown beside the title while the group is closed. */
  summary?: (props: P) => string | undefined;
  /** Start closed: fine-tuning most edits never touch. */
  collapsed?: boolean;
};

export type PanelLayout<P> = {
  groups: PanelGroup<P>[];
  /** Show a field only while this holds. */
  when?: { [K in keyof P]?: (props: P) => boolean };
};

// ----- Summaries -----

export function textStyleSummary(value: TextStyleValue | undefined, fallback: TextStyleKey): string {
  const label = TEXT_STYLE_LABELS[value?.style ?? fallback] ?? TEXT_STYLE_LABELS[fallback];
  const parts = [label];
  if (value?.size != null) parts.push(`${value.size}px`);
  const { size: _size, ...rest } = value ?? {};
  if (hasAdjustments(rest as TextStyleValue)) parts.push("adjusted");
  return parts.join(" · ");
}

export function colorSummary(value: string | undefined, empty = "Default"): string {
  if (!value) return empty;
  if (value === "transparent") return "Transparent";
  const token = colorTokenOf(value);
  if (token) return COLOR_TOKENS.find((t) => t.key === token)?.label ?? token;
  return value.toUpperCase();
}

function space(value: number | undefined): string {
  const v = value ?? 0;
  return SPACE_SCALE.find((s) => s.value === v)?.label ?? `${v}px`;
}

export function spacingSummary(p: { marginTop?: number; marginBottom?: number }): string {
  return `Above ${space(p.marginTop)} · Below ${space(p.marginBottom)}`;
}

function hoverSummary(p: { hoverEffect?: string; transitionMs?: number }): string {
  const effect = !p.hoverEffect || p.hoverEffect === "none" ? "No effect" : capitalise(p.hoverEffect.replace(/-/g, " "));
  return `${effect} · ${p.transitionMs ?? 0}ms`;
}

function list(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" · ");
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function onOff(value: boolean | undefined, on: string, off: string): string {
  return value ? on : off;
}

// ----- Blocks -----

type Layouts = { [K in keyof Components]?: PanelLayout<Components[K]> };

const SPACING = { tab: "layout", title: "Spacing", fields: ["marginTop", "marginBottom"], summary: spacingSummary } as const;

const LINK_LIST_LAYOUTS: Record<string, string> = {
  "vertical-list": "Vertical list",
  "horizontal-pills": "Pills",
  "button-stack": "Button stack",
  "card-grid": "Card grid",
};

export const PANEL_LAYOUTS: Layouts = {
  Hero: {
    groups: [
      { tab: "content", title: "Image", fields: ["imageUrl", "focalX", "focalY"], summary: (p) => onOff(!!p.imageUrl, "Image set", "No image") },
      { tab: "content", title: "Text", fields: ["title", "subtitle"], summary: (p) => p.title || "No title" },
      { tab: "style", title: "Title", fields: ["titleStyle"], summary: (p) => textStyleSummary(p.titleStyle, "display") },
      { tab: "style", title: "Subtitle", fields: ["subtitleStyle"], summary: (p) => textStyleSummary(p.subtitleStyle, "lead") },
      { tab: "style", title: "Overlay", fields: ["overlay"], summary: (p) => onOff(p.overlay, "Dark overlay", "None") },
      { tab: "layout", title: "Size", fields: ["height"], summary: (p) => p.height },
    ],
    when: {
      focalX: (p) => !!p.imageUrl,
      focalY: (p) => !!p.imageUrl,
      overlay: (p) => !!p.imageUrl,
    },
  },

  ImageBlock: {
    groups: [
      { tab: "content", title: "Image", fields: ["url", "alt", "focalX", "focalY"], summary: (p) => p.alt || (p.url ? "No alt text" : "No image") },
      { tab: "content", title: "Caption", fields: ["caption"], summary: (p) => p.caption || "None" },
      { tab: "content", title: "Link", fields: ["linkUrl", "linkTarget"], summary: (p) => p.linkUrl || "None" },
      { tab: "style", title: "Image", fields: ["borderRadius"], summary: (p) => `Corners ${p.borderRadius ?? 0}px` },
      {
        tab: "style",
        title: "Caption",
        fields: ["captionStyle", "captionBgColor", "captionBgOpacity"],
        summary: (p) => textStyleSummary(p.captionStyle, "photoTitle"),
      },
      { tab: "layout", title: "Size", fields: ["width", "aspectRatio"], summary: (p) => list(`${p.width}%`, p.aspectRatio) },
      { tab: "layout", title: "Caption position", fields: ["captionX", "captionY"], summary: (p) => `${p.captionX}% · ${p.captionY}%` },
    ],
    when: {
      // A natural-ratio image isn't cropped, so there's nothing to position.
      focalX: (p) => !!p.url && p.aspectRatio !== "natural",
      focalY: (p) => !!p.url && p.aspectRatio !== "natural",
      linkTarget: (p) => !!p.linkUrl,
      captionStyle: (p) => !!p.caption,
      captionBgColor: (p) => !!p.caption,
      captionBgOpacity: (p) => !!p.caption,
      captionX: (p) => !!p.caption,
      captionY: (p) => !!p.caption,
    },
  },

  GalleriesIndex: {
    groups: [
      {
        tab: "content",
        title: "Source",
        fields: ["sourceMode", "selectedSlugs", "sortOrder", "maxItems"],
        summary: (p) =>
          list(p.sourceMode === "manual" ? `${p.selectedSlugs?.length ?? 0} picked` : "All published", p.maxItems > 0 && `max ${p.maxItems}`),
      },
      {
        tab: "content",
        title: "Show",
        fields: ["showTitle", "showDescription", "showCount", "countLabel"],
        summary: (p) =>
          list(p.layout !== "list" && p.showTitle && "Title", p.showDescription && "Description", p.showCount && "Count") || "Images only",
      },
      {
        tab: "style",
        title: "Title",
        fields: ["titleStyle", "listTitleStyle"],
        summary: (p) =>
          p.layout === "list" ? textStyleSummary(p.listTitleStyle, "collectionTitle") : textStyleSummary(p.titleStyle, "collectionTitle"),
      },
      { tab: "style", title: "Description", fields: ["descriptionStyle"], summary: (p) => textStyleSummary(p.descriptionStyle, "body") },
      {
        tab: "style",
        title: "Images",
        fields: ["aspectRatio", "borderRadius"],
        summary: (p) => list(p.aspectRatio, `corners ${p.borderRadius ?? 0}px`),
      },
      {
        tab: "style",
        title: "Overlay",
        fields: ["overlayBgColor", "overlayOpacity"],
        summary: (p) => list(colorSummary(p.overlayBgColor), `${p.overlayOpacity ?? 0}%`),
      },
      { tab: "style", title: "Dividers", fields: ["dividerColor"], summary: (p) => colorSummary(p.dividerColor) },
      {
        tab: "style",
        title: "Hover",
        fields: ["imageHoverEffect", "transitionMs"],
        summary: (p) => hoverSummary({ hoverEffect: p.layout === "list" ? "fade" : p.imageHoverEffect, transitionMs: p.transitionMs }),
        collapsed: true,
      },
      {
        tab: "layout",
        title: "Arrangement",
        fields: ["layout", "columns", "tabletColumns", "phoneColumns", "gap"],
        summary: (p) =>
          p.layout === "list" ? "Index list" : list("Cover grid", columnsSummary(Number(p.columns), p.tabletColumns, p.phoneColumns), `gap ${p.gap}px`),
      },
      {
        tab: "layout",
        title: "Text placement",
        fields: ["titlePosition", "titleRule", "textAlignment", "textPaddingX", "textPaddingY", "textGap"],
        summary: (p) => (p.layout === "list" ? `Rows ${p.textPaddingY}px` : list(p.titlePosition === "below" ? "Below image" : "Overlay", p.textAlignment)),
        collapsed: true,
      },
      { tab: "layout", title: "Width", fields: ["fullBleed", "maxWidth"], summary: (p) => (p.fullBleed ? "Full bleed" : `${p.maxWidth}%`) },
      SPACING,
    ],
    when: {
      selectedSlugs: (p) => p.sourceMode === "manual",
      showTitle: (p) => p.layout !== "list",
      // The list shows a bare number; covers can add a word after it.
      countLabel: (p) => p.showCount && p.layout !== "list",
      titleRule: (p) => p.layout !== "list" && p.titlePosition === "below",
      titleStyle: (p) => p.layout !== "list" && p.showTitle,
      listTitleStyle: (p) => p.layout === "list",
      descriptionStyle: (p) => p.showDescription,
      aspectRatio: (p) => p.layout !== "list",
      borderRadius: (p) => p.layout !== "list",
      overlayBgColor: (p) => p.layout !== "list" && p.titlePosition !== "below",
      overlayOpacity: (p) => p.layout !== "list" && p.titlePosition !== "below",
      dividerColor: (p) => p.layout === "list",
      imageHoverEffect: (p) => p.layout !== "list",
      columns: (p) => p.layout !== "list",
      tabletColumns: (p) => p.layout !== "list",
      phoneColumns: (p) => p.layout !== "list",
      gap: (p) => p.layout !== "list",
      titlePosition: (p) => p.layout !== "list",
      textAlignment: (p) => p.layout !== "list",
      textPaddingX: (p) => p.layout !== "list",
      textGap: (p) => p.showDescription,
      maxWidth: (p) => !p.fullBleed,
    },
  },

  LinkList: {
    groups: [
      { tab: "content", title: "Items", fields: ["items"], summary: (p) => `${p.items?.length ?? 0} items` },
      {
        tab: "content",
        title: "Show",
        fields: ["showDescription", "showImage", "showIcon"],
        summary: (p) => list(p.showDescription && "Description", p.showImage && "Image", p.showIcon && "Icon") || "Labels only",
      },
      {
        tab: "style",
        title: "Label",
        fields: ["labelStyle", "textColor", "underline"],
        summary: (p) => list(textStyleSummary(p.labelStyle, "body"), colorSummary(p.textColor)),
      },
      { tab: "style", title: "Description", fields: ["descriptionStyle"], summary: (p) => textStyleSummary(p.descriptionStyle, "body") },
      {
        tab: "style",
        title: "Item box",
        fields: ["bgColor", "bgOpacity", "borderColor", "borderWidth", "borderRadius", "shadow"],
        summary: (p) => list(p.bgOpacity > 0 ? colorSummary(p.bgColor) : "No fill", p.borderWidth > 0 ? `${p.borderWidth}px border` : "no border"),
        collapsed: true,
      },
      {
        tab: "style",
        title: "Image",
        fields: ["imagePosition", "imageSize", "imageAspectRatio", "imageBorderRadius"],
        summary: (p) => list(capitalise(p.imagePosition ?? "left"), `${p.imageSize}px`, p.imageAspectRatio),
      },
      {
        tab: "style",
        title: "Dividers",
        fields: ["dividers", "dividerColor"],
        summary: (p) => (p.dividers ? colorSummary(p.dividerColor) : "None"),
      },
      {
        tab: "style",
        title: "Hover",
        fields: ["hoverEffect", "hoverTextColor", "hoverBgColor", "hoverBorderColor", "hoverShadow", "transitionMs"],
        summary: hoverSummary,
        collapsed: true,
      },
      {
        tab: "layout",
        title: "Arrangement",
        fields: ["layout", "columns", "tabletColumns", "phoneColumns", "gap", "alignment", "itemAlignment"],
        summary: (p) =>
          list(
            LINK_LIST_LAYOUTS[p.layout] ?? p.layout,
            p.layout === "card-grid" && columnsSummary(Number(p.columns), p.tabletColumns, p.phoneColumns),
            `gap ${p.gap}px`,
          ),
      },
      {
        tab: "layout",
        title: "Item padding",
        fields: ["paddingX", "paddingY", "iconGap"],
        summary: (p) => `${p.paddingX}px × ${p.paddingY}px`,
        collapsed: true,
      },
      SPACING,
    ],
    when: {
      descriptionStyle: (p) => p.showDescription,
      imagePosition: (p) => p.showImage,
      imageSize: (p) => p.showImage && p.imagePosition !== "top",
      imageAspectRatio: (p) => p.showImage,
      imageBorderRadius: (p) => p.showImage,
      iconGap: (p) => p.showImage || p.showIcon,
      // Dividers only draw between rows of a borderless vertical list.
      dividers: (p) => p.layout === "vertical-list" && !(p.borderWidth > 0),
      dividerColor: (p) => p.layout === "vertical-list" && !(p.borderWidth > 0) && p.dividers,
      columns: (p) => p.layout === "card-grid",
      tabletColumns: (p) => p.layout === "card-grid",
      phoneColumns: (p) => p.layout === "card-grid",
      alignment: (p) => p.layout === "horizontal-pills" || p.layout === "button-stack",
    },
  },

  Button: {
    groups: [
      { tab: "content", title: "Text", fields: ["label", "iconText"], summary: (p) => list(p.label, p.iconText) },
      { tab: "content", title: "Link", fields: ["link", "linkTarget", "ariaLabel"], summary: (p) => p.link || "None" },
      {
        tab: "style",
        title: "Text",
        fields: ["labelStyle", "textColor", "underline"],
        summary: (p) => list(textStyleSummary(p.labelStyle, "label"), colorSummary(p.textColor)),
      },
      {
        tab: "style",
        title: "Fill and border",
        fields: ["bgColor", "bgOpacity", "borderColor", "borderWidth", "borderStyle", "borderRadius", "shadow"],
        summary: (p) => list(p.bgOpacity > 0 ? colorSummary(p.bgColor) : "No fill", p.borderWidth > 0 ? `${p.borderWidth}px ${p.borderStyle}` : "no border"),
      },
      { tab: "style", title: "Icon", fields: ["iconPosition", "iconGap"], summary: (p) => list(capitalise(p.iconPosition ?? "right"), `${p.iconGap}px`) },
      {
        tab: "style",
        title: "Hover",
        fields: ["hoverEffect", "hoverTextColor", "hoverBgColor", "hoverBorderColor", "hoverShadow", "transitionMs"],
        summary: hoverSummary,
        collapsed: true,
      },
      {
        tab: "layout",
        title: "Size",
        fields: ["widthMode", "customWidth", "minWidth", "alignment"],
        summary: (p) => list(p.widthMode === "custom" ? `${p.customWidth}%` : p.widthMode === "full" ? "Full width" : "Fits label", p.alignment),
      },
      { tab: "layout", title: "Padding", fields: ["paddingX", "paddingY"], summary: (p) => `${p.paddingX}px × ${p.paddingY}px`, collapsed: true },
      SPACING,
    ],
    when: {
      linkTarget: (p) => !!p.link,
      iconPosition: (p) => !!p.iconText,
      iconGap: (p) => !!p.iconText,
      customWidth: (p) => p.widthMode === "custom",
      alignment: (p) => p.widthMode !== "full",
      borderStyle: (p) => p.borderWidth > 0,
      borderColor: (p) => p.borderWidth > 0,
    },
  },

  Spacer: {
    groups: [
      { tab: "layout", title: "Space", fields: ["height", "unit"], summary: (p) => `${p.height}${p.unit === "%" ? "vh" : "px"}` },
      {
        tab: "style",
        title: "Rule",
        fields: ["line", "lineWidth", "lineLength", "lineAlign", "lineColor"],
        summary: (p) => (p.line ? list(`${p.lineWidth}px`, `${p.lineLength}%`, colorSummary(p.lineColor, "Theme hairline")) : "None"),
      },
    ],
    when: {
      lineWidth: (p) => p.line,
      lineLength: (p) => p.line,
      lineAlign: (p) => p.line && p.lineLength < 100,
      lineColor: (p) => p.line,
    },
  },

  HeroSlideshow: {
    groups: [
      { tab: "content", title: "Photos", fields: ["gallerySlug", "maxPhotos"], summary: (p) => list(p.gallerySlug || "None", `max ${p.maxPhotos}`) },
      {
        tab: "content",
        title: "Playback",
        fields: ["autoPlay", "interval", "pauseOnHover", "transitionDuration", "showArrows", "showDots"],
        summary: (p) => list(p.autoPlay ? `Auto every ${p.interval}s` : "Manual", p.showArrows && "arrows", p.showDots && "dots"),
      },
      {
        tab: "style",
        title: "Images",
        fields: ["objectFit", "overlayOpacity"],
        summary: (p) => list(capitalise(p.objectFit ?? "cover"), p.overlayOpacity > 0 && `overlay ${p.overlayOpacity}%`),
      },
      {
        tab: "layout",
        title: "Size",
        fields: ["height", "aspectRatio", "fullBleed", "maxWidth"],
        summary: (p) => list(p.aspectRatio !== "none" ? p.aspectRatio : p.height, p.fullBleed ? "full bleed" : p.maxWidth),
      },
    ],
    when: {
      interval: (p) => p.autoPlay,
      pauseOnHover: (p) => p.autoPlay,
      maxWidth: (p) => !p.fullBleed,
    },
  },

  Carousel: {
    groups: [
      {
        tab: "content",
        title: "Slides",
        fields: ["sourceMode", "gallerySlug", "maxPhotos", "slides"],
        summary: (p) => (p.sourceMode === "gallery" ? list(p.gallerySlug || "No gallery", `max ${p.maxPhotos}`) : `${p.slides?.length ?? 0} slides`),
      },
      { tab: "content", title: "Photo links", fields: ["slideLinkOverrides"], collapsed: true, summary: (p) => `${Object.keys(p.slideLinkOverrides ?? {}).length} set` },
      {
        tab: "content",
        title: "Playback",
        fields: ["autoPlay", "interval", "pauseOnHover", "transition", "transitionDuration", "showArrows", "showDots", "initialSlide"],
        summary: (p) => list(p.autoPlay ? `Auto every ${p.interval}s` : "Manual", p.transition, p.showArrows && "arrows", p.showDots && "dots"),
        collapsed: true,
      },
      {
        tab: "style",
        title: "Slide text",
        fields: ["slideTitleStyle", "slideSubtitleStyle"],
        summary: (p) => textStyleSummary(p.slideTitleStyle, "collectionTitle"),
      },
      { tab: "style", title: "Images", fields: ["objectFit", "borderRadius"], summary: (p) => list(capitalise(p.objectFit ?? "cover"), `corners ${p.borderRadius}px`) },
      {
        tab: "layout",
        title: "Arrangement",
        fields: ["slidesPerView", "gap", "aspectRatio", "height"],
        summary: (p) => list(`${p.slidesPerView} per view`, p.aspectRatio !== "none" && p.aspectRatio, p.height),
      },
    ],
    when: {
      gallerySlug: (p) => p.sourceMode === "gallery",
      maxPhotos: (p) => p.sourceMode === "gallery",
      slideLinkOverrides: (p) => p.sourceMode === "gallery",
      slides: (p) => p.sourceMode !== "gallery",
      slideTitleStyle: (p) => p.sourceMode !== "gallery",
      slideSubtitleStyle: (p) => p.sourceMode !== "gallery",
      interval: (p) => p.autoPlay,
      pauseOnHover: (p) => p.autoPlay,
    },
  },

  GalleryEmbed: {
    groups: [
      { tab: "content", title: "Photos", fields: ["gallerySlug", "maxPhotos"], summary: (p) => list(p.gallerySlug || "None", `max ${p.maxPhotos}`) },
      {
        tab: "content",
        title: "Photo info",
        fields: ["showMetadata", "metadataFields", "numbered"],
        summary: (p) =>
          list(p.showMetadata ? (p.metadataFields ?? []).join(", ") || "Nothing picked" : "Hidden", p.layout === "hang" && p.numbered && "numbered"),
      },
      {
        tab: "content",
        title: "Lightbox",
        fields: [
          "useGlobalLightbox",
          "lightboxMetadataFields",
          "lightboxCaptionPosition",
          "lightboxCaptionAlignment",
          "lightboxCornerRadius",
          "lightboxFadeSpeed",
        ],
        summary: (p) => (p.useGlobalLightbox ? "Site defaults" : "Customised"),
        collapsed: true,
      },
      {
        tab: "style",
        title: "Photo info",
        fields: ["captionTitleStyle", "captionMetaStyle"],
        summary: (p) => list(textStyleSummary(p.captionTitleStyle, "photoTitle"), textStyleSummary(p.captionMetaStyle, "meta")),
      },
      { tab: "style", title: "Images", fields: ["borderRadius"], summary: (p) => `Corners ${p.borderRadius}px` },
      {
        tab: "layout",
        title: "Arrangement",
        fields: ["layout", "columns", "tabletColumns", "phoneColumns", "aspectRatio", "gap", "hangOffset", "hangGap", "imageMaxWidth"],
        summary: (p) =>
          list(
            capitalise(p.layout),
            p.layout !== "hang" && columnsSummary(Number(p.columns), p.tabletColumns, p.phoneColumns),
            p.layout !== "masonry" && p.aspectRatio,
            `gap ${p.gap}px`,
          ),
      },
    ],
    when: {
      metadataFields: (p) => p.showMetadata,
      numbered: (p) => p.layout === "hang",
      captionTitleStyle: (p) => p.showMetadata,
      // The Hang layout's numbers use the details style.
      captionMetaStyle: (p) => p.showMetadata || (p.layout === "hang" && p.numbered),
      columns: (p) => p.layout !== "hang",
      tabletColumns: (p) => p.layout !== "hang",
      phoneColumns: (p) => p.layout !== "hang",
      imageMaxWidth: (p) => p.layout !== "hang",
      hangOffset: (p) => p.layout === "hang",
      hangGap: (p) => p.layout === "hang",
      lightboxMetadataFields: (p) => !p.useGlobalLightbox,
      lightboxCaptionPosition: (p) => !p.useGlobalLightbox,
      lightboxCaptionAlignment: (p) => !p.useGlobalLightbox,
      lightboxCornerRadius: (p) => !p.useGlobalLightbox,
      lightboxFadeSpeed: (p) => !p.useGlobalLightbox,
      // Masonry keeps each photo's own shape.
      aspectRatio: (p) => p.layout !== "masonry",
    },
  },

  FieldMap: {
    groups: [
      { tab: "content", title: "Map", fields: ["mapStyle", "showBrand"], summary: (p) => capitalise(p.mapStyle) },
      { tab: "style", title: "Background", fields: ["backgroundColor"], summary: (p) => colorSummary(p.backgroundColor) },
      { tab: "layout", title: "Size", fields: ["height"], summary: (p) => (p.height === "fill" ? "Fill page" : p.height) },
    ],
  },

  PageIntro: {
    groups: [
      { tab: "content", title: "Text", fields: ["eyebrow", "title", "text"], summary: (p) => p.title || "No title" },
      { tab: "content", title: "Link", fields: ["linkLabel", "link"], summary: (p) => p.linkLabel || "None" },
      { tab: "content", title: "Stats", fields: ["stats"], summary: (p) => `${p.stats?.length ?? 0} stats` },
      { tab: "style", title: "Eyebrow", fields: ["eyebrowStyle"], summary: (p) => textStyleSummary(p.eyebrowStyle, "label") },
      { tab: "style", title: "Title", fields: ["titleStyle", "titleTag"], summary: (p) => list(textStyleSummary(p.titleStyle, "display"), p.titleTag?.toUpperCase()) },
      { tab: "style", title: "Text", fields: ["textStyle"], summary: (p) => textStyleSummary(p.textStyle, "lead") },
      { tab: "style", title: "Link", fields: ["linkStyle"], summary: (p) => textStyleSummary(p.linkStyle, "label") },
      {
        tab: "style",
        title: "Stats",
        fields: ["statLabelStyle", "statValueStyle"],
        summary: (p) => textStyleSummary(p.statValueStyle, "collectionTitle"),
      },
      {
        tab: "layout",
        title: "Arrangement",
        fields: ["alignment", "textMaxWidth"],
        summary: (p) => list(capitalise(p.alignment ?? "left"), p.textMaxWidth > 0 ? `text ${p.textMaxWidth}px` : "full width"),
      },
      { tab: "layout", title: "Rule", fields: ["ruleBelow", "ruleGap"], summary: (p) => (p.ruleBelow ? `Below, ${p.ruleGap}px under the text` : "None") },
      SPACING,
    ],
    when: {
      eyebrowStyle: (p) => !!p.eyebrow,
      textStyle: (p) => !!p.text,
      linkStyle: (p) => !!p.linkLabel,
      statLabelStyle: (p) => (p.stats?.length ?? 0) > 0,
      statValueStyle: (p) => (p.stats?.length ?? 0) > 0,
      ruleGap: (p) => p.ruleBelow,
    },
  },

  SectionHeader: {
    groups: [
      { tab: "content", title: "Title", fields: ["title"], summary: (p) => p.title },
      { tab: "content", title: "Link", fields: ["linkLabel", "link"], summary: (p) => p.linkLabel || "None" },
      { tab: "style", title: "Title", fields: ["titleStyle", "titleTag"], summary: (p) => textStyleSummary(p.titleStyle, "label") },
      { tab: "style", title: "Link", fields: ["linkStyle"], summary: (p) => textStyleSummary(p.linkStyle, "meta") },
      { tab: "layout", title: "Rule", fields: ["ruleBelow"], summary: (p) => (p.ruleBelow ? "Below" : "None") },
      SPACING,
    ],
    when: {
      linkStyle: (p) => !!p.linkLabel,
    },
  },

  Details: {
    groups: [
      { tab: "content", title: "Details", fields: ["items"], summary: (p) => `${p.items?.length ?? 0} details` },
      { tab: "style", title: "Terms", fields: ["termStyle"], summary: (p) => textStyleSummary(p.termStyle, "meta") },
      { tab: "style", title: "Descriptions", fields: ["descriptionStyle"], summary: (p) => textStyleSummary(p.descriptionStyle, "collectionTitle") },
      {
        tab: "layout",
        title: "Arrangement",
        fields: ["layout", "columns", "tabletColumns", "phoneColumns", "dividers"],
        summary: (p) =>
          p.layout === "columns"
            ? columnsSummary(Number(p.columns), p.tabletColumns, p.phoneColumns)
            : p.layout === "inline"
              ? "In a line"
              : list("Rows", p.dividers && "rules"),
      },
      SPACING,
    ],
    when: {
      columns: (p) => p.layout === "columns",
      tabletColumns: (p) => p.layout === "columns",
      phoneColumns: (p) => p.layout === "columns",
      dividers: (p) => p.layout === "rows",
    },
  },

  PhotoPlate: {
    groups: [
      { tab: "content", title: "Photo", fields: ["photo"], summary: (p) => p.photo?.title || (p.photo ? "Untitled" : "None") },
      { tab: "content", title: "Caption", fields: ["title", "meta", "showCaption"], summary: (p) => (p.showCaption ? p.title || p.photo?.title || "Photo's title" : "Hidden") },
      { tab: "content", title: "Click", fields: ["onClick", "link"], summary: (p) => (p.onClick === "lightbox" ? "Enlarges" : p.onClick === "link" ? p.link || "Link" : "Nothing") },
      {
        tab: "style",
        title: "Caption",
        fields: ["titleStyle", "metaStyle", "captionRule"],
        summary: (p) => list(textStyleSummary(p.titleStyle, "photoTitle"), p.captionRule && "rule"),
      },
      { tab: "layout", title: "Crop", fields: ["aspectRatio"], summary: (p) => p.aspectRatio },
      SPACING,
    ],
    when: {
      title: (p) => p.showCaption,
      meta: (p) => p.showCaption,
      link: (p) => p.onClick === "link",
      titleStyle: (p) => p.showCaption,
      metaStyle: (p) => p.showCaption,
      captionRule: (p) => p.showCaption,
    },
  },

  SelectedWork: {
    groups: [
      { tab: "content", title: "Photos", fields: ["photos"], summary: (p) => `${p.photos?.length ?? 0} photos` },
      { tab: "content", title: "Behaviour", fields: ["onClick", "showTitles"], summary: (p) => list(p.onClick === "lightbox" ? "Enlarges" : "No click", p.showTitles ? "titles" : "no titles") },
      { tab: "style", title: "Titles", fields: ["titleStyle"], summary: (p) => textStyleSummary(p.titleStyle, "photoTitle") },
      {
        tab: "layout",
        title: "Grid",
        fields: ["columns", "tabletColumns", "phoneColumns", "aspectRatio", "columnGap", "rowGap"],
        summary: (p) => list(columnsSummary(Number(p.columns), p.tabletColumns, p.phoneColumns), p.aspectRatio, `gaps ${p.columnGap}/${p.rowGap}px`),
      },
      SPACING,
    ],
    when: {
      titleStyle: (p) => p.showTitles,
    },
  },

  Breadcrumb: {
    groups: [
      {
        tab: "content",
        title: "Steps",
        fields: ["items", "current"],
        summary: (p) => [...(p.items ?? []).map((c) => c.label), p.current].filter(Boolean).join(` ${p.separator || "/"} `),
      },
      { tab: "style", title: "Steps", fields: ["linkStyle", "separator"], summary: (p) => textStyleSummary(p.linkStyle, "meta") },
      { tab: "style", title: "This page", fields: ["currentStyle"], summary: (p) => textStyleSummary(p.currentStyle, "meta") },
      SPACING,
    ],
    when: {
      currentStyle: (p) => !!p.current,
    },
  },

  NextCollection: {
    groups: [
      { tab: "content", title: "Collection", fields: ["gallerySlug", "wrap"], summary: (p) => p.gallerySlug || "Not chosen" },
      { tab: "content", title: "Label", fields: ["label"], summary: (p) => p.label },
      { tab: "style", title: "Label", fields: ["labelStyle"], summary: (p) => textStyleSummary(p.labelStyle, "label") },
      { tab: "style", title: "Title", fields: ["titleStyle"], summary: (p) => textStyleSummary(p.titleStyle, "display") },
      SPACING,
    ],
  },

  Form: {
    groups: [
      { tab: "content", title: "Form", fields: ["formName", "submitLabel", "successMessage", "recipientEmail"], summary: (p) => p.formName },
      { tab: "style", title: "Field labels", fields: ["labelStyle"], summary: (p) => textStyleSummary(p.labelStyle, "label") },
      {
        tab: "style",
        title: "Field text",
        fields: ["fieldTextStyle", "placeholderColor"],
        summary: (p) => textStyleSummary(p.fieldTextStyle, "body"),
      },
      {
        tab: "style",
        title: "Fields",
        fields: ["fieldLook", "fieldBorderColor", "fieldBackground", "fieldRadius"],
        summary: (p) => list(p.fieldLook === "underline" ? "Underline" : "Box", colorSummary(p.fieldBorderColor)),
      },
      {
        tab: "style",
        title: "Submit button",
        fields: ["submitTextStyle", "submitTextColor", "submitBgColor", "submitHoverBgColor", "submitRadius"],
        summary: (p) => list(textStyleSummary(p.submitTextStyle, "label"), colorSummary(p.submitBgColor)),
      },
      {
        tab: "style",
        title: "Panel",
        fields: ["panel", "panelColor", "panelPadding", "panelRadius"],
        summary: (p) => (p.panel ? list(colorSummary(p.panelColor), `padding ${p.panelPadding ?? 48}px`) : "None"),
      },
    ],
    when: {
      // An underline has no corners to round.
      fieldRadius: (p) => p.fieldLook !== "underline",
      panelColor: (p) => !!p.panel,
      panelPadding: (p) => !!p.panel,
      panelRadius: (p) => !!p.panel,
    },
  },
};
