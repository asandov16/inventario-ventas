import { useSearchParams } from 'react-router';

import { formatDayLabel, formatShortDate, formatTime } from '@/shared/domain/dates';
import { formatColones } from '@/shared/domain/money';
import { formatPhone } from '@/shared/domain/phone';
import { usePermission } from '@/shared/hooks/usePermission';
import { useUrlSheet } from '@/shared/hooks/useUrlSheet';
import { Banner } from '@/shared/ui/Banner';
import { Button } from '@/shared/ui/Button';
import { ErrorState, Loading } from '@/shared/ui/ErrorState';
import { Sheet } from '@/shared/ui/Sheet';

import type { SaleDetail } from '../domain/saleDetail';
import { useSaleDetail } from '../hooks/useSaleDetail';
import { SALES_MESSAGES } from '../messages.es';
import { PaymentPlanCard } from './PaymentPlanCard';
import styles from './SaleDetail.module.css';
import { SaleStatusBadge } from './SaleStatusBadge';
import { VoidPanel } from './VoidPanel';

/** URL parameter of the sale sheet, the same from every section: ?venta=<id> (ADR-037). */
export const SALE_SHEET_PARAM = 'venta';
/** Set by Vender right after registering: the sheet opens with the confirmation. */
export const JUST_REGISTERED_PARAM = 'registrada';
/** The account sheet of Por cobrar (payments and reminders): ?cuenta=<sale id>. */
export const ACCOUNT_SHEET_PARAM = 'cuenta';

function dayAndTime(instant: string): string {
  const date = new Date(instant);
  return `${formatDayLabel(date)} · ${formatTime(date)}`;
}

/**
 * The sale sheet (F5-T02), rendered once by the app shell so Vender, Historial,
 * Por cobrar and Inicio open the same detail with ?venta=<id>. Everything shown
 * is what the database returned.
 */
export function SaleDetailSheet() {
  const sheet = useUrlSheet(SALE_SHEET_PARAM);
  const [searchParams] = useSearchParams();
  const justRegistered = searchParams.get(JUST_REGISTERED_PARAM) === '1';
  const detail = useSaleDetail(sheet.value);

  return (
    <Sheet
      open={sheet.isOpen}
      title={
        detail.data
          ? SALES_MESSAGES.saleDoneTitle(detail.data.folio)
          : SALES_MESSAGES.saleSheetTitle
      }
      onClose={sheet.close}
    >
      {detail.isPending ? (
        <Loading label={SALES_MESSAGES.saleLoading} />
      ) : detail.isError ? (
        <ErrorState
          message={detail.error.message}
          onRetry={() => {
            void detail.refetch();
          }}
        />
      ) : (
        <SaleBody
          sale={detail.data}
          justRegistered={justRegistered}
          onClose={sheet.close}
          onOpenSale={(saleId) => {
            sheet.switchTo(SALE_SHEET_PARAM, saleId);
          }}
          onOpenAccount={(saleId) => {
            sheet.switchTo(ACCOUNT_SHEET_PARAM, saleId);
          }}
        />
      )}
    </Sheet>
  );
}

interface SaleBodyProps {
  sale: SaleDetail;
  justRegistered: boolean;
  onClose: () => void;
  onOpenSale: (saleId: string) => void;
  onOpenAccount: (saleId: string) => void;
}

function SaleBody({ sale, justRegistered, onClose, onOpenSale, onOpenAccount }: SaleBodyProps) {
  const canVoid = usePermission('sales.void');
  const canCollect = usePermission('payments.create');
  const isInstallments = sale.type === 'installments';
  const isLegacy = sale.source === 'legacy_import';
  const firstInstallment = sale.installments[0];
  const summary = sale.customerSummary;

  return (
    <>
      {justRegistered && sale.status !== 'voided' && (
        <div className={styles.block}>
          <Banner kind="ok" title={SALES_MESSAGES.saleDoneBanner(sale.folio)}>
            {isInstallments && firstInstallment
              ? SALES_MESSAGES.saleDoneFirstInstallment(
                  formatColones(firstInstallment.amountColones),
                  formatShortDate(firstInstallment.dueDate),
                )
              : SALES_MESSAGES.saleDoneCashBody(
                  [
                    formatColones(sale.totalColones),
                    sale.paymentMethodName,
                    sale.customer.name,
                  ].filter((part): part is string => Boolean(part)),
                )}
          </Banner>
        </div>
      )}
      {sale.voidedAt && (
        <div className={styles.block}>
          <Banner
            kind="info"
            title={SALES_MESSAGES.voidedBy(sale.voidedByName ?? '—', dayAndTime(sale.voidedAt))}
          >
            {sale.voidReason && SALES_MESSAGES.voidedReason(sale.voidReason)}
          </Banner>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.customerRow}>
          <div>
            <p className={styles.customerName}>{sale.customer.name}</p>
            <p className={styles.muted}>📱 {formatPhone(sale.customer.phoneE164)}</p>
            <p className={styles.muted}>
              {SALES_MESSAGES.soldBy(dayAndTime(sale.clientCreatedAt), sale.sellerName)}
            </p>
          </div>
          <SaleStatusBadge
            status={sale.status}
            type={sale.type}
            source={sale.source}
            months={sale.months}
            paymentMethodName={sale.paymentMethodName}
          />
        </div>
      </div>

      <ul className={styles.lines}>
        {isLegacy ? (
          <li>
            <span>
              <span className={styles.lineName}>{sale.description}</span>
              <span className={styles.muted}>{SALES_MESSAGES.legacyNote}</span>
            </span>
          </li>
        ) : (
          sale.items.map((item) => (
            <li key={item.productId}>
              <span>
                <span className={styles.lineName}>{item.productName}</span>
                <span className={styles.muted}>
                  {SALES_MESSAGES.itemLine(item.qty, formatColones(item.unitPriceColones))}
                </span>
              </span>
              <strong>{formatColones(item.subtotalColones)}</strong>
            </li>
          ))
        )}
        <li className={styles.totalLine}>
          <strong>{SALES_MESSAGES.total}</strong>
          <strong className={sale.voidedAt ? styles.struck : undefined}>
            {formatColones(sale.totalColones)}
          </strong>
        </li>
      </ul>

      {isInstallments && <PaymentPlanCard sale={sale} />}

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>{SALES_MESSAGES.customerTitle}</h3>
        <p className={styles.muted}>
          {summary.balanceColones > 0
            ? SALES_MESSAGES.customerOwes(formatColones(summary.balanceColones), summary.openSales)
            : SALES_MESSAGES.customerOwesNothing}
        </p>
        {summary.otherSales.length > 0 && (
          <>
            <p className={styles.sectionLabel}>{SALES_MESSAGES.otherSalesTitle}</p>
            <ul className={styles.others}>
              {summary.otherSales.map((other) => (
                <li key={other.id}>
                  <button
                    type="button"
                    className={styles.otherSale}
                    onClick={() => {
                      onOpenSale(other.id);
                    }}
                  >
                    <span>
                      {SALES_MESSAGES.otherSaleLine(
                        other.folio,
                        formatDayLabel(new Date(other.clientCreatedAt)),
                      )}
                    </span>
                    <span className={styles.planAmount}>
                      {formatColones(other.totalColones)}
                      <SaleStatusBadge
                        status={other.status}
                        type={other.type}
                        source="app"
                        months={null}
                      />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {justRegistered && (
        <Button block onClick={onClose}>
          {SALES_MESSAGES.newSale}
        </Button>
      )}
      {canCollect && isInstallments && !sale.voidedAt && sale.balanceColones > 0 && (
        <Button
          block
          variant="gold"
          onClick={() => {
            onOpenAccount(sale.id);
          }}
        >
          {SALES_MESSAGES.registerPayment}
        </Button>
      )}
      {canVoid && !sale.voidedAt && <VoidPanel sale={sale} />}
    </>
  );
}
