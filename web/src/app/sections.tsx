import type { ComponentType, ReactNode } from 'react';

import { HistorySection } from '@/features/history';
import { HomeSection } from '@/features/home';
import { InventorySection } from '@/features/inventory';
import { ProfileSection } from '@/features/profile';
import { ReceivablesSection } from '@/features/receivables';
import { SellSection } from '@/features/sales';

import { APP_MESSAGES } from './messages.es';

/**
 * The six sections of the app, in Track order (RF-UX-01). Paths are the
 * visible Spanish routes; ids are the English names used in code.
 */
export type SectionId = keyof typeof APP_MESSAGES.sections;

export interface Section {
  id: SectionId;
  path: string;
  label: string;
  icon: ReactNode;
  Component: ComponentType;
}

export const SECTIONS: readonly Section[] = [
  {
    id: 'home',
    path: '/',
    label: APP_MESSAGES.sections.home,
    icon: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
    Component: HomeSection,
  },
  {
    id: 'sell',
    path: '/vender',
    label: APP_MESSAGES.sections.sell,
    icon: (
      <>
        <path d="M5 8h14l-1 12H6L5 8z" />
        <path d="M9 8a3 3 0 0 1 6 0" />
        <path d="M12 12v5M9.5 14.5h5" />
      </>
    ),
    Component: SellSection,
  },
  {
    id: 'history',
    path: '/historial',
    label: APP_MESSAGES.sections.history,
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    Component: HistorySection,
  },
  {
    id: 'receivables',
    path: '/por-cobrar',
    label: APP_MESSAGES.sections.receivables,
    icon: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18M16 15h2" />
      </>
    ),
    Component: ReceivablesSection,
  },
  {
    id: 'inventory',
    path: '/inventario',
    label: APP_MESSAGES.sections.inventory,
    icon: (
      <>
        <path d="M3 7l9-4 9 4-9 4-9-4z" />
        <path d="M3 7v10l9 4 9-4V7M12 11v10" />
      </>
    ),
    Component: InventorySection,
  },
  {
    id: 'profile',
    path: '/perfil',
    label: APP_MESSAGES.sections.profile,
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </>
    ),
    Component: ProfileSection,
  },
];

/** Index of the section for a path; unknown paths fall back to Inicio. */
export function sectionIndexForPath(pathname: string): number {
  const normalized = pathname !== '/' ? pathname.replace(/\/+$/, '') : pathname;
  const index = SECTIONS.findIndex((section) => section.path === normalized);
  return index === -1 ? 0 : index;
}
