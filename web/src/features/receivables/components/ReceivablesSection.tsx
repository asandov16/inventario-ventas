import { Empty } from '@/shared/ui/Empty';
import { PageTitle } from '@/shared/ui/PageTitle';

import { RECEIVABLES_MESSAGES } from '../messages.es';

/** Placeholder until this section is built; keeps the six-section shell complete. */
export function ReceivablesSection() {
  return (
    <>
      <PageTitle title={RECEIVABLES_MESSAGES.title} />
      <Empty title={RECEIVABLES_MESSAGES.placeholderTitle}>
        <p>{RECEIVABLES_MESSAGES.placeholderBody}</p>
      </Empty>
    </>
  );
}
