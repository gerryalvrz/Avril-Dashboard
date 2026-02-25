# Bridge / OpenClaw contract

Agreement between AgentDashboard (`/api/chat/respond`) and the OpenClaw bridge (`bridge/openclaw-bridge.mjs`) for per-agent, scoped requests and reduced token use.

## Request (Dashboard → Bridge)

`POST` with `Content-Type: application/json` and `Authorization: Bearer <OPENCLAW_BRIDGE_TOKEN>`.

| Field       | Type     | Required | Description |
|------------|----------|----------|-------------|
| `message`  | string   | yes      | Current user message. |
| `chatId`   | string   | yes      | Chat id (for logging / idempotency). |
| `model`    | string   | no       | `codex` \| `opus` (default `codex`). |
| `source`   | string   | no       | e.g. `agentdashboard`. |
| `agentId`  | string   | no       | Id of the agent backing this chat. Used for scoped prompts. |
| `area`     | string   | no       | Agent area (e.g. `Research`, `Ops`, `General`). |
| `subArea`  | string   | no       | Agent sub-area (e.g. `Grants`, `Deploy`). |
| `summary`  | string   | no       | **Optional:** Summary of earlier conversation (from periodic summarization job). When present, bridge sends summary + recent messages to reduce tokens. |
| `messages` | array    | no       | **Bounded context**: last N messages for this chat only. Each item: `{ authorType, authorId, content, createdAt }`. Dashboard caps count and total size to limit tokens. |
| `maxContextChars` | number | no | Optional cap (chars) for context the bridge should send; bridge may truncate to this. |

The bridge uses `agentId`, `area`, and `subArea` for scoped prompt stuffing and prepends a short `[Agent context: ...]` line. It builds the prompt from `messages` (and `message`) and may truncate context to `maxContextChars` when set.

## Response (Bridge → Dashboard)

- **Success:** `200` with JSON `{ ok: true, reply: string }`. `reply` is the agent’s text.
- **Error:** `4xx` / `5xx` with JSON `{ ok?: false, error?: string }`.

Dashboard also accepts `reply` under keys `text` or `message` for compatibility.

## Bounded context (token reduction)

- **Dashboard** sends at most **N** messages (e.g. 20) and may set a **max context character limit** per request. It may truncate long `content` in each `messages[]` item before sending.
- **Bridge** accepts `maxContextChars` and, when building the prompt, keeps only as much context as fits (by truncating or dropping oldest messages) so the payload to OpenClaw stays under the limit.
- Only the **current chat’s** messages are sent; other chats are never included.
- When the dashboard has a stored **summary** for the chat (from the optional summarization job), it sends `summary` + fewer recent messages (e.g. last 10) so the bridge can send summary + recent messages instead of full history.

## Environment (bridge)

- `OPENCLAW_BRIDGE_MAX_CONTEXT_CHARS` — optional default max characters for context (before current message). Used when request does not set `maxContextChars`.

## Optional: summarization (Convex)

To enable periodic summarization of long threads, set in the **Convex deployment** environment (Dashboard → Settings → Environment Variables):

- `CONVEX_SERVER_SECRET` — same value used by the Next.js API (required for the summarization action to call serverChats).
- `OPENAI_API_KEY` — OpenAI API key for `gpt-4o-mini` (optional; if unset, the cron action no-ops).

The cron runs every 6 hours (`convex/crons.ts`) and invokes `summarize.summarizeNextChat`, which picks one chat with ≥15 messages and no or stale summary, summarizes via OpenAI, and stores `chats.summary` and `chats.summaryUpdatedAt`.
