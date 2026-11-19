import { DOMAIN_MESSAGES } from './messages.es';

/**
 * Dates follow the business time zone (CLAUDE.md rule 10, ADR-040): "today" is
 * the calendar day in Costa Rica, not in the browser's zone. Calendar dates are
 * ISO strings (YYYY-MM-DD) so they never shift with time zones.
 */

export const BUSINESS_TIME_ZONE = 'America/Costa_Rica';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

const isoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The calendar day (YYYY-MM-DD) of an instant, in the business time zone. */
export function toBusinessDate(instant: Date): string {
  const parts = isoDateFormatter.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

interface CalendarDate {
  year: number;
  month: number; // 1–12
  day: number;
}

function parseIsoDate(isoDate: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new RangeError(`Expected YYYY-MM-DD, got ${isoDate}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function toIsoDate({ year, month, day }: CalendarDate): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Adds calendar months and clamps to the last day of the target month, like
 * Postgres `date + interval 'n months'` (ADR-009): Jan 31 + 1 month = Feb 28.
 */
export function addMonths(isoDate: string, months: number): string {
  const { year, month, day } = parseIsoDate(isoDate);
  const monthIndex = month - 1 + months;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = (((monthIndex % 12) + 12) % 12) + 1;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  return toIsoDate({ year: targetYear, month: targetMonth, day: targetDay });
}

export function addDays(isoDate: string, days: number): string {
  const { year, month, day } = parseIsoDate(isoDate);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return toIsoDate({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

/** "2026-12-02" → "2 dic"; adds the year when it differs from `referenceYear`. */
export function formatShortDate(isoDate: string, referenceYear?: number): string {
  const { year, month, day } = parseIsoDate(isoDate);
  const label = `${String(day)} ${DOMAIN_MESSAGES.monthsShort[month - 1] ?? ''}`;
  return referenceYear !== undefined && year !== referenceYear ? `${label} ${String(year)}` : label;
}

/** "Hoy", "Ayer" or "2 nov", in the business time zone. */
export function formatDayLabel(instant: Date, now: Date = new Date()): string {
  const day = toBusinessDate(instant);
  const today = toBusinessDate(now);
  if (day === today) return DOMAIN_MESSAGES.today;
  if (day === addDays(today, -1)) return DOMAIN_MESSAGES.yesterday;
  return formatShortDate(day, parseIsoDate(today).year);
}

/** "Ahora", "hace 5 min", "hace 2 h", then the day label. */
export function formatRelativeTime(instant: Date, now: Date = new Date()): string {
  const elapsed = now.getTime() - instant.getTime();
  if (elapsed < MINUTE_MS) return DOMAIN_MESSAGES.justNow;
  if (elapsed < HOUR_MS) return DOMAIN_MESSAGES.minutesAgo(Math.floor(elapsed / MINUTE_MS));
  if (toBusinessDate(instant) === toBusinessDate(now)) {
    return DOMAIN_MESSAGES.hoursAgo(Math.floor(elapsed / HOUR_MS));
  }
  return formatDayLabel(instant, now);
}

const timeFormatter = new Intl.DateTimeFormat('es-CR', {
  timeZone: BUSINESS_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
});

/** Time of day in the business time zone: "2:30 p. m." (history rows, payments). */
export function formatTime(instant: Date): string {
  return timeFormatter.format(instant);
}

/**
 * The instant a business day starts, for date-range filters. Costa Rica keeps
 * UTC−6 all year (no daylight saving), so the offset is fixed.
 */
export function businessDayStart(isoDate: string): string {
  return `${isoDate}T00:00:00-06:00`;
}

const longDateFormatter = new Intl.DateTimeFormat('es-CR', {
  timeZone: BUSINESS_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** "miércoles, 19 de noviembre" in the business time zone (Inicio's greeting). */
export function formatLongDate(instant: Date): string {
  return longDateFormatter.format(instant);
}

const weekdayFormatter = new Intl.DateTimeFormat('es-CR', {
  timeZone: BUSINESS_TIME_ZONE,
  weekday: 'short',
});

/** Short weekday of a calendar date, "lun", for the 7-day chart. */
export function formatWeekdayShort(isoDate: string): string {
  // Noon in Costa Rica keeps the calendar day whatever the browser zone.
  return weekdayFormatter
    .format(new Date(`${isoDate}T12:00:00-06:00`))
    .replace('.', '')
    .slice(0, 3);
}
