/** Líneas de las tres lentes (español o inglés). */
const SUBAGENT_LINE =
  /^\[(Identidad\/Idea|Identity\/Idea|Economía|Economics|Ejecución\/Agentico|Execution\/Agentic)\]\s*.+$/;

export type ParsedAvrilReply = {
  /** Texto listo para mostrar en el chat (sin JSON ni líneas de subagente). */
  displayText: string;
  /** Objeto parseado del bloque JSON, o null si no había / falló parse. */
  architectPayload: Record<string, unknown> | null;
};

/**
 * Fence de inicio: el modelo a veces escribe `---JSON---` y otras:
 * `---` en una línea y `JSON---` en la siguiente (no coincide con ---JSON--- literal).
 */
const JSON_FENCE_START =
  /(?:---\s*\n+\s*JSON\s*---|---\s*JSON\s*---|^\s*JSON\s*---)/im;

const JSON_FENCE_END = /---\s*END_JSON\s*---/i;

const LEGACY_START = '---JSON---';
const LEGACY_END = '---END_JSON---';

function tryParseJsonObject(slice: string): Record<string, unknown> | null {
  const t = slice.trim();
  if (!t.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(t) as unknown;
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Separa la parte visible para el usuario del bloque estructurado que sigue
 * instrucciones de `avril-architect-persona.json`.
 */
export function parseAvrilAssistantReply(raw: string): ParsedAvrilReply {
  let working = raw.trim();
  let architectPayload: Record<string, unknown> | null = null;

  // 1) Regex fence (split-line friendly)
  const startMatch = JSON_FENCE_START.exec(working);
  const endMatch = JSON_FENCE_END.exec(working);

  if (startMatch && endMatch && endMatch.index !== undefined && startMatch.index !== undefined) {
    const startIdx = startMatch.index;
    const endIdx = endMatch.index;
    if (endIdx > startIdx) {
      const afterStart = startIdx + startMatch[0].length;
      const jsonSlice = working.slice(afterStart, endIdx).trim();
      architectPayload = tryParseJsonObject(jsonSlice);
      const afterEnd = endIdx + endMatch[0].length;
      working = (working.slice(0, startIdx) + working.slice(afterEnd)).trim();
    }
  }

  // 2) Legacy exact delimiters
  if (architectPayload === null) {
    const ls = working.indexOf(LEGACY_START);
    const le = working.indexOf(LEGACY_END);
    if (ls !== -1 && le !== -1 && le > ls) {
      const jsonSlice = working.slice(ls + LEGACY_START.length, le).trim();
      architectPayload = tryParseJsonObject(jsonSlice);
      working = (working.slice(0, ls).trimEnd() + '\n' + working.slice(le + LEGACY_END.length).trimStart()).trim();
    }
  }

  // 3) Still see a JSON object + END fence (missing/ broken start fence)
  if (architectPayload === null) {
    const endOnly = JSON_FENCE_END.exec(working);
    if (endOnly && endOnly.index !== undefined) {
      const before = working.slice(0, endOnly.index);
      const lastBraceStart = before.lastIndexOf('{');
      if (lastBraceStart !== -1) {
        const candidate = working.slice(lastBraceStart, endOnly.index).trim();
        architectPayload = tryParseJsonObject(candidate);
        if (architectPayload !== null) {
          working = (working.slice(0, lastBraceStart) + working.slice(endOnly.index + endOnly[0].length)).trim();
        }
      }
    }
  }

  // Orphan horizontal rules / broken first line of fence
  working = working
    .replace(/\n{2,}---\s*$/m, '')
    .replace(/^\s*---\s*$/m, '')
    .trim();

  const displayText = working
    .split('\n')
    .filter((line) => !SUBAGENT_LINE.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { displayText: displayText || raw.trim(), architectPayload };
}
