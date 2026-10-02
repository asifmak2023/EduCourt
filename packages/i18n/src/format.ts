import { getActiveLocale } from "./runtime";

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isNaN(numeric) ? null : numeric;
}

export function formatNumber(
  value: number | string | null | undefined,
  locale: string = getActiveLocale(),
  options?: Intl.NumberFormatOptions
): string {
  const numeric = toNumber(value);
  if (numeric === null) {
    return typeof value === "string" ? value : "0";
  }

  try {
    return new Intl.NumberFormat(locale, options).format(numeric);
  } catch {
    return String(numeric);
  }
}

export interface CurrencyOptions {
  currency?: string;
  locale?: string;
  maximumFractionDigits?: number;
}

export function formatCurrency(
  value: number | string | null | undefined,
  options: CurrencyOptions = {}
): string {
  const { currency = "PKR", locale = getActiveLocale() } = options;
  const numeric = toNumber(value);

  if (numeric === null) {
    return typeof value === "string" ? value : "";
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: options.maximumFractionDigits ?? 0,
    }).format(numeric);
  } catch {
    return String(numeric);
  }
}

export function formatDate(
  value: string | number | Date | null | undefined,
  locale: string = getActiveLocale(),
  options?: Intl.DateTimeFormatOptions
): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  try {
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...options,
    });
  } catch {
    return date.toDateString();
  }
}

export function formatDateTime(
  value: string | number | Date | null | undefined,
  locale: string = getActiveLocale()
): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  try {
    return date.toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date.toISOString();
  }
}

export function formatTime(
  value: string | null | undefined,
  locale: string = getActiveLocale()
): string {
  if (!value) {
    return "-";
  }

  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (match) {
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}
