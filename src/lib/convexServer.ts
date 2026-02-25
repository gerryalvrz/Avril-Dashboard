import { ConvexHttpClient } from 'convex/browser';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
const SERVER_SECRET = process.env.CONVEX_SERVER_SECRET;

function getClient(): ConvexHttpClient {
  if (!CONVEX_URL) throw new Error('Missing Convex URL (NEXT_PUBLIC_CONVEX_URL or CONVEX_URL).');
  return new ConvexHttpClient(CONVEX_URL);
}

function requireServerSecret(): string {
  if (!SERVER_SECRET) throw new Error('Missing CONVEX_SERVER_SECRET in server environment.');
  return SERVER_SECRET;
}

/**
 * Resolves the default organization id for server-side Convex calls.
 * Creates the default org if it does not exist. Use this before any chat operations.
 */
export async function getDefaultOrganizationId(): Promise<string> {
  const client = getClient();
  const serverSecret = requireServerSecret();

  let orgId: string | null = await (client as any).query('bootstrap:getDefaultOrganizationId', {
    serverSecret,
  });

  if (orgId == null) {
    orgId = await (client as any).mutation('bootstrap:createDefaultOrganizationIfMissing', {
      serverSecret,
    });
  }

  if (!orgId) throw new Error('Failed to resolve default organization.');
  return orgId;
}

/**
 * Server-only Convex chat API. Call only from API routes after requireDashboardToken.
 * Requires CONVEX_SERVER_SECRET to be set in env and in Convex deployment.
 * Optionally pass area and subArea to create the backing agent with chosen area/sub-area.
 */
export async function createChat(args: {
  title?: string;
  organizationId?: string;
  area?: 'Research' | 'Ops' | 'General';
  subArea?: 'Grants' | 'Competitors' | 'Deploy' | 'Alerts';
}) {
  const client = getClient();
  const serverSecret = requireServerSecret();
  const organizationId = args.organizationId ?? (await getDefaultOrganizationId());

  return await (client as any).mutation('serverChats:createChatServer', {
    title: args.title ?? 'New Chat',
    organizationId,
    serverSecret,
    area: args.area,
    subArea: args.subArea,
  });
}

/**
 * List chats for the default (or given) organization.
 */
export async function listChats(args: { organizationId?: string }) {
  const client = getClient();
  const serverSecret = requireServerSecret();
  const organizationId = args.organizationId ?? (await getDefaultOrganizationId());

  return await (client as any).query('serverChats:listChatsServer', {
    organizationId,
    serverSecret,
  });
}

/**
 * List sub-agents (workers) for the default (or given) organization. Includes area, sub-area, status, last activity, chatId.
 */
export async function listAgents(args: { organizationId?: string }) {
  const client = getClient();
  const serverSecret = requireServerSecret();
  const organizationId = args.organizationId ?? (await getDefaultOrganizationId());

  return await (client as any).query('serverChats:listAgentsServer', {
    organizationId,
    serverSecret,
  });
}

/**
 * Add a human message to a chat.
 */
export async function sendMessage(args: {
  chatId: string;
  content: string;
  authorId?: string;
}) {
  const client = getClient();
  const serverSecret = requireServerSecret();

  return await (client as any).mutation('serverChats:sendMessageServer', {
    chatId: args.chatId,
    content: args.content,
    authorId: args.authorId,
    serverSecret,
  });
}

/**
 * Add an agent message to a chat.
 */
export async function sendAgentMessage(args: {
  chatId: string;
  content: string;
  authorId?: string;
}) {
  const client = getClient();
  const serverSecret = requireServerSecret();

  return await (client as any).mutation('serverChats:sendAgentMessageServer', {
    chatId: args.chatId,
    content: args.content,
    authorId: args.authorId ?? 'AgentMotus',
    serverSecret,
  });
}

/**
 * List messages for a chat.
 */
export async function listMessages(args: { chatId: string }) {
  const client = getClient();
  const serverSecret = requireServerSecret();

  return await (client as any).query('serverChats:listMessagesServer', {
    chatId: args.chatId,
    serverSecret,
  });
}
