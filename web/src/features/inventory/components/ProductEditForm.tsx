import { useEffect, useState } from 'react';

import { formatColones, parseColones } from '@/shared/domain/money';
import { confirm } from '@/shared/hooks/feedback';
import { BusyButton } from '@/shared/ui/BusyButton';
import { Button } from '@/shared/ui/Button';
import { TextField } from '@/shared/ui/TextField';

import { unitMargin, type ProductDetail } from '../domain/inventory';
import { editDraftFrom, reviewProductEdit, type UpdateProductInput } from '../domain/stockForms';
import { useUpdateProduct } from '../hooks/useStockWrites';
import { INVENTORY_MESSAGES } from '../messages.es';
import { countError, moneyError, priceError } from './fieldErrors';
import styles from './Inventory.module.css';

interface ProductEditFormProps {
  product: ProductDetail;
  /** Without costs.read the cost field is not shown (the database would not send it either). */
  canSeeCosts: boolean;
  onDirtyChange: (isDirty: boolean) => void;
  onStale: (message: string) => void;
  onDeactivated: () => void;
}

/**
 * Editar producto (CU-11, F6-T04): name, price, cost, minimum and the physical
 * count, with the margin per unit as it is typed. Mounted with a key of the
 * product's version, so a fresh product (after saving or a conflict) resets it.
 */
export function ProductEditForm({
  product,
  canSeeCosts,
  onDirtyChange,
  onStale,
  onDeactivated,
}: ProductEditFormProps) {
  const [draft, setDraft] = useState(() => editDraftFrom(product));
  const [showErrors, setShowErrors] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { save, isPending } = useUpdateProduct();

  const review = reviewProductEdit(product, draft);
  const issues = showErrors ? review.issues : {};

  useEffect(() => {
    onDirtyChange(review.isDirty);
  }, [review.isDirty, onDirtyChange]);
  useEffect(
    () => () => {
      onDirtyChange(false);
    },
    [onDirtyChange],
  );

  const price = parseColones(draft.priceText);
  const cost = parseColones(draft.costText) ?? product.unitCostColones;
  const margin = price !== null && price > 0 ? unitMargin(price, cost) : null;

  async function submit(input: UpdateProductInput) {
    setFormError(null);
    const outcome = await save(input);
    if (outcome.type === 'stale') onStale(outcome.message);
    if (outcome.type === 'failed') setFormError(outcome.message);
    if (outcome.type === 'saved' && input.active === false) onDeactivated();
  }

  async function onSave() {
    const { input } = review;
    if (!input) {
      setShowErrors(true);
      return;
    }
    if (review.priceBelowCost && cost !== null) {
      const saveAnyway = await confirm({
        title: INVENTORY_MESSAGES.belowCostTitle,
        message: INVENTORY_MESSAGES.belowCostMessage(formatColones(cost - input.priceColones)),
        confirmLabel: INVENTORY_MESSAGES.belowCostConfirm,
        cancelLabel: INVENTORY_MESSAGES.belowCostCancel,
      });
      if (!saveAnyway) return;
    }
    await submit(input);
  }

  async function onDeactivate() {
    const sure = await confirm({
      title: INVENTORY_MESSAGES.deactivateTitle,
      message: INVENTORY_MESSAGES.deactivateMessage(product.name),
      confirmLabel: INVENTORY_MESSAGES.deactivateConfirm,
      cancelLabel: INVENTORY_MESSAGES.deactivateCancel,
      danger: true,
    });
    if (!sure) return;
    // Only the state changes; the other fields go back as they are stored.
    await submit({
      productId: product.id,
      expectedVersion: product.version,
      name: product.name,
      priceColones: product.priceColones,
      minStock: product.minStock,
      unitCostColones: null,
      countedStock: null,
      active: false,
    });
  }

  return (
    <form
      className={styles.card}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}
    >
      <h3 className={styles.cardTitle}>{INVENTORY_MESSAGES.editTitle(product.code)}</h3>
      <TextField
        label={INVENTORY_MESSAGES.nameLabel}
        value={draft.name}
        error={issues.name ? INVENTORY_MESSAGES.errors.name : null}
        onChange={(event) => {
          setDraft({ ...draft, name: event.target.value });
        }}
      />
      <div className={styles.two}>
        <TextField
          label={INVENTORY_MESSAGES.salePrice}
          inputMode="numeric"
          value={draft.priceText}
          error={priceError(issues.price)}
          onChange={(event) => {
            setDraft({ ...draft, priceText: event.target.value });
          }}
        />
        {canSeeCosts && (
          <TextField
            label={INVENTORY_MESSAGES.unitCost}
            inputMode="numeric"
            value={draft.costText}
            error={moneyError(issues.cost)}
            onChange={(event) => {
              setDraft({ ...draft, costText: event.target.value });
            }}
          />
        )}
      </div>
      <div className={styles.two}>
        <TextField
          label={INVENTORY_MESSAGES.countedStock}
          inputMode="numeric"
          value={draft.stockText}
          error={countError(issues.stock, INVENTORY_MESSAGES.errors.stockRequired)}
          onChange={(event) => {
            setDraft({ ...draft, stockText: event.target.value });
          }}
        />
        <TextField
          label={INVENTORY_MESSAGES.minStock}
          inputMode="numeric"
          value={draft.minStockText}
          error={countError(issues.minStock, INVENTORY_MESSAGES.errors.minStock)}
          onChange={(event) => {
            setDraft({ ...draft, minStockText: event.target.value });
          }}
        />
      </div>
      {canSeeCosts && margin && (
        <p className={styles.details} aria-live="polite">
          {INVENTORY_MESSAGES.marginPreview(margin.marginPct, formatColones(margin.profitColones))}
        </p>
      )}
      {formError && (
        <p className={styles.fieldError} role="alert">
          {formError}
        </p>
      )}
      <BusyButton
        type="submit"
        block
        busy={isPending}
        busyLabel={INVENTORY_MESSAGES.savingChanges}
        disabled={!review.isDirty}
      >
        {INVENTORY_MESSAGES.saveChanges}
      </BusyButton>
      {!review.isDirty && <p className={styles.hint}>{INVENTORY_MESSAGES.noChangesHint}</p>}
      {product.active && (
        <Button
          block
          variant="light"
          className={styles.deactivate}
          disabled={isPending}
          onClick={() => {
            void onDeactivate();
          }}
        >
          {INVENTORY_MESSAGES.deactivate}
        </Button>
      )}
    </form>
  );
}
