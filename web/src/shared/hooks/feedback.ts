import { useSyncExternalStore } from 'react';

/**
 * Feedback store (RN-17, section 4.1): toasts and confirmation dialogs.
 * Feature hooks call showToast/confirm; the app layer renders them with the
 * components in shared/ui (FeedbackHost). A tiny external store keeps the
 * layers apart: hooks never import UI components.
 */
export type ToastKind = 'ok' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Red confirm button for irreversible actions. */
  danger?: boolean;
}

export interface PendingDialog extends ConfirmOptions {
  id: number;
}

interface FeedbackState {
  toasts: readonly Toast[];
  dialog: PendingDialog | null;
}

/** Success stays at least 4 s (section 4.1); errors a bit longer. */
export const TOAST_DURATION_MS: Record<ToastKind, number> = { ok: 4500, info: 4500, error: 5000 };

let state: FeedbackState = { toasts: [], dialog: null };
let nextId = 1;
let resolveDialog: ((confirmed: boolean) => void) | null = null;
const listeners = new Set<() => void>();

function setState(next: FeedbackState) {
  state = next;
  for (const listener of listeners) listener();
}

export function dismissToast(id: number) {
  setState({ ...state, toasts: state.toasts.filter((toast) => toast.id !== id) });
}

export function showToast(kind: ToastKind, message: string): number {
  const id = nextId++;
  // One toast at a time keeps the message readable; the newest wins.
  setState({ ...state, toasts: [{ id, kind, message }] });
  setTimeout(() => {
    dismissToast(id);
  }, TOAST_DURATION_MS[kind]);
  return id;
}

/** Asks before doing something; resolves true when the person confirms. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  resolveDialog?.(false);
  return new Promise((resolve) => {
    resolveDialog = resolve;
    setState({ ...state, dialog: { ...options, id: nextId++ } });
  });
}

export function answerDialog(confirmed: boolean) {
  const resolve = resolveDialog;
  resolveDialog = null;
  setState({ ...state, dialog: null });
  resolve?.(confirmed);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useFeedbackState(): FeedbackState {
  return useSyncExternalStore(subscribe, () => state);
}
