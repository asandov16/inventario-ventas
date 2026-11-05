import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { toAppError } from '@/shared/api/errors';
import { confirm, showToast } from '@/shared/hooks/feedback';

import { signOut } from '../api/sessionRepository';
import { SESSION_MESSAGES } from '../messages.es';

/** Asks first (CU-14), then signs out and forgets every cached read. */
export function useSignOut() {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    const confirmed = await confirm({
      title: SESSION_MESSAGES.signOutTitle,
      message: SESSION_MESSAGES.signOutMessage,
      confirmLabel: SESSION_MESSAGES.signOut,
      cancelLabel: SESSION_MESSAGES.signOutCancel,
    });
    if (!confirmed) return;
    try {
      await signOut();
      queryClient.clear();
      showToast('info', SESSION_MESSAGES.signedOut);
    } catch (error) {
      showToast('error', toAppError(error).message);
    }
  }, [queryClient]);
}
