import { formatShortDate } from '@/shared/domain/dates';
import { formatColones } from '@/shared/domain/money';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { ErrorState, Loading } from '@/shared/ui/ErrorState';
import { Sheet } from '@/shared/ui/Sheet';

import { useSale } from '../hooks/useSale';
import { SALES_MESSAGES } from '../messages.es';
import { InstallmentPlan } from './InstallmentPlan';
import styles from './Sell.module.css';

interface SaleDoneSheetProps {
  saleId: string | null;
  onClose: () => void;
}

/**
 * Shown right after registering (CU-01 step "abre el detalle"): what the
 * database saved, with the folio and the real installment plan. The full sale
 * detail (payments, void) arrives in Stage 3.
 */
export function SaleDoneSheet({ saleId, onClose }: SaleDoneSheetProps) {
  const sale = useSale(saleId);
  const title = sale.data
    ? SALES_MESSAGES.saleDoneTitle(sale.data.folio)
    : SALES_MESSAGES.saleSheetTitle;

  return (
    <Sheet open={saleId !== null} title={title} onClose={onClose}>
      {sale.isPending ? (
        <Loading label={SALES_MESSAGES.saleLoading} />
      ) : sale.isError ? (
        <ErrorState
          onRetry={() => {
            void sale.refetch();
          }}
        />
      ) : (
        <>
          <div className={styles.highlight}>
            <Banner kind="ok" title={SALES_MESSAGES.saleDoneBanner(sale.data.folio)}>
              {sale.data.type === 'installments' && sale.data.installments[0]
                ? SALES_MESSAGES.saleDoneFirstInstallment(
                    formatColones(sale.data.installments[0].amountColones),
                    formatShortDate(sale.data.installments[0].dueDate),
                  )
                : SALES_MESSAGES.saleDoneCashBody(
                    [
                      formatColones(sale.data.totalColones),
                      sale.data.paymentMethodName,
                      sale.data.customerName,
                    ].filter((part): part is string => Boolean(part)),
                  )}
            </Banner>
          </div>
          {sale.data.type === 'installments' && (
            <>
              <div className={styles.summary}>
                <p className={styles.summaryLine}>
                  <span>{SALES_MESSAGES.total}</span>
                  <span>{formatColones(sale.data.totalColones)}</span>
                </p>
                <p className={styles.summaryLine}>
                  <span>{SALES_MESSAGES.downPaymentToday}</span>
                  <span>{formatColones(sale.data.downPaymentColones)}</span>
                </p>
                <p className={styles.summaryLine}>
                  <span>{SALES_MESSAGES.customer}</span>
                  <span>{sale.data.customerName}</span>
                </p>
              </div>
              <p className={styles.sectionLabel}>{SALES_MESSAGES.saleDonePlan}</p>
              <InstallmentPlan installments={sale.data.installments} />
            </>
          )}
          <Button block onClick={onClose}>
            {SALES_MESSAGES.newSale}
          </Button>
        </>
      )}
    </Sheet>
  );
}
