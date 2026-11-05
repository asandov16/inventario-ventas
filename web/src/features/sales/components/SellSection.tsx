import { Empty } from '@/shared/ui/Empty';
import { PageTitle } from '@/shared/ui/PageTitle';

import { SALES_MESSAGES } from '../messages.es';

/** Placeholder until this section is built; keeps the six-section shell complete. */
export function SellSection() {
  return (
    <>
      <PageTitle title={SALES_MESSAGES.title} />
      <Empty title={SALES_MESSAGES.placeholderTitle}>
        <p>{SALES_MESSAGES.placeholderBody}</p>
      </Empty>
    </>
  );
}
