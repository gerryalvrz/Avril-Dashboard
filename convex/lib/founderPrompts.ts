type PromptInput = {
  idea: any;
  founderBrief?: any | null;
  options?: any[];
  selectedRoute?: any | null;
  blueprint?: any | null;
};

export const PROMPT_VERSIONS = {
  founderBrief: 'founder-brief.v1',
  companyOptions: 'company-options.v1',
  businessBlueprint: 'business-blueprint.v1',
  ignitionConfig: 'ignition-config.v1',
} as const;

export function founderBriefPrompt(input: PromptInput) {
  return {
    version: PROMPT_VERSIONS.founderBrief,
    system:
      'You are a startup systems architect. Return strict JSON only. No markdown, no prose outside JSON.',
    user: JSON.stringify(
      {
        task: 'Transform founder intake into a structured founder brief.',
        requiredShape: {
          businessSummary: 'string',
          clarifiedProblem: 'string',
          targetCustomer: 'string',
          likelyOffer: 'string',
          likelyRevenuePath: 'string',
          constraints: ['string'],
          launchPosture: 'string',
          uncertaintyFlags: ['string'],
        },
        constraints: ['be concrete', 'minimal assumptions', 'max 8 constraints', 'max 8 uncertainty flags'],
        founderIntake: input.idea,
      },
      null,
      2
    ),
  };
}

export function companyOptionsPrompt(input: PromptInput) {
  return {
    version: PROMPT_VERSIONS.companyOptions,
    system:
      'You are a startup operating model planner. Return strict JSON only with exactly three options.',
    user: JSON.stringify(
      {
        task: 'Generate exactly 3 company options: conservative, balanced, ambitious.',
        requiredShape: {
          options: [
            {
              label: 'conservative|balanced|ambitious',
              businessThesis: 'string',
              offer: 'string',
              targetUser: 'string',
              revenuePath: 'string',
              minimumCompanyStructure: ['string'],
              minimumAgentStructure: ['string'],
              complexityScore: 'integer 1-10',
              launchMotion: 'string',
              whyItFits: 'string',
            },
          ],
        },
        founderIntake: input.idea,
        founderBrief: input.founderBrief ?? null,
      },
      null,
      2
    ),
  };
}

export function businessBlueprintPrompt(input: PromptInput) {
  return {
    version: PROMPT_VERSIONS.businessBlueprint,
    system:
      'You design minimal business operating systems. Return strict JSON only. Keep agent count low.',
    user: JSON.stringify(
      {
        task: 'Generate a minimum viable business blueprint for the selected route.',
        requiredShape: {
          companyStructure: ['string'],
          coreAgents: ['string'],
          minimalSubagents: ['string'],
          workflows: ['string'],
          approvalsNeeded: ['string'],
          memoryCrmRequirements: ['string'],
          toolRequirements: ['string'],
          kpis: ['string'],
        },
        founderIntake: input.idea,
        founderBrief: input.founderBrief ?? null,
        options: input.options ?? [],
        selectedRoute: input.selectedRoute ?? null,
      },
      null,
      2
    ),
  };
}

export function ignitionConfigPrompt(input: PromptInput) {
  return {
    version: PROMPT_VERSIONS.ignitionConfig,
    system:
      'You configure safe first-runtime launch settings. Return strict JSON only. Limit to first agents.',
    user: JSON.stringify(
      {
        task: 'Generate ignition prompt/config for OpenClaw runtime.',
        requiredShape: {
          businessGoal: 'string',
          humanInLoopMode: 'string',
          firstAgentsOnly: ['string'],
          allowedTools: ['string'],
          memoryRules: ['string'],
          boundaries: ['string'],
          escalationRules: ['string'],
        },
        founderIntake: input.idea,
        founderBrief: input.founderBrief ?? null,
        selectedRoute: input.selectedRoute ?? null,
        blueprint: input.blueprint ?? null,
      },
      null,
      2
    ),
  };
}
