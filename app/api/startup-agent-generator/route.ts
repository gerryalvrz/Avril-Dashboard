import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { sanitizeStartupName, type StartupRoleInput } from '@/src/lib/startupAgentGenerator';

type GeneratorResponse = {
  ok: boolean;
  output?: string;
  startup?: string;
  roles?: number;
  roleMatrix?: Array<Record<string, unknown>>;
  error?: string;
};

function parseRoles(value: unknown): StartupRoleInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('roles must be a non-empty array.');
  }
  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') throw new Error(`roles[${index}] must be an object.`);
    const row = entry as { role?: unknown; policy?: unknown };
    if (typeof row.role !== 'string' || row.role.trim().length === 0) {
      throw new Error(`roles[${index}].role is required.`);
    }
    const policy = (row.policy || {}) as Record<string, unknown>;
    return {
      role: row.role,
      policy: {
        spendingLimit: String(policy.spendingLimit ?? '0'),
        dailyLimit: String(policy.dailyLimit ?? '0'),
        ttl: Number(policy.ttl ?? 86400),
        allowlist: Array.isArray(policy.allowlist) ? policy.allowlist.map(String) : [],
      },
    };
  });
}

async function runGenerator(startupName: string, roles: StartupRoleInput[]): Promise<GeneratorResponse> {
  return new Promise((resolve, reject) => {
    const args = ['./script/startup-agent-generator.mjs', startupName, JSON.stringify(roles)];
    const child = spawn('node', args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      const raw = (stdout || stderr || '').trim();
      if (code !== 0) {
        reject(new Error(raw || `Generator exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error(`Failed to parse generator output: ${raw}`));
      }
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { startupName?: unknown; roles?: unknown };
    const startupName = sanitizeStartupName(String(body.startupName ?? ''));
    if (!startupName) {
      return NextResponse.json({ ok: false, error: 'startupName is required.' }, { status: 400 });
    }
    const roles = parseRoles(body.roles);
    const result = await runGenerator(startupName, roles);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to run startup agent generator.' },
      { status: 500 }
    );
  }
}
