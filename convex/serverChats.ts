import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireEntity } from './lib/authz';
import { DEFAULT_AGENT_AREA, areaValidator, isValidSubAreaForArea, subAreaValidator } from './lib/agentAreas';

const SERVER_SECRET_ENV = 'CONVEX_SERVER_SECRET';

function requireServerSecret(serverSecret: string | undefined) {
  const expected = process.env[SERVER_SECRET_ENV];
  if (!expected || serverSecret !== expected) {
    throw new Error('Unauthorized: invalid or missing server secret.');
  }
}

/**
 * Server-only: create a chat in the given organization. No Convex user identity required.
 * Authz is enforced by the Next.js API (dashboard session).
 * Optionally pass area and subArea to create the backing agent with chosen area/sub-area.
 */
export const createChatServer = mutation({
  args: {
    title: v.optional(v.string()),
    organizationId: v.id('organizations'),
    serverSecret: v.string(),
    area: v.optional(areaValidator),
    subArea: subAreaValidator,
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    const now = new Date().toISOString();
    const title = (args.title ?? '').trim() || 'New Chat';
    const area = args.area ?? DEFAULT_AGENT_AREA;
    const subArea = args.subArea;
    if (!isValidSubAreaForArea(area, subArea)) {
      throw new Error(`Invalid sub-area "${subArea}" for area "${area}".`);
    }

    // Create a sub-agent backing this chat (1:1).
    const agentId = await ctx.db.insert('agents', {
      organizationId: args.organizationId,
      name: title.slice(0, 80) || 'Chat agent',
      status: 'active',
      createdAt: now,
      area,
      subArea,
    });

    const chatId = await ctx.db.insert('chats', {
      title,
      organizationId: args.organizationId,
      agentId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(agentId, { chatId });

    return chatId;
  },
});

/**
 * Server-only: list chats for an organization. No Convex user identity required.
 */
export const listChatsServer = query({
  args: {
    organizationId: v.id('organizations'),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    const chats = await ctx.db
      .query('chats')
      .withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
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

/**
 * Server-only: add a human message to a chat. No Convex user identity required.
 */
export const sendMessageServer = mutation({
  args: {
    chatId: v.id('chats'),
    content: v.string(),
    authorId: v.optional(v.string()),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    const chat = requireEntity(await ctx.db.get(args.chatId), 'Chat');
    const now = new Date().toISOString();

    const messageId = await ctx.db.insert('messages', {
      chatId: args.chatId,
      authorType: 'human',
      authorId: args.authorId?.trim() || 'user',
      content: args.content,
      createdAt: now,
    });

    await ctx.db.patch(args.chatId, { updatedAt: now });
    return messageId;
  },
});

/**
 * Server-only: add an agent message to a chat. No Convex user identity required.
 */
export const sendAgentMessageServer = mutation({
  args: {
    chatId: v.id('chats'),
    content: v.string(),
    authorId: v.optional(v.string()),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    requireEntity(await ctx.db.get(args.chatId), 'Chat');
    const now = new Date().toISOString();

    const messageId = await ctx.db.insert('messages', {
      chatId: args.chatId,
      authorType: 'agent',
      authorId: (args.authorId ?? 'AvrilAgent').trim() || 'AvrilAgent',
      content: args.content,
      createdAt: now,
    });

    await ctx.db.patch(args.chatId, { updatedAt: now });
    return messageId;
  },
});

/**
 * Server-only: list messages for a chat. No Convex user identity required.
 */
export const listMessagesServer = query({
  args: {
    chatId: v.id('chats'),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    requireEntity(await ctx.db.get(args.chatId), 'Chat');

    return await ctx.db
      .query('messages')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .order('asc')
      .take(300);
  },
});

/**
 * Server-only: set or clear the summary for a chat (e.g. after a summarization job).
 */
export const setChatSummaryServer = mutation({
  args: {
    chatId: v.id('chats'),
    summary: v.optional(v.string()),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    requireEntity(await ctx.db.get(args.chatId), 'Chat');

    const now = new Date().toISOString();
    await ctx.db.patch(args.chatId, {
      summary: args.summary ?? undefined,
      summaryUpdatedAt: now,
    });
  },
});

/**
 * Server-only: return message count for a chat (for summarization job).
 */
export const getMessageCountServer = query({
  args: {
    chatId: v.id('chats'),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    requireEntity(await ctx.db.get(args.chatId), 'Chat');

    const list = await ctx.db
      .query('messages')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect();
    return list.length;
  },
});

/**
 * Server-only: list sub-agents (workers) for an organization with area, sub-area, status, last activity, and chat link.
 */
export const listAgentsServer = query({
  args: {
    organizationId: v.id('organizations'),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    const agents = await ctx.db
      .query('agents')
      .withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
      .collect();

    const withLastActivity = await Promise.all(
      agents.map(async (agent) => {
        let lastActivity: string | null = null;
        if (agent.chatId) {
          const chat = await ctx.db.get(agent.chatId);
          if (chat) lastActivity = chat.updatedAt;
        }
        if (!lastActivity) lastActivity = agent.createdAt;
        return {
          _id: agent._id,
          name: agent.name,
          status: agent.status,
          area: agent.area,
          subArea: agent.subArea,
          chatId: agent.chatId,
          lastActivity,
        };
      })
    );

    return withLastActivity.sort((a, b) =>
      (b.lastActivity ?? '').localeCompare(a.lastActivity ?? '')
    );
  },
});
