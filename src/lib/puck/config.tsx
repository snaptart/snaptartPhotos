"use client";

import type { Config } from "@puckeditor/core";
import { DropZone } from "@puckeditor/core";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import type { JSONContent } from "@tiptap/react";
import TiptapEditor from "@/components/admin/TiptapEditor";
import ImagePicker from "@/components/admin/ImagePicker";
import { parseLinks } from "@/lib/parseLinks";
import Lightbox from "@/components/public/Lightbox";
import type { LightboxPhoto, LightboxSettings } from "@/components/public/Lightbox";

// Tiptap extensions for HTML generation
const tiptapExtensions = [
  StarterKit,
  Underline,
  Image,
  Link,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
];

function tiptapToHtml(content: JSONContent | null): string {
  if (!content) return "";
  try {
    return generateHTML(
      content as Parameters<typeof generateHTML>[0],
      tiptapExtensions
    );
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

type ColumnsProps = {
  columns: "2" | "3";
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

type Components = {
  RichText: RichTextProps;
  Hero: HeroProps;
  HeroSlideshow: HeroSlideshowProps;
  ImageBlock: ImageBlockProps;
  Spacer: SpacerProps;
  Columns: ColumnsProps;
  GalleryEmbed: GalleryEmbedProps;
};

// ----- Puck config -----

export const puckConfig: Config<Components> = {
  categories: {
    content: { components: ["RichText", "ImageBlock", "GalleryEmbed"] },
    layout: { components: ["Columns", "Spacer"] },
    hero: { components: ["Hero", "HeroSlideshow"] },
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
        return html ? (
          <div
            className="prose prose-lg mx-auto max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="text-neutral-400 italic">Start typing...</p>
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
              <h1 className="text-4xl md:text-6xl font-semibold text-white tracking-tight mb-4" style={{ fontFamily: "var(--theme-font-headings)" }}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xl md:text-2xl text-white/90" style={{ fontFamily: "var(--theme-font-overlay)" }}>
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
              <img src={url} alt={alt} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: focalPos }} />
            </div>
          ) : (
            <img src={url} alt={alt} className="w-full" style={{ borderRadius: `${borderRadius}px`, objectPosition: focalPos }} />
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
      defaultProps: { columns: "2", gap: "gap-8" },
      render: ({ columns, gap }) => {
        const gridCols = columns === "3" ? "md:grid-cols-3" : "md:grid-cols-2";
        const colCount = columns === "3" ? 3 : 2;
        return (
          <div className={`grid grid-cols-1 ${gridCols} ${gap}`}>
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
          label: "Gallery",
          render: ({ value, onChange }) => (
            <GalleryPicker value={value} onChange={onChange} />
          ),
        },
        maxPhotos: { type: "number", label: "Max Photos", min: 1, max: 20 },
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

    GalleryEmbed: {
      label: "Gallery Embed",
      fields: {
        gallerySlug: {
          type: "custom",
          label: "Gallery",
          render: ({ value, onChange }) => (
            <GalleryPicker value={value} onChange={onChange} />
          ),
        },
        maxPhotos: { type: "number", label: "Max Photos", min: 1, max: 50 },
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
  },
};

// ----- Gallery picker (custom Puck field) -----

import { useEffect, useState } from "react";

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
          galleries.forEach((g) => items.push({ label: `Gallery: ${g.title}`, value: `/gallery/${g.slug}` }));
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
            className="h-full w-full"
            style={{ objectFit, objectPosition: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%` }}
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
      <div className="mt-1.5 space-y-0.5 text-sm text-neutral-600">
        {metadataFields.includes("title") && photo.title && (
          <p className="font-medium" style={{ fontFamily: "var(--theme-font-captions)" }}>{parseLinks(photo.title)}</p>
        )}
        {metadataFields.includes("filename") && photo.filename && (
          <p className="text-neutral-400 text-xs">{photo.filename}</p>
        )}
        {metadataFields.includes("description") && photo.description && (
          <p className="text-neutral-500">{parseLinks(photo.description)}</p>
        )}
        {metadataFields.includes("location") && photo.location && (
          <p className="text-neutral-400 text-xs">{parseLinks(photo.location)}</p>
        )}
        {metadataFields.includes("camera") && photo.cameraSettings && (
          <p className="text-neutral-400 text-xs">
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
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%` }}
            />
          </div>
        ) : (
          <img
            src={photo.url}
            alt={photo.title ?? ""}
            width={photo.width}
            height={photo.height}
            className="w-full object-cover"
            style={{ borderRadius: radius, objectPosition: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%` }}
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

// ----- Puck Data type re-export for convenience -----
export type { Config };
export type PuckData = Parameters<typeof import("@puckeditor/core").Render>[0]["data"];
