import { NextResponse } from 'next/server';
import { getClientIp, hitRateLimit, rejectLargePayload, requireDashboardToken } from '@/src/lib/apiSecurity';
import { createFounderIdea } from '@/src/lib/convexServer';

type IntakeBody = {
  founderName?: string;
  title?: string;
  rawIdea?: string;
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
};

export async function POST(req: Request) {
  try {
    if (!requireDashboardToken(req)) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }
    const ip = getClientIp(req);
    if (hitRateLimit(`founder:intake:${ip}`, 40)) {
      return NextResponse.json(
        { ok: false, error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded' } },
        { status: 429 }
      );
    }
    if (rejectLargePayload(req, 24 * 1024)) {
      return NextResponse.json(
        { ok: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Payload too large' } },
        { status: 413 }
      );
    }

    const body = (await req.json()) as IntakeBody;
    const title = body.title?.trim() || 'Founder idea';
    const ideaText = body.rawIdea?.trim();
    if (!ideaText) {
      return NextResponse.json(
        { ok: false, error: { code: 'BAD_REQUEST', message: 'rawIdea is required' } },
        { status: 400 }
      );
    }

    const ideaId = await createFounderIdea({
      title: body.founderName?.trim() ? `${title} (${body.founderName.trim()})` : title,
      ideaText,
      targetUser: body.targetUser,
      problem: body.problem,
      monetizationPreference: body.monetizationPreference,
      businessModelPreference: body.businessModelPreference,
      desiredAutomationLevel: body.desiredAutomationLevel,
      skillsResources: body.skillsResources,
      timeAvailable: body.timeAvailable,
      country: body.country,
      language: body.language,
      channelPreferences: body.channelPreferences,
      riskTolerance: body.riskTolerance,
    });

    return NextResponse.json({ ok: true, ideaId });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INTAKE_FAILED',
          message: err instanceof Error ? err.message : 'Failed to create founder idea',
        },
      },
      { status: 500 }
    );
  }
}
