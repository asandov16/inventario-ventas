import { formatDayLabel, formatShortDate, formatTime, toBusinessDate } from '@/shared/domain/dates';
import { formatColones } from '@/shared/domain/money';
import { Badge, type BadgeKind } from '@/shared/ui/Badge';

import type { InstallmentStatus, SaleDetail } from '../domain/saleDetail';
import { SALES_MESSAGES } from '../messages.es';
import styles from './SaleDetail.module.css';

const INSTALLMENT_BADGE: Record<InstallmentStatus, BadgeKind> = {
  paid: 'ok',
  partial: 'warn',
  pending: 'muted',
  overdue: 'bad',
  voided: 'muted',
};

function dayAndTime(instant: string): string {
  const date = new Date(instant);
  return `${formatDayLabel(date)} · ${formatTime(date)}`;
}

interface PaymentPlanCardProps {
  sale: SaleDetail;
  /** The payment just saved, marked "Nuevo" (RF-FB-03). */
  newPaymentId?: string | null;
}

/**
 * Plan de pagos (F5-T02, F5-T06): paid and balance, progress, the prima, each
 * installment with its status and the payments received. Used by the sale sheet
 * and by the account sheet of Por cobrar.
 */
export function PaymentPlanCard({ sale, newPaymentId = null }: PaymentPlanCardProps) {
  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>{SALES_MESSAGES.planTitle}</h3>
      <p className={styles.sumLine}>
        <span>{SALES_MESSAGES.paid}</span>
        <strong className={styles.okText}>{formatColones(sale.paidColones)}</strong>
      </p>
      <p className={styles.sumLine}>
        <span>{SALES_MESSAGES.balance}</span>
        <strong>{formatColones(sale.balanceColones)}</strong>
      </p>
      <div
        className={styles.bar}
        role="progressbar"
        aria-valuenow={sale.progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={SALES_MESSAGES.saleProgressLabel(sale.progressPct)}
      >
        <i style={{ width: `${String(Math.min(100, sale.progressPct))}%` }} />
      </div>
      <ul className={styles.plan}>
        {sale.downPaymentColones > 0 && (
          <li>
            <span>
              {SALES_MESSAGES.downPaymentLine(
                formatShortDate(toBusinessDate(new Date(sale.clientCreatedAt))),
              )}
            </span>
            <span className={styles.planAmount}>
              {formatColones(sale.downPaymentColones)}
              <Badge kind="ok">{SALES_MESSAGES.installmentStatus.paid}</Badge>
            </span>
          </li>
        )}
        {sale.installments.map((installment) => (
          <li key={installment.number}>
            <span>
              {SALES_MESSAGES.installmentLine(
                installment.number,
                formatShortDate(installment.dueDate),
              )}
              {installment.status === 'partial' && (
                <span className={styles.muted}>
                  {' · '}
                  {SALES_MESSAGES.installmentPaidPart(formatColones(installment.paidColones))}
                </span>
              )}
            </span>
            <span className={styles.planAmount}>
              {formatColones(installment.amountColones)}
              <Badge kind={INSTALLMENT_BADGE[installment.status]}>
                {SALES_MESSAGES.installmentStatus[installment.status]}
              </Badge>
            </span>
          </li>
        ))}
      </ul>
      {sale.payments.length > 0 && (
        <>
          <h3 className={styles.cardTitle}>{SALES_MESSAGES.paymentsTitle}</h3>
          <ul className={styles.plan}>
            {sale.payments.map((payment) => (
              <li key={payment.id}>
                <span>
                  {payment.kind === 'legacy'
                    ? SALES_MESSAGES.paymentLegacy
                    : SALES_MESSAGES.paymentLine(
                        dayAndTime(payment.clientCreatedAt),
                        payment.paymentMethodName,
                      )}
                  {payment.id === newPaymentId && (
                    <>
                      {' '}
                      <Badge kind="ok">{SALES_MESSAGES.newPayment}</Badge>
                    </>
                  )}
                </span>
                <strong>{formatColones(payment.amountColones)}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
