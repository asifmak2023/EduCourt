export function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatMoney(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") {
    return "0.00";
  }

  const amount = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(amount)) {
    return String(value);
  }

  return amount.toLocaleString(undefined, {
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
  return DAYS[day] ?? `Day ${day}`;
}

export function periodTime(
  start?: string | null,
  end?: string | null
): string {
  const from = start?.slice(0, 5) ?? "";
  const to = end?.slice(0, 5) ?? "";
  return [from, to].filter(Boolean).join(" - ");
}
