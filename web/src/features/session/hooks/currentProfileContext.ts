import { createContext } from 'react';

import type { CurrentProfile } from '../domain/profile';

/** Filled by CurrentProfileProvider once the AuthGate has loaded the profile. */
export const CurrentProfileContext = createContext<CurrentProfile | null>(null);
