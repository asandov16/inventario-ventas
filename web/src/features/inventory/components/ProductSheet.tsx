import { useNavigate } from 'react-router';

import { sellProductPath } from '@/features/sales';
import { formatRelativeTime } from '@/shared/domain/dates';
import { formatColones } from '@/shared/domain/money';
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
import { BADGE_FOR_STATUS } from './stockBadge';

interface ProductSheetProps {
  productId: string | null;
  onClose: () => void;
}

/**
 * Product detail (F6-T02): stock, price, units sold and the last movements with
 * who and when (F6 DoD). Costs appear only when the database sent them, which it
 * does only for someone with costs.read.
 */
export function ProductSheet({ productId, onClose }: ProductSheetProps) {
  const detail = useProductDetail(productId);

  return (
    <Sheet
      open={productId !== null}
      title={detail.data?.name ?? INVENTORY_MESSAGES.productSheetTitle}
      onClose={onClose}
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
        <ProductBody product={detail.data} />
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

function ProductBody({ product }: { product: ProductDetail }) {
  const navigate = useNavigate();
  const margin = unitMargin(product.priceColones, product.unitCostColones);

  return (
    <>
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
      {product.stock === 0 && <p className={styles.hint}>{INVENTORY_MESSAGES.sellUnavailable}</p>}
    </>
  );
}
