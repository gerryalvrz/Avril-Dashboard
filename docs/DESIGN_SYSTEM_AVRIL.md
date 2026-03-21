# Avril Dashboard Design System

This design system is adapted from `agentslanding` and mapped into the dashboard so both products share the same visual language.

## Foundation

- **Semantic tokens** in `app/globals.css`:
  - `--brand`, `--brand-dim`
  - `--surface`, `--surface-raised`, `--surface-overlay`
  - shared radius token: `--radius`
- **Theme compatibility**:
  - light and dark modes use the same semantic tokens
  - matrix mode keeps existing overrides and now also styles design-system cards

## Reusable primitives

Location: `src/components/ui`

- `Button` (`primary`, `secondary`, `ghost`)
- `Card` (`muted` variant)
- `Badge` (`brand`, `neutral`)
- `SectionTitle` (`kicker`, `title`, `subtitle`)

## Utility classes

Added in `app/globals.css`:

- `ds-card`
- `ds-card-muted`
- `ds-heading`
- `ds-kicker`
- `ds-badge`
- `ds-badge-brand`

## Propagation in dashboard

Current pages already migrated:

- `app/home/page.tsx`
- `app/tasks/page.tsx`

These components are safe to roll out incrementally in `chats`, `agents`, `wallets`, and `profile`.
