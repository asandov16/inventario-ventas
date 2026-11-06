import { answerDialog, useFeedbackState } from '@/shared/hooks/feedback';
import { Dialog } from '@/shared/ui/Dialog';
import { ToastViewport } from '@/shared/ui/ToastViewport';

/** Renders the toasts and the confirmation dialog requested through shared/hooks/feedback. */
export function FeedbackHost() {
  const { toasts, dialog } = useFeedbackState();
  return (
    <>
      <ToastViewport toasts={toasts} />
      {dialog && (
        <Dialog
          key={dialog.id}
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={dialog.cancelLabel}
          danger={dialog.danger ?? false}
          onConfirm={() => {
            answerDialog(true);
          }}
          onCancel={() => {
            answerDialog(false);
          }}
        />
      )}
    </>
  );
}
