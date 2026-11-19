import { useState } from 'react';

import type { SaleDetail } from '@/features/sales';
import { useCurrentProfile } from '@/features/session';
import { formatRelativeTime } from '@/shared/domain/dates';
import { formatPhone } from '@/shared/domain/phone';
import { buildReminderMessage, buildWhatsappLink } from '@/shared/domain/whatsapp';
import { showToast } from '@/shared/hooks/feedback';
import { Banner } from '@/shared/ui/Banner';
import { BusyButton } from '@/shared/ui/BusyButton';
import { Button } from '@/shared/ui/Button';

import { installmentAmount, suggestedAmount } from '../domain/receivables';
import { useRecordReminder } from '../hooks/useReceivables';
import { RECEIVABLES_MESSAGES } from '../messages.es';
import styles from './Receivables.module.css';

/**
 * Recordatorio de cobro (CU-07, F5-T07, RF-COB-04). WhatsApp opens in another
 * tab with the message ready; on return the app asks whether it was sent, and
 * only "Sí" records it. "Copiar mensaje" covers a phone where WhatsApp does not open.
 */
export function ReminderCard({ sale }: { sale: SaleDetail }) {
  const { business } = useCurrentProfile();
  const [isAsking, setIsAsking] = useState(false);
  const [sentNow, setSentNow] = useState(false);
  const { record, isPending } = useRecordReminder();

  // What to ask for now: what is overdue, or the next installment.
  const amountColones = sale.overdueColones > 0 ? suggestedAmount(sale) : installmentAmount(sale);
  const overdueInstallment = sale.installments.find((i) => i.status === 'overdue');
  const message = buildReminderMessage({
    customerName: sale.customer.name,
    businessName: business.name,
    amountColones,
    dueDate: overdueInstallment?.dueDate ?? sale.nextDueDate,
    balanceColones: sale.balanceColones,
  });
  const link = buildWhatsappLink(sale.customer.phoneE164, message);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      showToast('ok', RECEIVABLES_MESSAGES.copied);
    } catch {
      showToast('error', RECEIVABLES_MESSAGES.copyFailed);
    }
  }

  if (isAsking) {
    return (
      <section className={styles.card} aria-labelledby="reminder-ask">
        <h3 id="reminder-ask" className={styles.cardTitle}>
          {RECEIVABLES_MESSAGES.askTitle}
        </h3>
        <p className={styles.muted}>{RECEIVABLES_MESSAGES.askBody}</p>
        <div className={styles.two}>
          <Button
            variant="light"
            disabled={isPending}
            onClick={() => {
              setIsAsking(false);
            }}
          >
            {RECEIVABLES_MESSAGES.askNo}
          </Button>
          <BusyButton
            busy={isPending}
            busyLabel={RECEIVABLES_MESSAGES.askSaving}
            onClick={() => {
              void record(sale.id).then((result) => {
                if (result.ok) {
                  setSentNow(true);
                  setIsAsking(false);
                } else if (result.message) {
                  showToast('error', result.message);
                }
              });
            }}
          >
            {RECEIVABLES_MESSAGES.askYes}
          </BusyButton>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card} aria-labelledby="reminder-title">
      <h3 id="reminder-title" className={styles.cardTitle}>
        {RECEIVABLES_MESSAGES.reminderTitle}
      </h3>
      {sentNow ? (
        <div className={styles.block}>
          <Banner kind="ok" title={RECEIVABLES_MESSAGES.reminderSentTitle}>
            {RECEIVABLES_MESSAGES.reminderSentBody(sale.customer.name)}
          </Banner>
        </div>
      ) : (
        sale.lastReminder && (
          <p className={styles.muted}>
            {RECEIVABLES_MESSAGES.lastReminder(
              formatRelativeTime(new Date(sale.lastReminder.createdAt)),
            )}
          </p>
        )
      )}
      {link ? (
        <a
          className={styles.whatsapp}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            // The question appears when the person comes back from WhatsApp.
            window.setTimeout(() => {
              setIsAsking(true);
            }, 400);
          }}
        >
          {RECEIVABLES_MESSAGES.sendWhatsapp(formatPhone(sale.customer.phoneE164))}
        </a>
      ) : (
        <Banner kind="warn" title={RECEIVABLES_MESSAGES.invalidPhoneTitle}>
          {RECEIVABLES_MESSAGES.invalidPhoneBody}
        </Banner>
      )}
      <Button
        block
        variant="light"
        className={styles.copy}
        onClick={() => {
          void copyMessage();
        }}
      >
        {RECEIVABLES_MESSAGES.copy}
      </Button>
    </section>
  );
}
