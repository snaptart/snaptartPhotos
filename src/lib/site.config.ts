/**
 * Per-instance site configuration.
 *
 * This file is the single place to customize branding, terminology, and
 * feature flags when forking this CMS for a new site.  Everything here
 * can be overridden later via environment variables (where noted) or
 * through the admin settings UI — but these defaults ensure the app
 * boots cleanly on first deploy.
 */

const siteConfig = {
  // ── Branding ────────────────────────────────────────────────────────
  /** Default site title (used in metadata, admin UI, seed data) */
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || "My Site",

  /** Fallback meta description when none is set in the DB */
  siteDescription:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "Welcome to our website",

  /** Default admin email for seeding */
  defaultAdminEmail: process.env.ADMIN_EMAIL || "admin@example.com",

  /** Upload folder prefix in Vercel Blob storage */
  uploadFolder: process.env.UPLOAD_FOLDER || "uploads",

  // ── Terminology ─────────────────────────────────────────────────────
  // Controls labels in the admin sidebar, page headings, empty states,
  // and public routes. Change these to match your site's domain.
  labels: {
    gallery: "Gallery",
    galleries: "Galleries",
    photo: "Photo",
    photos: "Photos",
    /** Public URL prefix for gallery pages (no leading/trailing slash) */
    gallerySlug: "gallery",
  },

  // ── Feature flags ───────────────────────────────────────────────────
  features: {
    /** Show "Stories" section in admin sidebar */
    stories: true,
    /** Show photography-specific metadata (camera settings, location) */
    photoMetadata: true,
    /** Show "Submissions" section in admin sidebar */
    submissions: true,
  },

  // ── Lightbox metadata options ───────────────────────────────────────
  // Which metadata fields are available in the lightbox settings UI.
  // Only fields with `enabled: true` appear as options.
  lightboxMetadataOptions: [
    { key: "title", label: "Title", enabled: true },
    { key: "description", label: "Description", enabled: true },
    { key: "location", label: "Location", enabled: true },
    { key: "camera", label: "Camera Settings", enabled: true },
    { key: "filename", label: "Filename", enabled: true },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
export default siteConfig;
