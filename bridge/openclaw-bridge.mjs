import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const PORT = Number(process.env.OPENCLAW_BRIDGE_PORT || 8787);
const TOKEN = process.env.OPENCLAW_BRIDGE_TOKEN;
const ROUTE = process.env.OPENCLAW_BRIDGE_ROUTE || '/respond';
const VIRTUAL_TO = process.env.OPENCLAW_BRIDGE_TO || '+19999999999';
const TIMEOUT_SEC = Number(process.env.OPENCLAW_BRIDGE_TIMEOUT_SEC || 90);
const DEFAULT_MAX_CONTEXT_CHARS = Number(process.env.OPENCLAW_BRIDGE_MAX_CONTEXT_CHARS || 12000);

if (!TOKEN) {
  console.error('Missing OPENCLAW_BRIDGE_TOKEN');
  process.exit(1);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function pickReply(stdout) {
  const raw = (stdout || '').trim();
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    const payloadText = parsed?.result?.payloads?.[0]?.text;
    return (
      payloadText ||
      parsed?.reply ||
      parsed?.message ||
      parsed?.text ||
      parsed?.result?.reply ||
      parsed?.result?.message ||
      ''
    );
  } catch {
    return raw;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method !== 'POST' || !req.url?.startsWith(ROUTE)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${TOKEN}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const body = await readJson(req);
    const message = String(body?.message || '').trim();
    if (!message) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'message is required' }));
      return;
    }

    const agentId = body?.agentId;
    const area = body?.area;
    const subArea = body?.subArea;
    const systemPrompt = typeof body?.systemPrompt === 'string' ? body.systemPrompt.trim() : '';
    const summary = typeof body?.summary === 'string' ? body.summary.trim() : '';
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const maxContextChars = typeof body?.maxContextChars === 'number' && body.maxContextChars > 0
      ? body.maxContextChars
      : (DEFAULT_MAX_CONTEXT_CHARS > 0 ? DEFAULT_MAX_CONTEXT_CHARS : null);

    const parts = [];
    if (summary.length > 0) {
      parts.push(`(Summary of earlier conversation)\n${summary}`);
    }
    if (messages.length > 0) {
      const contextLines = messages.map((m) => {
        const who = m.authorType === 'human' ? 'User' : (m.authorId || 'Agent');
        return `[${who}]: ${String(m.content || '').trim()}`;
      });
      let contextBlock = contextLines.join('\n');
      if (maxContextChars != null && contextBlock.length > maxContextChars) {
        const truncated = contextBlock.slice(-maxContextChars);
        const firstLineEnd = truncated.indexOf('\n');
        contextBlock = firstLineEnd > 0 ? truncated.slice(firstLineEnd + 1) : truncated;
      }
      parts.push(`(Context — last ${messages.length} messages)\n${contextBlock}`);
    }
    parts.push(`(Current user message)\n${message}`);
    let payloadMessage = parts.join('\n\n');
    if (agentId != null || area != null || subArea != null) {
      const meta = [agentId && `agentId=${agentId}`, area && `area=${area}`, subArea && `subArea=${subArea}`].filter(Boolean).join(', ');
      payloadMessage = `[Agent context: ${meta}]\n\n${payloadMessage}`;
    }
    if (systemPrompt.length > 0) {
      payloadMessage = `(System — Avril architect persona)\n${systemPrompt}\n\n---\n\n${payloadMessage}`;
    }

    const args = [
      'agent',
      '--to',
      VIRTUAL_TO,
      '--message',
      payloadMessage,
      '--timeout',
      String(TIMEOUT_SEC),
      '--json',
    ];

    const { stdout, stderr } = await execFileAsync('openclaw', args, {
      timeout: (TIMEOUT_SEC + 5) * 1000,
      maxBuffer: 2 * 1024 * 1024,
    });

    const reply = pickReply(stdout);
    if (!reply) {
      throw new Error(`No reply from openclaw. stderr=${stderr || ''}`);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, reply }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown bridge error',
      })
    );
  }
});

server.listen(PORT, () => {
  console.log(`OpenClaw bridge listening on http://0.0.0.0:${PORT}${ROUTE}`);
});
