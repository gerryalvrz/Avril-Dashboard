import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

type StartupArtifact = {
  startup?: string;
  generatedAt?: string;
  rootWallet?: string;
  roleMatrix?: Array<{
    role: string;
    delegateEoa: string;
    contextWallet: string;
    ens: string | null;
    erc8004: string;
    txHashes?: Record<string, string | null>;
  }>;
  roles?: Array<{
    role: string;
    txs?: Array<{ label: string; ok: boolean; txHash?: string | null; errorType?: string }>;
    revokeInstructions?: string;
  }>;
};

async function readLatestArtifact(): Promise<StartupArtifact | null> {
  const dir = path.join(process.cwd(), 'agent');
  const files = await fs.readdir(dir).catch(() => []);
  const matches = files.filter((f) => /^startup_swarm_.*\.json$/.test(f));
  if (matches.length === 0) return null;

  const withStats = await Promise.all(
    matches.map(async (file) => {
      const full = path.join(dir, file);
      const stat = await fs.stat(full);
      return { file, full, mtimeMs: stat.mtimeMs };
    })
  );
  withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const latest = withStats[0];
  const raw = await fs.readFile(latest.full, 'utf8');
  const parsed = JSON.parse(raw) as StartupArtifact;
  return parsed;
}

export async function GET() {
  try {
    const artifact = await readLatestArtifact();
    if (!artifact) {
      return NextResponse.json({ ok: false, error: 'No startup swarm artifact found in /agent.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, artifact }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to read startup artifact.' },
      { status: 500 }
    );
  }
}
