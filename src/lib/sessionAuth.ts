import crypto from 'crypto';

const NONCE_COOKIE = 'ad_nonce';
const SESSION_COOKIE = 'ad_session';

type SessionPayload = {
  address: string;
  exp: number;
};

function b64url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function fromB64url(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function parseCookies(req: Request) {
  const raw = req.headers.get('cookie') || '';
  return raw.split(';').reduce<Record<string, string>>((acc, part) => {
    const [k, ...rest] = part.trim().split('=');
    if (!k) return acc;
    acc[k] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function getSecret() {
  return process.env.DASHBOARD_SESSION_SECRET || '';
}

function sign(value: string) {
  const secret = getSecret();
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

export function hasSessionSecret() {
  return !!getSecret();
}

export function makeNonce() {
  return crypto.randomBytes(16).toString('hex');
}

export function getNonceFromRequest(req: Request) {
  const cookies = parseCookies(req);
  return cookies[NONCE_COOKIE] || null;
}

export function buildNonceCookie(nonce: string) {
  return `${NONCE_COOKIE}=${encodeURIComponent(nonce)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
}

export function clearNonceCookie() {
  return `${NONCE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function createSessionToken(address: string) {
  const payload: SessionPayload = {
    address: address.toLowerCase(),
    exp: Date.now() + 1000 * 60 * 60 * 12,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = sign(body);
  if (!sig) return null;
  return `${body}.${sig}`;
}

export function buildSessionCookie(token: string) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readSession(req: Request): SessionPayload | null {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expected = sign(body);
  if (!expected) return null;

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const parsed = JSON.parse(fromB64url(body)) as SessionPayload;
    if (!parsed?.address || typeof parsed.exp !== 'number') return null;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function requireOwnerSession(req: Request) {
  const owner = (process.env.NEXT_PUBLIC_OWNER_WALLET || '').toLowerCase();
  const session = readSession(req);
  if (!session) return false;
  if (!owner) return true;
  return session.address === owner;
}

export { NONCE_COOKIE, SESSION_COOKIE };
