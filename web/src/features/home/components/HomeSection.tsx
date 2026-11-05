import { Empty } from '@/shared/ui/Empty';
import { PageTitle } from '@/shared/ui/PageTitle';

import { HOME_MESSAGES } from '../messages.es';

/** Placeholder until this section is built; keeps the six-section shell complete. */
export function HomeSection() {
  return (
    <>
      <PageTitle title={HOME_MESSAGES.title} />
      <Empty title={HOME_MESSAGES.placeholderTitle}>
        <p>{HOME_MESSAGES.placeholderBody}</p>
      </Empty>
    </>
  );
}
