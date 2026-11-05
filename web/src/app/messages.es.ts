// User-facing copy for the app shell. All UI text is Spanish and lives in messages.es.ts files.
export const APP_MESSAGES = {
  defaultAppName: 'Inventario y Ventas',
  sections: {
    home: 'Inicio',
    sell: 'Vender',
    history: 'Historial',
    receivables: 'Por cobrar',
    inventory: 'Inventario',
    profile: 'Perfil',
  },
  sectionsNavLabel: 'Secciones',
  previousSection: 'Sección anterior',
  nextSection: 'Sección siguiente',
  openProfile: 'Abrir perfil',
  pendingCount: (count: number) => `${String(count)} pendientes`,
} as const;
