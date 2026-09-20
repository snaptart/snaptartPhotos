/**
 * Cross-origin reads for the public GET endpoints.
 *
 * The trip journal at /2026-france-and-italy is a separate Expo app: in production it is
 * served from this same origin, but while it is being worked on it runs from its own dev
 * server (localhost:8081, or a LAN address when opened on a phone) and cannot read the API
 * without these headers.
 *
 * `*` rather than an allowlist is deliberate, and is the safer choice here: the browser
 * refuses to send cookies to a `*` origin, so a signed-in admin's session can never be
 * borrowed cross-origin and another origin only ever sees published content. Mutations get
 * none of this and stay same-origin.
 */
export const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" };

/** Add the read headers to a response on its way out. */
export function withCors<T extends Response>(res: T): T {
  for (const [name, value] of Object.entries(CORS_HEADERS)) res.headers.set(name, value);
  return res;
}

/** Answer a preflight for a read-only endpoint. */
export function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}
