# Venice → OpenClaw handoff — progress checklist

Use this list when implementing the **single OpenClaw orchestration** path: Venice produces the ignition prompt; the dashboard hands it off to the production bridge; spawning / gateway events drive Agent Office.

Update checkboxes as you complete each item (`[ ]` → `[x]`).

---

## Already in place (baseline)

- [x] `/api/chat/respond` supports **Venice** and persists assistant reply to Convex
- [x] Parsed Avril JSON → **`upsertChatIgnitionDraft`** (`ignitionPrompt`, `status` collecting/ready)
- [x] **`extractDraftFromArchitectPayload`** sets `ready` when `handoff_ready` + ignition text
- [x] **`GET /api/chat/ignition-draft`** for Chats panel
- [x] **`POST /api/orchestration/spawn`** — creates session, WS stream, POSTs `{ message }` to bridge, marks draft spawned on success
- [x] Chats UI: **Load DB prompt** + **Spawn with saved prompt** + **Launch Agent Office** (manual prompt field)
- [x] Bridge contract + **`bridge/openclaw-bridge.mjs`** (`openclaw agent … --message`)
- [x] **`resolveOpenClawBridgeUrl` / dev override** (`OPENCLAW_BRIDGE_URL_DEV`)

---

## Handoff flow (recommended next)

- [x] Extract shared **`runOpenClawSpawn`** (`src/lib/runOpenClawSpawn.ts`) — session, events, WS, bridge fetch (incl. **network try/catch**), `markChatIgnitionSpawned`
- [x] Refactor **`app/api/orchestration/spawn/route.ts`** to call `runOpenClawSpawn` with `source: 'manual_prompt'`
- [x] Add **`POST /api/orchestration/handoff-openclaw`** — body `{ chatId }`; load draft; **400** if not `ready` / missing prompt; **409** if already `spawned` (+ `existingSessionId`); else `runOpenClawSpawn` with `source: 'venice_ignition_draft'`
- [x] Chats UI: primary CTA **“Send to OpenClaw (production)”** → handoff endpoint; handle **409** with “Open office” using stored session
- [x] Optional: **`/api/chat/respond`** returns **`ignitionReady: true`** when draft `nextStatus === 'ready'` for inline nudge
- [x] **Folder “Agent brief”** (`# Agent brief · …`): long user messages allowed; after **Send**, draft → **`ready`** + **`ignitionReady`** (home chat shows **Send to OpenClaw**)
- [x] **`orchestrationSwarmGuardrails`**: exactly **3** swarm orchestrations, ≤**12** agents MVP; prepended on every bridge spawn via **`runOpenClawSpawn`**

---

## Production / ops

- [ ] Vercel (or host): **`OPENCLAW_BRIDGE_URL`**, **`OPENCLAW_BRIDGE_TOKEN`**, allow-list matches **`OPENCLAW_ALLOWED_BRIDGE_URL`** if customized
- [ ] VPS / bridge host: bridge + `openclaw` CLI running; tunnel/reverse proxy if needed (see `docs/OPENCLAW_BRIDGE.md`, `docs/VPS_OPENCLAW_CHECKS.md`)
- [ ] **`OPENCLAW_GATEWAY_URL`** + **`OPENCLAW_GATEWAY_TOKEN`** set where orchestration WS is required for Agent Office live updates

---

## Later (ENS + ERC-8004 mapping)

- [ ] Skills / tools: map spawned agents & subagents to **ENS-style names** (e.g. MotusNS hierarchy — `contracts/README.md`)
- [ ] Skills / tools: **ERC-8004** registration / metadata per agent or policy (`src/lib/celo8004.ts`, `.well-known` routes)
- [ ] Office UI: persist **`ensName`** / chain refs from orchestration events (beyond demo defaults in `OfficeWorld2D`)

---

## Agent seeding (spawn → Office)

- [x] **`buildDefaultSwarmAgents()`** in guardrails — 3 orchestrators + 6 workers (9 agents), matching 3-swarm topology
- [x] **`runOpenClawSpawn`** seeds Convex via `upsertOrchestrationAgents` immediately after bridge success — Office shows real topology instead of mock fallback
- [x] **`OfficeWorld2D`** role-to-gradient map extended for new swarm roles

---

## Verification (manual)

- [ ] Venice-only chat through **handoff_ready** → draft **ready** + non-empty **ignition prompt** in Convex
- [ ] Handoff (or spawn with saved prompt) → **200**, **`sessionId`**, redirect to **`/agents/office?sessionId=…`**
- [ ] Second handoff on same chat → **409** or clear “already spawned” UX
- [ ] **`/api/orchestration/health`** — bridge + gateway reachability when configured

---

_Last updated: checklist created for tracking Venice → OpenClaw handoff implementation._
