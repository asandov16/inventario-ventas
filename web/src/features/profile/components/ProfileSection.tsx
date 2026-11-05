import { useUrlSheet } from '@/shared/hooks/useUrlSheet';
import { Button } from '@/shared/ui/Button';
import { Empty } from '@/shared/ui/Empty';
import { PageTitle } from '@/shared/ui/PageTitle';
import { Sheet } from '@/shared/ui/Sheet';

import { PROFILE_MESSAGES } from '../messages.es';

/** URL parameter of the "about" sheet: /perfil?acerca=1. */
const ABOUT_SHEET_PARAM = 'acerca';

/** Placeholder until Stage 3; already shows how sheets open and close. */
export function ProfileSection() {
  const aboutSheet = useUrlSheet(ABOUT_SHEET_PARAM);

  return (
    <>
      <PageTitle title={PROFILE_MESSAGES.title} />
      <Empty title={PROFILE_MESSAGES.placeholderTitle}>
        <p>{PROFILE_MESSAGES.placeholderBody}</p>
        <Button
          variant="light"
          onClick={() => {
            aboutSheet.open();
          }}
        >
          {PROFILE_MESSAGES.aboutButton}
        </Button>
      </Empty>
      <Sheet
        open={aboutSheet.isOpen}
        title={PROFILE_MESSAGES.aboutTitle}
        onClose={aboutSheet.close}
      >
        <p>{PROFILE_MESSAGES.aboutBody}</p>
        <p>{PROFILE_MESSAGES.aboutBack}</p>
      </Sheet>
    </>
  );
}
