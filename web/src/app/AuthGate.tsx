import type { ReactNode } from 'react';

import {
  BlockedScreen,
  CurrentProfileProvider,
  LoginScreen,
  SESSION_MESSAGES,
  useAuthSession,
  useMyProfile,
} from '@/features/session';
import { API_MESSAGES } from '@/shared/api/messages.es';
import { PermissionsProvider } from '@/shared/hooks/PermissionsProvider';
import { ErrorState, Loading } from '@/shared/ui/ErrorState';

import styles from './AuthGate.module.css';
import { APP_MESSAGES } from './messages.es';

const appName = import.meta.env.VITE_APP_NAME ?? APP_MESSAGES.defaultAppName;

/**
 * Nothing of the app shows without a session and a profile (F3-T05):
 * signed out → login; inactive or no profile → explanation; otherwise the app,
 * with the profile and permissions available to every section.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const session = useAuthSession();

  if (session.status === 'loading') {
    return (
      <div className={styles.centered}>
        <Loading />
      </div>
    );
  }
  if (session.status === 'signed_out') return <LoginScreen appName={appName} />;
  return <ProfileGate userId={session.user.id}>{children}</ProfileGate>;
}

function ProfileGate({ userId, children }: { userId: string; children: ReactNode }) {
  const profile = useMyProfile(userId);

  if (profile.isPending) {
    return (
      <div className={styles.centered}>
        <Loading label={SESSION_MESSAGES.loadingProfile} />
      </div>
    );
  }
  if (profile.isError) {
    return (
      <div className={styles.centered}>
        <ErrorState
          message={API_MESSAGES.loadFailed}
          onRetry={() => {
            void profile.refetch();
          }}
        />
      </div>
    );
  }
  if (profile.data.status !== 'ok') return <BlockedScreen reason={profile.data.status} />;

  const current = profile.data.profile;
  return (
    <CurrentProfileProvider profile={current}>
      <PermissionsProvider permissions={current.permissions}>{children}</PermissionsProvider>
    </CurrentProfileProvider>
  );
}
