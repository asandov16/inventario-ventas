import { describe, expect, it } from 'vitest';

import { buildWhatsappLink } from './whatsapp';

describe('buildWhatsappLink', () => {
  it('uses the international number without + and encodes the message', () => {
    expect(buildWhatsappLink('+50680000001', 'Hola, ¿cómo está? Cuota ₡16 600')).toBe(
      'https://wa.me/50680000001?text=Hola%2C%20%C2%BFc%C3%B3mo%20est%C3%A1%3F%20Cuota%20%E2%82%A116%20600',
    );
  });

  it('accepts the local format', () => {
    expect(buildWhatsappLink('8000-0001', 'Hola')).toBe('https://wa.me/50680000001?text=Hola');
  });

  it('returns null for an invalid phone', () => {
    expect(buildWhatsappLink('123', 'Hola')).toBeNull();
  });
});
