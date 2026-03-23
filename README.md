# Avril Dashboard — Agentic Business OS

**Avril Dashboard** is a control plane for multi-agent operations: an **Avril architect** interviews a founder in chat, **persists structured ignition state** in Convex, then **hands off** to **OpenClaw** for live orchestration with **Agent Office** visualization. The stack ties together **Human.tech** (wallet/session), optional **Human Passport** scoring, and **ERC-8004** agent identity on **Celo**.

This README summarizes what we shipped for the hackathon and lists **verifiable onchain evidence** where we have it.

---

## What we built

### Interview → ignition → spawn

- **Unified Avril architect persona** with structured JSON (`architectPayload`: captured fields, phase, `handoff_ready`, ignition text). Venice and OpenClaw use the same system prompt via `/api/chat/respond` and the bridge.
- **Convex-backed ignition drafts** (`chatIgnitionDrafts`): org- and chat-scoped state, `ignitionPrompt`, status (`collecting` / `ready` / `spawned`), and `spawnSessionId` after a successful run.
- **APIs:** `GET /api/chat/ignition-draft`, `POST /api/chat/respond` (Venice path + draft upsert), `POST /api/orchestration/spawn`, **`POST /api/orchestration/handoff-openclaw`** (loads a ready draft and spawns via shared `runOpenClawSpawn`).
- **UI:** Chats panel with ignition preview, **Load DB prompt** / **Spawn with saved prompt**, primary **Send to OpenClaw (production)** for Venice-ready drafts, **Launch Agent Office** (`/agents/office?sessionId=…`), founder wizard stepper, and **“Agent brief”** folder-style long messages that mark drafts ready for handoff.

### OpenClaw integration

- **Node bridge** (`bridge/openclaw-bridge.mjs`): Bearer-authenticated `POST /respond` that forwards scoped context into the OpenClaw CLI/runtime.
- **Contract** between dashboard and bridge: bounded `messages[]`, optional `summary`, `maxContextChars`, agent `area` / `subArea` — documented in [`docs/BRIDGE_CONTRACT.md`](docs/BRIDGE_CONTRACT.md).
- **Shared spawn runner** [`src/lib/runOpenClawSpawn.ts`](src/lib/runOpenClawSpawn.ts): creates orchestration session, gateway WebSocket stream, bridge `fetch` with retries for flaky gateway errors, marks draft spawned on success.
- **Swarm guardrails** [`src/lib/orchestrationSwarmGuardrails.ts`](src/lib/orchestrationSwarmGuardrails.ts): prepended on every bridge spawn — **3** top-level swarm orchestrations, **≤3** workers per swarm, **≤12** total agents for MVP (stops runaway agent fan-out).

### Platform & UX

- **Next.js + TypeScript** app with **Convex** for data and server-side chat/orchestration helpers (`CONVEX_SERVER_SECRET` boundary so Convex is not exposed to the client).
- **Human.tech** auth boundary and **WaaP** for wallet flows (e.g. Celo switch + ERC-8004 registration).
- **Optional Human Passport** verification via `verifyHumanTechSession()` ([`src/lib/humantech.ts`](src/lib/humantech.ts)) when Passport env vars are set.
- **Rich chat UI** (animated architect experience, plan/brief affordances) aligned with the product demo path.

### Docs for judges / operators

- [`docs/OPENCLAW_BRIDGE.md`](docs/OPENCLAW_BRIDGE.md) — run the bridge locally, tunnels, `OPENCLAW_BRIDGE_URL` / dev override.
- [`docs/VENICE_OPENCLAW_HANDOFF_CHECKLIST.md`](docs/VENICE_OPENCLAW_HANDOFF_CHECKLIST.md) — handoff and guardrails checklist.
- [`docs/FULL_DEMO_CHECKLIST.md`](docs/FULL_DEMO_CHECKLIST.md) — end-to-end demo story.
- [`docs/STARTUP_AGENT_GENERATOR.md`](docs/STARTUP_AGENT_GENERATOR.md) — startup swarm generation flow, policies, and safety model.
- [`docs/ENS_SUBDOMAIN_AUTOMATION.md`](docs/ENS_SUBDOMAIN_AUTOMATION.md) — ENS subdomain payload/execution path under `prism-protocol.eth`.

---

## Stack

- Next.js + TypeScript  
- Convex (schema: orgs, users, roles, tasks, chats, agents, wallets, audit, ignition drafts, orchestration)  
- Human.tech + optional Human Passport  
- Venice (chat) + OpenClaw (orchestration) via bridge  
- Celo + ERC-8004 identity registry (see below)

---

## Run locally

```bash
npm install
npm run dev
```

---

## Environment (essentials)

**Convex server secret (required for chat):** set the same value in Convex and `.env.local`:

1. `openssl rand -base64 32`
2. `npx convex env set CONVEX_SERVER_SECRET "<your-secret>"`
3. Add `CONVEX_SERVER_SECRET=...` to `.env.local`

A default organization is created automatically on first chat creation.

**OpenClaw (for live spawn):** `OPENCLAW_BRIDGE_URL`, `OPENCLAW_BRIDGE_TOKEN`, and an allow-listed production URL (`OPENCLAW_ALLOWED_BRIDGE_URL`) matching your deployed bridge. For local dev, see `OPENCLAW_BRIDGE_URL_DEV` in [`.env.example`](.env.example) and [`docs/OPENCLAW_BRIDGE.md`](docs/OPENCLAW_BRIDGE.md).

Copy [`.env.example`](.env.example) and fill Human.tech, Convex, and optional Passport / gateway variables as needed.

---

## Human Passport (optional)

When `PASSPORT_API_KEY`, `PASSPORT_SCORER_ID`, and optionally `PASSPORT_SCORE_THRESHOLD` are set, `verifyHumanTechSession(address)` can return a passing Human Passport identity; otherwise it returns `null`. See [developer.passport.xyz](https://developer.passport.xyz/).

---

## ERC-8004 agent identity (Celo)

The app can register an onchain agent identity on Celo using the global [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) registry. Registration JSON and logo are served from this app (e.g. on Vercel).

**Setup**

1. Set `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_AGENT_REGISTRATION_URI`, optional `NEXT_PUBLIC_CELO_RPC_URL`.
2. **Registry (Celo mainnet):** `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
3. In the app: **Wallets** → **Register ERC-8004 identity on Celo** (sign with WaaP).
4. After registration, set `NEXT_PUBLIC_ERC8004_AGENT_ID` and `NEXT_PUBLIC_ERC8004_AGENT_OWNER` for domain proof at `/.well-known/agent-registration.json`.

**Hosted artifacts**

| Resource | Path / note |
|----------|-------------|
| Logo | `/agent-logo.svg` |
| Registration JSON | `GET /agent-registration.json` |
| Agent card (A2A) | `GET /.well-known/agent-card.json` |
| Domain proof | `GET /.well-known/agent-registration.json` (requires agent id + owner env) |

---

## Onchain evidence (Celo mainnet)

Verifiable activity we reference for this submission:

| Field | Value |
|--------|--------|
| **Network** | Celo mainnet (`chainId` **42220**) |
| **ERC-8004 Identity Registry** | [`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`](https://celoscan.io/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) |
| **Registered agent (token ID)** | **1849** |
| **Agent NFT / token view** | [Celoscan NFT — agent #1849](https://celoscan.io/nft/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432/1849) |
| **Registration transaction** | [`0xc7082bdae53cf295a97af538a5a9df3b86071fb3181b3df5ef0609091c0c19b9`](https://celoscan.io/tx/0xc7082bdae53cf295a97af538a5a9df3b86071fb3181b3df5ef0609091c0c19b9) |
| **Agent URI (example deployment)** | `https://app.avril.life/agent-registration.json` |
| **Domain proof URL** | `https://app.avril.life/.well-known/agent-registration.json` (with `NEXT_PUBLIC_ERC8004_AGENT_ID` / owner configured) |

*Additional deploy-specific txs (new wallets, updated URIs) can be looked up on [Celoscan](https://celoscan.io) for the same registry address.*

---

## Quick links

| Need | Link |
|------|------|
| Deploy / env | [Vercel Dashboard](https://vercel.com/dashboard) |
| Convex | [Convex Dashboard](https://dashboard.convex.dev) |
| Human Passport | [developer.passport.xyz](https://developer.passport.xyz/) |
| Human.tech wallet | [docs.wallet.human.tech](https://docs.wallet.human.tech/guides/start) |
| ERC-8004 spec | [EIP-8004](https://eips.ethereum.org/EIPS/eip-8004), [8004.org](https://www.8004.org) |

---

## Startup Agent Generator

Generate startup AI swarms with human-root controls, role delegates, context wallets, ENS subdomain assignment payloads, optional ERC-8004 registration, and audit artifacts.

### Quickstart

1. Configure root credentials in host-secure storage (`~/.config/prism/keys`) or `PRISM_ROOT_PRIVATE_KEY`.
2. Optionally configure onchain addresses for live tx execution:
   - `PRISM_FACTORY_ADDRESS`
   - `PRISM_CONTEXT_ADDRESS`
   - `ENS_REGISTRY_ADDRESS`
3. Run:

```bash
./scripts/startup-agent-generator.sh "acme-robotics" '[{"role":"ceo-agent","policy":{"spendingLimit":"10000000000000000","dailyLimit":"30000000000000000","ttl":172800,"allowlist":[]}},{"role":"sales-agent","policy":{"spendingLimit":"5000000000000000","dailyLimit":"15000000000000000","ttl":86400,"allowlist":[]}},{"role":"support-agent","policy":{"spendingLimit":"1000000000000000","dailyLimit":"5000000000000000","ttl":86400,"allowlist":[]}}]'
```

Artifacts are written to:

- `agent/startup_swarm_<startup>.json`

Interactive UI:

- `/startup-agent-generator`

### Safety constraints

- Never commit private keys.
- Keys are written only to `~/.config/prism/keys` (or `PRISM_KEYS_DIR`).
- Every generated context includes explicit revoke instructions.

---

## Repo baseline

- Modular layout (`src/modules/*`, shared `src/lib/*`)
- RBAC-oriented Convex schema and server wrappers
- Vertical demo surfaces (`/dashboard`, chats, Agent Office)
- ADRs and PR template under `.github/` and `docs/`
