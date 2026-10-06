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

export function formatDate(value: string | null | undefined): string {  if (!value) {
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

const ONES = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

function twoDigits(value: number): string {
  if (value < 20) {
    return ONES[value];
  }

  const tens = Math.floor(value / 10);
  const ones = value % 10;

  return ones === 0 ? TENS[tens] : `${TENS[tens]}-${ONES[ones]}`;
}

function threeDigits(value: number): string {
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  const parts: string[] = [];

  if (hundreds > 0) {
    parts.push(`${ONES[hundreds]} hundred`);
  }

  if (rest > 0) {
    parts.push(twoDigits(rest));
  }

  return parts.join(" ");
}

function integerToWords(value: number): string {
  if (value === 0) {
    return "zero";
  }

  const crore = Math.floor(value / 10000000);
  const lakh = Math.floor((value % 10000000) / 100000);
  const thousand = Math.floor((value % 100000) / 1000);
  const rest = value % 1000;
  const parts: string[] = [];

  if (crore > 0) {
    parts.push(`${integerToWords(crore)} crore`);
  }

  if (lakh > 0) {
    parts.push(`${twoDigits(lakh)} lakh`);
  }

  if (thousand > 0) {
    parts.push(`${twoDigits(thousand)} thousand`);
  }

  if (rest > 0) {
    parts.push(threeDigits(rest));
  }

  return parts.join(" ");
}

export function amountInWords(value: number | string | null | undefined): string {
  const numeric = typeof value === "string" ? Number(value) : value ?? 0;

  if (Number.isNaN(numeric)) {
    return "Zero rupees only";
  }

  const rupees = Math.floor(Math.abs(numeric));
  const paisa = Math.round((Math.abs(numeric) - rupees) * 100);
  const parts = [`${integerToWords(rupees)} rupees`];

  if (paisa > 0) {
    parts.push(`and ${twoDigits(paisa)} paisa`);
  }

  const words = parts.join(" ").replace(/\s+/g, " ").trim();

  return `${words.charAt(0).toUpperCase()}${words.slice(1)} only`;
}
