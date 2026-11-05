/** Joins CSS Module class names, skipping missing or disabled ones. */
export function cx(...classNames: (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}
