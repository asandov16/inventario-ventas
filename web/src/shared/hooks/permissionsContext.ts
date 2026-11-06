import { createContext } from 'react';

/**
 * The signed-in user's permission codes (from get_my_profile). The UI hides
 * what the person cannot do; the database still enforces every permission.
 */
export const PermissionsContext = createContext<ReadonlySet<string>>(new Set());
