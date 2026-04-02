import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  real,
} from "drizzle-orm/pg-core";

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const siteSettings = pgTable("site_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  siteTitle: text("site_title").notNull().default("My Site"),
  logoUrl: text("logo_url"),
  instagramUrl: text("instagram_url"),
  footerText: text("footer_text"),
  footerAlignment: text("footer_alignment").notNull().default("center"),
  contactEmail: text("contact_email"),
  homepageId: uuid("homepage_id"),
  // Global lightbox defaults
  lightboxMetadataFields: text("lightbox_metadata_fields").array().default(["title", "description"]),
  lightboxCornerRadius: integer("lightbox_corner_radius").default(0),
  lightboxCaptionPosition: text("lightbox_caption_position").default("below"),
  lightboxFadeSpeed: text("lightbox_fade_speed").default("medium"),
  lightboxCaptionAlignment: text("lightbox_caption_alignment").default("left"),
  activeThemeId: uuid("active_theme_id"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const themes = pgTable("themes", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().default("Default"),
  themeSettings: jsonb("theme_settings").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const menuItems = pgTable("menu_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  targetType: text("target_type").notNull().default("page"), // page | gallery | external
  targetId: uuid("target_id"),
  position: integer("position").notNull().default(0),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pages = pgTable("pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: jsonb("content"), // Tiptap JSON document
  pageType: text("page_type").notNull().default("custom"), // about | contact | story | custom
  isPasswordProtected: boolean("is_password_protected").notNull().default(false),
  passwordHash: text("password_hash"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImageUrl: text("og_image_url"),
  typography: jsonb("typography").$type<{
    fontHeadings?: string;
    fontBody?: string;
    bodyFontSize?: "small" | "medium" | "large";
  }>(),
  showTitle: boolean("show_title").notNull().default(true),
  isPublished: boolean("is_published").notNull().default(false),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const galleries = pgTable("galleries", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  parentId: uuid("parent_id"),
  position: integer("position").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const photos = pgTable("photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  galleryId: uuid("gallery_id")
    .notNull()
    .references(() => galleries.id, { onDelete: "cascade" }),
  blobUrl: text("blob_url").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  filename: text("filename"),
  title: text("title"),
  description: text("description"),
  location: text("location"), // optional — photography/portfolio metadata
  cameraSettings: jsonb("camera_settings"), // optional — { camera, lens, iso, aperture, shutter }
  tags: text("tags").array(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  focalX: real("focal_x").notNull().default(50),
  focalY: real("focal_y").notNull().default(50),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const formSubmissions = pgTable("form_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  formName: text("form_name").notNull(),
  data: jsonb("data").notNull(), // { fieldName: value, ... }
  ipAddress: text("ip_address"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const pageElements = pgTable("page_elements", {
  id: uuid("id").defaultRandom().primaryKey(),
  pageId: uuid("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  elementType: text("element_type").notNull(), // hero | text | image_grid | gallery_embed
  content: jsonb("content").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
