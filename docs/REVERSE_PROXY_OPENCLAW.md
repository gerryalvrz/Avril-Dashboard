# Reverse proxy: `openclaw.app.avril.life` (bridge + gateway)

The dashboard expects:

| Traffic | URL | Backend |
|--------|-----|---------|
| Bridge (HTTP) | `https://openclaw.app.avril.life/respond` | Node bridge (`bridge/openclaw-bridge.mjs`, default **8787**, path `/respond`) |
| Gateway (WebSocket) | `wss://openclaw.app.avril.life` (often root `/`) | OpenClaw gateway process/container |

**Replace placeholders** before use:

- `BRIDGE_UPSTREAM` — e.g. `127.0.0.1:8787` (or `openclaw-bridge:8787` on Docker network)
- `GATEWAY_UPSTREAM` — port/host where the gateway listens (check your OpenClaw / docker-compose; common patterns are a dedicated port on `127.0.0.1` or a container name)

---

## DNS & TLS

1. Create **A** or **CNAME** for `openclaw.app.avril.life` → your VPS / load balancer.
2. Issue a certificate (Let’s Encrypt). Nginx/Caddy examples below include TLS.

---

## Nginx

Assumes:

- Bridge: `http://BRIDGE_UPSTREAM` serves `POST /respond` and `GET /health`.
- Gateway: `http://GATEWAY_UPSTREAM` accepts WebSocket upgrade on `/` (adjust if your gateway uses another path).

```nginx
# /etc/nginx/sites-available/openclaw.app.avril.life.conf

upstream openclaw_bridge {
    server 127.0.0.1:8787;   # BRIDGE_UPSTREAM
    keepalive 8;
}

upstream openclaw_gateway {
    server 127.0.0.1:18789; # GATEWAY_UPSTREAM — set to your real gateway port
    keepalive 8;
}

server {
    listen 443 ssl http2;
    server_name openclaw.app.avril.life;

    # ssl_certificate /etc/letsencrypt/live/openclaw.app.avril.life/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/openclaw.app.avril.life/privkey.pem;

    # Bridge: exact path used by the dashboard
    location = /respond {
        proxy_pass http://openclaw_bridge;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
        client_max_body_size 1m;
    }

    # Optional: bridge health (manual curl)
    location = /health {
        proxy_pass http://openclaw_bridge/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Gateway: WebSocket + normal HTTP on same host
    location / {
        proxy_pass http://openclaw_gateway;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}

map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

Reload: `sudo nginx -t && sudo systemctl reload nginx`

### HEAD checks (orchestration health)

`app/api/orchestration/health/route.ts` does **HEAD** on:

- `OPENCLAW_BRIDGE_URL` (full URL, e.g. `.../respond`)
- `OPENCLAW_GATEWAY_URL` converted to **https** (same host, root)

**Bridge caveat:** `bridge/openclaw-bridge.mjs` only implements `GET /health` and `POST /respond` — it does **not** handle `HEAD /respond`. So the dashboard health check may report `bridge: unreachable` even when `POST /respond` works.

**Fix options (pick one):**

1. **Easiest:** Point `OPENCLAW_BRIDGE_URL` at a small Nginx `location = /respond` that answers `HEAD` with **200** when `Authorization` matches (and still `proxy_pass`es `POST` to the bridge), or
2. **Code:** Add a `HEAD` handler for `/respond` in `openclaw-bridge.mjs` (mirror `POST` auth, return 200 with empty body).

**Gateway:** If the gateway does **not** answer `HEAD /` with **200** (with your bearer token, if required), health may show `gateway: unreachable` even when WebSockets work. Configure the gateway or proxy to allow `HEAD /`, or treat health as advisory.

---

## Caddy v2

```caddyfile
# Caddyfile snippet — merge into your site block or use as file

openclaw.app.avril.life {
    encode zstd gzip

    # Bridge
    handle /respond {
        reverse_proxy 127.0.0.1:8787
    }

    handle /health {
        reverse_proxy 127.0.0.1:8787
    }

    # Gateway (WebSocket + HTTP)
    handle {
        reverse_proxy 127.0.0.1:18789 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }
}
```

Caddy forwards `Upgrade` / `Connection` by default for WebSockets when the client sends them.

Replace `127.0.0.1:18789` with your real **GATEWAY_UPSTREAM**.

---

## Env alignment (dashboard)

On Vercel / `.env.local`, keep these consistent with the public URLs:

```bash
OPENCLAW_BRIDGE_URL=https://openclaw.app.avril.life/respond
OPENCLAW_ALLOWED_BRIDGE_URL=https://openclaw.app.avril.life/respond
OPENCLAW_GATEWAY_URL=wss://openclaw.app.avril.life
```

Tokens must match what the bridge and gateway expect (`OPENCLAW_BRIDGE_TOKEN`, `OPENCLAW_GATEWAY_TOKEN`).

---

## Quick manual checks

```bash
# Bridge health (no auth on default bridge script)
curl -sS https://openclaw.app.avril.life/health

# Bridge respond (needs token)
curl -sS -X POST https://openclaw.app.avril.life/respond \
  -H "Authorization: Bearer YOUR_OPENCLAW_BRIDGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"ping"}'
```

WebSocket: use a WS client against `wss://openclaw.app.avril.life` with the gateway auth your stack requires (dashboard sends token in the JSON-RPC `connect` after `connect.challenge` — see `src/lib/openclawWsClient.ts`).
