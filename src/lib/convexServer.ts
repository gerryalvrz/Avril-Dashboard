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
    authorId: args.authorId ?? 'AvrilAgent',
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

export type OrchestrationSessionStatus = 'queued' | 'spawning' | 'active' | 'failed' | 'completed';
export type OrchestrationAgentStatus = 'spawning' | 'idle' | 'working' | 'blocked' | 'completed' | 'error';

export async function createOrchestrationSession(args: {
  organizationId?: string;
  chatId: string;
  status?: OrchestrationSessionStatus;
  spawnRequestId?: string;
  vpsRef?: string;
  containerRef?: string;
  error?: string;
}) {
  const client = getClient();
  const serverSecret = requireServerSecret();
  const organizationId = args.organizationId ?? (await getDefaultOrganizationId());

  return await (client as any).mutation('serverOrchestration:createSessionServer', {
    organizationId,
    chatId: args.chatId,
    status: args.status,
    spawnRequestId: args.spawnRequestId,
    vpsRef: args.vpsRef,
    containerRef: args.containerRef,
    error: args.error,
    serverSecret,
  });
}

export async function setOrchestrationSessionStatus(args: {
  sessionId: string;
  status: OrchestrationSessionStatus;
  spawnRequestId?: string;
  vpsRef?: string;
  containerRef?: string;
  error?: string;
}) {
  const client = getClient();
  const serverSecret = requireServerSecret();

  return await (client as any).mutation('serverOrchestration:setSessionStatusServer', {
    sessionId: args.sessionId,
    status: args.status,
    spawnRequestId: args.spawnRequestId,
    vpsRef: args.vpsRef,
    containerRef: args.containerRef,
    error: args.error,
    serverSecret,
  });
}

export async function appendOrchestrationEvent(args: {
  sessionId: string;
  type: string;
  payload?: unknown;
}) {
  const client = getClient();
  const serverSecret = requireServerSecret();
  return await (client as any).mutation('serverOrchestration:appendSessionEventServer', {
    sessionId: args.sessionId,
    type: args.type,
    payload: args.payload,
    serverSecret,
  });
}

export async function upsertOrchestrationAgents(args: {
  sessionId: string;
  agents: Array<{
    agentKey: string;
    parentAgentKey?: string;
    name: string;
    role?: string;
    status: OrchestrationAgentStatus;
    x?: number;
    y?: number;
    meta?: unknown;
  }>;
}) {
  const client = getClient();
  const serverSecret = requireServerSecret();
  return await (client as any).mutation('serverOrchestration:upsertAgentsSnapshotServer', {
    sessionId: args.sessionId,
    agents: args.agents,
    serverSecret,
  });
}

export async function updateOrchestrationAgentStatus(args: {
  sessionId: string;
  agentKey: string;
  status: OrchestrationAgentStatus;
  name?: string;
  role?: string;
  parentAgentKey?: string;
  meta?: unknown;
}) {
  const client = getClient();
  const serverSecret = requireServerSecret();
  return await (client as any).mutation('serverOrchestration:updateAgentStatusServer', {
    sessionId: args.sessionId,
    agentKey: args.agentKey,
    status: args.status,
    name: args.name,
    role: args.role,
    parentAgentKey: args.parentAgentKey,
    meta: args.meta,
    serverSecret,
  });
}

export async function getOrchestrationSession(args: { sessionId: string }) {
  const client = getClient();
  const serverSecret = requireServerSecret();
  return await (client as any).query('serverOrchestration:getSessionServer', {
    sessionId: args.sessionId,
    serverSecret,
  });
}

export async function getOrchestrationSessionByChat(args: { chatId: string }) {
  const client = getClient();
  const serverSecret = requireServerSecret();
  return await (client as any).query('serverOrchestration:getSessionByChatServer', {
    chatId: args.chatId,
    serverSecret,
  });
}

export async function listOrchestrationAgents(args: { sessionId: string }) {
  const client = getClient();
  const serverSecret = requireServerSecret();
  return await (client as any).query('serverOrchestration:listSessionAgentsServer', {
    sessionId: args.sessionId,
    serverSecret,
  });
}

export async function listOrchestrationEvents(args: { sessionId: string; limit?: number }) {
  const client = getClient();
  const serverSecret = requireServerSecret();
  return await (client as any).query('serverOrchestration:listSessionEventsServer', {
    sessionId: args.sessionId,
    limit: args.limit,
    serverSecret,
  });
}

export async function getControlPlaneState(args: { organizationId?: string }) {
  const client = getClient();
  const serverSecret = requireServerSecret();
  const organizationId = args.organizationId ?? (await getDefaultOrganizationId());
  return await (client as any).query('serverControlPlane:getControlPlaneStateServer', {
    organizationId,
    serverSecret,
  });
}

export async function createFounderIdea(args: {
  organizationId?: string;
  founderUserId?: string;
  title: string;
  ideaText: string;
  targetUser?: string;
  problem?: string;
  monetizationPreference?: string;
  businessModelPreference?: string;
  desiredAutomationLevel?: string;
  skillsResources?: string;
  timeAvailable?: string;
  country?: string;
  language?: string;
  channelPreferences?: string[];
  riskTolerance?: string;
}) {
  const client = getClient();
  const serverSecret = requireServerSecret();
  const organizationId = args.organizationId ?? (await getDefaultOrganizationId());
  return await (client as any).mutation('serverFounder:createFounderIdeaServer', {
    organizationId,
    founderUserId: args.founderUserId,
    title: args.title,
    ideaText: args.ideaText,
    targetUser: args.targetUser,
    problem: args.problem,
    monetizationPreference: args.monetizationPreference,
    businessModelPreference: args.businessModelPreference,
    desiredAutomationLevel: args.desiredAutomationLevel,
    skillsResources: args.skillsResources,
    timeAvailable: args.timeAvailable,
    country: args.country,
    language: args.language,
    channelPreferences: args.channelPreferences,
    riskTolerance: args.riskTolerance,
    serverSecret,
  });
}

export async function selectCompanyOption(args: {
  ideaId: string;
  selectedOptionKey: string;
  selectedProfile: 'conservative' | 'balanced' | 'ambitious';
  rationale?: string;
  selectedByUserId?: string;
}) {
  const client = getClient();
  const serverSecret = requireServerSecret();
  return await (client as any).mutation('serverFounder:selectCompanyOptionServer', {
    ideaId: args.ideaId,
    selectedOptionKey: args.selectedOptionKey,
    selectedProfile: args.selectedProfile,
    rationale: args.rationale,
    selectedByUserId: args.selectedByUserId,
    serverSecret,
  });
}

export async function generateFounderBrief(args: { ideaId?: string }) {
  const client = getClient();
  return await (client as any).action('founderGeneration:generateFounderBrief', {
    ideaId: args.ideaId,
  });
}

export async function generateCompanyOptions(args: { ideaId?: string }) {
  const client = getClient();
  return await (client as any).action('founderGeneration:generateCompanyOptions', {
    ideaId: args.ideaId,
  });
}

export async function generateBusinessBlueprint(args: { ideaId?: string }) {
  const client = getClient();
  return await (client as any).action('founderGeneration:generateBusinessBlueprint', {
    ideaId: args.ideaId,
  });
}

export async function generateIgnitionPrompt(args: { ideaId?: string }) {
  const client = getClient();
  return await (client as any).action('founderGeneration:generateIgnitionPrompt', {
    ideaId: args.ideaId,
  });
}

export async function deployOpenClawInstance(args: { ideaId?: string }) {
  const client = getClient();
  return await (client as any).action('deployments:deployOpenClawInstance', {
    ideaId: args.ideaId,
  });
}

export async function upsertChatIgnitionDraft(args: {
  organizationId: string;
  chatId: string;
  phase?: string;
  captured?: unknown;
  ignitionPrompt?: string;
  handoffPayload?: unknown;
  lastArchitectPayload?: unknown;
  nextStatus: 'collecting' | 'ready';
}) {
  const client = getClient();
  const serverSecret = requireServerSecret();
  return await (client as any).mutation('serverChatIgnition:upsertChatIgnitionDraftServer', {
    organizationId: args.organizationId,
    chatId: args.chatId,
    serverSecret,
    phase: args.phase,
    captured: args.captured,
    ignitionPrompt: args.ignitionPrompt,
    handoffPayload: args.handoffPayload,
    lastArchitectPayload: args.lastArchitectPayload,
    nextStatus: args.nextStatus,
  });
}

export async function getChatIgnitionDraft(args: { chatId: string }) {
  const client = getClient();
  const serverSecret = requireServerSecret();
  return await (client as any).query('serverChatIgnition:getChatIgnitionDraftServer', {
    chatId: args.chatId,
    serverSecret,
  });
}

export async function markChatIgnitionSpawned(args: { chatId: string; sessionId: string }) {
  const client = getClient();
  const serverSecret = requireServerSecret();
  return await (client as any).mutation('serverChatIgnition:markChatIgnitionSpawnedServer', {
    chatId: args.chatId,
    sessionId: args.sessionId,
    serverSecret,
  });
}
