/**
 * Optional: periodically summarize long chat threads and store summary on the chat.
 * When OPENAI_API_KEY is set in Convex env, this action picks one chat that needs
 * summarization (many messages, no or stale summary), calls OpenAI to summarize,
 * and updates the chat. Run via cron every 6 hours.
 */
import { action } from './_generated/server';
import { api } from './_generated/api';

const SERVER_SECRET_ENV = 'CONVEX_SERVER_SECRET';
const OPENAI_API_KEY_ENV = 'OPENAI_API_KEY';
const MIN_MESSAGES_TO_SUMMARIZE = 15;
const SUMMARY_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_SUMMARY_CHARS = 800;

function getServerSecret(): string | null {
  return process.env[SERVER_SECRET_ENV] ?? null;
}

function getOpenAiKey(): string | null {
  return process.env[OPENAI_API_KEY_ENV] ?? null;
}

export const summarizeNextChat = action({
  args: {},
  handler: async (ctx) => {
    const serverSecret = getServerSecret();
    if (!serverSecret) {
      return { ok: false, reason: 'CONVEX_SERVER_SECRET not set' };
    }

    const openAiKey = getOpenAiKey();
    if (!openAiKey) {
      return { ok: false, reason: 'OPENAI_API_KEY not set; summarization skipped' };
    }

    const organizationId = await ctx.runQuery(api.bootstrap.getDefaultOrganizationId, {
      serverSecret,
    });
    if (!organizationId) {
      return { ok: false, reason: 'No default organization' };
    }

    const chats = await ctx.runQuery(api.serverChats.listChatsServer, {
      organizationId,
      serverSecret,
    });
    if (!Array.isArray(chats) || chats.length === 0) {
      return { ok: true, summarized: null };
    }

    const now = Date.now();
    for (const chat of chats) {
      const chatId = chat._id;
      const count = await ctx.runQuery(api.serverChats.getMessageCountServer, {
        chatId,
        serverSecret,
      });
      if (count < MIN_MESSAGES_TO_SUMMARIZE) continue;

      const summaryUpdatedAt = chat.summaryUpdatedAt;
      if (summaryUpdatedAt) {
        const updated = new Date(summaryUpdatedAt).getTime();
        if (now - updated < SUMMARY_MAX_AGE_MS) continue;
      }

      const messages = await ctx.runQuery(api.serverChats.listMessagesServer, {
        chatId,
        serverSecret,
      });
      if (!Array.isArray(messages) || messages.length < MIN_MESSAGES_TO_SUMMARIZE) continue;

      const text = messages
        .map((m: { authorType: string; authorId?: string; content: string }) => {
          const who = m.authorType === 'human' ? 'User' : (m.authorId || 'Agent');
          return `${who}: ${(m.content || '').trim()}`;
        })
        .join('\n');

      const truncated =
        text.length > 12000 ? text.slice(-12000) + '\n[... earlier messages truncated ...]' : text;

      let summary: string;
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'Summarize this conversation in 2-4 concise sentences. Preserve key facts, decisions, and outcomes. Output only the summary, no preamble.',
              },
              { role: 'user', content: truncated },
            ],
            max_tokens: 256,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          return { ok: false, reason: `OpenAI ${res.status}: ${errText.slice(0, 200)}` };
        }

        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const raw =
          data?.choices?.[0]?.message?.content?.trim() ?? '';
        summary = raw.length > MAX_SUMMARY_CHARS ? raw.slice(0, MAX_SUMMARY_CHARS) + '…' : raw;
      } catch (err) {
        return {
          ok: false,
          reason: err instanceof Error ? err.message : 'OpenAI request failed',
        };
      }

      await ctx.runMutation(api.serverChats.setChatSummaryServer, {
        chatId,
        summary,
        serverSecret,
      });

      return { ok: true, summarized: chatId };
    }

    return { ok: true, summarized: null };
  },
});
