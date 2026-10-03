const numberFormatter = new Intl.NumberFormat("en-US");

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

const LRI = "\u2066";
const PDI = "\u2069";

function isolateLtr(value: string): string {
  return `${LRI}${value}${PDI}`;
}

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

  return isolateLtr(currencyFormatter.format(numeric));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return isolateLtr(
    date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  );
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return isolateLtr(
    date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

export function formatTime(value: string | null | undefined): string {
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

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
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
