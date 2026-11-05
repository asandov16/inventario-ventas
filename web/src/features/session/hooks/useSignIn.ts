import { useMutation } from '@tanstack/react-query';

import { toAppError, type AppError } from '@/shared/api/errors';

import { signInWithPassword } from '../api/sessionRepository';

interface Credentials {
  email: string;
  password: string;
}

/** Sign in with email and password; errors come back in Spanish. */
export function useSignIn() {
  return useMutation<undefined, AppError, Credentials>({
    mutationFn: async ({ email, password }) => {
      try {
        await signInWithPassword(email, password);
        return undefined;
      } catch (error) {
        throw toAppError(error);
      }
    },
    retry: false,
  });
}
