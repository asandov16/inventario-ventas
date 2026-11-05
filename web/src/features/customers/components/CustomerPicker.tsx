import { useState } from 'react';

import { formatColones } from '@/shared/domain/money';
import { formatPhone, looksLikePhone } from '@/shared/domain/phone';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';

import type { Customer } from '../domain/customer';
import { useCustomerSearch } from '../hooks/useCustomerSearch';
import { CUSTOMERS_MESSAGES } from '../messages.es';
import styles from './CustomerPicker.module.css';
import { NewCustomerForm } from './NewCustomerForm';

interface CustomerPickerProps {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  /** On installment sales, a customer with overdue installments shows a warning (D-06). */
  warnOverdue: boolean;
}

/**
 * Every sale has a customer (RN-01, CU-03): search by name or phone, or
 * register a new one without leaving the sale.
 */
export function CustomerPicker({ value, onChange, warnOverdue }: CustomerPickerProps) {
  const [query, setQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const search = useCustomerSearch(query);

  if (value) {
    return (
      <>
        <div className={styles.picked}>
          <span className={styles.check} aria-hidden="true">
            ✓
          </span>
          <div className={styles.pickedInfo}>
            <p className={styles.name}>{value.name}</p>
            <p className={styles.meta}>
              {value.balanceColones > 0
                ? CUSTOMERS_MESSAGES.selectedOwes(
                    formatPhone(value.phoneE164),
                    formatColones(value.balanceColones),
                  )
                : formatPhone(value.phoneE164)}
            </p>
          </div>
          <Button
            variant="light"
            onClick={() => {
              onChange(null);
            }}
          >
            {CUSTOMERS_MESSAGES.change}
          </Button>
        </div>
        {warnOverdue && value.overdueColones > 0 && (
          <Banner
            kind="warn"
            title={CUSTOMERS_MESSAGES.overdueWarningTitle(formatColones(value.overdueColones))}
          >
            {CUSTOMERS_MESSAGES.overdueWarningBody}
          </Banner>
        )}
      </>
    );
  }

  if (isCreating) {
    const prefill = looksLikePhone(query) ? { phone: query } : { name: query };
    return (
      <NewCustomerForm
        initial={prefill}
        onCancel={() => {
          setIsCreating(false);
        }}
        onDone={(customer) => {
          setIsCreating(false);
          setQuery('');
          onChange(customer);
        }}
      />
    );
  }

  const results = search.enabled ? (search.data ?? []) : [];
  const noMatch =
    search.enabled && search.isSuccess && !search.isPlaceholderData && results.length === 0;

  return (
    <div>
      <input
        type="search"
        className={styles.search}
        placeholder={CUSTOMERS_MESSAGES.searchPlaceholder}
        aria-label={CUSTOMERS_MESSAGES.searchLabel}
        autoComplete="off"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
      />
      {search.isError && <p className={styles.note}>{CUSTOMERS_MESSAGES.searchFailed}</p>}
      {results.length > 0 && (
        <ul className={styles.results}>
          {results.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                className={styles.result}
                aria-label={CUSTOMERS_MESSAGES.choose(customer.name)}
                onClick={() => {
                  setQuery('');
                  onChange(customer);
                }}
              >
                <span className={styles.resultInfo}>
                  <span className={styles.name}>{customer.name}</span>
                  <span className={styles.meta}>{formatPhone(customer.phoneE164)}</span>
                </span>
                {customer.overdueColones > 0 ? (
                  <span className={styles.badgeBad}>
                    {CUSTOMERS_MESSAGES.overdue(formatColones(customer.overdueColones))}
                  </span>
                ) : customer.balanceColones > 0 ? (
                  <span className={styles.badgeGold}>
                    {CUSTOMERS_MESSAGES.owes(formatColones(customer.balanceColones))}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      {noMatch && (
        <p className={styles.note}>{CUSTOMERS_MESSAGES.noMatch(search.debouncedQuery)}</p>
      )}
      <Button
        variant="light"
        block
        onClick={() => {
          setIsCreating(true);
        }}
      >
        {CUSTOMERS_MESSAGES.newCustomer}
      </Button>
    </div>
  );
}
