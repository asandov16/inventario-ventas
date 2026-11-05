import { useState } from 'react';

import { CustomerPicker, type Customer } from '@/features/customers';
import { toBusinessDate } from '@/shared/domain/dates';
import { formatColones, parseColones } from '@/shared/domain/money';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { BusyButton } from '@/shared/ui/BusyButton';
import { ChoiceGroup } from '@/shared/ui/ChoiceGroup';
import { Sheet } from '@/shared/ui/Sheet';
import { TextField } from '@/shared/ui/TextField';

import type { PaymentMethod } from '../domain/catalog';
import { reviewCheckout, TERM_OPTIONS, type SaleType, type TermMonths } from '../domain/checkout';
import type { SavedSale } from '../domain/sale';
import type { CartApi } from '../hooks/useCart';
import { useRegisterSale } from '../hooks/useRegisterSale';
import { SALES_MESSAGES } from '../messages.es';
import { InstallmentPlan } from './InstallmentPlan';
import styles from './Sell.module.css';

interface CheckoutSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved: (sale: SavedSale) => void;
  cart: CartApi;
  paymentMethods: readonly PaymentMethod[];
}

const DEFAULT_TERM: TermMonths = 3;

/**
 * Confirm and register the sale (CU-01, CU-02; F4-T03 to T06). The button only
 * enables when the same checks the database makes pass; the database still
 * decides, and its answer (folio, plan) is what the person sees afterwards.
 */
export function CheckoutSheet({
  open,
  onClose,
  onSaved,
  cart,
  paymentMethods,
}: CheckoutSheetProps) {
  const { register, isPending, startNew } = useRegisterSale();
  const [saleType, setSaleType] = useState<SaleType>('cash');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [months, setMonths] = useState<TermMonths>(DEFAULT_TERM);
  const [downPaymentText, setDownPaymentText] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  const selectedMethodId = paymentMethodId ?? paymentMethods[0]?.id ?? null;
  const downPaymentColones = parseColones(downPaymentText) ?? 0;
  const review = reviewCheckout({
    saleType,
    totalColones: cart.totalColones,
    units: cart.units,
    customerId: customer?.id ?? null,
    paymentMethodId: selectedMethodId,
    months,
    downPaymentColones,
    saleDate: toBusinessDate(new Date()),
  });
  const isInstallments = saleType === 'installments';

  function changeForm<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setServerError(null);
      // A changed sale is a new action: it gets a new idempotency key.
      startNew();
    };
  }

  function resetForm() {
    setSaleType('cash');
    setCustomer(null);
    setPaymentMethodId(null);
    setMonths(DEFAULT_TERM);
    setDownPaymentText('');
    setServerError(null);
  }

  async function submit() {
    if (review.issue || !customer) return;
    setServerError(null);
    const methodId = review.needsPaymentMethod ? selectedMethodId : null;
    const outcome = await register(
      {
        customerId: customer.id,
        saleType,
        items: cart.lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        paymentMethodId: methodId,
        expectedTotalColones: cart.totalColones,
        months: isInstallments ? months : null,
        downPaymentColones: isInstallments ? downPaymentColones : 0,
      },
      paymentMethods.find((method) => method.id === methodId)?.name,
    );
    if (outcome.type === 'saved') {
      resetForm();
      onSaved(outcome.sale);
    } else if (outcome.type === 'failed') {
      setServerError(outcome.message);
    }
  }

  return (
    <Sheet open={open} title={SALES_MESSAGES.checkoutTitle} onClose={onClose}>
      {serverError && <Banner kind="error" title={serverError} />}

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
                    changeForm(cart.decrement)(product.id);
                  }}
                >
                  −
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  aria-label={SALES_MESSAGES.more(product.name)}
                  onClick={() => {
                    changeForm(cart.add)(product);
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
        onChange={changeForm(setSaleType)}
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
        <CustomerPicker
          value={customer}
          onChange={changeForm(setCustomer)}
          warnOverdue={isInstallments}
        />
      </div>

      {isInstallments && (
        <>
          <ChoiceGroup
            label={SALES_MESSAGES.term}
            value={String(months)}
            onChange={(value) => {
              changeForm(setMonths)(Number(value) as TermMonths);
            }}
            choices={TERM_OPTIONS.map((option) => ({
              value: String(option),
              label: SALES_MESSAGES.termOption(option),
            }))}
          />
          <TextField
            label={SALES_MESSAGES.downPayment}
            hint={SALES_MESSAGES.downPaymentHint}
            inputMode="numeric"
            placeholder="₡0"
            value={downPaymentText}
            error={
              review.issue === 'down_payment_covers_total'
                ? SALES_MESSAGES.issues.down_payment_covers_total
                : null
            }
            onChange={(event) => {
              changeForm(setDownPaymentText)(event.target.value.replace(/[^\d]/g, ''));
            }}
          />
          {review.issue === 'down_payment_covers_total' && (
            <Button
              variant="light"
              block
              onClick={() => {
                changeForm(setSaleType)('cash');
                setDownPaymentText('');
              }}
            >
              {SALES_MESSAGES.registerAsCash}
            </Button>
          )}
        </>
      )}

      {review.needsPaymentMethod && paymentMethods.length > 0 && (
        <ChoiceGroup
          label={isInstallments ? SALES_MESSAGES.downPaymentMethod : SALES_MESSAGES.paymentMethod}
          value={selectedMethodId}
          onChange={changeForm(setPaymentMethodId)}
          choices={paymentMethods.map((method) => ({ value: method.id, label: method.name }))}
        />
      )}

      <div className={styles.summary}>
        <p className={styles.summaryLine}>
          <span>{SALES_MESSAGES.total}</span>
          <span>{formatColones(cart.totalColones)}</span>
        </p>
        {isInstallments && review.plan.length > 0 && (
          <>
            <p className={styles.summaryLine}>
              <span>{SALES_MESSAGES.downPaymentToday}</span>
              <span>{formatColones(downPaymentColones)}</span>
            </p>
            <p className={styles.summaryLine}>
              <span>{SALES_MESSAGES.financed}</span>
              <span>{formatColones(review.financedColones)}</span>
            </p>
            <InstallmentPlan installments={review.plan} />
            <p className={styles.sheetNote}>{SALES_MESSAGES.planNote}</p>
          </>
        )}
        <p className={styles.summaryBig}>
          <span>{SALES_MESSAGES.receiveToday}</span>
          <span>{formatColones(review.receiveTodayColones)}</span>
        </p>
      </div>

      <BusyButton
        block
        busy={isPending}
        busyLabel={SALES_MESSAGES.registering}
        disabled={review.issue !== null}
        onClick={() => void submit()}
      >
        {SALES_MESSAGES.register}
      </BusyButton>
      {review.issue &&
        review.issue !== 'down_payment_covers_total' &&
        review.issue !== 'empty_cart' && (
          <p className={styles.sheetNote} role="status">
            {SALES_MESSAGES.issues[review.issue]}
          </p>
        )}
    </Sheet>
  );
}
