let activeLocale = "en";

/** Set the process-wide active locale. Used by format helpers so existing
 * non-hook call sites format in the currently selected language. */
export function setActiveLocale(locale: string): void {
  activeLocale = locale;
}

export function getActiveLocale(): string {
  return activeLocale;
}
