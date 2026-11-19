import { useState } from 'react';

import { usePermission } from '@/shared/hooks/usePermission';
import { BusyButton } from '@/shared/ui/BusyButton';

import { useDownloadBackup } from '../hooks/useProfile';
import { PROFILE_MESSAGES } from '../messages.es';
import { LegacyBalanceForm } from './LegacyBalanceForm';
import styles from './ProfileSection.module.css';

/** Perfil → Datos (CU-15): backup with data.export, legacy balances with legacy_balances.import. */
export function DataPanel() {
  const canExport = usePermission('data.export');
  const canImport = usePermission('legacy_balances.import');
  // A new key gives a clean form after "Cargar otro".
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      {canExport && <BackupCard />}
      {canImport && (
        <LegacyBalanceForm
          key={formKey}
          onLoadAnother={() => {
            setFormKey((key) => key + 1);
          }}
        />
      )}
    </>
  );
}

function BackupCard() {
  const { download, isPending } = useDownloadBackup();
  return (
    <section className={styles.card} aria-labelledby="backup-title">
      <h3 id="backup-title" className={styles.cardTitle}>
        {PROFILE_MESSAGES.backup.title}
      </h3>
      <p className={styles.muted}>{PROFILE_MESSAGES.backup.hint}</p>
      <p className={styles.muted}>🔒 {PROFILE_MESSAGES.backup.privacy}</p>
      <BusyButton
        block
        busy={isPending}
        busyLabel={PROFILE_MESSAGES.backup.busy}
        onClick={() => {
          void download();
        }}
      >
        {PROFILE_MESSAGES.backup.button}
      </BusyButton>
    </section>
  );
}
