# Full demo checklist — Avril chat → DB → ignite / spawn

End-to-end story for the hackathon: **Avril interviews the founder**, **persists structured state + ignition prompt in Convex**, **spawns orchestration** with that prompt, **Agent Office** reflects the session.

## 1. Persona & chat behavior

- [x] Shared Avril architect persona (JSON + `buildAvrilUnifiedSystemPrompt`)
- [x] Venice + OpenClaw receive the same system prompt (`/api/chat/respond` + bridge `systemPrompt`)
- [x] Structured `architectPayload` with `captured`, `missing`, `phase`, `handoffPayload`
- [x] Hide JSON / fence variants in UI (`parseAvrilAssistantReply`)
- [x] Interview discipline: ordered `questionOrder`, no vague-only replies, language mirroring
- [ ] **Manual QA:** complete one thread through `handoff_ready` with a real `ignitionPrompt` in JSON

## 2. Persist draft in Convex (chat-scoped)

- [x] Schema: `chatIgnitionDrafts` (org + chat, `captured`, `phase`, `ignitionPrompt`, `handoffPayload`, `status`, `spawnSessionId`)
- [x] Server mutations/queries: `upsertChatIgnitionDraftServer`, `getChatIgnitionDraftServer`, `markChatIgnitionSpawnedServer`
- [x] `convexServer.ts` wrappers for Next.js API routes
- [x] `/api/chat/respond`: after each assistant reply with `architectPayload`, upsert draft (skip if status `spawned`)
- [x] Derive `ignitionPrompt` from `handoffPayload.ignitionPrompt` or fallback synthesis from `captured` when `phase === 'handoff_ready'` (`extractDraftFromArchitectPayload`)

## 3. Dashboard API & UI

- [x] `GET /api/chat/ignition-draft?chatId=` (auth via existing dashboard token)
- [x] Chats page: **Ignition draft** panel — phase, status, `ignitionPrompt` preview, refresh
- [x] **Founder wizard stepper** — phase (1–6) + field progress (n/13) + “Next to capture” on Chats + Home hero chat
- [x] **Fill Home · Advanced form** — `/?applyChatDraft=<chatId>` merges Convex `captured` into founder intake fields and opens Advanced
- [x] **“Load into spawn”** — copies DB `ignitionPrompt` into launch field
- [x] **“Spawn with saved prompt”** — spawns using DB prompt (or launch field fallback)

## 4. Spawn ↔ draft linkage

- [x] On successful spawn: mark draft `spawned`, store `spawnSessionId`
- [x] Deep link to Agent Office unchanged (`/agents/office?sessionId=…`)

## 5. Founder wizard integration (full path, not fast)

- [ ] Optional `founderIdeaId` on `chatIgnitionDrafts` (or link table) when user starts from Home founder flow
- [ ] Action: “Promote chat draft → founder idea” or sync `captured` into `founderIdeas` fields
- [ ] Run existing `generateIgnitionPrompt` / blueprint pipeline **or** treat chat `ignitionPrompt` as source of truth for deploy (document choice)

## 6. Runtime & ops

- [ ] Bridge on VPS matches repo (incl. `systemPrompt` forwarding)
- [ ] Env: `OPENCLAW_*`, `CONVEX_SERVER_SECRET`, Venice keys documented for demo machine
- [ ] `npm run diagnose:openclaw` green for bridge + gateway before recording demo

## 7. Demo script (record / judge)

- [ ] 2–3 minute script: open Chats → model intake → show draft **Ready** in DB → Spawn → Office
- [ ] Show Convex dashboard or API response proving row in `chatIgnitionDrafts`

---

### Progress log

| Date       | Note |
|------------|------|
| 2026-03-21 | Implemented `chatIgnitionDrafts`, API persist + GET draft, Chats panel, spawn marks draft `spawned`. Run `npx convex dev` / deploy to push schema. |
