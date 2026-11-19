/** Perfil (CU-14, CU-15): pure rules of its forms and lists. */

/** Supabase's minimum (supabase/config.toml, minimum_password_length). */
export const MIN_PASSWORD_LENGTH = 10;

export type PasswordIssue = 'too_short' | 'mismatch';

export function reviewPassword(password: string, confirmation: string): PasswordIssue | null {
  if (password.length < MIN_PASSWORD_LENGTH) return 'too_short';
  return password === confirmation ? null : 'mismatch';
}

/**
 * Permission codes in the order they are explained to the person: what they do
 * every day first, settings last.
 */
export const PERMISSION_ORDER = [
  'sales.create',
  'sales.read',
  'customers.edit',
  'payments.create',
  'reminders.send',
  'dashboard.read',
  'inventory.read',
  'inventory.restock',
  'products.edit',
  'costs.read',
  'analytics.profit',
  'sales.void',
  'business.configure',
  'users.admin',
  'data.export',
  'legacy_balances.import',
] as const;

export type PermissionCode = (typeof PERMISSION_ORDER)[number];

/** The person's permissions, known ones only, in explanation order. */
export function orderedPermissions(granted: ReadonlySet<string>): PermissionCode[] {
  return PERMISSION_ORDER.filter((code) => granted.has(code));
}

/** A category prefix as the database wants it: 2 to 5 capital letters without accents. */
export function normalizePrefix(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 5);
}

export function isValidPrefix(prefix: string): boolean {
  return /^[A-Z]{2,5}$/.test(prefix);
}

export function isValidCatalogName(name: string): boolean {
  const length = name.trim().length;
  return length >= 2 && length <= 40;
}

export interface CatalogItem {
  id: string;
  name: string;
  /** Categories only. */
  prefix?: string | undefined;
  active: boolean;
  sort: number;
}

/** Active items first, then by their configured order. */
export function sortCatalog<T extends CatalogItem>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => Number(b.active) - Number(a.active) || a.sort - b.sort);
}
