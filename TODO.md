# AgentDashboard — TODO

## High priority

- [x] **Wire Convex auth to dashboard** *(done)*  
  Implemented server-only Convex functions (`convex/bootstrap.ts`, `convex/serverChats.ts`) that accept a shared `CONVEX_SERVER_SECRET`. The Next.js API calls these via `src/lib/convexServer.ts`; authz stays in the API layer (dashboard session). No Convex user identity required for chat flows.

- [ ] **Bootstrap user and organization**  
  Default organization is created automatically on first chat API use (`bootstrap:createDefaultOrganizationIfMissing`). For full RBAC (users/memberships), add seeding or onboarding that links the authenticated wallet to a `users` row and `memberships` row when you need multi-user Convex auth later.

## Medium priority

- [x] **Implement Human.tech verification** *(done)*  
  Replaced the stub with Human Passport (Stamps API v2): `verifyHumanTechSession(tokenOrAddress)` accepts an Ethereum address, calls `api.passport.xyz`, and returns a `HumanTechIdentity` only if the address has a passing score. Requires `PASSPORT_API_KEY` and `PASSPORT_SCORER_ID` in env; optional `PASSPORT_SCORE_THRESHOLD` (default 20). If not configured, returns `null`.

- [ ] **Convex modules for core entities**  
  Add Convex mutations/queries (and authz) for:
  - organizations / memberships (and user provisioning)
  - agents (CRUD, status)
  - tasks / taskEvents
  - wallets / walletPermissions
  - auditLogs

- [ ] **Wire Agents page**  
  Replace static table with Convex (or other) data; implement “+ Register Agent” and link to agents module.

- [ ] **Wire Tasks page**  
  Replace static table with Convex data; implement “+ New Task” and link to tasks module.

- [ ] **Wire Wallets page**  
  Replace static cards/activity with Convex data; implement “+ Create Wallet” and link to wallets module.

- [ ] **Wire Home page**  
  Drive “Overview” stats and “Recent Activity” from real data (agents, tasks, chats, wallets).

## Low priority / polish

- [ ] **Convex on the frontend**  
  If you want reactive Convex in the browser, pass Convex auth from the dashboard session and use `useQuery` / `useMutation` where needed.

- [ ] **i18n**  
  Chats page uses Spanish for some messages; rest of app is English. Unify language or add proper i18n.

- [ ] **Document or remove `DASHBOARD_APP_TOKEN`**  
  Optional fallback in `apiSecurity.ts`; clarify or remove if you rely only on owner session cookie.

---

## Roadmap — Virtual office & sub-agents

*For a separate agent/session. Goal: dashboard as a “virtual office” with multiple sub-agents (workers) per area, token-efficient context, and later knowledge-graph coordination. Current TODO above stays for future user-facing work.*

### Phase 1: Chat = sub-agent

- [x] **Link chat to agent** *(done)*  
  When creating a chat, create a corresponding row in `agents` (or ensure one exists). Add `agentId` (or `chatId`) to the schema so each chat is backed by one sub-agent.

- [x] **Add area and sub-area to agents** *(done)*  
  Extend Convex `agents` table (or add `areas` table): e.g. `area: string`, `subArea?: string`. Define a small set of areas/sub-areas (e.g. Research → Grants, Competitors; Ops → Deploy, Alerts).

- [x] **Create chat = create agent** *(done)*  
  Update chat-creation flow (Convex + API + UI): “New chat” creates both a chat and an agent with chosen (or default) area/sub-area; associate them.

- [x] **Show agent + area in chat UI** *(done)*  
  In the Chats page, display which agent (and area/sub-area) backs each thread.

### Phase 2: Token-efficient context

- [x] **Per-agent context when calling bridge** *(done)*  
  When sending to OpenClaw, send only this agent’s conversation (or last N messages + summary), not all chats. Include `agentId`, `area`, `subArea` in the request so the bridge can scope prompts.

- [x] **Bridge/OpenClaw contract** *(done)*  
  Align with OpenClaw (or your bridge): accept agent id, area, sub-area, and bounded context; use them for scoped prompt stuffing to reduce token use per request.

- [x] **Optional: summarize long threads** *(done)*  
  Backend or Convex job: periodically summarize old messages per chat/agent and store summary; send summary + recent messages to the bridge instead of full history.

### Phase 3: Agent manager UX

- [x] **Worker-centric view** *(done)*  



- [ ] **Filter by area/sub-area**  
  Filter and group agents (and chats) by area and sub-area.

- [ ] **“New worker” flow**  
  Single flow: choose area/sub-area → create agent + linked chat; optionally set first “mission” or task description.

- [ ] **Task–agent association**  
  Link tasks to agents (schema already has `assigneeAgentId`). Show “current task” on agent card and agent on task view.

### Phase 4: Knowledge graph (shared context)

- [ ] **KG data model**  
  Add Convex tables (or external store) for nodes and edges (e.g. entities, relations, optional source/agent). Support “subgraph for area” or tagging by area.

- [ ] **KG API**  
  Read/write graph; endpoint or Convex functions to “get context for area X” for use in agent prompts.

- [ ] **Bridge integration**  
  When building context for an agent, pull relevant KG context for its area and pass to OpenClaw alongside (or instead of) raw history where useful.

- [ ] **Dashboard KG view**  
  Simple view over the graph (by area, by agent, or by time) so you can see what the office “knows.”

### Phase 5: Autonomy and visibility

- [ ] **Activity feed**  
  Log “agent X did Y” (e.g. task updated, message sent, KG update). Display in dashboard so you “see them work.”

- [ ] **Autonomous task handling**  
  Allow agents to be assigned tasks (or pick from queue); update task status from bridge or backend; reflect in UI.

- [ ] **Polish “virtual office” UX**  
  Home/Overview as control room: workers, active tasks, recent activity, links into chats and KG.

---

## Reference: what already works

- App shell, navigation, Tailwind theme, responsive layout
- Owner auth: wallet sign-in, session cookie, WaaP, API token check
- Chat UI and API: create/list/send, OpenClaw bridge, rate limits
- Convex schema and authz helpers
- **Convex ↔ dashboard wired**: server-only Convex functions (`serverChats`, `bootstrap`) used by the API with `CONVEX_SERVER_SECRET`; default org is created on first use
