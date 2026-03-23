'use client';

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Card from '@/src/components/ui/Card';
import SectionTitle from '@/src/components/ui/SectionTitle';
import Button from '@/src/components/ui/Button';
import Badge from '@/src/components/ui/Badge';
import { FounderIntakeSchema } from '@/src/modules/founder/schemas';
import { mergeCapturedIntoIntakeForm } from '@/src/modules/founder/mergeCapturedIntoIntakeForm';
import { useWaaP } from '@/src/components/WaaPProvider';
import { AnimatedAIChat } from '@/components/ui/animated-ai-chat';
import AgenticWalletLayerPanel from '@/src/components/AgenticWalletLayerPanel';

const DASHBOARD_TOKEN = process.env.NEXT_PUBLIC_DASHBOARD_APP_TOKEN ?? '';

type ControlState = {
  currentIdea: any | null;
  founderBrief: any | null;
  options: any[];
  selectedRoute: any | null;
  blueprint: any | null;
  ignitionConfig: any | null;
  deploymentJob: any | null;
  runtimeInstance: any | null;
  pendingApprovals: any[];
  recentAgentEvents: any[];
};

const EMPTY_STATE: ControlState = {
  currentIdea: null,
  founderBrief: null,
  options: [],
  selectedRoute: null,
  blueprint: null,
  ignitionConfig: null,
  deploymentJob: null,
  runtimeInstance: null,
  pendingApprovals: [],
  recentAgentEvents: [],
};

function HomePageContent() {
  const { address } = useWaaP();
  const searchParams = useSearchParams();
  const router = useRouter();
  const applyChatDraftOnce = useRef<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [state, setState] = useState<ControlState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningAction, setRunningAction] = useState<'brief' | 'options' | 'blueprint' | 'ignition' | 'deploy' | null>(null);
  const [status, setStatus] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [form, setForm] = useState({
    founderName: '',
    title: '',
    rawIdea: '',
    targetUser: '',
    problem: '',
    monetizationPreference: '',
    businessModelPreference: '',
    desiredAutomationLevel: 'medium',
    skillsResources: '',
    timeAvailable: '',
    country: '',
    language: 'English',
    channelPreferences: '',
    riskTolerance: 'medium',
  });

  const authHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (DASHBOARD_TOKEN) headers['x-dashboard-token'] = DASHBOARD_TOKEN;
    return headers;
  }, []);

  async function loadState() {
    setLoading(true);
    try {
      const res = await fetch('/api/control/state', {
        cache: 'no-store',
        credentials: 'include',
        headers: { ...authHeaders },
      });
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }
      if (!res.ok) {
        if (res.status === 401) {
          setStatus({
            kind: 'error',
            text: 'Unauthorized control state request. Verify session or dashboard token env configuration.',
          });
        } else {
          setStatus({ kind: 'error', text: data?.error?.message || 'Failed to load control plane.' });
        }
        return;
      }
      setState({
        currentIdea: data.currentIdea ?? null,
        founderBrief: data.founderBrief ?? null,
        options: data.options ?? [],
        selectedRoute: data.selectedRoute ?? null,
        blueprint: data.blueprint ?? null,
        ignitionConfig: data.ignitionConfig ?? null,
        deploymentJob: data.deploymentJob ?? null,
        runtimeInstance: data.runtimeInstance ?? null,
        pendingApprovals: data.pendingApprovals ?? [],
        recentAgentEvents: data.recentAgentEvents ?? [],
      });
      setStatus(null);
    } catch {
      setStatus({ kind: 'error', text: 'Unable to load control plane state.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadState();
    const id = setInterval(() => void loadState(), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const chatId = searchParams.get('applyChatDraft')?.trim();
    if (!chatId) {
      applyChatDraftOnce.current = null;
      return;
    }
    if (applyChatDraftOnce.current === chatId) return;
    applyChatDraftOnce.current = chatId;

    (async () => {
      try {
        const res = await fetch(`/api/chat/ignition-draft?chatId=${encodeURIComponent(chatId)}`, {
          cache: 'no-store',
          credentials: 'include',
          headers: { ...authHeaders },
        });
        const data = await res.json().catch(() => ({}));
        const cap = data?.draft?.captured;
        if (cap && typeof cap === 'object' && !Array.isArray(cap)) {
          setForm((prev) => mergeCapturedIntoIntakeForm(prev, cap as Record<string, unknown>));
          setShowAdvanced(true);
          setStatus({
            kind: 'success',
            text: 'Advanced form filled from your Avril chat (Convex draft). Review and save intake when ready.',
          });
        } else {
          setShowAdvanced(true);
          setStatus({
            kind: 'info',
            text: 'That chat has no captured fields yet. Keep talking to Avril on Chats, then try again.',
          });
        }
      } catch {
        setStatus({ kind: 'error', text: 'Could not load chat draft to fill the form.' });
      }
      router.replace('/', { scroll: false });
    })();
  }, [searchParams, authHeaders, router]);

  const progress = useMemo(() => {
    const steps = [
      Boolean(state.currentIdea),
      Boolean(state.founderBrief),
      state.options.length >= 3,
      Boolean(state.selectedRoute),
      Boolean(state.blueprint),
      Boolean(state.ignitionConfig),
    ];
    return { completed: steps.filter(Boolean).length, total: steps.length };
  }, [state]);

  const deploymentEvents = useMemo(
    () =>
      state.recentAgentEvents.filter((event) =>
        [
          'deployment_requested',
          'deployment_started',
          'deployment_succeeded',
          'deployment_failed',
          'runtime_healthy',
          'ignition_applied',
        ].includes(event.type)
      ),
    [state.recentAgentEvents]
  );

  const stepState = useMemo(
    () => ({
      brief: Boolean(state.founderBrief),
      options: state.options.length >= 3,
      route: Boolean(state.selectedRoute),
      blueprint: Boolean(state.blueprint),
      ignition: Boolean(state.ignitionConfig),
      deployment: state.deploymentJob?.status === 'deployed',
    }),
    [state]
  );

  const deployMode = state.deploymentJob?.target === 'mock' ? 'mock' : state.deploymentJob?.target === 'live' ? 'live' : 'n/a';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!form.rawIdea.trim()) {
      setStatus({ kind: 'error', text: 'Raw idea is required.' });
      return;
    }
    const intake = {
      founderName: form.founderName.trim() || 'Founder',
      rawIdea: form.rawIdea.trim(),
      targetUser: form.targetUser.trim() || 'General user',
      problem: form.problem.trim() || 'Unclear problem statement',
      monetizationPreference: form.monetizationPreference.trim() || 'Flexible',
      businessModelPreference: form.businessModelPreference.trim() || 'Flexible',
      desiredAutomationLevel: form.desiredAutomationLevel.trim() || 'medium',
      skillsResources: form.skillsResources.trim() || 'Limited team resources',
      timeAvailable: form.timeAvailable.trim() || '10h/week',
      country: form.country.trim() || 'Global',
      language: form.language.trim() || 'English',
      channelPreferences: form.channelPreferences
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8),
      riskTolerance: form.riskTolerance.trim() || 'medium',
    };
    const parsed = FounderIntakeSchema.safeParse({
      ...intake,
      channelPreferences: intake.channelPreferences.length > 0 ? intake.channelPreferences : ['founder-led'],
    });
    if (!parsed.success) {
      setStatus({ kind: 'error', text: parsed.error.issues[0]?.message || 'Founder intake validation failed.' });
      return;
    }

    setSaving(true);
    setStatus({ kind: 'info', text: 'Saving founder intake...' });
    try {
      const res = await fetch('/api/founder/intake', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          ...form,
          channelPreferences: parsed.data.channelPreferences,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: 'error', text: data?.error?.message || 'Failed to save founder intake.' });
        return;
      }
      setStatus({ kind: 'success', text: 'Founder idea saved.' });
      await loadState();
    } catch {
      setStatus({ kind: 'error', text: 'Failed to save founder intake.' });
    } finally {
      setSaving(false);
    }
  }

  async function runAction(
    actionKey: 'brief' | 'options' | 'blueprint' | 'ignition' | 'deploy',
    label: string,
    path: string,
    body: Record<string, unknown> = {}
  ) {
    if (runningAction) return;
    setRunningAction(actionKey);
    setStatus({ kind: 'info', text: `${label}...` });
    try {
      const res = await fetch(path, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: 'error', text: data?.error?.message || `${label} failed.` });
        return;
      }
      if (actionKey === 'deploy') {
        const mode = data?.result?.mode === 'mock' ? 'mock' : 'live';
        setStatus({ kind: 'success', text: `${label} completed (${mode} mode).` });
      } else {
        setStatus({ kind: 'success', text: `${label} completed.` });
      }
      await loadState();
    } catch {
      setStatus({ kind: 'error', text: `${label} failed.` });
    } finally {
      setRunningAction(null);
    }
  }

  function StepBadge({ label, ready }: { label: string; ready: boolean }) {
    return (
      <Badge className={ready ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}>
        {label}: {ready ? 'ready' : 'pending'}
      </Badge>
    );
  }

  return (
    <div className="font-sans space-y-5">
      <AnimatedAIChat />
      <AgenticWalletLayerPanel compact />

      <div className="mx-auto w-full max-w-6xl px-2">
        <div className="flex items-center justify-between gap-3 mb-3">
          <SectionTitle title="Advanced Settings" subtitle="Founder Control Plane (optional)." />
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs"
          >
            {showAdvanced ? 'Hide advanced' : 'Show advanced'}
          </Button>
        </div>

        {!showAdvanced ? (
          <p className="text-xs text-muted">Advanced founder pipeline tools are hidden by default.</p>
        ) : (
          <div className="space-y-5">
      <Card className="p-4 rounded-2xl">
        <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
          <p className="text-sm text-muted">
            Pipeline progress: <span className="text-white">{progress.completed}/{progress.total}</span>
          </p>
          <div className="flex gap-2 text-xs">
            <StepBadge label="Brief" ready={stepState.brief} />
            <StepBadge label="Options" ready={stepState.options} />
            <StepBadge label="Blueprint" ready={stepState.blueprint} />
            <StepBadge label="Ignition" ready={stepState.ignition} />
            <Badge className={deployMode === 'mock' ? 'bg-yellow-500/10 text-yellow-300' : 'bg-blue-500/10 text-blue-300'}>
              Deploy mode: {deployMode}
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        <Card className="p-5 rounded-2xl">
          <h3 className="font-semibold font-heading mb-3">Founder Idea</h3>
          <form onSubmit={handleSubmit} className="space-y-3 text-sm">
            <input className="w-full bg-surface border border-border rounded-xl px-3 py-2" placeholder="Founder name" value={form.founderName} onChange={(e) => setForm((s) => ({ ...s, founderName: e.target.value }))} />
            <input className="w-full bg-surface border border-border rounded-xl px-3 py-2" placeholder="Idea title" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
            <textarea className="w-full bg-surface border border-border rounded-xl px-3 py-2 min-h-24" placeholder="Raw idea (required)" value={form.rawIdea} onChange={(e) => setForm((s) => ({ ...s, rawIdea: e.target.value }))} />
            <input className="w-full bg-surface border border-border rounded-xl px-3 py-2" placeholder="Target user" value={form.targetUser} onChange={(e) => setForm((s) => ({ ...s, targetUser: e.target.value }))} />
            <input className="w-full bg-surface border border-border rounded-xl px-3 py-2" placeholder="Problem" value={form.problem} onChange={(e) => setForm((s) => ({ ...s, problem: e.target.value }))} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input className="w-full bg-surface border border-border rounded-xl px-3 py-2" placeholder="Monetization preference" value={form.monetizationPreference} onChange={(e) => setForm((s) => ({ ...s, monetizationPreference: e.target.value }))} />
              <input className="w-full bg-surface border border-border rounded-xl px-3 py-2" placeholder="Business model preference" value={form.businessModelPreference} onChange={(e) => setForm((s) => ({ ...s, businessModelPreference: e.target.value }))} />
              <input className="w-full bg-surface border border-border rounded-xl px-3 py-2" placeholder="Automation level" value={form.desiredAutomationLevel} onChange={(e) => setForm((s) => ({ ...s, desiredAutomationLevel: e.target.value }))} />
              <input className="w-full bg-surface border border-border rounded-xl px-3 py-2" placeholder="Risk tolerance" value={form.riskTolerance} onChange={(e) => setForm((s) => ({ ...s, riskTolerance: e.target.value }))} />
              <input className="w-full bg-surface border border-border rounded-xl px-3 py-2" placeholder="Skills/resources" value={form.skillsResources} onChange={(e) => setForm((s) => ({ ...s, skillsResources: e.target.value }))} />
              <input className="w-full bg-surface border border-border rounded-xl px-3 py-2" placeholder="Time available" value={form.timeAvailable} onChange={(e) => setForm((s) => ({ ...s, timeAvailable: e.target.value }))} />
              <input className="w-full bg-surface border border-border rounded-xl px-3 py-2" placeholder="Country" value={form.country} onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))} />
              <input className="w-full bg-surface border border-border rounded-xl px-3 py-2" placeholder="Language" value={form.language} onChange={(e) => setForm((s) => ({ ...s, language: e.target.value }))} />
            </div>
            <input className="w-full bg-surface border border-border rounded-xl px-3 py-2" placeholder="Channels (comma-separated)" value={form.channelPreferences} onChange={(e) => setForm((s) => ({ ...s, channelPreferences: e.target.value }))} />
            <Button type="submit" disabled={saving || loading} className="text-sm">
              {saving ? 'Saving…' : 'Save Founder Intake'}
            </Button>
          </form>
        </Card>

        <Card className="p-5 rounded-2xl space-y-3">
          <h3 className="font-semibold font-heading">Company Options</h3>
          <p className="text-xs text-muted">Generate brief + 3 options, then select a route.</p>
          <div className="flex gap-2 flex-wrap">
            <Button
              className="text-xs"
              disabled={!state.currentIdea || !!runningAction}
              onClick={() =>
                void runAction('brief', 'Generating founder brief', '/api/founder/generate/brief', {
                  ideaId: state.currentIdea?._id,
                })
              }
            >
              {runningAction === 'brief' ? 'Working…' : 'Generate Brief'}
            </Button>
            <Button
              className="text-xs"
              disabled={!state.currentIdea || !state.founderBrief || !!runningAction}
              onClick={() =>
                void runAction('options', 'Generating company options', '/api/founder/generate/options', {
                  ideaId: state.currentIdea?._id,
                })
              }
            >
              {runningAction === 'options' ? 'Working…' : 'Generate Options'}
            </Button>
          </div>
          <div className="space-y-2">
            {state.options.length === 0 ? (
              <p className="text-xs text-muted">No options generated yet.</p>
            ) : (
              state.options.map((option) => {
                const selected = state.selectedRoute?.selectedOptionKey === option.optionKey;
                return (
                  <div key={option._id} className="border border-white/10 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-white capitalize">{option.profile}</p>
                        <p className="text-xs text-muted truncate">{option.businessThesis}</p>
                      </div>
                      <Button
                        className="text-xs"
                        disabled={!state.currentIdea || !!runningAction || selected}
                        onClick={() =>
                          void runAction('options', 'Selecting route', '/api/founder/select-route', {
                            ideaId: state.currentIdea?._id,
                            selectedOptionKey: option.optionKey,
                            selectedProfile: option.profile,
                          })
                        }
                      >
                        {selected ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-5 rounded-2xl space-y-3">
          <h3 className="font-semibold font-heading">Selected Route / Blueprint</h3>
          <div className="text-sm space-y-2">
            <p><span className="text-muted">Selected route:</span> {state.selectedRoute?.selectedProfile || 'none'}</p>
            <p><span className="text-muted">Blueprint:</span> {state.blueprint ? `v${state.blueprint.version}` : 'missing'}</p>
            <p><span className="text-muted">Ignition:</span> {state.ignitionConfig ? 'ready' : 'missing'}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              className="text-xs"
              disabled={!state.currentIdea || !state.selectedRoute || !!runningAction}
              onClick={() =>
                void runAction('blueprint', 'Generating business blueprint', '/api/founder/generate/blueprint', {
                  ideaId: state.currentIdea?._id,
                })
              }
            >
              {runningAction === 'blueprint' ? 'Working…' : 'Generate Blueprint'}
            </Button>
            <Button
              className="text-xs"
              disabled={!state.currentIdea || !state.blueprint || !!runningAction}
              onClick={() =>
                void runAction('ignition', 'Generating ignition config', '/api/founder/generate/ignition', {
                  ideaId: state.currentIdea?._id,
                })
              }
            >
              {runningAction === 'ignition' ? 'Working…' : 'Generate Ignition'}
            </Button>
          </div>
        </Card>

        <Card className="p-5 rounded-2xl space-y-3">
          <h3 className="font-semibold font-heading">Deployment Status</h3>
          <div className="text-sm space-y-2">
            <p><span className="text-muted">Deployment status:</span> {state.deploymentJob?.status || 'none'}</p>
            <p><span className="text-muted">Runtime status:</span> {state.runtimeInstance?.status || 'none'}</p>
            <p><span className="text-muted">Runtime URL:</span> {state.runtimeInstance?.endpointUrl || 'n/a'}</p>
            <p><span className="text-muted">External deployment ID:</span> {state.deploymentJob?.externalDeploymentId || 'n/a'}</p>
            <p><span className="text-muted">Deploy mode:</span> {deployMode}</p>
          </div>
          <Button
            className="text-xs"
            disabled={!state.currentIdea || !state.ignitionConfig || !!runningAction}
            onClick={() =>
              void runAction('deploy', 'Deploying OpenClaw runtime', '/api/founder/deploy', {
                ideaId: state.currentIdea?._id,
              })
            }
          >
            {runningAction === 'deploy' ? 'Deploying…' : 'Deploy Runtime'}
          </Button>
        </Card>

        <Card className="p-5 rounded-2xl space-y-3">
          <h3 className="font-semibold font-heading">Recent Events / Identity</h3>
          <div className="text-xs space-y-1">
            <p><span className="text-muted">Connected identity:</span> {address || 'not connected'}</p>
            <p><span className="text-muted">Pending approvals:</span> {state.pendingApprovals.length}</p>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto text-xs">
            {deploymentEvents.length === 0 ? (
              <p className="text-muted">No deployment events yet.</p>
            ) : (
              deploymentEvents.map((event) => (
                <div key={event._id} className="border border-white/10 rounded-lg px-2 py-1.5">
                  <p className="text-white">{event.type}</p>
                  <p className="text-muted">{event.message}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {status && (
        <p
          className={`text-xs ${
            status.kind === 'error'
              ? 'text-red-300'
              : status.kind === 'success'
                ? 'text-emerald-300'
                : 'text-yellow-300'
          }`}
        >
          {status.text}
        </p>
      )}
      {loading && <p className="text-xs text-muted">Refreshing control state…</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="font-sans p-8 text-muted text-sm">Loading…</div>}>
      <HomePageContent />
    </Suspense>
  );
}
