import { action } from './_generated/server';
import { api } from './_generated/api';
import { v } from 'convex/values';
import { z } from 'zod';
import { callVeniceStructured } from './lib/venice';
import {
  founderBriefPrompt,
  companyOptionsPrompt,
  businessBlueprintPrompt,
  ignitionConfigPrompt,
} from './lib/founderPrompts';
import {
  FounderBriefSchema,
  CompanyOptionsSchema,
  BusinessBlueprintSchema,
  IgnitionConfigSchema,
} from '../src/modules/founder/schemas';

const SERVER_SECRET_ENV = 'CONVEX_SERVER_SECRET';

function requireServerSecret(): string {
  const value = process.env[SERVER_SECRET_ENV];
  if (!value) throw new Error('Missing CONVEX_SERVER_SECRET in Convex environment.');
  return value;
}

async function resolveState(ctx: any, ideaId?: string) {
  const serverSecret = requireServerSecret();
  const organizationId = await ctx.runQuery((api as any).bootstrap.getDefaultOrganizationId, { serverSecret });
  if (!organizationId) throw new Error('No default organization found.');
  const state = await ctx.runQuery((api as any).serverControlPlane.getControlPlaneStateServer, {
    organizationId,
    serverSecret,
  });
  let currentIdea = state?.currentIdea ?? null;
  if (ideaId) {
    currentIdea = await ctx.runQuery((api as any).serverFounder.getFounderIdeaServer, {
      ideaId,
      serverSecret,
    });
  }
  if (!currentIdea) throw new Error('No founder idea found. Submit intake first.');
  return { serverSecret, organizationId, state: { ...state, currentIdea } };
}

function stringifyZodError(err: z.ZodError) {
  return err.issues.map((i) => `${i.path.join('.') || 'root'}: ${i.message}`).join('; ');
}

export const generateFounderBrief = action({
  args: { ideaId: v.optional(v.id('founderIdeas')) },
  handler: async (ctx, args) => {
    const { serverSecret, state } = await resolveState(ctx, args.ideaId);
    const prompt = founderBriefPrompt({ idea: state.currentIdea });

    const result = await callVeniceStructured({
      schema: FounderBriefSchema,
      system: prompt.system,
      user: prompt.user,
      temperature: 0.1,
    }).catch((err) => {
      if (err instanceof z.ZodError) {
        throw new Error(`Founder brief validation failed: ${stringifyZodError(err)}`);
      }
      throw err;
    });

    await ctx.runMutation((api as any).serverFounder.saveFounderBriefServer, {
      ideaId: state.currentIdea._id,
      businessSummary: result.parsed.businessSummary,
      clarifiedProblem: result.parsed.clarifiedProblem,
      targetCustomer: result.parsed.targetCustomer,
      likelyOfferType: result.parsed.likelyOffer,
      likelyRevenuePath: result.parsed.likelyRevenuePath,
      constraints: result.parsed.constraints,
      recommendedLaunchPosture: result.parsed.launchPosture,
      uncertaintyFlags: result.parsed.uncertaintyFlags,
      rawOutput: result.rawText,
      promptVersion: prompt.version,
      serverSecret,
    });

    return { ok: true, ideaId: state.currentIdea._id, promptVersion: prompt.version };
  },
});

export const generateCompanyOptions = action({
  args: { ideaId: v.optional(v.id('founderIdeas')) },
  handler: async (ctx, args) => {
    const { serverSecret, state } = await resolveState(ctx, args.ideaId);
    const prompt = companyOptionsPrompt({
      idea: state.currentIdea,
      founderBrief: state.founderBrief,
    });

    const result = await callVeniceStructured({
      schema: CompanyOptionsSchema,
      system: prompt.system,
      user: prompt.user,
      temperature: 0.1,
    }).catch((err) => {
      if (err instanceof z.ZodError) {
        throw new Error(`Company options validation failed: ${stringifyZodError(err)}`);
      }
      throw err;
    });

    await ctx.runMutation((api as any).serverFounder.replaceCompanyOptionsServer, {
      ideaId: state.currentIdea._id,
      options: result.parsed.options.map((opt) => ({
        profile: opt.label,
        optionKey: opt.label,
        name: `${opt.label[0].toUpperCase()}${opt.label.slice(1)} Route`,
        businessThesis: opt.businessThesis,
        offer: opt.offer,
        targetUser: opt.targetUser,
        revenuePath: opt.revenuePath,
        minimumCompanyStructure: opt.minimumCompanyStructure,
        minimumAgentStructure: opt.minimumAgentStructure,
        complexityScore: opt.complexityScore,
        recommendedLaunchMotion: opt.launchMotion,
        fitReason: opt.whyItFits,
        rawOutput: JSON.stringify(opt),
        promptVersion: prompt.version,
      })),
      serverSecret,
    });

    return {
      ok: true,
      ideaId: state.currentIdea._id,
      generatedProfiles: result.parsed.options.map((o) => o.label),
      promptVersion: prompt.version,
    };
  },
});

export const generateBusinessBlueprint = action({
  args: { ideaId: v.optional(v.id('founderIdeas')) },
  handler: async (ctx, args) => {
    const { serverSecret, state } = await resolveState(ctx, args.ideaId);
    if (!state.selectedRoute) throw new Error('Select a company option before generating blueprint.');

    const prompt = businessBlueprintPrompt({
      idea: state.currentIdea,
      founderBrief: state.founderBrief,
      options: state.options,
      selectedRoute: state.selectedRoute,
    });

    const result = await callVeniceStructured({
      schema: BusinessBlueprintSchema,
      system: prompt.system,
      user: prompt.user,
      temperature: 0.1,
    }).catch((err) => {
      if (err instanceof z.ZodError) {
        throw new Error(`Blueprint validation failed: ${stringifyZodError(err)}`);
      }
      throw err;
    });

    const blueprintId = await ctx.runMutation((api as any).serverFounder.createBusinessBlueprintServer, {
      ideaId: state.currentIdea._id,
      routeId: state.selectedRoute._id,
      selectedCompanyStructure: result.parsed.companyStructure,
      coreAgents: result.parsed.coreAgents,
      subAgents: result.parsed.minimalSubagents,
      workflows: result.parsed.workflows,
      approvalsNeeded: result.parsed.approvalsNeeded,
      memoryRequirements: result.parsed.memoryCrmRequirements,
      toolRequirements: result.parsed.toolRequirements,
      kpis: result.parsed.kpis,
      ignitionPromptInput: {
        companyStructure: result.parsed.companyStructure,
        coreAgents: result.parsed.coreAgents,
        workflows: result.parsed.workflows,
        kpis: result.parsed.kpis,
      },
      rawOutput: result.rawText,
      promptVersion: prompt.version,
      serverSecret,
    });

    return { ok: true, ideaId: state.currentIdea._id, blueprintId, promptVersion: prompt.version };
  },
});

export const generateIgnitionPrompt = action({
  args: { ideaId: v.optional(v.id('founderIdeas')) },
  handler: async (ctx, args) => {
    const { serverSecret, state } = await resolveState(ctx, args.ideaId);
    if (!state.blueprint) throw new Error('Generate blueprint before ignition config.');

    const prompt = ignitionConfigPrompt({
      idea: state.currentIdea,
      founderBrief: state.founderBrief,
      selectedRoute: state.selectedRoute,
      blueprint: state.blueprint,
    });

    const result = await callVeniceStructured({
      schema: IgnitionConfigSchema,
      system: prompt.system,
      user: prompt.user,
      temperature: 0.1,
    }).catch((err) => {
      if (err instanceof z.ZodError) {
        throw new Error(`Ignition config validation failed: ${stringifyZodError(err)}`);
      }
      throw err;
    });

    const renderedPrompt = [
      `Business Goal: ${result.parsed.businessGoal}`,
      `Human-in-the-loop: ${result.parsed.humanInLoopMode}`,
      `First Agents: ${result.parsed.firstAgentsOnly.join(', ')}`,
      `Allowed Tools: ${result.parsed.allowedTools.join(', ')}`,
      `Memory Rules: ${result.parsed.memoryRules.join(' | ')}`,
      `Boundaries: ${result.parsed.boundaries.join(' | ')}`,
      `Escalation Rules: ${result.parsed.escalationRules.join(' | ')}`,
    ].join('\n');

    await ctx.runMutation((api as any).serverFounder.saveIgnitionConfigServer, {
      blueprintId: state.blueprint._id,
      prompt: renderedPrompt,
      config: result.parsed,
      model: 'venice',
      serverSecret,
    });

    return { ok: true, ideaId: state.currentIdea._id, blueprintId: state.blueprint._id, promptVersion: prompt.version };
  },
});
