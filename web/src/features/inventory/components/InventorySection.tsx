import { Empty } from '@/shared/ui/Empty';
import { PageTitle } from '@/shared/ui/PageTitle';

import { INVENTORY_MESSAGES } from '../messages.es';

/** Placeholder until this section is built; keeps the six-section shell complete. */
export function InventorySection() {
  return (
    <>
      <PageTitle title={INVENTORY_MESSAGES.title} />
      <Empty title={INVENTORY_MESSAGES.placeholderTitle}>
        <p>{INVENTORY_MESSAGES.placeholderBody}</p>
      </Empty>
    </>
  );
}
