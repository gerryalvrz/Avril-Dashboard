import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { authzError, requireEntity, requireOrgMembership, resolveOrgForUser } from './lib/authz';

export const createChat = mutation({
  args: {
    title: v.optional(v.string()),
    organizationId: v.optional(v.id('organizations')),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await resolveOrgForUser(ctx, args.organizationId, 'operator');

    const now = new Date().toISOString();
    const chatId = await ctx.db.insert('chats', {
      title: args.title?.trim() || 'New Chat',
      organizationId,
      createdAt: now,
      updatedAt: now,
    });
    return chatId;
  },
});

export const listChats = query({
  args: {
    organizationId: v.optional(v.id('organizations')),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await resolveOrgForUser(ctx, args.organizationId, 'viewer');

    const chats = await ctx.db
      .query('chats')
      .withIndex('by_org', (q) => q.eq('organizationId', organizationId))
      .collect();

    const sorted = chats.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 50);

    const withLastMessage = await Promise.all(
      sorted.map(async (chat) => {
        const last = await ctx.db
          .query('messages')
          .withIndex('by_chat', (q) => q.eq('chatId', chat._id))
          .order('desc')
          .first();

        return {
          ...chat,
          lastMessage: last?.content ?? '',
          lastMessageAt: last?.createdAt ?? chat.updatedAt,
        };
      })
    );

    return withLastMessage;
  },
});

export const sendMessage = mutation({
  args: {
    chatId: v.id('chats'),
    content: v.string(),
    authorType: v.optional(v.union(v.literal('human'), v.literal('agent'))),
    authorId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const chat = requireEntity(await ctx.db.get(args.chatId), 'Chat');
    if (!chat.organizationId) {
      authzError('not_found', 'Chat not found.');
    }

    const { user } = await requireOrgMembership(ctx, chat.organizationId, 'viewer');

    const now = new Date().toISOString();
    const messageId = await ctx.db.insert('messages', {
      chatId: args.chatId,
      authorType: 'human',
      authorId: user.email,
      content: args.content,
      createdAt: now,
    });

    await ctx.db.patch(args.chatId, { updatedAt: now });

    return messageId;
  },
});

export const sendAgentMessage = mutation({
  args: {
    chatId: v.id('chats'),
    content: v.string(),
    authorId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const chat = requireEntity(await ctx.db.get(args.chatId), 'Chat');
    if (!chat.organizationId) {
      authzError('not_found', 'Chat not found.');
    }

    await requireOrgMembership(ctx, chat.organizationId, 'operator');

    const now = new Date().toISOString();
    const messageId = await ctx.db.insert('messages', {
      chatId: args.chatId,
      authorType: 'agent',
      authorId: args.authorId?.trim() || 'AgentMotus',
      content: args.content,
      createdAt: now,
    });

    await ctx.db.patch(args.chatId, { updatedAt: now });

    return messageId;
  },
});

export const listMessages = query({
  args: {
    chatId: v.id('chats'),
  },
  handler: async (ctx, args) => {
    const chat = requireEntity(await ctx.db.get(args.chatId), 'Chat');
    if (!chat.organizationId) {
      authzError('not_found', 'Chat not found.');
    }

    await requireOrgMembership(ctx, chat.organizationId, 'viewer');

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .order('asc')
      .take(300);

    return messages;
  },
});
