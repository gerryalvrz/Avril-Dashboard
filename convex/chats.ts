import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { authzError, requireEntity, requireOrgMembership, resolveOrgForUser } from './lib/authz';
import { DEFAULT_AGENT_AREA, areaValidator, isValidSubAreaForArea, subAreaValidator } from './lib/agentAreas';

export const createChat = mutation({
  args: {
    title: v.optional(v.string()),
    organizationId: v.optional(v.id('organizations')),
    area: v.optional(areaValidator),
    subArea: subAreaValidator,
  },
  handler: async (ctx, args) => {
    const { organizationId } = await resolveOrgForUser(ctx, args.organizationId, 'operator');

    const now = new Date().toISOString();
    const title = args.title?.trim() || 'New Chat';
    const area = args.area ?? DEFAULT_AGENT_AREA;
    const subArea = args.subArea;
    if (!isValidSubAreaForArea(area, subArea)) {
      throw new Error(`Invalid sub-area "${subArea}" for area "${area}".`);
    }

    // Create a sub-agent backing this chat (1:1).
    const agentId = await ctx.db.insert('agents', {
      organizationId,
      name: title.slice(0, 80) || 'Chat agent',
      status: 'active',
      createdAt: now,
      area,
      subArea,
    });

    const chatId = await ctx.db.insert('chats', {
      title,
      organizationId,
      agentId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(agentId, { chatId });

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

        const agent = chat.agentId ? await ctx.db.get(chat.agentId) : null;
        return {
          ...chat,
          lastMessage: last?.content ?? '',
          lastMessageAt: last?.createdAt ?? chat.updatedAt,
          agent: agent
            ? { name: agent.name, area: agent.area, subArea: agent.subArea }
            : undefined,
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
