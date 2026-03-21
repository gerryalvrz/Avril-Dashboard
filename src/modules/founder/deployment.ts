import { z } from 'zod';

export const DeploymentStatusSchema = z.enum([
  'draft',
  'ready_to_deploy',
  'deploying',
  'deployed',
  'failed',
]);

export const RuntimeStatusSchema = z.enum([
  'starting',
  'healthy',
  'degraded',
  'stopped',
  'failed',
]);

export const DeployerRequestSchema = z.object({
  deploymentJobId: z.string().min(1),
  companyId: z.string().min(1),
  founderId: z.string().min(1),
  ideaId: z.string().min(1),
  selectedRoute: z.object({
    profile: z.enum(['conservative', 'balanced', 'ambitious']),
    optionKey: z.string().min(1),
  }),
  blueprintRef: z.object({
    blueprintId: z.string().min(1),
    version: z.number().int().min(1),
  }),
  ignition: z.object({
    prompt: z.string().min(1),
    config: z.any(),
  }),
  initialAgents: z.array(z.string().min(1)).min(1).max(8),
  integrations: z.object({
    chat: z.boolean().optional(),
    wallet: z.boolean().optional(),
    orchestration: z.boolean().optional(),
  }),
  callback: z.object({
    url: z.string().url(),
    secret: z.string().min(8),
  }),
});

export const DeployerWebhookSchema = z.object({
  deploymentJobId: z.string().min(1),
  externalDeploymentId: z.string().optional(),
  status: z.enum(['deployment_started', 'deployment_succeeded', 'deployment_failed', 'runtime_healthy', 'ignition_applied']),
  runtime: z
    .object({
      environment: z.enum(['staging', 'production']).optional(),
      status: RuntimeStatusSchema.optional(),
      endpointUrl: z.string().url().optional(),
      vpsRef: z.string().optional(),
      containerRef: z.string().optional(),
    })
    .optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type DeployerRequest = z.infer<typeof DeployerRequestSchema>;
export type DeployerWebhook = z.infer<typeof DeployerWebhookSchema>;
