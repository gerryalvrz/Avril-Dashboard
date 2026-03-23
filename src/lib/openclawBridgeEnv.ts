/**
 * OpenClaw bridge URL resolution.
 *
 * When running `next dev`, set `OPENCLAW_BRIDGE_URL_DEV` to point at a local bridge
 * (e.g. http://127.0.0.1:8787/respond) so you don't depend on public DNS/TLS.
 * Production / `next start` uses `OPENCLAW_BRIDGE_URL` only.
 */
export function resolveOpenClawBridgeUrl(): string | undefined {
  const prod = process.env.OPENCLAW_BRIDGE_URL?.trim();
  if (process.env.NODE_ENV === 'development') {
    const dev = process.env.OPENCLAW_BRIDGE_URL_DEV?.trim();
    if (dev) return dev;
  }
  return prod;
}

/**
 * URL allowed for spawn route guard. In development, if `OPENCLAW_BRIDGE_URL_DEV` is set,
 * it must match the bridge URL (same value) so local spawn works without copying prod allow-list.
 */
export function resolveOpenClawAllowedBridgeUrl(defaultProduction: string): string {
  if (process.env.NODE_ENV === 'development') {
    const dev = process.env.OPENCLAW_BRIDGE_URL_DEV?.trim();
    if (dev) return dev;
  }
  return (process.env.OPENCLAW_ALLOWED_BRIDGE_URL || defaultProduction).trim();
}

export function formatBridgeFetchError(err: unknown, bridgeUrl: string): string {
  const parts: string[] = [];
  if (err instanceof Error) {
    parts.push(err.message);
    const c = (err as Error & { cause?: unknown }).cause;
    if (c instanceof Error) parts.push(c.message);
  } else {
    parts.push(String(err));
  }
  const combined = parts.filter(Boolean).join(' ');

  if (/ECONNREFUSED|ENOTFOUND|certificate|CERT_|fetch failed|getaddrinfo|network/i.test(combined)) {
    return `Bridge unreachable at ${bridgeUrl}: ${combined}. For local dev: set OPENCLAW_BRIDGE_URL_DEV=http://127.0.0.1:8787/respond, same OPENCLAW_BRIDGE_TOKEN as the bridge, then run OPENCLAW_BRIDGE_TOKEN=... node bridge/openclaw-bridge.mjs`;
  }
  return combined || 'Bridge request failed.';
}
