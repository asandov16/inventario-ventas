// Spanish copy used by the pure formatting helpers in shared/domain.
export const DOMAIN_MESSAGES = {
  monthsShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  today: 'Hoy',
  yesterday: 'Ayer',
  justNow: 'Ahora',
  minutesAgo: (minutes: number) => `hace ${String(minutes)} min`,
  hoursAgo: (hours: number) => `hace ${String(hours)} h`,
} as const;
