import { describe, expect, it } from 'vitest';

import { isSearchable, validateNewCustomer } from './customer';

describe('isSearchable', () => {
  it.each([
    ['Le', true],
    ['L', false],
    ['800', true],
    ['80', false],
    ['8000-00', true],
    ['', false],
  ])('%j → %s', (query, expected) => {
    expect(isSearchable(query)).toBe(expected);
  });
});

describe('validateNewCustomer', () => {
  it('accepts a name and an 8-digit phone', () => {
    expect(
      validateNewCustomer({ name: 'Leonor Villalta', phone: '8000-0014', whatsappOptIn: false }),
    ).toBeNull();
  });

  it('asks for the name first', () => {
    expect(validateNewCustomer({ name: ' ', phone: '123', whatsappOptIn: false })).toEqual({
      field: 'name',
      code: 'invalid_name',
    });
  });

  it('rejects a phone without 8 digits', () => {
    expect(validateNewCustomer({ name: 'Ana', phone: '8000-001', whatsappOptIn: false })).toEqual({
      field: 'phone',
      code: 'invalid_phone',
    });
  });
});
