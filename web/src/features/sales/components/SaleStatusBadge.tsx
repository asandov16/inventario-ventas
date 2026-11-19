import { Badge } from '@/shared/ui/Badge';

import type { SaleType } from '../domain/checkout';
import type { SaleStatus } from '../domain/saleDetail';
import { SALES_MESSAGES } from '../messages.es';

interface SaleStatusBadgeProps {
  status: SaleStatus;
  type: SaleType;
  source: 'app' | 'legacy_import';
  months: number | null;
  /** Only shown for cash sales in the detail ("Contado · SINPE Móvil"). */
  paymentMethodName?: string | null;
}

/** Contado / A pagos (N meses) / Pagada / Vencida / Anulada / Saldo anterior (F5-T01). */
export function SaleStatusBadge({
  status,
  type,
  source,
  months,
  paymentMethodName = null,
}: SaleStatusBadgeProps) {
  if (status === 'voided') return <Badge kind="muted">{SALES_MESSAGES.statusVoided}</Badge>;
  if (type === 'cash') {
    return <Badge kind="brand">{SALES_MESSAGES.statusCash(paymentMethodName)}</Badge>;
  }
  if (status === 'paid') return <Badge kind="ok">{SALES_MESSAGES.statusPaid}</Badge>;
  if (status === 'overdue') return <Badge kind="bad">{SALES_MESSAGES.statusOverdue}</Badge>;
  if (source === 'legacy_import') return <Badge kind="gold">{SALES_MESSAGES.statusLegacy}</Badge>;
  return (
    <Badge kind="gold">
      {months === null
        ? SALES_MESSAGES.statusInstallmentsShort
        : SALES_MESSAGES.statusInstallments(months)}
    </Badge>
  );
}
