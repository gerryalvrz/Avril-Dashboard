import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const PORT = Number(process.env.OPENCLAW_BRIDGE_PORT || 8787);
const TOKEN = process.env.OPENCLAW_BRIDGE_TOKEN;
const ROUTE = process.env.OPENCLAW_BRIDGE_ROUTE || '/respond';
const VIRTUAL_TO = process.env.OPENCLAW_BRIDGE_TO || '+19999999999';
const TIMEOUT_SEC = Number(process.env.OPENCLAW_BRIDGE_TIMEOUT_SEC || 90);

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

    const args = [
      'agent',
      '--to',
      VIRTUAL_TO,
      '--message',
      message,
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

server.listen(PORT, '127.0.0.1', () => {
  console.log(`OpenClaw bridge listening on http://127.0.0.1:${PORT}${ROUTE}`);
});
