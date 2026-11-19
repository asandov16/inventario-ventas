/** Lowercase without accents, so "rosa" finds "Rosa" and "ambar" finds "Ámbar". */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}
