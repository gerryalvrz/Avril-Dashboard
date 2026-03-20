# MotusNS on Celo Mainnet

This contract provides ENS-style hierarchical names for agents and subagents:

- Root namespace (example: `motusns.eth` namehash as `rootNode`)
- Agent nodes under root
- Subagent nodes under agent nodes
- Revocation and role-based registration
- EOA + smart-wallet permit signatures (ERC-1271 compatible)

## Live deployment

- Network: `Celo Mainnet` (`chainId: 42220`)
- `MotusNSRegistry`: `0xb1582d5E49D695C40946656a679a05f5B69aF57c`
- `rootNode` (`namehash("motusns.eth")`): `0xa0066238618987b274e0fdbafdbcdc96244246c247226e150a3c6e564cc5b621`

## Contract

- `MotusNSRegistry.sol`

## Permission bits

- `PERMIT_EXECUTE`
- `PERMIT_UPDATE_METADATA`
- `PERMIT_SPAWN_SUBAGENT`
- `PERMIT_GRANT`
- `PERMIT_REVOKE`

## Celo deployment notes

Use Celo mainnet chain id `42220`.

This repo includes Foundry scripts:

1. Set environment variables:

```bash
export CELO_DEPLOYER_PRIVATE_KEY=<hex_without_0x>
export MOTUSNS_ADMIN=<admin_wallet>
# optional: signer override for admin-only scripts
export MOTUSNS_ADMIN_PRIVATE_KEY=<admin_key_hex_without_0x>
```

2. Compile:

```bash
forge build
```

3. Deploy `MotusNSRegistry` on Celo mainnet:

```bash
forge script script/DeployMotusNS.s.sol:DeployMotusNSScript \
  --rpc-url https://forno.celo.org \
  --broadcast
```

This script computes `namehash("motusns.eth")` internally and uses:

- `rootNode = namehash("motusns.eth")`
- `rootLabel = "motusns.eth"`
- `admin = MOTUSNS_ADMIN`

4. Grant registrar role to your agent factory/spawner wallet:

```bash
export MOTUSNS_REGISTRY=<deployed_registry_address>
export MOTUSNS_REGISTRAR=<agent_factory_wallet>

forge script script/BootstrapMotusNS.s.sol:BootstrapMotusNSScript \
  --rpc-url https://forno.celo.org \
  --broadcast
```

`BootstrapMotusNSScript` uses:
- `MOTUSNS_ADMIN_PRIVATE_KEY` if present
- otherwise falls back to `CELO_DEPLOYER_PRIVATE_KEY`

5. Grant per-agent permit mask (direct on-chain grant):

```bash
export MOTUSNS_NODE=<agent_or_subagent_node_bytes32>
export MOTUSNS_ACTOR=<wallet_or_smart_wallet>
export MOTUSNS_PERMISSION_MASK=<uint256_bitmask>
export MOTUSNS_PERMISSION_EXPIRY=<unix_ts_or_0_for_no_expiry>

forge script script/GrantAgentPermit.s.sol:GrantAgentPermitScript \
  --rpc-url https://forno.celo.org \
  --broadcast
```

`GrantAgentPermitScript` uses:
- `MOTUSNS_ADMIN_PRIVATE_KEY` if present
- otherwise falls back to `CELO_DEPLOYER_PRIVATE_KEY`

## Domain ownership and `.eth`

To control real ENS names under `.eth` (like `*.motusns.eth`), you must own `motusns.eth` in ENS on Ethereum and control its name records. Deploying on Celo alone does not grant ownership of `.eth` names.

If you do not want to buy `motusns.eth`, you can still run this contract as a standalone naming system on Celo with your own root namespace conventions.
