import { formatShortDate } from './dates';
import { DOMAIN_MESSAGES } from './messages.es';
import { formatColones } from './money';
import { toE164 } from './phone';

export interface ReminderFacts {
  customerName: string;
  /** The business name stored in the database (D-19), never a hard-coded brand. */
  businessName: string;
  /** What to pay now: what is overdue or the next installment. */
  amountColones: number;
  /** Due date of that installment (YYYY-MM-DD), when there is one. */
  dueDate: string | null;
  balanceColones: number;
}

/** The reminder text (RF-COB-04): the same words whether it opens WhatsApp or is copied. */
export function buildReminderMessage(facts: ReminderFacts, referenceYear?: number): string {
  return DOMAIN_MESSAGES.reminder(
    facts.customerName,
    facts.businessName,
    formatColones(facts.amountColones),
    facts.dueDate ? formatShortDate(facts.dueDate, referenceYear) : null,
    formatColones(facts.balanceColones),
  );
}

/**
 * Builds a wa.me link that opens WhatsApp with the message ready to send
 * (reminders, channel `whatsapp_link`). Returns null for an invalid phone.
 */
export function buildWhatsappLink(phone: string, message: string): string | null {
  const e164 = toE164(phone);
  if (!e164) return null;
  return `https://wa.me/${e164.slice(1)}?text=${encodeURIComponent(message)}`;
}
