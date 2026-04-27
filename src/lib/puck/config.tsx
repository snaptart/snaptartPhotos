"use client";

import type { Config } from "@puckeditor/core";
import { DropZone } from "@puckeditor/core";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import { FontSize } from "@/lib/tiptap/font-size";
import { Indent } from "@/lib/tiptap/indent";
import type { JSONContent } from "@tiptap/react";
import TiptapEditor from "@/components/admin/TiptapEditor";
import ImagePicker from "@/components/admin/ImagePicker";
import { parseLinks } from "@/lib/parseLinks";
import siteConfig from "@/lib/site.config";
import { fontRole } from "@/lib/theme/role-style";
import Lightbox from "@/components/public/Lightbox";
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
import type { FormWrapperProps } from "@/components/puck/form/FormWrapper";
import {
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

// Tiptap extensions for HTML generation
const tiptapExtensions = [
  StarterKit,
  Underline,
  TextStyle,
  Color,
  FontFamily,
  FontSize,
  Image,
  Link,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Indent,
];

function tiptapToHtml(content: JSONContent | null): string {
  if (!content) return "";
  try {
    const html = generateHTML(
      content as Parameters<typeof generateHTML>[0],
      tiptapExtensions
    );
    // Preserve empty paragraphs as visible line breaks
    return html.replace(/<p([^>]*)><\/p>/g, "<p$1><br></p>");
  } catch {
    return "";
  }
}

// ----- Component prop types -----

type RichTextProps = {
  content: JSONContent | null;
};

type HeroProps = {
  imageUrl: string;
  title: string;
  subtitle: string;
  height: string;
  overlay: boolean;
  focalX: number;
  focalY: number;
};

type ImageBlockProps = {
  url: string;
  alt: string;
  aspectRatio: "natural" | "square" | "4:3" | "3:2" | "16:9";
  caption: string;
  width: number;
  captionX: number;
  captionY: number;
  captionFontSize: number;
  captionColor: string;
  captionBold: boolean;
  captionItalic: boolean;
  captionBgColor: string;
  captionBgOpacity: number;
  borderRadius: number;
  linkUrl: string;
  linkTarget: "_self" | "_blank";
  focalX: number;
  focalY: number;
};

type SpacerProps = {
  height: number;
};

type ContainerProps = {
  paddingLeft: number;
  paddingRight: number;
};

type ColumnsProps = {
  columns: "2" | "3";
  distribution: string;
  gap: string;
};

export type GlobalLightboxSettings = LightboxSettings;

type GalleryEmbedProps = {
  gallerySlug: string;
  maxPhotos: number;
  layout: "grid" | "masonry";
  columns: "2" | "3" | "4";
  aspectRatio: "square" | "natural" | "4:3" | "16:9";
  gap: number;
  imageMaxWidth: number;
  borderRadius: number;
  showMetadata: boolean;
  metadataFields: string[];
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
  height: string;
  aspectRatio: "none" | "16:9" | "3:2" | "4:3" | "1:1";
  autoPlay: boolean;
  interval: number;
  pauseOnHover: boolean;
  transitionDuration: number;
  showArrows: boolean;
  showDots: boolean;
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
};

export type FieldMapBlockData = {
  regions: FieldMapRegion[];
  yearBounds: [number, number];
  filters: FieldMapFilter[];
  siteTitle?: string;
};

type CarouselProps = {
  slides: CarouselSlide[];
  slidesPerView: number;
  gap: number;
  aspectRatio: "none" | "16:9" | "3:2" | "4:3" | "1:1";
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
};

type GalleriesIndexProps = {
  sourceMode: "all" | "manual";
  selectedSlugs: string[];
  maxItems: number;
  sortOrder: "manual" | "position" | "newest" | "oldest" | "title-asc" | "title-desc";
  columns: "1" | "2" | "3" | "4" | "5" | "6";
  gap: number;
  fullBleed: boolean;
  maxWidth: number;
  aspectRatio: "natural" | "square" | "4:3" | "3:2" | "16:9";
  borderRadius: number;
  imageHoverEffect: "none" | "zoom" | "lift" | "fade" | "darken";
  showTitle: boolean;
  showDescription: boolean;
  titlePosition: "below" | "overlay-bottom" | "overlay-top" | "overlay-center";
  textAlignment: "left" | "center" | "right";
  titleFontRole: "headings" | "body" | "navMenu" | "labels";
  titleSize: number;
  titleColor: string;
  titleWeight: "300" | "400" | "500" | "600" | "700" | "800";
  titleTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  descriptionSize: number;
  descriptionColor: string;
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
  link: string;
  linkTarget: "_self" | "_blank";
  imageUrl: string;
  iconText: string;
};

type LinkListProps = {
  items: LinkListItem[];
  layout: "vertical-list" | "horizontal-pills" | "button-stack" | "card-grid";
  columns: "1" | "2" | "3" | "4";
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
  fontRoleKey: "body" | "headings" | "navMenu" | "labels";
  fontSize: number;
  fontWeight: "300" | "400" | "500" | "600" | "700" | "800";
  letterSpacing: number;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  italic: boolean;
  underline: boolean;
  descriptionSize: number;
  descriptionColor: string;
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
  fontRoleKey: "body" | "headings" | "navMenu" | "labels";
  fontSize: number;
  fontWeight: "300" | "400" | "500" | "600" | "700" | "800";
  letterSpacing: number;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  italic: boolean;
  underline: boolean;
  hoverBgColor: string;
  hoverTextColor: string;
  hoverBorderColor: string;
  hoverEffect: "none" | "lift" | "scale-up" | "scale-down";
  shadow: "none" | "sm" | "md" | "lg";
  hoverShadow: "none" | "sm" | "md" | "lg";
  transitionMs: number;
};

type Components = {
  RichText: RichTextProps;
  Hero: HeroProps;
  HeroSlideshow: HeroSlideshowProps;
  ImageBlock: ImageBlockProps;
  Spacer: SpacerProps;
  Container: ContainerProps;
  Columns: ColumnsProps;
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
};

// ----- Puck config -----

export const puckConfig: Config<Components> = {
  categories: {
    content: { components: ["RichText", "ImageBlock", "Button", "LinkList", "GalleryEmbed", "GalleriesIndex", "Carousel", "FieldMap"] },
    layout: { components: ["Columns", "Spacer", "Container"] },
    hero: { components: ["Hero", "HeroSlideshow"] },
    stories: { title: "Stories", components: ["StoriesIndexBlock"] },
    forms: { components: ["Form", "TextField", "TextArea", "SelectField", "RadioGroup", "CheckboxGroup", "Checkbox"] },
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
      render: ({ content }) => {
        const html = tiptapToHtml(content);
        if (!html) return <p className="text-neutral-400 italic">Start typing...</p>;
        return (
          <>
            <style>{`
              .richtext-render {
                font-family: var(--theme-font-body-family);
                font-weight: var(--theme-font-body-weight);
                font-style: var(--theme-font-body-style);
                text-transform: var(--theme-font-body-transform);
              }
              .richtext-render p { margin: 0.125em 0; line-height: 1.5; font-size: var(--theme-font-body-size, 1.125rem); }
              .richtext-render h1, .richtext-render h2, .richtext-render h3 {
                font-family: var(--theme-font-headings-family);
                font-weight: var(--theme-font-headings-weight);
                font-style: var(--theme-font-headings-style);
                text-transform: var(--theme-font-headings-transform);
                margin: 0.75em 0 0.25em;
              }
              .richtext-render h1 { font-size: 2em; }
              .richtext-render h2 { font-size: 1.5em; }
              .richtext-render h3 { font-size: 1.25em; }
              .richtext-render blockquote { border-left: 3px solid #d4d4d4; padding-left: 1em; margin: 0.5em 0; font-style: italic; }
              .richtext-render ul, .richtext-render ol { padding-left: 1.5em; margin: 0.25em 0; }
              .richtext-render a { text-decoration: underline; }
              .richtext-render hr { border-top: 1px solid #d4d4d4; margin: 1em 0; }
            `}</style>
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
        title: { type: "text", label: "Title" },
        subtitle: { type: "text", label: "Subtitle" },
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
        overlay: { type: "radio", label: "Dark Overlay", options: [
          { label: "Yes", value: true },
          { label: "No", value: false },
        ]},
        focalX: {
          type: "custom",
          label: "Focal Point — Horizontal (0=left, 50=center, 100=right)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={1} unit="%" label="Horizontal" />
          ),
        },
        focalY: {
          type: "custom",
          label: "Focal Point — Vertical (0=top, 50=center, 100=bottom)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={1} unit="%" label="Vertical" />
          ),
        },
      },
      defaultProps: {
        imageUrl: "",
        title: "",
        subtitle: "",
        height: "500px",
        overlay: true,
        focalX: 50,
        focalY: 50,
      },
      render: ({ imageUrl, title, subtitle, height, overlay, focalX, focalY }) => (
        <div
          className="relative flex items-center justify-center bg-neutral-200 bg-cover"
          style={{
            backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
            backgroundPosition: `${focalX ?? 50}% ${focalY ?? 50}%`,
            minHeight: height,
          }}
        >
          {overlay && imageUrl && (
            <div className="absolute inset-0 bg-black/40" />
          )}
          <div className="relative z-10 text-center px-4">
            {title && (
              <h1 className="text-4xl md:text-6xl tracking-tight mb-4" style={{ ...fontRole("headings"), color: "var(--theme-color-hero-overlay)" }}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xl md:text-2xl" style={{ ...fontRole("overlay"), color: "var(--theme-color-hero-overlay)", opacity: 0.9 }}>
                {subtitle}
              </p>
            )}
            {!imageUrl && !title && (
              <p className="text-neutral-400 italic">Set an image URL and title</p>
            )}
          </div>
        </div>
      ),
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
        alt: { type: "text", label: "Alt Text" },
        aspectRatio: {
          type: "select",
          label: "Aspect Ratio",
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
          label: "Width (%)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={10} max={100} step={1} unit="%" label="Width" />
          ),
        },
        borderRadius: {
          type: "custom",
          label: "Corner Radius (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={32} step={1} unit="px" label="Corner Radius" />
          ),
        },
        caption: { type: "text", label: "Caption" },
        captionX: {
          type: "custom",
          label: "Caption Horizontal Position",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={-20} max={120} step={1} unit="%" label="Horizontal Position" />
          ),
        },
        captionY: {
          type: "custom",
          label: "Caption Vertical Position",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={-20} max={120} step={1} unit="%" label="Vertical Position" />
          ),
        },
        captionFontSize: {
          type: "custom",
          label: "Caption Font Size",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={10} max={48} step={1} unit="px" label="Font Size" />
          ),
        },
        captionColor: {
          type: "custom",
          label: "Caption Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        captionBold: {
          type: "radio",
          label: "Caption Bold",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        captionItalic: {
          type: "radio",
          label: "Caption Italic",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        captionBgColor: {
          type: "custom",
          label: "Caption Background Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        captionBgOpacity: {
          type: "custom",
          label: "Caption Background Opacity",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={5} unit="%" label="Background Opacity" />
          ),
        },
        linkUrl: {
          type: "custom",
          label: "Link URL",
          render: ({ value, onChange }) => (
            <LinkPicker value={value} onChange={onChange} />
          ),
        },
        linkTarget: {
          type: "select",
          label: "Link Opens In",
          options: [
            { label: "Same Tab", value: "_self" },
            { label: "New Tab", value: "_blank" },
          ],
        },
        focalX: {
          type: "custom",
          label: "Focal Point — Horizontal (0=left, 50=center, 100=right)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={1} unit="%" label="Horizontal" />
          ),
        },
        focalY: {
          type: "custom",
          label: "Focal Point — Vertical (0=top, 50=center, 100=bottom)",
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
        width: 60,
        captionX: 50,
        captionY: 110,
        captionFontSize: 14,
        captionColor: "#737373",
        captionBold: false,
        captionItalic: true,
        captionBgColor: "#000000",
        captionBgOpacity: 0,
        borderRadius: 4,
        linkUrl: "",
        linkTarget: "_self",
        focalX: 50,
        focalY: 50,
      },
      render: ({ url, alt, aspectRatio, caption, width, captionX, captionY, captionFontSize, captionColor, captionBold, captionItalic, captionBgColor, captionBgOpacity, borderRadius, linkUrl, linkTarget, focalX, focalY }) => {
        const isPriority = useImagePriority();
        const isOverlay = captionY >= 0 && captionY <= 100;
        const arMap: Record<string, string> = { square: "1/1", "4:3": "4/3", "3:2": "3/2", "16:9": "16/9" };
        const arValue = arMap[aspectRatio];
        const focalPos = `${focalX ?? 50}% ${focalY ?? 50}%`;
        const captionStyle: React.CSSProperties = {
          position: "absolute",
          left: `${captionX}%`,
          top: `${captionY}%`,
          transform: "translate(-50%, -50%)",
          fontSize: `${captionFontSize}px`,
          color: captionColor,
          fontWeight: captionBold ? "bold" : "normal",
          fontStyle: captionItalic ? "italic" : "normal",
          backgroundColor: captionBgOpacity > 0 ? hexToRgba(captionBgColor, captionBgOpacity / 100) : "transparent",
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
                {imageEl}
                {caption && (
                  <figcaption style={{ ...captionStyle, fontFamily: "var(--theme-font-captions)" }}>
                    {caption}
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
          label: `Pick ${siteConfig.labels.gallery} (used when Source = Hand-Picked)`,
          render: ({ value, onChange }) => (
            <GalleriesMultiSelect value={value} onChange={onChange} />
          ),
        },
        sortOrder: {
          type: "select",
          label: "Sort Order",
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
          label: "Max Items (0 = no limit)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={48} step={1} unit="" label="Max Items" />
          ),
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
        gap: {
          type: "custom",
          label: "Gap (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={64} step={2} unit="px" label="Gap" />
          ),
        },
        fullBleed: {
          type: "radio",
          label: "Full Bleed",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        maxWidth: {
          type: "custom",
          label: "Max Width (% — when not full bleed)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={30} max={100} step={1} unit="%" label="Max Width" />
          ),
        },
        aspectRatio: {
          type: "select",
          label: "Image Aspect Ratio",
          options: [
            { label: "Natural", value: "natural" },
            { label: "Square (1:1)", value: "square" },
            { label: "4:3", value: "4:3" },
            { label: "3:2", value: "3:2" },
            { label: "16:9", value: "16:9" },
          ],
        },
        borderRadius: {
          type: "custom",
          label: "Corner Radius (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={48} step={1} unit="px" label="Corner Radius" />
          ),
        },
        imageHoverEffect: {
          type: "select",
          label: "Image Hover Effect",
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
          label: "Show Title",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        showDescription: {
          type: "radio",
          label: "Show Description",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        titlePosition: {
          type: "select",
          label: "Title Position",
          options: [
            { label: "Below Image", value: "below" },
            { label: "Overlay — Bottom", value: "overlay-bottom" },
            { label: "Overlay — Top", value: "overlay-top" },
            { label: "Overlay — Center", value: "overlay-center" },
          ],
        },
        textAlignment: {
          type: "radio",
          label: "Text Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        titleFontRole: {
          type: "select",
          label: "Title Font Role",
          options: [
            { label: "Headings", value: "headings" },
            { label: "Body", value: "body" },
            { label: "Nav / Menu", value: "navMenu" },
            { label: "Labels", value: "labels" },
          ],
        },
        titleSize: {
          type: "custom",
          label: "Title Size (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={10} max={48} step={1} unit="px" label="Title Size" />
          ),
        },
        titleColor: {
          type: "custom",
          label: "Title Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        titleWeight: {
          type: "select",
          label: "Title Weight",
          options: [
            { label: "Light (300)", value: "300" },
            { label: "Regular (400)", value: "400" },
            { label: "Medium (500)", value: "500" },
            { label: "Semibold (600)", value: "600" },
            { label: "Bold (700)", value: "700" },
            { label: "Extra Bold (800)", value: "800" },
          ],
        },
        titleTransform: {
          type: "select",
          label: "Title Transform",
          options: [
            { label: "None", value: "none" },
            { label: "UPPERCASE", value: "uppercase" },
            { label: "lowercase", value: "lowercase" },
            { label: "Capitalize", value: "capitalize" },
          ],
        },
        descriptionSize: {
          type: "custom",
          label: "Description Size (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={10} max={24} step={1} unit="px" label="Description Size" />
          ),
        },
        descriptionColor: {
          type: "custom",
          label: "Description Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        textPaddingX: {
          type: "custom",
          label: "Text Horizontal Padding (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={48} step={1} unit="px" label="Padding X" />
          ),
        },
        textPaddingY: {
          type: "custom",
          label: "Text Vertical Padding (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={48} step={1} unit="px" label="Padding Y" />
          ),
        },
        textGap: {
          type: "custom",
          label: "Title→Description Gap (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={32} step={1} unit="px" label="Gap" />
          ),
        },
        overlayBgColor: {
          type: "custom",
          label: "Overlay Background Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        overlayOpacity: {
          type: "custom",
          label: "Overlay Opacity",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={5} unit="%" label="Opacity" />
          ),
        },
        marginTop: {
          type: "custom",
          label: "Margin Top (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={120} step={2} unit="px" label="Margin Top" />
          ),
        },
        marginBottom: {
          type: "custom",
          label: "Margin Bottom (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={120} step={2} unit="px" label="Margin Bottom" />
          ),
        },
        transitionMs: {
          type: "custom",
          label: "Hover Transition (ms)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={800} step={10} unit="ms" label="Transition" />
          ),
        },
      },
      defaultProps: {
        sourceMode: "all",
        selectedSlugs: [],
        maxItems: 0,
        sortOrder: "position",
        columns: "3",
        gap: 16,
        fullBleed: false,
        maxWidth: 100,
        aspectRatio: "4:3",
        borderRadius: 4,
        imageHoverEffect: "zoom",
        showTitle: true,
        showDescription: false,
        titlePosition: "below",
        textAlignment: "center",
        titleFontRole: "headings",
        titleSize: 18,
        titleColor: "#171717",
        titleWeight: "500",
        titleTransform: "none",
        descriptionSize: 13,
        descriptionColor: "#737373",
        textPaddingX: 8,
        textPaddingY: 12,
        textGap: 4,
        overlayBgColor: "#000000",
        overlayOpacity: 35,
        marginTop: 0,
        marginBottom: 0,
        transitionMs: 300,
      },
      render: (props) => <GalleriesIndexRender {...props} />,
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
          label: "Columns (Card Grid)",
          options: [
            { label: "1", value: "1" },
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4", value: "4" },
          ],
        },
        gap: {
          type: "custom",
          label: "Gap (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={48} step={1} unit="px" label="Gap" />
          ),
        },
        alignment: {
          type: "radio",
          label: "Block Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        itemAlignment: {
          type: "radio",
          label: "Item Text Alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
        showImage: {
          type: "radio",
          label: "Show Item Image",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        showDescription: {
          type: "radio",
          label: "Show Description",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        showIcon: {
          type: "radio",
          label: "Show Icon",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        imagePosition: {
          type: "select",
          label: "Image Position",
          options: [
            { label: "Left of text", value: "left" },
            { label: "Right of text", value: "right" },
            { label: "Above text", value: "top" },
          ],
        },
        imageSize: {
          type: "custom",
          label: "Image Size (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={24} max={400} step={4} unit="px" label="Image Size" />
          ),
        },
        imageAspectRatio: {
          type: "select",
          label: "Image Aspect Ratio",
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
          label: "Image Corner Radius (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={200} step={1} unit="px" label="Image Radius" />
          ),
        },
        iconGap: {
          type: "custom",
          label: "Icon/Image Gap (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={32} step={1} unit="px" label="Icon Gap" />
          ),
        },
        bgColor: {
          type: "custom",
          label: "Item Background Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        bgOpacity: {
          type: "custom",
          label: "Item Background Opacity",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={5} unit="%" label="Opacity" />
          ),
        },
        textColor: {
          type: "custom",
          label: "Text Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        borderColor: {
          type: "custom",
          label: "Border Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        borderWidth: {
          type: "custom",
          label: "Border Width (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={6} step={1} unit="px" label="Border Width" />
          ),
        },
        borderRadius: {
          type: "custom",
          label: "Item Corner Radius (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={1} unit="px" label="Corner Radius" />
          ),
        },
        paddingX: {
          type: "custom",
          label: "Item Padding X (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={64} step={1} unit="px" label="Padding X" />
          ),
        },
        paddingY: {
          type: "custom",
          label: "Item Padding Y (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={48} step={1} unit="px" label="Padding Y" />
          ),
        },
        fontRoleKey: {
          type: "select",
          label: "Font Role",
          options: [
            { label: "Body", value: "body" },
            { label: "Headings", value: "headings" },
            { label: "Nav / Menu", value: "navMenu" },
            { label: "Labels", value: "labels" },
          ],
        },
        fontSize: {
          type: "custom",
          label: "Font Size (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={10} max={36} step={1} unit="px" label="Font Size" />
          ),
        },
        fontWeight: {
          type: "select",
          label: "Font Weight",
          options: [
            { label: "Light (300)", value: "300" },
            { label: "Regular (400)", value: "400" },
            { label: "Medium (500)", value: "500" },
            { label: "Semibold (600)", value: "600" },
            { label: "Bold (700)", value: "700" },
            { label: "Extra Bold (800)", value: "800" },
          ],
        },
        letterSpacing: {
          type: "custom",
          label: "Letter Spacing (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={-2} max={12} step={0.5} unit="px" label="Letter Spacing" />
          ),
        },
        textTransform: {
          type: "select",
          label: "Text Transform",
          options: [
            { label: "None", value: "none" },
            { label: "UPPERCASE", value: "uppercase" },
            { label: "lowercase", value: "lowercase" },
            { label: "Capitalize", value: "capitalize" },
          ],
        },
        italic: {
          type: "radio",
          label: "Italic",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        underline: {
          type: "radio",
          label: "Underline",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        descriptionSize: {
          type: "custom",
          label: "Description Size (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={10} max={24} step={1} unit="px" label="Description Size" />
          ),
        },
        descriptionColor: {
          type: "custom",
          label: "Description Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        hoverBgColor: {
          type: "custom",
          label: "Hover Background Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        hoverTextColor: {
          type: "custom",
          label: "Hover Text Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        hoverBorderColor: {
          type: "custom",
          label: "Hover Border Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        hoverEffect: {
          type: "select",
          label: "Hover Effect",
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
          label: "Hover Shadow",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        dividers: {
          type: "radio",
          label: "Dividers (Vertical List only)",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        dividerColor: {
          type: "custom",
          label: "Divider Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        marginTop: {
          type: "custom",
          label: "Margin Top (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={120} step={2} unit="px" label="Margin Top" />
          ),
        },
        marginBottom: {
          type: "custom",
          label: "Margin Bottom (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={120} step={2} unit="px" label="Margin Bottom" />
          ),
        },
        transitionMs: {
          type: "custom",
          label: "Transition (ms)",
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
        fontRoleKey: "body",
        fontSize: 16,
        fontWeight: "500",
        letterSpacing: 0,
        textTransform: "none",
        italic: false,
        underline: false,
        descriptionSize: 13,
        descriptionColor: "#737373",
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
      render: (props) => <LinkListRender {...props} />,
    },

    Button: {
      label: "Button",
      fields: {
        label: { type: "text", label: "Label" },
        link: {
          type: "custom",
          label: "Link",
          render: ({ value, onChange }) => (
            <LinkPicker value={value} onChange={onChange} />
          ),
        },
        linkTarget: {
          type: "select",
          label: "Link Opens In",
          options: [
            { label: "Same Tab", value: "_self" },
            { label: "New Tab", value: "_blank" },
          ],
        },
        ariaLabel: { type: "text", label: "Aria Label (accessibility)" },
        iconText: { type: "text", label: "Icon (text/emoji, e.g. → ↗ ★)" },
        iconPosition: {
          type: "radio",
          label: "Icon Position",
          options: [
            { label: "Left", value: "left" },
            { label: "Right", value: "right" },
          ],
        },
        iconGap: {
          type: "custom",
          label: "Icon Gap (px)",
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
          label: "Width Mode",
          options: [
            { label: "Auto (fits content)", value: "auto" },
            { label: "Full Width", value: "full" },
            { label: "Custom %", value: "custom" },
          ],
        },
        customWidth: {
          type: "custom",
          label: "Custom Width (%)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={10} max={100} step={1} unit="%" label="Width" />
          ),
        },
        minWidth: {
          type: "custom",
          label: "Min Width (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={400} step={4} unit="px" label="Min Width" />
          ),
        },
        bgColor: {
          type: "custom",
          label: "Background Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        bgOpacity: {
          type: "custom",
          label: "Background Opacity",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={5} unit="%" label="Opacity" />
          ),
        },
        textColor: {
          type: "custom",
          label: "Text Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        borderColor: {
          type: "custom",
          label: "Border Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        borderWidth: {
          type: "custom",
          label: "Border Width (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={8} step={1} unit="px" label="Border Width" />
          ),
        },
        borderStyle: {
          type: "select",
          label: "Border Style",
          options: [
            { label: "Solid", value: "solid" },
            { label: "Dashed", value: "dashed" },
            { label: "Dotted", value: "dotted" },
          ],
        },
        borderRadius: {
          type: "custom",
          label: "Corner Radius (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={100} step={1} unit="px" label="Corner Radius" />
          ),
        },
        paddingX: {
          type: "custom",
          label: "Horizontal Padding (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={80} step={1} unit="px" label="Horizontal Padding" />
          ),
        },
        paddingY: {
          type: "custom",
          label: "Vertical Padding (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={60} step={1} unit="px" label="Vertical Padding" />
          ),
        },
        marginTop: {
          type: "custom",
          label: "Margin Top (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={120} step={2} unit="px" label="Margin Top" />
          ),
        },
        marginBottom: {
          type: "custom",
          label: "Margin Bottom (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={120} step={2} unit="px" label="Margin Bottom" />
          ),
        },
        fontRoleKey: {
          type: "select",
          label: "Font Role",
          options: [
            { label: "Body", value: "body" },
            { label: "Headings", value: "headings" },
            { label: "Nav / Menu", value: "navMenu" },
            { label: "Labels", value: "labels" },
          ],
        },
        fontSize: {
          type: "custom",
          label: "Font Size (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={10} max={48} step={1} unit="px" label="Font Size" />
          ),
        },
        fontWeight: {
          type: "select",
          label: "Font Weight",
          options: [
            { label: "Light (300)", value: "300" },
            { label: "Regular (400)", value: "400" },
            { label: "Medium (500)", value: "500" },
            { label: "Semibold (600)", value: "600" },
            { label: "Bold (700)", value: "700" },
            { label: "Extra Bold (800)", value: "800" },
          ],
        },
        letterSpacing: {
          type: "custom",
          label: "Letter Spacing (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={-2} max={12} step={0.5} unit="px" label="Letter Spacing" />
          ),
        },
        textTransform: {
          type: "select",
          label: "Text Transform",
          options: [
            { label: "None", value: "none" },
            { label: "UPPERCASE", value: "uppercase" },
            { label: "lowercase", value: "lowercase" },
            { label: "Capitalize", value: "capitalize" },
          ],
        },
        italic: {
          type: "radio",
          label: "Italic",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
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
          label: "Hover Background Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        hoverTextColor: {
          type: "custom",
          label: "Hover Text Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        hoverBorderColor: {
          type: "custom",
          label: "Hover Border Color",
          render: ({ value, onChange }) => (
            <ColorField value={value} onChange={onChange} />
          ),
        },
        hoverEffect: {
          type: "select",
          label: "Hover Effect",
          options: [
            { label: "None", value: "none" },
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
          label: "Hover Shadow",
          options: [
            { label: "None", value: "none" },
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        transitionMs: {
          type: "custom",
          label: "Transition Duration (ms)",
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
        fontRoleKey: "labels",
        fontSize: 14,
        fontWeight: "500",
        letterSpacing: 0,
        textTransform: "none",
        italic: false,
        underline: false,
        hoverBgColor: "#404040",
        hoverTextColor: "#ffffff",
        hoverBorderColor: "#404040",
        hoverEffect: "lift",
        shadow: "none",
        hoverShadow: "md",
        transitionMs: 200,
      },
      render: (props) => <ButtonRender {...props} />,
    },

    Spacer: {
      label: "Spacer",
      fields: {
        height: { type: "number", label: "Height (px)", min: 8, max: 200 },
      },
      defaultProps: { height: 48 },
      render: ({ height }) => (
        <div style={{ height }} className="w-full" />
      ),
    },

    Container: {
      label: "Container",
      fields: {
        paddingLeft: { type: "number", label: "Left Padding (px)", min: 0, max: 300 },
        paddingRight: { type: "number", label: "Right Padding (px)", min: 0, max: 300 },
      },
      defaultProps: { paddingLeft: 0, paddingRight: 0 },
      render: ({ paddingLeft, paddingRight, puck }) => (
        <div style={{ paddingLeft, paddingRight }}>
          <DropZone zone="container-content" />
        </div>
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
          label: "Width Distribution",
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
            label: "Width Distribution",
            options: data.props.columns === "3" ? threeColOptions : twoColOptions,
          },
        };
      },
      defaultProps: { columns: "2", distribution: "equal", gap: "gap-8" },
      render: ({ columns, distribution, gap }) => {
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

        return (
          <div
            className={`puck-columns grid ${gap}`}
            style={{ "--col-template": gridTemplate } as React.CSSProperties}
          >
            {Array.from({ length: colCount }).map((_, i) => (
              <DropZone key={i} zone={`column-${i}`} />
            ))}
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
        maxPhotos: { type: "number", label: `Max ${siteConfig.labels.photos}`, min: 1, max: 20 },
        height: {
          type: "select",
          label: "Height (or min-height when aspect ratio is set)",
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
        aspectRatio: {
          type: "select",
          label: "Aspect Ratio",
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
          label: "Full Bleed (edge-to-edge)",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        maxWidth: {
          type: "select",
          label: "Max Width (when Full Bleed is off)",
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
          label: "Image Fit",
          options: [
            { label: "Cover (fill & crop)", value: "cover" },
            { label: "Contain (letterbox)", value: "contain" },
          ],
        },
        overlayOpacity: {
          type: "custom",
          label: "Dark Overlay Opacity",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={80} step={5} unit="%" label="Overlay Opacity" />
          ),
        },
        autoPlay: {
          type: "radio",
          label: "Auto-play",
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
          label: "Pause on Hover",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        transitionDuration: {
          type: "custom",
          label: "Fade Duration (ms)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={100} max={2000} step={100} unit="ms" label="Fade Duration" />
          ),
        },
        showArrows: {
          type: "radio",
          label: "Show Arrows",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        showDots: {
          type: "radio",
          label: "Show Dots",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
      },
      defaultProps: {
        gallerySlug: "",
        maxPhotos: 5,
        height: "100dvh",
        aspectRatio: "none",
        autoPlay: true,
        interval: 5,
        pauseOnHover: true,
        transitionDuration: 1000,
        showArrows: true,
        showDots: true,
        fullBleed: true,
        maxWidth: "100%",
        objectFit: "cover",
        overlayOpacity: 0,
      },
      render: ({ gallerySlug, maxPhotos, height, aspectRatio, autoPlay, interval, pauseOnHover, transitionDuration, showArrows, showDots, fullBleed, maxWidth, objectFit, overlayOpacity, puck }) => {
        if (!gallerySlug) {
          return (
            <div className="rounded border-2 border-dashed border-neutral-300 p-8 text-center text-neutral-400">
              Select a gallery to use as slideshow
            </div>
          );
        }
        const serverPhotos = (puck?.metadata as Record<string, unknown>)?.galleryPhotos as Record<string, EmbedPhoto[]> | undefined;
        return (
          <HeroSlideshowClient
            slug={gallerySlug}
            maxPhotos={maxPhotos}
            serverPhotos={serverPhotos?.[gallerySlug]}
            height={height}
            aspectRatio={aspectRatio}
            autoPlay={autoPlay}
            interval={interval}
            pauseOnHover={pauseOnHover}
            transitionDuration={transitionDuration}
            showArrows={showArrows}
            showDots={showDots}
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
        slides: {
          type: "custom",
          label: "Slides",
          render: ({ value, onChange }) => (
            <CarouselSlideEditor value={value} onChange={onChange} />
          ),
        },
        slidesPerView: {
          type: "custom",
          label: "Slides Per View",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={1} max={5} step={1} unit="" label="Slides Per View" />
          ),
        },
        gap: {
          type: "custom",
          label: "Gap Between Slides (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={48} step={2} unit="px" label="Gap" />
          ),
        },
        aspectRatio: {
          type: "select",
          label: "Aspect Ratio",
          options: [
            { label: "None (use height)", value: "none" },
            { label: "16:9", value: "16:9" },
            { label: "3:2", value: "3:2" },
            { label: "4:3", value: "4:3" },
            { label: "1:1 (square)", value: "1:1" },
          ],
        },
        height: {
          type: "select",
          label: "Height (when no aspect ratio)",
          options: [
            { label: "200px", value: "200px" },
            { label: "300px", value: "300px" },
            { label: "400px", value: "400px" },
            { label: "500px", value: "500px" },
          ],
        },
        transition: {
          type: "select",
          label: "Transition Style",
          options: [
            { label: "Slide", value: "slide" },
            { label: "Fade (single slide only)", value: "fade" },
          ],
        },
        transitionDuration: {
          type: "custom",
          label: "Transition Duration (ms)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={100} max={2000} step={100} unit="ms" label="Duration" />
          ),
        },
        objectFit: {
          type: "select",
          label: "Image Fit",
          options: [
            { label: "Cover (fill & crop)", value: "cover" },
            { label: "Contain (letterbox)", value: "contain" },
          ],
        },
        borderRadius: {
          type: "custom",
          label: "Corner Radius (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={32} step={1} unit="px" label="Corner Radius" />
          ),
        },
        autoPlay: {
          type: "radio",
          label: "Auto-play",
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
          label: "Pause on Hover",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        showArrows: {
          type: "radio",
          label: "Show Arrows",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        showDots: {
          type: "radio",
          label: "Show Dots",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
      },
      defaultProps: {
        slides: [],
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
      },
      render: (props) => <CarouselClient {...props} />,
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
        maxPhotos: { type: "number", label: `Max ${siteConfig.labels.photos}`, min: 1, max: 50 },
        layout: {
          type: "select",
          label: "Layout",
          options: [
            { label: "Grid", value: "grid" },
            { label: "Masonry", value: "masonry" },
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
        aspectRatio: {
          type: "select",
          label: "Aspect Ratio",
          options: [
            { label: "Square (1:1)", value: "square" },
            { label: "Natural", value: "natural" },
            { label: "4:3", value: "4:3" },
            { label: "16:9", value: "16:9" },
          ],
        },
        gap: {
          type: "custom",
          label: "Gap (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={48} step={1} unit="px" label="Gap" />
          ),
        },
        imageMaxWidth: {
          type: "custom",
          label: "Image Max Width (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={100} max={800} step={10} unit="px" label="Max Width" />
          ),
        },
        borderRadius: {
          type: "custom",
          label: "Corner Radius (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value} onChange={onChange} min={0} max={32} step={1} unit="px" label="Corner Radius" />
          ),
        },
        showMetadata: {
          type: "radio",
          label: "Show Photo Info",
          options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
          ],
        },
        metadataFields: {
          type: "custom",
          label: "Info to Display",
          render: ({ value, onChange }) => (
            <MetadataFieldsPicker value={value} onChange={onChange} />
          ),
        },
        useGlobalLightbox: {
          type: "radio",
          label: "Lightbox Settings",
          options: [
            { label: "Use global defaults", value: true },
            { label: "Customize for this embed", value: false },
          ],
        },
        lightboxMetadataFields: {
          type: "custom",
          label: "Lightbox: Metadata to Show",
          render: ({ value, onChange }) => (
            <MetadataFieldsPicker value={value ?? ["title", "location"]} onChange={onChange} />
          ),
        },
        lightboxCornerRadius: {
          type: "custom",
          label: "Lightbox: Corner Radius (px)",
          render: ({ value, onChange }) => (
            <SliderField value={value ?? 0} onChange={onChange} min={0} max={32} step={1} unit="px" label="Corner Radius" />
          ),
        },
        lightboxCaptionPosition: {
          type: "select",
          label: "Lightbox: Caption Position",
          options: [
            { label: "Below image", value: "below" },
            { label: "Overlay — top", value: "overlay-top" },
            { label: "Overlay — bottom", value: "overlay-bottom" },
          ],
        },
        lightboxFadeSpeed: {
          type: "select",
          label: "Lightbox: Fade Speed",
          options: [
            { label: "None (instant)", value: "none" },
            { label: "Fast (150ms)", value: "fast" },
            { label: "Medium (300ms)", value: "medium" },
            { label: "Slow (500ms)", value: "slow" },
          ],
        },
        lightboxCaptionAlignment: {
          type: "select",
          label: "Lightbox: Caption Alignment",
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
        aspectRatio: "square",
        gap: 8,
        imageMaxWidth: 800,
        borderRadius: 8,
        showMetadata: false,
        metadataFields: ["title"],
        useGlobalLightbox: true,
        lightboxMetadataFields: ["title", "location"],
        lightboxCornerRadius: 0,
        lightboxCaptionPosition: "below",
        lightboxFadeSpeed: "medium",
        lightboxCaptionAlignment: "left",
      },
      render: ({ gallerySlug, maxPhotos, layout, columns, aspectRatio, gap, imageMaxWidth, borderRadius, showMetadata, metadataFields, useGlobalLightbox, lightboxMetadataFields, lightboxCornerRadius, lightboxCaptionPosition, lightboxFadeSpeed, lightboxCaptionAlignment, puck }) => {
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
            aspectRatio={aspectRatio}
            gap={gap}
            imageMaxWidth={imageMaxWidth}
            borderRadius={borderRadius}
            showMetadata={showMetadata}
            metadataFields={metadataFields}
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
        title: { type: "text", label: "Masthead title" },
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
      },
      defaultProps: {
        mapStyle: "modern",
        height: "fill",
        showBrand: false,
      },
      render: ({ mapStyle, height, showBrand, puck }) => {
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
            <div className="relative w-full bg-white" style={fillStyle}>
              <FieldMap
                regions={injected.regions}
                yearBounds={injected.yearBounds}
                filters={injected.filters}
                mapStyle={mapStyle}
                siteTitle={injected.siteTitle}
                showBrand={showBrand}
              />
            </div>
          </>
        );
      },
    },

    // ----- Form components -----

    Form: {
      label: "Form",
      fields: {
        formName: { type: "text", label: "Form Name (identifier)" },
        submitLabel: { type: "text", label: "Submit Button Text" },
        successMessage: { type: "textarea", label: "Success Message" },
        recipientEmail: { type: "text", label: "Notification Email (for future use)" },
      },
      defaultProps: {
        formName: "contact",
        submitLabel: "Submit",
        successMessage: "Thank you! Your submission has been received.",
        recipientEmail: "",
      },
      render: (props) => <FormWrapperRender {...props} />,
    },

    TextField: {
      label: "Text Field",
      fields: {
        label: { type: "text", label: "Label" },
        name: { type: "text", label: "Field Name (key)" },
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
          label: "Input Type",
          options: [
            { label: "Text", value: "text" },
            { label: "Email", value: "email" },
            { label: "Phone", value: "tel" },
            { label: "URL", value: "url" },
          ],
        },
      },
      defaultProps: {
        label: "Name",
        name: "name",
        placeholder: "",
        required: false,
        fieldType: "text",
      },
      render: (props) => <TextFieldRender {...props} />,
    },

    TextArea: {
      label: "Text Area",
      fields: {
        label: { type: "text", label: "Label" },
        name: { type: "text", label: "Field Name (key)" },
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
      },
      defaultProps: {
        label: "Message",
        name: "message",
        placeholder: "",
        required: false,
        rows: 4,
      },
      render: (props) => <TextAreaRender {...props} />,
    },

    SelectField: {
      label: "Dropdown Select",
      fields: {
        label: { type: "text", label: "Label" },
        name: { type: "text", label: "Field Name (key)" },
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
      },
      defaultProps: {
        label: "Subject",
        name: "subject",
        required: false,
        options: "General Inquiry\nPrint Request\nCollaboration",
      },
      render: (props) => <SelectFieldRender {...props} />,
    },

    RadioGroup: {
      label: "Radio Buttons",
      fields: {
        label: { type: "text", label: "Label" },
        name: { type: "text", label: "Field Name (key)" },
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
      },
      defaultProps: {
        label: "Preferred Contact",
        name: "preferred_contact",
        required: false,
        options: "email|Email\nphone|Phone",
      },
      render: (props) => <RadioGroupRender {...props} />,
    },

    CheckboxGroup: {
      label: "Checkbox Group",
      fields: {
        label: { type: "text", label: "Label" },
        name: { type: "text", label: "Field Name (key)" },
        options: {
          type: "textarea",
          label: "Options (one per line, use value|label for custom values)",
        },
      },
      defaultProps: {
        label: "Interests",
        name: "interests",
        options: "prints|Prints\ncommissions|Commissions\nworkshops|Workshops",
      },
      render: (props) => <CheckboxGroupRender {...props} />,
    },

    Checkbox: {
      label: "Checkbox",
      fields: {
        label: { type: "text", label: "Label" },
        name: { type: "text", label: "Field Name (key)" },
      },
      defaultProps: {
        label: "I agree to the terms",
        name: "agree_terms",
      },
      render: (props) => <CheckboxRender {...props} />,
    },
  },
};

// ----- Gallery picker (custom Puck field) -----

import { createContext, useContext, useEffect, useRef, useState } from "react";

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
      className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
    >
      <option value="">-- Select a gallery --</option>
      {galleries.map((g) => (
        <option key={g.id} value={g.slug}>{g.title}</option>
      ))}
    </select>
  );
}

// ----- Slider field -----

function SliderField({ value, onChange, min, max, step, unit, label }: { value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit: string; label?: string }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-xs font-medium text-neutral-500">{label}</span>
      )}
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-sm text-neutral-600 w-14 text-right tabular-nums">{value}{unit}</span>
      </div>
    </div>
  );
}

// ----- Color field -----

function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-10 cursor-pointer rounded border border-neutral-300"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm font-mono"
        placeholder="#000000"
      />
    </div>
  );
}

// ----- Link picker (internal pages/galleries + external URL) -----

type LinkOption = { label: string; value: string };

function LinkPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [options, setOptions] = useState<LinkOption[]>([]);
  const [mode, setMode] = useState<"internal" | "external">(
    value && !value.startsWith("/") && value !== "" ? "external" : "internal"
  );

  useEffect(() => {
    async function load() {
      const items: LinkOption[] = [{ label: "— None —", value: "" }];
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
      <div className="flex gap-1 text-xs">
        <button
          type="button"
          onClick={() => { setMode("internal"); onChange(""); }}
          className={`px-2 py-1 rounded ${mode === "internal" ? "bg-neutral-800 text-white" : "bg-neutral-100 text-neutral-600"}`}
        >
          Internal
        </button>
        <button
          type="button"
          onClick={() => { setMode("external"); onChange(""); }}
          className={`px-2 py-1 rounded ${mode === "external" ? "bg-neutral-800 text-white" : "bg-neutral-100 text-neutral-600"}`}
        >
          External
        </button>
      </div>
      {mode === "internal" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
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
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}

// ----- Hex to rgba helper -----

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
    fontRoleKey,
    fontSize,
    fontWeight,
    letterSpacing,
    textTransform,
    italic,
    underline,
    hoverBgColor,
    hoverTextColor,
    hoverBorderColor,
    hoverEffect,
    shadow,
    hoverShadow,
    transitionMs,
  } = props;

  const opacity = (bgOpacity ?? 100) / 100;
  const bg = hovered ? hoverBgColor : hexToRgba(bgColor, opacity);
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

  const buttonStyle: React.CSSProperties = {
    ...fontRole(fontRoleKey),
    fontSize: `${fontSize}px`,
    fontWeight,
    letterSpacing: `${letterSpacing}px`,
    textTransform,
    fontStyle: italic ? "italic" : "normal",
    textDecoration: underline ? "underline" : "none",
    color: fg,
    backgroundColor: bg,
    border: `${borderWidth}px ${borderStyle} ${bd}`,
    borderRadius: `${borderRadius}px`,
    padding: `${paddingY}px ${paddingX}px`,
    minWidth: minWidth ? `${minWidth}px` : undefined,
    boxShadow: sh,
    transform,
    transition: `background-color ${transitionMs}ms, color ${transitionMs}ms, border-color ${transitionMs}ms, box-shadow ${transitionMs}ms, transform ${transitionMs}ms`,
    cursor: link ? "pointer" : "default",
    textAlign: "center",
    lineHeight: 1.2,
    boxSizing: "border-box",
    ...widthStyle,
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
      <span>{label}</span>
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
};

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

// ----- Galleries index render -----

const GALLERY_AR_MAP: Record<string, string | undefined> = {
  natural: undefined,
  square: "1/1",
  "4:3": "4/3",
  "3:2": "3/2",
  "16:9": "16/9",
};

function GalleriesIndexRender(props: GalleriesIndexProps) {
  const {
    sourceMode,
    selectedSlugs,
    maxItems,
    sortOrder,
    columns,
    gap,
    fullBleed,
    maxWidth,
    aspectRatio,
    borderRadius,
    imageHoverEffect,
    showTitle,
    showDescription,
    titlePosition,
    textAlignment,
    titleFontRole,
    titleSize,
    titleColor,
    titleWeight,
    titleTransform,
    descriptionSize,
    descriptionColor,
    textPaddingX,
    textPaddingY,
    textGap,
    overlayBgColor,
    overlayOpacity,
    marginTop,
    marginBottom,
    transitionMs,
  } = props;

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

  const colCount = parseInt(columns, 10) || 3;
  const arValue = GALLERY_AR_MAP[aspectRatio];
  const isOverlay = titlePosition !== "below";

  const wrapperStyle: React.CSSProperties = {
    width: fullBleed ? "100%" : `${maxWidth}%`,
    margin: fullBleed ? `${marginTop}px 0 ${marginBottom}px` : `${marginTop}px auto ${marginBottom}px`,
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
    gap: `${gap}px`,
  };

  if (limited.length === 0) {
    return (
      <div style={wrapperStyle}>
        <div className="rounded border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          {sourceMode === "manual" ? `Pick at least one ${siteConfig.labels.gallery.toLowerCase()}.` : `No published ${siteConfig.labels.gallery.toLowerCase()} found.`}
        </div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <div style={gridStyle}>
        {limited.map((g) => {
          const hovered = hoveredId === g.id;
          const href = `/${siteConfig.labels.gallerySlug}/${g.slug}`;

          const overlayInset =
            titlePosition === "overlay-top"
              ? { top: 0, left: 0, right: 0 }
              : titlePosition === "overlay-center"
                ? { top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center" }
                : { bottom: 0, left: 0, right: 0 };

          const titleEl = showTitle && (
            <div
              style={{
                ...fontRole(titleFontRole),
                fontSize: `${titleSize}px`,
                fontWeight: titleWeight,
                color: titleColor,
                textTransform: titleTransform,
                textAlign: textAlignment,
                lineHeight: 1.25,
              }}
            >
              {g.title}
            </div>
          );

          const descEl = showDescription && g.description && (
            <div
              style={{
                fontSize: `${descriptionSize}px`,
                color: descriptionColor,
                textAlign: textAlignment,
                marginTop: `${textGap}px`,
                lineHeight: 1.4,
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

          const overlayBg = isOverlay ? hexToRgba(overlayBgColor, overlayOpacity / 100) : undefined;

          return (
            <a
              key={g.id}
              href={href}
              style={{ display: "block", textDecoration: "none", color: "inherit" }}
              onMouseEnter={() => setHoveredId(g.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div style={imageWrapperStyle}>
                {g.coverImageUrl ? (
                  arValue ? (
                    <img src={g.coverImageUrl} alt={g.title} style={imageStyle} loading="lazy" />
                  ) : (
                    <img src={g.coverImageUrl} alt={g.title} style={{ ...imageStyle, height: "auto" }} loading="lazy" />
                  )
                ) : (
                  <div className="flex h-48 w-full items-center justify-center bg-neutral-100 text-xs text-neutral-400">
                    No cover image
                  </div>
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
                <div style={{ padding: `${textPaddingY}px ${textPaddingX}px` }}>
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
    fontRoleKey,
    fontSize,
    fontWeight,
    letterSpacing,
    textTransform,
    italic,
    underline,
    descriptionSize,
    descriptionColor,
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
  } = props;

  const safeItems = items ?? [];

  const justify =
    alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center";

  const colCount = parseInt(columns, 10) || 3;
  const arValue = LINKLIST_AR_MAP[imageAspectRatio];

  let containerStyle: React.CSSProperties = {
    marginTop: `${marginTop}px`,
    marginBottom: `${marginBottom}px`,
  };

  if (layout === "card-grid") {
    containerStyle = {
      ...containerStyle,
      display: "grid",
      gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
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

  return (
    <div style={containerStyle}>
      {safeItems.map((item, i) => {
        const hovered = hoveredId === item.id;
        const isLast = i === safeItems.length - 1;

        const bg = hovered
          ? hoverBgColor
          : bgOpacity > 0
            ? hexToRgba(bgColor, bgOpacity / 100)
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
          ...fontRole(fontRoleKey),
          fontSize: `${fontSize}px`,
          fontWeight,
          letterSpacing: `${letterSpacing}px`,
          textTransform,
          fontStyle: italic ? "italic" : "normal",
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
            <div>{item.label}</div>
            {showDescription && item.description && (
              <div
                style={{
                  fontSize: `${descriptionSize}px`,
                  color: hovered ? hoverTextColor : descriptionColor,
                  marginTop: 2,
                  fontWeight: 400,
                  textTransform: "none",
                  letterSpacing: 0,
                  fontStyle: "normal",
                  textDecoration: "none",
                  lineHeight: 1.4,
                }}
              >
                {item.description}
              </div>
            )}
          </div>
        );

        const inner =
          imagePosition === "right" ? (
            <>
              {iconEl}
              {textEl}
              {imageEl}
            </>
          ) : (
            <>
              {imageEl}
              {iconEl}
              {textEl}
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
}

// ----- Metadata fields picker -----

const METADATA_OPTIONS = [
  { key: "title", label: "Title" },
  { key: "filename", label: "Filename" },
  { key: "description", label: "Description" },
  { key: "location", label: "Location" },
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

// ----- Hero slideshow client -----

interface HeroSlideshowClientProps {
  slug: string;
  maxPhotos: number;
  serverPhotos?: EmbedPhoto[];
  height: string;
  aspectRatio: "none" | "16:9" | "3:2" | "4:3" | "1:1";
  autoPlay: boolean;
  interval: number;
  pauseOnHover: boolean;
  transitionDuration: number;
  showArrows: boolean;
  showDots: boolean;
  fullBleed: boolean;
  maxWidth: string;
  objectFit: "cover" | "contain";
  overlayOpacity: number;
}

function HeroSlideshowClient({
  slug,
  maxPhotos,
  serverPhotos,
  height,
  aspectRatio,
  autoPlay,
  interval,
  pauseOnHover,
  transitionDuration,
  showArrows,
  showDots,
  fullBleed,
  maxWidth,
  objectFit,
  overlayOpacity,
}: HeroSlideshowClientProps) {
  // Normalize legacy vh values to dvh for correct mobile viewport sizing
  const normalizedHeight = height.replace(/(\d+)vh$/, "$1dvh");

  const [fetchedPhotos, setFetchedPhotos] = useState<EmbedPhoto[]>([]);
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (serverPhotos) return;
    let cancelled = false;
    fetch(`/api/photos?gallerySlug=${slug}`)
      .then((r) => r.json())
      .then((data: EmbedPhoto[]) => { if (!cancelled) setFetchedPhotos(data.slice(0, maxPhotos)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug, maxPhotos, serverPhotos]);

  const photos = serverPhotos ?? fetchedPhotos;

  useEffect(() => {
    if (!autoPlay || photos.length < 2) return;
    if (pauseOnHover && isHovered) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % photos.length);
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [autoPlay, interval, pauseOnHover, isHovered, photos.length]);

  const prev = () => setCurrent((c) => (c - 1 + photos.length) % photos.length);
  const next = () => setCurrent((c) => (c + 1) % photos.length);

  const fullBleedStyle: React.CSSProperties = fullBleed
    ? { marginLeft: "calc(-50vw + 50%)", marginRight: "calc(-50vw + 50%)", width: "100vw" }
    : { width: maxWidth, marginLeft: "auto", marginRight: "auto" };

  const arMap: Record<string, string> = { "16:9": "16/9", "3:2": "3/2", "4:3": "4/3", "1:1": "1/1" };
  const containerStyle: React.CSSProperties = {
    ...fullBleedStyle,
    ...(aspectRatio !== "none"
      ? { aspectRatio: arMap[aspectRatio], minHeight: normalizedHeight }
      : { height: normalizedHeight }),
  };

  if (photos.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-neutral-100 text-neutral-400"
        style={containerStyle}
      >
        No photos found in this gallery
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden"
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {photos.map((photo, i) => (
        <div
          key={photo.id}
          className="absolute inset-0"
          style={{
            opacity: i === current ? 1 : 0,
            transition: `opacity ${transitionDuration}ms ease-in-out`,
            zIndex: i === current ? 1 : 0,
          }}
        >
          <img
            src={photo.url}
            alt={photo.title ?? ""}
            className="h-full w-full opacity-0 transition-opacity duration-300"
            style={{ objectFit, objectPosition: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%` }}
            loading={i === 0 ? "eager" : "lazy"}
            ref={(el) => { if (el?.complete) el.classList.remove("opacity-0"); }}
            onLoad={(e) => { (e.target as HTMLImageElement).classList.remove("opacity-0"); }}
          />
        </div>
      ))}
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
              onClick={() => setCurrent(i)}
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

  const addSlide = (type: CarouselSlide["type"]) => {
    const newSlide: CarouselSlide = {
      id: crypto.randomUUID(),
      type,
      imageUrl: "",
      title: "",
      subtitle: "",
      bgColor: "#f5f5f5",
      textColor: "#171717",
    };
    onChange([...slides, newSlide]);
    setExpandedId(newSlide.id);
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
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-neutral-500">Background</label>
                      <input type="color" value={slide.bgColor} onChange={(e) => updateSlide(slide.id, { bgColor: e.target.value })} className="mt-0.5 h-8 w-full cursor-pointer rounded border border-neutral-200" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium text-neutral-500">Text Color</label>
                      <input type="color" value={slide.textColor} onChange={(e) => updateSlide(slide.id, { textColor: e.target.value })} className="mt-0.5 h-8 w-full cursor-pointer rounded border border-neutral-200" />
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
    </div>
  );
}

// ----- Carousel client renderer -----

function CarouselClient({
  slides,
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
}: CarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);

  const totalSlides = slides.length;
  const canLoop = transition === "slide" && totalSlides > slidesPerView;

  // For fade mode, maxIndex is simple; for slide mode we loop infinitely
  const fadeMaxIndex = totalSlides - 1;

  useEffect(() => {
    if (!autoPlay || totalSlides <= (transition === "fade" ? 1 : slidesPerView)) return;
    if (pauseOnHover && isHovered) return;
    const timer = setInterval(() => {
      setCurrent((prev) => {
        if (transition === "fade") return prev >= fadeMaxIndex ? 0 : prev + 1;
        return prev + 1;
      });
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [autoPlay, interval, pauseOnHover, isHovered, totalSlides, slidesPerView, fadeMaxIndex, transition]);

  // After sliding to a clone, silently snap to the real slide
  useEffect(() => {
    if (transition !== "slide" || !canLoop) return;
    if (current >= totalSlides || current < 0) {
      const timeout = setTimeout(() => {
        setIsTransitioning(false);
        // Wrap index into the real range
        setCurrent(((current % totalSlides) + totalSlides) % totalSlides);
        // Re-enable transitions on the next frame
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setIsTransitioning(true));
        });
      }, transitionDuration);
      return () => clearTimeout(timeout);
    }
  }, [current, totalSlides, transition, canLoop, transitionDuration]);

  const prev = () => {
    if (transition === "fade") {
      setCurrent((c) => (c <= 0 ? fadeMaxIndex : c - 1));
    } else {
      setCurrent((c) => c - 1);
    }
  };
  const next = () => {
    if (transition === "fade") {
      setCurrent((c) => (c >= fadeMaxIndex ? 0 : c + 1));
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const arMap: Record<string, string> = { "16:9": "16/9", "3:2": "3/2", "4:3": "4/3", "1:1": "1/1" };

  if (totalSlides === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded bg-neutral-100 text-neutral-400">
        Add slides to the carousel
      </div>
    );
  }

  const renderSlideContent = (slide: CarouselSlide, index: number) => {
    const slideStyle: React.CSSProperties = {
      borderRadius: `${borderRadius}px`,
      overflow: "hidden",
      height: "100%",
      ...(aspectRatio !== "none" ? { aspectRatio: arMap[aspectRatio] } : { height }),
    };

    if (slide.type === "image") {
      return (
        <div className="relative" style={slideStyle}>
          {slide.imageUrl ? (
            <img
              src={slide.imageUrl}
              alt={slide.title || ""}
              className="h-full w-full opacity-0 transition-opacity duration-300"
              style={{ objectFit, borderRadius: `${borderRadius}px` }}
              loading={index < slidesPerView ? "eager" : "lazy"}
              ref={(el) => { if (el?.complete) el.classList.remove("opacity-0"); }}
              onLoad={(e) => { (e.target as HTMLImageElement).classList.remove("opacity-0"); }}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-neutral-100 text-neutral-400 text-sm">No image</div>
          )}
        </div>
      );
    }

    if (slide.type === "text") {
      return (
        <div
          className="flex flex-col items-center justify-center p-6 text-center"
          style={{ ...slideStyle, backgroundColor: slide.bgColor, color: slide.textColor }}
        >
          {slide.title && <h3 className="text-xl mb-2" style={fontRole("headings")}>{slide.title}</h3>}
          {slide.subtitle && <p className="text-sm opacity-80">{slide.subtitle}</p>}
        </div>
      );
    }

    // mixed
    return (
      <div className="relative" style={slideStyle}>
        {slide.imageUrl ? (
          <img
            src={slide.imageUrl}
            alt={slide.title || ""}
            className="h-full w-full opacity-0 transition-opacity duration-300"
            style={{ objectFit, borderRadius: `${borderRadius}px` }}
            loading={index < slidesPerView ? "eager" : "lazy"}
            ref={(el) => { if (el?.complete) el.classList.remove("opacity-0"); }}
            onLoad={(e) => { (e.target as HTMLImageElement).classList.remove("opacity-0"); }}
          />
        ) : (
          <div className="h-full w-full" style={{ backgroundColor: slide.bgColor }} />
        )}
        <div className="absolute inset-0 bg-black/30" style={{ borderRadius: `${borderRadius}px` }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center" style={{ color: slide.textColor || "#fff" }}>
          {slide.title && <h3 className="text-xl mb-1" style={fontRole("headings")}>{slide.title}</h3>}
          {slide.subtitle && <p className="text-sm opacity-90">{slide.subtitle}</p>}
        </div>
      </div>
    );
  };

  // Fade mode: stack all slides, show one at a time
  if (transition === "fade") {
    return (
      <div
        className="relative overflow-hidden"
        style={{ ...(aspectRatio !== "none" ? { aspectRatio: arMap[aspectRatio] } : { height }), borderRadius: `${borderRadius}px` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
            <button onClick={prev} aria-label="Previous slide" className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors" style={{ zIndex: 3 }}>&#8249;</button>
            <button onClick={next} aria-label="Next slide" className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors" style={{ zIndex: 3 }}>&#8250;</button>
          </>
        )}
        {showDots && totalSlides > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 3 }}>
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} aria-label={`Go to slide ${i + 1}`} className="h-2 w-2 rounded-full transition-colors" style={{ backgroundColor: i === current ? "white" : "rgba(255,255,255,0.45)" }} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Slide mode: infinite loop with cloned slides
  // Each slide width = (container - total gaps) / slidesPerView
  // We use a CSS variable on the container so translateX can reference it
  const gapTotal = (slidesPerView - 1) * gap;
  const slideWidth = `calc((100% - ${gapTotal}px) / ${slidesPerView})`;

  // Build extended slide array: [clones of last N] + [real slides] + [clones of first N]
  const cloneCount = slidesPerView;
  const extendedSlides = canLoop
    ? [
        ...slides.slice(-cloneCount).map((s, i) => ({ ...s, _key: `clone-end-${i}` })),
        ...slides.map((s) => ({ ...s, _key: s.id })),
        ...slides.slice(0, cloneCount).map((s, i) => ({ ...s, _key: `clone-start-${i}` })),
      ]
    : slides.map((s) => ({ ...s, _key: s.id }));

  // Offset current index to account for prepended clones
  const trackIndex = canLoop ? current + cloneCount : Math.max(0, Math.min(current, totalSlides - slidesPerView));

  // Map current to a real index for dot highlighting
  const realIndex = ((current % totalSlides) + totalSlides) % totalSlides;

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={trackRef}
        className="flex"
        style={{
          gap: `${gap}px`,
          transform: `translateX(calc(-${trackIndex} * (${slideWidth} + ${gap}px)))`,
          transition: isTransitioning ? `transform ${transitionDuration}ms ease-in-out` : "none",
        }}
      >
        {extendedSlides.map((slide, i) => (
          <div
            key={slide._key}
            className="flex-shrink-0"
            style={{ width: slideWidth }}
          >
            {renderSlideContent(slide, i)}
          </div>
        ))}
      </div>
      {showArrows && totalSlides > slidesPerView && (
        <>
          <button onClick={prev} aria-label="Previous slide" className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors" style={{ zIndex: 3 }}>&#8249;</button>
          <button onClick={next} aria-label="Next slide" className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors" style={{ zIndex: 3 }}>&#8250;</button>
        </>
      )}
      {showDots && totalSlides > slidesPerView && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} aria-label={`Go to slide ${i + 1}`} className="h-2 w-2 rounded-full transition-colors" style={{ backgroundColor: i === realIndex ? "#171717" : "#d4d4d4" }} />
          ))}
        </div>
      )}
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
  layout: "grid" | "masonry";
  columns: "2" | "3" | "4";
  aspectRatio: "square" | "natural" | "4:3" | "16:9";
  gap: number;
  imageMaxWidth: number;
  borderRadius: number;
  showMetadata: boolean;
  metadataFields: string[];
  useGlobalLightbox: boolean;
  lightboxMetadataFields: string[] | null;
  lightboxCornerRadius: number | null;
  lightboxCaptionPosition: "below" | "overlay-top" | "overlay-bottom" | null;
  lightboxFadeSpeed: "none" | "fast" | "medium" | "slow" | null;
  lightboxCaptionAlignment: "left" | "center" | "right" | null;
  globalLightbox?: GlobalLightboxSettings;
  serverPhotos?: EmbedPhoto[];
}

const aspectRatioValues: Record<string, string | undefined> = { square: "1/1", natural: undefined, "4:3": "4/3", "16:9": "16/9" };
const gridColClasses = { "2": "grid-cols-1 sm:grid-cols-2", "3": "grid-cols-1 sm:grid-cols-2 md:grid-cols-3", "4": "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" };
const masonryColClasses = { "2": "columns-1 sm:columns-2", "3": "columns-1 sm:columns-2 md:columns-3", "4": "columns-1 sm:columns-2 md:columns-3 lg:columns-4" };

function GalleryEmbedRenderer({ slug, max, layout, columns, aspectRatio, gap, imageMaxWidth, borderRadius, showMetadata, metadataFields, useGlobalLightbox, lightboxMetadataFields, lightboxCornerRadius, lightboxCaptionPosition, lightboxFadeSpeed, lightboxCaptionAlignment, globalLightbox, serverPhotos }: GalleryEmbedRendererProps) {
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

  const photos = serverPhotos ?? fetchedPhotos;

  if (loading) {
    return <div className="text-center text-neutral-400 py-8">Loading gallery...</div>;
  }

  if (photos.length === 0) {
    return <div className="text-center text-neutral-400 py-8">No photos found for &ldquo;{slug}&rdquo;</div>;
  }

  const gapStyle = { gap: `${gap}px` };

  const renderPhotoMeta = (photo: EmbedPhoto) => {
    if (!showMetadata || metadataFields.length === 0) return null;
    return (
      <div className="mt-1.5 space-y-0.5 text-sm" style={{ color: "var(--theme-color-gallery-captions)" }}>
        {metadataFields.includes("title") && photo.title && (
          <p className="font-medium" style={{ fontFamily: "var(--theme-font-captions)" }}>{parseLinks(photo.title)}</p>
        )}
        {metadataFields.includes("filename") && photo.filename && (
          <p className="text-xs" style={{ opacity: 0.65 }}>{photo.filename}</p>
        )}
        {metadataFields.includes("description") && photo.description && (
          <p style={{ opacity: 0.85 }}>{parseLinks(photo.description)}</p>
        )}
        {metadataFields.includes("location") && photo.location && (
          <p className="text-xs" style={{ opacity: 0.65 }}>{parseLinks(photo.location)}</p>
        )}
        {metadataFields.includes("camera") && photo.cameraSettings && (
          <p className="text-xs" style={{ opacity: 0.65 }}>
            {[photo.cameraSettings.camera, photo.cameraSettings.lens, photo.cameraSettings.aperture, photo.cameraSettings.shutter, photo.cameraSettings.iso ? `ISO ${photo.cameraSettings.iso}` : null].filter(Boolean).join(" \u00b7 ")}
          </p>
        )}
      </div>
    );
  };

  const arValue = aspectRatioValues[aspectRatio ?? "square"];

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

  return (
    <>
      {layout === "masonry" ? (
        <div className={masonryColClasses[columns]} style={{ ...gapStyle, columnGap: `${gap}px` }}>
          {photos.map((photo, i) => (
            <div key={photo.id} style={{ marginBottom: `${gap}px` }} className="break-inside-avoid">
              {photoCard(photo, i, false)}
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid ${gridColClasses[columns]}`} style={gapStyle}>
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
      />
    </>
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
export type { Config };
export type PuckData = Parameters<typeof import("@puckeditor/core").Render>[0]["data"];
