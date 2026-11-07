import { formatColones } from '@/shared/domain/money';

import { SALES_MESSAGES } from '../messages.es';
import styles from './Sell.module.css';

interface CartBarProps {
  units: number;
  totalColones: number;
  onClear: () => void;
  onCharge: () => void;
}

/** Sticky bar at the bottom of Vender: units, total, empty and Cobrar (F4-T02). */
export function CartBar({ units, totalColones, onClear, onCharge }: CartBarProps) {
  return (
    <div className={styles.cartBar}>
      <div className={styles.cartInfo}>
        <p className={styles.cartUnits}>
          {SALES_MESSAGES.cartUnits(units)} ·{' '}
          <button
            type="button"
            className={styles.cartClear}
            aria-label={SALES_MESSAGES.clearCartLabel}
            onClick={onClear}
          >
            {SALES_MESSAGES.clearCart}
          </button>
        </p>
        <p className={styles.cartTotal}>{formatColones(totalColones)}</p>
      </div>
      <button type="button" className={styles.chargeButton} onClick={onCharge}>
        {SALES_MESSAGES.charge}
      </button>
    </div>
  );
}
