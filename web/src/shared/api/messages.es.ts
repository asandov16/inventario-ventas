import { formatColones } from '@/shared/domain/money';

/**
 * Spanish message for every business error code the database raises
 * (RAISE ... MESSAGE '<code>', DETAIL '<json>'). Each one says what to do
 * (RF-UX-09, section 4.1). The table is mirrored in docs/glosario.md.
 */
type Detail = Record<string, unknown>;

const text = (value: unknown, fallback = ''): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;

const amount = (value: unknown): string =>
  typeof value === 'number' && Number.isInteger(value) ? formatColones(value) : '';

export const BUSINESS_ERROR_MESSAGES: Record<string, (detail: Detail) => string> = {
  permission_denied: () => 'No tienes permiso para hacer esto. Habla con el administrador.',
  customer_required: () => 'Elige o registra al cliente para continuar.',
  invalid_term: () => 'Elige un plazo de 1, 2 o 3 meses.',
  invalid_down_payment: () =>
    'La prima debe ser menor que el total. Si paga todo hoy, regístrala como venta de contado.',
  term_too_long: () => 'Con este saldo, elige menos meses.',
  invalid_items: () => 'Agrega al menos un producto.',
  inactive_product: (d) =>
    `${text(d.product_name, 'Un producto')} ya no está a la venta. Quítalo para continuar.`,
  insufficient_stock: (d) =>
    typeof d.available === 'number'
      ? `Solo quedan ${String(d.available)} de ${text(d.product_name, 'ese producto')}; ajusta la cantidad.`
      : `No hay suficientes unidades de ${text(d.product_name, 'ese producto')}; ajusta la cantidad.`,
  total_changed: (d) =>
    `Los precios cambiaron. El total ahora es ${amount(d.total)}; revisa la venta antes de registrarla.`,
  payment_method_required: () => 'Elige el método de pago.',
  sale_not_found: () => 'No encontramos esa venta. Actualiza la lista.',
  sale_voided: (d) => `La venta #${text(d.folio)} está anulada.`,
  invalid_amount: () => 'Escribe un monto mayor a ₡0.',
  payment_exceeds_balance: (d) =>
    `El abono es mayor que el saldo (${amount(d.balance)}). Escribe un monto menor.`,
  void_reason_required: () => 'Escribe el motivo de la anulación.',
  already_voided: (d) =>
    `La venta #${text(d.folio)} ya fue anulada${d.voided_by_name ? ` por ${text(d.voided_by_name)}` : ''}.`,
  description_required: () => 'Escribe una descripción.',
  invalid_phone: () => 'El teléfono debe tener 8 números.',
  invalid_name: () => 'Escribe el nombre completo.',
  invalid_price: () => 'Escribe un precio mayor a ₡0.',
  invalid_quantity: () => 'Escribe una cantidad válida.',
  category_required: () => 'Elige una categoría.',
  product_not_found: () => 'No encontramos ese producto. Actualiza la lista.',
  concurrent_update: () =>
    'Alguien más cambió este registro. Revisa los datos nuevos y guarda otra vez.',
  invalid_channel: () => 'Ese medio de envío no está disponible.',
  no_balance: (d) => `La venta #${text(d.folio)} ya no tiene saldo.`,
  name_taken: () => 'Ya existe uno con ese nombre. Usa otro.',
  invalid_prefix: () => 'Revisa el prefijo: debe tener 3 letras.',
  prefix_taken: () => 'Ese prefijo ya lo usa otra categoría. Usa otro.',
  invalid_period: () => 'Elige un período válido.',
  last_admin_required: () => 'Debe quedar al menos un administrador activo.',
  delete_not_allowed: () => 'Este registro no se puede borrar. Si hay un error, anúlalo.',
  immutable_record: () => 'Este registro no se puede cambiar. Si hay un error, anúlalo.',
};

export const API_MESSAGES = {
  saveFailed: 'No se pudo guardar. Revisa tu internet y toca Reintentar.',
  loadFailed: 'No se pudo cargar. Revisa tu internet y toca Reintentar.',
  sessionExpired: 'Tu sesión venció. Entra de nuevo.',
  invalidCredentials: 'Usuario o clave incorrectos.',
} as const;
