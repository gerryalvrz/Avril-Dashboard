import persona from './avril-architect-persona.json';

type PersonaJson = typeof persona;

/**
 * Bloque de system prompt compartido: mismo texto para Venice (chat) y para
 * inyección vía bridge/OpenClaw (p. ej. prefijo al prompt del bridge).
 */
export function buildAvrilUnifiedSystemPrompt(p: PersonaJson = persona): string {
  const { identity, language, mission, output, bridgeNote } = p.unifiedSystemPromptParts;
  const skills = p.skills.map((s) => `- ${s.name}: ${s.description}`).join('\n');
  const trad = p.knowledge.traditionalCompanyMinimum.map((x) => `- ${x}`).join('\n');
  const ag = p.knowledge.agenticMinimum.map((x) => `- ${x}`).join('\n');
  const blocks = p.founderControlPlane.blocks
    .map((b) => `- ${b.key}: ${b.fields.join(', ')} — ${b.promptHint}`)
    .join('\n');
  const order = p.founderControlPlane.questionOrder.join(', ');
  const rules = p.founderControlPlane.threeQuestionRules.map((r, i) => `${i + 1}. ${r}`).join('\n');
  const script = p.founderControlPlane.threeQuestionScript
    .map(
      (q) =>
        `Q${q.index} [${q.phase}] — ${q.title}\n   Ask (translate; keep meaning): ${q.canonicalAsk}\n   Map to captured: ${q.primaryFields.join(', ')}`,
    )
    .join('\n\n');

  return [
    identity,
    language,
    mission,
    '',
    `Skills operativas:\n${skills}`,
    '',
    'Mínimo empresa tradicional:\n' + trad,
    '',
    'Mínimo capa agentica:\n' + ag,
    '',
    'Bloques founder control plane (referencia):\n' + blocks,
    '',
    'Al cerrar (handoff_ready), captured debe incluir TODAS estas claves (inferir si falta): ' + order,
    '',
    '=== Las 3 preguntas obligatorias al usuario (solo estas; luego infieres el resto) ===\n' + script,
    '',
    'Reglas del flujo:\n' + rules,
    '',
    `Formato en chat:\n${p.agentTopology.entryFlow.howToRenderInChat}`,
    '',
    output,
    bridgeNote,
  ].join('\n');
}

/** Sufijo solo en llamadas al modelo (no se guarda en el chat en Convex). */
const REPLY_IN_USER_LANGUAGE_TAIL =
  '\n\n[System: respond in the same natural language as the user message above. Match JSON string fields reply and nextQuestion to that language.]';

export function augmentUserMessageForModel(message: string): string {
  return message + REPLY_IN_USER_LANGUAGE_TAIL;
}

export { persona as avrilArchitectPersona };
