# Peregrinatio — project notes

State of the app as of 2026-09-13 (with later dated entries), for picking up work in a
new session. **Read "Moving into snaptart.com" below first — that work is half done.**

> **Git:** this app now lives inside the **snaptart.com** repository at `apps/trip-map`,
> committed on branch `redesign/field-map` (commit "Bring the France/Italy trip app into the
> repo as apps/trip-map", 2026-09-19). Its old home,
> `G:\Media\Web\2026 France and Italy trip map\trip-map`, is an archive: do not edit it.
> That archive holds the app's own git history (branch `photo-journal`); the history did not
> come across. Real trip photos, `assets/photo-cache/` and `src/data/photos.generated.ts`
> are gitignored on purpose (GPS/time metadata); only the five placeholders are tracked.

## Moving into snaptart.com — where we are

**The goal.** Serve this app at **snaptart.com/2026-france-and-italy**, taking its
photographs from the snaptart database and Vercel Blob instead of files bundled into the app.
The app itself stays exactly as it is — same Expo/React Native stack, same look, maintained
separately. It is an island inside the site: Next hands out its exported files and does not
otherwise know about it, so there is no shared navbar, footer or SEO, and `next build` never
builds it.

**Why not port it into Next?** Considered and declined by the user (2026-09-19). Porting
~2,400 lines of React Native to React would integrate it properly but is several sessions'
work; the user is happy to maintain this app separately.

**Decisions made with the user (2026-09-19):**
- Public path: `/2026-france-and-italy` (hyphens, no spaces).
- One published gallery per station, slugs `cucuron-2026`, `eze-2026`, `noli-2026`,
  `marseille-2026`, `lyon-2026`.
- **Keep all EXIF** in the full-size uploads (no stripping), understanding that anyone can
  download an original from the page and read its GPS and timestamps. The site's 800px
  thumbnails carry no metadata (sharp drops it). Before publishing, the user means to check
  whether any of the 137 photos were taken at a home address.
- Photo sizes at first: the site's existing `thumbnailUrl` (800px) for grid tiles *and* the
  journal plate, full-size `url` in the lightbox. A smaller (~400px) size can be added to the
  site's upload route later if the grid feels heavy (90 tiles × ~150KB ≈ 13MB).

**Phase 1 — done (2026-09-19).** The app was copied to `apps/trip-map` (no `node_modules`,
`.git`, `.expo`, `dist`, photo-cache), its dependencies installed there, `apps` excluded from
the site's `tsconfig.json` (there is no ESLint config file in that repo), and a section added
to the site's root `CLAUDE.md`. Verified: this app's `npm run typecheck` passes in the new
location and the site's `npm run build` succeeds with the folder present. Nothing about how
the app runs has changed: **photographs still come from local files.**

**Next step — the user is to confirm** both still run from the new location: `npm run dev` at
the repo root (site) and `npm run web` in `apps/trip-map` (this app, localhost:8081).

**Phase 2 — photographs onto the site (done for Cucuron, 2026-09-20).**
- *Site code:* `GET /api/photos` and `GET /api/galleries` now send
  `Access-Control-Allow-Origin: *` (`src/lib/cors.ts` in the site), so this app can read them
  from localhost:8081 or a phone on the LAN. Reads only; mutations stay same-origin. `*` is
  deliberate — the browser then refuses to send cookies, so an admin session can never be
  borrowed cross-origin.
- *Site code:* the upload route now also reads the **title** (XMP `dc:title` / IPTC
  `ObjectName` / `XPTitle` / `Headline`) alongside the caption, so the words this app shows
  survive the move. `npm run db:backfill-exif` fills it in for photos already uploaded.
- *User:* **Cucuron 2026** (`cucuron-2026`) is created, published and holds 89 photographs in
  the wanted order, with titles and captions carried over from the files. The other four
  galleries are **not made yet** — those stations simply show no photographs until they are.
- Gallery slugs are derived from the title and cannot be edited, so the titles must be
  `Cucuron 2026`, `Eze 2026` (plain E — `Èze` would give `ze-2026`), `Noli 2026`,
  `Marseille 2026`, `Lyon 2026`.

**Phase 3 — this app reads the gallery (done 2026-09-20).**
- `src/data/api.ts` holds the base URL: same origin in production on the web, localhost:3000
  in development, `EXPO_PUBLIC_SNAPTART_API` to override (needed on a phone, where localhost
  means the phone — the site's `npm run dev` already binds 0.0.0.0).
- `src/data/photos.tsx` replaces the generated file: `PhotosProvider` fetches every station's
  gallery once at start-up (`Promise.allSettled`, so one missing gallery doesn't sink the
  rest) plus `/api/galleries` for the cover images, and `usePhotos(stationId)` /
  `useStationThumbnail(stationId)` hand them out. A station with nothing shows the same
  "no photographs" state as before, which doubles as the loading state.
- The `Photograph` shape kept its `src` / `display` / `thumb` names, so `PhotoGallery`,
  `Lightbox` and `Photo` did not change at all — only where the images come from.
  `display` and `thumb` are both the site's 800px `thumbnailUrl`; `src` is the full-size file.
- The gallery's **cover image**, chosen in the admin, is the station's thumbnail in the
  sidebar and phone rail, falling back to the first photograph — the same "thumbnail picked
  apart from the first photo" the arrange page used to offer.
- `places.ts` no longer imports photos at all; each station carries a `gallery` slug instead
  of `folder` / `photos` / `thumbnail`.
- Deleted as dead: `scripts/build-photos.mjs`, `watch-photos.mjs`, `photo-library.mjs`,
  `arrange-photos.mjs` (+ its HTML), `src/data/photos.ts`, `src/data/photos.generated.ts`,
  the `photos`/`arrange` npm scripts and every `pre*` hook, `metro.config.js`'s watcher,
  `assets/photo-cache/`, and the `sharp` and `exifr` dev dependencies.
- **`assets/photos/` was deliberately left alone** — it holds the original trip photographs,
  which are gitignored and not Claude's to delete. Nothing in the app reads it any more, so
  it can go once the user is satisfied the uploads are complete and backed up.

**Phase 4 — publish (done 2026-09-20, not yet deployed).**
- `app.json` sets `experiments.baseUrl` to `/2026-france-and-italy` (leading slash, no
  trailing one — the documented form for SDK 57), so every script, font and icon in the
  export is linked with that prefix.
- **`npm run build:site`** (`scripts/build-site.mjs`) is the one command: it exports the web
  build with the bigger heap and copies `dist` into the site's `public/2026-france-and-italy/`,
  refusing to touch the target if the export produced no `index.html` or if something that is
  not a previous export is sitting there. `dist/` itself stays gitignored; the copy under
  `public/` is committed, because `next build` never builds this app.
- The site's `next.config.ts` rewrites the bare `/2026-france-and-italy` to that folder's
  `index.html`. Nothing else is needed: deeper paths are real files, and a trailing slash is
  redirected to the bare path by Next before rewrites ever run.
- Verified against `npm run build && npm start` at 1440×900 and 390×844, driving headless
  Edge: every asset 200 under the prefix, the API called same-origin as plain `/api/photos`
  (the production bundle has no localhost in it — `__DEV__` is compiled out), all 8 fonts
  loaded, Cucuron opens to "1 OF 89", no console errors, nothing over 400.
- **Left for the user:** push, let Vercel deploy, and optionally add a menu item pointing at
  the path. Note the site's live photo pages are broken until `redesign/field-map` reaches
  `dev` — the junction-table migration is already applied to the shared database while the
  deployed code still expects the old `photos.gallery_id` column.

**Rebuilding after a change to this app:** `npm run build:site`, then commit what changed
under `public/2026-france-and-italy/`. Forgetting this is the obvious trap — the app will run
perfectly on :8081 and the deployed page will still be the old export.

**`EXPO_PUBLIC_SNAPTART_API` is inlined at export time**, not read at runtime, so it cannot
be used to repoint a build that has already been made. That is only a development lever.

**Why not bundle the photos into a static export instead?** 222MB of originals plus copies
would blow Vercel's 100MB Hobby upload limit, and the photos are deliberately not in git.

## What it is

A photo journal for a 2026 road trip (Cucuron → Èze-sur-Mer → Noli → Marseille → Lyon),
built from the design handoff in `../design_handoff_trip_map/` (README + HTML prototype).
A medieval-style map of real geography is the main screen; each of the five stations opens
a journal page with the trip photographs.

One codebase: **Expo SDK 57 / React Native 0.86**, running on iOS, Android and web
(react-native-web 0.21).

## Running it

| | |
|---|---|
| Web | `npm run web` → http://localhost:8081 |
| Phone | `npm start`, scan the QR code with Expo Go (same Wi-Fi) |
| Typecheck | `npm run typecheck` |
| Build for the site | `npm run build:site` → `public/2026-france-and-italy/` (commit the result) |

**The photographs come from the site**, so the site's dev server must be running too
(`npm run dev` at the repo root). On a phone, point the app at the machine rather than at the
phone's own localhost: `EXPO_PUBLIC_SNAPTART_API=http://192.168.x.x:3000 npm start`.

The dev server hot-reloads; after changes, hard-refresh the browser (Ctrl+Shift+R) rather
than restarting. A static web export needs more memory:
`NODE_OPTIONS=--max-old-space-size=4096 npx expo export -p web`.

## Code map

```
App.tsx                     layout switch (full / wide), web keyboard, LightboxProvider
src/theme.ts                colours, per-weight font names, gradient() helper
src/data/places.ts          the itinerary (authoritative), LEG_BOWS, all map label lists (seas,
                            landmarks, rivers, divisions, Europe), fit boxes — hand-tuned by the user
src/data/api.ts             where snaptart.com's API is (same origin in production, localhost:3000
                            in dev, EXPO_PUBLIC_SNAPTART_API to override on a phone)
src/data/photos.tsx         PhotosProvider: fetches every station's gallery once at start-up;
                            usePhotos(stationId), useStationThumbnail(stationId)
src/data/land.json          Natural Earth 50m, European countries only, generated by build-geometry
src/data/divisions.json     internal région/département + regione/provincia borders (build-divisions)
src/data/rivers.json        Rhône (Geneva → sea, both delta arms) and Saône centrelines (build-rivers)
src/map/TripMap.tsx         SVG map: World, Rivers, Divisions, Route (+ useDrawIn), Overlay (labels,
                            castles, numerals, collision boxes), gestures, zoom controls
src/map/geo.ts              d3-geo Mercator fit, path strings, route legs (legPoint/legPath), kMin,
                            native ink-wobble
src/map/effects(.web).tsx   web: real SVG filters · native: baked wobble + grain texture
src/map/useZoom.ts          pan/zoom state, scaleAbout(), eased animateTo()
src/map/useWheelZoom(.web).ts  wheel zoom; origin 'top-left' (SVG) or 'centre' (Views)
src/map/textWidth(.web).ts  label widths for the frame-edge collision guard
src/ui/Header.tsx           title block
src/ui/StationsRail.tsx     phone: horizontal station chips
src/ui/StationSheet.tsx     phone: bottom sheet (scrim ignores the opening tap's ghost click)
src/ui/Sidebar.tsx          desktop: side panel with journal card + station list
src/ui/StationEntry.tsx     the journal page, shared by sheet and sidebar
src/ui/PhotoGallery.tsx     photo plate: paging, arrows, diamond markers, opens lightbox
src/ui/Lightbox.tsx         full-screen true-colour viewer with zoom/pan
src/ui/Photo.tsx            image with optional sepia; fit cover/contain
scripts/build-geometry.mjs  TopoJSON → src/data/land.json: country list, clip window, winding fix
                            (source not in repo: world-atlas@2.0.2/countries-50m.json on jsDelivr)
scripts/build-divisions.mjs GeoJSON → src/data/divisions.json: topojson mesh of borders *between*
                            units only, simplified; source URLs in its header (not in repo)
scripts/build-rivers.mjs    Natural Earth 10m rivers → src/data/rivers.json (joins the two Saône
                            reaches; the lower one is misspelt "Sane" in the source)
scripts/build-paper-texture.mjs  generates assets/textures/paper-grain.png
assets/photos/              the original trip photographs. NOTHING READS THIS ANY MORE — the app
                            takes its pictures from the site's galleries. Kept only as the user's
                            own copy; gitignored.
```

## Features

- **Map** — real Natural Earth polygons through a fitted Mercator projection, bundled for
  offline use. Coastal hachure, animated route (see Route below), castle markers,
  compass rose, scale bar. Markers and labels never scale with zoom. Pan, pinch, wheel,
  +/−/fit buttons; zoom range from `chart.kMin` (the scale that frames `EUROPE_BOX`) to 7×.
- **Europe overview** — below 1× strokes are divided by k (quantised, so the country layer
  re-renders rarely; shore hatching keeps only √ of that); between k 0.6 and 0.4 the regional
  labels and station names cross-fade to `EUROPE_LANDS` / `EUROPE_SEAS`, castles shrink to
  45%. Labels whose anchor is off-frame are skipped. The scale bar picks
  10–1000 km (100 km at 1×). On web only countries near the route get the ink-blot filter.
- **Political divisions** (France, Italy) — only internal borders are drawn, clipped to the
  hero countries' outline, so they never disagree with land.json's coast. Régions/regioni:
  faint dash-dot, fading in over k 0.6–0.9. Départements/province (+ Métropole de Lyon
  outline): faint dots, fading in over k 1.5–2.2. Stroke widths are screen px (÷ quantised k).
  Names only for the divisions the stations are in (`DIVISION_LABELS` in places.ts); a name
  that would overlap a station's castle or name is skipped at that zoom.
- **Rivers** — the Rhône and Saône only, in the coast's blue-grey ink at a constant 1.6px
  screen width, under the division borders; named (`RIVER_LABELS`) in the sea lettering.
  Both fade out with the other detail toward the Europe overview.
- **Route** — each leg is a quadratic curve bowed sideways by `LEG_BOWS` (fraction of leg
  length, + = traveller's left), so legs that retrace the coast stay apart. Fine dashed wine
  line on a pale halo at constant screen width; draws in leg by leg over 2.2 s (`useDrawIn`,
  de Casteljau partial curves). A roman numeral medallion (I–IV) sits on each leg, slid along
  the curve off castles/names, and division names avoid it. With a station open, only the
  **journey so far** is drawn (user's request, 2026-09-13): the legs leading to it, the arriving
  leg slightly heavier; later legs and their numerals are hidden, so Cucuron shows no route.
  (Before, legs into and out of the station kept full ink and the rest faded to 30%.)
- **Layouts** (web switches on window width):
  - under 960px and all native: full screen edge to edge, bottom sheet + horizontal station rail
  - 960px and up: full-width map with a right sidebar (journal card + station list)
  - (the handoff's 600–959px "phone framed on a dark desk" layout was removed at the user's
    request on 2026-09-13)
- **Journal page** — station title, photo plate, caption, lat/long/sojourn/leg, Previous/Next.
  Web keys: ← → change station, Esc closes.
- **Photos** (rewritten 2026-09-20) — each station names a published gallery on snaptart.com
  (`gallery` in places.ts). `PhotosProvider` fetches all five at start-up and the pictures
  come from Vercel Blob like the rest of the site. A gallery that does not exist, is not
  published or is empty leaves that station with no photographs, which is also what is shown
  while the fetch is in flight. Nothing is bundled into the app any more.
- **Order and thumbnail** — the order is the one set by dragging in the site's admin
  (`gallery_photos.position`, which the API returns rows in). The station's thumbnail in the
  sidebar list and phone rail is the gallery's **cover image**, chosen in the admin apart from
  the first photograph (preserving the user's 2026-09-13 decision), falling back to the first
  photograph when no cover is set; the plate still starts at `photos[0]`.
- **Titles and captions** — written into each file and read by the site's upload route
  (`src/lib/photo-exif.ts`): XMP `dc:title` / IPTC `ObjectName` / `XPTitle` / `Headline` →
  title, `Caption` / `ImageDescription` → caption. They arrive as the `title` and
  `description` columns and become `title` / `caption` on `Photograph`. The lightbox shows the
  title under the station line and the caption along the bottom, clamped to two lines and
  expanded by a tap (collapses again on the next photograph, hidden while zoomed); the journal
  plate shows the title in small capitals above the station caption. Nothing is shown for a
  photograph without them (decided with the user, 2026-09-15).
- **Image sizes** (2026-09-20) — the site makes one 800px copy per photograph on upload, so
  `thumb` and `display` are both that copy (77–258 KB for Cucuron) and `src` is the full-size
  file (2.7–3.8 MB at the user's 3000px cap). The plate and lightbox load only the current
  page ±1 (`isNear` in Photo.tsx, counting around the ends); the grid is a FlatList
  (`key={cols}` because numColumns can't change live, `getItemLayout` per row, `windowSize` 5).
  Checked in headless Edge at 1440×900: opening Cucuron fetches 4 images, not 89.
  If the grid ever feels heavy, add a ~400px size to the site's upload route and point `thumb`
  at it — only `toPhotograph` in photos.tsx moves. A middle size for the lightbox is the other
  candidate, since it currently jumps straight to the full-size file on a phone.
- **Gallery** — journal plate pages through a station's photos (swipe, ‹ › arrows, diamond
  markers; a counter past 8 photos). Tap the photo or the ⤢ button to open the lightbox.
- **Lightbox** — near-black warm backdrop, true colour. Pinch / double-tap / double-click /
  wheel zoom about the cursor or fingers; drag to pan while zoomed; swipe or arrows to page;
  ✕ or Esc to close. No tap-to-close (it would fire on the first tap of a double-tap).
  A grid button (four squares, left of ✕, hidden while zoomed or for a single photo) toggles a
  contact sheet over the pager: square cover-cropped tiles, 3px gaps, edge to edge, ≥3 columns
  and ≤180px per tile; the current photo is outlined and its row centred on open. Tapping a tile
  returns to that photo; Esc in the grid returns rather than closes (2026-09-19). Tiles use the
  full-size images (no thumbnails are generated), untested with 90 photos on a real phone.
  **Sideways on a phone** (touch-first, wider than tall, under 500px high, not in the grid) the
  photo takes the whole screen and the top bar/caption/hint lie over it on dark gradients. No
  auto-hide (user's choice, replaced a 2.5 s fade): shown at first, then a single tap toggles
  them and the choice is kept until reload (module variable `sidewaysChrome`). The tap is
  `Gesture.Exclusive(doubleTap, singleTap)` with the double-tap's `maxDelay` cut to 280 ms, so
  the single tap lands after that wait (2026-09-19). The browser's own bars are a separate matter
  (Fullscreen API on Android; iPhone only via Add to Home Screen) — not done yet.

## Decisions made with the user

- **No sepia on any photograph.** The handoff specified sepia everywhere; the user first kept
  it on thumbnails only, then on 2026-09-13 removed it from the sidebar thumbnails and the phone
  station chips too. `Photo`'s `sepia` prop is still there (every caller passes 0).
- **Plate photos fill the frame** (`cover`, cropped to 4:3, as the handoff specified). They
  were fitted whole (`contain`) for a while; the user switched back on 2026-09-13. The
  lightbox still shows the whole photograph.
- Lightbox: near-black warm backdrop; full pinch/double-tap zoom.
- **Lightbox arrows hidden on touch screens** (2026-09-13, `(hover: none)` on web, always on
  native): swipe instead, hint reads "Swipe for more"; the counter stays in the caption. With a
  mouse the arrows remain. The journal plate keeps its arrows on phones (user's choice).
- Rotating the phone keeps the lightbox and plate on the same photograph: both re-scroll to the
  current index on a width change and ignore scroll events for 250 ms meanwhile.
- A full-width desktop layout at ≥960px (not in the handoff, which is mobile-only).
- Photos are matched by GPS rather than by fixed file names.
- **No rhumb lines** radiating from the compass rose (removed at the user's request,
  2026-09-13). The `inkRhumb` colour in theme.ts is now unused.
- **Compass rose in the sea**, centred between the Golfe du Lion and Mediterranean Sea labels
  and just below the lower one (`COMPASS_BETWEEN` in places.ts; user's request, 2026-09-13). It
  pans and zooms with the map but keeps its size, so the gap below the labels is in screen px:
  a fixed lat/lon (tried first, 5.3°E 42.5°N) sat well on desktop but covered "Mediterranean
  Sea" on the phone, whose fit is zoomed out further. Earlier it was fixed to the lower-left of
  the screen, then briefly the top-right corner.
- **No vignette on the map** (removed 2026-09-13; the handoff had a radial darkening). The
  photo plate's own vignette in `PhotoGallery.tsx` is separate and still there.
- **Map zooms out to all of Europe**, drawing European countries only: no Russia, Turkey or
  Africa (so e.g. Kaliningrad and the Maghreb coast read as sea). Tested at 390×844 and 1440×900.
- **Divisions:** région labels were first historic names (PROVENCE, LYONNAIS); the user has
  since set them to **PROVENCE-CÔTE D'AZUR**, **RHÔNE-ALPES** and **LIGURIA**. Départements
  and province by their real names (Vaucluse, Bouches-du-Rhône, Alpes-Maritimes, Savona).
  Lyon is labelled **Métropole de Lyon** with its own outline, not Rhône. Labels only, no
  tint on the visited divisions. Lines/labels staged by zoom as above.
- **The user edits `places.ts` directly** (label names, positions, `LEG_BOWS`). Treat what's
  on disk as intended; when a label clashes, move it rather than renaming it.
- **No mountain glyphs** (the handoff's relief hachures over the Alps were removed at the
  user's request, 2026-09-13). Rivers added instead: Rhône and Saône.
- **Route style** (2026-09-13): curved legs, constant width, leg numerals, open-station
  emphasis. Considered and declined: a tapering quill stroke, real road routes.

## Other deviations from the handoff

- Mock status bar and home indicator are not drawn; the platform's own are used.
- Scale bar sits left of the zoom buttons (the prototype overlapped them).
- Geometry covers all of Europe (incl. San Marino and the Vatican, which are holes in
  Italy's polygon), not just the countries around the route.
- Native has no feTurbulence/feDisplacementMap: the ink wobble is baked into the projected
  geometry and paper grain is a tiled PNG. Web uses the real SVG filters.
- iOS has no sepia/saturate filters (only Android and web do): iOS gets a warm tint overlay.

## Gotchas learned the hard way

- **The photographs need the site running.** They are fetched from snaptart.com's API, so in
  development `npm run dev` must be up at the repo root or every station is empty. The stations
  stay empty rather than erroring, so this looks like "no photos yet" rather than a failure —
  check the console for the `[photos]` warning.

- **react-native-web gives Views `z-index: 0`**, so any positioned wrapper forms its own
  stacking context. A child's high z-index is trapped inside it — give the wrapper the
  z-index. (This hid the bottom third of the phone sheet behind the rail.)
- **`pointerEvents: 'box-none'` only works on web from a `StyleSheet.create` style.** In an
  inline or Animated style RNW writes it out as invalid CSS; the browser drops it and keeps the
  previous value, so switching `'none'` → `'box-none'` left the sideways lightbox's buttons dead
  (2026-09-19). Inline, use `'auto'`/`'none'` on web.
- **Paged ScrollViews: an animated `scrollTo` fires `onScroll` for every page it passes.**
  Deriving the index from those made the counter/title flicker on desktop arrow clicks. The
  lightbox and plate hold a `heading` ref until the scroll lands (1 s fallback), and wrapping
  around (last → first) jumps without animation (2026-09-19).
- **react-native-web maps `flex: 0` to a 0% basis**, which overrides an explicit height.
- **Images need explicit width/height, not just absoluteFill insets** — on web the image
  otherwise stays at natural size (a 4000px photo shown zoomed in). RNW paints the picture as
  a `background-image` on a child div, so scaling comes from the `resizeMode` prop (→
  `background-size`); `objectFit` alone does nothing on web. `Photo.tsx` sets both.
- **Gradients:** native wants `experimental_backgroundImage`, web wants `backgroundImage`.
  Use `gradient()` from `theme.ts`.
- **Transform origin:** SVG content scales about its top-left; a transformed View scales
  about its centre. Zoom maths must use the matching origin (see `useWheelZoom`).
- **Gestures rebuilt every render lose their state.** Anything a gesture accumulates during
  a drag must live in a ref, or the drag jumps. `Lightbox.tsx` Page shows the pattern.
- **`GestureDetector` takes over its child's ref.** Put your own ref on an inner View.
- **gesture-handler's double-tap ignores the mouse on web** — `useDoubleClickZoom.web.ts`
  listens for the browser `dblclick` instead.
- A double-click that opens the lightbox delivers its second click into the viewer; zoom
  is ignored for 450 ms after opening.
- **Touch taps on castles (phone browser) opened the sheet and closed it again at once.**
  The map's RNGH tap fires on touch-up and opens the sheet; the browser's follow-up click
  then lands on the scrim that has just appeared. `StationSheet` ignores scrim presses for
  500 ms after opening. Mouse clicks never showed it (their click arrives before the scrim).
- **Pan needs a start threshold** (`TAP_SLOP` = 10 px, also the tap's `maxDistance`):
  otherwise a fingertip's natural drift activates the pan, which wins the race and cancels
  the tap. Reproduce touch issues with CDP `Input.dispatchTouchEvent` +
  `Emulation.setTouchEmulationEnabled`; detect the open sheet by
  `[role="dialog"][aria-modal="true"]` (its page stays mounted when closed).
- **d3-geo polygons are spherical:** a ring with the wrong winding means "the globe minus
  this ring" and paints over the whole sea. Clipping flipped a 5-point Russian sliver once;
  `build-geometry.mjs` now re-orients every ring by `geoArea`.
- `exifr` accepts a path string, not a `URL` object (it throws, silently in a try/catch).
- `@expo-google-fonts/*` package indexes require every weight — import per-weight subpaths.
- Native fonts: one family name per weight/style (`Cinzel_600SemiBold`), never fontWeight.

## Testing

- First build verified on **web only**, by driving Chrome with Puppeteer at 390×844, 1024×768
  and 1440×900: markers, chips, sheet, sidebar, keyboard, gallery paging/swipe, lightbox open,
  colour, zoom focal point (double-click and wheel), drag while zoomed. No console errors.
- Later work (Europe zoom, divisions, rivers, curved route, edge-to-edge layout, photo fill,
  touch-tap fix) was verified on web with screenshots from **headless Edge driven over CDP**
  (Node 22's built-in `WebSocket`; Puppeteer isn't installed): phone 390×844 at DPR 2,
  desktop 1440×900, plus close-ups made by wheel-zooming (`Input.dispatchMouseEvent`
  `mouseWheel`, deltaY = −log2(factor)/0.002) on a castle's 1× position, and a true-pixel
  `Page.captureScreenshot` `clip` crop. Touch was checked with `Input.dispatchTouchEvent`.
  Those scripts lived in the session scratchpad and are **not in the repo**.
- The user runs it on their phone over the LAN and reports it works well; they found the
  castle-tap bug there. The fix is verified with emulated touch only; **not yet confirmed on
  the phone**.
- `npm run typecheck` passes.
- Puppeteer quirks: `mouse.click({ clickCount: 2 })` does not fire `dblclick` (send two
  press/release pairs over CDP instead); headless Chrome won't size a window under ~500px
  wide, so use `page.setViewport` for phone sizes; react-native-web doesn't emit
  `aria-selected` on buttons.

## Loose ends

- `props.pointerEvents is deprecated` warning in the console: move `pointerEvents` into
  `style` on the Views that use it.
- `assets/photos/` (originals and the old placeholders) is no longer read by anything. It can
  be deleted once the user is satisfied every station's photographs are uploaded and backed
  up; the five tracked placeholders go with it.
- **Four galleries still to make**: `eze-2026`, `noli-2026`, `marseille-2026`, `lyon-2026`.
  Those stations show no photographs until they exist and are published.
- The user's very first `npm run web` error was never identified (it later ran fine).
- In the lightbox, clicking on a letterbox band zooms about that point in the frame, not
  the photo.
- **PROVENCE-CÔTE D'AZUR is hidden on the phone at 1×**: the long name overlaps a station's
  box, so the collision rule drops it until zoomed in. Offered to move it further north; the
  user hasn't decided.
- At close zoom the "LIGURIAN SEA" label can sit on the scale bar (pre-existing; sea labels
  don't use the collision rule).
- Native-only paths added this session are unverified on a device: `ClipPath` on the
  division borders, screen-px dash arrays, performance of the ~17k border points while
  pinching, and whether the castle tap now works in Expo Go as well as the phone browser.
- New dev dependencies `topojson-server` and `topojson-simplify` (build scripts only);
  `npm install` reported audit warnings that weren't looked at.
- Station labels are still hand-placed with `anchor`; only division/river names and
  numerals avoid collisions automatically.
- Unused in the handoff but mentioned: per-station dates; offline caching is inherent since
  geometry and photos are bundled.
