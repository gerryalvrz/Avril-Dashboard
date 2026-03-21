import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireEntity } from './lib/authz';

const SERVER_SECRET_ENV = 'CONVEX_SERVER_SECRET';

function requireServerSecret(serverSecret: string | undefined) {
  const expected = process.env[SERVER_SECRET_ENV];
  if (!expected || serverSecret !== expected) {
    throw new Error('Unauthorized: invalid or missing server secret.');
  }
}

const deploymentStatusValidator = v.union(
  v.literal('draft'),
  v.literal('ready_to_deploy'),
  v.literal('deploying'),
  v.literal('deployed'),
  v.literal('failed')
);

const runtimeStatusValidator = v.union(
  v.literal('starting'),
  v.literal('healthy'),
  v.literal('degraded'),
  v.literal('stopped'),
  v.literal('failed')
);

export const createDeploymentJobServer = mutation({
  args: {
    organizationId: v.id('organizations'),
    ideaId: v.id('founderIdeas'),
    blueprintId: v.id('companyBlueprints'),
    status: v.optional(deploymentStatusValidator),
    provider: v.optional(v.string()),
    target: v.optional(v.string()),
    callbackSecretRef: v.optional(v.string()),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    requireEntity(await ctx.db.get(args.organizationId), 'Organization');
    requireEntity(await ctx.db.get(args.ideaId), 'Founder idea');
    requireEntity(await ctx.db.get(args.blueprintId), 'Company blueprint');

    const now = new Date().toISOString();
    const jobId = await ctx.db.insert('deploymentJobs', {
      organizationId: args.organizationId,
      ideaId: args.ideaId,
      blueprintId: args.blueprintId,
      status: args.status ?? 'draft',
      provider: args.provider,
      target: args.target,
      callbackSecretRef: args.callbackSecretRef,
      createdAt: now,
      updatedAt: now,
    });
    return jobId;
  },
});

export const setDeploymentStatusServer = mutation({
  args: {
    deploymentJobId: v.id('deploymentJobs'),
    status: deploymentStatusValidator,
    externalDeploymentId: v.optional(v.string()),
    error: v.optional(v.string()),
    target: v.optional(v.string()),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    requireEntity(await ctx.db.get(args.deploymentJobId), 'Deployment job');
    await ctx.db.patch(args.deploymentJobId, {
      status: args.status,
      externalDeploymentId: args.externalDeploymentId,
      error: args.error,
      target: args.target,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const upsertRuntimeInstanceServer = mutation({
  args: {
    deploymentJobId: v.id('deploymentJobs'),
    environment: v.union(v.literal('staging'), v.literal('production')),
    status: runtimeStatusValidator,
    endpointUrl: v.optional(v.string()),
    vpsRef: v.optional(v.string()),
    containerRef: v.optional(v.string()),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    requireEntity(await ctx.db.get(args.deploymentJobId), 'Deployment job');
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query('runtimeInstances')
      .withIndex('by_job', (q) => q.eq('jobId', args.deploymentJobId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        environment: args.environment,
        status: args.status,
        endpointUrl: args.endpointUrl,
        vpsRef: args.vpsRef,
        containerRef: args.containerRef,
        lastHeartbeatAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('runtimeInstances', {
      jobId: args.deploymentJobId,
      environment: args.environment,
      status: args.status,
      endpointUrl: args.endpointUrl,
      vpsRef: args.vpsRef,
      containerRef: args.containerRef,
      lastHeartbeatAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const appendDeploymentEventServer = mutation({
  args: {
    organizationId: v.id('organizations'),
    deploymentJobId: v.id('deploymentJobs'),
    runtimeInstanceId: v.optional(v.id('runtimeInstances')),
    type: v.string(),
    message: v.string(),
    level: v.optional(v.union(v.literal('info'), v.literal('warn'), v.literal('error'))),
    payload: v.optional(v.any()),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    requireEntity(await ctx.db.get(args.organizationId), 'Organization');
    requireEntity(await ctx.db.get(args.deploymentJobId), 'Deployment job');
    if (args.runtimeInstanceId) requireEntity(await ctx.db.get(args.runtimeInstanceId), 'Runtime instance');

    return await ctx.db.insert('agentEvents', {
      organizationId: args.organizationId,
      deploymentJobId: args.deploymentJobId,
      runtimeInstanceId: args.runtimeInstanceId,
      level: args.level ?? 'info',
      type: args.type,
      message: args.message,
      payload: args.payload,
      createdAt: new Date().toISOString(),
    });
  },
});

export const getDeploymentJobServer = query({
  args: {
    deploymentJobId: v.id('deploymentJobs'),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    return requireEntity(await ctx.db.get(args.deploymentJobId), 'Deployment job');
  },
});
