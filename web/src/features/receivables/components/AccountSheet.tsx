import { useState } from 'react';

import {
  ACCOUNT_SHEET_PARAM,
  PaymentPlanCard,
  SALE_SHEET_PARAM,
  usePaymentMethods,
  useSaleDetail,
  type SaleDetail,
} from '@/features/sales';
import { formatColones } from '@/shared/domain/money';
import { usePermission } from '@/shared/hooks/usePermission';
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard';
import { useUrlSheet } from '@/shared/hooks/useUrlSheet';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { ErrorState, Loading } from '@/shared/ui/ErrorState';
import { Sheet } from '@/shared/ui/Sheet';

import type { PaymentOutcome } from '../hooks/useReceivables';
import { RECEIVABLES_MESSAGES } from '../messages.es';
import { PaymentForm } from './PaymentForm';
import styles from './Receivables.module.css';
import { ReminderCard } from './ReminderCard';

type SavedPayment = Extract<PaymentOutcome, { type: 'saved' }>;

/**
 * The account sheet of Por cobrar (F5-T06/T07), rendered once by the app shell
 * so the list, the sale sheet and Inicio's alerts open it with ?cuenta=<sale id>.
 */
export function AccountSheet() {
  const sheet = useUrlSheet(ACCOUNT_SHEET_PARAM);
  const detail = useSaleDetail(sheet.value);
  const [isDirty, setIsDirty] = useState(false);
  const guardClose = useUnsavedChangesGuard(isDirty);

  return (
    <Sheet
      open={sheet.isOpen}
      title={detail.data?.customer.name ?? RECEIVABLES_MESSAGES.accountTitle}
      onClose={() => {
        void guardClose(sheet.close);
      }}
    >
      {detail.isPending ? (
        <Loading label={RECEIVABLES_MESSAGES.loadingAccount} />
      ) : detail.isError ? (
        <ErrorState
          message={detail.error.message}
          onRetry={() => {
            void detail.refetch();
          }}
        />
      ) : (
        <AccountBody
          key={detail.data.id}
          sale={detail.data}
          onDirtyChange={setIsDirty}
          onViewSale={() => {
            sheet.switchTo(SALE_SHEET_PARAM, detail.data.id);
          }}
        />
      )}
    </Sheet>
  );
}

interface AccountBodyProps {
  sale: SaleDetail;
  onDirtyChange: (isDirty: boolean) => void;
  onViewSale: () => void;
}

function AccountBody({ sale, onDirtyChange, onViewSale }: AccountBodyProps) {
  const canCollect = usePermission('payments.create');
  const canRemind = usePermission('reminders.send');
  const paymentMethods = usePaymentMethods();
  const [lastPayment, setLastPayment] = useState<SavedPayment | null>(null);
  const [showForm, setShowForm] = useState(true);
  const isOpen = sale.balanceColones > 0 && !sale.voidedAt;

  return (
    <>
      {lastPayment && (
        <div className={styles.block}>
          {lastPayment.balanceColones === 0 ? (
            <Banner kind="ok" title={RECEIVABLES_MESSAGES.paidOffTitle}>
              {RECEIVABLES_MESSAGES.paidOffBody(
                formatColones(lastPayment.amountColones),
                sale.customer.name,
              )}
            </Banner>
          ) : (
            <Banner
              kind="ok"
              title={RECEIVABLES_MESSAGES.paymentSavedTitle(
                formatColones(lastPayment.amountColones),
              )}
            >
              {RECEIVABLES_MESSAGES.paymentSavedBody(formatColones(lastPayment.balanceColones))}
            </Banner>
          )}
        </div>
      )}

      <PaymentPlanCard sale={sale} newPaymentId={lastPayment?.paymentId ?? null} />

      {isOpen &&
        canCollect &&
        (showForm ? (
          <PaymentForm
            // A fresh balance starts a fresh form with the new suggested amount.
            key={sale.balanceColones}
            sale={sale}
            paymentMethods={paymentMethods.data ?? []}
            onDirtyChange={onDirtyChange}
            onSaved={(outcome) => {
              setLastPayment(outcome);
              setShowForm(false);
            }}
          />
        ) : (
          <Button
            block
            variant="light"
            className={styles.block}
            onClick={() => {
              setShowForm(true);
              setLastPayment(null);
            }}
          >
            {RECEIVABLES_MESSAGES.again}
          </Button>
        ))}

      {isOpen && canRemind && <ReminderCard sale={sale} />}

      <Button block variant="light" onClick={onViewSale}>
        {RECEIVABLES_MESSAGES.viewSale}
      </Button>
    </>
  );
}
