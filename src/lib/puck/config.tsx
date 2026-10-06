"use client";

import type { Config } from "@puckeditor/core";
import { DropZone, createUsePuck, usePuck } from "@puckeditor/core";
import { PageFrame } from "@/components/public/PageFrame";
import { PAGE_LAYOUT_DEFAULTS, opensFlush, type PageLayout, type PageMargins, type PageWidth } from "@/lib/page-layout";
import type { ComponentConfig } from "@puckeditor/core";
import {
  BreakpointVisibility,
  hideOnField,
  phoneColumnsField,
  responsiveColumns,
  responsiveGrid,
  tabletColumnsField,
  type Breakpoint,
  type PhoneColumns,
  type TabletColumns,
} from "@/lib/puck/responsive";
import type { JSONContent } from "@tiptap/react";
import { renderRichText } from "@/lib/tiptap/render-html";
import { richTextCss } from "@/lib/tiptap/rich-text-css";
import TiptapEditor from "@/components/admin/TiptapEditor";
import { Editable, InlineEditScope } from "@/components/puck/inline/Editable";
import { InlineRichText } from "@/components/puck/inline/InlineRichText";
import ImagePicker from "@/components/admin/ImagePicker";
import GalleryPhotoMultiPicker from "@/components/admin/GalleryPhotoMultiPicker";
import NextLink from "next/link";
import { parseLinks } from "@/lib/parseLinks";
import siteConfig from "@/lib/site.config";
import { AutoSpacingControl, ColorControl, ListControl, ListItemField, PhotoControl, PhotoListControl, PositionControl, SegmentedControl, SliderControl, SpacingControl, TextStyleControl, type Position } from "@/components/admin/controls";
import { textStyleCss, type TextStyleValue } from "@/lib/theme/text-style-value";
import { migrateButton, migrateForm, migrateGalleriesIndex, migrateHero, migrateImageBlock, migrateLinkList } from "@/lib/puck/legacy-typography";
import { optimizedSource } from "@/lib/optimized-image";
import { cssColor, withAlpha } from "@/lib/theme/color";
import {
  GALLERY_ASPECT_CSS,
  GALLERY_ASPECT_OPTIONS,
  type GalleryAspect,
} from "@/lib/theme/aspect";
import Lightbox, { photoDate } from "@/components/public/Lightbox";
import { useGalleryTitle } from "@/lib/galleries-client";
import type { LightboxPhoto, LightboxSettings } from "@/components/public/Lightbox";
import StoriesIndex, { STORIES_INDEX_DEFAULTS } from "@/components/public/stories/StoriesIndex";
import type { IndexStory } from "@/components/public/stories/StoriesIndex";
import FieldMap from "@/components/public/fieldmap/FieldMap";
import type {
  FieldMapFilter,
  FieldMapRegion,
  MapStyle,
} from "@/components/public/fieldmap/types";
import { FormWrapperRender } from "@/components/puck/form/FormWrapper";
import {
  BreadcrumbRender,
  DetailsRender,
  PageIntroRender,
  SectionHeaderRender,
  type BreadcrumbProps,
  type Crumb,
  type DetailItem,
  type DetailsProps,
  type IntroStat,
  type PageIntroProps,
  type SectionHeaderProps,
} from "@/components/puck/blocks/sections";
import {
  PLATE_ASPECT_OPTIONS,
  PhotoPlateRender,
  SelectedWorkRender,
  type PhotoPlateProps,
  type SelectedWorkProps,
} from "@/components/puck/blocks/photos";
import type { LibraryPhoto } from "@/lib/puck/photo-ref";
import { NextCollectionRender, type NextCollectionProps } from "@/components/puck/blocks/collections";
import type { FormWrapperProps } from "@/components/puck/form/FormWrapper";
import {
  FormFieldCell,
  TextFieldRender,
  TextAreaRender,
  SelectFieldRender,
  RadioGroupRender,
  CheckboxGroupRender,
  CheckboxRender,
} from "@/components/puck/form/fields";
import type {
  TextFieldProps,
  TextAreaProps,
  SelectFieldProps,
  RadioGroupProps,
  CheckboxGroupProps,
  CheckboxProps,
} from "@/components/puck/form/fields";

// Paragraphs, headings and any text style picked in the toolbar, from the theme.
const RICH_TEXT_CSS = richTextCss(".richtext-render");

// ----- Component prop types -----

type RichTextProps = {
  content: JSONContent | null;
};

type HeroProps = {
  imageUrl: string;
  imageAlt: string;
  title: string;
  titleStyle: TextStyleValue;
  subtitle: string;
  subtitleStyle: TextStyleValue;
  height: string;
  /** Phones (under 640px); "" = same as height. */
  phoneHeight: string;
  /** 0–90; how dark the overlay gets (at its darkest, for "text"). */
  overlayOpacity: number;
  /** even: the same all over; text: a gradient from the side the text sits on. */
  overlayStyle: "even" | "text";
  textPosition: Position;
  /** Phones (under 640px); "" = same as textPosition. */
  phoneTextPosition: Position | "";
  /** Widest the text runs, as a % of the banner (phones always use the full width). */
  textWidth: number;
  focalX: number;
  focalY: number;
  /** Phones crop a wide photo to a tall one, so they can centre on another spot. */
  phoneFocal: boolean;
  phoneFocalX: number;
  phoneFocalY: number;
};

type ImageBlockProps = {
  url: string;
  alt: string;
  aspectRatio: "natural" | "square" | "4:3" | "3:2" | "16:9";
  caption: string;
  captionStyle: TextStyleValue;
  width: number;
  captionX: number;
  captionY: number;
  captionBgColor: string;
  captionBgOpacity: number;
  borderRadius: number;
  /** 0–100; fades the picture only, never its caption. */
  imageOpacity: number;
  linkUrl: string;
  linkTarget: "_self" | "_blank";
  focalX: number;
  focalY: number;
};

type SpacerProps = {
  height: number;
  unit: "px" | "%";
  /** Draws a rule centred in the spacer's height, so `height` becomes the space around it. */
  line: boolean;
  lineWidth: number;
  lineLength: number;
  lineAlign: "left" | "center" | "right";
  /** Blank falls back to the theme hairline. */
  lineColor: string;
};

type ContainerProps = {
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  marginTop: number;
  marginBottom: number;
  bgColor: string;
  bgOpacity: number;
  /** Blank inherits the surrounding text colour. */
  textColor: string;
  borderWidth: number;
  borderColor: string;
  borderRadius: number;
  /** Width of the contents as a % of the container, centred. */
  contentMaxWidth: number;
  /** Background runs edge to edge of the window (in-flow only). */
  fullBleed: boolean;
  /** "floating" positions the box freely over its surroundings instead of in the flow. */
  placement: "flow" | "floating";
  /** Floating: where the anchor edge sits, as a % of the parent's width. */
  floatX: number;
  floatAnchor: "left" | "center" | "right";
  /** Floating: px down from where the container sits in the flow (negative moves up). */
  floatY: number;
  /** Floating: width as a % of the parent (over 100 overhangs it). */
  floatWidth: number;
  /** Floating: height kept open in the flow beneath it; 0 takes no space. */
  floatReserve: number;
  floatZ: number;
  /** Floating, below 768px: stack in the flow at full width, or keep floating. */
  floatMobile: "stack" | "float";
};

type ColumnsProps = {
  columns: "2" | "3";
  distribution: string;
  gap: string;
  /** How columns of different heights line up. */
  align: "start" | "center" | "end" | "stretch";
  /** Below which width the columns stack into one. */
  stackBelow?: "phone" | "tablet" | "never";
  /** Stacked, the order the columns come in: "2-1" puts the second first. Blank = as laid out. */
  stackOrder?: string;
};

type RowsProps = {
  gap: number;
  align: "stretch" | "start" | "center" | "end";
};

const COLUMN_ALIGN: Record<ColumnsProps["align"], string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

const ROWS_ALIGN: Record<RowsProps["align"], string> = {
  stretch: "items-stretch",
  start: "items-start",
  center: "items-center",
  end: "items-end",
};

export type GlobalLightboxSettings = LightboxSettings;

type GalleryEmbedProps = {
  gallerySlug: string;
  maxPhotos: number;
  /** hang: the design's staggered two columns, the right one dropped lower. */
  layout: "grid" | "masonry" | "hang";
  columns: "2" | "3" | "4";
  tabletColumns?: TabletColumns;
  phoneColumns?: PhoneColumns;
  aspectRatio: GalleryAspect;
  gap: number;
  imageMaxWidth: number;
  borderRadius: number;
  showMetadata: boolean;
  metadataFields: string[];
  /** Hang: number each photo's caption, 01, 02… */
  numbered: boolean;
  /** Hang: how far the right-hand column drops. */
  hangOffset: number;
  /** Hang: space between photos down a column. */
  hangGap: number;
  captionTitleStyle: TextStyleValue;
  captionMetaStyle: TextStyleValue;
  useGlobalLightbox: boolean;
  lightboxMetadataFields: string[] | null;
  lightboxCornerRadius: number | null;
  lightboxCaptionPosition: "below" | "overlay-top" | "overlay-bottom" | null;
  lightboxFadeSpeed: "none" | "fast" | "medium" | "slow" | null;
  lightboxCaptionAlignment: "left" | "center" | "right" | null;
};

type HeroSlideshowProps = {
  gallerySlug: string;
  maxPhotos: number;
  /** gallery: the collection's order · random-start: a random photo first, then on in order · shuffle: a new order each visit. */
  order?: "gallery" | "random-start" | "shuffle";
  height: string;
  /** Phones (under 640px): a height ("70dvh", "400px") or a shape ("4:5"); "" = as on desktop. */
  phoneHeight: string;
  aspectRatio: "none" | "16:9" | "3:2" | "4:3" | "1:1";
  autoPlay: boolean;
  interval: number;
  pauseOnHover: boolean;
  transitionDuration: number;
  showArrows: boolean;
  showDots: boolean;
  /** Arrow keys on desktop and a sideways swipe on phones change the photo; missing = on. */
  keysAndSwipe?: boolean;
  fullBleed: boolean;
  maxWidth: string;
  objectFit: "cover" | "contain";
  overlayOpacity: number;
};

type CarouselSlide = {
  id: string;
  type: "image" | "text" | "mixed";
  imageUrl: string;
  title: string;
  subtitle: string;
  bgColor: string;
  textColor: string;
  linkUrl?: string;
};

type StoriesIndexBlockProps = {
  volumeLabel: string;
  title: string;
  dek: string;
};

type FieldMapBlockProps = {
  mapStyle: MapStyle;
  height: string;
  showBrand: boolean;
  backgroundColor: string;
};

export type FieldMapBlockData = {
  regions: FieldMapRegion[];
  yearBounds: [number, number];
  filters: FieldMapFilter[];
  siteTitle?: string;
};

type CarouselProps = {
  sourceMode: "manual" | "gallery";
  gallerySlug: string;
  maxPhotos: number;
  slides: CarouselSlide[];
  slideTitleStyle: TextStyleValue;
  slideSubtitleStyle: TextStyleValue;
  slidesPerView: number;
  gap: number;
  aspectRatio: "none" | "16:9" | "3:2" | "4:3" | "1:1" | "3:4" | "2:3" | "9:16";
  height: string;
  transition: "slide" | "fade";
  transitionDuration: number;
  autoPlay: boolean;
  interval: number;
  pauseOnHover: boolean;
  showArrows: boolean;
  showDots: boolean;
  objectFit: "cover" | "contain";
  borderRadius: number;
  initialSlide: number;
  slideLinkOverrides: Record<string, string>;
};

/** Where a hand-picked collection goes instead of its own page. */
type GalleryLink = { url: string; newTab?: boolean };

/** The Index List's small cover; its width is the size, its height follows the shape. */
type ListCoverShape = "square" | "round" | "portrait" | "landscape";
const LIST_COVER_AR: Record<ListCoverShape, string> = { square: "1/1", round: "1/1", portrait: "4/5", landscape: "3/2" };

type GalleriesIndexProps = {
  sourceMode: "all" | "manual";
  selectedSlugs: string[];
  /** Hand-Picked only, by slug; a collection left out links as usual (collectionHref). */
  linkOverrides?: Record<string, GalleryLink>;
  maxItems: number;
  sortOrder: "manual" | "position" | "newest" | "oldest" | "title-asc" | "title-desc";
  layout: "grid" | "list";
  columns: "1" | "2" | "3" | "4" | "5" | "6";
  tabletColumns?: TabletColumns;
  phoneColumns?: PhoneColumns;
  gap: number;
  showCount: boolean;
  /** Follows the count on a cover: "04 photographs". */
  countLabel: string;
  /** A rule between a cover and its title, as on the design's collections index. */
  titleRule: boolean;
  dividerColor: string;
  // Index List gets its own title style — a row of titles wants different
  // settings from a caption under a cover.
  listTitleStyle: TextStyleValue;
  /** Index List: a small cover at the start or end of each row. Blocks saved before it have none. */
  listCover?: "none" | "left" | "right";
  listCoverShape?: ListCoverShape;
  listCoverSize?: number;
  listCoverSizePhone?: number;
  fullBleed: boolean;
  maxWidth: number;
  aspectRatio: GalleryAspect;
  borderRadius: number;
  imageHoverEffect: "none" | "zoom" | "lift" | "fade" | "darken";
  showTitle: boolean;
  showDescription: boolean;
  titlePosition: "below" | "overlay-bottom" | "overlay-top" | "overlay-center";
  textAlignment: "left" | "center" | "right";
  titleStyle: TextStyleValue;
  descriptionStyle: TextStyleValue;
  textPaddingX: number;
  textPaddingY: number;
  textGap: number;
  overlayBgColor: string;
  overlayOpacity: number;
  marginTop: number;
  marginBottom: number;
  transitionMs: number;
};

type LinkListItem = {
  id: string;
  label: string;
  description: string;
  /** Short trailing value pinned to the far edge of the row — a count, a year, a price. */
  meta: string;
  link: string;
  linkTarget: "_self" | "_blank";
  imageUrl: string;
  iconText: string;
};

type LinkListProps = {
  items: LinkListItem[];
  layout: "vertical-list" | "horizontal-pills" | "button-stack" | "card-grid";
  columns: "1" | "2" | "3" | "4";
  tabletColumns?: TabletColumns;
  phoneColumns?: PhoneColumns;
  gap: number;
  alignment: "left" | "center" | "right";
  itemAlignment: "left" | "center" | "right";
  showImage: boolean;
  showDescription: boolean;
  showIcon: boolean;
  imagePosition: "left" | "right" | "top";
  imageSize: number;
  imageAspectRatio: "square" | "4:3" | "3:2" | "16:9" | "natural";
  imageBorderRadius: number;
  iconGap: number;
  bgColor: string;
  bgOpacity: number;
  textColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
  labelStyle: TextStyleValue;
  underline: boolean;
  descriptionStyle: TextStyleValue;
  hoverBgColor: string;
  hoverTextColor: string;
  hoverBorderColor: string;
  hoverEffect: "none" | "lift" | "scale-up" | "underline" | "indent";
  shadow: "none" | "sm" | "md" | "lg";
  hoverShadow: "none" | "sm" | "md" | "lg";
  marginTop: number;
  marginBottom: number;
  transitionMs: number;
  dividers: boolean;
  dividerColor: string;
};

type ButtonProps = {
  label: string;
  iconText: string;
  iconPosition: "left" | "right";
  iconGap: number;
  link: string;
  linkTarget: "_self" | "_blank";
  ariaLabel: string;
  alignment: "left" | "center" | "right";
  widthMode: "auto" | "full" | "custom";
  customWidth: number;
  minWidth: number;
  bgColor: string;
  bgOpacity: number;
  textColor: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: "solid" | "dashed" | "dotted";
  borderRadius: number;
  paddingX: number;
  paddingY: number;
  marginTop: number;
  marginBottom: number;
  labelStyle: TextStyleValue;
  underline: boolean;
  hoverBgColor: string;
  hoverTextColor: string;
  hoverBorderColor: string;
  hoverEffect: "none" | "fade" | "lift" | "scale-up" | "scale-down";
  shadow: "none" | "sm" | "md" | "lg";
  hoverShadow: "none" | "sm" | "md" | "lg";
  transitionMs: number;
  /** Fixed height in px with the label centred; 0 lets the padding decide. */
  height: number;
};

export type Components = {
  RichText: RichTextProps;
  Hero: HeroProps;
  HeroSlideshow: HeroSlideshowProps;
  ImageBlock: ImageBlockProps;
  Spacer: SpacerProps;
  Container: ContainerProps;
  Columns: ColumnsProps;
  Rows: RowsProps;
  GalleryEmbed: GalleryEmbedProps;
  StoriesIndexBlock: StoriesIndexBlockProps;
  FieldMap: FieldMapBlockProps;
  Carousel: CarouselProps;
  GalleriesIndex: GalleriesIndexProps;
  LinkList: LinkListProps;
  Button: ButtonProps;
  Form: FormWrapperProps;
  TextField: TextFieldProps;
  TextArea: TextAreaProps;
  SelectField: SelectFieldProps;
  RadioGroup: RadioGroupProps;
  CheckboxGroup: CheckboxGroupProps;
  Checkbox: CheckboxProps;
  PageIntro: PageIntroProps;
  SectionHeader: SectionHeaderProps;
  Details: DetailsProps;
  PhotoPlate: PhotoPlateProps;
  SelectedWork: SelectedWorkProps;
  NextCollection: NextCollectionProps;
  Breadcrumb: BreadcrumbProps;
};

// ----- Puck config -----

// ----- Columns: stacking -----

// Written out in full so Tailwind finds every class. `order` applies only while
// stacked; side by side, the columns keep their places.
const STACK = {
  phone: { grid: "grid-cols-1 @min-[40rem]:grid-cols-[var(--col-template)]", order: "order-[var(--stack-order)] @min-[40rem]:order-none" },
  tablet: { grid: "grid-cols-1 @min-[48rem]:grid-cols-[var(--col-template)]", order: "order-[var(--stack-order)] @min-[48rem]:order-none" },
  never: { grid: "grid-cols-[var(--col-template)]", order: "" },
} as const;

function permutations(items: number[]): number[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((x, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [x, ...rest]));
}

/** Every order the columns could stack in, "Left first" style for two. */
function stackOrderOptions(count: 2 | 3) {
  const natural = { label: "As laid out", value: "" };
  if (count === 2) return [natural, { label: "Right column first", value: "2-1" }];
  return [
    natural,
    ...permutations([1, 2, 3])
      .slice(1)
      .map((order) => ({ label: order.join(" · "), value: order.join("-") })),
  ];
}

/** "2-1-3" → each column's place in the stack: [2, 1, 3]. Null for the natural order or a stale value. */
function stackPositions(order: string | undefined, count: number): number[] | null {
  const seq = (order ?? "").split("-").map(Number);
  if (seq.length !== count || new Set(seq).size !== count || seq.some((n) => !(n >= 1 && n <= count))) return null;
  return Array.from({ length: count }, (_, i) => seq.indexOf(i + 1) + 1);
}

export type PageRootProps = Required<PageLayout>;

export const puckConfig: Config<Components, PageRootProps> = {
  // Page settings: shown in the panel while no block is selected. Pages only;
  // the story editors leave them out (useEditorConfig).
  root: {
    fields: {
      width: {
        type: "custom",
        label: "Width",
        render: ({ value, onChange }) => (
          <SegmentedControl
            options={[
              { label: "Standard", value: "standard", title: "The site's page column (Look → Pages)" },
              { label: "Reading", value: "reading", title: "A narrow column, for text" },
              { label: "Full width", value: "full", title: "Edge to edge, no side margins (Full bleed)" },
            ]}
            value={value ?? "standard"}
            onChange={(v) => onChange(v as PageWidth)}
          />
        ),
      },
      sideMargins: {
        type: "custom",
        label: "Side margins",
        render: ({ value, onChange }) => (
          <SegmentedControl
            options={[
              { label: "Site", value: "site", title: "The site's margins (Look → Pages)" },
              { label: "Narrow", value: "narrow", title: "Half the site's margins" },
              { label: "None", value: "none" },
            ]}
            value={value ?? "site"}
            onChange={(v) => onChange(v as PageMargins)}
          />
        ),
      },
      spaceTop: {
        type: "custom",
        label: "Space above",
        render: ({ value, onChange }) => (
          <AutoSpacingControl value={value} onChange={onChange} autoTitle="The site's space under the header, or none when the page opens with a full-width photo" />
        ),
      },
      spaceBottom: {
        type: "custom",
        label: "Space below",
        render: ({ value, onChange }) => (
          <AutoSpacingControl value={value} onChange={onChange} autoTitle="The site's space above the footer" />
        ),
      },
      phoneSpace: { type: "radio", label: "On phones", options: [
        { label: "Same space", value: false },
        { label: "Their own", value: true },
      ]},
      spaceTopPhone: {
        type: "custom",
        label: "Space above on phones",
        render: ({ value, onChange }) => <AutoSpacingControl value={value} onChange={onChange} />,
      },
      spaceBottomPhone: {
        type: "custom",
        label: "Space below on phones",
        render: ({ value, onChange }) => <AutoSpacingControl value={value} onChange={onChange} />,
      },
      background: {
        type: "custom",
        label: "Background",
        render: ({ value, onChange }) => <ColorField value={value} onChange={onChange} emptyLabel="Site background" />,
      },
    },
    defaultProps: PAGE_LAYOUT_DEFAULTS,
    // The site draws its pages' frame itself (components/public/PageFrame); the
    // editor's preview gets the same one here.
    render: ({ children, puck, ...props }) =>
      puck?.isEditing ? (
        <EditorPageFrame layout={props} page={(puck.metadata as { page?: EditorPageInfo } | undefined)?.page}>
          {children}
        </EditorPageFrame>
      ) : (
        <>{children}</>
      ),
  },
  categories: {
    content: {
      components: [
        "RichText", "ImageBlock", "Button", "LinkList", "GalleryEmbed", "GalleriesIndex", "Carousel",
        ...(siteConfig.features.fieldMap ? (["FieldMap"] as const) : []),
      ],
    },
    layout: { components: ["Columns", "Rows", "Spacer", "Container"] },
    hero: { components: ["Hero", "HeroSlideshow"] },
    stories: { title: "Stories", components: ["StoriesIndexBlock"] },
    sections: { title: "Page sections", components: ["PageIntro", "SectionHeader", "Details", "PhotoPlate", "SelectedWork", "Breadcrumb", "NextCollection"] },
    forms: { components: ["Form", "TextField", "TextArea", "SelectField", "RadioGroup", "CheckboxGroup", "Checkbox"] },
    // With the Field Map switched off the block stays registered, so a page that already
    // holds one still loads, but it is kept out of the block list (uncategorised blocks
    // would otherwise land in "Other").
    ...(siteConfig.features.fieldMap ? {} : { fieldMap: { components: ["FieldMap" as const], visible: false } }),
  },
  components: {
    RichText: {
      label: "Rich Text",
      fields: {
        content: {
          type: "custom",
          render: ({ value, onChange }) => (
            <div className="puck-tiptap-field">
              <TiptapEditor
                content={value}
                onChange={onChange}
              />
            </div>
          ),
        },
      },
      defaultProps: {
        content: { type: "doc", content: [{ type: "paragraph" }] },
      },
      render: ({ content, puck }) => {
        if (puck?.isEditing) {
          return (
            <>
              <style>{RICH_TEXT_CSS}</style>
              <InlineRichText path="content" content={content} className="richtext-render mx-auto max-w-none" />
            </>
          );
        }
        const html = renderRichText(content);
        if (!html) return <></>;
        return (
          <>
            <style>{RICH_TEXT_CSS}</style>
            <div
              className="richtext-render mx-auto max-w-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </>
        );
      },
    },

    Hero: {
      label: "Hero Banner",
      fields: {
        imageUrl: {
          type: "custom",
          label: "Image",
          render: ({ value, onChange }) => (
            <ImagePicker value={value} onChange={onChange} />
          ),
        },
        title: { type: "textarea", label: "Title" },
        titleStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => (
            <TextStyleControl value={value} onChange={onChange} fallback="display" withColor={false} />
          ),
        },
        subtitle: { type: "textarea", label: "Subtitle" },
        subtitleStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => (
            <TextStyleControl value={value} onChange={onChange} fallback="lead" withColor={false} />
          ),
        },
        imageAlt: { type: "text", label: "Alt text" },
        height: {
          type: "select",
          label: "Height",
          options: [
            { label: "Small (300px)", value: "300px" },
            { label: "Medium (500px)", value: "500px" },
            { label: "Large (700px)", value: "700px" },
            { label: "Full Screen", value: "100vh" },
          ],
        },
        phoneHeight: {
          type: "select",
          label: "Height on phones",
          options: [
            { label: "Same as desktop", value: "" },
            { label: "Small (300px)", value: "300px" },
            { label: "Medium (500px)", value: "500px" },
            { label: "Large (700px)", value: "700px" },
            { label: "Most of the screen (70%)", value: "70vh" },
            { label: "Full Screen", value: "100vh" },
          ],
        },
        overlayOpacity: {
          type: "custom",
          label: "Darken",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={90} step={5} unit="%" />
          ),
        },
        overlayStyle: {
          type: "custom",
          label: "Spread",
          render: ({ value, onChange }) => (
            <SegmentedControl
              options={[
                { label: "Even", value: "even", title: "The same all over the photo" },
                { label: "Behind the text", value: "text", title: "A gradient from the side the text sits on" },
              ]}
              value={value ?? "even"}
              onChange={(v) => onChange(v as HeroProps["overlayStyle"])}
            />
          ),
        },
        textPosition: {
          type: "custom",
          label: "Text position",
          render: ({ value, onChange }) => (
            <PositionControl value={value} onChange={(v) => onChange((v || "center") as Position)} />
          ),
        },
        phoneTextPosition: {
          type: "custom",
          label: "On phones",
          render: ({ value, onChange }) => (
            <PositionControl value={value} onChange={onChange} inheritLabel="Same as desktop" />
          ),
        },
        textWidth: {
          type: "custom",
          label: "Text width",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={30} max={100} step={5} unit="%" />
          ),
        },
        focalX: {
          type: "custom",
          label: "Focal point (horizontal)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={1} unit="%" label="Horizontal" />
          ),
        },
        focalY: {
          type: "custom",
          label: "Focal point (vertical)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={1} unit="%" label="Vertical" />
          ),
        },
        phoneFocal: { type: "radio", label: "On phones", options: [
          { label: "Same focal point", value: false },
          { label: "Its own", value: true },
        ]},
        phoneFocalX: {
          type: "custom",
          label: "Phone focal point (horizontal)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={1} unit="%" />
          ),
        },
        phoneFocalY: {
          type: "custom",
          label: "Phone focal point (vertical)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={1} unit="%" />
          ),
        },
      },
      defaultProps: {
        imageUrl: "",
        imageAlt: "",
        title: "",
        titleStyle: { style: "display" },
        subtitle: "",
        subtitleStyle: { style: "lead" },
        height: "500px",
        phoneHeight: "",
        overlayOpacity: 40,
        overlayStyle: "even",
        textPosition: "center",
        phoneTextPosition: "",
        textWidth: 100,
        focalX: 50,
        focalY: 50,
        phoneFocal: false,
        phoneFocalX: 50,
        phoneFocalY: 50,
      },
      resolveData: ({ props }) => ({ props: migrateHero(props) }),
      render: (raw) => {
        const { imageUrl, imageAlt, title, titleStyle, subtitle, subtitleStyle, height, phoneHeight, overlayOpacity, overlayStyle, textPosition, phoneTextPosition, textWidth, focalX, focalY, phoneFocal, phoneFocalX, phoneFocalY } = migrateHero(raw);
        const isPriority = useImagePriority();
        const source = imageUrl ? optimizedSource(imageUrl, "100vw") : null;
        const desktop = heroPlacement(textPosition, overlayStyle, overlayOpacity);
        const phone = heroPlacement(phoneTextPosition || textPosition, overlayStyle, overlayOpacity);
        const vars = {
          "--hero-focal": `${focalX ?? 50}% ${focalY ?? 50}%`,
          "--hero-focal-phone": phoneFocal ? `${phoneFocalX}% ${phoneFocalY}%` : `${focalX ?? 50}% ${focalY ?? 50}%`,
          "--hero-justify": desktop.justify,
          "--hero-justify-phone": phone.justify,
          "--hero-align": desktop.align,
          "--hero-align-phone": phone.align,
          "--hero-text-align": desktop.textAlign,
          "--hero-text-align-phone": phone.textAlign,
          "--hero-shade": desktop.shade,
          "--hero-shade-phone": phone.shade,
          "--hero-text-width": `${textWidth}%`,
          "--hero-height": screenHeight(height),
          "--hero-height-phone": screenHeight(phoneHeight || height),
        } as React.CSSProperties;
        return (
          <div
            className="relative flex flex-col overflow-hidden bg-neutral-200 p-[clamp(1.5rem,5vw,4rem)] [min-height:var(--hero-height)] max-sm:[min-height:var(--hero-height-phone)] [justify-content:var(--hero-justify)] [align-items:var(--hero-align)] max-sm:[justify-content:var(--hero-justify-phone)] max-sm:[align-items:var(--hero-align-phone)]"
            style={vars}
          >
            {source && (
              <img
                src={source.src}
                srcSet={source.srcSet}
                sizes={source.sizes}
                alt={imageAlt ?? ""}
                className="absolute inset-0 h-full w-full object-cover [object-position:var(--hero-focal)] max-sm:[object-position:var(--hero-focal-phone)]"
                loading={isPriority ? "eager" : "lazy"}
                fetchPriority={isPriority ? "high" : undefined}
                decoding="async"
              />
            )}
            {source && overlayOpacity > 0 && (
              <div className="absolute inset-0 [background:var(--hero-shade)] max-sm:[background:var(--hero-shade-phone)]" />
            )}
            <div className="relative z-10 [text-align:var(--hero-text-align)] max-sm:[text-align:var(--hero-text-align-phone)] sm:[max-width:var(--hero-text-width)]">
              {title && (
                <h1 className="mb-4" style={{ ...textStyleCss(titleStyle, "display", { withColor: false }), color: "var(--theme-color-hero-overlay)", whiteSpace: "pre-line" }}>
                  <Editable path="title" value={title} multiline />
                </h1>
              )}
              {subtitle && (
                <p style={{ ...textStyleCss(subtitleStyle, "lead", { withColor: false }), color: "var(--theme-color-hero-overlay)", opacity: 0.9, whiteSpace: "pre-line" }}>
                  <Editable path="subtitle" value={subtitle} multiline />
                </p>
              )}
              {!imageUrl && !title && (
                <p className="text-neutral-400 italic">Set an image URL and title</p>
              )}
            </div>
          </div>
        );
      },
    },

    ImageBlock: {
      label: "Image",
      fields: {
        url: {
          type: "custom",
          label: "Image",
          render: ({ value, onChange }) => (
            <ImagePicker value={value} onChange={onChange} />
          ),
        },
        alt: { type: "text", label: "Alt text" },
        aspectRatio: {
          type: "select",
          label: "Aspect ratio",
          options: [
            { label: "Natural", value: "natural" },
            { label: "Square (1:1)", value: "square" },
            { label: "3:2", value: "3:2" },
            { label: "4:3", value: "4:3" },
            { label: "16:9", value: "16:9" },
          ],
        },
        width: {
          type: "custom",
          label: "Width",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={10} max={100} step={1} unit="%" label="Width" />
          ),
        },
        borderRadius: {
          type: "custom",
          label: "Corner radius",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={48} step={1} unit="px" label="Corner Radius" />
          ),
        },
        imageOpacity: {
          type: "custom",
          label: "Image opacity",
          render: ({ value, onChange }) => (
            <SliderField value={value ?? 100} onChange={onChange} min={0} max={100} step={5} unit="%" label="Image Opacity" />
          ),
        },
        caption: { type: "text", label: "Caption" },
        captionStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => (
            <TextStyleControl value={value} onChange={onChange} fallback="photoTitle" />
          ),
        },
        captionX: {
          type: "custom",
          label: "Horizontal",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={-20} max={120} step={1} unit="%" label="Horizontal Position" />
          ),
        },
        captionY: {
          type: "custom",
          label: "Vertical",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={-20} max={120} step={1} unit="%" label="Vertical Position" />
          ),
        },
        captionBgColor: {
          type: "custom",
          label: "Background",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        captionBgOpacity: {
          type: "custom",
          label: "Background opacity",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={5} unit="%" label="Background Opacity" />
          ),
        },
        linkUrl: {
          type: "custom",
          label: "Goes to",
          render: ({ value, onChange }) => (
            <LinkPicker value={value} onChange={onChange} />
          ),
        },
        linkTarget: {
          type: "select",
          label: "Opens in",
          options: [
            { label: "Same Tab", value: "_self" },
            { label: "New Tab", value: "_blank" },
          ],
        },
        focalX: {
          type: "custom",
          label: "Focal point (horizontal)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={1} unit="%" label="Horizontal" />
          ),
        },
        focalY: {
          type: "custom",
          label: "Focal point (vertical)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={1} unit="%" label="Vertical" />
          ),
        },
      },
      defaultProps: {
        url: "",
        alt: "",
        aspectRatio: "natural",
        caption: "",
        captionStyle: { style: "photoTitle" },
        width: 60,
        captionX: 50,
        captionY: 110,
        captionBgColor: "#000000",
        captionBgOpacity: 0,
        borderRadius: 4,
        imageOpacity: 100,
        linkUrl: "",
        linkTarget: "_self",
        focalX: 50,
        focalY: 50,
      },
      resolveData: ({ props }) => ({ props: migrateImageBlock(props) }),
      render: (raw) => {
        const { url, alt, aspectRatio, caption, captionStyle, width, captionX, captionY, captionBgColor, captionBgOpacity, borderRadius, imageOpacity, linkUrl, linkTarget, focalX, focalY } = migrateImageBlock(raw);
        const isPriority = useImagePriority();
        const isOverlay = captionY >= 0 && captionY <= 100;
        const arMap: Record<string, string> = { square: "1/1", "4:3": "4/3", "3:2": "3/2", "16:9": "16/9" };
        const arValue = arMap[aspectRatio];
        const focalPos = `${focalX ?? 50}% ${focalY ?? 50}%`;
        const captionBox: React.CSSProperties = {
          ...textStyleCss(captionStyle, "photoTitle"),
          position: "absolute",
          left: `${captionX}%`,
          top: `${captionY}%`,
          transform: "translate(-50%, -50%)",
          backgroundColor: captionBgOpacity > 0 ? withAlpha(captionBgColor, captionBgOpacity / 100) : "transparent",
          padding: captionBgOpacity > 0 ? "4px 10px" : undefined,
          borderRadius: captionBgOpacity > 0 ? "4px" : undefined,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 2,
        };

        const imageEl = url ? (
          arValue ? (
            <div className="relative overflow-hidden w-full" style={{ aspectRatio: arValue, borderRadius: `${borderRadius}px` }}>
              <img
                src={url}
                alt={alt}
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300"
                style={{ objectPosition: focalPos }}
                loading={isPriority ? "eager" : "lazy"}
                fetchPriority={isPriority ? "high" : undefined}
                ref={(el) => { if (el?.complete) el.classList.remove("opacity-0"); }}
                onLoad={(e) => { (e.target as HTMLImageElement).classList.remove("opacity-0"); }}
              />
            </div>
          ) : (
            <img
              src={url}
              alt={alt}
              className="w-full opacity-0 transition-opacity duration-300"
              style={{ borderRadius: `${borderRadius}px`, objectPosition: focalPos }}
              loading={isPriority ? "eager" : "lazy"}
              fetchPriority={isPriority ? "high" : undefined}
              ref={(el) => { if (el?.complete) el.classList.remove("opacity-0"); }}
              onLoad={(e) => { (e.target as HTMLImageElement).classList.remove("opacity-0"); }}
            />
          )
        ) : (
          <div className="flex h-48 items-center justify-center rounded bg-neutral-100 text-neutral-400">
            Set an image URL
          </div>
        );

        const wrapWithLink = (children: React.ReactNode) => {
          if (!linkUrl) return children;
          return (
            <a
              href={linkUrl}
              target={linkTarget}
              rel={linkTarget === "_blank" ? "noopener noreferrer" : undefined}
              className="block cursor-pointer"
            >
              {children}
            </a>
          );
        };

        return (
          <figure className="mx-auto" style={{ width: `${width}%` }}>
            {wrapWithLink(
              <div className="relative overflow-visible">
                {/* Opacity sits on a wrapper: the <img> animates its own opacity to fade in. */}
                {(imageOpacity ?? 100) < 100 ? (
                  <div style={{ opacity: (imageOpacity ?? 100) / 100 }}>{imageEl}</div>
                ) : (
                  imageEl
                )}
                {caption && (
                  <figcaption style={captionBox}>
                    <Editable path="caption" value={caption} />
                  </figcaption>
                )}
              </div>
            )}
          </figure>
        );
      },
    },

    GalleriesIndex: {
      label: `${siteConfig.labels.gallery} Index`,
      fields: {
        sourceMode: {
          type: "radio",
          label: "Source",
          options: [
            { label: "All Published", value: "all" },
            { label: "Hand-Picked", value: "manual" },
          ],
        },
        selectedSlugs: {
          type: "custom",
          label: `Pick ${siteConfig.labels.gallery}`,
          render: ({ value, onChange }) => (
            <GalleriesMultiSelect value={value} onChange={onChange} />
          ),
        },
        linkOverrides: {
          type: "custom",
          label: "Goes to",
          render: ({ value, onChange }) => <GalleryLinksEditor value={value} onChange={onChange} />,
        },
        sortOrder: {
          type: "select",
          label: "Sort order",
          options: [
            { label: "Manual / As Picked", value: "manual" },
            { label: "Admin Position", value: "position" },
            { label: "Newest First", value: "newest" },
            { label: "Oldest First", value: "oldest" },
            { label: "Title (A→Z)", value: "title-asc" },
            { label: "Title (Z→A)", value: "title-desc" },
          ],
        },
        maxItems: {
          type: "custom",
          label: "Max items (0 = all)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={48} step={1} unit="" label="Max Items" />
          ),
        },
        layout: {
          type: "select",
          label: "Layout",
          options: [
            { label: "Cover grid", value: "grid" },
            { label: "Index list", value: "list" },
          ],
        },
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "1", value: "1" },
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4", value: "4" },
            { label: "5", value: "5" },
            { label: "6", value: "6" },
          ],
        },
        tabletColumns: tabletColumnsField,
        phoneColumns: phoneColumnsField,
        showCount: {
          type: "radio",
          label: "Photo count",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        countLabel: { type: "text", label: "After the count", placeholder: "photographs" },
        titleRule: {
          type: "radio",
          label: "Rule above the title",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        dividerColor: {
          type: "custom",
          label: "Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        listTitleStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => (
            <TextStyleControl value={value} onChange={onChange} fallback="collectionTitle" />
          ),
        },
        listCover: {
          type: "radio",
          label: "Cover image",
          options: [
            { label: "None", value: "none" },
            { label: "Left", value: "left" },
            { label: "Right", value: "right" },
          ],
        },
        listCoverShape: {
          type: "select",
          label: "Shape",
          options: [
            { label: "Square", value: "square" },
            { label: "Round", value: "round" },
            { label: "Portrait (4:5)", value: "portrait" },
            { label: "Landscape (3:2)", value: "landscape" },
          ],
        },
        listCoverSize: {
          type: "custom",
          label: "Size",
          render: ({ value, onChange }) => (
            <SliderField value={value ?? 64} onChange={onChange} min={24} max={240} step={4} unit="px" label="Size" />
          ),
        },
        listCoverSizePhone: {
          type: "custom",
          label: "Size on phones",
          render: ({ value, onChange }) => (
            <SliderField value={value ?? 48} onChange={onChange} min={24} max={240} step={4} unit="px" label="Size on phones" />
          ),
        },
        gap: {
          type: "custom",
          label: "Gap",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={64} step={2} unit="px" label="Gap" />
          ),
        },
        fullBleed: {
          type: "radio",
          label: "Full bleed",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        maxWidth: {
          type: "custom",
          label: "Max width",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={30} max={100} step={1} unit="%" label="Max Width" />
          ),
        },
        aspectRatio: {
          type: "select",
          label: "Aspect ratio",
          options: GALLERY_ASPECT_OPTIONS,
        },
        borderRadius: {
          type: "custom",
          label: "Corner radius",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={48} step={1} unit="px" label="Corner Radius" />
          ),
        },
        imageHoverEffect: {
          type: "select",
          label: "Image effect",
          options: [
            { label: "None", value: "none" },
            { label: "Zoom", value: "zoom" },
            { label: "Lift", value: "lift" },
            { label: "Fade", value: "fade" },
            { label: "Darken", value: "darken" },
          ],
        },
        showTitle: {
          type: "radio",
          label: "Title",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        showDescription: {
          type: "radio",
          label: "Description",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        titlePosition: {
          type: "select",
          label: "Title position",
          options: [
            { label: "Below Image", value: "below" },
            { label: "Overlay — Bottom", value: "overlay-bottom" },
            { label: "Overlay — Top", value: "overlay-top" },
            { label: "Overlay — Center", value: "overlay-center" },
          ],
        },
        textAlignment: {
          type: "radio",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        titleStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => (
            <TextStyleControl value={value} onChange={onChange} fallback="collectionTitle" />
          ),
        },
        descriptionStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => (
            <TextStyleControl value={value} onChange={onChange} fallback="body" />
          ),
        },
        textPaddingX: {
          type: "custom",
          label: "Padding (horizontal)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={48} step={1} unit="px" label="Padding X" />
          ),
        },
        textPaddingY: {
          type: "custom",
          label: "Padding (vertical)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={48} step={1} unit="px" label="Padding Y" />
          ),
        },
        textGap: {
          type: "custom",
          label: "Space above description",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={32} step={1} unit="px" label="Gap" />
          ),
        },
        overlayBgColor: {
          type: "custom",
          label: "Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        overlayOpacity: {
          type: "custom",
          label: "Opacity",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={5} unit="%" label="Opacity" />
          ),
        },
        marginTop: {
          type: "custom",
          label: "Space above",
          render: ({ value, onChange }) => (
            <SpacingControl value={value} onChange={onChange} />
          ),
        },
        marginBottom: {
          type: "custom",
          label: "Space below",
          render: ({ value, onChange }) => (
            <SpacingControl value={value} onChange={onChange} />
          ),
        },
        transitionMs: {
          type: "custom",
          label: "Transition",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={800} step={10} unit="ms" label="Transition" />
          ),
        },
      },
      defaultProps: {
        sourceMode: "all",
        selectedSlugs: [],
        linkOverrides: {},
        maxItems: 0,
        sortOrder: "position",
        layout: "grid",
        columns: "3",
        gap: 16,
        showCount: true,
        countLabel: "photographs",
        titleRule: false,
        dividerColor: "#e5e5e5",
        listTitleStyle: { style: "collectionTitle", size: 20 },
        listCover: "none",
        listCoverShape: "square",
        listCoverSize: 64,
        listCoverSizePhone: 48,
        fullBleed: false,
        maxWidth: 100,
        aspectRatio: "4:5",
        borderRadius: 4,
        imageHoverEffect: "zoom",
        showTitle: true,
        showDescription: false,
        titlePosition: "below",
        textAlignment: "center",
        titleStyle: { style: "collectionTitle" },
        descriptionStyle: { style: "body" },
        textPaddingX: 8,
        textPaddingY: 12,
        textGap: 4,
        overlayBgColor: "#000000",
        overlayOpacity: 35,
        marginTop: 0,
        marginBottom: 0,
        transitionMs: 300,
      },
      resolveData: ({ props }) => ({ props: migrateGalleriesIndex(props) }),
      render: (props) => <GalleriesIndexRender {...migrateGalleriesIndex(props)} />,
    },

    LinkList: {
      label: "Link List",
      fields: {
        items: {
          type: "custom",
          label: "Items",
          render: ({ value, onChange }) => (
            <LinkListItemEditor value={value} onChange={onChange} />
          ),
        },
        layout: {
          type: "select",
          label: "Layout",
          options: [
            { label: "Vertical List", value: "vertical-list" },
            { label: "Horizontal Pills", value: "horizontal-pills" },
            { label: "Button Stack", value: "button-stack" },
            { label: "Card Grid", value: "card-grid" },
          ],
        },
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "1", value: "1" },
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4", value: "4" },
          ],
        },
        tabletColumns: tabletColumnsField,
        phoneColumns: phoneColumnsField,
        gap: {
          type: "custom",
          label: "Gap",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={64} step={1} unit="px" label="Gap" />
          ),
        },
        alignment: {
          type: "radio",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        itemAlignment: {
          type: "radio",
          label: "Text alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        showImage: {
          type: "radio",
          label: "Image",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        showDescription: {
          type: "radio",
          label: "Description",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        showIcon: {
          type: "radio",
          label: "Icon",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        imagePosition: {
          type: "select",
          label: "Position",
          options: [
            { label: "Left of text", value: "left" },
            { label: "Right of text", value: "right" },
            { label: "Above text", value: "top" },
          ],
        },
        imageSize: {
          type: "custom",
          label: "Size",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={24} max={400} step={4} unit="px" label="Image Size" />
          ),
        },
        imageAspectRatio: {
          type: "select",
          label: "Aspect ratio",
          options: [
            { label: "Square (1:1)", value: "square" },
            { label: "4:3", value: "4:3" },
            { label: "3:2", value: "3:2" },
            { label: "16:9", value: "16:9" },
            { label: "Natural", value: "natural" },
          ],
        },
        imageBorderRadius: {
          type: "custom",
          label: "Corner radius",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={200} step={1} unit="px" label="Image Radius" />
          ),
        },
        iconGap: {
          type: "custom",
          label: "Gap beside image or icon",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={32} step={1} unit="px" label="Icon Gap" />
          ),
        },
        bgColor: {
          type: "custom",
          label: "Background",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        bgOpacity: {
          type: "custom",
          label: "Background opacity",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={5} unit="%" label="Opacity" />
          ),
        },
        textColor: {
          type: "custom",
          label: "Text color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        borderColor: {
          type: "custom",
          label: "Border color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        borderWidth: {
          type: "custom",
          label: "Border width",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={6} step={1} unit="px" label="Border Width" />
          ),
        },
        borderRadius: {
          type: "custom",
          label: "Corner radius",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={1} unit="px" label="Corner Radius" />
          ),
        },
        paddingX: {
          type: "custom",
          label: "Horizontal",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={64} step={1} unit="px" label="Padding X" />
          ),
        },
        paddingY: {
          type: "custom",
          label: "Vertical",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={48} step={1} unit="px" label="Padding Y" />
          ),
        },
        labelStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => (
            <TextStyleControl value={value} onChange={onChange} fallback="body" withColor={false} />
          ),
        },
        underline: {
          type: "radio",
          label: "Underline",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        descriptionStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => (
            <TextStyleControl value={value} onChange={onChange} fallback="body" />
          ),
        },
        hoverBgColor: {
          type: "custom",
          label: "Hover background",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        hoverTextColor: {
          type: "custom",
          label: "Hover text",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        hoverBorderColor: {
          type: "custom",
          label: "Hover border",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        hoverEffect: {
          type: "select",
          label: "Effect",
          options: [
            { label: "None", value: "none" },
            { label: "Lift", value: "lift" },
            { label: "Scale Up", value: "scale-up" },
            { label: "Underline", value: "underline" },
            { label: "Indent (slide right)", value: "indent" },
          ],
        },
        shadow: {
          type: "select",
          label: "Shadow",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        hoverShadow: {
          type: "select",
          label: "Hover shadow",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        dividers: {
          type: "radio",
          label: "Between rows",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        dividerColor: {
          type: "custom",
          label: "Divider color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        marginTop: {
          type: "custom",
          label: "Space above",
          render: ({ value, onChange }) => (
            <SpacingControl value={value} onChange={onChange} />
          ),
        },
        marginBottom: {
          type: "custom",
          label: "Space below",
          render: ({ value, onChange }) => (
            <SpacingControl value={value} onChange={onChange} />
          ),
        },
        transitionMs: {
          type: "custom",
          label: "Transition",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={800} step={10} unit="ms" label="Transition" />
          ),
        },
      },
      defaultProps: {
        items: [],
        layout: "vertical-list",
        columns: "3",
        gap: 8,
        alignment: "center",
        itemAlignment: "left",
        showImage: false,
        showDescription: false,
        showIcon: false,
        imagePosition: "left",
        imageSize: 64,
        imageAspectRatio: "square",
        imageBorderRadius: 4,
        iconGap: 12,
        bgColor: "#ffffff",
        bgOpacity: 0,
        textColor: "#171717",
        borderColor: "#e5e5e5",
        borderWidth: 0,
        borderRadius: 4,
        paddingX: 16,
        paddingY: 12,
        labelStyle: { style: "body" },
        underline: false,
        descriptionStyle: { style: "body" },
        hoverBgColor: "#f5f5f5",
        hoverTextColor: "#171717",
        hoverBorderColor: "#d4d4d4",
        hoverEffect: "indent",
        shadow: "none",
        hoverShadow: "none",
        dividers: false,
        dividerColor: "#e5e5e5",
        marginTop: 0,
        marginBottom: 0,
        transitionMs: 200,
      },
      resolveData: ({ props }) => ({ props: migrateLinkList(props) }),
      render: (props) => <LinkListRender {...migrateLinkList(props)} />,
    },

    Button: {
      label: "Button",
      fields: {
        label: { type: "text", label: "Label" },
        link: {
          type: "custom",
          label: "Goes to",
          render: ({ value, onChange }) => (
            <LinkPicker value={value} onChange={onChange} />
          ),
        },
        linkTarget: {
          type: "select",
          label: "Opens in",
          options: [
            { label: "Same Tab", value: "_self" },
            { label: "New Tab", value: "_blank" },
          ],
        },
        ariaLabel: { type: "text", label: "Screen-reader label" },
        iconText: { type: "text", label: "Icon (text or emoji, e.g. → ↗ ★)" },
        iconPosition: {
          type: "radio",
          label: "Position",
          options: [
            { label: "Left", value: "left" },
            { label: "Right", value: "right" },
          ],
        },
        iconGap: {
          type: "custom",
          label: "Gap",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={32} step={1} unit="px" label="Icon Gap" />
          ),
        },
        alignment: {
          type: "radio",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        widthMode: {
          type: "select",
          label: "Width",
          options: [
            { label: "Auto (fits content)", value: "auto" },
            { label: "Full Width", value: "full" },
            { label: "Custom %", value: "custom" },
          ],
        },
        customWidth: {
          type: "custom",
          label: "Custom width",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={10} max={100} step={1} unit="%" label="Width" />
          ),
        },
        minWidth: {
          type: "custom",
          label: "Min width",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={400} step={4} unit="px" label="Min Width" />
          ),
        },
        height: {
          type: "custom",
          label: "Fixed height (0 = fits the label)",
          render: ({ value, onChange }) => (
            <SliderField value={value ?? 0} onChange={onChange} min={0} max={160} step={2} unit="px" label="Height" />
          ),
        },
        bgColor: {
          type: "custom",
          label: "Background",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        bgOpacity: {
          type: "custom",
          label: "Background opacity",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={5} unit="%" label="Opacity" />
          ),
        },
        textColor: {
          type: "custom",
          label: "Text color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        borderColor: {
          type: "custom",
          label: "Border color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        borderWidth: {
          type: "custom",
          label: "Border width",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={8} step={1} unit="px" label="Border Width" />
          ),
        },
        borderStyle: {
          type: "select",
          label: "Border style",
          options: [
            { label: "Solid", value: "solid" },
            { label: "Dashed", value: "dashed" },
            { label: "Dotted", value: "dotted" },
          ],
        },
        borderRadius: {
          type: "custom",
          label: "Corner radius",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={1} unit="px" label="Corner Radius" />
          ),
        },
        paddingX: {
          type: "custom",
          label: "Horizontal",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={80} step={1} unit="px" label="Horizontal Padding" />
          ),
        },
        paddingY: {
          type: "custom",
          label: "Vertical",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={60} step={1} unit="px" label="Vertical Padding" />
          ),
        },
        marginTop: {
          type: "custom",
          label: "Space above",
          render: ({ value, onChange }) => (
            <SpacingControl value={value} onChange={onChange} />
          ),
        },
        marginBottom: {
          type: "custom",
          label: "Space below",
          render: ({ value, onChange }) => (
            <SpacingControl value={value} onChange={onChange} />
          ),
        },
        labelStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => (
            <TextStyleControl value={value} onChange={onChange} fallback="label" withColor={false} />
          ),
        },
        underline: {
          type: "radio",
          label: "Underline",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        hoverBgColor: {
          type: "custom",
          label: "Hover background",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        hoverTextColor: {
          type: "custom",
          label: "Hover text",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        hoverBorderColor: {
          type: "custom",
          label: "Hover border",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        hoverEffect: {
          type: "select",
          label: "Effect",
          options: [
            { label: "None", value: "none" },
            { label: "Fade", value: "fade" },
            { label: "Lift", value: "lift" },
            { label: "Scale Up", value: "scale-up" },
            { label: "Scale Down (press)", value: "scale-down" },
          ],
        },
        shadow: {
          type: "select",
          label: "Shadow",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        hoverShadow: {
          type: "select",
          label: "Hover shadow",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        transitionMs: {
          type: "custom",
          label: "Transition",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={800} step={10} unit="ms" label="Transition" />
          ),
        },
      },
      defaultProps: {
        label: "Click me",
        link: "",
        linkTarget: "_self",
        ariaLabel: "",
        iconText: "",
        iconPosition: "right",
        iconGap: 8,
        alignment: "center",
        widthMode: "auto",
        customWidth: 50,
        minWidth: 0,
        bgColor: "#171717",
        bgOpacity: 100,
        textColor: "#ffffff",
        borderColor: "#171717",
        borderWidth: 1,
        borderStyle: "solid",
        borderRadius: 4,
        paddingX: 24,
        paddingY: 12,
        marginTop: 0,
        marginBottom: 0,
        labelStyle: { style: "label" },
        underline: false,
        hoverBgColor: "#404040",
        hoverTextColor: "#ffffff",
        hoverBorderColor: "#404040",
        hoverEffect: "lift",
        shadow: "none",
        hoverShadow: "md",
        transitionMs: 200,
        height: 0,
      },
      // Blocks saved before text styles: convert the old font settings.
      resolveData: ({ props }) => ({ props: migrateButton(props) }),
      render: (props) => <ButtonRender {...migrateButton(props)} />,
    },

    Spacer: {
      label: "Spacer / Rule",
      fields: {
        unit: {
          type: "radio",
          label: "Unit",
          options: [
            { label: "px", value: "px" },
            { label: "% of viewport", value: "%" },
          ],
        },
        height: { type: "number", label: "Height", min: 0, max: 1000 },
        line: {
          type: "radio",
          label: "Draw a rule",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        lineWidth: {
          type: "custom",
          label: "Thickness",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={1} max={8} step={1} unit="px" label="Thickness" />
          ),
        },
        lineLength: {
          type: "custom",
          label: "Length",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={10} max={100} step={5} unit="%" label="Width" />
          ),
        },
        lineAlign: {
          type: "radio",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        lineColor: {
          type: "custom",
          label: "Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} emptyLabel="Theme hairline" />
          ),
        },
      },
      defaultProps: {
        height: 48,
        unit: "px",
        line: false,
        lineWidth: 1,
        lineLength: 100,
        lineAlign: "center",
        lineColor: "",
      },
      render: ({ height, unit, line, lineWidth, lineLength, lineAlign, lineColor }) => (
        <div
          style={{
            height: unit === "%" ? `${height}vh` : `${height}px`,
            display: "flex",
            alignItems: "center",
            justifyContent:
              lineAlign === "left" ? "flex-start" : lineAlign === "right" ? "flex-end" : "center",
          }}
          className="w-full"
        >
          {line && (
            <div
              style={{
                width: `${lineLength ?? 100}%`,
                borderTop: `${lineWidth ?? 1}px solid ${cssColor(lineColor, "var(--theme-color-rule, #e5e5e5)")}`,
              }}
            />
          )}
        </div>
      ),
    },

    Container: {
      label: "Container",
      fields: {
        bgColor: {
          type: "custom",
          label: "Background",
          render: ({ value, onChange }) => <ColorField value={value} onChange={onChange} />,
        },
        bgOpacity: {
          type: "custom",
          label: "Background opacity",
          render: ({ value, onChange }) => (
            <SliderField value={value ?? 0} onChange={onChange} min={0} max={100} step={5} unit="%" label="Background Opacity" />
          ),
        },
        textColor: {
          type: "custom",
          label: "Text color",
          render: ({ value, onChange }) => <ColorField value={value} onChange={onChange} emptyLabel="Inherit" />,
        },
        borderWidth: {
          type: "custom",
          label: "Border width",
          render: ({ value, onChange }) => (
            <SliderField value={value ?? 0} onChange={onChange} min={0} max={8} step={1} unit="px" label="Border Width" />
          ),
        },
        borderColor: {
          type: "custom",
          label: "Border color",
          render: ({ value, onChange }) => <ColorField value={value} onChange={onChange} />,
        },
        borderRadius: {
          type: "custom",
          label: "Corner radius",
          render: ({ value, onChange }) => (
            <SliderField value={value ?? 0} onChange={onChange} min={0} max={48} step={1} unit="px" label="Corner Radius" />
          ),
        },
        placement: {
          type: "radio",
          label: "Placement",
          options: [
            { label: "In the flow", value: "flow" },
            { label: "Floating", value: "floating" },
          ],
        },
        floatX: {
          type: "custom",
          label: "Across (% of the parent's width)",
          render: ({ value, onChange }) => (
            <SliderField value={value ?? 50} onChange={onChange} min={-100} max={200} step={1} unit="%" label="Across" />
          ),
        },
        floatAnchor: {
          type: "radio",
          label: "Edge at that point",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        floatY: { type: "number", label: "Down (px, negative moves up)", min: -2000, max: 2000 },
        floatWidth: {
          type: "custom",
          label: "Width (% of the parent)",
          render: ({ value, onChange }) => (
            <SliderField value={value ?? 50} onChange={onChange} min={5} max={200} step={1} unit="%" label="Width" />
          ),
        },
        floatReserve: { type: "number", label: "Space kept open below (px, 0 = none)", min: 0, max: 2000 },
        floatZ: { type: "number", label: "Stacking order (higher sits on top)", min: -10, max: 100 },
        floatMobile: {
          type: "radio",
          label: "On phones",
          options: [
            { label: "Stack in place", value: "stack" },
            { label: "Keep floating", value: "float" },
          ],
        },
        contentMaxWidth: {
          type: "custom",
          label: "Content width (% of the container)",
          render: ({ value, onChange }) => (
            <SliderField value={value ?? 100} onChange={onChange} min={20} max={100} step={5} unit="%" label="Content Width" />
          ),
        },
        fullBleed: {
          type: "radio",
          label: "Background edge to edge",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        paddingTop: { type: "number", label: "Top padding", min: 0, max: 300 },
        paddingBottom: { type: "number", label: "Bottom padding", min: 0, max: 300 },
        paddingLeft: { type: "number", label: "Left padding", min: 0, max: 300 },
        paddingRight: { type: "number", label: "Right padding", min: 0, max: 300 },
        marginTop: {
          type: "custom",
          label: "Space above",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
        marginBottom: {
          type: "custom",
          label: "Space below",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
      },
      defaultProps: {
        paddingLeft: 0,
        paddingRight: 0,
        paddingTop: 0,
        paddingBottom: 0,
        marginTop: 0,
        marginBottom: 0,
        bgColor: "#f5f5f5",
        bgOpacity: 0,
        textColor: "",
        borderWidth: 0,
        borderColor: "#d4d4d4",
        borderRadius: 0,
        contentMaxWidth: 100,
        fullBleed: false,
        placement: "flow",
        floatX: 50,
        floatAnchor: "center",
        floatY: 0,
        floatWidth: 50,
        floatReserve: 0,
        floatZ: 10,
        floatMobile: "stack",
      },
      render: ({ puck, ...props }) => <ContainerRender {...props} isEditing={!!puck?.isEditing} />,
    },

    Rows: {
      label: "Rows",
      fields: {
        gap: {
          type: "custom",
          label: "Space between rows",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
        align: {
          type: "radio",
          label: "Line up",
          options: [
            { label: "Full width", value: "stretch" },
            { label: "Left", value: "start" },
            { label: "Center", value: "center" },
            { label: "Right", value: "end" },
          ],
        },
      },
      defaultProps: { gap: 24, align: "stretch" },
      // Blocks stacked with a set gap between them — the vertical partner to
      // Columns. A block's own space above/below still adds to the gap.
      render: ({ gap, align }) => (
        <DropZone
          zone="rows"
          className={`flex flex-col ${ROWS_ALIGN[align ?? "stretch"]}`}
          style={{ gap: gap ?? 24 }}
        />
      ),
    },

    Columns: {
      label: "Columns",
      fields: {
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "2 Columns", value: "2" },
            { label: "3 Columns", value: "3" },
          ],
        },
        distribution: {
          type: "select",
          label: "Widths",
          options: [],
        },
        gap: {
          type: "select",
          label: "Gap",
          options: [
            { label: "Small", value: "gap-4" },
            { label: "Medium", value: "gap-8" },
            { label: "Large", value: "gap-12" },
          ],
        },
        stackBelow: {
          type: "radio",
          label: "Stack into one column",
          options: [
            { label: "On phones", value: "phone" },
            { label: "Phones & tablets", value: "tablet" },
            { label: "Never", value: "never" },
          ],
        },
        stackOrder: {
          type: "select",
          label: "Stacked order",
          options: [],
        },
        align: {
          type: "radio",
          label: "Line up",
          options: [
            { label: "Top", value: "start" },
            { label: "Middle", value: "center" },
            { label: "Bottom", value: "end" },
            { label: "Stretch", value: "stretch" },
          ],
        },
      },
      resolveFields: (data, { fields }) => {
        const twoColOptions = [
          { label: "Equal", value: "equal" },
          { label: "1/3 + 2/3", value: "1-2" },
          { label: "2/3 + 1/3", value: "2-1" },
          { label: "1/4 + 3/4", value: "1-3" },
          { label: "3/4 + 1/4", value: "3-1" },
        ];
        const threeColOptions = [
          { label: "Equal", value: "equal" },
          { label: "1/4 + 1/2 + 1/4", value: "1-2-1" },
          { label: "1/2 + 1/4 + 1/4", value: "2-1-1" },
          { label: "1/4 + 1/4 + 1/2", value: "1-1-2" },
        ];
        return {
          ...fields,
          distribution: {
            type: "select" as const,
            label: "Widths",
            options: data.props.columns === "3" ? threeColOptions : twoColOptions,
          },
          stackOrder: {
            type: "select" as const,
            label: "Stacked order",
            options: stackOrderOptions(data.props.columns === "3" ? 3 : 2),
          },
        };
      },
      defaultProps: { columns: "2", distribution: "equal", gap: "gap-8", align: "stretch", stackBelow: "phone", stackOrder: "" },
      render: ({ columns, distribution, gap, align, stackBelow, stackOrder }) => {
        const colCount = columns === "3" ? 3 : 2;

        // Filter distribution options based on column count
        const dist = colCount === 2 && ["1-2-1", "2-1-1", "1-1-2"].includes(distribution)
          ? "equal"
          : colCount === 3 && ["1-2", "2-1", "1-3", "3-1"].includes(distribution)
            ? "equal"
            : distribution;

        const gridTemplates: Record<string, string> = {
          // 2 columns
          "2-equal": "1fr 1fr",
          "2-1-2": "1fr 2fr",
          "2-2-1": "2fr 1fr",
          "2-1-3": "1fr 3fr",
          "2-3-1": "3fr 1fr",
          // 3 columns
          "3-equal": "1fr 1fr 1fr",
          "3-1-2-1": "1fr 2fr 1fr",
          "3-2-1-1": "2fr 1fr 1fr",
          "3-1-1-2": "1fr 1fr 2fr",
        };

        const templateKey = `${colCount}-${dist}`;
        const gridTemplate = gridTemplates[templateKey] || (colCount === 3 ? "1fr 1fr 1fr" : "1fr 1fr");

        // Side by side once the block itself is wide enough (640px, or 768px when
        // tablets stack too), stacked below that. Measuring the block rather than
        // the screen keeps the columns in the editor whatever its preview width,
        // and on the site within any container.
        const stack = STACK[stackBelow ?? "phone"];
        const order = stackPositions(stackOrder, colCount);
        return (
          <div className="@container">
            <div
              className={`puck-columns grid ${stack.grid} ${gap} ${COLUMN_ALIGN[align ?? "stretch"]}`}
              style={{ "--col-template": gridTemplate } as React.CSSProperties}
            >
              {Array.from({ length: colCount }).map((_, i) => (
                <DropZone
                  key={i}
                  zone={`column-${i}`}
                  className={order ? `min-w-0 ${stack.order}` : "min-w-0"}
                  style={order ? ({ "--stack-order": order[i] } as React.CSSProperties) : undefined}
                />
              ))}
            </div>
          </div>
        );
      },
    },

    HeroSlideshow: {
      label: "Hero Slideshow",
      fields: {
        gallerySlug: {
          type: "custom",
          label: siteConfig.labels.gallery,
          render: ({ value, onChange }) => (
            <GalleryPicker value={value} onChange={onChange} />
          ),
        },
        maxPhotos: { type: "number", label: `Max ${siteConfig.labels.photos.toLowerCase()}`, min: 1, max: 20 },
        order: {
          type: "custom",
          label: "Order",
          render: ({ value, onChange }) => (
            <SegmentedControl
              options={[
                { label: "As in gallery", value: "gallery" },
                { label: "Random first", value: "random-start", title: "A different photo first on each visit, then on in the gallery's order" },
                { label: "Shuffled", value: "shuffle", title: "A new order on each visit" },
              ]}
              value={value ?? "gallery"}
              onChange={(v) => onChange(v as NonNullable<HeroSlideshowProps["order"]>)}
            />
          ),
        },
        height: {
          type: "select",
          label: "Height",
          options: [
            { label: "Full Screen (100dvh)", value: "100dvh" },
            { label: "90%", value: "90dvh" },
            { label: "80%", value: "80dvh" },
            { label: "70%", value: "70dvh" },
            { label: "60%", value: "60dvh" },
            { label: "700px", value: "700px" },
            { label: "500px", value: "500px" },
            { label: "400px", value: "400px" },
            { label: "300px", value: "300px" },
          ],
        },
        phoneHeight: {
          type: "select",
          label: "On phones",
          options: [
            { label: "Same as desktop", value: "" },
            { label: "Full Screen (100dvh)", value: "100dvh" },
            { label: "80%", value: "80dvh" },
            { label: "70%", value: "70dvh" },
            { label: "60%", value: "60dvh" },
            { label: "Shape 4:5 (tall)", value: "4:5" },
            { label: "Shape 1:1 (square)", value: "1:1" },
            { label: "Shape 3:2 (the whole photo)", value: "3:2" },
            { label: "500px", value: "500px" },
            { label: "400px", value: "400px" },
          ],
        },
        aspectRatio: {
          type: "select",
          label: "Aspect ratio",
          options: [
            { label: "None (use height only)", value: "none" },
            { label: "16:9", value: "16:9" },
            { label: "3:2", value: "3:2" },
            { label: "4:3", value: "4:3" },
            { label: "1:1 (square)", value: "1:1" },
          ],
        },
        fullBleed: {
          type: "radio",
          label: "Full bleed",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        maxWidth: {
          type: "select",
          label: "Max width",
          options: [
            { label: "100%", value: "100%" },
            { label: "90%", value: "90%" },
            { label: "80%", value: "80%" },
            { label: "70%", value: "70%" },
            { label: "60%", value: "60%" },
            { label: "50%", value: "50%" },
          ],
        },
        objectFit: {
          type: "select",
          label: "Image fit",
          options: [
            { label: "Cover (fill & crop)", value: "cover" },
            { label: "Contain (letterbox)", value: "contain" },
          ],
        },
        overlayOpacity: {
          type: "custom",
          label: "Dark overlay",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={80} step={5} unit="%" label="Overlay Opacity" />
          ),
        },
        autoPlay: {
          type: "radio",
          label: "Autoplay",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        interval: {
          type: "custom",
          label: "Interval (seconds)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={1} max={15} step={1} unit="s" label="Interval" />
          ),
        },
        pauseOnHover: {
          type: "radio",
          label: "Pause on hover",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        transitionDuration: {
          type: "custom",
          label: "Fade speed",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={100} max={2000} step={100} unit="ms" label="Fade Duration" />
          ),
        },
        showArrows: {
          type: "radio",
          label: "Arrows",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        showDots: {
          type: "radio",
          label: "Dots",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        keysAndSwipe: {
          type: "custom",
          label: "Arrow keys & swipe",
          render: ({ value, onChange }) => (
            <SegmentedControl
              options={[
                { label: "Yes", value: true, title: "Arrow keys change the photo while the slideshow is on screen; on phones, swipe sideways" },
                { label: "No", value: false },
              ]}
              value={value ?? true}
              onChange={(v) => onChange(v as boolean)}
            />
          ),
        },
      },
      defaultProps: {
        gallerySlug: "",
        maxPhotos: 5,
        order: "gallery",
        height: "100dvh",
        phoneHeight: "",
        aspectRatio: "none",
        autoPlay: true,
        interval: 5,
        pauseOnHover: true,
        transitionDuration: 1000,
        showArrows: true,
        showDots: true,
        keysAndSwipe: true,
        fullBleed: true,
        maxWidth: "100%",
        objectFit: "cover",
        overlayOpacity: 0,
      },
      render: ({ id, gallerySlug, maxPhotos, order, height, phoneHeight, aspectRatio, autoPlay, interval, pauseOnHover, transitionDuration, showArrows, showDots, keysAndSwipe, fullBleed, maxWidth, objectFit, overlayOpacity, puck }) => {
        if (!gallerySlug) {
          return (
            <div className="rounded border-2 border-dashed border-neutral-300 p-8 text-center text-neutral-400">
              Select a gallery to use as slideshow
            </div>
          );
        }
        const metadata = (puck?.metadata ?? {}) as { galleryPhotos?: Record<string, EmbedPhoto[]>; seed?: number };
        return (
          <HeroSlideshowClient
            slug={gallerySlug}
            maxPhotos={maxPhotos}
            serverPhotos={metadata.galleryPhotos?.[gallerySlug]}
            order={order ?? "gallery"}
            seed={metadata.seed}
            blockId={id}
            height={height}
            phoneHeight={phoneHeight ?? ""}
            aspectRatio={aspectRatio}
            autoPlay={autoPlay}
            interval={interval}
            pauseOnHover={pauseOnHover}
            transitionDuration={transitionDuration}
            showArrows={showArrows}
            showDots={showDots}
            keysAndSwipe={keysAndSwipe ?? true}
            editing={!!puck?.isEditing}
            fullBleed={fullBleed}
            maxWidth={maxWidth}
            objectFit={objectFit}
            overlayOpacity={overlayOpacity}
          />
        );
      },
    },

    Carousel: {
      label: "Carousel",
      fields: {
        sourceMode: {
          type: "radio",
          label: "Source",
          options: [
            { label: "Manual slides", value: "manual" },
            { label: `From ${siteConfig.labels.gallery.toLowerCase()}`, value: "gallery" },
          ],
        },
        gallerySlug: {
          type: "custom",
          label: siteConfig.labels.gallery,
          render: ({ value, onChange }) => (
            <GalleryPicker value={value} onChange={onChange} />
          ),
        },
        maxPhotos: {
          type: "custom",
          label: "Max photos",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={1} max={50} step={1} unit="" label="Max Photos" />
          ),
        },
        slides: {
          type: "custom",
          label: "Slides",
          render: ({ value, onChange }) => (
            <CarouselSlideEditor value={value} onChange={onChange} />
          ),
        },
        slideTitleStyle: {
          type: "custom",
          label: "Title",
          render: ({ value, onChange }) => (
            <TextStyleControl value={value} onChange={onChange} fallback="collectionTitle" withColor={false} />
          ),
        },
        slideSubtitleStyle: {
          type: "custom",
          label: "Subtitle",
          render: ({ value, onChange }) => (
            <TextStyleControl value={value} onChange={onChange} fallback="body" withColor={false} />
          ),
        },
        slidesPerView: {
          type: "custom",
          label: "Slides per view",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={1} max={5} step={1} unit="" label="Slides Per View" />
          ),
        },
        gap: {
          type: "custom",
          label: "Gap",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={64} step={2} unit="px" label="Gap" />
          ),
        },
        aspectRatio: {
          type: "select",
          label: "Aspect ratio",
          options: [
            { label: "None (use height)", value: "none" },
            { label: "16:9 (landscape)", value: "16:9" },
            { label: "3:2 (landscape)", value: "3:2" },
            { label: "4:3 (landscape)", value: "4:3" },
            { label: "1:1 (square)", value: "1:1" },
            { label: "3:4 (portrait)", value: "3:4" },
            { label: "2:3 (portrait)", value: "2:3" },
            { label: "9:16 (portrait)", value: "9:16" },
          ],
        },
        height: {
          type: "select",
          label: "Height",
          options: [
            { label: "200px", value: "200px" },
            { label: "300px", value: "300px" },
            { label: "400px", value: "400px" },
            { label: "500px", value: "500px" },
            { label: "30% of viewport", value: "30vh" },
            { label: "50% of viewport", value: "50vh" },
            { label: "70% of viewport", value: "70vh" },
            { label: "90% of viewport", value: "90vh" },
          ],
        },
        transition: {
          type: "select",
          label: "Transition",
          options: [
            { label: "Slide", value: "slide" },
            { label: "Fade (single slide only)", value: "fade" },
          ],
        },
        transitionDuration: {
          type: "custom",
          label: "Transition speed",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={100} max={2000} step={100} unit="ms" label="Duration" />
          ),
        },
        objectFit: {
          type: "select",
          label: "Image fit",
          options: [
            { label: "Cover (fill & crop)", value: "cover" },
            { label: "Contain (letterbox)", value: "contain" },
          ],
        },
        borderRadius: {
          type: "custom",
          label: "Corner radius",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={48} step={1} unit="px" label="Corner Radius" />
          ),
        },
        autoPlay: {
          type: "radio",
          label: "Autoplay",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        interval: {
          type: "custom",
          label: "Interval (seconds)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={1} max={15} step={1} unit="s" label="Interval" />
          ),
        },
        pauseOnHover: {
          type: "radio",
          label: "Pause on hover",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        showArrows: {
          type: "radio",
          label: "Arrows",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        showDots: {
          type: "radio",
          label: "Dots",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        initialSlide: {
          type: "custom",
          label: "Start on slide",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={1} max={50} step={1} unit="" label="Initial Slide" />
          ),
        },
        slideLinkOverrides: {
          type: "custom",
          label: "Per-photo links",
          render: ({ value, onChange }) => (
            <CarouselGalleryLinkOverridesEditor value={value} onChange={onChange} />
          ),
        },
      },
      defaultProps: {
        sourceMode: "manual",
        gallerySlug: "",
        maxPhotos: 12,
        slides: [],
        slideTitleStyle: { style: "collectionTitle" },
        slideSubtitleStyle: { style: "body" },
        slidesPerView: 3,
        gap: 16,
        aspectRatio: "4:3",
        height: "300px",
        transition: "slide",
        transitionDuration: 500,
        autoPlay: false,
        interval: 5,
        pauseOnHover: true,
        showArrows: true,
        showDots: true,
        objectFit: "cover",
        borderRadius: 8,
        initialSlide: 1,
        slideLinkOverrides: {},
      },
      render: ({ puck, ...props }) => {
        if (props.sourceMode === "gallery") {
          if (!props.gallerySlug) {
            return (
              <div className="rounded border-2 border-dashed border-neutral-300 p-8 text-center text-neutral-400">
                Select a {siteConfig.labels.gallery.toLowerCase()} to use as the carousel source
              </div>
            );
          }
          const serverPhotos = (puck?.metadata as Record<string, unknown>)?.galleryPhotos as
            | Record<string, EmbedPhoto[]>
            | undefined;
          return (
            <CarouselGallerySource
              slug={props.gallerySlug}
              maxPhotos={props.maxPhotos}
              serverPhotos={serverPhotos?.[props.gallerySlug]}
              carouselProps={props}
            />
          );
        }
        return <CarouselClient {...props} />;
      },
    },

    GalleryEmbed: {
      label: `${siteConfig.labels.gallery} Embed`,
      fields: {
        gallerySlug: {
          type: "custom",
          label: siteConfig.labels.gallery,
          render: ({ value, onChange }) => (
            <GalleryPicker value={value} onChange={onChange} />
          ),
        },
        maxPhotos: { type: "number", label: `Max ${siteConfig.labels.photos.toLowerCase()}`, min: 1, max: 50 },
        layout: {
          type: "select",
          label: "Layout",
          options: [
            { label: "Grid", value: "grid" },
            { label: "Masonry", value: "masonry" },
            { label: "Hang (staggered pair)", value: "hang" },
          ],
        },
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "2 Columns", value: "2" },
            { label: "3 Columns", value: "3" },
            { label: "4 Columns", value: "4" },
          ],
        },
        tabletColumns: tabletColumnsField,
        phoneColumns: phoneColumnsField,
        aspectRatio: {
          type: "select",
          label: "Aspect ratio",
          options: GALLERY_ASPECT_OPTIONS,
        },
        gap: {
          type: "custom",
          label: "Gap",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={64} step={1} unit="px" label="Gap" />
          ),
        },
        imageMaxWidth: {
          type: "custom",
          label: "Max photo width",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={100} max={800} step={10} unit="px" label="Max Width" />
          ),
        },
        borderRadius: {
          type: "custom",
          label: "Corner radius",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={48} step={1} unit="px" label="Corner Radius" />
          ),
        },
        showMetadata: {
          type: "radio",
          label: "Show",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        metadataFields: {
          type: "custom",
          label: "Details to show",
          render: ({ value, onChange }) => (
            <MetadataFieldsPicker value={value} onChange={onChange} />
          ),
        },
        numbered: {
          type: "radio",
          label: "Number the photos",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        hangOffset: {
          type: "custom",
          label: "Right column drops by",
          render: ({ value, onChange }) => <SliderField value={value ?? 140} onChange={onChange} min={0} max={400} step={4} unit="px" />,
        },
        hangGap: {
          type: "custom",
          label: "Space between photos",
          render: ({ value, onChange }) => <SliderField value={value ?? 76} onChange={onChange} min={0} max={160} step={2} unit="px" />,
        },
        captionTitleStyle: {
          type: "custom",
          label: "Title",
          render: ({ value, onChange }) => (
            <TextStyleControl value={value} onChange={onChange} fallback="photoTitle" />
          ),
        },
        captionMetaStyle: {
          type: "custom",
          label: "Details",
          render: ({ value, onChange }) => (
            <TextStyleControl value={value} onChange={onChange} fallback="meta" />
          ),
        },
        useGlobalLightbox: {
          type: "radio",
          label: "Settings",
          options: [
            { label: "Site defaults", value: true },
            { label: "Custom", value: false },
          ],
        },
        lightboxMetadataFields: {
          type: "custom",
          label: "Details to show",
          render: ({ value, onChange }) => (
            <MetadataFieldsPicker value={value ?? ["title", "location"]} onChange={onChange} />
          ),
        },
        lightboxCornerRadius: {
          type: "custom",
          label: "Corner radius",
          render: ({ value, onChange }) => (
            <SliderField value={value ?? 0} onChange={onChange} min={0} max={48} step={1} unit="px" label="Corner Radius" />
          ),
        },
        lightboxCaptionPosition: {
          type: "select",
          label: "Caption position",
          options: [
            { label: "Below image", value: "below" },
            { label: "Overlay — top", value: "overlay-top" },
            { label: "Overlay — bottom", value: "overlay-bottom" },
          ],
        },
        lightboxFadeSpeed: {
          type: "select",
          label: "Fade speed",
          options: [
            { label: "None (instant)", value: "none" },
            { label: "Fast (150ms)", value: "fast" },
            { label: "Medium (300ms)", value: "medium" },
            { label: "Slow (500ms)", value: "slow" },
          ],
        },
        lightboxCaptionAlignment: {
          type: "select",
          label: "Caption alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
      },
      defaultProps: {
        gallerySlug: "",
        maxPhotos: 12,
        layout: "grid",
        columns: "3",
        aspectRatio: "4:5",
        gap: 8,
        imageMaxWidth: 800,
        borderRadius: 8,
        showMetadata: false,
        metadataFields: ["title"],
        numbered: true,
        hangOffset: 140,
        hangGap: 76,
        captionTitleStyle: { style: "photoTitle" },
        captionMetaStyle: { style: "meta" },
        useGlobalLightbox: true,
        lightboxMetadataFields: ["title", "location"],
        lightboxCornerRadius: 0,
        lightboxCaptionPosition: "below",
        lightboxFadeSpeed: "medium",
        lightboxCaptionAlignment: "left",
      },
      render: ({ gallerySlug, maxPhotos, layout, columns, tabletColumns, phoneColumns, aspectRatio, gap, imageMaxWidth, borderRadius, showMetadata, metadataFields, numbered, hangOffset, hangGap, captionTitleStyle, captionMetaStyle, useGlobalLightbox, lightboxMetadataFields, lightboxCornerRadius, lightboxCaptionPosition, lightboxFadeSpeed, lightboxCaptionAlignment, puck }) => {
        if (!gallerySlug) {
          return (
            <div className="rounded border-2 border-dashed border-neutral-300 p-8 text-center text-neutral-400">
              Select a gallery to embed
            </div>
          );
        }
        const serverPhotos = (puck?.metadata as Record<string, unknown>)?.galleryPhotos as Record<string, EmbedPhoto[]> | undefined;
        return (
          <GalleryEmbedRenderer
            slug={gallerySlug}
            max={maxPhotos}
            layout={layout}
            columns={columns}
            tabletColumns={tabletColumns}
            phoneColumns={phoneColumns}
            aspectRatio={aspectRatio}
            gap={gap}
            imageMaxWidth={imageMaxWidth}
            borderRadius={borderRadius}
            showMetadata={showMetadata}
            metadataFields={metadataFields}
            numbered={numbered ?? true}
            hangOffset={hangOffset ?? 140}
            hangGap={hangGap ?? 76}
            captionTitleStyle={captionTitleStyle}
            captionMetaStyle={captionMetaStyle}
            useGlobalLightbox={useGlobalLightbox}
            lightboxMetadataFields={lightboxMetadataFields}
            lightboxCornerRadius={lightboxCornerRadius}
            lightboxCaptionPosition={lightboxCaptionPosition}
            lightboxFadeSpeed={lightboxFadeSpeed}
            lightboxCaptionAlignment={lightboxCaptionAlignment}
            globalLightbox={(puck?.metadata as Record<string, unknown>)?.globalLightbox as GlobalLightboxSettings | undefined}
            serverPhotos={serverPhotos?.[gallerySlug]}
          />
        );
      },
    },

    StoriesIndexBlock: {
      label: "Stories Contents",
      fields: {
        volumeLabel: { type: "text", label: "Volume label" },
        title: { type: "textarea", label: "Masthead title" },
        dek: { type: "textarea", label: "Dek (subtitle)" },
      },
      defaultProps: {
        volumeLabel: STORIES_INDEX_DEFAULTS.volumeLabel,
        title: STORIES_INDEX_DEFAULTS.title,
        dek: STORIES_INDEX_DEFAULTS.dek,
      },
      render: ({ volumeLabel, title, dek, puck }) => {
        const injected = (puck?.metadata as Record<string, unknown>)?.storiesIndex as
          | IndexStory[]
          | undefined;
        return (
          <StoriesIndexBlockRender
            volumeLabel={volumeLabel}
            title={title}
            dek={dek}
            injected={injected}
          />
        );
      },
    },

    FieldMap: {
      label: "Field Map",
      fields: {
        mapStyle: {
          type: "select",
          label: "Map style",
          options: [
            { label: "Modern — white, soft beige land, pale blue ocean", value: "modern" },
            { label: "Mono — greyscale, quiet", value: "mono" },
            { label: "Blueprint — dark navy, cobalt accents", value: "blueprint" },
          ],
        },
        height: {
          type: "select",
          label: "Height",
          options: [
            { label: "Tall (700px)", value: "700px" },
            { label: "Fill page area (full bleed only)", value: "fill" },
          ],
        },
        showBrand: {
          type: "radio",
          label: "Show site title in corner",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        backgroundColor: {
          type: "custom",
          label: "Background color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} allowTransparent />
          ),
        },
      },
      defaultProps: {
        mapStyle: "modern",
        height: "fill",
        showBrand: false,
        backgroundColor: "#ffffff",
      },
      render: ({ mapStyle, height, showBrand, backgroundColor, puck }) => {
        if (!siteConfig.features.fieldMap) return <></>;
        const injected = (puck?.metadata as Record<string, unknown>)?.fieldMap as
          | FieldMapBlockData
          | undefined
          | null;
        if (!injected) {
          return (
            <div
              className="flex items-center justify-center rounded border-2 border-dashed border-neutral-300 bg-neutral-50 text-center text-neutral-500"
              style={{ minHeight: 240 }}
            >
              <div className="px-6 py-10">
                <div className="font-medium">Field Map</div>
                <div className="mt-1 text-sm text-neutral-400">
                  Renders on the published page. Pulls every published gallery with coordinates.
                </div>
              </div>
            </div>
          );
        }
        const isFill = height === "fill" || height === "100vh";
        const fillStyle: React.CSSProperties = isFill
          ? { flex: "1 1 0%", minHeight: 0 }
          : { height };
        return (
          <>
            <link
              rel="stylesheet"
              href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
            />
            {/* The map fills the window and the page doesn't scroll, so a shrinking header can start shrunk. */}
            {isFill && <span data-fills-window="" hidden />}
            <div className="relative w-full" style={{ ...fillStyle, backgroundColor: cssColor(backgroundColor) }}>
              <FieldMap
                regions={injected.regions}
                yearBounds={injected.yearBounds}
                filters={injected.filters}
                mapStyle={mapStyle}
                siteTitle={injected.siteTitle}
                showBrand={showBrand}
                backgroundColor={cssColor(backgroundColor)}
              />
            </div>
          </>
        );
      },
    },

    // ----- Page sections (design canvas) -----

    PageIntro: {
      label: "Page Intro",
      fields: {
        eyebrow: { type: "text", label: "Eyebrow" },
        title: { type: "textarea", label: "Title" },
        text: { type: "textarea", label: "Text (a blank line starts a new paragraph)" },
        linkLabel: { type: "text", label: "Link text" },
        link: {
          type: "custom",
          label: "Goes to",
          render: ({ value, onChange }) => <LinkPicker value={value ?? ""} onChange={onChange} />,
        },
        stats: {
          type: "custom",
          render: ({ value, onChange }) => (
            <ListControl<IntroStat>
              value={value}
              onChange={onChange}
              addLabel="Add stat"
              newItem={() => ({ id: crypto.randomUUID(), label: "", value: "" })}
              summary={(s) => [s.label, s.value].filter(Boolean).join(" · ")}
              renderItem={(s, update) => (
                <>
                  <ListItemField label="Label" value={s.label} onChange={(v) => update({ label: v })} placeholder="Photographs" />
                  <ListItemField label="Value" value={s.value} onChange={(v) => update({ value: v })} placeholder="04" />
                </>
              )}
            />
          ),
        },
        eyebrowStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => <TextStyleControl value={value} onChange={onChange} fallback="label" />,
        },
        titleStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => <TextStyleControl value={value} onChange={onChange} fallback="display" />,
        },
        titleTag: {
          type: "radio",
          label: "Heading level",
          options: [
            { label: "Page title (H1)", value: "h1" },
            { label: "Section (H2)", value: "h2" },
          ],
        },
        textStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => <TextStyleControl value={value} onChange={onChange} fallback="lead" />,
        },
        linkStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => <TextStyleControl value={value} onChange={onChange} fallback="label" withColor={false} />,
        },
        statLabelStyle: {
          type: "custom",
          label: "Label text style",
          render: ({ value, onChange }) => <TextStyleControl value={value} onChange={onChange} fallback="meta" />,
        },
        statValueStyle: {
          type: "custom",
          label: "Value text style",
          render: ({ value, onChange }) => <TextStyleControl value={value} onChange={onChange} fallback="collectionTitle" />,
        },
        alignment: {
          type: "radio",
          label: "Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
          ],
        },
        textMaxWidth: {
          type: "custom",
          label: "Text width (0 = full)",
          render: ({ value, onChange }) => <SliderField value={value ?? 0} onChange={onChange} min={0} max={1248} step={4} unit="px" />,
        },
        ruleBelow: {
          type: "radio",
          label: "Rule below",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        ruleGap: {
          type: "custom",
          label: "Space above the rule",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
        marginTop: {
          type: "custom",
          label: "Space above",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
        marginBottom: {
          type: "custom",
          label: "Space below",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
      },
      defaultProps: {
        eyebrow: "Collections",
        title: "Bodies of work.",
        text: "",
        linkLabel: "",
        link: "",
        stats: [],
        eyebrowStyle: { style: "label" },
        titleStyle: { style: "display" },
        titleTag: "h1",
        textStyle: { style: "lead" },
        linkStyle: { style: "label" },
        statLabelStyle: { style: "meta" },
        statValueStyle: { style: "collectionTitle", size: 26 },
        alignment: "left",
        textMaxWidth: 720,
        ruleBelow: true,
        ruleGap: 64,
        marginTop: 0,
        marginBottom: 72,
      },
      render: ({ puck: _puck, ...props }) => <PageIntroRender {...props} />,
    },

    SectionHeader: {
      label: "Section Header",
      fields: {
        title: { type: "text", label: "Title" },
        linkLabel: { type: "text", label: "Link text" },
        link: {
          type: "custom",
          label: "Goes to",
          render: ({ value, onChange }) => <LinkPicker value={value ?? ""} onChange={onChange} />,
        },
        titleStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => <TextStyleControl value={value} onChange={onChange} fallback="label" />,
        },
        titleTag: {
          type: "radio",
          label: "Heading level",
          options: [
            { label: "H2", value: "h2" },
            { label: "H3", value: "h3" },
          ],
        },
        linkStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => <TextStyleControl value={value} onChange={onChange} fallback="meta" />,
        },
        ruleBelow: {
          type: "radio",
          label: "Rule below",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        marginTop: {
          type: "custom",
          label: "Space above",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
        marginBottom: {
          type: "custom",
          label: "Space below",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
      },
      defaultProps: {
        title: "Selected work",
        linkLabel: "",
        link: "",
        titleStyle: { style: "label" },
        titleTag: "h2",
        linkStyle: { style: "meta" },
        ruleBelow: true,
        marginTop: 48,
        marginBottom: 48,
      },
      render: ({ puck: _puck, ...props }) => <SectionHeaderRender {...props} />,
    },

    Details: {
      label: "Details",
      fields: {
        items: {
          type: "custom",
          render: ({ value, onChange }) => (
            <ListControl<DetailItem>
              value={value}
              onChange={onChange}
              addLabel="Add detail"
              newItem={() => ({ id: crypto.randomUUID(), term: "", description: "", link: "" })}
              summary={(d) => [d.term, d.description].filter(Boolean).join(" · ")}
              renderItem={(d, update) => (
                <>
                  <ListItemField label="Term" value={d.term} onChange={(v) => update({ term: v })} placeholder="Email" />
                  <ListItemField label="Description" value={d.description} onChange={(v) => update({ description: v })} multiline />
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-medium text-admin-ink">Link (optional)</span>
                    <LinkPicker value={d.link} onChange={(v) => update({ link: v })} />
                  </div>
                </>
              )}
            />
          ),
        },
        layout: {
          type: "radio",
          label: "Layout",
          options: [
            { label: "Rows", value: "rows" },
            { label: "Columns", value: "columns" },
            { label: "In a line", value: "inline" },
          ],
        },
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4", value: "4" },
          ],
        },
        tabletColumns: tabletColumnsField,
        phoneColumns: phoneColumnsField,
        dividers: {
          type: "radio",
          label: "Rules between rows",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        termStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => <TextStyleControl value={value} onChange={onChange} fallback="meta" />,
        },
        descriptionStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => <TextStyleControl value={value} onChange={onChange} fallback="collectionTitle" />,
        },
        marginTop: {
          type: "custom",
          label: "Space above",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
        marginBottom: {
          type: "custom",
          label: "Space below",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
      },
      defaultProps: {
        items: [],
        layout: "rows",
        columns: "3",
        dividers: true,
        termStyle: { style: "meta" },
        descriptionStyle: { style: "collectionTitle", size: 22 },
        marginTop: 0,
        marginBottom: 48,
      },
      render: ({ puck, ...props }) => <DetailsRender {...props} editing={!!puck?.isEditing} />,
    },

    PhotoPlate: {
      label: "Photo Plate",
      fields: {
        photo: {
          type: "custom",
          render: ({ value, onChange }) => <PhotoControl value={value} onChange={onChange} />,
        },
        title: { type: "text", label: "Title (blank = the photo's title)" },
        meta: { type: "text", label: "Details (blank = the photo's location)" },
        onClick: {
          type: "radio",
          label: "Clicking the photo",
          options: [
            { label: "Enlarges it", value: "lightbox" },
            { label: "Follows a link", value: "link" },
            { label: "Nothing", value: "none" },
          ],
        },
        link: {
          type: "custom",
          label: "Goes to",
          render: ({ value, onChange }) => <LinkPicker value={value ?? ""} onChange={onChange} />,
        },
        aspectRatio: {
          type: "select",
          label: "Crop",
          options: PLATE_ASPECT_OPTIONS,
        },
        showCaption: {
          type: "radio",
          label: "Display",
          options: [
            { label: "Show", value: true },
            { label: "Hide", value: false },
          ],
        },
        captionRule: {
          type: "radio",
          label: "Rule above the caption",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        titleStyle: {
          type: "custom",
          label: "Title text style",
          render: ({ value, onChange }) => <TextStyleControl value={value} onChange={onChange} fallback="photoTitle" />,
        },
        metaStyle: {
          type: "custom",
          label: "Details text style",
          render: ({ value, onChange }) => <TextStyleControl value={value} onChange={onChange} fallback="meta" />,
        },
        marginTop: {
          type: "custom",
          label: "Space above",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
        marginBottom: {
          type: "custom",
          label: "Space below",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
      },
      defaultProps: {
        photo: null,
        title: "",
        meta: "",
        onClick: "lightbox",
        link: "",
        aspectRatio: "natural",
        showCaption: true,
        captionRule: true,
        titleStyle: { style: "photoTitle" },
        metaStyle: { style: "meta" },
        marginTop: 0,
        marginBottom: 72,
      },
      render: ({ puck, ...props }) => {
        const metadata = puck?.metadata as Record<string, unknown> | undefined;
        return (
          <PhotoPlateRender
            {...props}
            editing={!!puck?.isEditing}
            library={metadata?.photosById as Record<string, LibraryPhoto> | undefined}
            lightbox={metadata?.globalLightbox as GlobalLightboxSettings | undefined}
          />
        );
      },
    },

    SelectedWork: {
      label: "Selected Work",
      fields: {
        photos: {
          type: "custom",
          render: ({ value, onChange }) => <PhotoListControl value={value} onChange={onChange} />,
        },
        onClick: {
          type: "radio",
          label: "Clicking a photo",
          options: [
            { label: "Enlarges it", value: "lightbox" },
            { label: "Nothing", value: "none" },
          ],
        },
        showTitles: {
          type: "radio",
          label: "Titles",
          options: [
            { label: "Show", value: true },
            { label: "Hide", value: false },
          ],
        },
        titleStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => <TextStyleControl value={value} onChange={onChange} fallback="photoTitle" />,
        },
        aspectRatio: {
          type: "select",
          label: "Crop",
          options: GALLERY_ASPECT_OPTIONS,
        },
        columns: {
          type: "select",
          label: "Columns",
          options: [
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4", value: "4" },
          ],
        },
        tabletColumns: tabletColumnsField,
        phoneColumns: phoneColumnsField,
        columnGap: {
          type: "custom",
          label: "Gap between columns",
          render: ({ value, onChange }) => <SliderField value={value ?? 24} onChange={onChange} min={0} max={64} step={1} unit="px" />,
        },
        rowGap: {
          type: "custom",
          label: "Gap between rows",
          render: ({ value, onChange }) => <SliderField value={value ?? 56} onChange={onChange} min={0} max={120} step={2} unit="px" />,
        },
        marginTop: {
          type: "custom",
          label: "Space above",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
        marginBottom: {
          type: "custom",
          label: "Space below",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
      },
      defaultProps: {
        photos: [],
        onClick: "lightbox",
        showTitles: true,
        titleStyle: { style: "photoTitle", size: 17 },
        aspectRatio: "4:5",
        columns: "3",
        columnGap: 24,
        rowGap: 56,
        marginTop: 0,
        marginBottom: 96,
      },
      render: ({ puck, ...props }) => {
        const metadata = puck?.metadata as Record<string, unknown> | undefined;
        return (
          <SelectedWorkRender
            {...props}
            editing={!!puck?.isEditing}
            library={metadata?.photosById as Record<string, LibraryPhoto> | undefined}
            lightbox={metadata?.globalLightbox as GlobalLightboxSettings | undefined}
          />
        );
      },
    },

    NextCollection: {
      label: "Next Collection",
      fields: {
        gallerySlug: {
          type: "custom",
          label: "This page's collection",
          render: ({ value, onChange }) => <GalleryPicker value={value ?? ""} onChange={onChange} />,
        },
        label: { type: "text", label: "Label" },
        wrap: {
          type: "radio",
          label: "After the last collection",
          options: [
            { label: "Back to the first", value: true },
            { label: "Show nothing", value: false },
          ],
        },
        labelStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => <TextStyleControl value={value} onChange={onChange} fallback="label" />,
        },
        titleStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => <TextStyleControl value={value} onChange={onChange} fallback="display" />,
        },
        marginTop: {
          type: "custom",
          label: "Space above",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
        marginBottom: {
          type: "custom",
          label: "Space below",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
      },
      defaultProps: {
        gallerySlug: "",
        label: "Next collection",
        wrap: true,
        labelStyle: { style: "label" },
        titleStyle: { style: "display", size: 40 },
        marginTop: 96,
        marginBottom: 0,
      },
      render: ({ puck, ...props }) => <NextCollectionRender {...props} editing={!!puck?.isEditing} />,
    },

    Breadcrumb: {
      label: "Breadcrumb",
      fields: {
        items: {
          type: "custom",
          render: ({ value, onChange }) => (
            <ListControl<Crumb>
              value={value}
              onChange={onChange}
              addLabel="Add step"
              newItem={() => ({ id: crypto.randomUUID(), label: "", link: "" })}
              summary={(c) => c.label}
              renderItem={(c, update) => (
                <>
                  <ListItemField label="Label" value={c.label} onChange={(v) => update({ label: v })} placeholder="Collections" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-medium text-admin-ink">Goes to</span>
                    <LinkPicker value={c.link} onChange={(v) => update({ link: v })} />
                  </div>
                </>
              )}
            />
          ),
        },
        current: { type: "text", label: "This page (last, not a link)" },
        separator: {
          type: "radio",
          label: "Between steps",
          options: [
            { label: "/", value: "/" },
            { label: "›", value: "›" },
            { label: "·", value: "·" },
          ],
        },
        linkStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => <TextStyleControl value={value} onChange={onChange} fallback="meta" />,
        },
        currentStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => <TextStyleControl value={value} onChange={onChange} fallback="meta" />,
        },
        marginTop: {
          type: "custom",
          label: "Space above",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
        marginBottom: {
          type: "custom",
          label: "Space below",
          render: ({ value, onChange }) => <SpacingControl value={value} onChange={onChange} />,
        },
      },
      defaultProps: {
        items: [{ id: "collections", label: "Collections", link: "/collections" }],
        current: "",
        separator: "/",
        linkStyle: { style: "meta" },
        // The design sets where-you-are in the ink colour, the steps before it muted.
        currentStyle: { style: "meta", color: "token:text" },
        marginTop: 0,
        marginBottom: 48,
      },
      render: ({ puck, ...props }) => <BreadcrumbRender {...props} editing={!!puck?.isEditing} />,
    },

    // ----- Form components -----

    Form: {
      label: "Form",
      fields: {
        formName: { type: "text", label: "Form name (identifier)" },
        submitLabel: { type: "text", label: "Submit button" },
        labelStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => (
            <TextStyleControl value={value} onChange={onChange} fallback="label" />
          ),
        },
        successMessage: { type: "textarea", label: "Success message" },
        recipientEmail: { type: "text", label: "Notification email (defaults to the site's contact email)" },
        fieldTextStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => (
            <TextStyleControl value={value} onChange={onChange} fallback="body" />
          ),
        },
        placeholderColor: {
          type: "custom",
          label: "Placeholder color",
          render: ({ value, onChange }) => (
            <ColorField value={value ?? ""} onChange={onChange} emptyLabel="Browser default" />
          ),
        },
        fieldLook: {
          type: "radio",
          label: "Look",
          options: [
            { label: "Box", value: "box" },
            { label: "Underline", value: "underline" },
          ],
        },
        fieldBorderColor: {
          type: "custom",
          label: "Border color",
          render: ({ value, onChange }) => (
            <ColorField value={value ?? ""} onChange={onChange} />
          ),
        },
        fieldBackground: {
          type: "custom",
          label: "Background",
          render: ({ value, onChange }) => (
            <ColorField value={value ?? ""} onChange={onChange} allowTransparent />
          ),
        },
        fieldRadius: {
          type: "custom",
          label: "Corner radius",
          render: ({ value, onChange }) => (
            <SliderField value={value ?? 0} onChange={onChange} min={0} max={24} step={1} unit="px" />
          ),
        },
        submitTextStyle: {
          type: "custom",
          label: "Text style",
          render: ({ value, onChange }) => (
            <TextStyleControl value={value} onChange={onChange} fallback="label" withColor={false} />
          ),
        },
        submitTextColor: {
          type: "custom",
          label: "Text color",
          render: ({ value, onChange }) => (
            <ColorField value={value ?? ""} onChange={onChange} />
          ),
        },
        submitBgColor: {
          type: "custom",
          label: "Background",
          render: ({ value, onChange }) => (
            <ColorField value={value ?? ""} onChange={onChange} />
          ),
        },
        submitHoverBgColor: {
          type: "custom",
          label: "Hover background",
          render: ({ value, onChange }) => (
            <ColorField value={value ?? ""} onChange={onChange} />
          ),
        },
        submitRadius: {
          type: "custom",
          label: "Corner radius",
          render: ({ value, onChange }) => (
            <SliderField value={value ?? 0} onChange={onChange} min={0} max={32} step={1} unit="px" />
          ),
        },
        panel: {
          type: "radio",
          label: "Panel behind the form",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        panelColor: {
          type: "custom",
          label: "Color",
          render: ({ value, onChange }) => (
            <ColorField value={value ?? ""} onChange={onChange} />
          ),
        },
        panelPadding: {
          type: "custom",
          label: "Padding",
          render: ({ value, onChange }) => (
            <SliderField value={value ?? 48} onChange={onChange} min={0} max={96} step={4} unit="px" />
          ),
        },
        panelRadius: {
          type: "custom",
          label: "Corner radius",
          render: ({ value, onChange }) => (
            <SliderField value={value ?? 0} onChange={onChange} min={0} max={32} step={1} unit="px" />
          ),
        },
      },
      defaultProps: {
        formName: "contact",
        submitLabel: "Submit",
        labelStyle: { style: "label" },
        successMessage: "Thank you! Your submission has been received.",
        recipientEmail: "",
        fieldTextStyle: { style: "body" },
        placeholderColor: "token:muted",
        fieldLook: "box",
        fieldBorderColor: "token:rule",
        fieldBackground: "transparent",
        fieldRadius: 2,
        submitTextStyle: { style: "label" },
        submitTextColor: "token:background",
        submitBgColor: "token:accent",
        submitHoverBgColor: "token:text",
        submitRadius: 2,
        panel: true,
        panelColor: "token:surface",
        panelPadding: 48,
        panelRadius: 0,
      },
      // Forms saved before these settings keep the look they had.
      resolveData: ({ props }) => ({ props: migrateForm(props) }),
      render: (props) => <FormWrapperRender {...migrateForm(props)} />,
    },

    TextField: {
      label: "Text Field",
      fields: {
        label: { type: "text", label: "Label" },
        name: { type: "text", label: "Field name (key)" },
        placeholder: { type: "text", label: "Placeholder" },
        required: {
          type: "radio",
          label: "Required",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        fieldType: {
          type: "select",
          label: "Input type",
          options: [
            { label: "Text", value: "text" },
            { label: "Email", value: "email" },
            { label: "Phone", value: "tel" },
            { label: "URL", value: "url" },
          ],
        },
        width: {
          type: "radio",
          label: "Width",
          options: [
            { label: "Full", value: "full" },
            { label: "Half", value: "half" },
          ],
        },
      },
      defaultProps: {
        width: "full",
        label: "Name",
        name: "name",
        placeholder: "",
        required: false,
        fieldType: "text",
      },
      // Inline: the field itself is the grid cell (in the editor too), so it can take half the row.
      inline: true,
      render: ({ puck, width, ...props }) => (
        <FormFieldCell width={width} dragRef={puck.dragRef}>
          <TextFieldRender {...props} />
        </FormFieldCell>
      ),
    },

    TextArea: {
      label: "Text Area",
      fields: {
        label: { type: "text", label: "Label" },
        name: { type: "text", label: "Field name (key)" },
        placeholder: { type: "text", label: "Placeholder" },
        required: {
          type: "radio",
          label: "Required",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        rows: { type: "number", label: "Rows", min: 2, max: 20 },
        width: {
          type: "radio",
          label: "Width",
          options: [
            { label: "Full", value: "full" },
            { label: "Half", value: "half" },
          ],
        },
      },
      defaultProps: {
        width: "full",
        label: "Message",
        name: "message",
        placeholder: "",
        required: false,
        rows: 4,
      },
      // Inline: the field itself is the grid cell (in the editor too), so it can take half the row.
      inline: true,
      render: ({ puck, width, ...props }) => (
        <FormFieldCell width={width} dragRef={puck.dragRef}>
          <TextAreaRender {...props} />
        </FormFieldCell>
      ),
    },

    SelectField: {
      label: "Dropdown Select",
      fields: {
        label: { type: "text", label: "Label" },
        name: { type: "text", label: "Field name (key)" },
        required: {
          type: "radio",
          label: "Required",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        options: {
          type: "textarea",
          label: "Options (one per line, use value|label for custom values)",
        },
        width: {
          type: "radio",
          label: "Width",
          options: [
            { label: "Full", value: "full" },
            { label: "Half", value: "half" },
          ],
        },
      },
      defaultProps: {
        width: "full",
        label: "Subject",
        name: "subject",
        required: false,
        options: "General Inquiry\nPrint Request\nCollaboration",
      },
      // Inline: the field itself is the grid cell (in the editor too), so it can take half the row.
      inline: true,
      render: ({ puck, width, ...props }) => (
        <FormFieldCell width={width} dragRef={puck.dragRef}>
          <SelectFieldRender {...props} />
        </FormFieldCell>
      ),
    },

    RadioGroup: {
      label: "Radio Buttons",
      fields: {
        label: { type: "text", label: "Label" },
        name: { type: "text", label: "Field name (key)" },
        required: {
          type: "radio",
          label: "Required",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        options: {
          type: "textarea",
          label: "Options (one per line, use value|label for custom values)",
        },
        width: {
          type: "radio",
          label: "Width",
          options: [
            { label: "Full", value: "full" },
            { label: "Half", value: "half" },
          ],
        },
      },
      defaultProps: {
        width: "full",
        label: "Preferred Contact",
        name: "preferred_contact",
        required: false,
        options: "email|Email\nphone|Phone",
      },
      // Inline: the field itself is the grid cell (in the editor too), so it can take half the row.
      inline: true,
      render: ({ puck, width, ...props }) => (
        <FormFieldCell width={width} dragRef={puck.dragRef}>
          <RadioGroupRender {...props} />
        </FormFieldCell>
      ),
    },

    CheckboxGroup: {
      label: "Checkbox Group",
      fields: {
        label: { type: "text", label: "Label" },
        name: { type: "text", label: "Field name (key)" },
        options: {
          type: "textarea",
          label: "Options (one per line, use value|label for custom values)",
        },
        width: {
          type: "radio",
          label: "Width",
          options: [
            { label: "Full", value: "full" },
            { label: "Half", value: "half" },
          ],
        },
      },
      defaultProps: {
        width: "full",
        label: "Interests",
        name: "interests",
        options: "prints|Prints\ncommissions|Commissions\nworkshops|Workshops",
      },
      // Inline: the field itself is the grid cell (in the editor too), so it can take half the row.
      inline: true,
      render: ({ puck, width, ...props }) => (
        <FormFieldCell width={width} dragRef={puck.dragRef}>
          <CheckboxGroupRender {...props} />
        </FormFieldCell>
      ),
    },

    Checkbox: {
      label: "Checkbox",
      fields: {
        label: { type: "text", label: "Label" },
        name: { type: "text", label: "Field name (key)" },
        width: {
          type: "radio",
          label: "Width",
          options: [
            { label: "Full", value: "full" },
            { label: "Half", value: "half" },
          ],
        },
      },
      defaultProps: {
        width: "full",
        label: "I agree to the terms",
        name: "agree_terms",
      },
      // Inline: the field itself is the grid cell (in the editor too), so it can take half the row.
      inline: true,
      render: ({ puck, width, ...props }) => (
        <FormFieldCell width={width} dragRef={puck.dragRef}>
          <CheckboxRender {...props} />
        </FormFieldCell>
      ),
    },
  },
};

// ----- Gallery picker (custom Puck field) -----

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// Image priority context — tracks how many images have rendered so the first N load eagerly
const ImageCounterContext = createContext<{ next: () => number }>({ next: () => Infinity });
export { ImageCounterContext };

function useImagePriority(threshold = 2): boolean {
  const ctx = useContext(ImageCounterContext);
  const indexRef = useRef<number | null>(null);
  if (indexRef.current === null) indexRef.current = ctx.next();
  return indexRef.current < threshold;
}

type GalleryOption = { id: string; title: string; slug: string };

function GalleryPicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [galleries, setGalleries] = useState<GalleryOption[]>([]);

  useEffect(() => {
    fetch("/api/galleries")
      .then((r) => r.json())
      .then((data: GalleryOption[]) => setGalleries(data))
      .catch(() => setGalleries([]));
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={PICKER_INPUT}
    >
      <option value="">-- Select a gallery --</option>
      {galleries.map((g) => (
        <option key={g.id} value={g.slug}>{g.title}</option>
      ))}
    </select>
  );
}

// ----- Slider field -----

// The field's label comes from the panel (components/puck/fieldTypes), so the
// `label` these used to draw themselves is ignored.
function SliderField({ value, onChange, min, max, step, unit }: { value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit: string; label?: string }) {
  return <SliderControl value={value} onChange={onChange} min={min} max={max} step={step} unit={unit} />;
}

// ----- Color field -----

function ColorField({
  value,
  onChange,
  allowTransparent,
  emptyLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  allowTransparent?: boolean;
  emptyLabel?: string;
}) {
  return (
    <ColorControl
      value={value}
      onChange={onChange}
      allowTransparent={allowTransparent}
      emptyLabel={emptyLabel}
    />
  );
}

const PICKER_INPUT =
  "w-full rounded-md border border-admin-border-strong bg-admin-surface px-2.5 py-1.5 text-[13px] text-admin-ink placeholder:text-admin-ink-faint focus:border-admin-accent focus:outline-none";

// ----- Link picker (internal pages/galleries + external URL) -----

type LinkOption = { label: string; value: string };

function LinkPicker({ value, onChange, noneLabel = "— None —" }: { value: string; onChange: (v: string) => void; noneLabel?: string }) {
  const [options, setOptions] = useState<LinkOption[]>([]);
  const [mode, setMode] = useState<"internal" | "external">(
    value && !value.startsWith("/") && value !== "" ? "external" : "internal"
  );

  useEffect(() => {
    async function load() {
      const items: LinkOption[] = [{ label: noneLabel, value: "" }];
      try {
        const [pagesRes, galleriesRes] = await Promise.all([
          fetch("/api/pages"),
          fetch("/api/galleries"),
        ]);
        if (pagesRes.ok) {
          const pages: { title: string; slug: string }[] = await pagesRes.json();
          pages.forEach((p) => items.push({ label: `Page: ${p.title}`, value: `/${p.slug}` }));
        }
        if (galleriesRes.ok) {
          const galleries: { title: string; slug: string }[] = await galleriesRes.json();
          galleries.forEach((g) => items.push({ label: `${siteConfig.labels.gallery}: ${g.title}`, value: `/${siteConfig.labels.gallerySlug}/${g.slug}` }));
        }
      } catch {}
      setOptions(items);
    }
    load();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl
        options={[
          { label: "On this site", value: "internal" },
          { label: "Web address", value: "external" },
        ]}
        value={mode}
        onChange={(m) => {
          if (m === mode) return;
          setMode(m as "internal" | "external");
          onChange("");
        }}
      />
      {mode === "internal" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={PICKER_INPUT}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com"
          className={PICKER_INPUT}
        />
      )}
    </div>
  );
}

// ----- Colour props -----

/**
 * Turns the named colour props into CSS values: a theme colour ("token:muted")
 * becomes its var(), hex passes through. Renderers destructure from the result
 * so every later use of those props is already CSS.
 */
function withCssColors<T extends object>(props: T, keys: (keyof T & string)[]): T {
  const out = { ...props } as Record<string, unknown>;
  for (const key of keys) {
    const v = out[key];
    if (typeof v === "string") out[key] = cssColor(v);
  }
  return out as T;
}

// ----- Container render -----

// Floating boxes are positioned from CSS variables. Below md they drop back into the flow at
// full width unless set to keep floating, so these class lists stay whole for Tailwind to find.
const FLOAT_ALWAYS = "absolute left-[var(--fb-left)] top-[var(--fb-top)] w-[var(--fb-width)] [transform:var(--fb-transform)]";
const FLOAT_FROM_MD =
  "static w-full md:absolute md:left-[var(--fb-left)] md:top-[var(--fb-top)] md:w-[var(--fb-width)] md:[transform:var(--fb-transform)]";

// Containers saved before the box and floating settings have none of them, so every value
// falls back to what a plain container looked like.
function ContainerRender(props: Partial<ContainerProps> & { isEditing: boolean }) {
  const {
    paddingLeft = 0,
    paddingRight = 0,
    paddingTop = 0,
    paddingBottom = 0,
    marginTop = 0,
    marginBottom = 0,
    bgColor = "#f5f5f5",
    bgOpacity = 0,
    textColor = "",
    borderWidth = 0,
    borderColor = "#d4d4d4",
    borderRadius = 0,
    contentMaxWidth = 100,
    fullBleed = false,
    placement = "flow",
    floatX = 50,
    floatAnchor = "center",
    floatY = 0,
    floatWidth = 50,
    floatReserve = 0,
    floatZ = 10,
    floatMobile = "stack",
    isEditing,
  } = props;

  const box: React.CSSProperties = {
    backgroundColor: bgOpacity > 0 ? withAlpha(bgColor, bgOpacity / 100) : undefined,
    color: cssColor(textColor) || undefined,
    border: borderWidth > 0 ? `${borderWidth}px solid ${cssColor(borderColor, "#d4d4d4")}` : undefined,
    borderRadius: borderRadius ? `${borderRadius}px` : undefined,
  };

  const narrowed = contentMaxWidth < 100;
  const contents = (
    <div
      style={{
        paddingLeft,
        paddingRight,
        paddingTop,
        paddingBottom,
        maxWidth: narrowed ? `${contentMaxWidth}%` : undefined,
        marginLeft: narrowed ? "auto" : undefined,
        marginRight: narrowed ? "auto" : undefined,
      }}
    >
      <DropZone zone="container-content" />
    </div>
  );

  if (placement === "floating") {
    const keepFloating = floatMobile === "float";
    const translateX = floatAnchor === "center" ? "-50%" : floatAnchor === "right" ? "-100%" : "0";
    return (
      <div
        className={keepFloating ? "relative h-[var(--fb-reserved)]" : "relative md:h-[var(--fb-reserved)]"}
        style={
          {
            "--fb-reserved": `${floatReserve}px`,
            marginTop,
            marginBottom,
            // Keep a visible, clickable anchor in the editor even when it takes no space.
            minHeight: isEditing ? 24 : undefined,
            outline: isEditing ? "1px dashed #cbd5e1" : undefined,
          } as React.CSSProperties
        }
      >
        <div
          className={keepFloating ? FLOAT_ALWAYS : FLOAT_FROM_MD}
          style={
            {
              "--fb-left": `${floatX}%`,
              "--fb-top": `${floatY}px`,
              "--fb-width": `${floatWidth}%`,
              "--fb-transform": `translateX(${translateX})`,
              zIndex: floatZ,
              ...box,
            } as React.CSSProperties
          }
        >
          {contents}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop,
        marginBottom,
        ...(fullBleed ? { marginLeft: "calc(-50vw + 50%)", marginRight: "calc(-50vw + 50%)", width: "100vw" } : {}),
        ...box,
      }}
    >
      {contents}
    </div>
  );
}

// ----- Button render -----

const BUTTON_SHADOWS: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px rgba(0,0,0,0.08)",
  md: "0 4px 12px rgba(0,0,0,0.15)",
  lg: "0 10px 30px rgba(0,0,0,0.22)",
};

const BUTTON_HOVER_TRANSFORMS: Record<string, string> = {
  none: "none",
  fade: "none",
  lift: "translateY(-2px)",
  "scale-up": "scale(1.05)",
  "scale-down": "scale(0.97)",
};

function ButtonRender(props: ButtonProps) {
  const [hovered, setHovered] = useState(false);

  const {
    label,
    iconText,
    iconPosition,
    iconGap,
    link,
    linkTarget,
    ariaLabel,
    alignment,
    widthMode,
    customWidth,
    minWidth,
    bgColor,
    bgOpacity,
    textColor,
    borderColor,
    borderWidth,
    borderStyle,
    borderRadius,
    paddingX,
    paddingY,
    marginTop,
    marginBottom,
    labelStyle,
    underline,
    hoverBgColor,
    hoverTextColor,
    hoverBorderColor,
    hoverEffect,
    shadow,
    hoverShadow,
    transitionMs,
    height,
  } = withCssColors(props, ["bgColor", "textColor", "borderColor", "hoverBgColor", "hoverTextColor", "hoverBorderColor"]);

  const opacity = (bgOpacity ?? 100) / 100;
  const bg = hovered ? hoverBgColor : withAlpha(bgColor, opacity);
  const fg = hovered ? hoverTextColor : textColor;
  const bd = hovered ? hoverBorderColor : borderColor;
  const sh = BUTTON_SHADOWS[hovered ? hoverShadow : shadow] ?? "none";
  const transform = hovered ? (BUTTON_HOVER_TRANSFORMS[hoverEffect] ?? "none") : "none";

  const widthStyle: React.CSSProperties =
    widthMode === "full"
      ? { width: "100%", display: "block" }
      : widthMode === "custom"
        ? { width: `${customWidth}%`, display: "block" }
        : { display: "inline-block" };

  // A fixed height centres the label vertically, so the vertical padding no longer applies.
  const fixedHeight = (height ?? 0) > 0;
  const heightStyle: React.CSSProperties = fixedHeight
    ? {
        display: widthMode === "auto" ? "inline-flex" : "flex",
        alignItems: "center",
        justifyContent: "center",
        height: `${height}px`,
        padding: `0 ${paddingX}px`,
      }
    : {};

  const buttonStyle: React.CSSProperties = {
    ...textStyleCss(labelStyle, "label", { withColor: false }),
    textDecoration: underline ? "underline" : "none",
    color: fg,
    backgroundColor: bg,
    border: `${borderWidth}px ${borderStyle} ${bd}`,
    borderRadius: `${borderRadius}px`,
    padding: `${paddingY}px ${paddingX}px`,
    minWidth: minWidth ? `${minWidth}px` : undefined,
    boxShadow: sh,
    transform,
    opacity: hovered && hoverEffect === "fade" ? 0.75 : 1,
    transition: `background-color ${transitionMs}ms, color ${transitionMs}ms, border-color ${transitionMs}ms, box-shadow ${transitionMs}ms, transform ${transitionMs}ms, opacity ${transitionMs}ms`,
    cursor: link ? "pointer" : "default",
    textAlign: "center",
    lineHeight: labelStyle?.lineHeight ?? 1.2,
    boxSizing: "border-box",
    ...widthStyle,
    ...heightStyle,
  };

  const iconEl = iconText ? (
    <span style={{ display: "inline-flex", alignItems: "center" }}>{iconText}</span>
  ) : null;

  const inner = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: `${iconGap}px`,
        flexDirection: iconPosition === "left" ? "row" : "row-reverse",
      }}
    >
      {iconEl}
      <span>
        <Editable path="label" value={label} />
      </span>
    </span>
  );

  const wrapperStyle: React.CSSProperties = {
    textAlign: alignment,
    marginTop: `${marginTop}px`,
    marginBottom: `${marginBottom}px`,
  };

  const sharedHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: () => setHovered(true),
    onBlur: () => setHovered(false),
  };

  return (
    <div style={wrapperStyle}>
      {link ? (
        <a
          href={link}
          target={linkTarget}
          rel={linkTarget === "_blank" ? "noopener noreferrer" : undefined}
          aria-label={ariaLabel || undefined}
          style={buttonStyle}
          {...sharedHandlers}
        >
          {inner}
        </a>
      ) : (
        <span
          role="button"
          aria-label={ariaLabel || undefined}
          style={buttonStyle}
          {...sharedHandlers}
        >
          {inner}
        </span>
      )}
    </div>
  );
}

// ----- Galleries multi-select picker -----

type GalleryRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  position: number;
  isPublished: boolean;
  createdAt?: string;
  /** Added by GET /api/galleries — number of photographs in the gallery. */
  photoCount?: number;
  /** Added by GET /api/galleries — the collection's built page, or its /gallery page. */
  href?: string;
  /** Added by GET /api/galleries — stands in for a missing cover. */
  firstPhotoUrl?: string | null;
};

/** A collection's link, from the API when it has one (see @/lib/collections). */
const collectionHref = (g: GalleryRow) => g.href ?? `/${siteConfig.labels.gallerySlug}/${g.slug}`;
const twoDigits = (n: number) => (n < 10 ? `0${n}` : String(n));

function GalleriesMultiSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [galleries, setGalleries] = useState<GalleryRow[]>([]);
  const selected = value ?? [];

  useEffect(() => {
    fetch("/api/galleries")
      .then((r) => r.json())
      .then((data: GalleryRow[]) => setGalleries(data))
      .catch(() => setGalleries([]));
  }, []);

  const toggle = (slug: string) => {
    if (selected.includes(slug)) {
      onChange(selected.filter((s) => s !== slug));
    } else {
      onChange([...selected, slug]);
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= selected.length) return;
    const updated = [...selected];
    [updated[index], updated[next]] = [updated[next], updated[index]];
    onChange(updated);
  };

  const bySlug = new Map(galleries.map((g) => [g.slug, g]));
  const unpicked = galleries.filter((g) => !selected.includes(g.slug));

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="space-y-1 rounded border border-neutral-200 bg-white p-2">
          <div className="text-xs font-medium text-neutral-500">Picked (in order)</div>
          {selected.map((slug, i) => {
            const g = bySlug.get(slug);
            return (
              <div key={slug} className="flex items-center gap-1 text-sm">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30" title="Move up">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === selected.length - 1} className="px-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30" title="Move down">↓</button>
                <span className="flex-1 truncate">{g ? g.title : slug}</span>
                <button onClick={() => toggle(slug)} className="px-1 text-red-400 hover:text-red-600" title="Remove">×</button>
              </div>
            );
          })}
        </div>
      )}
      {unpicked.length > 0 && (
        <div className="space-y-1 rounded border border-dashed border-neutral-300 p-2">
          <div className="text-xs font-medium text-neutral-500">Available</div>
          {unpicked.map((g) => (
            <button
              key={g.slug}
              onClick={() => toggle(g.slug)}
              className="block w-full truncate rounded px-2 py-1 text-left text-sm text-neutral-700 hover:bg-neutral-100"
            >
              + {g.title}
            </button>
          ))}
        </div>
      )}
      {galleries.length === 0 && (
        <div className="rounded border border-dashed border-neutral-300 p-3 text-xs text-neutral-500">
          Loading galleries…
        </div>
      )}
    </div>
  );
}

/**
 * Galleries Index → Goes to: each hand-picked collection can link somewhere of
 * its own (a page, another collection, a web address) instead of its own page.
 */
function GalleryLinksEditor({
  value,
  onChange,
}: {
  value: Record<string, GalleryLink> | undefined;
  onChange: (v: Record<string, GalleryLink>) => void;
}) {
  const puck = usePuck();
  const slugs = ((puck.selectedItem?.props as Partial<GalleriesIndexProps> | undefined)?.selectedSlugs ?? []) as string[];
  const [galleries, setGalleries] = useState<GalleryRow[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const links = value ?? {};

  useEffect(() => {
    fetch("/api/galleries")
      .then((r) => r.json())
      .then((data: GalleryRow[]) => setGalleries(data))
      .catch(() => setGalleries([]));
  }, []);

  if (slugs.length === 0) {
    return <p className="text-xs text-admin-ink-faint">Pick {siteConfig.labels.gallery.toLowerCase()}s above, then choose where each one goes.</p>;
  }

  const bySlug = new Map(galleries.map((g) => [g.slug, g]));
  const set = (slug: string, link: GalleryLink | null) => {
    const next = { ...links };
    if (link?.url.trim()) next[slug] = link;
    else delete next[slug];
    onChange(next);
  };

  return (
    <div className="divide-y divide-admin-border rounded-md border border-admin-border-strong">
      {slugs.map((slug) => {
        const g = bySlug.get(slug);
        const link = links[slug];
        const automatic = g ? collectionHref(g) : `/${siteConfig.labels.gallerySlug}/${slug}`;
        const isOpen = open === slug;
        return (
          <div key={slug} className="px-2.5 py-2">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : slug)}
              aria-expanded={isOpen}
              className="flex w-full items-baseline gap-2 text-left"
            >
              <span className="min-w-0 flex-1 truncate text-[13px] text-admin-ink">{g?.title ?? slug}</span>
              <span className={`min-w-0 max-w-[55%] shrink-0 truncate text-[12px] ${link ? "text-admin-accent" : "text-admin-ink-faint"}`}>
                {link ? `${link.url}${link.newTab ? " ↗" : ""}` : `Automatic (${automatic})`}
              </span>
            </button>
            {isOpen && (
              <div className="mt-2 space-y-2">
                <LinkPicker
                  value={link?.url ?? ""}
                  onChange={(url) => set(slug, { url, newTab: link?.newTab })}
                  noneLabel={`— Automatic (${automatic}) —`}
                />
                {link && (
                  <label className="flex items-center gap-2 text-[12px] text-admin-ink-soft">
                    <input
                      type="checkbox"
                      checked={!!link.newTab}
                      onChange={(e) => set(slug, { ...link, newTab: e.target.checked })}
                      className="accent-admin-accent"
                    />
                    Open in a new tab
                  </label>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ----- Galleries index render -----

const GALLERY_AR_MAP = GALLERY_ASPECT_CSS;

/** A collection with no photographs yet: the design's wall-coloured frame. */
function CoverPlaceholder({ fill }: { fill: boolean }) {
  return (
    <div
      className={`flex w-full items-center justify-center ${fill ? "h-full" : "h-48"}`}
      style={{ background: "var(--theme-color-surface, #f2efe9)", color: "var(--theme-color-muted, #8c877d)" }}
      aria-hidden="true"
    >
      <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
      </svg>
    </div>
  );
}

function GalleriesIndexRender(props: GalleriesIndexProps) {
  const {
    sourceMode,
    selectedSlugs,
    maxItems,
    sortOrder,
    layout,
    columns,
    gap,
    showCount,
    countLabel,
    titleRule,
    dividerColor,
    listTitleStyle,
    fullBleed,
    maxWidth,
    aspectRatio,
    borderRadius,
    imageHoverEffect,
    showTitle,
    showDescription,
    titlePosition,
    textAlignment,
    titleStyle,
    descriptionStyle,
    textPaddingX,
    textPaddingY,
    textGap,
    overlayBgColor,
    overlayOpacity,
    marginTop,
    marginBottom,
    transitionMs,
  } = withCssColors(props, ["dividerColor", "overlayBgColor"]);

  const [galleries, setGalleries] = useState<GalleryRow[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/galleries")
      .then((r) => r.json())
      .then((data: GalleryRow[]) => setGalleries(data.filter((g) => g.isPublished)))
      .catch(() => setGalleries([]));
  }, []);

  let list: GalleryRow[] = [];
  if (sourceMode === "manual") {
    const bySlug = new Map(galleries.map((g) => [g.slug, g]));
    list = (selectedSlugs ?? []).map((s) => bySlug.get(s)).filter((g): g is GalleryRow => Boolean(g));
  } else {
    list = [...galleries];
  }

  const sorted = [...list];
  if (sortOrder === "position") {
    sorted.sort((a, b) => a.position - b.position);
  } else if (sortOrder === "newest") {
    sorted.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  } else if (sortOrder === "oldest") {
    sorted.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
  } else if (sortOrder === "title-asc") {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortOrder === "title-desc") {
    sorted.sort((a, b) => b.title.localeCompare(a.title));
  }
  // "manual" preserves the order from selectedSlugs (or API response in "all" mode)

  const limited = maxItems > 0 ? sorted.slice(0, maxItems) : sorted;

  // Hand-picked collections can go somewhere of their own (Goes to).
  const linkProps = (g: GalleryRow) => {
    const own = sourceMode === "manual" ? props.linkOverrides?.[g.slug] : undefined;
    if (!own?.url) return { href: collectionHref(g) };
    return own.newTab
      ? { href: own.url, target: "_blank", rel: "noopener noreferrer" }
      : { href: own.url };
  };

  const colCount = parseInt(columns, 10) || 3;
  const descriptionCss = textStyleCss(descriptionStyle, "body");
  const arValue = GALLERY_AR_MAP[aspectRatio];
  // Blocks saved before the setting existed read "photographs".
  const countUnit = countLabel ?? "photographs";
  const isOverlay = titlePosition !== "below";

  const wrapperStyle: React.CSSProperties = {
    width: fullBleed ? "100%" : `${maxWidth}%`,
    margin: fullBleed ? `${marginTop}px 0 ${marginBottom}px` : `${marginTop}px auto ${marginBottom}px`,
  };

  const grid = responsiveGrid(colCount, props.tabletColumns, props.phoneColumns);

  if (limited.length === 0) {
    return (
      <div style={wrapperStyle}>
        <div className="rounded border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          {sourceMode === "manual" ? `Pick at least one ${siteConfig.labels.gallery.toLowerCase()}.` : `No published ${siteConfig.labels.gallery.toLowerCase()} found.`}
        </div>
      </div>
    );
  }

  if (layout === "list") {
    const coverSide = props.listCover ?? "none";
    const coverShape = props.listCoverShape ?? "square";
    const coverSize = props.listCoverSize ?? 64;
    const coverSizePhone = props.listCoverSizePhone ?? coverSize;
    // Phones are measured by the list's own width, as the cover grid's columns are.
    const coverVars = { "--list-cover": `${coverSize}px`, "--list-cover-phone": `${coverSizePhone}px` } as React.CSSProperties;
    const coverEl = (g: GalleryRow) => {
      const url = g.coverImageUrl || g.firstPhotoUrl;
      const source = url ? optimizedSource(url, `${Math.max(coverSize, coverSizePhone)}px`) : null;
      return (
        <span
          className="block shrink-0 overflow-hidden [width:var(--list-cover-phone)] @min-[32rem]:[width:var(--list-cover)]"
          style={{ aspectRatio: LIST_COVER_AR[coverShape], borderRadius: coverShape === "round" ? "50%" : `${borderRadius}px` }}
        >
          {source ? (
            <img {...source} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <span className="block h-full w-full" style={{ background: "var(--theme-color-surface, #f2efe9)" }} aria-hidden="true" />
          )}
        </span>
      );
    };

    return (
      <div style={{ ...wrapperStyle, ...coverVars }} className="@container">
        {limited.map((g, i) => {
          const hovered = hoveredId === g.id;
          return (
            <a
              key={g.id}
              {...linkProps(g)}
              onMouseEnter={() => setHoveredId(g.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: "flex",
                // Titles share a baseline with the count; beside a cover they centre on it.
                alignItems: coverSide === "none" ? "baseline" : "center",
                justifyContent: "space-between",
                gap: 24,
                textDecoration: "none",
                padding: `${textPaddingY}px 0`,
                borderTop: `1px solid ${dividerColor}`,
                borderBottom: i === limited.length - 1 ? `1px solid ${dividerColor}` : undefined,
                transition: `opacity ${transitionMs}ms ease`,
                opacity: hovered ? 0.7 : 1,
              }}
            >
              {coverSide === "left" && coverEl(g)}
              <span style={{ minWidth: 0, flex: "1 1 auto" }}>
                <span
                  style={{
                    ...textStyleCss(listTitleStyle, "collectionTitle"),
                  }}
                >
                  {g.title}
                </span>
                {showDescription && g.description && (
                  <span
                    style={{
                      display: "block",
                      ...descriptionCss,
                      marginTop: `${textGap}px`,
                    }}
                  >
                    {g.description}
                  </span>
                )}
              </span>
              {showCount && typeof g.photoCount === "number" && (
                <span
                  style={{
                    ...textStyleCss(undefined, "meta"),
                    flexShrink: 0,
                  }}
                >
                  {twoDigits(g.photoCount)}
                </span>
              )}
              {coverSide === "right" && coverEl(g)}
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div style={wrapperStyle} className="@container">
      <div className={grid.className} style={{ ...grid.style, gap: `${gap}px` }}>
        {limited.map((g) => {
          const hovered = hoveredId === g.id;
          const cover = g.coverImageUrl || g.firstPhotoUrl;
          const count =
            showCount && typeof g.photoCount === "number"
              ? `${twoDigits(g.photoCount)}${countUnit ? ` ${countUnit}` : ""}`
              : null;

          const overlayInset =
            titlePosition === "overlay-top"
              ? { top: 0, left: 0, right: 0 }
              : titlePosition === "overlay-center"
                ? { top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center" }
                : { bottom: 0, left: 0, right: 0 };

          const titleText = (
            <div
              style={{
                ...textStyleCss(titleStyle, "collectionTitle"),
                textAlign: textAlignment,
              }}
            >
              {g.title}
            </div>
          );
          // Below the cover, the count sits at the end of the title's line.
          const titleEl =
            showTitle && count && !isOverlay ? (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", columnGap: 16, rowGap: 4 }}>
                {titleText}
                <span style={{ ...textStyleCss(undefined, "meta"), flexShrink: 0 }}>{count}</span>
              </div>
            ) : (
              showTitle && titleText
            );

          const descEl = showDescription && g.description && (
            <div
              style={{
                ...descriptionCss,
                textAlign: textAlignment,
                marginTop: `${textGap}px`,
              }}
            >
              {g.description}
            </div>
          );

          const imageWrapperStyle: React.CSSProperties = {
            position: "relative",
            overflow: "hidden",
            borderRadius: `${borderRadius}px`,
            aspectRatio: arValue,
            transition: `transform ${transitionMs}ms, box-shadow ${transitionMs}ms`,
            transform: hovered && imageHoverEffect === "lift" ? "translateY(-4px)" : "none",
            boxShadow: hovered && imageHoverEffect === "lift" ? "0 10px 25px rgba(0,0,0,0.15)" : "none",
          };

          const imageStyle: React.CSSProperties = {
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transition: `transform ${transitionMs}ms, opacity ${transitionMs}ms, filter ${transitionMs}ms`,
            transform: hovered && imageHoverEffect === "zoom" ? "scale(1.06)" : "scale(1)",
            opacity: hovered && imageHoverEffect === "fade" ? 0.7 : 1,
            filter: hovered && imageHoverEffect === "darken" ? "brightness(0.7)" : "none",
          };

          const overlayBg = isOverlay ? withAlpha(overlayBgColor, overlayOpacity / 100) : undefined;

          return (
            <a
              key={g.id}
              {...linkProps(g)}
              style={{ display: "block", textDecoration: "none", color: "inherit" }}
              onMouseEnter={() => setHoveredId(g.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div style={imageWrapperStyle}>
                {cover ? (
                  arValue ? (
                    <img src={cover} alt={g.title} style={imageStyle} loading="lazy" />
                  ) : (
                    <img src={cover} alt={g.title} style={{ ...imageStyle, height: "auto" }} loading="lazy" />
                  )
                ) : (
                  <CoverPlaceholder fill={!!arValue} />
                )}
                {isOverlay && (showTitle || showDescription) && (
                  <div
                    style={{
                      position: "absolute",
                      ...overlayInset,
                      backgroundColor: overlayBg,
                      padding: `${textPaddingY}px ${textPaddingX}px`,
                      pointerEvents: "none",
                    }}
                  >
                    <div>
                      {titleEl}
                      {descEl}
                    </div>
                  </div>
                )}
              </div>
              {!isOverlay && (showTitle || showDescription) && (
                <div
                  style={
                    titleRule
                      ? {
                          marginTop: textPaddingY,
                          padding: `${textPaddingY}px ${textPaddingX}px 0`,
                          borderTop: "1px solid var(--theme-color-rule, #e0dcd3)",
                        }
                      : { padding: `${textPaddingY}px ${textPaddingX}px` }
                  }
                >
                  {titleEl}
                  {descEl}
                </div>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ----- Link list editor + render -----

function LinkListItemEditor({ value, onChange }: { value: LinkListItem[]; onChange: (v: LinkListItem[]) => void }) {
  const items = value ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addItem = () => {
    const item: LinkListItem = {
      id: crypto.randomUUID(),
      label: "New item",
      description: "",
      meta: "",
      link: "",
      linkTarget: "_self",
      imageUrl: "",
      iconText: "",
    };
    onChange([...items, item]);
    setExpandedId(item.id);
  };

  const updateItem = (id: string, patch: Partial<LinkListItem>) => {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    onChange(items.filter((it) => it.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    const updated = [...items];
    [updated[index], updated[next]] = [updated[next], updated[index]];
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={item.id} className="rounded border border-neutral-200 bg-white">
          <div className="flex items-center gap-1 px-2 py-1.5 text-sm">
            <button onClick={() => moveItem(i, -1)} disabled={i === 0} className="px-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30" title="Move up">↑</button>
            <button onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} className="px-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30" title="Move down">↓</button>
            <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className="flex-1 truncate text-left font-medium">
              {i + 1}. {item.label || "(no label)"}
            </button>
            <button onClick={() => removeItem(item.id)} className="px-1 text-red-400 hover:text-red-600" title="Remove">×</button>
          </div>
          {expandedId === item.id && (
            <div className="space-y-2 border-t border-neutral-100 px-2 py-2">
              <div>
                <label className="text-xs font-medium text-neutral-500">Label</label>
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateItem(item.id, { label: e.target.value })}
                  className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500">Description (optional)</label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                  className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500">Meta (optional) &mdash; pinned right</label>
                <input
                  type="text"
                  value={item.meta ?? ""}
                  onChange={(e) => updateItem(item.id, { meta: e.target.value })}
                  className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500">Link</label>
                <LinkPicker value={item.link} onChange={(v) => updateItem(item.id, { link: v })} />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500">Opens In</label>
                <select
                  value={item.linkTarget}
                  onChange={(e) => updateItem(item.id, { linkTarget: e.target.value as LinkListItem["linkTarget"] })}
                  className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                >
                  <option value="_self">Same Tab</option>
                  <option value="_blank">New Tab</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500">Icon (text/emoji)</label>
                <input
                  type="text"
                  value={item.iconText}
                  onChange={(e) => updateItem(item.id, { iconText: e.target.value })}
                  className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500">Image (optional)</label>
                <ImagePicker value={item.imageUrl} onChange={(url) => updateItem(item.id, { imageUrl: url })} />
              </div>
            </div>
          )}
        </div>
      ))}
      <button
        onClick={addItem}
        className="block w-full rounded border border-dashed border-neutral-300 px-2 py-2 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
      >
        + Add Item
      </button>
    </div>
  );
}

const LINKLIST_SHADOWS: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px rgba(0,0,0,0.08)",
  md: "0 4px 12px rgba(0,0,0,0.15)",
  lg: "0 10px 30px rgba(0,0,0,0.22)",
};

const LINKLIST_AR_MAP: Record<string, string | undefined> = {
  natural: undefined,
  square: "1/1",
  "4:3": "4/3",
  "3:2": "3/2",
  "16:9": "16/9",
};

function LinkListRender(props: LinkListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const {
    items,
    layout,
    columns,
    gap,
    alignment,
    itemAlignment,
    showImage,
    showDescription,
    showIcon,
    imagePosition,
    imageSize,
    imageAspectRatio,
    imageBorderRadius,
    iconGap,
    bgColor,
    bgOpacity,
    textColor,
    borderColor,
    borderWidth,
    borderRadius,
    paddingX,
    paddingY,
    labelStyle,
    underline,
    descriptionStyle,
    hoverBgColor,
    hoverTextColor,
    hoverBorderColor,
    hoverEffect,
    shadow,
    hoverShadow,
    dividers,
    dividerColor,
    marginTop,
    marginBottom,
    transitionMs,
  } = withCssColors(props, ["bgColor", "textColor", "borderColor", "hoverBgColor", "hoverTextColor", "hoverBorderColor", "dividerColor"]);

  const safeItems = items ?? [];
  const descriptionCss = textStyleCss(descriptionStyle, "body");

  const justify =
    alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center";

  const colCount = parseInt(columns, 10) || 3;
  const arValue = LINKLIST_AR_MAP[imageAspectRatio];

  let containerStyle: React.CSSProperties = {
    marginTop: `${marginTop}px`,
    marginBottom: `${marginBottom}px`,
  };

  const grid = layout === "card-grid" ? responsiveGrid(colCount, props.tabletColumns, props.phoneColumns) : null;
  if (grid) {
    containerStyle = {
      ...containerStyle,
      ...grid.style,
      gap: `${gap}px`,
    };
  } else if (layout === "horizontal-pills") {
    containerStyle = {
      ...containerStyle,
      display: "flex",
      flexWrap: "wrap",
      gap: `${gap}px`,
      justifyContent: justify,
    };
  } else {
    // vertical-list, button-stack
    containerStyle = {
      ...containerStyle,
      display: "flex",
      flexDirection: "column",
      gap: `${gap}px`,
      alignItems:
        layout === "button-stack"
          ? alignment === "left"
            ? "flex-start"
            : alignment === "right"
              ? "flex-end"
              : "center"
          : "stretch",
    };
  }

  if (safeItems.length === 0) {
    return (
      <div style={containerStyle}>
        <div className="rounded border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          Add at least one item.
        </div>
      </div>
    );
  }

  const content = (
    <div className={grid?.className} style={containerStyle}>
      {safeItems.map((item, i) => {
        const hovered = hoveredId === item.id;
        const isLast = i === safeItems.length - 1;

        const bg = hovered
          ? hoverBgColor
          : bgOpacity > 0
            ? withAlpha(bgColor, bgOpacity / 100)
            : "transparent";

        const fg = hovered ? hoverTextColor : textColor;
        const bd = hovered ? hoverBorderColor : borderColor;
        const sh = LINKLIST_SHADOWS[hovered ? hoverShadow : shadow] ?? "none";

        let transform = "none";
        if (hovered) {
          if (hoverEffect === "lift") transform = "translateY(-2px)";
          else if (hoverEffect === "scale-up") transform = "scale(1.03)";
          else if (hoverEffect === "indent") transform = "translateX(6px)";
        }

        const showHoverUnderline = hovered && hoverEffect === "underline";

        const itemStyle: React.CSSProperties = {
          ...textStyleCss(labelStyle, "body", { withColor: false }),
          textDecoration: underline || showHoverUnderline ? "underline" : "none",
          color: fg,
          backgroundColor: bg,
          border: borderWidth > 0 ? `${borderWidth}px solid ${bd}` : "none",
          borderRadius: `${borderRadius}px`,
          padding: `${paddingY}px ${paddingX}px`,
          boxShadow: sh,
          transform,
          transition: `background-color ${transitionMs}ms, color ${transitionMs}ms, border-color ${transitionMs}ms, box-shadow ${transitionMs}ms, transform ${transitionMs}ms, text-decoration ${transitionMs}ms`,
          textAlign: itemAlignment,
          display: "flex",
          flexDirection: imagePosition === "top" ? "column" : "row",
          alignItems:
            imagePosition === "top"
              ? itemAlignment === "left"
                ? "flex-start"
                : itemAlignment === "right"
                  ? "flex-end"
                  : "center"
              : "center",
          gap: `${iconGap}px`,
          textDecorationColor: fg,
          width: layout === "card-grid" || layout === "vertical-list" ? "100%" : "auto",
          boxSizing: "border-box",
          cursor: item.link ? "pointer" : "default",
        };

        if (borderWidth === 0 && layout === "vertical-list" && dividers && !isLast) {
          itemStyle.borderBottom = `1px solid ${dividerColor}`;
        }

        const isTopImage = imagePosition === "top";
        const useNatural = isTopImage && !arValue;
        const imageWrapperStyle: React.CSSProperties = useNatural
          ? {
              flexShrink: 0,
              width: "100%",
              overflow: "hidden",
              borderRadius: `${imageBorderRadius}px`,
            }
          : {
              flexShrink: 0,
              width: isTopImage ? "100%" : `${imageSize}px`,
              height: isTopImage ? undefined : `${imageSize}px`,
              aspectRatio: isTopImage ? arValue : (arValue ?? "1/1"),
              overflow: "hidden",
              borderRadius: `${imageBorderRadius}px`,
            };

        const imageEl =
          showImage && item.imageUrl ? (
            <div style={imageWrapperStyle}>
              <img
                src={item.imageUrl}
                alt=""
                style={
                  useNatural
                    ? { width: "100%", height: "auto", display: "block" }
                    : { width: "100%", height: "100%", objectFit: "cover", display: "block" }
                }
                loading="lazy"
              />
            </div>
          ) : null;

        const iconEl = showIcon && item.iconText ? (
          <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center" }}>{item.iconText}</span>
        ) : null;

        const textEl = (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div>
              <Editable path={`items[${i}].label`} value={item.label} />
            </div>
            {showDescription && item.description && (
              <div
                style={{
                  ...descriptionCss,
                  ...(hovered ? { color: hoverTextColor } : {}),
                  marginTop: 2,
                  textDecoration: "none",
                }}
              >
                <Editable path={`items[${i}].description`} value={item.description} />
              </div>
            )}
          </div>
        );

        const metaEl = item.meta ? (
          <span
            style={{
              flexShrink: 0,
              marginLeft: "auto",
              paddingLeft: 16,
              ...descriptionCss,
              ...(hovered ? { color: hoverTextColor } : {}),
              textDecoration: "none",
            }}
          >
            <Editable path={`items[${i}].meta`} value={item.meta} />
          </span>
        ) : null;

        const inner =
          imagePosition === "right" ? (
            <>
              {iconEl}
              {textEl}
              {metaEl}
              {imageEl}
            </>
          ) : (
            <>
              {imageEl}
              {iconEl}
              {textEl}
              {metaEl}
            </>
          );

        const handlers = {
          onMouseEnter: () => setHoveredId(item.id),
          onMouseLeave: () => setHoveredId(null),
          onFocus: () => setHoveredId(item.id),
          onBlur: () => setHoveredId(null),
        };

        if (item.link) {
          return (
            <a
              key={item.id}
              href={item.link}
              target={item.linkTarget}
              rel={item.linkTarget === "_blank" ? "noopener noreferrer" : undefined}
              style={itemStyle}
              {...handlers}
            >
              {inner}
            </a>
          );
        }
        return (
          <div key={item.id} style={itemStyle} {...handlers}>
            {inner}
          </div>
        );
      })}
    </div>
  );
  // A grid counts its columns by its own width, so it needs a container to measure.
  return grid ? <div className="@container">{content}</div> : content;
}

// ----- Metadata fields picker -----

const METADATA_OPTIONS = [
  { key: "title", label: "Title" },
  { key: "filename", label: "Filename" },
  { key: "description", label: "Description" },
  { key: "location", label: "Location" },
  { key: "date", label: "Date taken" },
  { key: "camera", label: "Camera Settings" },
] as const;

function MetadataFieldsPicker({ value, onChange }: { value: string[]; onChange: (val: string[]) => void }) {
  const selected = value ?? ["title"];
  return (
    <div className="flex flex-col gap-1">
      {METADATA_OPTIONS.map((opt) => (
        <label key={opt.key} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.includes(opt.key)}
            onChange={(e) => {
              if (e.target.checked) {
                onChange([...selected, opt.key]);
              } else {
                onChange(selected.filter((k) => k !== opt.key));
              }
            }}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

// ----- Page frame in the editor -----

/** What the page editor tells the preview about the page (Puck `metadata.page`). */
export type EditorPageInfo = { title: string; showTitle: boolean; isHome: boolean };

const usePuckSelector = createUsePuck();

/** The page's frame on the editor's canvas, following the Page settings as they change. */
function EditorPageFrame({ layout, page, children }: { layout: PageLayout; page?: EditorPageInfo; children: React.ReactNode }) {
  const first = usePuckSelector((s) => s.appState.data.content?.[0]) as { type: string; props?: Record<string, unknown> } | undefined;
  const isFullBleed = layout.width === "full";
  const showTitle = page?.showTitle ?? false;
  const flushTop = opensFlush({ content: first ? [first] : [] }, { isFullBleed, showTitle }, page?.isHome ?? false);
  return (
    <PageFrame layout={layout} isFullBleed={isFullBleed} flushTop={flushTop} title={showTitle ? page?.title : null}>
      {children}
    </PageFrame>
  );
}

// ----- Hero banner placement -----

/** Screen heights as what's left once a phone's browser bars are showing ("100vh" → "100svh"). */
function screenHeight(h: string | undefined): string {
  return (h || "500px").replace(/vh$/, "svh");
}

const EDGE = { top: "flex-start", center: "center", bottom: "flex-end", left: "flex-start", right: "flex-end" } as const;

/**
 * Where a Hero Banner's text sits, and its overlay: even all over, or a
 * gradient that is darkest at the text's side and clears across the photo.
 */
function heroPlacement(position: Position | undefined, style: HeroProps["overlayStyle"] | undefined, opacity: number) {
  const pos = position ?? "center";
  // "top-left" → row top, column left; "center" alone is both.
  const [row, col] = pos === "center" ? ["center", "center"] : pos.split("-");
  const a = Math.max(0, Math.min(90, opacity ?? 0)) / 100;
  const dark = (f: number) => `rgba(0,0,0,${+(a * f).toFixed(3)})`;
  let shade = `linear-gradient(${dark(1)}, ${dark(1)})`;
  if (style === "text") {
    const from = row !== "center" ? row : col !== "center" ? col : null;
    const toward = { top: "bottom", bottom: "top", left: "right", right: "left" } as const;
    shade = from
      ? `linear-gradient(to ${toward[from as keyof typeof toward]}, ${dark(1)} 0%, ${dark(0.6)} 35%, transparent 80%)`
      : `radial-gradient(ellipse at center, ${dark(1)} 0%, ${dark(0.5)} 45%, transparent 80%)`;
  }
  return {
    justify: EDGE[row as keyof typeof EDGE] ?? "center",
    align: EDGE[col as keyof typeof EDGE] ?? "center",
    textAlign: col === "center" ? "center" : col,
    shade,
  };
}

// ----- Hero slideshow client -----

/** A small seeded random generator (mulberry32): the same seed gives the same numbers on server and browser. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The slides in the order the block asks for. Random orders come from the page
 * view's seed (lib/puck/page-seed), mixed with the block's id so two slideshows
 * on one page differ; with no seed (the editor) the gallery's order is kept.
 */
function orderSlides<T>(photos: T[], order: NonNullable<HeroSlideshowProps["order"]>, seed: number | undefined, blockId = ""): T[] {
  if (order === "gallery" || seed == null || photos.length < 2) return photos;
  let mixed = seed;
  for (let i = 0; i < blockId.length; i++) mixed = Math.imul(mixed ^ blockId.charCodeAt(i), 16777619);
  const random = seededRandom(mixed);
  if (order === "random-start") {
    const start = Math.floor(random() * photos.length);
    return [...photos.slice(start), ...photos.slice(0, start)];
  }
  const out = [...photos];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The slideshow's box on one kind of screen, as CSS, plus what its image sizes are worked out from. */
type SlideBox = {
  height: string;
  aspect: string;
  minHeight: string;
  widthVw: number;
  /** A fixed shape (width / height), or null when the height sets the size. */
  ratio: number | null;
  /** The height as a number: px, or % of the screen's height (any vh unit). */
  len: { n: number; unit: "px" | "vh" } | null;
};

/**
 * `height` is a length ("100dvh", "500px") or, for phones, a shape ("4:5");
 * `shape` sets a fixed aspect ratio, with `height` then the least it may be.
 */
function slideshowBox(height: string, shape: string, widthVw: number): SlideBox {
  // Legacy vh values become dvh, the height a phone shows with its browser bars.
  const css = height.replace(/(\d+)vh$/, "$1dvh");
  const m = /^(\d+(?:\.\d+)?)(px|dvh|svh|vh)$/.exec(css);
  const len = m ? { n: Number(m[1]), unit: m[2] === "px" ? ("px" as const) : ("vh" as const) } : null;
  const s = /^(\d+):(\d+)$/.exec(shape);
  if (s) {
    return { height: "auto", aspect: `${s[1]}/${s[2]}`, minHeight: len ? css : "0px", widthVw, ratio: Number(s[1]) / Number(s[2]), len };
  }
  return { height: css, aspect: "auto", minHeight: "0px", widthVw, ratio: null, len };
}

/** The width a photo of aspect `a` shows at when it covers the box, as `sizes` entries (last one unconditional). */
function coverSizes(a: number, box: SlideBox): { when?: string; size: string }[] {
  const w = box.widthVw;
  const r = (n: number) => Math.round(n * 10) / 10;
  if (box.ratio) return [{ size: `${r(w * Math.max(1, a / box.ratio))}vw` }];
  if (!box.len) return [{ size: `${w}vw` }];
  if (box.len.unit === "px") {
    // Narrower than this, the box is taller than the photo's shape and the photo overhangs its sides.
    const need = box.len.n * a;
    return [{ when: `(max-width: ${Math.round((need * 100) / w)}px)`, size: `${Math.round(need)}px` }, { size: `${w}vw` }];
  }
  const shape = (a * box.len.n) / w;
  return [{ when: `(max-aspect-ratio: ${Math.round(shape * 1000)}/1000)`, size: `${r(a * box.len.n)}vh` }, { size: `${w}vw` }];
}

/**
 * The `sizes` for a slide. Cover crops the photo to the box, so on a screen
 * shaped differently from the photo (an upright phone at full height) it shows
 * much wider than the screen; this asks for an image that wide, so it stays sharp.
 */
function slideSizes(photo: { width: number; height: number }, fit: "cover" | "contain", desktop: SlideBox, phone: SlideBox | null): string {
  if (fit === "contain") return `${desktop.widthVw}vw`;
  const a = photo.width > 0 && photo.height > 0 ? photo.width / photo.height : 1.5;
  const phoneEntries = phone
    ? coverSizes(a, phone).map((e) => `(max-width: 639px)${e.when ? ` and ${e.when}` : ""} ${e.size}`)
    : [];
  const desktopEntries = coverSizes(a, desktop).map((e) => (e.when ? `${e.when} ${e.size}` : e.size));
  return [...phoneEntries, ...desktopEntries].join(", ");
}

interface HeroSlideshowClientProps {
  slug: string;
  maxPhotos: number;
  serverPhotos?: EmbedPhoto[];
  order: NonNullable<HeroSlideshowProps["order"]>;
  /** The page view's random number; without one (the editor) the gallery's order is kept. */
  seed?: number;
  blockId?: string;
  height: string;
  phoneHeight: string;
  aspectRatio: "none" | "16:9" | "3:2" | "4:3" | "1:1";
  autoPlay: boolean;
  interval: number;
  pauseOnHover: boolean;
  transitionDuration: number;
  showArrows: boolean;
  showDots: boolean;
  keysAndSwipe: boolean;
  /** In the editor the arrow keys are left alone, so they don't change the photo while you work. */
  editing: boolean;
  fullBleed: boolean;
  maxWidth: string;
  objectFit: "cover" | "contain";
  overlayOpacity: number;
}

/** How far a finger must travel sideways, in px, for a swipe to change the photo. */
const SWIPE_MIN = 50;

/** True when a key press belongs to something else: a field being typed in, or an open dialog such as the lightbox. */
function keyIsTaken(e: KeyboardEvent): boolean {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return true;
  const t = e.target;
  if (t instanceof Element && t.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")) return true;
  // Only a dialog that is showing: one that stays on the page while closed doesn't count.
  return Array.from(document.querySelectorAll("[aria-modal='true']")).some(isShowing);
}

function isShowing(el: Element): boolean {
  if (typeof el.checkVisibility === "function") return el.checkVisibility({ visibilityProperty: true });
  return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
}

/** Whether at least half of `el` (or of the screen, for one taller than it) is in view. */
function mostlyOnScreen(el: Element): boolean {
  const r = el.getBoundingClientRect();
  const shown = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
  return r.height > 0 && shown >= Math.min(r.height, window.innerHeight) / 2;
}

function HeroSlideshowClient({
  slug,
  maxPhotos,
  serverPhotos,
  order,
  seed,
  blockId,
  height,
  phoneHeight,
  aspectRatio,
  autoPlay,
  interval,
  pauseOnHover,
  transitionDuration,
  showArrows,
  showDots,
  keysAndSwipe,
  editing,
  fullBleed,
  maxWidth,
  objectFit,
  overlayOpacity,
}: HeroSlideshowClientProps) {
  const isPriority = useImagePriority();
  const [fetchedPhotos, setFetchedPhotos] = useState<EmbedPhoto[]>([]);
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  // Counts changes made by hand; autoplay restarts its timer on each, so the chosen photo gets a full interval.
  const [handMoves, setHandMoves] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (serverPhotos) return;
    let cancelled = false;
    fetch(`/api/photos?gallerySlug=${slug}`)
      .then((r) => r.json())
      .then((data: EmbedPhoto[]) => { if (!cancelled) setFetchedPhotos(data.slice(0, maxPhotos)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug, maxPhotos, serverPhotos]);

  // The server may load more for another block on the page (lib/puck/gallery-photos).
  const loaded = serverPhotos ? serverPhotos.slice(0, maxPhotos || undefined) : fetchedPhotos;
  const photos = orderSlides(loaded, order, seed, blockId);

  useEffect(() => {
    if (!autoPlay || photos.length < 2) return;
    if (pauseOnHover && isHovered) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % photos.length);
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [autoPlay, interval, pauseOnHover, isHovered, photos.length, handMoves]);

  const count = photos.length;
  const goTo = useCallback((i: number) => {
    setCurrent(i);
    setHandMoves((n) => n + 1);
  }, []);
  const step = useCallback((delta: number) => {
    setCurrent((c) => (c + delta + count) % count);
    setHandMoves((n) => n + 1);
  }, [count]);
  const prev = () => step(-1);
  const next = () => step(1);

  const keysOn = keysAndSwipe && !editing && count > 1;
  const swipeOn = keysAndSwipe && count > 1;

  useEffect(() => {
    if (!keysOn) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (!boxRef.current || keyIsTaken(e)) return;
      // A slideshow with focus in it answers; otherwise the first one mostly on screen, so two on a page don't both move.
      const focused = document.activeElement?.closest("[data-slideshow-keys]");
      const answering = focused ?? Array.from(document.querySelectorAll("[data-slideshow-keys]")).find(mostlyOnScreen);
      if (answering !== boxRef.current) return;
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keysOn, step]);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || e.touches.length > 0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Mostly sideways only, so scrolling the page past the slideshow never changes the photo.
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    step(dx < 0 ? 1 : -1);
  };

  const fullBleedStyle: React.CSSProperties = fullBleed
    ? { marginLeft: "calc(-50vw + 50%)", marginRight: "calc(-50vw + 50%)", width: "100vw" }
    : { width: maxWidth, marginLeft: "auto", marginRight: "auto" };

  const widthVw = fullBleed ? 100 : parseFloat(maxWidth) || 100;
  const desktopBox = slideshowBox(height, aspectRatio === "none" ? "" : aspectRatio, widthVw);
  const phoneBox = phoneHeight ? slideshowBox(phoneHeight, /^\d+:\d+$/.test(phoneHeight) ? phoneHeight : "", widthVw) : null;
  const containerStyle = {
    ...fullBleedStyle,
    "--ss-h": desktopBox.height,
    "--ss-ar": desktopBox.aspect,
    "--ss-min-h": desktopBox.minHeight,
    "--ss-h-phone": (phoneBox ?? desktopBox).height,
    "--ss-ar-phone": (phoneBox ?? desktopBox).aspect,
    "--ss-min-h-phone": (phoneBox ?? desktopBox).minHeight,
  } as React.CSSProperties;
  const boxClass =
    "[height:var(--ss-h)] [aspect-ratio:var(--ss-ar)] [min-height:var(--ss-min-h)] max-sm:[height:var(--ss-h-phone)] max-sm:[aspect-ratio:var(--ss-ar-phone)] max-sm:[min-height:var(--ss-min-h-phone)]";

  if (photos.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-neutral-100 text-neutral-400 ${boxClass}`}
        style={containerStyle}
      >
        No photos found in this gallery
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      role="region"
      aria-roledescription="slideshow"
      aria-label="Slideshow"
      tabIndex={keysOn ? 0 : undefined}
      data-slideshow-keys={keysOn ? "" : undefined}
      className={`relative overflow-hidden ${boxClass} ${keysOn ? "focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white" : ""} ${swipeOn ? "[touch-action:pan-y_pinch-zoom]" : ""}`}
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={swipeOn ? onTouchStart : undefined}
      onTouchEnd={swipeOn ? onTouchEnd : undefined}
      onTouchCancel={swipeOn ? () => { touchStart.current = null; } : undefined}
    >
      {photos.map((photo, i) => {
        const source = optimizedSource(photo.url, slideSizes(photo, objectFit, desktopBox, phoneBox), photo);
        return (
          <div
            key={photo.id}
            aria-hidden={i !== current}
            className="absolute inset-0"
            style={{
              opacity: i === current ? 1 : 0,
              transition: `opacity ${transitionDuration}ms ease-in-out`,
              zIndex: i === current ? 1 : 0,
            }}
          >
            <img
              src={source.src}
              srcSet={source.srcSet}
              sizes={source.sizes}
              alt={photo.title ?? ""}
              className="h-full w-full opacity-0 transition-opacity duration-300"
              style={{ objectFit, objectPosition: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%` }}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 && isPriority ? "high" : undefined}
              ref={(el) => { if (el?.complete) el.classList.remove("opacity-0"); }}
              onLoad={(e) => { (e.target as HTMLImageElement).classList.remove("opacity-0"); }}
            />
          </div>
        );
      })}
      {overlayOpacity > 0 && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity / 100})`, zIndex: 2 }}
        />
      )}
      {showArrows && photos.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
            style={{ zIndex: 3 }}
          >
            ‹
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
            style={{ zIndex: 3 }}
          >
            ›
          </button>
        </>
      )}
      {showDots && photos.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"
          style={{ zIndex: 3 }}
        >
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="h-2 w-2 rounded-full transition-colors"
              style={{ backgroundColor: i === current ? "white" : "rgba(255,255,255,0.45)" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ----- Carousel slide editor -----

function CarouselSlideEditor({ value, onChange }: { value: CarouselSlide[]; onChange: (v: CarouselSlide[]) => void }) {
  const slides = value ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const addSlide = (type: CarouselSlide["type"]) => {
    const newSlide: CarouselSlide = {
      id: crypto.randomUUID(),
      type,
      imageUrl: "",
      title: "",
      subtitle: "",
      bgColor: "#f5f5f5",
      textColor: "#171717",
      linkUrl: "",
    };
    onChange([...slides, newSlide]);
    setExpandedId(newSlide.id);
  };

  const addFromGallery = (photos: { url: string; title: string; gallerySlug: string }[]) => {
    const newSlides: CarouselSlide[] = photos.map((p) => ({
      id: crypto.randomUUID(),
      type: "image",
      imageUrl: p.url,
      title: p.title,
      subtitle: "",
      bgColor: "#f5f5f5",
      textColor: "#171717",
      linkUrl: p.gallerySlug ? `/gallery/${p.gallerySlug}` : "",
    }));
    onChange([...slides, ...newSlides]);
  };

  const updateSlide = (id: string, patch: Partial<CarouselSlide>) => {
    onChange(slides.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSlide = (id: string) => {
    onChange(slides.filter((s) => s.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const moveSlide = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= slides.length) return;
    const updated = [...slides];
    [updated[index], updated[next]] = [updated[next], updated[index]];
    onChange(updated);
  };

  const typeLabels: Record<CarouselSlide["type"], string> = { image: "Image", text: "Text", mixed: "Image + Text" };

  return (
    <div className="space-y-2">
      {slides.map((slide, i) => (
        <div key={slide.id} className="rounded border border-neutral-200 bg-white">
          <div className="flex items-center gap-1 px-2 py-1.5 text-sm">
            <button onClick={() => moveSlide(i, -1)} disabled={i === 0} className="px-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30" title="Move up">&#8593;</button>
            <button onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1} className="px-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30" title="Move down">&#8595;</button>
            <button onClick={() => setExpandedId(expandedId === slide.id ? null : slide.id)} className="flex-1 text-left font-medium truncate">
              {typeLabels[slide.type]} {i + 1}{slide.title ? `: ${slide.title}` : ""}
            </button>
            <button onClick={() => removeSlide(slide.id)} className="px-1 text-red-400 hover:text-red-600" title="Remove">&times;</button>
          </div>
          {expandedId === slide.id && (
            <div className="space-y-2 border-t border-neutral-100 px-2 py-2">
              <div>
                <label className="text-xs font-medium text-neutral-500">Type</label>
                <select
                  value={slide.type}
                  onChange={(e) => updateSlide(slide.id, { type: e.target.value as CarouselSlide["type"] })}
                  className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                >
                  <option value="image">Image</option>
                  <option value="text">Text</option>
                  <option value="mixed">Image + Text</option>
                </select>
              </div>
              {(slide.type === "image" || slide.type === "mixed") && (
                <div>
                  <label className="text-xs font-medium text-neutral-500">Image</label>
                  <ImagePicker value={slide.imageUrl} onChange={(url) => updateSlide(slide.id, { imageUrl: url })} />
                </div>
              )}
              {(slide.type === "image" || slide.type === "mixed") && (
                <div>
                  <label className="text-xs font-medium text-neutral-500">Link on click</label>
                  <input
                    type="text"
                    value={slide.linkUrl ?? ""}
                    onChange={(e) => updateSlide(slide.id, { linkUrl: e.target.value })}
                    placeholder="/gallery/some-slug or https://…"
                    className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                  />
                  <div className="mt-1">
                    <CarouselLinkGalleryHelper onPick={(slug) => updateSlide(slide.id, { linkUrl: `/gallery/${slug}` })} />
                  </div>
                </div>
              )}
              {(slide.type === "text" || slide.type === "mixed") && (
                <>
                  <div>
                    <label className="text-xs font-medium text-neutral-500">Title</label>
                    <input type="text" value={slide.title} onChange={(e) => updateSlide(slide.id, { title: e.target.value })} className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500">Subtitle</label>
                    <input type="text" value={slide.subtitle} onChange={(e) => updateSlide(slide.id, { subtitle: e.target.value })} className="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-neutral-500">Background</span>
                    <div className="mt-1">
                      <ColorControl value={slide.bgColor} onChange={(v) => updateSlide(slide.id, { bgColor: v })} />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-neutral-500">Text Color</span>
                    <div className="mt-1">
                      <ColorControl value={slide.textColor} onChange={(v) => updateSlide(slide.id, { textColor: v })} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}
      <div className="flex gap-1">
        <button onClick={() => addSlide("image")} className="flex-1 rounded border border-dashed border-neutral-300 px-2 py-1.5 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-700">+ Image</button>
        <button onClick={() => addSlide("text")} className="flex-1 rounded border border-dashed border-neutral-300 px-2 py-1.5 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-700">+ Text</button>
        <button onClick={() => addSlide("mixed")} className="flex-1 rounded border border-dashed border-neutral-300 px-2 py-1.5 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-700">+ Mixed</button>
      </div>
      <button
        onClick={() => setPickerOpen(true)}
        className="w-full rounded border border-dashed border-neutral-300 px-2 py-1.5 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
      >
        + From Gallery (bulk)
      </button>
      <GalleryPhotoMultiPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={addFromGallery}
        title="Add slides from gallery"
        confirmLabel={(n) => (n === 1 ? "Add 1 slide" : `Add ${n} slides`)}
      />
    </div>
  );
}

function CarouselLinkGalleryHelper({ onPick }: { onPick: (slug: string) => void }) {
  const [galleries, setGalleries] = useState<GalleryOption[]>([]);
  useEffect(() => {
    fetch("/api/galleries")
      .then((r) => r.json())
      .then((data: GalleryOption[]) => setGalleries(data))
      .catch(() => setGalleries([]));
  }, []);
  return (
    <select
      value=""
      onChange={(e) => { if (e.target.value) onPick(e.target.value); }}
      className="w-full rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-500"
    >
      <option value="">Pick a gallery…</option>
      {galleries.map((g) => (
        <option key={g.id} value={g.slug}>{g.title}</option>
      ))}
    </select>
  );
}

// ----- Carousel client renderer -----

function CarouselClient({
  slides,
  slideTitleStyle,
  slideSubtitleStyle,
  slidesPerView,
  gap,
  aspectRatio,
  height,
  transition,
  transitionDuration,
  autoPlay,
  interval,
  pauseOnHover,
  showArrows,
  showDots,
  objectFit,
  borderRadius,
  initialSlide,
}: CarouselProps) {
  const initialIndex = Math.max(0, Math.min(slides.length - 1, (initialSlide ?? 1) - 1));
  const [current, setCurrent] = useState(initialIndex);
  const [isHovered, setIsHovered] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef(0);
  // Bumped whenever the user navigates (wheel, drag, swipe, arrow, dot). Autoplay
  // skips ticks within USER_INTERACTION_PAUSE_MS of the last interaction so it
  // doesn't fight the user.
  const lastInteractionRef = useRef(0);
  const fadeDragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    pointerId: 0,
    axis: null as null | "h" | "v",
    captured: false,
  });

  useEffect(() => { currentRef.current = current; }, [current]);
  const markInteraction = useCallback(() => { lastInteractionRef.current = Date.now(); }, []);

  const totalSlides = slides.length;
  const fadeMaxIndex = totalSlides - 1;
  // Infinite scroll: only viable when slide mode has more slides than fit on
  // screen. We render three back-to-back copies and silently teleport between
  // them once scrolling settles, so the user always perceives an endless reel.
  const loopEnabled = transition === "slide" && totalSlides > slidesPerView;

  const aspectFraction = (() => {
    if (aspectRatio === "none") return null;
    const [w, h] = aspectRatio.split(":").map(Number);
    if (!w || !h) return null;
    return { num: w, den: h };
  })();
  const aspectSlideWidth = aspectFraction
    ? `calc(${height} * ${aspectFraction.num} / ${aspectFraction.den})`
    : null;

  // ---- Slide-mode transform engine ----
  // Reel positioned via translate3d(-x, 0, 0), bypassing scrollLeft's integer
  // pixel quantization. All inputs (wheel, drag, arrow, autoplay, dot) write
  // into targetX; a single rAF loop lerps currentX toward targetX. Drag-during
  // writes both directly for 1:1 cursor follow. For infinite loop we render two
  // copies of the slide list and apply the transform modulo loopWidth — pixel
  // content at x and x+loopWidth is identical, so the wrap is invisible.
  const reelRef = useRef<HTMLDivElement>(null);
  const currentXRef = useRef(0);
  const targetXRef = useRef(0);
  const rafRef = useRef(0);
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startCursorX: 0,
    startX: 0,
    startTime: 0,
    captured: false,
  });
  const dragSamplesRef = useRef<{ t: number; x: number }[]>([]);
  const dimsRef = useRef({ slotWidth: 0, slotPitch: 0, loopWidth: 0, viewportW: 0, maxX: 0 });
  const [slotWidthPx, setSlotWidthPx] = useState(0);
  // Set true once a pointer drag exceeds CLICK_SLOP px so the synthetic click
  // that fires after pointerup can be suppressed (otherwise every swipe on a
  // linked slide would also navigate). Reset on each pointerdown.
  const dragMovedRef = useRef(false);
  const CLICK_SLOP = 5;
  // One-shot: center on initialSlide the first time dimensions resolve. We
  // skip on later recomputes so resizing the window doesn't yank the user
  // back to the configured starting slide.
  const initialCenteredRef = useRef(false);

  const applyTransform = useCallback(() => {
    const reel = reelRef.current;
    const dims = dimsRef.current;
    if (!reel) return;
    const x = currentXRef.current;
    let displayX = x;
    if (loopEnabled && dims.loopWidth > 0) {
      displayX = ((x % dims.loopWidth) + dims.loopWidth) % dims.loopWidth;
    }
    reel.style.transform = `translate3d(${-displayX}px, 0, 0)`;
    if (totalSlides > 0 && dims.slotPitch > 0) {
      const raw = Math.round(displayX / dims.slotPitch);
      const mod = ((raw % totalSlides) + totalSlides) % totalSlides;
      if (mod !== currentRef.current) {
        currentRef.current = mod;
        setCurrent(mod);
      }
    }
  }, [loopEnabled, totalSlides]);

  const stepRaf = useCallback(() => {
    rafRef.current = 0;
    const dims = dimsRef.current;
    if (dims.slotPitch <= 0) return;
    const t = targetXRef.current;
    let c = currentXRef.current;
    const diff = t - c;
    const LERP = 0.1;
    const STOP = 0.05;
    if (Math.abs(diff) < STOP) {
      c = t;
    } else {
      c += diff * LERP;
    }
    if (!loopEnabled) {
      if (c < 0) { c = 0; if (targetXRef.current < 0) targetXRef.current = 0; }
      else if (c > dims.maxX) { c = dims.maxX; if (targetXRef.current > dims.maxX) targetXRef.current = dims.maxX; }
    }
    currentXRef.current = c;
    applyTransform();
    if (Math.abs(targetXRef.current - currentXRef.current) >= STOP) {
      rafRef.current = requestAnimationFrame(stepRaf);
    }
  }, [loopEnabled, applyTransform]);

  const requestStep = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(stepRaf);
  }, [stepRaf]);

  const cancelStep = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  // Compute slot/loop dimensions from the current viewport size; rerun on resize.
  useEffect(() => {
    if (transition !== "slide") return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const recompute = () => {
      const containerW = wrapper.clientWidth;
      const containerH = wrapper.clientHeight;
      let slotWidth: number;
      if (aspectFraction) {
        slotWidth = containerH * (aspectFraction.num / aspectFraction.den);
      } else {
        slotWidth = (containerW - (slidesPerView - 1) * gap) / slidesPerView;
      }
      if (!Number.isFinite(slotWidth) || slotWidth <= 0) return;
      const slotPitch = slotWidth + gap;
      const loopWidth = totalSlides * slotPitch;
      const maxX = Math.max(0, totalSlides * slotPitch - gap - containerW);
      dimsRef.current = { slotWidth, slotPitch, loopWidth, viewportW: containerW, maxX };
      setSlotWidthPx(slotWidth);
      if (!initialCenteredRef.current && totalSlides > 0) {
        // Center the configured initial slide in the viewport. For non-loop
        // we clamp so the reel never starts past its rightmost valid offset.
        let x = initialIndex * slotPitch + slotWidth / 2 - containerW / 2;
        if (!loopEnabled) x = Math.max(0, Math.min(maxX, x));
        currentXRef.current = x;
        targetXRef.current = x;
        initialCenteredRef.current = true;
      }
      applyTransform();
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(wrapper);
    return () => ro.disconnect();
    // aspectFraction is recomputed each render but determined by aspectRatio + height.
  }, [transition, totalSlides, slidesPerView, gap, aspectRatio, height, applyTransform, aspectFraction, initialIndex, loopEnabled]);

  // Slide-mode wheel: vertical wheels translate to horizontal target motion.
  // Continuous wheeling keeps adding to target; current lerps toward it. Stop
  // wheeling = the lerp coasts to a smooth stop with no abrupt cutoff.
  useEffect(() => {
    if (transition !== "slide") return;
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 1) return;
      e.preventDefault();
      // GAIN: target-px per wheel-px. Tuned so a single notch (~100px delta)
      // displaces ~half a viewport — matches the prior inertia model's feel.
      const GAIN = 5;
      targetXRef.current += delta * GAIN;
      lastInteractionRef.current = Date.now();
      requestStep();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [transition, requestStep]);

  // Slide-mode pointer drag (mouse + touch via Pointer Events). With
  // touch-action: pan-y on the viewport, the browser handles vertical-scroll
  // touches natively — we only see pointer events for horizontal drags, so no
  // axis detection is needed here. Drag-during is 1:1 cursor follow; release
  // computes velocity from a recent sample window and projects it onto a
  // target-X offset that the lerp loop coasts toward.
  const onSlidePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (transition !== "slide") return;
    if ((e.target as HTMLElement).closest("button")) return;
    const now = Date.now();
    cancelStep();
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startCursorX: e.clientX,
      startX: currentXRef.current,
      startTime: now,
      captured: false,
    };
    dragSamplesRef.current = [{ t: now, x: e.clientX }];
    dragMovedRef.current = false;
    lastInteractionRef.current = now;
    // Capture is deferred to first significant move so plain clicks aren't
    // retargeted to the wrapper (which would swallow anchor navigation).
  };

  const onSlidePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ds = dragRef.current;
    if (!ds.active || e.pointerId !== ds.pointerId) return;
    const dx = e.clientX - ds.startCursorX;
    if (Math.abs(dx) > CLICK_SLOP) {
      dragMovedRef.current = true;
      if (!ds.captured) {
        try { e.currentTarget.setPointerCapture(e.pointerId); ds.captured = true; } catch {}
        if (e.pointerType === "mouse") e.currentTarget.style.cursor = "grabbing";
      }
    }
    // Cursor right (dx > 0) → content right → x decreases.
    const newX = ds.startX - dx;
    currentXRef.current = newX;
    targetXRef.current = newX;
    applyTransform();
    const now = Date.now();
    const samples = dragSamplesRef.current;
    samples.push({ t: now, x: e.clientX });
    while (samples.length > 1 && samples[0].t < now - 80) samples.shift();
  };

  const onSlidePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const ds = dragRef.current;
    if (e.pointerId !== ds.pointerId) return;
    const wasActive = ds.active;
    ds.active = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    if (e.pointerType === "mouse") e.currentTarget.style.cursor = "";
    if (!wasActive) return;
    const samples = dragSamplesRef.current;
    if (samples.length >= 2) {
      const newest = samples[samples.length - 1];
      const oldest = samples[0];
      const dt = newest.t - oldest.t;
      if (dt > 5) {
        const cursorVel = (newest.x - oldest.x) / dt; // px/ms, positive = right
        const scrollVel = -cursorVel;
        // Project release velocity onto a target offset matching the prior
        // inertia distance: dist ≈ v / (1 - friction) * frameTime.
        const INERTIA_FACTOR = 250;
        targetXRef.current += scrollVel * INERTIA_FACTOR;
        requestStep();
      }
    }
    dragSamplesRef.current = [];
  };

  // Fade mode: any wheel direction navigates prev/next, throttled.
  useEffect(() => {
    if (transition !== "fade") return;
    const el = wrapperRef.current;
    if (!el) return;
    let lastNav = 0;
    const onWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 1) return;
      e.preventDefault();
      const now = Date.now();
      if (now - lastNav < 350) return;
      lastNav = now;
      lastInteractionRef.current = now;
      if (delta > 0) setCurrent((c) => (c >= fadeMaxIndex ? 0 : c + 1));
      else setCurrent((c) => (c <= 0 ? fadeMaxIndex : c - 1));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [transition, fadeMaxIndex]);

  // Autoplay: scroll-snap step in slide mode; index increment in fade mode.
  // `current` deliberately not in deps — reading it from currentRef avoids
  // tearing down/recreating the interval on every navigation. User interactions
  // bump lastInteractionRef and the tick skips while the user is active.
  useEffect(() => {
    if (!autoPlay) return;
    if (pauseOnHover && isHovered) return;
    if (transition === "slide" && totalSlides <= slidesPerView) return;
    if (transition === "fade" && totalSlides <= 1) return;
    const USER_INTERACTION_PAUSE_MS = 5000;
    const tick = () => {
      if (Date.now() - lastInteractionRef.current < USER_INTERACTION_PAUSE_MS) return;
      if (transition === "slide") {
        const dims = dimsRef.current;
        if (dims.slotPitch <= 0) return;
        if (loopEnabled) {
          targetXRef.current += dims.slotPitch;
        } else {
          const next = targetXRef.current + dims.slotPitch;
          targetXRef.current = next > dims.maxX ? 0 : next;
        }
        requestStep();
      } else {
        setCurrent((c) => (c >= fadeMaxIndex ? 0 : c + 1));
      }
    };
    const timer = setInterval(tick, interval * 1000);
    return () => clearInterval(timer);
  }, [autoPlay, interval, pauseOnHover, isHovered, transition, totalSlides, slidesPerView, fadeMaxIndex, loopEnabled, requestStep]);

  // Fade mode pointer-based swipe: direction detection only (no live drag offset)
  const onFadePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (transition !== "fade") return;
    if (totalSlides <= 1) return;
    if ((e.target as HTMLElement).closest("button")) return;
    const now = Date.now();
    fadeDragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startTime: now,
      pointerId: e.pointerId,
      axis: null,
      captured: false,
    };
    dragMovedRef.current = false;
    lastInteractionRef.current = now;
    // Capture deferred to first significant move (see slide-mode rationale).
  };
  const onFadePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ds = fadeDragRef.current;
    if (!ds.active || e.pointerId !== ds.pointerId) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (Math.abs(dx) > CLICK_SLOP || Math.abs(dy) > CLICK_SLOP) {
      dragMovedRef.current = true;
      if (!ds.captured) {
        try { e.currentTarget.setPointerCapture(e.pointerId); ds.captured = true; } catch {}
      }
    }
    if (ds.axis === null && (Math.abs(dx) >= 5 || Math.abs(dy) >= 5)) {
      ds.axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (ds.axis === "v") ds.active = false;
    }
  };
  const onFadePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const ds = fadeDragRef.current;
    if (e.pointerId !== ds.pointerId) return;
    if (!ds.active || ds.axis !== "h") {
      ds.active = false;
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      return;
    }
    const delta = e.clientX - ds.startX;
    const elapsed = Date.now() - ds.startTime;
    ds.active = false;
    const containerWidth = e.currentTarget.offsetWidth || 1;
    if (Math.abs(delta) > containerWidth * 0.15 || (elapsed < 250 && Math.abs(delta) > 30)) {
      if (delta < 0) setCurrent((c) => (c >= fadeMaxIndex ? 0 : c + 1));
      else setCurrent((c) => (c <= 0 ? fadeMaxIndex : c - 1));
    }
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  // Navigation helpers (mode-aware). Slide mode shifts targetX by one slot
  // pitch; the engine lerps current to target with a smooth ease-out.
  const stepSlide = (dir: -1 | 1) => {
    const dims = dimsRef.current;
    if (dims.slotPitch <= 0) return;
    targetXRef.current += dir * dims.slotPitch;
    requestStep();
  };
  // Dot click in slide mode: pick the nearest copy of slide N relative to the
  // current position so the lerp never has to chase across a wrap boundary.
  const scrollToSlideIndex = (modIdx: number) => {
    const dims = dimsRef.current;
    if (dims.slotPitch <= 0 || totalSlides <= 0) return;
    if (!loopEnabled) {
      targetXRef.current = modIdx * dims.slotPitch;
      requestStep();
      return;
    }
    const lw = dims.loopWidth;
    const baseCopy = Math.floor(currentXRef.current / lw);
    const candidates = [
      (baseCopy * totalSlides + modIdx) * dims.slotPitch,
      ((baseCopy + 1) * totalSlides + modIdx) * dims.slotPitch,
      ((baseCopy - 1) * totalSlides + modIdx) * dims.slotPitch,
    ];
    let best = candidates[0];
    let bestDist = Math.abs(best - currentXRef.current);
    for (let i = 1; i < candidates.length; i++) {
      const d = Math.abs(candidates[i] - currentXRef.current);
      if (d < bestDist) { best = candidates[i]; bestDist = d; }
    }
    targetXRef.current = best;
    requestStep();
  };
  const handlePrev = () => {
    markInteraction();
    if (transition === "slide") stepSlide(-1);
    else setCurrent((c) => (c <= 0 ? fadeMaxIndex : c - 1));
  };
  const handleNext = () => {
    markInteraction();
    if (transition === "slide") stepSlide(1);
    else setCurrent((c) => (c >= fadeMaxIndex ? 0 : c + 1));
  };

  if (totalSlides === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded bg-neutral-100 text-neutral-400">
        Add slides to the carousel
      </div>
    );
  }

  const wrapWithLink = (slide: CarouselSlide, content: React.ReactNode) => {
    const href = slide.linkUrl?.trim();
    if (!href) return content;
    const isExternal = /^https?:\/\//i.test(href);
    const onClick = (e: React.MouseEvent) => {
      // Suppress nav if the click was the tail end of a swipe/drag.
      if (dragMovedRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const className = "block h-full w-full";
    if (isExternal) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className} draggable={false}>
          {content}
        </a>
      );
    }
    return (
      <NextLink href={href} onClick={onClick} className={className} draggable={false}>
        {content}
      </NextLink>
    );
  };

  const renderSlideContent = (slide: CarouselSlide, index: number) => {
    const slideStyle: React.CSSProperties = {
      borderRadius: `${borderRadius}px`,
      overflow: "hidden",
      height: "100%",
      width: "100%",
    };

    if (slide.type === "image") {
      return wrapWithLink(slide, (
        <div className="relative" style={slideStyle}>
          {slide.imageUrl ? (
            <img
              src={slide.imageUrl}
              alt={slide.title || ""}
              className="h-full w-full opacity-0 transition-opacity duration-300"
              style={{ objectFit, borderRadius: `${borderRadius}px` }}
              loading={index < slidesPerView ? "eager" : "lazy"}
              draggable={false}
              ref={(el) => { if (el?.complete) el.classList.remove("opacity-0"); }}
              onLoad={(e) => { (e.target as HTMLImageElement).classList.remove("opacity-0"); }}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-neutral-100 text-neutral-400 text-sm">No image</div>
          )}
        </div>
      ));
    }

    if (slide.type === "text") {
      return (
        <div
          className="flex flex-col items-center justify-center p-6 text-center"
          style={{ ...slideStyle, backgroundColor: cssColor(slide.bgColor), color: cssColor(slide.textColor) }}
        >
          {slide.title && <h3 className="mb-2" style={textStyleCss(slideTitleStyle, "collectionTitle", { withColor: false })}>{slide.title}</h3>}
          {slide.subtitle && <p className="opacity-80" style={textStyleCss(slideSubtitleStyle, "body", { withColor: false })}>{slide.subtitle}</p>}
        </div>
      );
    }

    // mixed
    return wrapWithLink(slide, (
      <div className="relative" style={slideStyle}>
        {slide.imageUrl ? (
          <img
            src={slide.imageUrl}
            alt={slide.title || ""}
            className="h-full w-full opacity-0 transition-opacity duration-300"
            style={{ objectFit, borderRadius: `${borderRadius}px` }}
            loading={index < slidesPerView ? "eager" : "lazy"}
            draggable={false}
            ref={(el) => { if (el?.complete) el.classList.remove("opacity-0"); }}
            onLoad={(e) => { (e.target as HTMLImageElement).classList.remove("opacity-0"); }}
          />
        ) : (
          <div className="h-full w-full" style={{ backgroundColor: cssColor(slide.bgColor) }} />
        )}
        <div className="absolute inset-0 bg-black/30" style={{ borderRadius: `${borderRadius}px` }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center" style={{ color: cssColor(slide.textColor, "#fff") }}>
          {slide.title && <h3 className="mb-1" style={textStyleCss(slideTitleStyle, "collectionTitle", { withColor: false })}>{slide.title}</h3>}
          {slide.subtitle && <p className="opacity-90" style={textStyleCss(slideSubtitleStyle, "body", { withColor: false })}>{slide.subtitle}</p>}
        </div>
      </div>
    ));
  };

  // Fade mode: cross-fade slides
  if (transition === "fade") {
    return (
      <div
        ref={wrapperRef}
        className="relative overflow-hidden"
        style={{
          height,
          width: aspectSlideWidth ?? "100%",
          marginInline: aspectSlideWidth ? "auto" : undefined,
          borderRadius: `${borderRadius}px`,
          touchAction: totalSlides > 1 ? "pan-y" : undefined,
          userSelect: totalSlides > 1 ? "none" : undefined,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onPointerDown={onFadePointerDown}
        onPointerMove={onFadePointerMove}
        onPointerUp={onFadePointerUp}
        onPointerCancel={onFadePointerUp}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className="absolute inset-0"
            style={{
              opacity: i === current ? 1 : 0,
              transition: `opacity ${transitionDuration}ms ease-in-out`,
              zIndex: i === current ? 1 : 0,
            }}
          >
            {renderSlideContent(slide, i)}
          </div>
        ))}
        {showArrows && totalSlides > 1 && (
          <>
            <button onClick={handlePrev} aria-label="Previous slide" className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors" style={{ zIndex: 3 }}>&#8249;</button>
            <button onClick={handleNext} aria-label="Next slide" className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors" style={{ zIndex: 3 }}>&#8250;</button>
          </>
        )}
        {showDots && totalSlides > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 3 }}>
            {slides.map((_, i) => (
              <button key={i} onClick={() => { markInteraction(); setCurrent(i); }} aria-label={`Go to slide ${i + 1}`} className="h-2 w-2 rounded-full transition-colors" style={{ backgroundColor: i === current ? "white" : "rgba(255,255,255,0.45)" }} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Slide mode: overflow-hidden viewport with a transform-driven reel. Two
  // copies of the slide list when looping (visual wrap is seamless via
  // modular transform). All slot widths are explicit pixel values from the
  // ResizeObserver-driven dimension state.
  const renderedSlides = loopEnabled ? [...slides, ...slides] : slides;

  return (
    <div className="relative w-full">
      <div
        ref={wrapperRef}
        className="relative overflow-hidden w-full"
        style={{
          height,
          cursor: "grab",
          userSelect: "none",
          touchAction: "pan-y",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onPointerDown={onSlidePointerDown}
        onPointerMove={onSlidePointerMove}
        onPointerUp={onSlidePointerUp}
        onPointerCancel={onSlidePointerUp}
      >
        <div
          ref={reelRef}
          style={{
            display: "flex",
            flexDirection: "row",
            gap: `${gap}px`,
            height: "100%",
            willChange: "transform",
            transform: "translate3d(0,0,0)",
          }}
        >
          {renderedSlides.map((slide, i) => (
            <div
              key={`${slide.id}-${i}`}
              className="carousel-slot"
              style={{
                flexShrink: 0,
                flexGrow: 0,
                height: "100%",
                width: slotWidthPx > 0 ? `${slotWidthPx}px` : 0,
              }}
            >
              {renderSlideContent(slide, i % totalSlides)}
            </div>
          ))}
        </div>
        {showArrows && totalSlides > slidesPerView && (
          <>
            <button onClick={handlePrev} aria-label="Previous slide" className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors" style={{ zIndex: 3 }}>&#8249;</button>
            <button onClick={handleNext} aria-label="Next slide" className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors" style={{ zIndex: 3 }}>&#8250;</button>
          </>
        )}
      </div>
      {showDots && totalSlides > slidesPerView && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button key={i} onClick={() => { markInteraction(); scrollToSlideIndex(i); }} aria-label={`Go to slide ${i + 1}`} className="h-2 w-2 rounded-full transition-colors" style={{ backgroundColor: i === current ? "#171717" : "#d4d4d4" }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ----- Carousel gallery source wrapper -----

function CarouselGallerySource({
  slug,
  maxPhotos,
  serverPhotos,
  carouselProps,
}: {
  slug: string;
  maxPhotos: number;
  serverPhotos?: EmbedPhoto[];
  carouselProps: CarouselProps;
}) {
  const [fetched, setFetched] = useState<EmbedPhoto[]>([]);

  useEffect(() => {
    if (serverPhotos) return;
    let cancelled = false;
    fetch(`/api/photos?gallerySlug=${slug}`)
      .then((r) => r.json())
      .then((data: EmbedPhoto[]) => {
        if (!cancelled) setFetched(data.slice(0, maxPhotos));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug, maxPhotos, serverPhotos]);

  const photos = (serverPhotos ?? fetched).slice(0, maxPhotos);

  const overrides = carouselProps.slideLinkOverrides ?? {};
  const slides: CarouselSlide[] = photos.map((p) => ({
    id: p.id,
    type: "image",
    imageUrl: p.url,
    title: p.title ?? "",
    subtitle: "",
    bgColor: "#f5f5f5",
    textColor: "#171717",
    linkUrl: overrides[p.id]?.trim() || `/gallery/${slug}`,
  }));

  return <CarouselClient {...carouselProps} slides={slides} />;
}

// ----- Per-photo link overrides editor (gallery-source carousels) -----

function CarouselGalleryLinkOverridesEditor({
  value,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const puck = usePuck();
  const props = (puck.selectedItem?.props ?? {}) as Partial<CarouselProps>;
  const gallerySlug = props.gallerySlug ?? "";
  const sourceMode = props.sourceMode ?? "manual";
  const maxPhotos = props.maxPhotos ?? 0;
  const [photos, setPhotos] = useState<{ id: string; url: string; thumbnailUrl: string; title: string | null }[]>([]);
  const overrides = value ?? {};

  useEffect(() => {
    if (sourceMode !== "gallery" || !gallerySlug) { setPhotos([]); return; }
    let cancelled = false;
    fetch(`/api/photos?gallerySlug=${gallerySlug}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setPhotos(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [gallerySlug, sourceMode]);

  if (sourceMode !== "gallery") {
    return <p className="text-xs text-neutral-400">Only used in gallery-source mode. Switch sources or set links per slide in the manual editor above.</p>;
  }
  if (!gallerySlug) {
    return <p className="text-xs text-neutral-400">Pick a gallery first.</p>;
  }

  const display = maxPhotos > 0 ? photos.slice(0, maxPhotos) : photos;
  const setOverride = (id: string, url: string) => {
    const next = { ...overrides };
    if (url.trim()) next[id] = url;
    else delete next[id];
    onChange(next);
  };

  return (
    <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
      {display.length === 0 && <p className="text-xs text-neutral-400">Loading photos…</p>}
      {display.map((p) => (
        <div key={p.id} className="flex items-center gap-2">
          <img src={p.thumbnailUrl} alt="" className="h-9 w-9 flex-shrink-0 rounded object-cover" />
          <div className="flex flex-1 flex-col gap-1">
            <input
              type="text"
              value={overrides[p.id] ?? ""}
              onChange={(e) => setOverride(p.id, e.target.value)}
              placeholder={`Default: /gallery/${gallerySlug}`}
              className="w-full rounded border border-neutral-200 px-2 py-1 text-xs"
            />
            <CarouselLinkGalleryHelper onPick={(s) => setOverride(p.id, `/gallery/${s}`)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ----- Gallery embed renderer -----


export interface EmbedPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  filename: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  cameraSettings: { camera?: string; lens?: string; iso?: string; aperture?: string; shutter?: string } | null;
  takenAt?: Date | string | null;
  width: number;
  height: number;
  focalX: number;
  focalY: number;
}

const DEFAULT_LIGHTBOX: GlobalLightboxSettings = {
  metadataFields: ["title", "location"],
  cornerRadius: 0,
  captionPosition: "below",
  fadeSpeed: "medium",
  captionAlignment: "left",
} satisfies LightboxSettings;

interface GalleryEmbedRendererProps {
  slug: string;
  max: number;
  layout: "grid" | "masonry" | "hang";
  numbered: boolean;
  hangOffset: number;
  hangGap: number;
  columns: "2" | "3" | "4";
  tabletColumns?: TabletColumns;
  phoneColumns?: PhoneColumns;
  aspectRatio: GalleryAspect;
  gap: number;
  imageMaxWidth: number;
  borderRadius: number;
  showMetadata: boolean;
  metadataFields: string[];
  captionTitleStyle?: TextStyleValue;
  captionMetaStyle?: TextStyleValue;
  useGlobalLightbox: boolean;
  lightboxMetadataFields: string[] | null;
  lightboxCornerRadius: number | null;
  lightboxCaptionPosition: "below" | "overlay-top" | "overlay-bottom" | null;
  lightboxFadeSpeed: "none" | "fast" | "medium" | "slow" | null;
  lightboxCaptionAlignment: "left" | "center" | "right" | null;
  globalLightbox?: GlobalLightboxSettings;
  serverPhotos?: EmbedPhoto[];
}

const aspectRatioValues = GALLERY_ASPECT_CSS;

function GalleryEmbedRenderer({ slug, max, layout, columns, tabletColumns, phoneColumns, aspectRatio, gap, imageMaxWidth, borderRadius, showMetadata, metadataFields, numbered, hangOffset, hangGap, captionTitleStyle, captionMetaStyle, useGlobalLightbox, lightboxMetadataFields, lightboxCornerRadius, lightboxCaptionPosition, lightboxFadeSpeed, lightboxCaptionAlignment, globalLightbox, serverPhotos }: GalleryEmbedRendererProps) {
  const lbBase = globalLightbox ?? DEFAULT_LIGHTBOX;
  const lb: GlobalLightboxSettings = useGlobalLightbox ? lbBase : {
    metadataFields: lightboxMetadataFields ?? lbBase.metadataFields,
    cornerRadius: lightboxCornerRadius ?? lbBase.cornerRadius,
    captionPosition: (lightboxCaptionPosition ?? lbBase.captionPosition) as GlobalLightboxSettings["captionPosition"],
    fadeSpeed: (lightboxFadeSpeed ?? lbBase.fadeSpeed) as GlobalLightboxSettings["fadeSpeed"],
    captionAlignment: (lightboxCaptionAlignment ?? lbBase.captionAlignment) as GlobalLightboxSettings["captionAlignment"],
  };
  // Use server-provided photos on public pages; fall back to client fetch in admin editor
  const [fetchedPhotos, setFetchedPhotos] = useState<EmbedPhoto[]>([]);
  const [loading, setLoading] = useState(!serverPhotos);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const collectionTitle = useGalleryTitle(slug);

  useEffect(() => {
    if (serverPhotos) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/photos?gallerySlug=${slug}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setFetchedPhotos(data.slice(0, max));
      } catch {
        if (!cancelled) setFetchedPhotos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug, max, serverPhotos]);

  // The server loads as many as the hungriest block on the page wants (lib/puck/gallery-photos).
  const photos = serverPhotos ? (max > 0 ? serverPhotos.slice(0, max) : serverPhotos) : fetchedPhotos;

  if (loading) {
    return <div className="text-center text-neutral-400 py-8">Loading gallery...</div>;
  }

  if (photos.length === 0) {
    return <div className="text-center text-neutral-400 py-8">No photos found for &ldquo;{slug}&rdquo;</div>;
  }

  const gapStyle = { gap: `${gap}px` };
  const colCount = Number(columns) || 3;
  const gridCols = responsiveGrid(colCount, tabletColumns, phoneColumns);
  const masonryCols = responsiveColumns(colCount, tabletColumns, phoneColumns);

  const titleCss = textStyleCss(captionTitleStyle, "photoTitle");
  const metaCss = textStyleCss(captionMetaStyle, "meta");

  const renderPhotoMeta = (photo: EmbedPhoto, className = "mt-1.5 space-y-0.5") => {
    if (!showMetadata || metadataFields.length === 0) return null;
    return (
      <div className={className}>
        {metadataFields.includes("title") && photo.title && (
          <p style={titleCss}>{parseLinks(photo.title)}</p>
        )}
        {metadataFields.includes("filename") && photo.filename && (
          <p style={metaCss}>{photo.filename}</p>
        )}
        {metadataFields.includes("description") && photo.description && (
          <p style={metaCss}>{parseLinks(photo.description)}</p>
        )}
        {metadataFields.includes("location") && photo.location && (
          <p style={metaCss}>{parseLinks(photo.location)}</p>
        )}
        {metadataFields.includes("date") && photoDate(photo.takenAt) && (
          <p style={metaCss}>{photoDate(photo.takenAt)}</p>
        )}
        {metadataFields.includes("camera") && photo.cameraSettings && (
          <p style={metaCss}>
            {[photo.cameraSettings.camera, photo.cameraSettings.lens, photo.cameraSettings.aperture, photo.cameraSettings.shutter, photo.cameraSettings.iso ? `ISO ${photo.cameraSettings.iso}` : null].filter(Boolean).join(" \u00b7 ")}
          </p>
        )}
      </div>
    );
  };

  const arValue = aspectRatioValues[aspectRatio ?? "4:5"];

  const radius = borderRadius ?? 8;

  const photoCard = (photo: EmbedPhoto, index: number, useAspect: boolean) => (
    <div key={photo.id} style={{ maxWidth: imageMaxWidth }}>
      <button
        onClick={() => setLightboxIndex(index)}
        className="block w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-400"
        style={{ borderRadius: radius }}
      >
        {useAspect && arValue ? (
          <div className="relative overflow-hidden" style={{ aspectRatio: arValue, borderRadius: radius }}>
            <img
              src={photo.url}
              alt={photo.title ?? ""}
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300"
              style={{ objectPosition: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%` }}
              loading={index < 6 ? "eager" : "lazy"}
              ref={(el) => { if (el?.complete) el.classList.remove("opacity-0"); }}
              onLoad={(e) => { (e.target as HTMLImageElement).classList.remove("opacity-0"); }}
            />
          </div>
        ) : (
          <img
            src={photo.url}
            alt={photo.title ?? ""}
            width={photo.width}
            height={photo.height}
            className="w-full object-cover opacity-0 transition-opacity duration-300"
            style={{ borderRadius: radius, objectPosition: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%` }}
            loading={index < 6 ? "eager" : "lazy"}
            ref={(el) => { if (el?.complete) el.classList.remove("opacity-0"); }}
            onLoad={(e) => { (e.target as HTMLImageElement).classList.remove("opacity-0"); }}
          />
        )}
      </button>
      {renderPhotoMeta(photo)}
    </div>
  );

  // Hang: photos alternate between two columns, so they still read 1, 2, 3…
  // across; the right column starts lower. One column when the block is narrow.
  const hangItem = (photo: EmbedPhoto, index: number) => {
    const meta = renderPhotoMeta(photo, "min-w-0 space-y-0.5");
    return (
      <figure key={photo.id} style={{ margin: 0 }}>
        <button
          type="button"
          onClick={() => setLightboxIndex(index)}
          className="group block w-full cursor-zoom-in"
          style={{ borderRadius: radius }}
          aria-label={`Enlarge ${photo.title || "photograph"}`}
        >
          {arValue ? (
            <div className="relative overflow-hidden" style={{ aspectRatio: arValue, borderRadius: radius }}>
              <img
                src={photo.url}
                alt={photo.title ?? ""}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-[.88]"
                style={{ objectPosition: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%` }}
              />
            </div>
          ) : (
            <img
              src={photo.url}
              alt={photo.title ?? ""}
              width={photo.width}
              height={photo.height}
              loading="lazy"
              className="block h-auto w-full transition-opacity duration-300 group-hover:opacity-[.88]"
              style={{ borderRadius: radius }}
            />
          )}
        </button>
        {(meta || numbered) && (
          <figcaption
            className="flex items-start justify-between gap-6"
            style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--theme-color-rule, #e0dcd3)" }}
          >
            {meta ?? <span />}
            {numbered && <span style={{ ...metaCss, flexShrink: 0 }}>{index + 1 < 10 ? `0${index + 1}` : index + 1}</span>}
          </figcaption>
        )}
      </figure>
    );
  };

  if (layout === "hang") {
    const indexed = photos.map((photo, i) => ({ photo, i }));
    return (
      <>
        <div className="@container">
          <div className="flex flex-col @min-[40rem]:hidden" style={{ gap: hangGap }}>
            {indexed.map(({ photo, i }) => hangItem(photo, i))}
          </div>
          <div className="hidden items-start @min-[40rem]:flex" style={{ gap: `${gap}px` }}>
            <div className="flex min-w-0 flex-1 flex-col" style={{ gap: hangGap }}>
              {indexed.filter(({ i }) => i % 2 === 0).map(({ photo, i }) => hangItem(photo, i))}
            </div>
            <div className="flex min-w-0 flex-1 flex-col" style={{ gap: hangGap, paddingTop: hangOffset }}>
              {indexed.filter(({ i }) => i % 2 === 1).map(({ photo, i }) => hangItem(photo, i))}
            </div>
          </div>
        </div>
        <Lightbox photos={photos} selectedIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} settings={lb} collectionTitle={collectionTitle} />
      </>
    );
  }

  return (
    <div className="@container">
      {layout === "masonry" ? (
        <div className={masonryCols.className} style={{ ...masonryCols.style, ...gapStyle, columnGap: `${gap}px` }}>
          {photos.map((photo, i) => (
            <div key={photo.id} style={{ marginBottom: `${gap}px` }} className="break-inside-avoid">
              {photoCard(photo, i, false)}
            </div>
          ))}
        </div>
      ) : (
        <div className={gridCols.className} style={{ ...gridCols.style, ...gapStyle }}>
          {photos.map((photo, i) => (
            <div key={photo.id}>
              {photoCard(photo, i, true)}
            </div>
          ))}
        </div>
      )}

      <Lightbox
        photos={photos}
        selectedIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        settings={lb}
        collectionTitle={collectionTitle}
      />
    </div>
  );
}

// ----- Stories index block renderer -----

type StoryRow = {
  title: string;
  slug: string;
  isPublished: boolean;
  metaDescription: string | null;
  storyMeta: {
    dek?: string;
    kind?: string;
    year?: string | number;
    readTime?: string;
    wordCount?: number;
    frontispieceUrl?: string;
  } | null;
  ogImageUrl: string | null;
  isPasswordProtected: boolean;
  createdAt: string;
};

function storyRowsToIndex(rows: StoryRow[]): IndexStory[] {
  return rows
    .filter((r) => r.isPublished)
    .map((r) => {
      const meta = r.storyMeta ?? {};
      return {
        title: r.title,
        slug: r.slug,
        dek: meta.dek ?? r.metaDescription ?? "",
        kind: meta.kind ?? "Short",
        year: meta.year != null ? String(meta.year) : new Date(r.createdAt).getFullYear().toString(),
        readTime:
          meta.readTime ??
          (meta.wordCount ? `${Math.max(1, Math.round(meta.wordCount / 220))} MIN READ` : ""),
        wordCount: meta.wordCount ?? null,
        frontispiece: meta.frontispieceUrl ?? r.ogImageUrl ?? null,
        isProtected: r.isPasswordProtected,
      };
    });
}

function StoriesIndexBlockRender({
  volumeLabel,
  title,
  dek,
  injected,
}: {
  volumeLabel: string;
  title: string;
  dek: string;
  injected: IndexStory[] | undefined;
}) {
  const [fetched, setFetched] = useState<IndexStory[] | null>(null);
  useEffect(() => {
    if (injected) return;
    let cancelled = false;
    fetch("/api/stories")
      .then((r) => r.json())
      .then((rows: StoryRow[]) => {
        if (!cancelled) setFetched(storyRowsToIndex(rows));
      })
      .catch(() => {
        if (!cancelled) setFetched([]);
      });
    return () => {
      cancelled = true;
    };
  }, [injected]);
  return (
    <StoriesIndex
      stories={injected ?? fetched ?? []}
      volumeLabel={volumeLabel}
      title={title}
      dek={dek}
    />
  );
}

// ----- Puck Data type re-export for convenience -----
// Every block but the form fields can be left off phones, tablets or desktops.
// (A form field hidden on one screen would still be required on it.)
const FORM_FIELD_BLOCKS = new Set(["TextField", "TextArea", "SelectField", "RadioGroup", "CheckboxGroup", "Checkbox"]);
for (const [name, component] of Object.entries(puckConfig.components) as [string, ComponentConfig<any>][]) {
  if (FORM_FIELD_BLOCKS.has(name)) continue;
  const Block = component.render;
  component.fields = { ...component.fields, hideOn: hideOnField };
  component.render = (props) => (
    <BreakpointVisibility hideOn={props.hideOn as Breakpoint[] | undefined} editing={!!props.puck?.isEditing}>
      <Block {...props} />
    </BreakpointVisibility>
  );
}

// On the editor canvas, a block's <Editable> text can be typed into.
for (const component of Object.values(puckConfig.components) as ComponentConfig<any>[]) {
  const Block = component.render;
  component.render = (props) => (
    <InlineEditScope id={props.id as string | undefined} editing={!!props.puck?.isEditing}>
      <Block {...props} />
    </InlineEditScope>
  );
}

export type { Config };
export type PuckData = Parameters<typeof import("@puckeditor/core").Render>[0]["data"];
