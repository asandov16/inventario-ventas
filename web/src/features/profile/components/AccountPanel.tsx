import { useState } from 'react';

import { SESSION_MESSAGES, useCurrentProfile, useSignOut } from '@/features/session';
import { formatColones } from '@/shared/domain/money';
import { usePermission } from '@/shared/hooks/usePermission';
import { BusyButton } from '@/shared/ui/BusyButton';
import { Button } from '@/shared/ui/Button';
import { Kpi, KpiGrid } from '@/shared/ui/Kpi';
import { TextField } from '@/shared/ui/TextField';

import { MIN_PASSWORD_LENGTH, orderedPermissions, reviewPassword } from '../domain/profile';
import { useChangePassword, useMySales } from '../hooks/useProfile';
import { PROFILE_MESSAGES } from '../messages.es';
import styles from './ProfileSection.module.css';

/** Mi cuenta (CU-14, F7-T07): who I am, what I can do, my sales, my password. */
export function AccountPanel({ onAbout }: { onAbout: () => void }) {
  const profile = useCurrentProfile();
  const signOut = useSignOut();
  const canSeeCosts = usePermission('costs.read');
  const mySales = useMySales(profile.userId);

  return (
    <>
      <section className={styles.card}>
        <div className={styles.identity}>
          <span className={styles.avatar} aria-hidden="true">
            {profile.fullName.charAt(0)}
          </span>
          <div>
            <p className={styles.name}>{profile.fullName}</p>
            <p className={styles.muted}>
              {profile.roleName} · {profile.business.name}
            </p>
          </div>
        </div>
      </section>

      {mySales.data && (
        <KpiGrid>
          <Kpi label={PROFILE_MESSAGES.mySales} value={mySales.data.count} />
          <Kpi
            label={PROFILE_MESSAGES.mySalesAmount}
            value={formatColones(mySales.data.totalColones)}
          />
        </KpiGrid>
      )}

      <section className={styles.card} aria-labelledby="permissions-title">
        <h3 id="permissions-title" className={styles.cardTitle}>
          {PROFILE_MESSAGES.permissionsTitle}
        </h3>
        <ul className={styles.permissions}>
          {orderedPermissions(profile.permissions).map((code) => (
            <li key={code}>{PROFILE_MESSAGES.permissions[code]}</li>
          ))}
        </ul>
        {!canSeeCosts && <p className={styles.muted}>{PROFILE_MESSAGES.noCostsNote}</p>}
      </section>

      <PasswordForm />

      <div className={styles.actions}>
        <Button variant="light" block onClick={onAbout}>
          {PROFILE_MESSAGES.aboutButton}
        </Button>
        <Button variant="light" block onClick={() => void signOut()}>
          {SESSION_MESSAGES.signOut}
        </Button>
      </div>
    </>
  );
}

function PasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const { change, isPending } = useChangePassword();
  const issue = reviewPassword(password, confirmation);

  async function submit() {
    if (issue) {
      setShowErrors(true);
      return;
    }
    setFailure(null);
    const outcome = await change(password);
    if (outcome.ok) {
      setPassword('');
      setConfirmation('');
      setShowErrors(false);
    } else {
      setFailure(outcome.message);
    }
  }

  return (
    <form
      className={styles.card}
      noValidate
      aria-labelledby="password-title"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h3 id="password-title" className={styles.cardTitle}>
        {PROFILE_MESSAGES.passwordTitle}
      </h3>
      <TextField
        label={PROFILE_MESSAGES.newPassword}
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        hint={PROFILE_MESSAGES.newPasswordHint}
        value={password}
        error={showErrors && issue === 'too_short' ? PROFILE_MESSAGES.passwordTooShort : null}
        onChange={(event) => {
          setPassword(event.target.value);
        }}
      />
      <TextField
        label={PROFILE_MESSAGES.confirmPassword}
        type="password"
        autoComplete="new-password"
        value={confirmation}
        error={showErrors && issue === 'mismatch' ? PROFILE_MESSAGES.passwordMismatch : null}
        onChange={(event) => {
          setConfirmation(event.target.value);
        }}
      />
      {failure && (
        <p className={styles.error} role="alert">
          {failure}
        </p>
      )}
      <BusyButton type="submit" block busy={isPending} busyLabel={PROFILE_MESSAGES.savingPassword}>
        {PROFILE_MESSAGES.savePassword}
      </BusyButton>
    </form>
  );
}
