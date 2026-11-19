import { useState } from 'react';

import { Badge } from '@/shared/ui/Badge';
import { BusyButton } from '@/shared/ui/BusyButton';
import { Button } from '@/shared/ui/Button';
import { TextField } from '@/shared/ui/TextField';

import {
  isValidCatalogName,
  isValidPrefix,
  normalizePrefix,
  sortCatalog,
  type CatalogItem,
} from '../domain/profile';
import type { SaveOutcome } from '../hooks/useProfile';
import { PROFILE_MESSAGES } from '../messages.es';
import styles from './ProfileSection.module.css';

export interface CatalogChange {
  id: string | null;
  name: string;
  prefix: string | null;
  active: boolean;
}

interface CatalogEditorProps {
  title: string;
  hint: string;
  items: readonly CatalogItem[];
  /** Categories ask for a code prefix when they are created. */
  withPrefix: boolean;
  addLabel: string;
  inactiveLabel: string;
  isPending: boolean;
  onSave: (change: CatalogChange, successMessage: string) => Promise<SaveOutcome>;
  addedMessage: (name: string) => string;
}

/**
 * Categories or payment methods (CU-15, F7-T08): add, rename, turn on or off.
 * Nothing is deleted (RN-12): an item that is no longer used is deactivated.
 */
export function CatalogEditor({
  title,
  hint,
  items,
  withPrefix,
  addLabel,
  inactiveLabel,
  isPending,
  onSave,
  addedMessage,
}: CatalogEditorProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [newName, setNewName] = useState('');
  const [newPrefix, setNewPrefix] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function save(change: CatalogChange, message: string): Promise<boolean> {
    setFailure(null);
    const outcome = await onSave(change, message);
    if (!outcome.ok) setFailure(outcome.message);
    return outcome.ok;
  }

  async function add() {
    const prefix = normalizePrefix(newPrefix);
    if (!isValidCatalogName(newName) || (withPrefix && !isValidPrefix(prefix))) {
      setShowErrors(true);
      return;
    }
    const name = newName.trim();
    const saved = await save(
      { id: null, name, prefix: withPrefix ? prefix : null, active: true },
      addedMessage(name),
    );
    if (saved) {
      setNewName('');
      setNewPrefix('');
      setShowErrors(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby={`${title}-title`}>
      <h3 id={`${title}-title`} className={styles.cardTitle}>
        {title}
      </h3>
      <p className={styles.muted}>{hint}</p>
      <ul className={styles.catalog}>
        {sortCatalog(items).map((item) => (
          <li key={item.id}>
            {renamingId === item.id ? (
              <form
                className={styles.renameForm}
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!isValidCatalogName(renameText)) return;
                  const name = renameText.trim();
                  void save(
                    { id: item.id, name, prefix: null, active: item.active },
                    PROFILE_MESSAGES.renamed(name),
                  ).then((saved) => {
                    if (saved) setRenamingId(null);
                  });
                }}
              >
                <TextField
                  label={PROFILE_MESSAGES.renameLabel(item.name)}
                  value={renameText}
                  error={isValidCatalogName(renameText) ? null : PROFILE_MESSAGES.nameRequired}
                  onChange={(event) => {
                    setRenameText(event.target.value);
                  }}
                />
                <div className={styles.two}>
                  <Button
                    variant="light"
                    onClick={() => {
                      setRenamingId(null);
                    }}
                  >
                    {PROFILE_MESSAGES.cancel}
                  </Button>
                  <BusyButton
                    type="submit"
                    busy={isPending}
                    busyLabel={PROFILE_MESSAGES.savingName}
                  >
                    {PROFILE_MESSAGES.saveRename}
                  </BusyButton>
                </div>
              </form>
            ) : (
              <div className={styles.catalogRow}>
                <span className={styles.catalogName}>
                  {item.name}
                  {item.prefix && <span className={styles.muted}> · {item.prefix}</span>}{' '}
                  {!item.active && <Badge kind="muted">{inactiveLabel}</Badge>}
                </span>
                <span className={styles.catalogActions}>
                  <button
                    type="button"
                    className={styles.linkButton}
                    aria-label={`${PROFILE_MESSAGES.rename}: ${item.name}`}
                    onClick={() => {
                      setRenamingId(item.id);
                      setRenameText(item.name);
                    }}
                  >
                    {PROFILE_MESSAGES.rename}
                  </button>
                  <button
                    type="button"
                    className={styles.linkButton}
                    aria-label={`${item.active ? PROFILE_MESSAGES.deactivate : PROFILE_MESSAGES.activate}: ${item.name}`}
                    disabled={isPending}
                    onClick={() => {
                      void save(
                        { id: item.id, name: item.name, prefix: null, active: !item.active },
                        item.active
                          ? PROFILE_MESSAGES.deactivated(item.name)
                          : PROFILE_MESSAGES.activated(item.name),
                      );
                    }}
                  >
                    {item.active ? PROFILE_MESSAGES.deactivate : PROFILE_MESSAGES.activate}
                  </button>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>

      <form
        className={styles.addForm}
        noValidate
        aria-label={addLabel}
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <TextField
          label={PROFILE_MESSAGES.newName}
          value={newName}
          error={showErrors && !isValidCatalogName(newName) ? PROFILE_MESSAGES.nameRequired : null}
          onChange={(event) => {
            setNewName(event.target.value);
          }}
        />
        {withPrefix && (
          <TextField
            label={PROFILE_MESSAGES.newPrefix}
            hint={PROFILE_MESSAGES.newPrefixHint}
            autoCapitalize="characters"
            value={newPrefix}
            error={
              showErrors && !isValidPrefix(normalizePrefix(newPrefix))
                ? PROFILE_MESSAGES.prefixInvalid
                : null
            }
            onChange={(event) => {
              setNewPrefix(normalizePrefix(event.target.value));
            }}
          />
        )}
        {failure && (
          <p className={styles.error} role="alert">
            {failure}
          </p>
        )}
        <BusyButton
          type="submit"
          block
          variant="light"
          busy={isPending}
          busyLabel={PROFILE_MESSAGES.adding}
        >
          {addLabel}
        </BusyButton>
      </form>
    </section>
  );
}
