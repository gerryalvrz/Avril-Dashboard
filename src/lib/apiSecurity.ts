import { requireSession } from './sessionAuth';

const WINDOW_MS = 5 * 60 * 1000;

type Bucket = {
  resetAt: number;
  count: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __agentdashboardRateLimit: Map<string, Bucket> | undefined;
}

const buckets = globalThis.__agentdashboardRateLimit ?? new Map<string, Bucket>();
globalThis.__agentdashboardRateLimit = buckets;

export function getClientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

export function requireDashboardToken(req: Request) {
  if (requireSession(req)) return true;

  // Legacy server-side token fallback for non-session demo clients.
  // Only enabled when DASHBOARD_APP_TOKEN is configured on the server.
  const expectedToken = process.env.DASHBOARD_APP_TOKEN;
  if (expectedToken) {
    const incomingToken = req.headers.get('x-dashboard-token');
    if (incomingToken && incomingToken === expectedToken) return true;
  }

  // Controlled bypass for demo emergencies. Disabled by default.
  const bypassEnabled = process.env.DEMO_BYPASS_ENABLED === 'true';
  const bypassKey = process.env.DEMO_BYPASS_KEY;
  if (bypassEnabled && bypassKey) {
    const incoming = req.headers.get('x-demo-bypass-key');
    if (incoming === bypassKey) return true;
  }

  return false;
}

export function hitRateLimit(key: string, limit: number) {
  const now = Date.now();
  const prev = buckets.get(key);

  if (!prev || prev.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  prev.count += 1;
  buckets.set(key, prev);
  return prev.count > limit;
}

export function rejectLargePayload(req: Request, maxBytes: number) {
  const contentLength = Number(req.headers.get('content-length') || '0');
  return Number.isFinite(contentLength) && contentLength > maxBytes;
}
