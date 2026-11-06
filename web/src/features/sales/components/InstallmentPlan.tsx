import { formatShortDate } from '@/shared/domain/dates';
import { formatColones } from '@/shared/domain/money';

import { SALES_MESSAGES } from '../messages.es';
import styles from './Sell.module.css';

interface InstallmentPlanProps {
  installments: readonly { number: number; dueDate: string; amountColones: number }[];
}

/** The installment rows: "Cuota 1 · 2 dic — ₡9 500" (prototype `.plan`). */
export function InstallmentPlan({ installments }: InstallmentPlanProps) {
  return (
    <ul className={styles.plan}>
      {installments.map((installment) => (
        <li key={installment.number}>
          <span>
            {SALES_MESSAGES.installmentLine(
              installment.number,
              formatShortDate(installment.dueDate),
            )}
          </span>
          <strong>{formatColones(installment.amountColones)}</strong>
        </li>
      ))}
    </ul>
  );
}
