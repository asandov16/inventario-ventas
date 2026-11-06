import { useState } from 'react';

import { formatPhoneInput } from '@/shared/domain/phone';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { BusyButton } from '@/shared/ui/BusyButton';
import { TextField } from '@/shared/ui/TextField';

import { validateNewCustomer, type Customer } from '../domain/customer';
import { useCreateCustomer } from '../hooks/useCreateCustomer';
import { CUSTOMERS_MESSAGES } from '../messages.es';
import styles from './CustomerPicker.module.css';

interface NewCustomerFormProps {
  initial: { name?: string; phone?: string };
  onCancel: () => void;
  onDone: (customer: Customer) => void;
}

/** "+ Nuevo cliente" inside the sale (CU-03): name and phone are required. */
export function NewCustomerForm({ initial, onCancel, onDone }: NewCustomerFormProps) {
  const { create, isPending } = useCreateCustomer();
  const [name, setName] = useState(initial.name ?? '');
  const [phone, setPhone] = useState(formatPhoneInput(initial.phone ?? ''));
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [fieldError, setFieldError] = useState<{ field: 'name' | 'phone'; message: string } | null>(
    null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save() {
    const input = { name, phone, whatsappOptIn };
    const invalid = validateNewCustomer(input);
    if (invalid) {
      setFieldError({
        field: invalid.field,
        message:
          invalid.field === 'name'
            ? CUSTOMERS_MESSAGES.nameRequired
            : CUSTOMERS_MESSAGES.phoneInvalid,
      });
      return;
    }
    setFieldError(null);
    setSaveError(null);
    const outcome = await create(input);
    if (outcome.type === 'saved' || outcome.type === 'use_existing') onDone(outcome.customer);
    else if (outcome.type === 'correct_phone') {
      setFieldError({ field: 'phone', message: CUSTOMERS_MESSAGES.phoneTaken });
    } else if (outcome.type === 'failed') setSaveError(outcome.message);
  }

  return (
    <div className={styles.newForm}>
      {saveError && <Banner kind="error" title={saveError} />}
      <TextField
        label={CUSTOMERS_MESSAGES.nameLabel}
        placeholder={CUSTOMERS_MESSAGES.namePlaceholder}
        autoComplete="off"
        value={name}
        error={fieldError?.field === 'name' ? fieldError.message : null}
        onChange={(event) => {
          setName(event.target.value);
          setFieldError(null);
        }}
      />
      <TextField
        label={CUSTOMERS_MESSAGES.phoneLabel}
        placeholder={CUSTOMERS_MESSAGES.phonePlaceholder}
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        maxLength={9}
        value={phone}
        error={fieldError?.field === 'phone' ? fieldError.message : null}
        onChange={(event) => {
          setPhone(formatPhoneInput(event.target.value));
          setFieldError(null);
        }}
      />
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={whatsappOptIn}
          onChange={(event) => {
            setWhatsappOptIn(event.target.checked);
          }}
        />
        {CUSTOMERS_MESSAGES.whatsappOptIn}
      </label>
      <div className={styles.formActions}>
        <Button variant="light" onClick={onCancel}>
          {CUSTOMERS_MESSAGES.cancel}
        </Button>
        <BusyButton
          busy={isPending}
          busyLabel={CUSTOMERS_MESSAGES.saving}
          onClick={() => void save()}
        >
          {CUSTOMERS_MESSAGES.save}
        </BusyButton>
      </div>
    </div>
  );
}
