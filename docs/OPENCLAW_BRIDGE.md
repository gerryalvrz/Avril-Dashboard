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

## 4) Keep process alive

Use `tmux` or `systemd`/`pm2` so bridge + tunnel survive disconnects.

## Notes

- Bridge endpoint requires Bearer token.
- Dashboard route `/api/chat/respond` now calls this bridge first.
- If bridge is unavailable, response falls back to a setup warning.
- **Contract:** Request/response schema and bounded context (agent id, area, sub-area, scoped prompt stuffing) are defined in [BRIDGE_CONTRACT.md](./BRIDGE_CONTRACT.md).
