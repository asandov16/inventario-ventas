import { Empty } from '@/shared/ui/Empty';
import { PageTitle } from '@/shared/ui/PageTitle';

import { HISTORY_MESSAGES } from '../messages.es';

/** Placeholder until this section is built; keeps the six-section shell complete. */
export function HistorySection() {
  return (
    <>
      <PageTitle title={HISTORY_MESSAGES.title} />
      <Empty title={HISTORY_MESSAGES.placeholderTitle}>
        <p>{HISTORY_MESSAGES.placeholderBody}</p>
      </Empty>
    </>
  );
}
