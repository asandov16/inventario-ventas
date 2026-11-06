import { useContext } from 'react';

import type { CurrentProfile } from '../domain/profile';
import { CurrentProfileContext } from './currentProfileContext';

/** The signed-in user's profile. Only valid inside the AuthGate. */
export function useCurrentProfile(): CurrentProfile {
  const profile = useContext(CurrentProfileContext);
  if (!profile) throw new Error('useCurrentProfile must be used inside CurrentProfileProvider');
  return profile;
}
