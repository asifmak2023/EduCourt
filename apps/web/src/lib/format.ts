const numberFormatter = new Intl.NumberFormat("en-US");

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

export function formatNumber(value: number | string | null | undefined): string {
  const numeric = typeof value === "string" ? Number(value) : value;

  if (numeric === null || numeric === undefined || Number.isNaN(numeric)) {
    return "0";
  }

  return numberFormatter.format(numeric);
}

export function formatCurrency(value: number | string | null | undefined): string {
  const numeric = typeof value === "string" ? Number(value) : value;

  if (numeric === null || numeric === undefined || Number.isNaN(numeric)) {
    return currencyFormatter.format(0);
  }

  return currencyFormatter.format(numeric);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function humanize(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
