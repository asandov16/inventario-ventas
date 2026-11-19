import { formatColones } from '@/shared/domain/money';
import { Badge } from '@/shared/ui/Badge';
import { cx } from '@/shared/ui/cx';

import type { InventoryProduct } from '../domain/inventory';
import { INVENTORY_MESSAGES } from '../messages.es';
import styles from './Inventory.module.css';
import { BADGE_FOR_STATUS } from './stockBadge';

interface ProductRowProps {
  product: InventoryProduct;
  onOpen: () => void;
}

/** One product: name, code and price, units and its OK / Bajo / Agotado label (RN-10). */
export function ProductRow({ product, onOpen }: ProductRowProps) {
  const statusLabel = INVENTORY_MESSAGES.stockStatus[product.stockStatus];

  return (
    <button
      type="button"
      className={styles.row}
      onClick={onOpen}
      aria-label={INVENTORY_MESSAGES.rowLabel(product.name, product.stock, statusLabel)}
    >
      <span className={styles.thumb} aria-hidden="true">
        {product.categoryName.charAt(0)}
      </span>
      <span className={styles.main}>
        <span className={styles.name}>{product.name}</span>
        <span className={styles.meta}>
          {INVENTORY_MESSAGES.rowMeta(product.code, formatColones(product.priceColones))}
        </span>
      </span>
      <span className={styles.end}>
        <span
          className={cx(
            styles.stock,
            product.stockStatus === 'low' && styles.stockLow,
            product.stockStatus === 'out' && styles.stockOut,
          )}
        >
          {product.stock}
        </span>
        <Badge kind={BADGE_FOR_STATUS[product.stockStatus]}>{statusLabel}</Badge>
      </span>
    </button>
  );
}
