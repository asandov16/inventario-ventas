import type { ReactNode } from 'react';

import type { CurrentProfile } from '../domain/profile';
import { CurrentProfileContext } from './currentProfileContext';

/** Provided by the AuthGate once the profile has loaded. */
export function CurrentProfileProvider({
  profile,
  children,
}: {
  profile: CurrentProfile;
  children: ReactNode;
}) {
  return <CurrentProfileContext value={profile}>{children}</CurrentProfileContext>;
}
