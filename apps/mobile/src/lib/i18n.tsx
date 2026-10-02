import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import {
  I18nProvider,
  MESSAGES,
  useTranslation,
  type MessageKey,
  type StorageAdapter,
} from "@eis/i18n";
import { useCallback, type ReactNode } from "react";

const storage: StorageAdapter = {
  get: (key) => AsyncStorage.getItem(key),
  set: (key, value) => AsyncStorage.setItem(key, value),
};

function detect(): string[] {
  try {
    return getLocales().map((entry) => entry.languageTag || entry.languageCode || "");
  } catch {
    return [];
  }
}

export function AppI18nProvider({ children }: { children: ReactNode }) {
  return (
    <I18nProvider storage={storage} detect={detect}>
      {children}
    </I18nProvider>
  );
}

/**
 * Translate a value only when it is a known message key; otherwise return it
 * unchanged. Bridges legacy English strings (e.g. registry labels not yet
 * converted to keys) during the migration.
 */
export function useTr(): (value: string | undefined | null) => string {
  const { t } = useTranslation();

  return useCallback(
    (value) => {
      if (!value) {
        return "";
      }
      return value in (MESSAGES.en ?? {}) ? t(value as MessageKey) : value;
    },
    [t]
  );
}

