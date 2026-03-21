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

const optionProfileValidator = v.union(
  v.literal('conservative'),
  v.literal('balanced'),
  v.literal('ambitious')
);

export const createFounderIdeaServer = mutation({
  args: {
    organizationId: v.id('organizations'),
    founderUserId: v.optional(v.id('users')),
    title: v.string(),
    ideaText: v.string(),
    targetUser: v.optional(v.string()),
    problem: v.optional(v.string()),
    monetizationPreference: v.optional(v.string()),
    businessModelPreference: v.optional(v.string()),
    desiredAutomationLevel: v.optional(v.string()),
    skillsResources: v.optional(v.string()),
    timeAvailable: v.optional(v.string()),
    country: v.optional(v.string()),
    language: v.optional(v.string()),
    channelPreferences: v.optional(v.array(v.string())),
    riskTolerance: v.optional(v.string()),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    requireEntity(await ctx.db.get(args.organizationId), 'Organization');
    if (args.founderUserId) requireEntity(await ctx.db.get(args.founderUserId), 'User');

    const now = new Date().toISOString();
    return await ctx.db.insert('founderIdeas', {
      organizationId: args.organizationId,
      founderUserId: args.founderUserId,
      title: args.title.trim().slice(0, 120) || 'Untitled idea',
      ideaText: args.ideaText.trim(),
      targetUser: args.targetUser?.trim(),
      problem: args.problem?.trim(),
      monetizationPreference: args.monetizationPreference?.trim(),
      businessModelPreference: args.businessModelPreference?.trim(),
      desiredAutomationLevel: args.desiredAutomationLevel?.trim(),
      skillsResources: args.skillsResources?.trim(),
      timeAvailable: args.timeAvailable?.trim(),
      country: args.country?.trim(),
      language: args.language?.trim(),
      channelPreferences: args.channelPreferences,
      riskTolerance: args.riskTolerance?.trim(),
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const saveFounderBriefServer = mutation({
  args: {
    ideaId: v.id('founderIdeas'),
    businessSummary: v.string(),
    clarifiedProblem: v.string(),
    targetCustomer: v.string(),
    likelyOfferType: v.string(),
    likelyRevenuePath: v.string(),
    constraints: v.array(v.string()),
    recommendedLaunchPosture: v.string(),
    uncertaintyFlags: v.array(v.string()),
    rawOutput: v.optional(v.string()),
    promptVersion: v.optional(v.string()),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    requireEntity(await ctx.db.get(args.ideaId), 'Founder idea');
    const now = new Date().toISOString();

    const existing = await ctx.db
      .query('founderBriefs')
      .withIndex('by_idea', (q) => q.eq('ideaId', args.ideaId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        businessSummary: args.businessSummary,
        clarifiedProblem: args.clarifiedProblem,
        targetCustomer: args.targetCustomer,
        likelyOfferType: args.likelyOfferType,
        likelyRevenuePath: args.likelyRevenuePath,
        constraints: args.constraints,
        recommendedLaunchPosture: args.recommendedLaunchPosture,
        uncertaintyFlags: args.uncertaintyFlags,
        rawOutput: args.rawOutput,
        promptVersion: args.promptVersion,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('founderBriefs', {
        ideaId: args.ideaId,
        businessSummary: args.businessSummary,
        clarifiedProblem: args.clarifiedProblem,
        targetCustomer: args.targetCustomer,
        likelyOfferType: args.likelyOfferType,
        likelyRevenuePath: args.likelyRevenuePath,
        constraints: args.constraints,
        recommendedLaunchPosture: args.recommendedLaunchPosture,
        uncertaintyFlags: args.uncertaintyFlags,
        rawOutput: args.rawOutput,
        promptVersion: args.promptVersion,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.ideaId, { status: 'briefing', updatedAt: now });
  },
});

export const replaceCompanyOptionsServer = mutation({
  args: {
    ideaId: v.id('founderIdeas'),
    options: v.array(
      v.object({
        profile: optionProfileValidator,
        optionKey: v.string(),
        name: v.string(),
        businessThesis: v.string(),
        offer: v.string(),
        targetUser: v.string(),
        revenuePath: v.string(),
        minimumCompanyStructure: v.array(v.string()),
        minimumAgentStructure: v.array(v.string()),
        complexityScore: v.number(),
        recommendedLaunchMotion: v.string(),
        fitReason: v.string(),
        rawOutput: v.optional(v.string()),
        promptVersion: v.optional(v.string()),
      })
    ),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    requireEntity(await ctx.db.get(args.ideaId), 'Founder idea');
    const now = new Date().toISOString();

    const existing = await ctx.db
      .query('companyOptions')
      .withIndex('by_idea', (q) => q.eq('ideaId', args.ideaId))
      .collect();

    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    for (const option of args.options) {
      await ctx.db.insert('companyOptions', {
        ideaId: args.ideaId,
        ...option,
        createdAt: now,
      });
    }

    await ctx.db.patch(args.ideaId, { status: 'optioning', updatedAt: now });
  },
});

export const selectCompanyOptionServer = mutation({
  args: {
    ideaId: v.id('founderIdeas'),
    selectedOptionKey: v.string(),
    selectedProfile: optionProfileValidator,
    rationale: v.optional(v.string()),
    selectedByUserId: v.optional(v.id('users')),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    requireEntity(await ctx.db.get(args.ideaId), 'Founder idea');
    if (args.selectedByUserId) requireEntity(await ctx.db.get(args.selectedByUserId), 'User');

    const now = new Date().toISOString();
    const routeId = await ctx.db.insert('selectedRoutes', {
      ideaId: args.ideaId,
      selectedOptionKey: args.selectedOptionKey,
      selectedProfile: args.selectedProfile,
      rationale: args.rationale,
      selectedByUserId: args.selectedByUserId,
      createdAt: now,
    });

    await ctx.db.patch(args.ideaId, { status: 'routed', updatedAt: now });
    return routeId;
  },
});

export const createBusinessBlueprintServer = mutation({
  args: {
    ideaId: v.id('founderIdeas'),
    routeId: v.id('selectedRoutes'),
    selectedCompanyStructure: v.array(v.string()),
    coreAgents: v.array(v.string()),
    subAgents: v.array(v.string()),
    workflows: v.array(v.string()),
    approvalsNeeded: v.array(v.string()),
    memoryRequirements: v.array(v.string()),
    toolRequirements: v.array(v.string()),
    kpis: v.array(v.string()),
    ignitionPromptInput: v.any(),
    rawOutput: v.optional(v.string()),
    promptVersion: v.optional(v.string()),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    requireEntity(await ctx.db.get(args.ideaId), 'Founder idea');
    requireEntity(await ctx.db.get(args.routeId), 'Selected route');

    const existing = await ctx.db
      .query('companyBlueprints')
      .withIndex('by_idea', (q) => q.eq('ideaId', args.ideaId))
      .collect();

    const now = new Date().toISOString();
    const version = existing.length + 1;
    const blueprintId = await ctx.db.insert('companyBlueprints', {
      ideaId: args.ideaId,
      routeId: args.routeId,
      version,
      selectedCompanyStructure: args.selectedCompanyStructure,
      coreAgents: args.coreAgents,
      subAgents: args.subAgents,
      workflows: args.workflows,
      approvalsNeeded: args.approvalsNeeded,
      memoryRequirements: args.memoryRequirements,
      toolRequirements: args.toolRequirements,
      kpis: args.kpis,
      ignitionPromptInput: args.ignitionPromptInput,
      rawOutput: args.rawOutput,
      promptVersion: args.promptVersion,
      createdAt: now,
    });

    await ctx.db.patch(args.ideaId, { status: 'blueprinted', updatedAt: now });
    return blueprintId;
  },
});

export const saveIgnitionConfigServer = mutation({
  args: {
    blueprintId: v.id('companyBlueprints'),
    prompt: v.string(),
    config: v.any(),
    model: v.optional(v.union(v.literal('codex'), v.literal('opus'), v.literal('venice'))),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    const blueprint = requireEntity(await ctx.db.get(args.blueprintId), 'Company blueprint');
    const now = new Date().toISOString();

    const existing = await ctx.db
      .query('ignitionConfigs')
      .withIndex('by_blueprint', (q) => q.eq('blueprintId', args.blueprintId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        prompt: args.prompt,
        config: args.config,
        model: args.model,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('ignitionConfigs', {
        blueprintId: args.blueprintId,
        prompt: args.prompt,
        config: args.config,
        model: args.model,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(blueprint.ideaId, { status: 'ignition_ready', updatedAt: now });
  },
});

export const getLatestFounderIdeaServer = query({
  args: {
    organizationId: v.id('organizations'),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    const list = await ctx.db
      .query('founderIdeas')
      .withIndex('by_org_updatedAt', (q) => q.eq('organizationId', args.organizationId))
      .collect();
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
  },
});

export const getFounderIdeaServer = query({
  args: {
    ideaId: v.id('founderIdeas'),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);
    return requireEntity(await ctx.db.get(args.ideaId), 'Founder idea');
  },
});
