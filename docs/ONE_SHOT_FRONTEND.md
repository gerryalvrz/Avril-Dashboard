# One-Shot Prompt — AgentDashboard Frontend UI (Phase 1)

You are a senior frontend engineer building the UI shell for **AgentDashboard**, a multi-agent control plane.

## Existing Stack
- Next.js 14 (App Router) + TypeScript
- Convex (backend/DB)
- Tailwind CSS
- Human.tech auth boundary (mocked)

## Requirements

### Layout Shell
- **Sidebar** (fixed left, 224px): logo, nav links, active state indicator, user status footer
- **Topbar** (fixed top, 56px): dynamic page title, org name, user avatar
- **Content area**: responsive, scrollable, padded

### Pages (all with mock data)

1. **`/home`** — Overview dashboard
   - Stat cards grid (agents, tasks, messages, wallets)
   - Recent activity feed

2. **`/agents`** — Agent registry
   - Table: name, status badge, capability, run count, last run
   - "Register Agent" button

3. **`/tasks`** — Task manager
   - Table: ID, title, status badge, priority, assigned agent
   - "New Task" button

4. **`/chats`** — Chat system
   - Left panel: thread list with unread badges
   - Right panel: message thread with human/agent bubbles
   - Input bar with send button

5. **`/wallets`** — Wallet management
   - Wallet cards grid (address, label, balance, provider, permissions)
   - Recent wallet activity list
   - "Create Wallet" button

### Design System
- Dark theme (surface #0b1020, panel #111827, border #1e293b)
- Accent: indigo (#6366f1)
- Clean, minimal, professional — no flashy gradients
- Status badges: green=active, yellow=paused, blue=in_progress, red=high priority
- Consistent spacing, rounded corners (xl), subtle hover states

### Constraints
- All data is mock/hardcoded for now (Convex integration comes in Phase 2)
- No external component libraries — just Tailwind utility classes
- Components in `src/components/`
- Pages use Next.js App Router conventions
- Responsive but desktop-first
