"use client";

import {
  I18nProvider,
  MESSAGES,
  useTranslation,
  type MessageKey,
  type StorageAdapter,
} from "@eis/i18n";
import { useCallback, type ReactNode } from "react";

const storage: StorageAdapter = {
  get(key) {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem(key);
  },
  set(key, value) {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(key, value);
  },
};

function detect(): string[] {
  if (typeof navigator === "undefined") {
    return [];
  }

  const languages =
    navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language];

  return languages.filter(Boolean);
}

export function WebI18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nProvider storage={storage} detect={detect}>
      {children}
    </I18nProvider>
  );
}

/**
 * Translate a value that may be a semantic message key, an English source-text
 * key used by config-driven content, or untranslated text (returned as-is).
 */
export function useTr(): (value: string | undefined | null) => string {
  const { t, locale } = useTranslation();

  return useCallback(
    (value) => {
      if (!value) {
        return "";
      }
      if (value in (MESSAGES.en ?? {})) {
        return t(value as MessageKey);
      }
      return MESSAGES[locale]?.[value] ?? value;
    },
    [t, locale]
  );
}
