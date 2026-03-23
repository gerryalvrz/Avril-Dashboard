/** Home / Advanced Settings form shape (channelPreferences as comma string in UI). */
export type IntakeFormShape = {
  founderName: string;
  title: string;
  rawIdea: string;
  targetUser: string;
  problem: string;
  monetizationPreference: string;
  businessModelPreference: string;
  desiredAutomationLevel: string;
  skillsResources: string;
  timeAvailable: string;
  country: string;
  language: string;
  channelPreferences: string;
  riskTolerance: string;
};

function asTrimmedString(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') {
    const t = v.trim();
    return t.length ? t : undefined;
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

/**
 * Merge Avril `captured` JSON into the founder intake form. Only overwrites when captured has a value.
 */
export function mergeCapturedIntoIntakeForm(
  prev: IntakeFormShape,
  captured: Record<string, unknown>
): IntakeFormShape {
  const next = { ...prev };

  const apply = (key: keyof IntakeFormShape, rawKey: string) => {
    const s = asTrimmedString(captured[rawKey]);
    if (s !== undefined) next[key] = s;
  };

  apply('founderName', 'founderName');
  apply('rawIdea', 'rawIdea');
  apply('targetUser', 'targetUser');
  apply('problem', 'problem');
  apply('monetizationPreference', 'monetizationPreference');
  apply('businessModelPreference', 'businessModelPreference');
  apply('desiredAutomationLevel', 'desiredAutomationLevel');
  apply('skillsResources', 'skillsResources');
  apply('timeAvailable', 'timeAvailable');
  apply('country', 'country');
  apply('language', 'language');
  apply('riskTolerance', 'riskTolerance');

  const ch = captured.channelPreferences;
  if (Array.isArray(ch) && ch.length > 0) {
    next.channelPreferences = ch.map((x) => String(x).trim()).filter(Boolean).join(', ');
  } else {
    const s = asTrimmedString(ch);
    if (s !== undefined) next.channelPreferences = s;
  }

  const idea = asTrimmedString(captured.rawIdea);
  if (idea && !next.title.trim()) {
    next.title = idea.length > 100 ? `${idea.slice(0, 97)}…` : idea;
  }

  return next;
}
