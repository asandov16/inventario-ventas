import type { ReactNode } from 'react';

import { PermissionsContext } from './permissionsContext';

export function PermissionsProvider({
  permissions,
  children,
}: {
  permissions: ReadonlySet<string>;
  children: ReactNode;
}) {
  return <PermissionsContext value={permissions}>{children}</PermissionsContext>;
}
