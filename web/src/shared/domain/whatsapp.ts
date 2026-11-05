import { toE164 } from './phone';

/**
 * Builds a wa.me link that opens WhatsApp with the message ready to send
 * (reminders, channel `whatsapp_link`). Returns null for an invalid phone.
 */
export function buildWhatsappLink(phone: string, message: string): string | null {
  const e164 = toE164(phone);
  if (!e164) return null;
  return `https://wa.me/${e164.slice(1)}?text=${encodeURIComponent(message)}`;
}
