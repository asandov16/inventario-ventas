import type { BadgeKind } from '@/shared/ui/Badge';

import type { StockStatus } from '../domain/inventory';

/** Colour of the OK / Bajo / Agotado label (RN-10). */
export const BADGE_FOR_STATUS: Record<StockStatus, BadgeKind> = {
  ok: 'ok',
  low: 'warn',
  out: 'bad',
};
