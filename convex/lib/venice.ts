import { z } from 'zod';

type VeniceJsonOptions<T extends z.ZodTypeAny> = {
  schema: T;
  system: string;
  user: string;
  temperature?: number;
  maxRetries?: number;
};

function extractText(data: any): string {
  const text =
    data?.choices?.[0]?.message?.content ??
    data?.reply ??
    data?.text ??
    data?.message ??
    '';
  return typeof text === 'string' ? text.trim() : '';
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const slice = text.slice(start, end + 1);
      return JSON.parse(slice);
    }
    throw new Error('Response did not contain valid JSON.');
  }
}

async function callVeniceOnce(payload: {
  system: string;
  user: string;
  temperature: number;
}): Promise<{ rawText: string; responseBody: string }> {
  const veniceRaw = process.env.VENICE_INFERENCE_KEY ?? process.env.VENICE_ADMIN_KEY;
  const veniceUrl = process.env.VENICE_INFERENCE_URL || 'https://api.venice.ai/api/v1/chat/completions';
  const veniceModel = process.env.VENICE_MODEL || 'venice-uncensored';

  if (!veniceRaw) {
    throw new Error('Venice is not configured. Missing VENICE_INFERENCE_KEY or VENICE_ADMIN_KEY.');
  }

  const normalizedRaw = veniceRaw.trim().replace(/^Bearer\s+/i, '');
  const keyCandidates = Array.from(
    new Set(
      normalizedRaw.startsWith('VENICE_')
        ? [normalizedRaw]
        : [normalizedRaw, `VENICE_ADMIN_KEY_${normalizedRaw}`, `VENICE_ADMIN_KEY_W_${normalizedRaw}`]
    )
  );

  let responseBody = '';
  let lastStatus = 0;

  for (const key of keyCandidates) {
    const res = await fetch(veniceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: veniceModel,
        messages: [
          { role: 'system', content: payload.system },
          { role: 'user', content: payload.user },
        ],
        temperature: payload.temperature,
      }),
    });

    responseBody = await res.text().catch(() => '');
    lastStatus = res.status;

    if (!res.ok) {
      if (res.status === 401) continue;
      throw new Error(`Venice ${res.status}: ${responseBody.slice(0, 240)}`);
    }

    const jsonData = responseBody ? JSON.parse(responseBody) : {};
    const rawText = extractText(jsonData);
    if (!rawText) throw new Error('Venice returned no reply text.');
    return { rawText, responseBody };
  }

  throw new Error(`Venice authorization failed (${lastStatus}).`);
}

export async function callVeniceStructured<T extends z.ZodTypeAny>(
  options: VeniceJsonOptions<T>
): Promise<{ parsed: z.infer<T>; rawText: string; responseBody: string }> {
  const retries = Math.max(1, options.maxRetries ?? 2);
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await callVeniceOnce({
        system: options.system,
        user:
          `${options.user}\n\nReturn valid JSON only. Do not wrap in markdown fences. ` +
          `Follow required shape exactly and keep values concise.`,
        temperature: options.temperature ?? 0.2,
      });
      const json = tryParseJson(result.rawText);
      const parsed = options.schema.parse(json);
      return { parsed, rawText: result.rawText, responseBody: result.responseBody };
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Venice structured call failed.');
}
