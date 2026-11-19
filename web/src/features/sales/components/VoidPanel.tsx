import { useState } from 'react';

import { formatColones } from '@/shared/domain/money';
import { Banner } from '@/shared/ui/Banner';
import { BusyButton } from '@/shared/ui/BusyButton';
import { Button } from '@/shared/ui/Button';
import { ChoiceGroup } from '@/shared/ui/ChoiceGroup';
import { TextField } from '@/shared/ui/TextField';

import {
  receivedColones,
  unitsOf,
  voidReasonText,
  type SaleDetail,
  type VoidReasonChoice,
} from '../domain/saleDetail';
import { useVoidSale } from '../hooks/useSaleDetail';
import { SALES_MESSAGES } from '../messages.es';
import styles from './SaleDetail.module.css';

/**
 * Anular venta (CU-05, F5-T03), only for sales.void. The panel is the
 * confirmation: it says what will happen, asks for the reason and warns when
 * money was already received.
 */
export function VoidPanel({ sale }: { sale: SaleDetail }) {
  const [isOpen, setIsOpen] = useState(false);
  const [choice, setChoice] = useState<VoidReasonChoice | null>(null);
  const [otherText, setOtherText] = useState('');
  const [showError, setShowError] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const { voidIt, isPending } = useVoidSale();

  const reason = voidReasonText(choice, otherText, SALES_MESSAGES.voidReasons);
  const received = receivedColones(sale);

  if (!isOpen) {
    return (
      <div className={styles.voidStart}>
        <Button
          block
          variant="danger"
          onClick={() => {
            setIsOpen(true);
          }}
        >
          {SALES_MESSAGES.voidButton}
        </Button>
        <p className={styles.hint}>{SALES_MESSAGES.voidHint}</p>
      </div>
    );
  }

  async function confirmVoid() {
    if (reason === null) {
      setShowError(true);
      return;
    }
    setFailure(null);
    const outcome = await voidIt({ saleId: sale.id, reason }, sale.folio);
    if (outcome.type === 'failed') setFailure(outcome.message);
    if (outcome.type === 'voided') setIsOpen(false);
  }

  return (
    <section className={styles.voidPanel} aria-labelledby="void-title">
      <h3 id="void-title" className={styles.cardTitle}>
        {SALES_MESSAGES.voidTitle(sale.folio)}
      </h3>
      <p className={styles.muted}>
        {SALES_MESSAGES.voidBody(
          sale.customer.name,
          formatColones(sale.totalColones),
          unitsOf(sale),
        )}
      </p>
      <ChoiceGroup<VoidReasonChoice>
        label={SALES_MESSAGES.voidReasonLabel}
        value={choice}
        onChange={(next) => {
          setChoice(next);
          setShowError(false);
        }}
        choices={[
          { value: 'error', label: SALES_MESSAGES.voidReasons.error },
          { value: 'return', label: SALES_MESSAGES.voidReasons.return },
          { value: 'other', label: SALES_MESSAGES.voidReasons.other },
        ]}
      />
      {choice === 'other' && (
        <TextField
          label={SALES_MESSAGES.voidOtherLabel}
          value={otherText}
          error={showError ? SALES_MESSAGES.voidReasonRequired : null}
          onChange={(event) => {
            setOtherText(event.target.value);
            setShowError(false);
          }}
        />
      )}
      {showError && choice !== 'other' && (
        <p className={styles.fieldError} role="alert">
          {SALES_MESSAGES.voidReasonRequired}
        </p>
      )}
      {received > 0 && (
        <Banner kind="warn" title={SALES_MESSAGES.voidReceivedTitle(formatColones(received))}>
          {SALES_MESSAGES.voidReceivedBody}
        </Banner>
      )}
      {failure && <Banner kind="error" title={failure} />}
      <div className={styles.two}>
        <Button
          variant="light"
          disabled={isPending}
          onClick={() => {
            setIsOpen(false);
          }}
        >
          {SALES_MESSAGES.voidCancel}
        </Button>
        <BusyButton
          variant="danger"
          busy={isPending}
          busyLabel={SALES_MESSAGES.voiding}
          onClick={() => {
            void confirmVoid();
          }}
        >
          {SALES_MESSAGES.voidConfirm}
        </BusyButton>
      </div>
    </section>
  );
}
