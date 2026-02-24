import { ConvexError, v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

type Ctx = QueryCtx | MutationCtx;

export const roleOrder = {
  viewer: 0,
  operator: 1,
  admin: 2,
  owner: 3,
} as const;

export type Role = keyof typeof roleOrder;

export function authzError(code: 'unauthorized' | 'forbidden' | 'not_found', message: string): never {
  throw new ConvexError({ code, message });
}

export async function requireIdentity(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    authzError('unauthorized', 'Authentication required.');
  }
  return identity;
}

export async function requireUser(ctx: Ctx) {
  const identity = await requireIdentity(ctx);
  const email = identity.email;

  if (!email) {
    authzError('unauthorized', 'Authenticated identity is missing an email claim.');
  }

  const user = await ctx.db
    .query('users')
    .withIndex('by_email', (q) => q.eq('email', email))
    .first();

  if (!user) {
    authzError('forbidden', 'No matching application user record found.');
  }

  return { identity, user };
}

export async function requireOrgMembership(
  ctx: Ctx,
  organizationId: Id<'organizations'>,
  minRole: Role = 'viewer'
) {
  const { user } = await requireUser(ctx);

  const membership = await ctx.db
    .query('memberships')
    .withIndex('by_org_user', (q) => q.eq('organizationId', organizationId).eq('userId', user._id))
    .first();

  if (!membership) {
    authzError('forbidden', 'You are not a member of this organization.');
  }

  if (roleOrder[membership.role] < roleOrder[minRole]) {
    authzError('forbidden', `This action requires role ${minRole} or higher.`);
  }

  return { user, membership };
}

export async function resolveOrgForUser(
  ctx: Ctx,
  requestedOrganizationId: Id<'organizations'> | undefined,
  minRole: Role = 'viewer'
) {
  const { user } = await requireUser(ctx);

  if (requestedOrganizationId) {
    const { membership } = await requireOrgMembership(ctx, requestedOrganizationId, minRole);
    return { organizationId: requestedOrganizationId, user, membership };
  }

  const memberships = (await ctx.db.query('memberships').collect()).filter((m) => m.userId === user._id);

  if (memberships.length === 0) {
    authzError('forbidden', 'You do not belong to any organization.');
  }

  const eligible = memberships.filter((m) => roleOrder[m.role] >= roleOrder[minRole]);
  if (eligible.length === 0) {
    authzError('forbidden', `No organization membership satisfies minimum role ${minRole}.`);
  }

  if (eligible.length > 1) {
    authzError('forbidden', 'Multiple organizations available; specify organizationId explicitly.');
  }

  return { organizationId: eligible[0].organizationId, user, membership: eligible[0] };
}

export function requireEntity<T>(entity: T | null, label: string): T {
  if (!entity) {
    authzError('not_found', `${label} not found.`);
  }
  return entity;
}

export const roleValidator = v.union(v.literal('viewer'), v.literal('operator'), v.literal('admin'), v.literal('owner'));
