import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { I18nProvider, type StorageAdapter } from "@eis/i18n";
import type { ReactNode } from "react";

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
