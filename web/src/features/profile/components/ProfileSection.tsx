import { SESSION_MESSAGES, useCurrentProfile, useSignOut } from '@/features/session';
import { useUrlSheet } from '@/shared/hooks/useUrlSheet';
import { Button } from '@/shared/ui/Button';
import { PageTitle } from '@/shared/ui/PageTitle';
import { Sheet } from '@/shared/ui/Sheet';

import { PROFILE_MESSAGES } from '../messages.es';
import styles from './ProfileSection.module.css';

/** URL parameter of the "about" sheet: /perfil?acerca=1. */
const ABOUT_SHEET_PARAM = 'acerca';

/** Who is signed in and how to leave (CU-14). Settings arrive in Stage 3. */
export function ProfileSection() {
  const profile = useCurrentProfile();
  const signOut = useSignOut();
  const aboutSheet = useUrlSheet(ABOUT_SHEET_PARAM);

  return (
    <>
      <PageTitle title={PROFILE_MESSAGES.title} />
      <section className={styles.card}>
        <p className={styles.name}>{profile.fullName}</p>
        <dl className={styles.facts}>
          <dt>{PROFILE_MESSAGES.roleLabel}</dt>
          <dd>{profile.roleName}</dd>
          <dt>{PROFILE_MESSAGES.businessLabel}</dt>
          <dd>{profile.business.name}</dd>
        </dl>
      </section>
      <p className={styles.note}>{PROFILE_MESSAGES.settingsSoon}</p>
      <div className={styles.actions}>
        <Button
          variant="light"
          block
          onClick={() => {
            aboutSheet.open();
          }}
        >
          {PROFILE_MESSAGES.aboutButton}
        </Button>
        <Button variant="light" block onClick={() => void signOut()}>
          {SESSION_MESSAGES.signOut}
        </Button>
      </div>
      <Sheet
        open={aboutSheet.isOpen}
        title={PROFILE_MESSAGES.aboutTitle}
        onClose={aboutSheet.close}
      >
        <p>{PROFILE_MESSAGES.aboutBody}</p>
        <p>{PROFILE_MESSAGES.aboutBack}</p>
      </Sheet>
    </>
  );
}
