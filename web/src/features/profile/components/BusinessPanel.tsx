import { useState } from 'react';

import { useCurrentProfile } from '@/features/session';
import { BusyButton } from '@/shared/ui/BusyButton';
import { ErrorState, Loading } from '@/shared/ui/ErrorState';
import { TextField } from '@/shared/ui/TextField';

import { isValidCatalogName } from '../domain/profile';
import {
  useAllCategories,
  useAllPaymentMethods,
  useSaveCategory,
  useSavePaymentMethod,
  useUpdateBusinessName,
} from '../hooks/useProfile';
import { PROFILE_MESSAGES } from '../messages.es';
import { CatalogEditor } from './CatalogEditor';
import styles from './ProfileSection.module.css';

/** Perfil → Negocio (CU-15, F7-T08), only with business.configure. */
export function BusinessPanel() {
  const categories = useAllCategories(true);
  const paymentMethods = useAllPaymentMethods(true);
  const saveCategory = useSaveCategory();
  const savePaymentMethod = useSavePaymentMethod();

  return (
    <>
      <BusinessNameForm />
      {categories.isPending || paymentMethods.isPending ? (
        <Loading />
      ) : categories.isError || paymentMethods.isError ? (
        <ErrorState
          onRetry={() => {
            void categories.refetch();
            void paymentMethods.refetch();
          }}
        />
      ) : (
        <>
          <CatalogEditor
            title={PROFILE_MESSAGES.categoriesTitle}
            hint={PROFILE_MESSAGES.categoriesHint}
            items={categories.data}
            withPrefix
            addLabel={PROFILE_MESSAGES.addCategory}
            inactiveLabel={PROFILE_MESSAGES.inactive}
            isPending={saveCategory.isPending}
            onSave={(change, message) => saveCategory.save(change, message)}
            addedMessage={PROFILE_MESSAGES.categoryAdded}
          />
          <CatalogEditor
            title={PROFILE_MESSAGES.paymentMethodsTitle}
            hint={PROFILE_MESSAGES.paymentMethodsHint}
            items={paymentMethods.data}
            withPrefix={false}
            addLabel={PROFILE_MESSAGES.addPaymentMethod}
            inactiveLabel={PROFILE_MESSAGES.inactiveMethod}
            isPending={savePaymentMethod.isPending}
            onSave={(change, message) => savePaymentMethod.save(change, message)}
            addedMessage={PROFILE_MESSAGES.methodAdded}
          />
        </>
      )}
    </>
  );
}

function BusinessNameForm() {
  const profile = useCurrentProfile();
  const [name, setName] = useState(profile.business.name);
  const [showError, setShowError] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const { save, isPending } = useUpdateBusinessName();
  const isValid = isValidCatalogName(name);

  return (
    <form
      className={styles.card}
      noValidate
      aria-labelledby="business-name-title"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isValid) {
          setShowError(true);
          return;
        }
        setFailure(null);
        void save(name).then((outcome) => {
          if (!outcome.ok) setFailure(outcome.message);
        });
      }}
    >
      <h3 id="business-name-title" className={styles.cardTitle}>
        {PROFILE_MESSAGES.businessNameTitle}
      </h3>
      <TextField
        label={PROFILE_MESSAGES.businessNameTitle}
        hint={PROFILE_MESSAGES.businessNameHint}
        value={name}
        error={showError && !isValid ? PROFILE_MESSAGES.nameRequired : null}
        onChange={(event) => {
          setName(event.target.value);
        }}
      />
      {failure && (
        <p className={styles.error} role="alert">
          {failure}
        </p>
      )}
      <BusyButton
        type="submit"
        block
        busy={isPending}
        busyLabel={PROFILE_MESSAGES.savingName}
        disabled={name.trim() === profile.business.name}
      >
        {PROFILE_MESSAGES.saveName}
      </BusyButton>
    </form>
  );
}
