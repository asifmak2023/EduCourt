"use client";

import { useTranslation } from "@eis/i18n";

export function LanguageSwitcher() {
  const { t, locale, setLocale, locales } = useTranslation();

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">{t("appearance.language")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value)}
        aria-label={t("appearance.language")}
        className="h-9 rounded-lg border border-border-secondary bg-surface px-2 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      >
        {locales.map((entry) => (
          <option key={entry.code} value={entry.code}>
            {entry.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
