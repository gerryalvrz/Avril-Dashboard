import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireEntity } from './lib/authz';

const SERVER_SECRET_ENV = 'CONVEX_SERVER_SECRET';

function requireServerSecret(serverSecret: string | undefined) {
  const expected = process.env[SERVER_SECRET_ENV];
  if (!expected || serverSecret !== expected) {
    throw new Error('Unauthorized: invalid or missing server secret.');
  }
}

const orchestrationStatusValidator = v.union(
  v.literal('queued'),
  v.literal('spawning'),
  v.literal('active'),
  v.literal('failed'),
  v.literal('completed')
);

const orchestrationAgentStatusValidator = v.union(
  v.literal('spawning'),
  v.literal('idle'),
  v.literal('working'),
  v.literal('blocked'),
  v.literal('completed'),
  v.literal('error')
);

const orchestrationAgentInputValidator = v.object({
  agentKey: v.string(),
  parentAgentKey: v.optional(v.string()),
  name: v.string(),
  role: v.optional(v.string()),
  status: orchestrationAgentStatusValidator,
  x: v.optional(v.number()),
  y: v.optional(v.number()),
  meta: v.optional(v.any()),
});

export const createSessionServer = mutation({
  args: {
    organizationId: v.id('organizations'),
    chatId: v.id('chats'),
    serverSecret: v.string(),
    status: v.optional(orchestrationStatusValidator),
    spawnRequestId: v.optional(v.string()),
    vpsRef: v.optional(v.string()),
    containerRef: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    requireEntity(await ctx.db.get(args.chatId), 'Chat');
    requireEntity(await ctx.db.get(args.organizationId), 'Organization');

    const now = new Date().toISOString();
    return await ctx.db.insert('orchestrationSessions', {
      organizationId: args.organizationId,
      chatId: args.chatId,
      status: args.status ?? 'queued',
      spawnRequestId: args.spawnRequestId,
      vpsRef: args.vpsRef,
      containerRef: args.containerRef,
      error: args.error,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setSessionStatusServer = mutation({
  args: {
    sessionId: v.id('orchestrationSessions'),
    status: orchestrationStatusValidator,
    serverSecret: v.string(),
    spawnRequestId: v.optional(v.string()),
    vpsRef: v.optional(v.string()),
    containerRef: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    requireEntity(await ctx.db.get(args.sessionId), 'Orchestration session');

    await ctx.db.patch(args.sessionId, {
      status: args.status,
      spawnRequestId: args.spawnRequestId,
      vpsRef: args.vpsRef,
      containerRef: args.containerRef,
      error: args.error,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const appendSessionEventServer = mutation({
  args: {
    sessionId: v.id('orchestrationSessions'),
    type: v.string(),
    payload: v.optional(v.any()),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    requireEntity(await ctx.db.get(args.sessionId), 'Orchestration session');
    return await ctx.db.insert('orchestrationEvents', {
      sessionId: args.sessionId,
      type: args.type,
      payload: args.payload,
      createdAt: new Date().toISOString(),
    });
  },
});

export const upsertAgentsSnapshotServer = mutation({
  args: {
    sessionId: v.id('orchestrationSessions'),
    agents: v.array(orchestrationAgentInputValidator),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    requireEntity(await ctx.db.get(args.sessionId), 'Orchestration session');

    const now = new Date().toISOString();
    const existing = await ctx.db
      .query('orchestrationAgents')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .collect();
    const existingByKey = new Map(existing.map((a) => [a.agentKey, a]));

    for (const agent of args.agents) {
      const match = existingByKey.get(agent.agentKey);
      if (match) {
        await ctx.db.patch(match._id, {
          parentAgentKey: agent.parentAgentKey,
          name: agent.name,
          role: agent.role,
          status: agent.status,
          x: agent.x,
          y: agent.y,
          meta: agent.meta,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert('orchestrationAgents', {
          sessionId: args.sessionId,
          agentKey: agent.agentKey,
          parentAgentKey: agent.parentAgentKey,
          name: agent.name,
          role: agent.role,
          status: agent.status,
          x: agent.x,
          y: agent.y,
          meta: agent.meta,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  },
});

export const updateAgentStatusServer = mutation({
  args: {
    sessionId: v.id('orchestrationSessions'),
    agentKey: v.string(),
    status: orchestrationAgentStatusValidator,
    serverSecret: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    parentAgentKey: v.optional(v.string()),
    meta: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    requireEntity(await ctx.db.get(args.sessionId), 'Orchestration session');
    const now = new Date().toISOString();

    const existing = await ctx.db
      .query('orchestrationAgents')
      .withIndex('by_session_agentKey', (q) => q.eq('sessionId', args.sessionId).eq('agentKey', args.agentKey))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.role !== undefined ? { role: args.role } : {}),
        ...(args.parentAgentKey !== undefined ? { parentAgentKey: args.parentAgentKey } : {}),
        ...(args.meta !== undefined ? { meta: args.meta } : {}),
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('orchestrationAgents', {
      sessionId: args.sessionId,
      agentKey: args.agentKey,
      parentAgentKey: args.parentAgentKey,
      name: args.name ?? args.agentKey,
      role: args.role,
      status: args.status,
      meta: args.meta,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getSessionServer = query({
  args: {
    sessionId: v.id('orchestrationSessions'),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    return requireEntity(await ctx.db.get(args.sessionId), 'Orchestration session');
  },
});

export const getSessionByChatServer = query({
  args: {
    chatId: v.id('chats'),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    const sessions = await ctx.db
      .query('orchestrationSessions')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();
    return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
  },
});

export const listSessionAgentsServer = query({
  args: {
    sessionId: v.id('orchestrationSessions'),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    requireEntity(await ctx.db.get(args.sessionId), 'Orchestration session');
    const agents = await ctx.db
      .query('orchestrationAgents')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .collect();
    return agents.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
});

export const listSessionEventsServer = query({
  args: {
    sessionId: v.id('orchestrationSessions'),
    serverSecret: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    requireEntity(await ctx.db.get(args.sessionId), 'Orchestration session');

    const take = Math.max(1, Math.min(args.limit ?? 100, 500));
    const events = await ctx.db
      .query('orchestrationEvents')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .order('desc')
      .take(take);
    return events.reverse();
  },
});
