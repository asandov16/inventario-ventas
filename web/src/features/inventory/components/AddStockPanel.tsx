import { useId, useMemo, useState } from 'react';

import { formatRelativeTime } from '@/shared/domain/dates';
import { Badge } from '@/shared/ui/Badge';
import { Banner } from '@/shared/ui/Banner';
import { BusyButton } from '@/shared/ui/BusyButton';
import { Button } from '@/shared/ui/Button';
import { ChoiceGroup } from '@/shared/ui/ChoiceGroup';
import { TextField } from '@/shared/ui/TextField';

import { categoriesOf, type InventoryProduct } from '../domain/inventory';
import {
  reviewNewProduct,
  reviewRestock,
  type NewProductDraft,
  type RestockDraft,
  type SimilarProduct,
} from '../domain/stockForms';
import {
  useCategories,
  useCreateProduct,
  useRecentRestocks,
  useRestock,
} from '../hooks/useStockWrites';
import { INVENTORY_MESSAGES } from '../messages.es';
import { countError, moneyError, priceError, quantityError } from './fieldErrors';
import styles from './Inventory.module.css';
import { QuantityField } from './QuantityField';

type Mode = 'existing' | 'new';

interface Done {
  title: string;
  message: string;
  /** Set after creating a product: offers "Ver producto" and "Agregar otro". */
  productId?: string;
}

const EMPTY_RESTOCK: RestockDraft = { productId: null, qtyText: '1', costText: '' };
const EMPTY_PRODUCT: NewProductDraft = {
  name: '',
  categoryId: null,
  priceText: '',
  minStockText: '3',
  qtyText: '1',
  costText: '',
};

interface AddStockPanelProps {
  products: readonly InventoryProduct[];
  /**
   * Set by "📦 Ingresar stock" in a product's detail. The section mounts the panel
   * again (new key) for every such request, so the form starts with that product.
   */
  initialProductId: string | null;
  onViewProduct: (productId: string) => void;
}

/** Inventario → Agregar stock (CU-09, CU-10, F6-T03): only for inventory.restock. */
export function AddStockPanel({ products, initialProductId, onViewProduct }: AddStockPanelProps) {
  const [mode, setMode] = useState<Mode>('existing');
  const [restockDraft, setRestockDraft] = useState<RestockDraft>({
    ...EMPTY_RESTOCK,
    productId: initialProductId,
  });
  const [productDraft, setProductDraft] = useState(EMPTY_PRODUCT);
  const [showErrors, setShowErrors] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [similar, setSimilar] = useState<SimilarProduct[] | null>(null);
  const [lastSavedProductId, setLastSavedProductId] = useState<string | null>(null);

  const { restock, isPending: isRestocking } = useRestock();
  const { create, startNew: startNewProduct, isPending: isCreating } = useCreateProduct();
  const categories = useCategories();
  const recent = useRecentRestocks();
  const selectId = useId();

  const groups = useMemo(
    () =>
      categoriesOf(products).map((category) => ({
        ...category,
        products: products
          .filter((product) => product.categoryId === category.id)
          .sort((a, b) => a.name.localeCompare(b.name, 'es')),
      })),
    [products],
  );

  const restockReview = reviewRestock(restockDraft);
  const productReview = reviewNewProduct(productDraft);
  const restockIssues = showErrors ? restockReview.issues : {};
  const productIssues = showErrors ? productReview.issues : {};

  function edited() {
    setDone(null);
    setFormError(null);
  }

  function changeMode(next: Mode) {
    setMode(next);
    setShowErrors(false);
    setSimilar(null);
    edited();
  }

  async function saveRestock() {
    const { input } = restockReview;
    if (!input) {
      setShowErrors(true);
      return;
    }
    const outcome = await restock(input);
    if (outcome.type === 'saved') {
      setDone({ title: INVENTORY_MESSAGES.restockDone, message: outcome.message });
      setRestockDraft(EMPTY_RESTOCK);
      setShowErrors(false);
      setLastSavedProductId(outcome.product.id);
    } else if (outcome.type === 'failed') {
      setFormError(outcome.message);
    }
  }

  async function saveProduct(confirmSimilar: boolean) {
    const { input } = productReview;
    if (!input) {
      setShowErrors(true);
      return;
    }
    const outcome = await create(input, confirmSimilar);
    if (outcome.type === 'similar') {
      setSimilar(outcome.candidates);
    } else if (outcome.type === 'saved') {
      setSimilar(null);
      setDone({
        title: INVENTORY_MESSAGES.productDone,
        message: outcome.message,
        productId: outcome.product.id,
      });
      setProductDraft(EMPTY_PRODUCT);
      setShowErrors(false);
      setLastSavedProductId(outcome.product.id);
    } else if (outcome.type === 'failed') {
      setFormError(outcome.message);
    }
  }

  /** "Sumar a ese": the units and cost typed for the new product go to the existing one. */
  function addToExisting(candidate: SimilarProduct) {
    startNewProduct();
    setSimilar(null);
    setMode('existing');
    setRestockDraft({
      productId: candidate.id,
      qtyText: productDraft.qtyText,
      costText: productDraft.costText,
    });
    setShowErrors(false);
  }

  return (
    <>
      {done && (
        <div className={styles.done}>
          <Banner kind="ok" title={done.title}>
            {done.message}
          </Banner>
          {done.productId && (
            <div className={styles.two}>
              <Button
                variant="light"
                onClick={() => {
                  if (done.productId) onViewProduct(done.productId);
                }}
              >
                {INVENTORY_MESSAGES.viewProduct}
              </Button>
              <Button
                variant="light"
                onClick={() => {
                  setDone(null);
                  setMode('new');
                }}
              >
                {INVENTORY_MESSAGES.addAnother}
              </Button>
            </div>
          )}
        </div>
      )}

      <form
        className={styles.card}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void (mode === 'existing' ? saveRestock() : saveProduct(false));
        }}
      >
        <ChoiceGroup<Mode>
          label={INVENTORY_MESSAGES.whatLabel}
          value={mode}
          onChange={changeMode}
          choices={[
            {
              value: 'existing',
              label: INVENTORY_MESSAGES.modeExisting,
              hint: INVENTORY_MESSAGES.modeExistingHint,
            },
            {
              value: 'new',
              label: INVENTORY_MESSAGES.modeNew,
              hint: INVENTORY_MESSAGES.modeNewHint,
            },
          ]}
        />

        {mode === 'existing' ? (
          <div className={styles.field}>
            <label htmlFor={selectId} className={styles.fieldLabel}>
              {INVENTORY_MESSAGES.productLabel}
            </label>
            <select
              id={selectId}
              className={styles.select}
              value={restockDraft.productId ?? ''}
              aria-invalid={restockIssues.product ? true : undefined}
              onChange={(event) => {
                setRestockDraft({ ...restockDraft, productId: event.target.value || null });
                edited();
              }}
            >
              <option value="">{INVENTORY_MESSAGES.productPlaceholder}</option>
              {groups.map((group) => (
                <optgroup key={group.id} label={group.name}>
                  {group.products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {INVENTORY_MESSAGES.productOption(product.name, product.stock)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {restockIssues.product && (
              <p className={styles.fieldError} role="alert">
                {INVENTORY_MESSAGES.errors.product}
              </p>
            )}
          </div>
        ) : (
          <>
            <TextField
              label={INVENTORY_MESSAGES.nameLabel}
              placeholder={INVENTORY_MESSAGES.namePlaceholder}
              value={productDraft.name}
              error={productIssues.name ? INVENTORY_MESSAGES.errors.name : null}
              onChange={(event) => {
                setProductDraft({ ...productDraft, name: event.target.value });
                setSimilar(null);
                edited();
              }}
            />
            <ChoiceGroup<string>
              label={INVENTORY_MESSAGES.categoryLabel}
              value={productDraft.categoryId}
              onChange={(categoryId) => {
                setProductDraft({ ...productDraft, categoryId });
                edited();
              }}
              choices={(categories.data ?? []).map((category) => ({
                value: category.id,
                label: category.name,
              }))}
            />
            {productIssues.category && (
              <p className={styles.fieldError} role="alert">
                {INVENTORY_MESSAGES.errors.category}
              </p>
            )}
            <div className={styles.two}>
              <TextField
                label={INVENTORY_MESSAGES.salePrice}
                inputMode="numeric"
                placeholder="₡"
                value={productDraft.priceText}
                error={priceError(productIssues.price)}
                onChange={(event) => {
                  setProductDraft({ ...productDraft, priceText: event.target.value });
                  edited();
                }}
              />
              <TextField
                label={INVENTORY_MESSAGES.minStock}
                inputMode="numeric"
                value={productDraft.minStockText}
                error={countError(productIssues.minStock, INVENTORY_MESSAGES.errors.minStock)}
                onChange={(event) => {
                  setProductDraft({ ...productDraft, minStockText: event.target.value });
                  edited();
                }}
              />
            </div>
          </>
        )}

        <div className={styles.two}>
          <QuantityField
            label={
              mode === 'existing' ? INVENTORY_MESSAGES.quantity : INVENTORY_MESSAGES.initialQuantity
            }
            value={mode === 'existing' ? restockDraft.qtyText : productDraft.qtyText}
            error={quantityError(mode === 'existing' ? restockIssues.qty : productIssues.qty)}
            onChange={(qtyText) => {
              if (mode === 'existing') setRestockDraft({ ...restockDraft, qtyText });
              else setProductDraft({ ...productDraft, qtyText });
              edited();
            }}
          />
          <TextField
            label={INVENTORY_MESSAGES.unitCost}
            inputMode="numeric"
            placeholder={INVENTORY_MESSAGES.unitCostPlaceholder}
            hint={mode === 'existing' ? INVENTORY_MESSAGES.unitCostHint : undefined}
            value={mode === 'existing' ? restockDraft.costText : productDraft.costText}
            error={moneyError(mode === 'existing' ? restockIssues.cost : productIssues.cost)}
            onChange={(event) => {
              const costText = event.target.value;
              if (mode === 'existing') setRestockDraft({ ...restockDraft, costText });
              else setProductDraft({ ...productDraft, costText });
              edited();
            }}
          />
        </div>

        {similar && similar.length > 0 && (
          <div className={styles.similar}>
            <Banner kind="warn" title={INVENTORY_MESSAGES.similarTitle}>
              {INVENTORY_MESSAGES.similarBody}
            </Banner>
            {similar.map((candidate) => (
              <Button
                key={candidate.id}
                block
                variant="light"
                onClick={() => {
                  addToExisting(candidate);
                }}
              >
                {INVENTORY_MESSAGES.addToExisting(candidate.name, candidate.stock)}
              </Button>
            ))}
            <BusyButton
              block
              variant="light"
              busy={isCreating}
              busyLabel={INVENTORY_MESSAGES.savingProduct}
              onClick={() => {
                void saveProduct(true);
              }}
            >
              {INVENTORY_MESSAGES.createAnyway}
            </BusyButton>
          </div>
        )}

        {formError && <Banner kind="error" title={formError} />}

        <BusyButton
          type="submit"
          block
          busy={mode === 'existing' ? isRestocking : isCreating}
          busyLabel={
            mode === 'existing'
              ? INVENTORY_MESSAGES.savingRestock
              : INVENTORY_MESSAGES.savingProduct
          }
          disabled={mode === 'new' && similar !== null && similar.length > 0}
        >
          {INVENTORY_MESSAGES.saveRestock}
        </BusyButton>
      </form>

      <h3 className={styles.sectionLabel}>{INVENTORY_MESSAGES.recentTitle}</h3>
      {recent.data && recent.data.length > 0 ? (
        <ul className={styles.list}>
          {recent.data.map((entry, index) => (
            <li key={entry.id} className={styles.movement}>
              <span className={styles.thumb} aria-hidden="true">
                {entry.type === 'initial' ? '✨' : '📦'}
              </span>
              <span className={styles.main}>
                <span className={styles.name}>
                  {entry.type === 'initial'
                    ? INVENTORY_MESSAGES.recentInitial(entry.productName, entry.qty)
                    : INVENTORY_MESSAGES.recentRestock(entry.qty, entry.productName)}
                </span>
                <span className={styles.meta}>
                  {[formatRelativeTime(new Date(entry.createdAt)), entry.createdByName]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              {index === 0 && entry.productId === lastSavedProductId && (
                <Badge kind="ok">{INVENTORY_MESSAGES.recentNew}</Badge>
              )}
            </li>
          ))}
        </ul>
      ) : (
        recent.data && <p className={styles.details}>{INVENTORY_MESSAGES.recentEmpty}</p>
      )}
    </>
  );
}
