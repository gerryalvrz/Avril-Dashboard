# Avril Dashboard

Control plane for Avril multi-agent operations.

## MotusNS Deployment (Celo Mainnet)

| Name | Value |
|------|------|
| **Network** | Celo mainnet (`chainId: 42220`) |
| **MotusNSRegistry** | [0xb1582d5E49D695C40946656a679a05f5B69aF57c](https://celoscan.io/address/0xb1582d5E49D695C40946656a679a05f5B69aF57c) (legacy, non-NFT) |
| **MotusNSRegistryNFT** | [0x3a529655e45f2Cc194233b4Ec1BF3Fc0B3C8Fd10](https://celoscan.io/address/0x3a529655e45f2Cc194233b4Ec1BF3Fc0B3C8Fd10) |
| **Root label** | `motusns.eth` |
| **rootNode** | `0xa0066238618987b274e0fdbafdbcdc96244246c247226e150a3c6e564cc5b621` |

For frontend integration, set:

- `NEXT_PUBLIC_MOTUSNS_REGISTRY_ADDRESS=0x3a529655e45f2Cc194233b4Ec1BF3Fc0B3C8Fd10`

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

## ERC-8004 agent identity (Celo)

The app can register an onchain agent identity on Celo using the global [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) registry. Registration JSON and logo are hosted in this repo and served on Vercel.

**Setup:**

1. **Deploy to Vercel** (or use your deployed URL). Set in `.env.local`:
   - `NEXT_PUBLIC_APP_URL=https://app.avril.life` (no trailing slash)
   - `NEXT_PUBLIC_AGENT_REGISTRATION_URI=https://app.avril.life/agent-registration.json`
   - `NEXT_PUBLIC_CELO_RPC_URL=https://forno.celo.org` (optional; used when adding Celo in wallet)
   - **Identity registry contract (Celo mainnet)**: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`

2. **Register onchain:** Open **Wallets** in the app → use **“Register ERC-8004 identity on Celo”**. Sign the tx with your WaaP wallet (you’ll be switched to Celo if needed).

3. **Domain proof:** After the first registration, set in Vercel (or `.env.local`):
   - `NEXT_PUBLIC_ERC8004_AGENT_ID=<tokenId>` (from the registry / tx logs)
   - `NEXT_PUBLIC_ERC8004_AGENT_OWNER=<0xYourWallet>`

**Hosted in this repo:**

- **Logo:** `public/agent-logo.svg` (Avril Dashboard icon). Served at `/agent-logo.svg`.
- **Registration JSON:** `GET /agent-registration.json` (dynamic; uses `NEXT_PUBLIC_APP_URL`; default `https://app.avril.life`).
- **Agent card (A2A):** `GET /.well-known/agent-card.json`.
- **Domain proof:** `GET /.well-known/agent-registration.json` (uses `NEXT_PUBLIC_ERC8004_AGENT_ID` and `NEXT_PUBLIC_ERC8004_AGENT_OWNER`).

**Where to go when needed**

| Need | Link |
|------|------|
| Deploy / env vars | [Vercel Dashboard](https://vercel.com/dashboard) → your project → Settings → Environment Variables |
| Convex backend / env | [Convex Dashboard](https://dashboard.convex.dev) → your deployment → Settings → Environment Variables |
| Human Passport (scores) | [developer.passport.xyz](https://developer.passport.xyz/) (API Keys, Scorers) |
| WaaP (wallet) | [docs.wallet.human.tech](https://docs.wallet.human.tech/guides/start) – config in code (`initWaaP`), no dashboard |
| Celo tx / contract | [Celoscan](https://celoscan.io) – look up your tx or `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` (IdentityRegistry) |
| ERC-8004 spec / resources | [eips.ethereum.org/EIPS/eip-8004](https://eips.ethereum.org/EIPS/eip-8004), [8004.org](https://www.8004.org) |

**Celo On-chain Activity**

The dashboard has successfully registered an onchain agent identity on Celo.

| Name | Value |
|----------|--------|
| **Chain** | Celo mainnet |
| **Registry** | [8004: Identity Registry](https://celoscan.io/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) |
| **Agent identity (token ID)** | **1849** |
| **Registration tx** | [0xc7082bdae53cf295a97af538a5a9df3b86071fb3181b3df5ef0609091c0c19b9](https://celoscan.io/tx/0xc7082bdae53cf295a97af538a5a9df3b86071fb3181b3df5ef0609091c0c19b9) |
| **Agent URI** | `https://app.avril.life/agent-registration.json` |
| **Domain proof** | `https://app.avril.life/.well-known/agent-registration.json` (after setting `NEXT_PUBLIC_ERC8004_AGENT_ID=1849` and owner in env) |


## Included baseline
- Modular architecture scaffold
- Convex schema for orgs/users/roles/tasks/chats/agents/wallets/audit
- RBAC starter
- Human.tech adapter boundary
- Vertical slice demo route (`/dashboard`)
- Docs, ADR starter, PR checklist
