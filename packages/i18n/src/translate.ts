import type { Messages, TranslateFn, TranslateParams } from "./types";
import type { MessageKey } from "./locales";

export const PLURAL_CATEGORIES = [
  "zero",
  "one",
  "two",
  "few",
  "many",
  "other",
] as const;

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

export function interpolate(template: string, params?: TranslateParams): string {
  if (!params) {
    return template;
  }

  return template.replace(PLACEHOLDER, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name)
      ? String(params[name])
      : match
  );
}

function selectCategory(locale: string, count: number): string {
  try {
    return new Intl.PluralRules(locale).select(count);
  } catch {
    return count === 1 ? "one" : "other";
  }
}

/**
 * Build a translator for a locale.
 *
 * Plural resolution order for a base key `K`, locale `L`, category `C`:
 *   1. L + K.C
 *   2. fallback (English) + K.C
 *   3. L + K
 *   4. fallback + K
 *   5. the raw key string
 */
export function createTranslator(
  locale: string,
  messages: Partial<Messages>,
  fallbackMessages: Partial<Messages>
): TranslateFn<MessageKey> {
  return (key, params) => {
    const count =
      params && typeof params.count === "number" ? params.count : undefined;

    let template: string | undefined;

    if (count !== undefined) {
      const category = selectCategory(locale, count);
      const suffixed = `${key}.${category}`;
      template =
        messages[suffixed] ??
        fallbackMessages[suffixed] ??
        messages[key] ??
        fallbackMessages[key];
    } else {
      template = messages[key] ?? fallbackMessages[key];
    }

    if (template === undefined) {
      template = key;
    }

    return interpolate(template, params);
  };
}
