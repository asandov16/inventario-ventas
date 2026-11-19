import { parseColones } from '@/shared/domain/money';

/**
 * Checks of the inventory forms (CU-09 to CU-11), mirroring what the RPCs refuse
 * so the person sees the problem beside the field before anything is sent. The
 * database still validates everything.
 */
export type FieldIssue = 'required' | 'positive' | 'not_a_number';

type Issues<Field extends string> = Partial<Record<Field, FieldIssue>>;

/** Digits, spaces, ₡, dots and commas: "15 000", "₡15.000". Letters are refused. */
const MONEY_PATTERN = /^[\d\s₡.,]*$/;

/** A whole number of units typed by hand; null when empty or not a number. */
export function parseQuantity(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : null;
}

/** An optional cost: empty means "not given"; letters or symbols are an issue. */
function readOptionalMoney(text: string): { ok: true; value: number | null } | { ok: false } {
  if (text.trim() === '') return { ok: true, value: null };
  if (!MONEY_PATTERN.test(text)) return { ok: false };
  const value = parseColones(text);
  return value === null ? { ok: false } : { ok: true, value };
}

function readPositiveQuantity(text: string): number | FieldIssue {
  if (text.trim() === '') return 'required';
  const value = parseQuantity(text);
  if (value === null) return 'not_a_number';
  return value > 0 ? value : 'positive';
}

function readPrice(text: string): number | FieldIssue {
  if (text.trim() === '') return 'required';
  if (!MONEY_PATTERN.test(text)) return 'not_a_number';
  const value = parseColones(text);
  if (value === null) return 'not_a_number';
  return value > 0 ? value : 'positive';
}

function readCount(text: string): number | FieldIssue {
  if (text.trim() === '') return 'required';
  return parseQuantity(text) ?? 'not_a_number';
}

/** A product as a write returns it. */
export interface SavedProduct {
  id: string;
  code: string;
  name: string;
  stock: number;
}

/** A product whose name is the same or very similar to a new one (create_product `similar`). */
export type SimilarProduct = SavedProduct;

// ---- CU-09: restock an existing product ----

export interface RestockDraft {
  productId: string | null;
  qtyText: string;
  costText: string;
}

export interface RestockInput {
  productId: string;
  qty: number;
  unitCostColones: number | null;
}

export type RestockField = 'product' | 'qty' | 'cost';

export function reviewRestock(draft: RestockDraft): {
  issues: Issues<RestockField>;
  input: RestockInput | null;
} {
  const issues: Issues<RestockField> = {};
  if (!draft.productId) issues.product = 'required';
  const qty = readPositiveQuantity(draft.qtyText);
  if (typeof qty !== 'number') issues.qty = qty;
  const cost = readOptionalMoney(draft.costText);
  if (!cost.ok) issues.cost = 'not_a_number';

  if (!draft.productId || typeof qty !== 'number' || !cost.ok) return { issues, input: null };
  return { issues, input: { productId: draft.productId, qty, unitCostColones: cost.value } };
}

// ---- CU-10: create a product ----

export interface NewProductDraft {
  name: string;
  categoryId: string | null;
  priceText: string;
  minStockText: string;
  qtyText: string;
  costText: string;
}

export interface NewProductInput {
  name: string;
  categoryId: string;
  priceColones: number;
  minStock: number;
  initialQty: number;
  unitCostColones: number | null;
}

export type NewProductField = 'name' | 'category' | 'price' | 'minStock' | 'qty' | 'cost';

/** Collapses spaces, as the database does: "  Perfume   Jazmín " → "Perfume Jazmín". */
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function reviewNewProduct(draft: NewProductDraft): {
  issues: Issues<NewProductField>;
  input: NewProductInput | null;
} {
  const issues: Issues<NewProductField> = {};
  const name = cleanName(draft.name);
  if (name.length < 2) issues.name = 'required';
  if (!draft.categoryId) issues.category = 'required';
  const price = readPrice(draft.priceText);
  if (typeof price !== 'number') issues.price = price;
  const minStock = readCount(draft.minStockText);
  if (typeof minStock !== 'number') issues.minStock = minStock;
  const qty = readPositiveQuantity(draft.qtyText);
  if (typeof qty !== 'number') issues.qty = qty;
  const cost = readOptionalMoney(draft.costText);
  if (!cost.ok) issues.cost = 'not_a_number';

  if (
    Object.keys(issues).length > 0 ||
    !draft.categoryId ||
    typeof price !== 'number' ||
    typeof minStock !== 'number' ||
    typeof qty !== 'number' ||
    !cost.ok
  ) {
    return { issues, input: null };
  }
  return {
    issues,
    input: {
      name,
      categoryId: draft.categoryId,
      priceColones: price,
      minStock,
      initialQty: qty,
      unitCostColones: cost.value,
    },
  };
}

// ---- CU-11: edit a product or adjust its count ----

export interface EditableProduct {
  id: string;
  version: number;
  name: string;
  priceColones: number;
  minStock: number;
  stock: number;
  unitCostColones: number | null;
}

export interface ProductEditDraft {
  name: string;
  priceText: string;
  costText: string;
  stockText: string;
  minStockText: string;
}

export interface UpdateProductInput {
  productId: string;
  expectedVersion: number;
  name: string;
  priceColones: number;
  minStock: number;
  /** null = unchanged. */
  unitCostColones: number | null;
  /** null = unchanged; a different number is recorded as "Ajuste de conteo". */
  countedStock: number | null;
  /** null = unchanged; false deactivates the product (RF-INV-05). */
  active: boolean | null;
}

export type ProductEditField = 'name' | 'price' | 'cost' | 'stock' | 'minStock';

/** The form as it starts: the product's current values. */
export function editDraftFrom(product: EditableProduct): ProductEditDraft {
  return {
    name: product.name,
    priceText: String(product.priceColones),
    costText: product.unitCostColones === null ? '' : String(product.unitCostColones),
    stockText: String(product.stock),
    minStockText: String(product.minStock),
  };
}

export interface ProductEditReview {
  issues: Issues<ProductEditField>;
  /** "Guardar cambios" stays disabled until something changed (CU-11). */
  isDirty: boolean;
  input: UpdateProductInput | null;
  /** Non-blocking warning: selling below cost (CU-11). */
  priceBelowCost: boolean;
}

export function reviewProductEdit(
  product: EditableProduct,
  draft: ProductEditDraft,
): ProductEditReview {
  const original = editDraftFrom(product);
  const isDirty =
    cleanName(draft.name) !== product.name ||
    draft.priceText.trim() !== original.priceText ||
    draft.costText.trim() !== original.costText ||
    draft.stockText.trim() !== original.stockText ||
    draft.minStockText.trim() !== original.minStockText;

  const issues: Issues<ProductEditField> = {};
  const name = cleanName(draft.name);
  if (name.length < 2) issues.name = 'required';
  const price = readPrice(draft.priceText);
  if (typeof price !== 'number') issues.price = price;
  const cost = readOptionalMoney(draft.costText);
  if (!cost.ok) issues.cost = 'not_a_number';
  const stock = readCount(draft.stockText);
  if (typeof stock !== 'number') issues.stock = stock;
  const minStock = readCount(draft.minStockText);
  if (typeof minStock !== 'number') issues.minStock = minStock;

  if (
    typeof price !== 'number' ||
    !cost.ok ||
    typeof stock !== 'number' ||
    typeof minStock !== 'number' ||
    issues.name
  ) {
    return { issues, isDirty, input: null, priceBelowCost: false };
  }

  const effectiveCost = cost.value ?? product.unitCostColones;
  return {
    issues,
    isDirty,
    priceBelowCost: effectiveCost !== null && price < effectiveCost,
    input: {
      productId: product.id,
      expectedVersion: product.version,
      name,
      priceColones: price,
      minStock,
      unitCostColones:
        cost.value !== null && cost.value !== product.unitCostColones ? cost.value : null,
      countedStock: stock !== product.stock ? stock : null,
      active: null,
    },
  };
}
