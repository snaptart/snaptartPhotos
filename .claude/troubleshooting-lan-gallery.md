# Troubleshooting: Gallery pages not working over LAN (from phone)

## Problem
When accessing the site from a phone on the local network (192.168.50.17:3000), clicking a link to a page like `/france` (a Puck-rendered page with a GalleryEmbed component) hangs or doesn't fully work.

## What works
- Homepage loads fine from phone (it's a static component with no DB queries or client-side fetching)
- API endpoints work directly from phone (e.g. `192.168.50.17:3000/api/photos?gallerySlug=france` returns JSON)
- Everything works from localhost on desktop

## What we tried

### 1. Bind dev server to all interfaces
**Change:** `"dev": "next dev -H 0.0.0.0"` in package.json
**Result:** Did not fix the issue alone. (May still be needed for LAN access.)

### 2. Add AUTH_URL to .env.local
**Change:** Added `AUTH_URL="http://localhost:3000"` to .env.local
**Result:** Did not fix the issue. The proxy.ts (middleware) only matches `/admin/:path*` routes anyway, so auth shouldn't affect public pages.

### 3. Checked Windows Firewall
**Result:** Node.js is already allowed through firewall for both TCP and UDP on public profiles. Not the issue.

### 4. Tested production build
**Change:** `npm run build && npx next start -H 0.0.0.0`
**Result:** The page itself loaded (no more hanging), but the gallery showed "Loading gallery..." forever. This narrowed the problem to the GalleryEmbed client component.

### 5. Added debug status to GalleryEmbedRenderer
**Change:** Added a `debugStatus` state that tracks fetch progress ("init", "fetching...", "response 200...", etc.)
**Result:** The debug status showed "init" — meaning `useEffect` never fired at all. This is the key finding.

## Root cause identified
**Puck's `<Render>` component does not execute React hooks (`useEffect`, `useState` updates) or event handlers (`onClick`) in rendered components.**

Evidence:
- `useContext` works (read-only hook that runs during render)
- `useState` initializes (component renders with `loading: true`)
- `useEffect` never fires (debug status stays at "init")
- `onClick` handlers don't work (lightbox doesn't open when clicking images)

This means Puck's Render likely renders components as static React elements without proper hydration/lifecycle support.

### 6. Server-side prefetching (partially worked)
**Change:**
- Created a `GalleryDataContext` in puck/config.tsx
- Modified `[slug]/page.tsx` to scan Puck data for GalleryEmbed components, fetch their photos from DB server-side
- Passed prefetched photos to PuckRenderer via context provider
- GalleryEmbedRenderer reads photos via useContext (works because useContext runs during render)
- Removed the client-side fetch/useEffect

**Result:** Photos displayed! But clicking images for the lightbox/slideshow didn't work (because useState/onClick still don't work inside Puck's Render).

### 7. Portal approach (did not work)
**Change:**
- Created standalone `GalleryEmbedClient.tsx` with full interactivity (lightbox, state, event handlers)
- Changed Puck config's GalleryEmbed render to output a placeholder `<div data-gallery-embed={slug} data-gallery-props={JSON.stringify(props)} />`
- Modified PuckRenderer to use `useEffect` to find placeholder divs after mount and render GalleryEmbedClient into them via `createPortal`

**Result:** Gallery images didn't display at all. Likely a timing issue — the placeholder divs may not have been in the DOM when useEffect ran, or Puck's Render interfered.

## What hasn't been tried yet
1. **Custom renderer replacing Puck's `<Render>`** — Write a manual renderer in PuckRenderer that iterates over `data.content` and renders each component type directly (calling render functions for static components, using GalleryEmbedClient for galleries, and manually handling Columns/DropZones by reading `data.zones`). This bypasses Puck's Render entirely.
2. **Rendering GalleryEmbedClient outside of Puck** — In `[slug]/page.tsx`, extract GalleryEmbed items from Puck data and render them as separate client components alongside PuckRenderer (simpler but breaks layout ordering).
3. **Checking Puck docs/issues** — See if there's a known solution for interactive components in Puck's Render, or a config option to enable full React lifecycle.
4. **Checking if this is a Puck version issue** — Current version is `@puckeditor/core@^0.21.1`. Newer versions may handle hydration differently.

## Key files involved
- `src/lib/puck/config.tsx` — Puck component config, GalleryEmbedRenderer
- `src/components/public/PuckRenderer.tsx` — Public page Puck renderer
- `src/app/(public)/[slug]/page.tsx` — Dynamic page server component
- `.env.local` — Added AUTH_URL
- `package.json` — Changed dev script to use -H 0.0.0.0

## Notes
- The dev mode hanging issue may be separate from the Puck Render issue — dev mode might have additional problems with HMR/WebSocket over LAN
- The homepage works because it's a plain static component, not rendered through Puck
- The Navbar and Footer (server components with DB queries) render fine from the phone
- The Columns component in puckConfig uses `<DropZone>`, so any custom renderer needs to handle zones from `data.zones`
