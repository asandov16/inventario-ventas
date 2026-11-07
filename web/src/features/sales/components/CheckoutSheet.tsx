import { useState } from 'react';

import { formatColones } from '@/shared/domain/money';
import { BusyButton } from '@/shared/ui/BusyButton';
import { ChoiceGroup } from '@/shared/ui/ChoiceGroup';
import { Sheet } from '@/shared/ui/Sheet';

import type { PaymentMethod } from '../domain/catalog';
import type { CartApi } from '../hooks/useCart';
import { SALES_MESSAGES } from '../messages.es';
import styles from './Sell.module.css';

type SaleType = 'cash' | 'installments';

interface CheckoutSheetProps {
  open: boolean;
  onClose: () => void;
  cart: CartApi;
  paymentMethods: readonly PaymentMethod[];
}

/**
 * Summary of the sale before registering it (F4-T03): quantities with − / +,
 * cash or installments, payment method. The customer picker, the installment
 * plan and the submit arrive with F4-T04 to T06; until then "Registrar venta"
 * stays disabled, because a sale is never saved without a customer (RN-01).
 */
export function CheckoutSheet({ open, onClose, cart, paymentMethods }: CheckoutSheetProps) {
  const [saleType, setSaleType] = useState<SaleType>('cash');
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const selectedMethod = paymentMethodId ?? paymentMethods[0]?.id ?? null;

  return (
    <Sheet open={open} title={SALES_MESSAGES.checkoutTitle} onClose={onClose}>
      {cart.lines.length === 0 ? (
        <p className={styles.sheetNote}>{SALES_MESSAGES.emptyCartInSheet}</p>
      ) : (
        <ul className={styles.lines}>
          {cart.lines.map(({ product, quantity, subtotalColones }) => (
            <li key={product.id} className={styles.line}>
              <div className={styles.lineInfo}>
                <p className={styles.lineName}>{product.name}</p>
                <p className={styles.lineMeta}>
                  {SALES_MESSAGES.perUnit(formatColones(product.priceColones))}
                </p>
              </div>
              <div className={styles.quantity}>
                <button
                  type="button"
                  aria-label={SALES_MESSAGES.less(product.name)}
                  onClick={() => {
                    cart.decrement(product.id);
                  }}
                >
                  −
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  aria-label={SALES_MESSAGES.more(product.name)}
                  onClick={() => {
                    cart.add(product);
                  }}
                >
                  +
                </button>
              </div>
              <p className={styles.lineTotal}>{formatColones(subtotalColones)}</p>
            </li>
          ))}
        </ul>
      )}

      <ChoiceGroup<SaleType>
        label={SALES_MESSAGES.saleType}
        value={saleType}
        onChange={setSaleType}
        choices={[
          { value: 'cash', label: SALES_MESSAGES.cash, hint: SALES_MESSAGES.cashHint },
          {
            value: 'installments',
            label: SALES_MESSAGES.installments,
            hint: SALES_MESSAGES.installmentsHint,
          },
        ]}
      />

      <div className={styles.customerSlot}>
        <p className={styles.customerLabel}>
          {SALES_MESSAGES.customer} *
          <span className={styles.customerHint}> · {SALES_MESSAGES.customerRequiredHint}</span>
        </p>
        <p className={styles.sheetNote}>{SALES_MESSAGES.chooseCustomerFirst}</p>
      </div>

      {paymentMethods.length > 0 && (
        <ChoiceGroup
          label={SALES_MESSAGES.paymentMethod}
          value={selectedMethod}
          onChange={setPaymentMethodId}
          choices={paymentMethods.map((method) => ({ value: method.id, label: method.name }))}
        />
      )}

      <div className={styles.summary}>
        <p className={styles.summaryLine}>
          <span>{SALES_MESSAGES.total}</span>
          <span>{formatColones(cart.totalColones)}</span>
        </p>
        <p className={styles.summaryBig}>
          <span>{SALES_MESSAGES.receiveToday}</span>
          <span>{formatColones(cart.totalColones)}</span>
        </p>
      </div>

      <BusyButton block disabled busy={false} busyLabel="">
        {SALES_MESSAGES.register}
      </BusyButton>
      <p className={styles.sheetNote}>{SALES_MESSAGES.chooseCustomerFirst}</p>
    </Sheet>
  );
}
