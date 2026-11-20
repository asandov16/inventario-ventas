import { describe, expect, it } from 'vitest';

import { buildReminderMessage, buildWhatsappLink } from './whatsapp';

describe('buildReminderMessage', () => {
  const facts = {
    customerName: 'Danae Zeledón',
    businessName: 'Mi Negocio',
    amountColones: 10000,
    dueDate: '2026-11-05',
    balanceColones: 30000,
  };

  it('says who writes, the installment with its date and the balance', () => {
    expect(buildReminderMessage(facts, 2026).replace(/\s/g, ' ')).toBe(
      'Hola Danae Zeledón, le saluda Mi Negocio. Le recordamos su cuota de ₡10 000 con fecha 5 nov. Saldo pendiente: ₡30 000. ¡Muchas gracias!',
    );
  });

  it('leaves the date out when there is none', () => {
    expect(buildReminderMessage({ ...facts, dueDate: null })).not.toContain('con fecha');
  });
});

describe('buildWhatsappLink', () => {
  it('uses the international number without + and encodes the message', () => {
    expect(buildWhatsappLink('+50612300001', 'Hola, ¿cómo está? Cuota ₡16 600')).toBe(
      'https://wa.me/50612300001?text=Hola%2C%20%C2%BFc%C3%B3mo%20est%C3%A1%3F%20Cuota%20%E2%82%A116%20600',
    );
  });

  it('accepts the local format', () => {
    expect(buildWhatsappLink('1230-0001', 'Hola')).toBe('https://wa.me/50612300001?text=Hola');
  });

  it('returns null for an invalid phone', () => {
    expect(buildWhatsappLink('123', 'Hola')).toBeNull();
  });
});
