# OpenClaw Bridge (OAuth Reuse)

This bridge lets AgentDashboard use the same OpenClaw runtime/session and provider auth already active on your MBP.

## 1) Run bridge on MBP

```bash
cd /tmp/motus-dao-agentdashboard
export OPENCLAW_BRIDGE_TOKEN='REPLACE_WITH_LONG_RANDOM_TOKEN'
export OPENCLAW_BRIDGE_PORT=8787
node bridge/openclaw-bridge.mjs
```

Health check:

```bash
curl -s http://127.0.0.1:8787/health
```

## 2) Expose bridge to internet (Cloudflare tunnel)

```bash
cloudflared tunnel --url http://127.0.0.1:8787
```

Copy the generated `https://...trycloudflare.com` URL.

## 3) Set Vercel env vars

- `OPENCLAW_BRIDGE_URL` = `https://YOUR-TUNNEL.trycloudflare.com/respond`
- `OPENCLAW_BRIDGE_TOKEN` = same token used on MBP bridge

Then redeploy.

## Local Next.js dev (`npm run dev`)

If `OPENCLAW_BRIDGE_URL` points at a public host (e.g. `https://openclaw.app.avril.life/respond`), your laptop may get **502** or connection errors from `/api/chat/respond` when that host is unreachable from your machine.

Use a **dev-only** override (ignored in production / `next start`):

1. In `.env.local`:

   ```bash
   OPENCLAW_BRIDGE_URL_DEV=http://127.0.0.1:8787/respond
   OPENCLAW_BRIDGE_TOKEN=<same-as-bridge-process>
   ```

2. In another terminal, run the bridge:

   ```bash
   export OPENCLAW_BRIDGE_TOKEN='<same-as-above>'
   export OPENCLAW_BRIDGE_PORT=8787
   node bridge/openclaw-bridge.mjs
   ```

3. Quick check: `curl -s http://127.0.0.1:8787/health` → `{"ok":true}`

Spawn’s allow-list automatically matches `OPENCLAW_BRIDGE_URL_DEV` when `NODE_ENV=development`.

**Shortcut:** `npm run openclaw:bridge` (after `export OPENCLAW_BRIDGE_TOKEN=...` — same value as in `.env.local`).

If you use **`127.0.0.1`** in `OPENCLAW_BRIDGE_URL_DEV`, the bridge must run on the **same machine** as `next dev`. If OpenClaw runs only on a **VPS**, remove `OPENCLAW_BRIDGE_URL_DEV` or point it at `https://openclaw.app.avril.life/respond` and fix the server — see [VPS_OPENCLAW_CHECKS.md](./VPS_OPENCLAW_CHECKS.md).

## 4) Keep process alive

Use `tmux` or `systemd`/`pm2` so bridge + tunnel survive disconnects.

## Notes

- Bridge endpoint requires Bearer token.
- Dashboard route `/api/chat/respond` now calls this bridge first.
- If bridge is unavailable, response falls back to a setup warning.
- **Contract:** Request/response schema and bounded context (agent id, area, sub-area, scoped prompt stuffing) are defined in [BRIDGE_CONTRACT.md](./BRIDGE_CONTRACT.md).
