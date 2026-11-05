import { z } from 'zod';

import { callRpc } from '@/shared/api/rpc';

import type { ProfileResult } from '../domain/profile';

const profileResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    profile: z.object({
      id: z.string(),
      full_name: z.string(),
      role_code: z.string(),
      role_name: z.string(),
    }),
    business: z.object({ id: z.string(), name: z.string(), timezone: z.string() }),
    permissions: z.array(z.string()),
  }),
  z.object({ status: z.literal('inactive') }),
  z.object({ status: z.literal('no_profile') }),
]);

/** Loads the signed-in user's profile, business and permissions. */
export async function fetchMyProfile(): Promise<ProfileResult> {
  const response = profileResponseSchema.parse(await callRpc('get_my_profile', {}));
  if (response.status !== 'ok') return { status: response.status };
  return {
    status: 'ok',
    profile: {
      userId: response.profile.id,
      fullName: response.profile.full_name,
      roleCode: response.profile.role_code,
      roleName: response.profile.role_name,
      business: response.business,
      permissions: new Set(response.permissions),
    },
  };
}

export { signInWithPassword, signOut, onAuthChange, type AuthUser } from '@/shared/api/auth';
