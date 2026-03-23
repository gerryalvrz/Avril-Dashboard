#!/usr/bin/env node
/**
 * OpenClaw + tunnel sanity checks using .env.local (no secrets printed).
 * Run from repo root: node script/openclaw-diagnostic.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env.local');

function loadDotEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) {
    console.error(`Missing ${file}`);
    process.exit(1);
  }
  const text = fs.readFileSync(file, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function resolveBridgeUrl(env, nodeEnv) {
  const prod = env.OPENCLAW_BRIDGE_URL?.trim();
  if (nodeEnv === 'development') {
    const dev = env.OPENCLAW_BRIDGE_URL_DEV?.trim();
    if (dev) return dev;
  }
  return prod;
}

function bridgeHealthUrl(bridgeRespondUrl) {
  try {
    const u = new URL(bridgeRespondUrl);
    u.pathname = '/health';
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

function gatewayHeadUrl(gatewayUrl) {
  const g = gatewayUrl?.trim();
  if (!g) return null;
  return g.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
}

async function tryFetch(label, url, init) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return { label, ok: res.ok, status: res.status, error: null };
  } catch (e) {
    return { label, ok: false, status: null, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(t);
  }
}

const env = loadDotEnv(envPath);
const bridgeDev = resolveBridgeUrl(env, 'development');
const bridgeProd = resolveBridgeUrl(env, 'production');
const bridgeToken = env.OPENCLAW_BRIDGE_TOKEN?.trim();
const gatewayUrl = env.OPENCLAW_GATEWAY_URL?.trim();
const gatewayToken = env.OPENCLAW_GATEWAY_TOKEN?.trim();
const dashboardToken = env.DASHBOARD_APP_TOKEN?.trim();
const port = env.PORT || '3000';
const nextBase = `http://127.0.0.1:${port}`;

console.log('=== OpenClaw diagnostic (.env.local) ===\n');
console.log('Bridge URL (as Next dev would use):', bridgeDev || '(missing)');
console.log('Bridge URL (as production would use):', bridgeProd || '(missing)');
console.log('Gateway URL:', gatewayUrl || '(missing)');
console.log('OPENCLAW_BRIDGE_TOKEN:', bridgeToken ? 'set' : 'MISSING');
console.log('OPENCLAW_GATEWAY_TOKEN:', gatewayToken ? 'set' : 'MISSING');
console.log('');

const results = [];

if (bridgeDev) {
  const health = bridgeHealthUrl(bridgeDev);
  if (health) {
    results.push(await tryFetch('GET bridge /health (dev URL)', health, { method: 'GET' }));
  }
  if (bridgeToken) {
    results.push(
      await tryFetch('HEAD bridge /respond (orchestration health style)', bridgeDev, {
        method: 'HEAD',
        headers: { Authorization: `Bearer ${bridgeToken}` },
      }),
    );
    results.push(
      await tryFetch('POST bridge /respond (minimal ping)', bridgeDev, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${bridgeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'diagnostic ping' }),
      }),
    );
  }
}

if (gatewayUrl && gatewayToken) {
  const headU = gatewayHeadUrl(gatewayUrl);
  if (headU) {
    results.push(
      await tryFetch('HEAD gateway (https form of OPENCLAW_GATEWAY_URL)', headU, {
        method: 'HEAD',
        headers: { Authorization: `Bearer ${gatewayToken}` },
      }),
    );
  }
}

if (dashboardToken && bridgeToken && gatewayUrl) {
  results.push(
    await tryFetch(`GET ${nextBase}/api/orchestration/health`, `${nextBase}/api/orchestration/health`, {
      method: 'GET',
      headers: { 'x-dashboard-token': dashboardToken },
    }),
  );
}

for (const r of results) {
  const status = r.status != null ? `HTTP ${r.status}` : 'no response';
  const tail = r.error ? ` — ${r.error}` : '';
  console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.label}: ${status}${tail}`);
}

console.log('\n--- Notes ---');
console.log(
  '• Orchestration health uses HEAD on /respond; openclaw-bridge.mjs does not implement HEAD there, so that line often shows FAIL even when chat works.',
);
console.log(
  '• If GET /health and POST /respond succeed for your bridge URL, the VPS/tunnel path for HTTP is good.',
);
console.log(
  '• Gateway: WebSockets may work even if HEAD returns non-200; treat HEAD as a rough signal only.',
);
console.log('• On the VPS, follow docs/VPS_OPENCLAW_CHECKS.md (ss, docker, nginx, curl from server).');
console.log('');
