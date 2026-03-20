import WebSocket from 'ws';
import {
  appendOrchestrationEvent,
  setOrchestrationSessionStatus,
  type OrchestrationAgentStatus,
  updateOrchestrationAgentStatus,
} from '@/src/lib/convexServer';

type WsFrame =
  | { type: 'event'; event?: string; payload?: any }
  | { type: 'res'; ok?: boolean; payload?: any; error?: { message?: string } };

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const RECONNECT_JITTER_MS = 1000;
const MAX_RECONNECT_ATTEMPTS = 20;

function uuid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mapGatewayStatusToAgentStatus(raw: unknown): OrchestrationAgentStatus {
  const value = String(raw ?? '').toLowerCase();
  if (value.includes('spawn')) return 'spawning';
  if (value.includes('idle')) return 'idle';
  if (value.includes('work') || value.includes('tool')) return 'working';
  if (value.includes('block') || value.includes('wait')) return 'blocked';
  if (value.includes('complete') || value.includes('done') || value.includes('success')) return 'completed';
  if (value.includes('error') || value.includes('fail')) return 'error';
  return 'working';
}

function extractAgentIdentity(payload: any) {
  const rawId =
    payload?.agentKey ??
    payload?.agentId ??
    payload?.agent_id ??
    payload?.id ??
    payload?.agent?.id ??
    payload?.agent?.agentId;
  const agentKey = rawId ? String(rawId) : '';
  const name = String((payload?.name ?? payload?.agentName ?? payload?.agent?.name ?? agentKey) || 'Agent');
  const role = payload?.role ?? payload?.agent?.role;
  const parentAgentKey = payload?.parentAgentKey ?? payload?.parentId ?? payload?.parent_agent_id;
  return {
    agentKey,
    name,
    role: role ? String(role) : undefined,
    parentAgentKey: parentAgentKey ? String(parentAgentKey) : undefined,
  };
}

class OpenClawWsManager {
  private ws: WebSocket | null = null;
  private connected = false;
  private connecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private sessions = new Set<string>();

  private get config() {
    return {
      url: process.env.OPENCLAW_GATEWAY_URL,
      token: process.env.OPENCLAW_GATEWAY_TOKEN,
      clientId: process.env.OPENCLAW_GATEWAY_CLIENT_ID || 'openclaw-control-ui',
    };
  }

  startSession(sessionId: string) {
    this.sessions.add(sessionId);
    void appendOrchestrationEvent({
      sessionId,
      type: 'gateway.connecting',
      payload: { source: 'ws-manager' },
    }).catch(() => {});
    this.ensureConnected();
  }

  stopSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  sendAgentCommand(command: 'pause' | 'kill', agentKey: string) {
    this.send({
      type: 'req',
      id: uuid(),
      method: 'agent.command',
      params: {
        command,
        agentId: agentKey,
      },
    });
  }

  private ensureConnected() {
    if (this.connected || this.connecting) return;
    const { url } = this.config;
    if (!url) return;

    this.connecting = true;
    try {
      this.ws = new WebSocket(url);
      this.ws.on('open', () => {
        this.connecting = false;
      });
      this.ws.on('message', (buf) => {
        this.handleMessage(buf.toString());
      });
      this.ws.on('close', () => {
        this.connected = false;
        this.connecting = false;
        void Promise.all(
          Array.from(this.sessions).map(async (sessionId) => {
            await appendOrchestrationEvent({
              sessionId,
              type: 'gateway.disconnected',
              payload: { source: 'ws-manager' },
            }).catch(() => {});
          })
        );
        this.scheduleReconnect();
      });
      this.ws.on('error', () => {
        this.connected = false;
      });
    } catch {
      this.connecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS || this.sessions.size === 0) return;
    if (this.reconnectTimer) return;

    const delay =
      Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempt, RECONNECT_MAX_MS) +
      Math.floor(Math.random() * RECONNECT_JITTER_MS);
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensureConnected();
    }, delay);
  }

  private send(data: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(data));
  }

  private async fanout(eventType: string, payload?: unknown) {
    const ids = Array.from(this.sessions);
    await Promise.all(
      ids.map(async (sessionId) => {
        try {
          await appendOrchestrationEvent({ sessionId, type: eventType, payload });
        } catch {
          // Ignore Convex write errors to keep gateway processing alive.
        }
      })
    );
  }

  private async handleAgentPresence(payload: any) {
    const { agentKey, name, role, parentAgentKey } = extractAgentIdentity(payload);
    if (!agentKey) return;

    const statusRaw = payload?.status ?? payload?.state ?? payload?.presence;
    const mapped = mapGatewayStatusToAgentStatus(statusRaw ?? 'idle');
    await Promise.all(
      Array.from(this.sessions).map(async (sessionId) => {
        await updateOrchestrationAgentStatus({
          sessionId,
          agentKey,
          name,
          role,
          parentAgentKey,
          status: mapped,
          meta: payload,
        }).catch(() => {});
      })
    );
  }

  private async handleAgentStatus(payload: any) {
    const { agentKey, name, role, parentAgentKey } = extractAgentIdentity(payload);
    if (!agentKey) return;
    const mapped = mapGatewayStatusToAgentStatus(payload?.status ?? payload?.state);

    await Promise.all(
      Array.from(this.sessions).map(async (sessionId) => {
        await updateOrchestrationAgentStatus({
          sessionId,
          agentKey,
          name,
          role,
          parentAgentKey,
          status: mapped,
          meta: payload,
        }).catch(() => {});
      })
    );
  }

  private async handleMessage(raw: string) {
    let frame: WsFrame | null = null;
    try {
      frame = JSON.parse(raw) as WsFrame;
    } catch {
      return;
    }
    if (!frame) return;

    if (frame.type === 'event') {
      const eventName = frame.event ?? 'unknown';

      if (eventName === 'connect.challenge') {
        const { token, clientId } = this.config;
        this.send({
          type: 'req',
          id: uuid(),
          method: 'connect',
          params: {
            minProtocol: 1,
            maxProtocol: 3,
            client: {
              id: clientId,
              version: '0.1.0',
              platform: 'web',
              mode: 'ui',
            },
            caps: ['tool-events'],
            scopes: ['operator.admin'],
            ...(token ? { auth: { token } } : {}),
          },
        });
      }

      if (eventName === 'agent.presence') await this.handleAgentPresence(frame.payload);
      if (eventName === 'agent.status') await this.handleAgentStatus(frame.payload);
      if (eventName === 'agent.message') await this.fanout('agent.message', frame.payload);
      if (eventName === 'health') await this.fanout('health', frame.payload);
      if (eventName === 'heartbeat') await this.fanout('heartbeat', frame.payload);

      await this.fanout(eventName, frame.payload);
      return;
    }

    if (frame.type === 'res') {
      if (frame.ok && frame.payload?.type === 'hello-ok') {
        this.connected = true;
        this.reconnectAttempt = 0;

        await Promise.all(
          Array.from(this.sessions).map(async (sessionId) => {
            await setOrchestrationSessionStatus({ sessionId, status: 'active' }).catch(() => {});
            await appendOrchestrationEvent({
              sessionId,
              type: 'gateway.connected',
              payload: { source: 'ws-manager' },
            }).catch(() => {});
          })
        );
        return;
      }

      if (frame.ok === false) {
        await Promise.all(
          Array.from(this.sessions).map(async (sessionId) => {
            await appendOrchestrationEvent({
              sessionId,
              type: 'gateway.error',
              payload: { message: frame?.error?.message ?? 'Gateway connection error' },
            }).catch(() => {});
          })
        );
      }
    }
  }
}

const globalForOpenClaw = globalThis as typeof globalThis & {
  __openClawWsManager?: OpenClawWsManager;
};

const wsManager = globalForOpenClaw.__openClawWsManager ?? new OpenClawWsManager();
globalForOpenClaw.__openClawWsManager = wsManager;

export function startOpenClawSessionStream(sessionId: string) {
  wsManager.startSession(sessionId);
}

export function stopOpenClawSessionStream(sessionId: string) {
  wsManager.stopSession(sessionId);
}

export function sendOpenClawAgentCommand(command: 'pause' | 'kill', agentKey: string) {
  wsManager.sendAgentCommand(command, agentKey);
}
