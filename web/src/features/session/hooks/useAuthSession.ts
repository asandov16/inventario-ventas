import { useEffect, useState } from 'react';

import { onAuthChange, type AuthUser } from '../api/sessionRepository';

export type AuthSession =
  { status: 'loading' } | { status: 'signed_out' } | { status: 'signed_in'; user: AuthUser };

/** Current Supabase session; the session persists on the device (RF-PER-01). */
export function useAuthSession(): AuthSession {
  const [session, setSession] = useState<AuthSession>({ status: 'loading' });

  useEffect(
    () =>
      onAuthChange((user) => {
        setSession((previous) => {
          if (!user) return { status: 'signed_out' };
          // Token refreshes emit the same user: keep the object to avoid re-renders.
          if (previous.status === 'signed_in' && previous.user.id === user.id) return previous;
          return { status: 'signed_in', user };
        });
      }),
    [],
  );

  return session;
}
