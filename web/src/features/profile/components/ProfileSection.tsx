import { useState } from 'react';

import { usePermission } from '@/shared/hooks/usePermission';
import { useUrlSheet } from '@/shared/hooks/useUrlSheet';
import { PageTitle } from '@/shared/ui/PageTitle';
import { Segmented, type Segment } from '@/shared/ui/Segmented';
import { Sheet } from '@/shared/ui/Sheet';

import { PROFILE_MESSAGES } from '../messages.es';
import { AccountPanel } from './AccountPanel';
import { BusinessPanel } from './BusinessPanel';
import { UsersPanel } from './UsersPanel';

/** URL parameter of the "about" sheet: /perfil?acerca=1. */
const ABOUT_SHEET_PARAM = 'acerca';

type Tab = 'account' | 'business' | 'users';

/**
 * Perfil (CU-14, CU-15): everyone has "Mi cuenta"; "Negocio" and "Usuarios"
 * appear only with their permissions (the database checks them again).
 */
export function ProfileSection() {
  const aboutSheet = useUrlSheet(ABOUT_SHEET_PARAM);
  const canConfigure = usePermission('business.configure');
  const canSeeUsers = usePermission('users.admin');
  const [tab, setTab] = useState<Tab>('account');

  const segments: Segment<Tab>[] = [
    { value: 'account', label: PROFILE_MESSAGES.tabs.account },
    ...(canConfigure
      ? [{ value: 'business' as const, label: PROFILE_MESSAGES.tabs.business }]
      : []),
    ...(canSeeUsers ? [{ value: 'users' as const, label: PROFILE_MESSAGES.tabs.users }] : []),
  ];

  return (
    <>
      <PageTitle title={PROFILE_MESSAGES.title} />
      {segments.length > 1 && (
        <Segmented<Tab>
          label={PROFILE_MESSAGES.tabsLabel}
          value={tab}
          onChange={setTab}
          segments={segments}
        />
      )}

      {tab === 'business' && canConfigure ? (
        <BusinessPanel />
      ) : tab === 'users' && canSeeUsers ? (
        <UsersPanel />
      ) : (
        <AccountPanel
          onAbout={() => {
            aboutSheet.open();
          }}
        />
      )}

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
