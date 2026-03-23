# Startup Agent Generator

The Startup Agent Generator provisions startup-specific AI agent identities using a human-root model on Celo + Prism-compatible flows.

## What it generates

- Role-based delegate EOAs (one per agent role)
- Prism context wallet creation transaction (or deterministic simulation when Prism contracts are not configured)
- Funding transaction from root wallet to delegate
- ENS subdomain assignment payload + optional execution hooks
- Optional ERC-8004 registration call
- Audit artifact in `agent/startup_swarm_<startup>.json`
- Revoke instruction for each delegate/context pairing

## Security model

- Root wallet is always the control authority.
- No private keys are written into the repository.
- Delegate private keys are persisted only in host secure storage:
  - default: `~/.config/prism/keys`
  - override: `PRISM_KEYS_DIR`
- Root key source:
  - `PRISM_ROOT_PRIVATE_KEY` (env), or
  - `PRISM_ROOT_KEY_PATH` (defaults to `~/.config/prism/keys/root-wallet.json`)

## CLI usage

```bash
./scripts/startup-agent-generator.sh "acme-robotics" '[{"role":"ceo-agent","policy":{"spendingLimit":"10000000000000000","dailyLimit":"30000000000000000","ttl":172800,"allowlist":[]}},{"role":"sales-agent","policy":{"spendingLimit":"5000000000000000","dailyLimit":"15000000000000000","ttl":86400,"allowlist":[]}},{"role":"support-agent","policy":{"spendingLimit":"1000000000000000","dailyLimit":"5000000000000000","ttl":86400,"allowlist":[]}}]'
```

## Environment

- `NEXT_PUBLIC_CELO_RPC_URL` or `CELO_RPC_URL`
- `PRISM_ROOT_PRIVATE_KEY` or `PRISM_ROOT_KEY_PATH`
- Optional onchain hooks:
  - `PRISM_FACTORY_ADDRESS`
  - `PRISM_CONTEXT_ADDRESS`
  - `ENS_REGISTRY_ADDRESS`
  - `STARTUP_AGENT_REGISTER_8004=1`
  - `ERC8004_REGISTRY_ADDRESS`
  - `STARTUP_AGENT_8004_URI_BASE`

## Error handling

The generator classifies runtime failures by type:

- `insufficient_funds`
- `nonce_error`
- `gas_error`
- `revert`
- `unknown`

Each receipt entry stores `ok`, `errorType`, and `errorMessage` so operators can replay failed actions safely.

## Revoke flow

Every generated role includes:

`Use PrismContext.revokeDelegate(<delegate>) from root <root-address>.`

This instruction is written to the artifact and should be executed during incident response or role rotation.

## UI flow

Use `/startup-agent-generator` for interactive generation:

1. Enter startup name.
2. Add role templates (or custom roles).
3. Set policy values (`spendingLimit`, `dailyLimit`, `ttl`, `allowlist`).
4. Submit generation.
5. Review role matrix and artifact path.

## Acceptance checklist

- [ ] At least 3 roles generated in one run
- [ ] Role matrix includes Role / Delegate / Context / ENS / 8004 / tx hashes
- [ ] At least one execute and one revoke receipt in artifact
- [ ] Keys stored outside repo in secure path
- [ ] README + submission docs updated
