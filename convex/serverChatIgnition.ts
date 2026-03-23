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

export const upsertChatIgnitionDraftServer = mutation({
  args: {
    organizationId: v.id('organizations'),
    chatId: v.id('chats'),
    serverSecret: v.string(),
    phase: v.optional(v.string()),
    captured: v.optional(v.any()),
    ignitionPrompt: v.optional(v.string()),
    handoffPayload: v.optional(v.any()),
    lastArchitectPayload: v.optional(v.any()),
    nextStatus: v.union(v.literal('collecting'), v.literal('ready')),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    requireEntity(await ctx.db.get(args.chatId), 'Chat');

    const existing = await ctx.db
      .query('chatIgnitionDrafts')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .first();

    if (existing?.status === 'spawned') {
      return existing._id;
    }

    const now = new Date().toISOString();
    let status: 'collecting' | 'ready' | 'spawned' = args.nextStatus;
    if (existing?.status === 'ready' && args.nextStatus === 'collecting') {
      status = 'ready';
    }

    const base = {
      organizationId: args.organizationId,
      chatId: args.chatId,
      phase: args.phase,
      captured: args.captured,
      handoffPayload: args.handoffPayload,
      lastArchitectPayload: args.lastArchitectPayload,
      updatedAt: now,
      status,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...base,
        ...(args.ignitionPrompt !== undefined ? { ignitionPrompt: args.ignitionPrompt } : {}),
      });
      return existing._id;
    }

    return await ctx.db.insert('chatIgnitionDrafts', {
      ...base,
      ignitionPrompt: args.ignitionPrompt,
      createdAt: now,
    });
  },
});

export const markChatIgnitionSpawnedServer = mutation({
  args: {
    chatId: v.id('chats'),
    sessionId: v.id('orchestrationSessions'),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    const existing = await ctx.db
      .query('chatIgnitionDrafts')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .first();
    if (!existing) return null;
    const now = new Date().toISOString();
    await ctx.db.patch(existing._id, {
      status: 'spawned',
      spawnSessionId: args.sessionId,
      updatedAt: now,
    });
    return existing._id;
  },
});

export const getChatIgnitionDraftServer = query({
  args: {
    chatId: v.id('chats'),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    return await ctx.db
      .query('chatIgnitionDrafts')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .first();
  },
});
