import { ConvexHttpClient } from 'convex/browser';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
const serverSecret = process.env.CONVEX_SERVER_SECRET;

if (!convexUrl) {
  throw new Error('Missing NEXT_PUBLIC_CONVEX_URL or CONVEX_URL.');
}
if (!serverSecret) {
  throw new Error('Missing CONVEX_SERVER_SECRET.');
}

const client = new ConvexHttpClient(convexUrl);
const call = {
  query: (fn, args) => client.query(fn, args),
  mutation: (fn, args) => client.mutation(fn, args),
  action: (fn, args) => client.action(fn, args),
};

async function run() {
  console.log('1) Resolve default organization');
  let organizationId = await call.query('bootstrap:getDefaultOrganizationId', { serverSecret });
  if (!organizationId) {
    organizationId = await call.mutation('bootstrap:createDefaultOrganizationIfMissing', { serverSecret });
  }

  console.log('2) Create founder idea');
  const ideaId = await call.mutation('serverFounder:createFounderIdeaServer', {
    organizationId,
    title: 'Happy Path Test Idea',
    ideaText: 'Build a founder control plane demo with AI planning and deployment lifecycle.',
    targetUser: 'solo founder',
    problem: 'founders lack a coherent operator dashboard',
    monetizationPreference: 'subscription',
    businessModelPreference: 'b2b saas',
    desiredAutomationLevel: 'medium',
    skillsResources: 'small product team',
    timeAvailable: 'part-time',
    country: 'global',
    language: 'english',
    channelPreferences: ['x', 'direct outreach'],
    riskTolerance: 'medium',
    serverSecret,
  });

  console.log('3) Generate company options');
  await call.action('founderGeneration:generateCompanyOptions', { ideaId });

  const state = await call.query('serverControlPlane:getControlPlaneStateServer', {
    organizationId,
    serverSecret,
  });
  if (!state?.options || state.options.length < 3) {
    throw new Error('Options generation failed: fewer than 3 options.');
  }

  console.log('4) Select route');
  const conservative = state.options.find((o) => o.profile === 'conservative') || state.options[0];
  const routeId = await call.mutation('serverFounder:selectCompanyOptionServer', {
    ideaId,
    selectedOptionKey: conservative.optionKey,
    selectedProfile: conservative.profile,
    rationale: 'Happy path test selection.',
    serverSecret,
  });

  console.log('5) Create minimal blueprint + deployment job');
  const blueprintId = await call.mutation('serverFounder:createBusinessBlueprintServer', {
    ideaId,
    routeId,
    selectedCompanyStructure: ['Founder', 'Operator'],
    coreAgents: ['PlannerAgent', 'OpsAgent'],
    subAgents: [],
    workflows: ['Intake -> Plan -> Deploy'],
    approvalsNeeded: ['Founder approval before deploy'],
    memoryRequirements: ['Founder CRM state'],
    toolRequirements: ['convex', 'openclaw'],
    kpis: ['time-to-deploy'],
    ignitionPromptInput: { mode: 'test' },
    serverSecret,
  });
  const deploymentJobId = await call.mutation('serverDeployments:createDeploymentJobServer', {
    organizationId,
    ideaId,
    blueprintId,
    status: 'draft',
    provider: 'openclaw',
    target: 'runtime',
    serverSecret,
  });

  console.log('PASS');
  console.log(JSON.stringify({ organizationId, ideaId, routeId, blueprintId, deploymentJobId }, null, 2));
}

run().catch((err) => {
  console.error('FAIL');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
