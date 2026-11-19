import { Badge } from '@/shared/ui/Badge';
import { ErrorState, Loading } from '@/shared/ui/ErrorState';

import { useUsers } from '../hooks/useProfile';
import { PROFILE_MESSAGES } from '../messages.es';
import styles from './ProfileSection.module.css';

/**
 * Perfil → Usuarios (F7-T10), only with users.admin: a read-only list. People are
 * added by support with docs/runbooks/crear-usuario.md.
 */
export function UsersPanel() {
  const users = useUsers(true);

  return (
    <section className={styles.card} aria-labelledby="users-title">
      <h3 id="users-title" className={styles.cardTitle}>
        {PROFILE_MESSAGES.usersTitle}
      </h3>
      {users.isPending ? (
        <Loading label={PROFILE_MESSAGES.usersLoading} />
      ) : users.isError ? (
        <ErrorState
          onRetry={() => {
            void users.refetch();
          }}
        />
      ) : (
        <ul className={styles.catalog}>
          {users.data.map((user) => (
            <li key={user.id} className={styles.catalogRow}>
              <span className={styles.catalogName}>
                {user.name}
                <span className={styles.muted}> · {user.roleName}</span>
              </span>
              <Badge kind={user.active ? 'ok' : 'muted'}>
                {user.active ? PROFILE_MESSAGES.userActive : PROFILE_MESSAGES.userInactive}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.muted}>{PROFILE_MESSAGES.usersSupport}</p>
    </section>
  );
}
