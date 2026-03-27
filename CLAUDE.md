# SnaptArt — Custom Photo CMS

## Project Overview
A custom photo CMS website rebuilding snaptart.com (previously Squarespace). Photography portfolio for Michael Schroeder featuring galleries, pages, short stories, and a full admin dashboard.

## Tech Stack
- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 + EB Garamond (serif) + Inter (sans)
- **Database**: Vercel Postgres (Neon) via Drizzle ORM
- **Auth**: NextAuth.js v5 (beta) — single admin, credentials provider
- **Image Storage**: Vercel Blob (@vercel/blob)
- **Email**: Resend (planned)
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
    └── resend.ts                           # (planned)
```

### Database Schema (src/lib/db/schema.ts)
6 tables defined with Drizzle ORM:
- **admin_users** — id, email, password_hash, created_at
- **site_settings** — id, site_title, logo_url, instagram_url, footer_text, contact_email, updated_at
- **menu_items** — id, label, url, target_type, target_id, position, parent_id, created_at
- **pages** — id, title, slug, content (jsonb), page_type, is_password_protected, password_hash, meta_title, meta_description, og_image_url, is_published, position, created_at, updated_at
- **galleries** — id, title, slug, description, cover_image_url, parent_id, position, is_published, created_at, updated_at
- **photos** — id, gallery_id (FK→galleries), blob_url, url, thumbnail_url, title, description, location, camera_settings (jsonb), tags (text[]), width, height, position, created_at, updated_at
- **page_elements** — id, page_id (FK→pages), element_type, content (jsonb), position, created_at

### Auth Flow
- NextAuth v5 with credentials provider (src/lib/auth.ts)
- Route protection via proxy middleware (src/proxy.ts) — protects /admin/* except /admin/login
- Admin layout (src/app/admin/layout.tsx) checks session; unauthenticated users see login page without sidebar
- Single admin user seeded via db:seed

### DB Connection Pattern
- src/lib/db/index.ts exports a lazy Proxy-based `db` object
- Avoids build-time errors when DATABASE_URL is not set
- drizzle.config.ts and seed.ts both load .env.local explicitly via `config({ path: ".env.local" })`

### API Patterns
- All mutation endpoints check `await auth()` for session
- Settings API: GET (public) / PUT (auth required)
- Menu items API: GET (public) / POST+PUT+DELETE (auth required), PUT supports bulk reorder via `{ items: [{ id, position }] }`
- Galleries API: GET (public) / POST+PUT+DELETE (auth required), PUT supports bulk reorder, auto-generates slug from title
- Photos API: GET (public, filterable by galleryId) / POST+PUT+DELETE (auth required), DELETE also removes from Vercel Blob
- Upload API: POST (auth required) — accepts multipart file, uploads to Vercel Blob, returns blobUrl/url

## Implementation Progress
- [x] Phase 1: Project scaffold, auth, DB schema, admin login, sidebar
- [x] Phase 2: Site settings API + admin page, menu items API + admin page (dnd-kit), DB-driven Navbar + Footer
- [x] Phase 3: Gallery + photo management (Vercel Blob upload, admin CRUD, public gallery with masonry grid + lightbox)
- [ ] Phase 4: Page management (Tiptap rich text)
- [ ] Phase 5: Short stories (password-protected)
- [ ] Phase 6: Contact form (Resend)
- [ ] Phase 7: Polish + SEO

## Notes
- Next.js 16 renamed `middleware.ts` to `proxy.ts`
- Fonts: EB Garamond (serif, headings/public) + Inter (sans, admin/body)
- Old site assets stored in `_old/` directory (logos, images, docs)
- Admin credentials default: snapmaster@snaptart.com / changeme (change before deploy)
