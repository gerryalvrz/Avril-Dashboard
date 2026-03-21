import { z } from 'zod';

export const FounderIntakeSchema = z.object({
  founderName: z.string().min(1).max(120),
  rawIdea: z.string().min(10).max(4000),
  targetUser: z.string().min(1).max(500),
  problem: z.string().min(1).max(1000),
  monetizationPreference: z.string().min(1).max(200),
  businessModelPreference: z.string().min(1).max(200),
  desiredAutomationLevel: z.string().min(1).max(120),
  skillsResources: z.string().min(1).max(1000),
  timeAvailable: z.string().min(1).max(200),
  country: z.string().min(1).max(120),
  language: z.string().min(1).max(120),
  channelPreferences: z.array(z.string().min(1).max(100)).min(1).max(8),
  riskTolerance: z.string().min(1).max(120),
});

export const FounderBriefSchema = z.object({
  businessSummary: z.string().min(20).max(1200),
  clarifiedProblem: z.string().min(10).max(800),
  targetCustomer: z.string().min(5).max(500),
  likelyOffer: z.string().min(5).max(400),
  likelyRevenuePath: z.string().min(5).max(500),
  constraints: z.array(z.string().min(3).max(300)).min(1).max(8),
  launchPosture: z.string().min(5).max(300),
  uncertaintyFlags: z.array(z.string().min(3).max(250)).min(1).max(8),
});

export const CompanyOptionSchema = z.object({
  label: z.enum(['conservative', 'balanced', 'ambitious']),
  businessThesis: z.string().min(10).max(800),
  offer: z.string().min(5).max(500),
  targetUser: z.string().min(5).max(500),
  revenuePath: z.string().min(5).max(500),
  minimumCompanyStructure: z.array(z.string().min(2).max(200)).min(1).max(8),
  minimumAgentStructure: z.array(z.string().min(2).max(200)).min(1).max(8),
  complexityScore: z.number().int().min(1).max(10),
  launchMotion: z.string().min(5).max(300),
  whyItFits: z.string().min(5).max(500),
});

export const CompanyOptionsSchema = z.object({
  options: z
    .array(CompanyOptionSchema)
    .length(3)
    .superRefine((items, ctx) => {
      const labels = new Set(items.map((item) => item.label));
      for (const required of ['conservative', 'balanced', 'ambitious'] as const) {
        if (!labels.has(required)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Missing required option label: ${required}`,
          });
        }
      }
    }),
});

export const BusinessBlueprintSchema = z.object({
  companyStructure: z.array(z.string().min(2).max(250)).min(1).max(10),
  coreAgents: z.array(z.string().min(2).max(200)).min(1).max(6),
  minimalSubagents: z.array(z.string().min(2).max(200)).max(8),
  workflows: z.array(z.string().min(5).max(300)).min(1).max(10),
  approvalsNeeded: z.array(z.string().min(3).max(250)).min(1).max(10),
  memoryCrmRequirements: z.array(z.string().min(3).max(250)).min(1).max(10),
  toolRequirements: z.array(z.string().min(3).max(250)).min(1).max(10),
  kpis: z.array(z.string().min(3).max(200)).min(1).max(10),
});

export const IgnitionConfigSchema = z.object({
  businessGoal: z.string().min(10).max(600),
  humanInLoopMode: z.string().min(5).max(240),
  firstAgentsOnly: z.array(z.string().min(2).max(200)).min(1).max(6),
  allowedTools: z.array(z.string().min(2).max(120)).min(1).max(12),
  memoryRules: z.array(z.string().min(3).max(240)).min(1).max(10),
  boundaries: z.array(z.string().min(3).max(240)).min(1).max(10),
  escalationRules: z.array(z.string().min(3).max(240)).min(1).max(10),
});

export type FounderIntake = z.infer<typeof FounderIntakeSchema>;
export type FounderBrief = z.infer<typeof FounderBriefSchema>;
export type CompanyOption = z.infer<typeof CompanyOptionSchema>;
export type CompanyOptions = z.infer<typeof CompanyOptionsSchema>;
export type BusinessBlueprint = z.infer<typeof BusinessBlueprintSchema>;
export type IgnitionConfig = z.infer<typeof IgnitionConfigSchema>;
