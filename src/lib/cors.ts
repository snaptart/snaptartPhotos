/**
 * Cross-origin reads for the public GET endpoints.
 *
 * Lets a separate front end (another app, or one served from its own dev server such as
 * localhost:8081 or a LAN address on a phone) read published galleries and photos from
 * this site's API. Without these headers the browser blocks those reads.
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
