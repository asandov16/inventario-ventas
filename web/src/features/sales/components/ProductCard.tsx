import { formatColones } from '@/shared/domain/money';
import { cx } from '@/shared/ui/cx';

import type { CatalogProduct } from '../domain/catalog';
import { SALES_MESSAGES } from '../messages.es';
import styles from './Sell.module.css';

interface ProductCardProps {
  product: CatalogProduct;
  inCart: number;
  onAdd: (product: CatalogProduct) => void;
}

/** One tap adds one unit (CU-01). Sold-out products cannot be tapped. */
export function ProductCard({ product, inCart, onAdd }: ProductCardProps) {
  const left = product.stock - inCart;
  const isSoldOut = product.stock === 0;

  return (
    <button
      type="button"
      className={cx(styles.card, inCart > 0 && styles.cardInCart)}
      disabled={isSoldOut}
      aria-label={SALES_MESSAGES.addProduct(product.name)}
      onClick={() => {
        onAdd(product);
      }}
    >
      <span className={styles.thumb} aria-hidden="true">
        {product.categoryName.charAt(0)}
      </span>
      <span className={styles.cardName}>{product.name}</span>
      <span className={styles.cardPrice}>{formatColones(product.priceColones)}</span>
      <span className={styles.cardStock}>
        {isSoldOut ? SALES_MESSAGES.soldOut : SALES_MESSAGES.unitsLeft(left)}
      </span>
      {inCart > 0 && (
        <span className={styles.cardCount} aria-label={SALES_MESSAGES.inCart(inCart)}>
          {inCart}
        </span>
      )}
    </button>
  );
}
