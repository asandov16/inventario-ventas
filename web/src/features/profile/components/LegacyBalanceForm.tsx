import { useState } from 'react';

import { CustomerPicker, type Customer } from '@/features/customers';
import { InstallmentPlan } from '@/features/sales';
import { toBusinessDate } from '@/shared/domain/dates';
import { formatColones } from '@/shared/domain/money';
import { Banner } from '@/shared/ui/Banner';
import { BusyButton } from '@/shared/ui/BusyButton';
import { Button } from '@/shared/ui/Button';
import { ChoiceGroup } from '@/shared/ui/ChoiceGroup';
import { TextField } from '@/shared/ui/TextField';

import {
  reviewLegacyBalance,
  type LegacyField,
  type SavedLegacyBalance,
} from '../domain/legacyBalance';
import { useLegacySummary, useRegisterLegacyBalance } from '../hooks/useProfile';
import { PROFILE_MESSAGES } from '../messages.es';
import styles from './ProfileSection.module.css';

const M = PROFILE_MESSAGES.legacy;
const COUNTS = [1, 2, 3] as const;
type Count = (typeof COUNTS)[number];

interface LegacyBalanceFormProps {
  onLoadAnother: () => void;
}

/**
 * Cargar saldo anterior (D-12, ADR-012, F7-T12): a debt from the notebook
 * becomes an installment sale without products. The plan here is a preview;
 * after saving, the plan shown is the one the database saved.
 */
export function LegacyBalanceForm({ onLoadAnother }: LegacyBalanceFormProps) {
  const today = toBusinessDate(new Date());
  const summary = useLegacySummary(true);
  const { register, startNew, isPending } = useRegisterLegacyBalance();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [saleDate, setSaleDate] = useState('');
  const [description, setDescription] = useState('');
  const [totalText, setTotalText] = useState('');
  const [paidText, setPaidText] = useState('');
  const [installments, setInstallments] = useState<Count | null>(null);
  const [firstDueDate, setFirstDueDate] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedLegacyBalance | null>(null);

  const review = reviewLegacyBalance(
    {
      customerId: customer?.id ?? null,
      saleDate,
      description,
      totalText,
      paidText,
      installments,
      firstDueDate,
    },
    today,
  );
  const errorFor = (field: LegacyField): string | null => {
    const issue = review.issues[field];
    if (!showErrors || !issue) return null;
    const messages: Partial<Record<string, string>> = M.issues[field];
    return messages[issue] ?? null;
  };

  /** Any change after a failure starts a new attempt (new idempotency key). */
  const change =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setFailure(null);
    };

  const summaryLine = summary.data
    ? M.summary(summary.data.count, formatColones(summary.data.totalColones))
    : null;

  if (saved) {
    return (
      <section className={styles.card} aria-labelledby="legacy-title">
        <h3 id="legacy-title" className={styles.cardTitle}>
          {M.title}
        </h3>
        <Banner kind="ok" title={M.savedTitle(saved.customerName)}>
          {M.savedBody(saved.folio)}
        </Banner>
        <InstallmentPlan installments={saved.installments} />
        {summaryLine && <p className={styles.muted}>{summaryLine}</p>}
        <Button
          variant="light"
          block
          onClick={() => {
            startNew();
            onLoadAnother();
          }}
        >
          {M.loadAnother}
        </Button>
      </section>
    );
  }

  const customerError = errorFor('customer');

  return (
    <form
      className={styles.card}
      noValidate
      aria-labelledby="legacy-title"
      onSubmit={(event) => {
        event.preventDefault();
        if (!review.input) {
          setShowErrors(true);
          return;
        }
        setFailure(null);
        void register(review.input).then((outcome) => {
          if (outcome.type === 'saved') setSaved(outcome.saved);
          else if (outcome.type === 'failed') setFailure(outcome.message);
        });
      }}
    >
      <h3 id="legacy-title" className={styles.cardTitle}>
        {M.title}
      </h3>
      <p className={styles.muted}>{M.hint}</p>
      {summaryLine && (
        <p className={styles.muted} data-testid="legacy-summary">
          {summaryLine}
        </p>
      )}

      <p className={styles.fieldLabel}>{M.customer}</p>
      <CustomerPicker value={customer} onChange={change(setCustomer)} warnOverdue={false} />
      {customerError && (
        <p className={styles.error} role="alert">
          {customerError}
        </p>
      )}

      <TextField
        label={M.saleDate}
        type="date"
        max={today}
        value={saleDate}
        error={errorFor('saleDate')}
        onChange={(event) => {
          change(setSaleDate)(event.target.value);
        }}
      />
      <TextField
        label={M.description}
        placeholder={M.descriptionPlaceholder}
        value={description}
        error={errorFor('description')}
        onChange={(event) => {
          change(setDescription)(event.target.value);
        }}
      />
      <div className={styles.two}>
        <TextField
          label={M.total}
          inputMode="numeric"
          placeholder="₡0"
          value={totalText}
          error={errorFor('total')}
          onChange={(event) => {
            change(setTotalText)(event.target.value);
          }}
        />
        <TextField
          label={M.paid}
          inputMode="numeric"
          placeholder="₡0"
          value={paidText}
          error={errorFor('paid')}
          onChange={(event) => {
            change(setPaidText)(event.target.value);
          }}
        />
      </div>
      <p className={styles.muted}>{M.paidHint}</p>

      <ChoiceGroup
        label={M.installments}
        value={installments === null ? null : String(installments)}
        onChange={(value) => {
          change(setInstallments)(Number(value) as Count);
        }}
        choices={COUNTS.map((count) => ({
          value: String(count),
          label: M.installmentOption(count),
        }))}
      />
      {errorFor('installments') && (
        <p className={styles.error} role="alert">
          {errorFor('installments')}
        </p>
      )}
      <TextField
        label={M.firstDueDate}
        hint={M.firstDueDateHint}
        type="date"
        value={firstDueDate}
        error={errorFor('firstDueDate')}
        onChange={(event) => {
          change(setFirstDueDate)(event.target.value);
        }}
      />

      {review.owedColones !== null && review.owedColones > 0 && (
        <p className={styles.sumLine}>
          <span>{M.owed}</span>
          <strong>{formatColones(review.owedColones)}</strong>
        </p>
      )}
      {review.plan && (
        <div aria-label={M.previewTitle}>
          <p className={styles.fieldLabel}>{M.previewTitle}</p>
          <InstallmentPlan installments={review.plan} />
          <p className={styles.muted}>{M.previewNote}</p>
        </div>
      )}

      {failure && (
        <p className={styles.error} role="alert">
          {failure}
        </p>
      )}
      <BusyButton type="submit" block busy={isPending} busyLabel={M.saving}>
        {M.save}
      </BusyButton>
    </form>
  );
}
