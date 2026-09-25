# CMS and site repos: how changes move

`snaptart/cms` is the shared core. Each website is its own repo that merges
updates from it and keeps its own configuration, content and database.

| Repo | What it is | Local folder |
|---|---|---|
| `snaptart/cms` | Shared core: admin, APIs, page-builder blocks, public templates | `G:\Media\Web\cms` |
| `snaptart/snaptartPhotos` | snaptart.com | `G:\Media\Web\snaptart.com` |
| `snaptart/gardensalacarte` | gardensalacarte.com (to be restarted from this repo) | — |
| `snaptart/cms-legacy` | The July 2026 core, archived and read-only. Reference only. | — |

The CMS was rebuilt in September 2026 from snaptart.com's code, so every
site repo shares its git history. That shared history is what makes a plain
`git merge upstream/main` work.

## What lives where

| In the CMS | In each site repo |
|---|---|
| Admin, APIs, page-builder blocks, public pages | `src/lib/site.config.ts`: branding, wording, feature switches, extra rewrites |
| `src/lib/db/schema.ts` | Its own database (Neon) and file storage (Vercel Blob) |
| `src/lib/site.config.defaults.ts` | `.env.local` and its Vercel environment variables |
| Generic features and fixes | Its favicon (`src/app/icon.png`, `apple-icon.png`) and anything else only it uses |

snaptart.com also carries things no other site has: the trip-journal app
(`apps/trip-map`, exported to `public/2026-france-and-italy`) and one-off
data scripts. The CMS never adds or edits those paths, so they never
conflict.

## The site config contract

- `site.config.defaults.ts` belongs to the CMS. Every setting lives here
  with a safe default. Sites never edit it.
- `site.config.ts` belongs to the site. The CMS ships it once as a stub
  (`defineSiteConfig({})`) and never touches it again, so merges never
  conflict on it. A site lists only what differs from the defaults.
- To add a setting, add it to the defaults file with a default that leaves
  existing sites unchanged. Sites opt in from their own `site.config.ts`.

Settings a site is likely to change:

- `siteName`, `siteDescription`, `defaultAdminEmail`, `uploadFolder`
- `labels`: what galleries and photos are called ("Portfolio" / "Image")
  and the gallery URL prefix
- `features.stories`, `features.photoMetadata`, `features.submissions`
- `features.fieldMap`: the world-map block, its `/map/…` pages, the
  placement editor and the map fields on the gallery form. Off by default.
- `rewrites`: extra URL rewrites. `next.config.ts` returns them, so a site
  never edits that file.

## Building a feature

1. **Build it in the CMS**, on a branch in `G:\Media\Web\cms`. Its dev
   server runs on port 3002 (`npx next dev -p 3002`) against snaptart's
   database, so you work with real content.
2. **Merge it into the CMS's `main`** and push.
3. **Pull it into each site** (next section).

If something starts life in a site repo and turns out to be generic, redo or
cherry-pick it into the CMS, then pull it back into the site so the two
don't drift.

Keep a feature that only one site wants in the CMS behind a
`site.config.defaults.ts` switch that is off by default, as with the Field
Map. Keeping it in the site repo instead means conflicts every time the CMS
changes the shared files it touches.

## Pulling CMS updates into a site

```
# in the site repo, with dev up to date
git checkout -b sync/cms-<topic> dev
git fetch upstream
git merge upstream/main
npm install             # only if package.json changed
npm run db:push         # only if src/lib/db/schema.ts changed (see below)
npx tsc --noEmit
```

Then push the branch, open a PR into `dev`, and release `dev` to `main` as
usual. On snaptart, pass `-R snaptart/snaptartPhotos` to `gh`; otherwise it
targets the `upstream` remote.

If the CMS ever deletes or replaces a file a site relies on, restore the
site's copy in that merge: `git checkout HEAD -- <path>` before committing.
Git remembers the choice, so it comes up only once.

## Database changes

- Schema changes are applied with `npm run db:push`. There are no migration
  files, so **a schema change is one-way**. Reverting the code does not
  revert the database.
- Each site has its own database, so each runs `db:push` after merging a
  schema change. Say so in the commit message of any commit that changes
  `schema.ts`.
- **The CMS's local dev server uses snaptart's production database.** While
  that's true:
  - Anything you save or upload in the CMS admin changes snaptart.com
    immediately.
  - Never remove a table or column from the CMS's `schema.ts` that
    snaptart still uses: `db:push` from the CMS would drop it from
    snaptart's live database.
- A change that moves data (for example `photos.gallery_id` to
  `gallery_photos`) needs its backfill run *between* adding the new
  structure and dropping the old one. A single `db:push` would lose the
  data.

## Standing up a new site

1. Create the site repo from the CMS, keeping the shared history. Clone it,
   point `origin` at the new repo, and add the CMS as `upstream`.
2. Fill in `src/lib/site.config.ts`, and replace the favicon files.
3. Create its Neon database and Vercel Blob store. Copy `.env.example` to
   `.env.local` and fill it in.
4. `npm run db:push`, then `npm run db:seed` (the admin login comes from
   `ADMIN_EMAIL` / `ADMIN_PASSWORD`).
5. In Vercel, set every variable from `.env.example`. **`AUTH_SECRET` is
   required** (`openssl rand -base64 32`). Without it, sign-in fails. The
   admin API refuses every request rather than opening up, but the admin
   can't be used.
6. After the first deploy, check that `/api/auth/session` returns `200` with
   `null` when signed out, and that `/api/admin-users` returns `401`.
7. Optional: for form emails, set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
   (see "Email Setup" in `CLAUDE.md`).
