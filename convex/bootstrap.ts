import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

const SERVER_SECRET_ENV = 'CONVEX_SERVER_SECRET';

function requireServerSecret(serverSecret: string | undefined) {
  const expected = process.env[SERVER_SECRET_ENV];
  if (!expected || serverSecret !== expected) {
    throw new Error('Unauthorized: invalid or missing server secret.');
  }
}

/**
 * Returns the default organization id (first org by slug "default", or first org).
 * Used by the Next.js API to scope chat operations. Call createDefaultOrganizationIfMissing first if needed.
 */
export const getDefaultOrganizationId = query({
  args: { serverSecret: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    const bySlug = await ctx.db
      .query('organizations')
      .withIndex('by_slug', (q) => q.eq('slug', 'default'))
      .first();
    if (bySlug) return bySlug._id;

    const first = await ctx.db.query('organizations').first();
    return first?._id ?? null;
  },
});

/**
 * Ensures a default organization exists (name "Default", slug "default"). Idempotent.
 * Returns the organization id. Call once during bootstrap, then use getDefaultOrganizationId.
 */
export const createDefaultOrganizationIfMissing = mutation({
  args: { serverSecret: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.serverSecret);

    const existing = await ctx.db
      .query('organizations')
      .withIndex('by_slug', (q) => q.eq('slug', 'default'))
      .first();
    if (existing) return existing._id;

    const now = new Date().toISOString();
    return await ctx.db.insert('organizations', {
      name: 'Default',
      slug: 'default',
      createdAt: now,
    });
  },
});
