import { query } from './_generated/server';
import { v } from 'convex/values';

const SERVER_SECRET_ENV = 'CONVEX_SERVER_SECRET';

function requireServerSecret(serverSecret: string | undefined) {
  const expected = process.env[SERVER_SECRET_ENV];
  if (!expected || serverSecret !== expected) {
    throw new Error('Unauthorized: invalid or missing server secret.');
  }
}

export const getControlPlaneStateServer = query({
  args: {
    organizationId: v.id('organizations'),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    const ideas = await ctx.db
      .query('founderIdeas')
      .withIndex('by_org_updatedAt', (q) => q.eq('organizationId', args.organizationId))
      .collect();
    const currentIdea = ideas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;

    if (!currentIdea) {
      const pendingApprovals = await ctx.db
        .query('approvals')
        .withIndex('by_org_status', (q) => q.eq('organizationId', args.organizationId).eq('status', 'pending'))
        .collect();
      const latestAgentEvents = await ctx.db
        .query('agentEvents')
        .withIndex('by_org_time', (q) => q.eq('organizationId', args.organizationId))
        .order('desc')
        .take(30);
      return {
        currentIdea: null,
        founderBrief: null,
        options: [],
        selectedRoute: null,
        blueprint: null,
        ignitionConfig: null,
        deploymentJob: null,
        runtimeInstance: null,
        pendingApprovals,
        recentAgentEvents: latestAgentEvents.reverse(),
      };
    }

    const founderBrief = await ctx.db
      .query('founderBriefs')
      .withIndex('by_idea', (q) => q.eq('ideaId', currentIdea._id))
      .first();
    const options = await ctx.db
      .query('companyOptions')
      .withIndex('by_idea', (q) => q.eq('ideaId', currentIdea._id))
      .collect();
    const routes = await ctx.db
      .query('selectedRoutes')
      .withIndex('by_idea', (q) => q.eq('ideaId', currentIdea._id))
      .collect();
    const selectedRoute = routes.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

    const blueprints = await ctx.db
      .query('companyBlueprints')
      .withIndex('by_idea', (q) => q.eq('ideaId', currentIdea._id))
      .collect();
    const blueprint = blueprints.sort((a, b) => b.version - a.version)[0] ?? null;

    const ignitionConfig = blueprint
      ? await ctx.db
          .query('ignitionConfigs')
          .withIndex('by_blueprint', (q) => q.eq('blueprintId', blueprint._id))
          .first()
      : null;

    const jobs = await ctx.db
      .query('deploymentJobs')
      .withIndex('by_idea', (q) => q.eq('ideaId', currentIdea._id))
      .collect();
    const deploymentJob = jobs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
    const runtimeInstance = deploymentJob
      ? await ctx.db
          .query('runtimeInstances')
          .withIndex('by_job', (q) => q.eq('jobId', deploymentJob._id))
          .first()
      : null;

    const pendingApprovals = await ctx.db
      .query('approvals')
      .withIndex('by_org_status', (q) => q.eq('organizationId', args.organizationId).eq('status', 'pending'))
      .collect();

    const recentAgentEvents = await ctx.db
      .query('agentEvents')
      .withIndex('by_org_time', (q) => q.eq('organizationId', args.organizationId))
      .order('desc')
      .take(30);

    return {
      currentIdea,
      founderBrief,
      options,
      selectedRoute,
      blueprint,
      ignitionConfig,
      deploymentJob,
      runtimeInstance,
      pendingApprovals,
      recentAgentEvents: recentAgentEvents.reverse(),
    };
  },
});
