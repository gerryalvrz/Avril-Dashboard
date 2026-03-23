# ENS Subdomain Automation

This module prepares and optionally executes ENS subdomain assignment for startup agent roles under `prism-protocol.eth`.

## Naming strategy

Primary:

- `<role>.<startup>.prism-protocol.eth`

Fallback when primary assignment fails:

- `<role>.prism-protocol.eth`

## Payload shape

For each role, the generator stores:

- `parentNode` = `namehash("prism-protocol.eth")`
- `labelHash` for `<role>.<startup>` label
- `owner` = context wallet address
- `resolver` (defaults to zero address)
- `ttl` (defaults to 300)

## Execution hook

If `ENS_REGISTRY_ADDRESS` is set, the generator attempts:

1. `setSubnodeRecord(parentNode, primaryLabelHash, contextWallet, resolver, ttl)`
2. On failure, `setSubnodeRecord(parentNode, fallbackLabelHash, contextWallet, resolver, ttl)`

If unset, the system runs in deterministic simulation mode and records payloads without tx submission.

## Operator guidance

- Ensure root wallet has permission over `prism-protocol.eth` node.
- Ensure sufficient CELO for gas.
- Rotate and revoke delegates if a role key is compromised.
- Keep ENS resolver strategy explicit (zero resolver means no records configured yet).
