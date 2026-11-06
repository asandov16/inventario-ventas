import { usePermission } from '@/shared/hooks/usePermission';
import { Empty } from '@/shared/ui/Empty';
import { PageTitle } from '@/shared/ui/PageTitle';

import { HOME_MESSAGES } from '../messages.es';

/** Placeholder until Stage 3. The profit card shows how cost data is hidden from sellers. */
export function HomeSection() {
  const canReadCosts = usePermission('costs.read');

  return (
    <>
      <PageTitle title={HOME_MESSAGES.title} />
      <Empty title={HOME_MESSAGES.placeholderTitle}>
        <p>{HOME_MESSAGES.placeholderBody}</p>
      </Empty>
      {canReadCosts && (
        <div data-testid="profit-card" style={{ marginTop: 12 }}>
          <Empty title={HOME_MESSAGES.profitTitle}>
            <p>{HOME_MESSAGES.profitBody}</p>
          </Empty>
        </div>
      )}
    </>
  );
}
