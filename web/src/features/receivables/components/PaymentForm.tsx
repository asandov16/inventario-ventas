import { useEffect, useId, useState } from 'react';

import type { PaymentMethod, SaleDetail } from '@/features/sales';
import { formatColones } from '@/shared/domain/money';
import { BusyButton } from '@/shared/ui/BusyButton';
import { ChoiceGroup } from '@/shared/ui/ChoiceGroup';
import { TextField } from '@/shared/ui/TextField';

import {
  installmentAmount,
  reviewPayment,
  suggestedAmount,
  type PaymentIssue,
} from '../domain/receivables';
import { useRegisterPayment, type PaymentOutcome } from '../hooks/useReceivables';
import { RECEIVABLES_MESSAGES } from '../messages.es';
import styles from './Receivables.module.css';

function issueMessage(issue: PaymentIssue, balanceColones: number): string {
  const errors = RECEIVABLES_MESSAGES.errors;
  return issue === 'over_balance'
    ? errors.over_balance(formatColones(balanceColones))
    : errors[issue];
}

interface PaymentFormProps {
  sale: SaleDetail;
  paymentMethods: readonly PaymentMethod[];
  onDirtyChange: (isDirty: boolean) => void;
  onSaved: (outcome: Extract<PaymentOutcome, { type: 'saved' }>) => void;
}

/**
 * Registrar abono (CU-06, F5-T06): starts with the suggested amount, with
 * **Cuota** and **Todo** to fill it in one tap, and the payment method.
 */
export function PaymentForm({ sale, paymentMethods, onDirtyChange, onSaved }: PaymentFormProps) {
  const suggested = suggestedAmount(sale);
  const [amountText, setAmountText] = useState(String(suggested));
  const [methodId, setMethodId] = useState<string | null>(paymentMethods[0]?.id ?? null);
  const [showError, setShowError] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const { pay, isPending } = useRegisterPayment();
  const quickId = useId();

  const review = reviewPayment(amountText, sale.balanceColones, methodId);
  const isDirty = amountText !== String(suggested);
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const installment = installmentAmount(sale);
  const quick = [
    ...(installment < sale.balanceColones
      ? [{ key: 'installment', amount: installment, label: RECEIVABLES_MESSAGES.quickInstallment }]
      : []),
    { key: 'all', amount: sale.balanceColones, label: RECEIVABLES_MESSAGES.quickAll },
  ];

  async function save() {
    if (review.issue || review.amountColones === null || !methodId) {
      setShowError(true);
      return;
    }
    setFailure(null);
    const outcome = await pay(
      { saleId: sale.id, amountColones: review.amountColones, paymentMethodId: methodId },
      sale.customer.name,
    );
    if (outcome.type === 'saved') {
      onDirtyChange(false);
      onSaved(outcome);
    }
    if (outcome.type === 'failed') setFailure(outcome.message);
  }

  const amountIssue = showError && review.issue && review.issue !== 'method' ? review.issue : null;

  return (
    <form
      className={styles.card}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <h3 className={styles.cardTitle}>{RECEIVABLES_MESSAGES.formTitle}</h3>
      <TextField
        label={RECEIVABLES_MESSAGES.amountLabel}
        inputMode="numeric"
        value={amountText}
        error={amountIssue ? issueMessage(amountIssue, sale.balanceColones) : null}
        onChange={(event) => {
          setAmountText(event.target.value);
          setShowError(false);
        }}
      />
      <div className={styles.quick} role="group" aria-labelledby={quickId}>
        <span id={quickId} className={styles.srOnly}>
          {RECEIVABLES_MESSAGES.quickLabel}
        </span>
        {quick.map((option) => (
          <button
            key={option.key}
            type="button"
            className={styles.quickButton}
            onClick={() => {
              setAmountText(String(option.amount));
              setShowError(false);
            }}
          >
            {option.label(formatColones(option.amount))}
          </button>
        ))}
      </div>
      <ChoiceGroup<string>
        label={RECEIVABLES_MESSAGES.methodLabel}
        value={methodId}
        onChange={setMethodId}
        choices={paymentMethods.map((method) => ({ value: method.id, label: method.name }))}
      />
      {showError && review.issue === 'method' && (
        <p className={styles.fieldError} role="alert">
          {RECEIVABLES_MESSAGES.errors.method}
        </p>
      )}
      {failure && (
        <p className={styles.fieldError} role="alert">
          {failure}
        </p>
      )}
      <BusyButton type="submit" block busy={isPending} busyLabel={RECEIVABLES_MESSAGES.saving}>
        {RECEIVABLES_MESSAGES.save}
      </BusyButton>
    </form>
  );
}
