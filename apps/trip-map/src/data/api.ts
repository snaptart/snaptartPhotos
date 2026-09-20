import { Platform } from 'react-native';

/**
 * Where the snaptart.com photo API lives.
 *
 * In production on the web this app is served from snaptart.com/2026-france-and-italy, so it
 * is the same origin as the API and an empty base gives plain `/api/...` paths. Everywhere
 * else it has to be told an absolute address:
 *
 * - `npm run web` in development talks to the site's own dev server on localhost:3000.
 * - On a phone (Expo Go over the LAN, or a native build) localhost means the phone itself, so
 *   set `EXPO_PUBLIC_SNAPTART_API` to the machine's address, e.g.
 *   `EXPO_PUBLIC_SNAPTART_API=http://192.168.1.20:3000 npm start`. The site's `npm run dev`
 *   already binds 0.0.0.0, so it is reachable there.
 *
 * Reads are open to any origin (the site sends `Access-Control-Allow-Origin: *` on GET), which
 * is what lets the app on :8081 fetch from :3000 at all.
 */
export const API_BASE =
  process.env.EXPO_PUBLIC_SNAPTART_API?.replace(/\/+$/, '') ??
  (__DEV__ ? 'http://localhost:3000' : Platform.OS === 'web' ? '' : 'https://www.snaptart.com');

/** GET and parse JSON from the site, throwing with the path in the message on any failure. */
export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}
