# Custom Photo CMS

## Project Overview
A custom CMS for photography and portfolio sites: galleries, a page builder, short stories and a full admin dashboard. The shared core lives in `snaptart/cms`; each site (snaptart.com, gardensalacarte.com) is its own repo that merges updates from it and keeps its own `site.config.ts`, content and database. See `PROMOTING.md`.

## Tech Stack
- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 + EB Garamond (serif) + Inter (sans)
- **Database**: Vercel Postgres (Neon) via Drizzle ORM
- **Auth**: NextAuth.js v5 (beta) — single admin, credentials provider
- **Image Storage**: Vercel Blob (@vercel/blob)
- **Email**: Resend (form submission notifications)
- **Drag-and-drop**: @dnd-kit/core + @dnd-kit/sortable
- **Rich Text**: Tiptap (planned)
- **Lightbox**: Custom built-in lightbox (GalleryGrid component)

## Key Commands
```
npm run dev          # Local dev server
npm run build        # Production build
npm run db:push      # Push schema to DB (no migrations)
npm run db:generate  # Generate migration files
npm run db:migrate   # Run migrations
npm run db:seed      # Seed admin user + site settings
```

## Architecture

### Directory Structure
```
src/
├── app/
│   ├── layout.tsx                          # Root layout (fonts, metadata)
│   ├── globals.css                         # Tailwind imports + theme vars
│   ├── (public)/                           # Public site (route group)
│   │   ├── layout.tsx                      # Public layout (Navbar + Footer)
│   │   ├── page.tsx                        # Homepage
│   │   ├── gallery/[slug]/page.tsx         # Public gallery view (server component + metadata)
│   │   └── gallery/[slug]/GalleryGrid.tsx # Client masonry grid + lightbox
│   │   └── [slug]/page.tsx                 # (planned) Dynamic pages
│   ├── admin/                              # Admin dashboard
│   │   ├── layout.tsx                      # Admin layout (checks session, wraps Sidebar)
│   │   ├── page.tsx                        # Dashboard home (card grid)
│   │   ├── login/page.tsx                  # Login form (client component)
│   │   ├── settings/page.tsx               # Site settings form
│   │   ├── menus/page.tsx                  # Menu management (dnd-kit sortable)
│   │   ├── galleries/page.tsx               # Gallery CRUD (dnd-kit sortable, publish toggle)
│   │   ├── photos/page.tsx                 # Photo upload/manage (Cloudinary, dnd-kit sortable)
│   │   ├── pages/                          # (planned) Page CRUD
│   │   └── stories/                        # (planned) Short stories CRUD
│   └── api/
│       ├── auth/[...nextauth]/route.ts     # NextAuth handler
│       ├── settings/route.ts               # GET/PUT site settings
│       ├── menu-items/route.ts             # GET/POST/PUT/DELETE + bulk reorder
│       ├── galleries/route.ts              # GET/POST/PUT/DELETE + bulk reorder
│       ├── photos/route.ts                 # GET/POST/PUT/DELETE + bulk reorder
│       ├── upload/route.ts                 # POST file upload → Cloudinary
│       ├── pages/route.ts                  # (planned)
│       └── stories/verify/route.ts         # (planned)
├── components/
│   ├── public/
│   │   ├── Navbar.tsx                      # Server component, reads menu_items + site_settings from DB
│   │   └── Footer.tsx                      # Server component, reads site_settings from DB
│   ├── admin/
│   │   ├── Sidebar.tsx                     # Client component, nav links + sign out
│   │   └── SortableItem.tsx                # Reusable dnd-kit sortable wrapper
│   └── ui/                                 # (planned) Shared UI primitives
└── lib/
    ├── auth.ts                             # NextAuth config (credentials provider, JWT callbacks)
    ├── db/
    │   ├── schema.ts                       # Drizzle schema (all 6 tables)
    │   ├── index.ts                        # Lazy DB connection via Proxy
    │   └── seed.ts                         # Seeds admin user + default site settings
    ├── (image uploads use @vercel/blob directly in API routes)
    └── resend.ts                           # Resend client + form notification emails (needs RESEND_API_KEY + RESEND_FROM_EMAIL)
```

### Database Schema (src/lib/db/schema.ts)
Tables defined with Drizzle ORM:
- **admin_users** — id, email, password_hash, created_at
- **site_settings** — id, site_title, logo_url, instagram_url, footer_text, contact_email, updated_at
- **menu_items** — id, label, url, target_type, target_id, position, parent_id, created_at
- **pages** — id, title, slug, content (jsonb), page_type, is_password_protected, password_hash, meta_title, meta_description, og_image_url, is_published, position, created_at, updated_at
- **galleries** — id, title, slug, description, cover_image_url, parent_id, position, is_published, created_at, updated_at
- **photos** — id, blob_url, url, thumbnail_url, title, description, location, latitude/longitude, camera_settings (jsonb), tags (text[]), width, height, focal_x/y, taken_at, created_at, updated_at — *standalone; no gallery FK on the photo itself*
- **gallery_photos** *(junction)* — gallery_id (FK→galleries, cascade), photo_id (FK→photos, cascade), position, created_at; composite PK on (gallery_id, photo_id), index on photo_id. A photo can belong to many galleries; per-gallery ordering lives here.
- **page_elements** — id, page_id (FK→pages), element_type, content (jsonb), position, created_at
- **page_revisions** — id, page_id (FK→pages, cascade), content (jsonb), reason, batch_id, created_at. A page's content saved just before a change made outside its editor (a block copied in, block defaults applied); `batch_id` groups one action's revisions so it can be undone as a whole. Last 20 per page kept. See `src/lib/page-revisions.ts`.
- **site_settings** also has `favicon_url`, `favicon_dark_url`, `favicon_shape` ("square" | "round"; null = square), `share_image_url` (Settings → Identity → Browser icon & sharing).

**Site icons**: `/favicon.ico`, `/site-icon/[file]` and `/manifest.webmanifest` render the uploaded icon (any size, via sharp) or a first-letter monogram. There are no static icon files in `src/app`; a site sets its icon in the admin.
**Block defaults**: stored in the active theme preset (`themeSettings.blockDefaults` + `blockDefaultsPast`). New blocks start with them (`useEditorConfig()` in the editors); existing blocks change only via Settings → Block defaults → Apply. Which blocks/props qualify: `src/lib/puck/block-defaults.ts`.
**Header & footer**: layout and styling live in the active theme preset (`ChromeSettings` in `src/lib/theme/types.ts`, defaults = the original look), edited in Settings → Look → Header & footer. `SiteHeader` / `SiteFooter` draw them for both the public site and the admin preview; their CSS is in `globals.css` (`.site-header`, `.site-footer`), driven by theme variables and data attributes. "Over a photo" applies on pages where `opensWithPhoto()` (`src/lib/header-over-photo.tsx`) is true.
**Page addresses** never change with the title; `slug` is edited explicitly and checked by `src/lib/page-slugs.ts` (pages and stories share one namespace).

**Reading photos**: use `selectPhotosForGallery(galleryId)` / `selectPhotosForGalleries(ids)` from `src/lib/db/photo-queries.ts`. Returns flat photo rows joined with the junction (`galleryId` and `position` come from `gallery_photos`).
**Writing memberships**: `addPhotoToGallery`, `setPhotoGalleries`, `selectGalleryIdsForPhoto` in the same module.

### Auth Flow
- NextAuth v5 with credentials provider (src/lib/auth.ts)
- Route protection via proxy middleware (src/proxy.ts) — protects /admin/* except /admin/login
- Admin layout (src/app/admin/layout.tsx) checks session; unauthenticated users see login page without sidebar
- First admin user seeded via db:seed; more are added in Admin → Settings → Users (`/api/admin-users`). Any admin can add users and change passwords; nobody can delete their own account.
- **`AUTH_SECRET` is required in production.** NextAuth reads it internally, so a missing value isn't caught by a code grep: `/api/auth/*` returns 500 and admin auth fails open. See `.env.example`.

### DB Connection Pattern
- src/lib/db/index.ts exports a lazy Proxy-based `db` object
- Avoids build-time errors when DATABASE_URL is not set
- drizzle.config.ts and seed.ts both load .env.local explicitly via `config({ path: ".env.local" })`

### API Patterns
- All mutation endpoints check `await auth()` for session
- Settings API: GET (public) / PUT (auth required)
- Menu items API: GET (public) / POST+PUT+DELETE (auth required), PUT supports bulk reorder via `{ items: [{ id, position }] }`
- Galleries API: GET (public) / POST+PUT+DELETE (auth required), PUT supports bulk reorder, auto-generates slug from title
- Photos API: GET (public, filterable by `galleryId` or `gallerySlug`; admin-only `?id=X` returns photo + galleryIds) / POST+PUT+DELETE (auth required). POST accepts `galleryIds: string[]` (or legacy single `galleryId`). PUT single accepts `galleryIds` to replace memberships; PUT bulk patch accepts `galleryId` (move = replace) or `addToGalleryId` (add). DELETE without `galleryId` deletes the photo and its blob; DELETE with `galleryId` removes only that membership and garbage-collects the photo if it has no remaining memberships.
- Upload API: POST (auth required) — accepts multipart file, uploads to Vercel Blob, returns blobUrl/url. `kind=asset` (site icons) skips the thumbnail/EXIF step and also accepts SVG.
- Pages/Stories API: POST `{ duplicateId }` copies a page/story (unpublished, unique slug). PUT changes `slug` only when sent (409 with a message if taken/reserved).
- `/api/pages/copy-blocks` POST `{ targetId, fragment }` appends blocks (with nested zones, fresh ids) to another page; `/api/pages/revisions` GET `?pageId=` / POST `{ revisionId | batchId }` restores.
- `/api/block-defaults` GET/PUT; `/api/block-defaults/apply` POST (dry run or apply, returns `batchId` for undo). All admin-only.

## Implementation Progress
- [x] Phase 1: Project scaffold, auth, DB schema, admin login, sidebar
- [x] Phase 2: Site settings API + admin page, menu items API + admin page (dnd-kit), DB-driven Navbar + Footer
- [x] Phase 3: Gallery + photo management (Vercel Blob upload, admin CRUD, public gallery with masonry grid + lightbox)
- [ ] Phase 4: Page management (Tiptap rich text)
- [ ] Phase 5: Short stories (password-protected)
- [ ] Phase 6: Contact form (Resend)
- [ ] Phase 7: Polish + SEO

## Email Setup (per site)
Form submission notifications are sent via Resend. Each site configures its own account:
1. Create a Resend account, add the site's domain, and add the DNS records Resend lists (they live on a `send.` subdomain / DKIM selectors — only ADD records; never edit existing MX or root SPF records, which may serve the site's regular mailboxes).
2. Create a **sending-only** API key scoped to the domain.
3. In the site's Vercel project set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (e.g. `Site Name <noreply@example.com>`; the address must be on the verified domain but need not be a real mailbox).

Recipient per form = the Form block's "Notification email", falling back to the site's Contact Email setting. If the env vars are unset, sends are skipped silently and submissions are still stored (Admin → Submissions). Submissions are rate-limited to 5 per IP per hour, counted against stored rows so the limit holds across serverless instances.

## Site config (shared defaults + per-site overrides)
- `src/lib/site.config.defaults.ts` is owned by this repo: new config fields go here, with safe defaults.
- `src/lib/site.config.ts` is owned by each site. This repo ships it once as a stub and never edits it again,
  so a site merging updates from here never conflicts on it.
- `features.fieldMap` (off by default; `NEXT_PUBLIC_FEATURE_FIELD_MAP=true` in `.env.local` turns it on locally)
  gates the Field Map block, the `/map/[slug]` region pages, the placement editor and the gallery form's map fields.
- `rewrites` lets a site add its own URL rewrites; `next.config.ts` returns them.

## apps/trip-map — a separate app inside this repo
A 2026 France/Italy trip journal (medieval-style map + photo journal), built with **Expo SDK 57 /
React Native + react-native-web** — a different stack from this Next.js site. It shares nothing
with the site's code, dependencies or build: it has its own `package.json`, `node_modules` and
`tsconfig.json`, and is excluded from this project's tsconfig. See `apps/trip-map/CLAUDE.md` and
`PROJECT_NOTES.md` for it.

- Build it by hand: **`npm run build:site`** in that folder exports it and copies the result to
  `public/2026-france-and-italy/`, which is committed. `next build` never touches it, so a change
  to the app does nothing on the deployed site until that command is run and its output committed.
- Its exported output is served as static files from `public/2026-france-and-italy/`, so the page
  is an island: no shared navbar, footer or SEO. `site.config.ts` (`rewrites`) maps the bare path to
  that folder's `index.html`; `app.json`'s `experiments.baseUrl` gives its assets the same prefix.
- It reads its photographs from this site's galleries (`GET /api/photos?gallerySlug=…`, one
  published gallery per station — `cucuron-2026`, `eze-2026`, `noli-2026`, `marseille-2026`,
  `lyon-2026`) rather than from files bundled into the app, so the images come from Vercel Blob
  like the rest of the site. Only `cucuron-2026` exists so far.
- Because of that it needs `npm run dev` running here to show anything in development, and
  `GET /api/photos` and `GET /api/galleries` send CORS read headers (`src/lib/cors.ts`) so it
  can fetch them from its own dev server on :8081.

## Notes
- Next.js 16 renamed `middleware.ts` to `proxy.ts`
- Fonts: EB Garamond (serif, headings/public) + Inter (sans, admin/body)
- Old site assets stored in `_old/` directory (logos, images, docs)
- Seeded admin login: `ADMIN_EMAIL` (default admin@example.com) / `ADMIN_PASSWORD` (default changeme). Change it before deploying.
