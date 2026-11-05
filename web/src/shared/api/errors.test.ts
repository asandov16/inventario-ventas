import { describe, expect, it } from 'vitest';

import { toAppError } from './errors';
import { API_MESSAGES } from './messages.es';

const NBSP = ' ';

function businessError(code: string, detail: Record<string, unknown> = {}) {
  return { code: 'P0001', message: code, details: JSON.stringify(detail), hint: null };
}

describe('toAppError', () => {
  it('translates a business error using its detail', () => {
    const error = toAppError(
      businessError('insufficient_stock', { product_name: 'Rosa Imperial', available: 2 }),
    );
    expect(error).toMatchObject({ kind: 'business', code: 'insufficient_stock' });
    expect(error.message).toBe('Solo quedan 2 de Rosa Imperial; ajusta la cantidad.');
  });

  it('formats amounts in colones', () => {
    expect(toAppError(businessError('total_changed', { total: 60000 })).message).toContain(
      `₡60${NBSP}000`,
    );
  });

  it('uses the D-10 message for term_too_long', () => {
    expect(toAppError(businessError('term_too_long', { financed: 200 })).message).toBe(
      'Con este saldo, elige menos meses.',
    );
  });

  it('falls back to the generic message for an unknown code, keeping the code', () => {
    const error = toAppError(businessError('something_new'));
    expect(error).toMatchObject({ kind: 'business', code: 'something_new' });
    expect(error.message).toBe(API_MESSAGES.saveFailed);
  });

  it('survives a detail that is not JSON', () => {
    const error = toAppError({ code: 'P0001', message: 'sale_voided', details: 'oops' });
    expect(error.detail).toEqual({});
  });

  it('recognizes network failures', () => {
    expect(toAppError(new TypeError('Failed to fetch')).kind).toBe('network');
    expect(toAppError({ message: 'TypeError: Load failed', code: '' }).kind).toBe('network');
  });

  it('recognizes an expired session', () => {
    expect(toAppError({ code: 'PGRST301', message: 'JWT expired' }).message).toBe(
      API_MESSAGES.sessionExpired,
    );
  });

  it('never shows a technical message for unexpected errors', () => {
    const error = toAppError(new Error('relation "x" does not exist'));
    expect(error).toMatchObject({ kind: 'unknown', message: API_MESSAGES.saveFailed });
  });

  it('returns an AppError unchanged', () => {
    const original = toAppError(businessError('invalid_phone'));
    expect(toAppError(original)).toBe(original);
  });
});
