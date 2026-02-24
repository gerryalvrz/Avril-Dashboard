import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const createChat = mutation({
  args: {
    title: v.optional(v.string()),
    organizationId: v.optional(v.id('organizations')),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const chatId = await ctx.db.insert('chats', {
      title: args.title?.trim() || 'New Chat',
      organizationId: args.organizationId,
      createdAt: now,
      updatedAt: now,
    });
    return chatId;
  },
});

export const listChats = query({
  args: {},
  handler: async (ctx) => {
    const chats = await ctx.db
      .query('chats')
      .withIndex('by_updatedAt')
      .order('desc')
      .take(50);

    const withLastMessage = await Promise.all(
      chats.map(async (chat) => {
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
    authorType: v.union(v.literal('human'), v.literal('agent')),
    authorId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const messageId = await ctx.db.insert('messages', {
      chatId: args.chatId,
      authorType: args.authorType,
      authorId: args.authorId,
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
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .order('asc')
      .take(300);

    return messages;
  },
});
