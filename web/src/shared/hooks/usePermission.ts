import { useContext } from 'react';

import { PermissionsContext } from './permissionsContext';

/** True when the user has the permission, e.g. usePermission('costs.read'). */
export function usePermission(code: string): boolean {
  return useContext(PermissionsContext).has(code);
}
