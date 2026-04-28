/**
 * Nagare docs Worker — serves the Astro Starlight build output via the ASSETS
 * binding, applying security headers and the legacy `~` URL handling that the
 * old `scripts/docs-server.ts` provided on Deno Deploy.
 *
 * InfoSec: applies CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
 * to every successful response. No user input, no auth, no PII.
 */

interface Env {
  ASSETS: Fetcher;
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "script-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "connect-src 'self' https://jsr.io https://api.github.com",
    "frame-ancestors 'none'",
  ].join("; "),
};

let redirectMapCache: Record<string, string> | null = null;

async function getRedirectMap(assets: Fetcher, origin: string): Promise<Record<string, string>> {
  if (redirectMapCache !== null) return redirectMapCache;
  try {
    const res = await assets.fetch(new Request(`${origin}/api/redirects.json`));
    redirectMapCache = res.ok ? await res.json() as Record<string, string> : {};
  } catch {
    redirectMapCache = {};
  }
  return redirectMapCache;
}

function applySecurityHeaders(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json(
        { status: "healthy", service: "nagare-docs", timestamp: new Date().toISOString() },
        { headers: SECURITY_HEADERS },
      );
    }

    const redirects = await getRedirectMap(env.ASSETS, url.origin);
    const target = redirects[url.pathname];
    if (target) {
      return new Response(null, { status: 301, headers: { Location: target, ...SECURITY_HEADERS } });
    }

    // Decode encoded tildes in legacy doc URLs. Use a relative Location so the
    // redirect target is path-only — same origin guaranteed, no URL synthesis
    // from request input.
    if (url.pathname.includes("%7E")) {
      const path = url.pathname.replaceAll("%7E", "~") + url.search;
      return new Response(null, { status: 301, headers: { Location: path, ...SECURITY_HEADERS } });
    }

    return applySecurityHeaders(await env.ASSETS.fetch(req));
  },
} satisfies ExportedHandler<Env>;
