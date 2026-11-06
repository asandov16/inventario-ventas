import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/queryKeys';

import { fetchMyProfile } from '../api/sessionRepository';

/** Profile, business and permissions of the signed-in user. */
export function useMyProfile(userId: string) {
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: fetchMyProfile,
  });
}
