import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';

import { sellProductPath } from '@/features/sales';
import { formatRelativeTime } from '@/shared/domain/dates';
import { formatColones } from '@/shared/domain/money';
import { usePermission } from '@/shared/hooks/usePermission';
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard';
import { Badge } from '@/shared/ui/Badge';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { cx } from '@/shared/ui/cx';
import { ErrorState, Loading } from '@/shared/ui/ErrorState';
import { Kpi, KpiGrid } from '@/shared/ui/Kpi';
import { Sheet } from '@/shared/ui/Sheet';

import { unitMargin, type ProductDetail, type ProductMovement } from '../domain/inventory';
import { useProductDetail } from '../hooks/useInventory';
import { INVENTORY_MESSAGES } from '../messages.es';
import styles from './Inventory.module.css';
import { ProductEditForm } from './ProductEditForm';
import { BADGE_FOR_STATUS } from './stockBadge';

interface ProductSheetProps {
  productId: string | null;
  onClose: () => void;
  /** "📦 Ingresar stock": opens Agregar stock with this product chosen. */
  onRestock: (productId: string) => void;
}

/**
 * Product detail (F6-T02) and, with products.edit, its edit form (F6-T04).
 * Movements show who and when (F6 DoD). Costs appear only when the database
 * sent them, which it does only for someone with costs.read.
 */
export function ProductSheet({ productId, onClose, onRestock }: ProductSheetProps) {
  const detail = useProductDetail(productId);
  const [isDirty, setIsDirty] = useState(false);
  const guardClose = useUnsavedChangesGuard(isDirty);

  return (
    <Sheet
      open={productId !== null}
      title={detail.data?.name ?? INVENTORY_MESSAGES.productSheetTitle}
      onClose={() => {
        void guardClose(onClose);
      }}
    >
      {detail.isPending ? (
        <Loading label={INVENTORY_MESSAGES.loadingProduct} />
      ) : detail.isError ? (
        <ErrorState
          message={detail.error.message}
          onRetry={() => {
            void detail.refetch();
          }}
        />
      ) : (
        <ProductBody
          product={detail.data}
          onDirtyChange={setIsDirty}
          onClose={onClose}
          onRestock={onRestock}
        />
      )}
    </Sheet>
  );
}

function movementTitle(movement: ProductMovement): string {
  const labels = INVENTORY_MESSAGES.movement;
  switch (movement.type) {
    case 'sale':
      return labels.sale(movement.folio);
    case 'void':
      return labels.void(movement.folio);
    default:
      return labels[movement.type];
  }
}

function movementMeta(movement: ProductMovement): string {
  return [
    formatRelativeTime(new Date(movement.createdAt)),
    movement.createdByName && INVENTORY_MESSAGES.movementBy(movement.createdByName),
    movement.unitCostColones !== null &&
      INVENTORY_MESSAGES.movementCost(formatColones(movement.unitCostColones)),
  ]
    .filter(Boolean)
    .join(' · ');
}

interface ProductBodyProps {
  product: ProductDetail;
  onDirtyChange: (isDirty: boolean) => void;
  onClose: () => void;
  onRestock: (productId: string) => void;
}

function ProductBody({ product, onDirtyChange, onClose, onRestock }: ProductBodyProps) {
  const navigate = useNavigate();
  const canEdit = usePermission('products.edit');
  const canRestock = usePermission('inventory.restock');
  const canSeeCosts = usePermission('costs.read');
  const [staleMessage, setStaleMessage] = useState<string | null>(null);
  const margin = unitMargin(product.priceColones, product.unitCostColones);

  const onDeactivated = useCallback(() => {
    onDirtyChange(false);
    onClose();
  }, [onClose, onDirtyChange]);

  return (
    <>
      {staleMessage && <Banner kind="warn" title={staleMessage} />}
      {!product.active && <Banner kind="info" title={INVENTORY_MESSAGES.inactive} />}
      <KpiGrid>
        <Kpi
          label={INVENTORY_MESSAGES.inStock}
          value={
            <span className={styles.kpiStock}>
              {product.stock}
              <Badge kind={BADGE_FOR_STATUS[product.stockStatus]}>
                {INVENTORY_MESSAGES.stockStatus[product.stockStatus]}
              </Badge>
            </span>
          }
        />
        <Kpi label={INVENTORY_MESSAGES.price} value={formatColones(product.priceColones)} />
        <Kpi label={INVENTORY_MESSAGES.sold} value={product.unitsSold} />
      </KpiGrid>

      {canEdit ? (
        <ProductEditForm
          // A new version (saved here or by someone else) starts the form from the stored data.
          key={`${product.id}-${String(product.version)}`}
          product={product}
          canSeeCosts={canSeeCosts}
          onDirtyChange={onDirtyChange}
          onStale={setStaleMessage}
          onDeactivated={onDeactivated}
        />
      ) : (
        <>
          <p className={styles.details}>
            {INVENTORY_MESSAGES.details(product.categoryName, product.code, product.minStock)}
          </p>
          {product.unitCostColones !== null && (
            <p className={styles.details}>
              {INVENTORY_MESSAGES.costLine(formatColones(product.unitCostColones))}
              {margin &&
                ` · ${INVENTORY_MESSAGES.marginLine(formatColones(margin.profitColones), margin.marginPct)}`}
            </p>
          )}
        </>
      )}

      <div className={canRestock ? styles.two : undefined}>
        <Button
          block
          variant="light"
          disabled={product.stock === 0 || !product.active}
          onClick={() => {
            // The link adds the product to the cart in Vender; replacing this
            // history entry means "back" from Vender returns to Inventario.
            void navigate(sellProductPath(product.id), { replace: true });
          }}
        >
          {INVENTORY_MESSAGES.sell}
        </Button>
        {canRestock && (
          <Button
            block
            variant="light"
            onClick={() => {
              onRestock(product.id);
            }}
          >
            {INVENTORY_MESSAGES.restockShortcut}
          </Button>
        )}
      </div>
      {product.stock === 0 && <p className={styles.hint}>{INVENTORY_MESSAGES.sellUnavailable}</p>}

      <h3 className={styles.sectionLabel}>{INVENTORY_MESSAGES.movementsTitle}</h3>
      {product.movements.length === 0 ? (
        <p className={styles.details}>{INVENTORY_MESSAGES.noMovements}</p>
      ) : (
        <ul className={styles.movements}>
          {product.movements.map((movement) => (
            <li key={movement.id} className={styles.movement}>
              <span className={styles.main}>
                <span className={styles.name}>{movementTitle(movement)}</span>
                <span className={styles.meta}>{movementMeta(movement)}</span>
              </span>
              <span className={styles.end}>
                <span
                  className={cx(
                    styles.delta,
                    movement.qtyDelta > 0 ? styles.deltaIn : styles.deltaOut,
                  )}
                >
                  {movement.qtyDelta > 0 ? `+${String(movement.qtyDelta)}` : movement.qtyDelta}
                </span>
                <span className={styles.meta}>
                  {INVENTORY_MESSAGES.stockAfter(movement.stockAfter)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
