import type { FieldIssue } from '../domain/stockForms';
import { INVENTORY_MESSAGES } from '../messages.es';

const E = INVENTORY_MESSAGES.errors;

/** What to do, beside each field (section 4.1). */
export function quantityError(issue: FieldIssue | undefined): string | null {
  if (!issue) return null;
  return issue === 'not_a_number' ? E.onlyNumbers : E.quantity;
}

export function moneyError(issue: FieldIssue | undefined): string | null {
  return issue ? E.onlyNumbers : null;
}

export function priceError(issue: FieldIssue | undefined): string | null {
  if (!issue) return null;
  if (issue === 'required') return E.priceRequired;
  return issue === 'positive' ? E.pricePositive : E.onlyNumbers;
}

export function countError(issue: FieldIssue | undefined, required: string): string | null {
  if (!issue) return null;
  return issue === 'required' ? required : E.stockInvalid;
}
