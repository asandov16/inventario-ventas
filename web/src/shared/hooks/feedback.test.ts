import { afterEach, describe, expect, it, vi } from 'vitest';

import { answerDialog, confirm, showToast, TOAST_DURATION_MS, useFeedbackState } from './feedback';

// Read the store without React: useSyncExternalStore is not needed for these checks.
vi.mock('react', () => ({
  useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
}));

afterEach(() => {
  vi.useRealTimers();
});

describe('feedback store', () => {
  it('shows a toast and hides it after its duration', () => {
    vi.useFakeTimers();
    showToast('ok', 'Venta #1016 registrada');
    expect(useFeedbackState().toasts).toEqual([
      expect.objectContaining({ kind: 'ok', message: 'Venta #1016 registrada' }),
    ]);
    vi.advanceTimersByTime(TOAST_DURATION_MS.ok);
    expect(useFeedbackState().toasts).toEqual([]);
  });

  it('keeps only the newest toast', () => {
    vi.useFakeTimers();
    showToast('ok', 'primero');
    showToast('error', 'segundo');
    expect(useFeedbackState().toasts.map((t) => t.message)).toEqual(['segundo']);
  });

  it('resolves a confirmation with the answer', async () => {
    const answer = confirm({
      title: '¿Descartar cambios?',
      message: 'Hay cambios sin guardar.',
      confirmLabel: 'Descartar',
      cancelLabel: 'Seguir editando',
    });
    expect(useFeedbackState().dialog?.title).toBe('¿Descartar cambios?');
    answerDialog(true);
    await expect(answer).resolves.toBe(true);
    expect(useFeedbackState().dialog).toBeNull();
  });

  it('cancels a pending confirmation when a new one opens', async () => {
    const options = { title: 'a', message: 'b', confirmLabel: 'c', cancelLabel: 'd' };
    const first = confirm(options);
    const second = confirm(options);
    await expect(first).resolves.toBe(false);
    answerDialog(true);
    await expect(second).resolves.toBe(true);
  });
});
