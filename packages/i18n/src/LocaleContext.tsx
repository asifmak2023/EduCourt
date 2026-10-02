import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LOCALES, MESSAGES, type MessageKey } from "./locales";
import { createTranslator } from "./translate";
import { pickBestLocale } from "./detect";
import { setActiveLocale } from "./runtime";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatTime,
  type CurrencyOptions,
} from "./format";
import type { LocaleMeta, StorageAdapter, TranslateFn } from "./types";

export const LOCALE_STORAGE_KEY = "eis.locale";

export interface I18nContextValue {
  t: TranslateFn<MessageKey>;
  locale: string;
  dir: "ltr" | "rtl";
  isRTL: boolean;
  locales: LocaleMeta[];
  setLocale: (code: string) => void;
  formatDate: (value?: string | number | Date | null) => string;
  formatDateTime: (value?: string | number | Date | null) => string;
  formatTime: (value?: string | null) => string;
  formatNumber: (value?: number | string | null) => string;
  formatCurrency: (
    value?: number | string | null,
    options?: CurrencyOptions
  ) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const SUPPORTED = LOCALES.map((entry) => entry.code);

function metaFor(code: string): LocaleMeta {
  return (
    LOCALES.find((entry) => entry.code === code) ??
    LOCALES[0] ?? { code: "en", name: "English", nativeName: "English", dir: "ltr" }
  );
}

export interface I18nProviderProps {
  children: ReactNode;
  storage: StorageAdapter;
  detect?: () => string[];
  defaultLocale?: string;
}

export function I18nProvider({
  children,
  storage,
  detect,
  defaultLocale = "en",
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState(defaultLocale);

  useEffect(() => {
    let active = true;

    (async () => {
      let next: string | null = null;

      try {
        next = await storage.get(LOCALE_STORAGE_KEY);
      } catch {
        next = null;
      }

      let resolved: string | undefined;

      if (next && SUPPORTED.includes(next)) {
        resolved = next;
      } else {
        const candidates = detect ? detect() : [];
        resolved = pickBestLocale(SUPPORTED, candidates, defaultLocale);
      }

      if (active && resolved && resolved !== locale) {
        setLocaleState(resolved);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setActiveLocale(locale);

    if (typeof document !== "undefined") {
      const meta = metaFor(locale);
      document.documentElement.lang = locale;
      document.documentElement.dir = meta.dir;
    }
  }, [locale]);

  const setLocale = useCallback(
    (code: string) => {
      if (!SUPPORTED.includes(code)) {
        return;
      }

      setLocaleState(code);
      void storage.set(LOCALE_STORAGE_KEY, code);
    },
    [storage]
  );

  const t = useMemo(
    () =>
      createTranslator(
        locale,
        MESSAGES[locale] ?? {},
        MESSAGES[defaultLocale] ?? {}
      ),
    [locale, defaultLocale]
  );

  const meta = metaFor(locale);

  const value = useMemo<I18nContextValue>(
    () => ({
      t,
      locale,
      dir: meta.dir,
      isRTL: meta.dir === "rtl",
      locales: LOCALES,
      setLocale,
      formatDate: (input) => formatDate(input, locale),
      formatDateTime: (input) => formatDateTime(input, locale),
      formatTime: (input) => formatTime(input, locale),
      formatNumber: (input) => formatNumber(input, locale),
      formatCurrency: (input, options) =>
        formatCurrency(input, { ...options, locale }),
    }),
    [t, locale, meta.dir, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }

  return context;
}

export function useLocale(): string {
  return useTranslation().locale;
}

export function useSetLocale(): (code: string) => void {
  return useTranslation().setLocale;
}
