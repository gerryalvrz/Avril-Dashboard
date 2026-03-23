# VPS / server checks when OpenClaw bridge shows “unreachable”

## What `ECONNREFUSED 127.0.0.1:8787` means

That error is **only** about your **local machine**: nothing is listening on **port 8787 on localhost**.

- **If you use `OPENCLAW_BRIDGE_URL_DEV=http://127.0.0.1:8787/respond`**  
  You **must** run the bridge **on the same computer** as `npm run dev` (see below), **or** remove that env var and use the public bridge URL instead.

- **If the bridge runs on a VPS**  
  Do **not** use `127.0.0.1` in the dashboard env. Either:
  - Remove `OPENCLAW_BRIDGE_URL_DEV` and set `OPENCLAW_BRIDGE_URL=https://openclaw.app.avril.life/respond` (or your real host), **or**
  - Set `OPENCLAW_BRIDGE_URL_DEV=https://openclaw.app.avril.life/respond` so dev still hits the VPS.

---

## Run the bridge locally (Mac / same machine as Next)

From the repo root, with the **same** token as `OPENCLAW_BRIDGE_TOKEN` in `.env.local`:

```bash
export OPENCLAW_BRIDGE_TOKEN='your-token-from-env-local'
export OPENCLAW_BRIDGE_PORT=8787
npm run openclaw:bridge
```

Or:

```bash
node bridge/openclaw-bridge.mjs
```

Health:

```bash
curl -s http://127.0.0.1:8787/health
# expect: {"ok":true}
```

Test respond (replace `TOKEN`):

```bash
curl -s -X POST http://127.0.0.1:8787/respond \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}'
```

---

## SSH to the VPS and verify the stack

Replace host/user as needed.

```bash
ssh user@YOUR_VPS_IP
```

### 1) Is anything listening on the bridge port?

Default bridge script uses **8787** unless you changed `OPENCLAW_BRIDGE_PORT`.

```bash
sudo ss -tlnp | grep -E '8787|443'
# or
sudo lsof -iTCP:8787 -sTCP:LISTEN
```

### 2) Docker (common for OpenClaw)

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -i openclaw
```

Inspect bridge container logs (name from `docker ps`, e.g. `openclaw-bridge`):

```bash
docker logs --tail 100 openclaw-bridge
```

If using compose:

```bash
cd /path/to/compose   # your deploy directory
docker compose ps
docker compose logs --tail 80 openclaw-bridge
docker compose logs --tail 80 gateway   # or openclaw-gateway service name
```

### 3) From the VPS, hit the bridge directly

If bridge listens on 127.0.0.1:8787 **inside** the host:

```bash
curl -sS http://127.0.0.1:8787/health
```

If bridge is only inside Docker:

```bash
docker exec openclaw-bridge wget -qO- http://127.0.0.1:8787/health
# or curl inside the container if installed
```

### 4) Through public HTTPS (what the dashboard uses without DEV URL)

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://openclaw.app.avril.life/health
curl -sS -X POST https://openclaw.app.avril.life/respond \
  -H "Authorization: Bearer YOUR_BRIDGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"ping"}'
```

- **502 / 504** from nginx → upstream bridge down or wrong `proxy_pass`.
- **Connection refused** from curl on the VPS to `127.0.0.1:8787` → bridge process/container not running or wrong port.

### 5) Nginx (if you terminate TLS in front of bridge)

```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -n 80 /var/log/nginx/error.log
```

### 6) Firewall

```bash
sudo ufw status
# if ufw enabled, 443/tcp must be allowed for public access
```

---

## Quick decision table

| You want | `OPENCLAW_BRIDGE_URL_DEV` | Bridge must be running on |
|----------|---------------------------|----------------------------|
| Local Next + local OpenClaw | `http://127.0.0.1:8787/respond` | **Your Mac** (`npm run openclaw:bridge`) |
| Local Next + VPS OpenClaw | **Unset** or set to `https://openclaw.app.avril.life/respond` | **VPS** (fix VPS until curl to `/health` works) |
