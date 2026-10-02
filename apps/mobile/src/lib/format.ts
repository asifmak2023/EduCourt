import {
  formatDate as formatDateI18n,
  formatNumber,
  getActiveLocale,
} from "@eis/i18n";

export function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  return formatDateI18n(value);
}

export function formatMoney(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") {
    return "0.00";
  }

  const amount = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(amount)) {
    return String(value);
  }

  return formatNumber(amount, getActiveLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const DAYS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export function dayName(day: number): string {
  try {
    return new Date(2024, 0, day).toLocaleDateString(getActiveLocale(), {
      weekday: "long",
    });
  } catch {
    return DAYS[day] ?? `Day ${day}`;
  }
}

export function periodTime(
  start?: string | null,
  end?: string | null
): string {
  const from = start?.slice(0, 5) ?? "";
  const to = end?.slice(0, 5) ?? "";
  return [from, to].filter(Boolean).join(" - ");
}
