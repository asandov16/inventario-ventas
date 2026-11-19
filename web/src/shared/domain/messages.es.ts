// Spanish copy used by the pure formatting helpers in shared/domain.
export const DOMAIN_MESSAGES = {
  monthsShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  today: 'Hoy',
  yesterday: 'Ayer',
  justNow: 'Ahora',
  minutesAgo: (minutes: number) => `hace ${String(minutes)} min`,
  hoursAgo: (hours: number) => `hace ${String(hours)} h`,
  /** Payment reminder (roadmap F5-T07): greeting, business, installment and date, balance. */
  reminder: (
    customer: string,
    business: string,
    amount: string,
    date: string | null,
    balance: string,
  ) =>
    `Hola ${customer}, le saluda ${business}. Le recordamos su cuota de ${amount}${date ? ` con fecha ${date}` : ''}. Saldo pendiente: ${balance}. ¡Muchas gracias!`,
} as const;
