import { action, httpAction } from './_generated/server';
import { api } from './_generated/api';
import { v } from 'convex/values';
import { DeployerRequestSchema, DeployerWebhookSchema } from '../src/modules/founder/deployment';

const SERVER_SECRET_ENV = 'CONVEX_SERVER_SECRET';

function requireServerSecret(): string {
  const value = process.env[SERVER_SECRET_ENV];
  if (!value) throw new Error('Missing CONVEX_SERVER_SECRET in Convex environment.');
  return value;
}

function callbackUrl() {
  const explicit = process.env.DEPLOYER_CALLBACK_URL;
  if (explicit) return explicit;
  const convexSite = process.env.CONVEX_SITE_URL;
  if (!convexSite) throw new Error('Missing DEPLOYER_CALLBACK_URL (or CONVEX_SITE_URL fallback).');
  return `${convexSite.replace(/\/$/, '')}/webhooks/deployer`;
}

export const deployOpenClawInstance = action({
  args: { ideaId: v.optional(v.id('founderIdeas')) },
  handler: async (ctx, args) => {
    const serverSecret = requireServerSecret();
    const organizationId = await ctx.runQuery((api as any).bootstrap.getDefaultOrganizationId, { serverSecret });
    if (!organizationId) throw new Error('No default organization found.');

    const state = await ctx.runQuery((api as any).serverControlPlane.getControlPlaneStateServer, {
      organizationId,
      serverSecret,
    });
    const currentIdea = args.ideaId
      ? await ctx.runQuery((api as any).serverFounder.getFounderIdeaServer, { ideaId: args.ideaId, serverSecret })
      : state.currentIdea;
    if (!currentIdea) throw new Error('No founder idea available.');
    if (!state.selectedRoute) throw new Error('Select route before deployment.');
    if (!state.blueprint) throw new Error('Generate blueprint before deployment.');
    if (!state.ignitionConfig) throw new Error('Generate ignition config before deployment.');

    const callbackSecret =
      process.env.DEPLOYER_CALLBACK_SECRET ||
      `cb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

    const deploymentJobId = await ctx.runMutation((api as any).serverDeployments.createDeploymentJobServer, {
      organizationId,
      ideaId: currentIdea._id,
      blueprintId: state.blueprint._id,
      status: 'ready_to_deploy',
      provider: 'openclaw',
      target: 'runtime',
      callbackSecretRef: callbackSecret,
      serverSecret,
    });

    await ctx.runMutation((api as any).serverDeployments.appendDeploymentEventServer, {
      organizationId,
      deploymentJobId,
      type: 'deployment_requested',
      message: 'Deployment requested from founder control plane.',
      payload: { ideaId: currentIdea._id, blueprintId: state.blueprint._id },
      serverSecret,
    });

    const mockMode = process.env.OPENCLAW_DEPLOY_MOCK === 'true';

    await ctx.runMutation((api as any).serverDeployments.setDeploymentStatusServer, {
      deploymentJobId,
      status: 'deploying',
      target: mockMode ? 'mock' : 'live',
      serverSecret,
    });

    const payload = DeployerRequestSchema.parse({
      deploymentJobId,
      companyId: String(organizationId),
      founderId: currentIdea.founderUserId ? String(currentIdea.founderUserId) : 'unknown-founder',
      ideaId: String(currentIdea._id),
      selectedRoute: {
        profile: state.selectedRoute.selectedProfile,
        optionKey: state.selectedRoute.selectedOptionKey,
      },
      blueprintRef: {
        blueprintId: String(state.blueprint._id),
        version: state.blueprint.version,
      },
      ignition: {
        prompt: state.ignitionConfig.prompt,
        config: state.ignitionConfig.config,
      },
      initialAgents: state.blueprint.coreAgents.slice(0, 4),
      integrations: {
        chat: true,
        wallet: true,
        orchestration: false,
      },
      callback: {
        url: callbackUrl(),
        secret: callbackSecret,
      },
    });

    if (mockMode) {
      const runtimeInstanceId = await ctx.runMutation((api as any).serverDeployments.upsertRuntimeInstanceServer, {
        deploymentJobId,
        environment: 'staging',
        status: 'healthy',
        endpointUrl: `https://mock-openclaw.local/runtime/${deploymentJobId}`,
        vpsRef: 'mock-vps',
        containerRef: 'mock-container',
        serverSecret,
      });
      await ctx.runMutation((api as any).serverDeployments.setDeploymentStatusServer, {
        deploymentJobId,
        status: 'deployed',
        externalDeploymentId: `mock-${deploymentJobId}`,
        serverSecret,
      });
      await ctx.runMutation((api as any).serverDeployments.appendDeploymentEventServer, {
        organizationId,
        deploymentJobId,
        runtimeInstanceId,
        type: 'deployment_succeeded',
        message: 'Mock deploy mode: runtime provisioned successfully.',
        payload,
        serverSecret,
      });
      await ctx.runMutation((api as any).serverDeployments.appendDeploymentEventServer, {
        organizationId,
        deploymentJobId,
        runtimeInstanceId,
        type: 'runtime_healthy',
        message: 'Mock runtime marked healthy.',
        payload: { endpointUrl: `https://mock-openclaw.local/runtime/${deploymentJobId}` },
        serverSecret,
      });
      await ctx.runMutation((api as any).serverDeployments.appendDeploymentEventServer, {
        organizationId,
        deploymentJobId,
        runtimeInstanceId,
        type: 'ignition_applied',
        message: 'Mock ignition config applied to runtime.',
        payload: { mode: 'mock' },
        serverSecret,
      });
      return { ok: true, deploymentJobId, mode: 'mock' };
    }

    const deployerUrl = process.env.OPENCLAW_DEPLOYER_URL;
    if (!deployerUrl) throw new Error('Missing OPENCLAW_DEPLOYER_URL.');
    const deployerToken = process.env.OPENCLAW_DEPLOYER_TOKEN || process.env.OPENCLAW_BRIDGE_TOKEN;

    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-callback-secret': callbackSecret,
    };
    if (deployerToken) {
      headers.Authorization = `Bearer ${deployerToken}`;
    }
    const res = await fetch(deployerUrl, {
      method: 'POST',
      headers,
      body,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      await ctx.runMutation((api as any).serverDeployments.setDeploymentStatusServer, {
        deploymentJobId,
        status: 'failed',
        error: `Deployer ${res.status}: ${errText.slice(0, 220)}`,
        serverSecret,
      });
      await ctx.runMutation((api as any).serverDeployments.appendDeploymentEventServer, {
        organizationId,
        deploymentJobId,
        type: 'deployment_failed',
        level: 'error',
        message: 'External deployer rejected deployment request.',
        payload: { status: res.status, body: errText.slice(0, 200) },
        serverSecret,
      });
      throw new Error(`Deployer call failed (${res.status}).`);
    }

    const data = (await res.json().catch(() => ({}))) as { deploymentId?: string };
    await ctx.runMutation((api as any).serverDeployments.setDeploymentStatusServer, {
      deploymentJobId,
      status: 'deploying',
      externalDeploymentId: data.deploymentId,
      target: 'live',
      serverSecret,
    });
    await ctx.runMutation((api as any).serverDeployments.appendDeploymentEventServer, {
      organizationId,
      deploymentJobId,
      type: 'deployment_started',
      message: 'Deployment accepted by external deployer.',
      payload: { deploymentId: data.deploymentId ?? null },
      serverSecret,
    });

    return { ok: true, deploymentJobId, mode: 'live' };
  },
});

export const updateDeploymentFromWebhook = httpAction(async (ctx, req) => {
  try {
    const serverSecret = requireServerSecret();
    const rawBody = await req.text();
    const payload = DeployerWebhookSchema.parse(JSON.parse(rawBody));
    const job = await ctx.runQuery((api as any).serverDeployments.getDeploymentJobServer, {
      deploymentJobId: payload.deploymentJobId,
      serverSecret,
    });
    const expected = job.callbackSecretRef || process.env.DEPLOYER_CALLBACK_SECRET || '';
    const incoming = req.headers.get('x-callback-secret') || '';
    if (!expected || !incoming || incoming !== expected) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid callback secret' }), { status: 401 });
    }

    let deploymentStatus: 'deploying' | 'deployed' | 'failed' = 'deploying';
    let level: 'info' | 'warn' | 'error' = 'info';
    if (payload.status === 'deployment_succeeded' || payload.status === 'runtime_healthy' || payload.status === 'ignition_applied') {
      deploymentStatus = 'deployed';
    } else if (payload.status === 'deployment_failed') {
      deploymentStatus = 'failed';
      level = 'error';
    }

    await ctx.runMutation((api as any).serverDeployments.setDeploymentStatusServer, {
      deploymentJobId: payload.deploymentJobId,
      status: deploymentStatus,
      externalDeploymentId: payload.externalDeploymentId,
      error: payload.error,
      serverSecret,
    });

    let runtimeInstanceId: string | undefined;
    if (payload.runtime?.status || payload.runtime?.endpointUrl || payload.runtime?.vpsRef || payload.runtime?.containerRef) {
      runtimeInstanceId = await ctx.runMutation((api as any).serverDeployments.upsertRuntimeInstanceServer, {
        deploymentJobId: payload.deploymentJobId,
        environment: payload.runtime?.environment || 'staging',
        status: payload.runtime?.status || (deploymentStatus === 'failed' ? 'failed' : 'starting'),
        endpointUrl: payload.runtime?.endpointUrl,
        vpsRef: payload.runtime?.vpsRef,
        containerRef: payload.runtime?.containerRef,
        serverSecret,
      });
    }

    await ctx.runMutation((api as any).serverDeployments.appendDeploymentEventServer, {
      organizationId: job.organizationId,
      deploymentJobId: payload.deploymentJobId,
      runtimeInstanceId,
      type: payload.status,
      level,
      message: payload.message || payload.status.replaceAll('_', ' '),
      payload,
      serverSecret,
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : 'Webhook processing failed',
      }),
      { status: 500 }
    );
  }
});
