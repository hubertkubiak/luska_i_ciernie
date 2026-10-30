import type { RequestHandler } from 'express';
import { PRERENDER_ORIGIN } from '../shared/models';

/**
 * Express `trust proxy` from TRUST_PROXY: how many proxies sit in front of the app (Render: 1).
 * Without it, behind a proxy every visitor has the proxy's IP (one shared rate-limit bucket for
 * everyone) and `req.protocol` is "http" although the browser talks HTTPS — so the Origin check
 * rejects every form and the session cookie is never marked Secure.
 * Never trust more hops than you really have: X-Forwarded-For is easy to forge.
 */
export function trustProxy(value = process.env['TRUST_PROXY']): number | boolean {
  if (!value) return false;
  if (value === 'true') return true;
  const hops = Number(value);
  return Number.isInteger(hops) && hops >= 0 ? hops : false;
}

/**
 * Hosts Angular SSR may render for (protection against Host-header spoofing / SSRF): localhost from
 * angular.json, plus NG_ALLOWED_HOSTS, plus the hostname Render assigns (RENDER_EXTERNAL_HOSTNAME),
 * so a fresh Render service works without editing env vars by hand.
 * Returns undefined when there is nothing to add — Angular then reads NG_ALLOWED_HOSTS itself.
 */
export function allowedHosts(env: NodeJS.ProcessEnv = process.env): string[] | undefined {
  const hosts = [...(env['NG_ALLOWED_HOSTS'] ?? '').split(','), env['RENDER_EXTERNAL_HOSTNAME'] ?? '']
    .map((h) => h.trim())
    .filter(Boolean);
  return hosts.length ? [...new Set(hosts)] : undefined;
}

/** Public site origin for the sitemap and RSS: PUBLIC_ORIGIN, or the URL Render assigns. */
export function publicOrigin(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return (env['PUBLIC_ORIGIN'] || env['RENDER_EXTERNAL_URL'])?.replace(/\/$/, '') || undefined;
}

/** Public demo with ephemeral storage (Render free): auth pages warn that accounts get wiped. */
export function isDemo(value = process.env['DEMO_MODE']): boolean {
  return value === 'true';
}

/**
 * Security headers for every response, without extra dependencies.
 * The CSP is deliberately partial: Angular inlines critical CSS and the transfer-state script,
 * so a strict script-src/style-src would need nonces. These directives break nothing and still
 * forbid framing (clickjacking), <base> hijacking, foreign form targets and plugins.
 */
export function securityHeaders(): RequestHandler {
  return (req, res, next) => {
    res.set({
      'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
    });
    // HSTS only over HTTPS — sent over plain http (localhost) it would be ignored anyway.
    if (req.secure) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  };
}

/** Health check for the hosting platform: cheap, no Angular, no database. */
export const healthz: RequestHandler = (_req, res) => {
  res.set('Cache-Control', 'no-store').type('text/plain').send('ok');
};

/**
 * Prerendered HTML carries PRERENDER_ORIGIN instead of an address (see shared/models.ts). Put the real
 * public origin back before the page leaves the server. SSR pages never contain it — they are returned as is.
 */
export async function withPublicOrigin(response: Response, origin: string): Promise<Response> {
  if (!response.headers.get('content-type')?.includes('text/html')) return response;
  const html = await response.text();
  const headers = new Headers(response.headers);
  if (html.includes(PRERENDER_ORIGIN)) headers.delete('content-length');
  return new Response(html.replaceAll(PRERENDER_ORIGIN, origin), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
