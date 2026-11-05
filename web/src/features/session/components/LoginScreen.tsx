import { useState, type SyntheticEvent } from 'react';

import { Banner } from '@/shared/ui/Banner';
import { BusyButton } from '@/shared/ui/BusyButton';
import { TextField } from '@/shared/ui/TextField';

import { useSignIn } from '../hooks/useSignIn';
import { SESSION_MESSAGES } from '../messages.es';
import styles from './SessionScreens.module.css';

interface FieldErrors {
  email?: string;
  password?: string;
}

/** Email + password sign-in (F3-T05, CU-14). There is no sign-up: the admin creates users. */
export function LoginScreen({ appName }: { appName: string }) {
  const signIn = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    const errors: FieldErrors = {};
    if (email.trim() === '') errors.email = SESSION_MESSAGES.emailRequired;
    else if (password === '') errors.password = SESSION_MESSAGES.passwordRequired;
    setFieldErrors(errors);
    if (errors.email || errors.password) return;
    signIn.mutate({ email, password });
  }

  return (
    <main className={styles.screen}>
      <form className={styles.card} onSubmit={onSubmit} noValidate>
        <div className={styles.logo} aria-hidden="true">
          {appName.trim().charAt(0).toUpperCase()}
        </div>
        <p className={styles.appName}>{appName}</p>
        <h1 className={styles.title}>{SESSION_MESSAGES.loginTitle}</h1>
        <p className={styles.subtitle}>{SESSION_MESSAGES.loginSubtitle}</p>

        {signIn.error && <Banner kind="error" title={signIn.error.message} />}

        <TextField
          label={SESSION_MESSAGES.email}
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          value={email}
          error={fieldErrors.email ?? null}
          onChange={(event) => {
            setEmail(event.target.value);
            setFieldErrors({});
          }}
        />
        <TextField
          label={SESSION_MESSAGES.password}
          type="password"
          autoComplete="current-password"
          value={password}
          error={fieldErrors.password ?? null}
          onChange={(event) => {
            setPassword(event.target.value);
            setFieldErrors({});
          }}
        />
        <BusyButton
          type="submit"
          block
          busy={signIn.isPending}
          busyLabel={SESSION_MESSAGES.submitting}
        >
          {SESSION_MESSAGES.submit}
        </BusyButton>
        <p className={styles.note}>{SESSION_MESSAGES.forgotPassword}</p>
      </form>
    </main>
  );
}
