import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { areaValidator, subAreaValidator } from './lib/agentAreas';

export default defineSchema({
  users: defineTable({ email: v.string(), walletAddress: v.optional(v.string()), createdAt: v.string() }).index('by_email', ['email']),
  organizations: defineTable({ name: v.string(), slug: v.string(), createdAt: v.string() }).index('by_slug', ['slug']),
  memberships: defineTable({ userId: v.id('users'), organizationId: v.id('organizations'), role: v.union(v.literal('owner'), v.literal('admin'), v.literal('operator'), v.literal('viewer')) }).index('by_org_user', ['organizationId', 'userId']),
  agents: defineTable({
    organizationId: v.id('organizations'),
    name: v.string(),
    status: v.union(v.literal('active'), v.literal('paused')),
    createdAt: v.string(),
    chatId: v.optional(v.id('chats')),
    area: v.optional(areaValidator),
    subArea: subAreaValidator,
  }).index('by_org', ['organizationId']).index('by_chat', ['chatId']).index('by_org_area', ['organizationId', 'area']),
  agentRuns: defineTable({ organizationId: v.id('organizations'), agentId: v.id('agents'), taskId: v.optional(v.id('tasks')), status: v.union(v.literal('queued'), v.literal('running'), v.literal('success'), v.literal('failed')), createdAt: v.string() }).index('by_agent', ['agentId']),
  tasks: defineTable({ organizationId: v.id('organizations'), title: v.string(), status: v.union(v.literal('todo'), v.literal('in_progress'), v.literal('done')), priority: v.union(v.literal('low'), v.literal('medium'), v.literal('high')), assigneeAgentId: v.optional(v.id('agents')), createdAt: v.string() }).index('by_org_status', ['organizationId', 'status']),
  taskEvents: defineTable({ taskId: v.id('tasks'), type: v.string(), payload: v.optional(v.any()), createdAt: v.string() }).index('by_task', ['taskId']),
  chats: defineTable({
    organizationId: v.optional(v.id('organizations')),
    title: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
    agentId: v.optional(v.id('agents')),
    summary: v.optional(v.string()),
    summaryUpdatedAt: v.optional(v.string()),
  }).index('by_org', ['organizationId']).index('by_updatedAt', ['updatedAt']).index('by_agent', ['agentId']),
  messages: defineTable({ chatId: v.id('chats'), authorType: v.union(v.literal('human'), v.literal('agent')), authorId: v.string(), content: v.string(), createdAt: v.string() }).index('by_chat', ['chatId']),
  wallets: defineTable({ organizationId: v.id('organizations'), ownerUserId: v.id('users'), provider: v.string(), address: v.string(), createdAt: v.string() }).index('by_org', ['organizationId']),
  walletPermissions: defineTable({ walletId: v.id('wallets'), memberUserId: v.id('users'), permission: v.union(v.literal('view'), v.literal('propose'), v.literal('execute'), v.literal('approve')), createdAt: v.string() }).index('by_wallet_user', ['walletId', 'memberUserId']),
  approvals: defineTable({ organizationId: v.id('organizations'), resourceType: v.string(), resourceId: v.string(), requestedBy: v.id('users'), status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')), createdAt: v.string() }).index('by_org_status', ['organizationId', 'status']),
  auditLogs: defineTable({ organizationId: v.id('organizations'), actorUserId: v.optional(v.id('users')), action: v.string(), resourceType: v.string(), resourceId: v.optional(v.string()), metadata: v.optional(v.any()), createdAt: v.string() }).index('by_org_time', ['organizationId', 'createdAt'])
});
