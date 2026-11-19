// Public API of the sales feature: the only entry point for other modules.
export { InstallmentPlan } from './components/InstallmentPlan';
export { PaymentPlanCard } from './components/PaymentPlanCard';
export {
  ACCOUNT_SHEET_PARAM,
  SALE_SHEET_PARAM,
  SaleDetailSheet,
} from './components/SaleDetailSheet';
export { SaleStatusBadge } from './components/SaleStatusBadge';
export { SellSection } from './components/SellSection';
export { sellProductPath } from './hooks/useAddFromLink';
export type { SaleDetail } from './domain/saleDetail';
export type { PaymentMethod } from './domain/catalog';
export { usePaymentMethods } from './hooks/useCatalog';
export { useSaleDetail } from './hooks/useSaleDetail';
