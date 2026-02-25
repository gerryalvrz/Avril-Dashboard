# AgentDashboard

Control plane for Motus multi-agent operations.

## Stack
- Next.js + TypeScript
- Convex (database/runtime)
- Human.tech auth boundary
- Wallet/account abstraction permissions model

## Run
```bash
npm install
npm run dev
```

## Environment (server-side Convex access)

Chat API routes call Convex from the Next.js server using a shared secret so Convex is never exposed to the client.

- **`CONVEX_SERVER_SECRET`** (required for chat): Set the same value in your **Convex deployment** and in `.env.local`:
  1. Generate a secret once: `openssl rand -base64 32`
  2. Convex: Dashboard → your deployment → Settings → Environment Variables, or `npx convex env set CONVEX_SERVER_SECRET "<your-secret>"`
  3. Next.js: add `CONVEX_SERVER_SECRET=<same-secret>` to `.env.local`
- Default organization is created automatically the first time a chat is created (no manual bootstrap step).

## Human Passport verification (optional)

`verifyHumanTechSession()` in `src/lib/humantech.ts` can verify a wallet address via [Human Passport](https://passport.human.tech/) (Stamps API v2). To enable it:

- **`PASSPORT_API_KEY`** – API key from [developer.passport.xyz](https://developer.passport.xyz/) (API Keys section).
- **`PASSPORT_SCORER_ID`** – Scorer ID from the same portal (Scorers section).
- **`PASSPORT_SCORE_THRESHOLD`** (optional) – Minimum score to consider verified; default `20`.

Pass the wallet address (e.g. from your session) to `verifyHumanTechSession(address)`; it returns a `HumanTechIdentity` if the address has a passing score, or `null` otherwise. If these env vars are not set, the function returns `null` (no verification).

## Included baseline
- Modular architecture scaffold
- Convex schema for orgs/users/roles/tasks/chats/agents/wallets/audit
- RBAC starter
- Human.tech adapter boundary
- Vertical slice demo route (`/dashboard`)
- Docs, ADR starter, PR checklist
