import { useCallback, useEffect } from 'react';

import { confirm } from './feedback';
import { HOOK_MESSAGES } from './messages.es';

/**
 * RF-FB-08: closing a form with unsaved changes asks first. Returns a wrapper
 * for the close action; also warns before reloading or leaving the page.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isDirty]);

  return useCallback(
    async (close: () => void) => {
      if (!isDirty) {
        close();
        return;
      }
      const discard = await confirm({
        title: HOOK_MESSAGES.discardTitle,
        message: HOOK_MESSAGES.discardMessage,
        confirmLabel: HOOK_MESSAGES.discardConfirm,
        cancelLabel: HOOK_MESSAGES.discardCancel,
        danger: true,
      });
      if (discard) close();
    },
    [isDirty],
  );
}
