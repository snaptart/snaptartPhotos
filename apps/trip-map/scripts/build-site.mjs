// Export the web build and stage it where the site serves it from.
//
// `next build` never touches this app, so the exported files are committed to the site and
// Vercel just hands them out. Run this after any change here, then commit the result:
//
//   npm run build:site        (in apps/trip-map)
//
// The export reads experiments.baseUrl from app.json, so every script, font and icon is
// linked with the /2026-france-and-italy prefix. Change the path in one place and it has to
// change in the other two: app.json and PUBLIC_PATH below, plus the rewrite in next.config.ts.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(APP, 'dist');
const PUBLIC_PATH = '2026-france-and-italy';
const TARGET = resolve(APP, '..', '..', 'public', PUBLIC_PATH);

const run = (cmd, args, opts) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

// A fresh dist each time, so files deleted from the app don't linger in the export.
rmSync(DIST, { recursive: true, force: true });

console.log('› exporting the web build');
run('npx', ['expo', 'export', '-p', 'web'], {
  cwd: APP,
  // The export needs more than node's default heap.
  env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --max-old-space-size=4096`.trim() },
});

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('✗ the export produced no index.html — not touching public/');
  process.exit(1);
}

// Only ever replace a previous export. If something else has been put at this path, stop
// rather than delete a stranger's files.
if (existsSync(TARGET)) {
  if (!existsSync(join(TARGET, 'index.html'))) {
    console.error(`✗ ${TARGET} exists but holds no index.html — refusing to replace it.`);
    process.exit(1);
  }
  rmSync(TARGET, { recursive: true, force: true });
}

mkdirSync(TARGET, { recursive: true });
cpSync(DIST, TARGET, { recursive: true });

const bytes = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => {
    const p = join(dir, e.name);
    return sum + (e.isDirectory() ? bytes(p) : statSync(p).size);
  }, 0);

console.log(`\n✓ staged at public/${PUBLIC_PATH} (${(bytes(TARGET) / 1e6).toFixed(1)} MB)`);
console.log('  commit it, push, and Vercel serves it at /' + PUBLIC_PATH);
