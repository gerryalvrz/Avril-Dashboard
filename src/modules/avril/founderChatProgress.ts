import { avrilArchitectPersona } from './buildAvrilSystemPrompt';

export const FOUNDER_FIELD_ORDER = avrilArchitectPersona.founderControlPlane.questionOrder as readonly string[];

const QUESTION_LABELS: Record<number, string> = {
  1: 'Product, customer & pain',
  2: 'You & constraints',
  3: 'Economics & execution',
};

const FIELD_LABELS: Record<string, string> = {
  founderName: 'Your name',
  language: 'Language',
  country: 'Country / market',
  rawIdea: 'Raw idea',
  problem: 'Problem',
  targetUser: 'Target user',
  monetizationPreference: 'Monetization',
  businessModelPreference: 'Business model',
  riskTolerance: 'Risk tolerance',
  desiredAutomationLevel: 'Automation level',
  skillsResources: 'Skills & resources',
  timeAvailable: 'Time available',
  channelPreferences: 'Channels',
};

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

function isFilled(captured: Record<string, unknown> | null | undefined, key: string): boolean {
  const v = captured?.[key];
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  return String(v).trim().length > 0;
}

export function computeFieldProgress(captured: Record<string, unknown> | null | undefined): {
  filledCount: number;
  total: number;
  nextFieldKey: string | null;
  nextFieldLabel: string | null;
  filledKeys: string[];
} {
  const filledKeys: string[] = [];
  for (const key of FOUNDER_FIELD_ORDER) {
    if (isFilled(captured, key)) filledKeys.push(key);
  }
  const nextFieldKey =
    FOUNDER_FIELD_ORDER.find((k) => !isFilled(captured, k)) ?? null;
  return {
    filledCount: filledKeys.length,
    total: FOUNDER_FIELD_ORDER.length,
    nextFieldKey,
    nextFieldLabel: nextFieldKey ? fieldLabel(nextFieldKey) : null,
    filledKeys,
  };
}

/** Maps model phase to active question 1–3, or done after handoff. */
export function computeThreeQuestionStep(
  phase: string | null | undefined,
  questionIndex?: number | null
): {
  /** 1–3 while asking; 3 when handoff (all questions answered). */
  displayStep: number;
  total: number;
  label: string;
  handoffReady: boolean;
} {
  const p = (phase || 'intake_q1').toLowerCase();
  if (p === 'handoff_ready') {
    return {
      displayStep: 3,
      total: 3,
      label: 'Handoff — control plane complete',
      handoffReady: true,
    };
  }

  let q = typeof questionIndex === 'number' && questionIndex >= 1 && questionIndex <= 3 ? questionIndex : null;
  if (q == null) {
    if (p === 'intake_q2') q = 2;
    else if (p === 'intake_q3') q = 3;
    else q = 1;
  }

  return {
    displayStep: q,
    total: 3,
    label: QUESTION_LABELS[q] ?? `Question ${q}`,
    handoffReady: false,
  };
}

/** @deprecated Use computeThreeQuestionStep for the 3-question flow. */
export function computePhaseStep(phase: string | null | undefined): {
  index: number;
  total: number;
  label: string;
} {
  const t = computeThreeQuestionStep(phase, null);
  return {
    index: t.handoffReady ? 4 : t.displayStep,
    total: 4,
    label: t.label,
  };
}
