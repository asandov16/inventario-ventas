import { toAppError, AppError } from './errors';
import { API_MESSAGES } from './messages.es';
import { supabase } from './supabaseClient';

/** Session helpers; the rest of the app never touches supabase.auth directly. */

export interface AuthUser {
  id: string;
  email: string | null;
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (!error) return;
  // Wrong email or password: say so plainly (CU-14). Anything else is a connection problem.
  if (error.status === 400 || error.code === 'invalid_credentials') {
    throw new AppError('auth', API_MESSAGES.invalidCredentials);
  }
  throw toAppError(error);
}

/**
 * Changes the signed-in user's password (CU-14, F7-T07). Supabase enforces the
 * minimum length (10, supabase/config.toml); its refusals come back in Spanish.
 */
export async function changePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (!error) return;
  if (error.code === 'weak_password') throw new AppError('auth', API_MESSAGES.weakPassword);
  if (error.code === 'same_password') throw new AppError('auth', API_MESSAGES.samePassword);
  throw toAppError(error);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw toAppError(error);
}

/**
 * Subscribes to session changes. Supabase emits the current session right away
 * (INITIAL_SESSION), then every sign-in, sign-out and token refresh.
 */
export function onAuthChange(listener: (user: AuthUser | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(session ? { id: session.user.id, email: session.user.email ?? null } : null);
  });
  return () => {
    data.subscription.unsubscribe();
  };
}
