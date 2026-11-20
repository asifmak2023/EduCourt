const numberFormatter = new Intl.NumberFormat("en-US");

const DEFAULT_CURRENCY = "PKR";

let activeCurrency = DEFAULT_CURRENCY;
let currencyFormatter = createCurrencyFormatter(activeCurrency);

function createCurrencyFormatter(currency: string): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: DEFAULT_CURRENCY,
      maximumFractionDigits: 0,
    });
  }
}

export function setActiveCurrency(currency: string | null | undefined): void {
  const next = String(currency ?? "").trim().toUpperCase();

  if (next === activeCurrency) {
    return;
  }

  if (!/^[A-Z]{3}$/.test(next)) {
    activeCurrency = DEFAULT_CURRENCY;
    currencyFormatter = createCurrencyFormatter(DEFAULT_CURRENCY);
    return;
  }

  try {
    currencyFormatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: next,
      maximumFractionDigits: 0,
    });
    activeCurrency = next;
  } catch {
    activeCurrency = DEFAULT_CURRENCY;
    currencyFormatter = createCurrencyFormatter(DEFAULT_CURRENCY);
  }
}

export function getActiveCurrency(): string {
  return activeCurrency;
}

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

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function currentMonthValue(date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function currentDateTimeLocal(date = new Date()): string {
  return `${currentMonthValue(date)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
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

function integerToWordsIndian(value: number): string {
  if (value === 0) {
    return "zero";
  }

  const crore = Math.floor(value / 10000000);
  const lakh = Math.floor((value % 10000000) / 100000);
  const thousand = Math.floor((value % 100000) / 1000);
  const rest = value % 1000;
  const parts: string[] = [];

  if (crore > 0) {
    parts.push(`${integerToWordsIndian(crore)} crore`);
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

const INTERNATIONAL_SCALES = [
  { value: 1000000000000, label: "trillion" },
  { value: 1000000000, label: "billion" },
  { value: 1000000, label: "million" },
  { value: 1000, label: "thousand" },
] as const;

function integerToWordsInternational(value: number): string {
  if (value === 0) {
    return "zero";
  }

  for (const scale of INTERNATIONAL_SCALES) {
    if (value >= scale.value) {
      const whole = Math.floor(value / scale.value);
      const rest = value % scale.value;
      const head = `${integerToWordsInternational(whole)} ${scale.label}`;

      return rest > 0
        ? `${head} ${integerToWordsInternational(rest)}`
        : head;
    }
  }

  return threeDigits(value);
}

interface CurrencyUnits {
  major: string;
  minor: string;
  indian: boolean;
  minorDigits: number;
}

const CURRENCY_UNITS: Record<string, Omit<CurrencyUnits, "indian" | "minorDigits">> = {
  PKR: { major: "rupees", minor: "paisa" },
  INR: { major: "rupees", minor: "paise" },
  LKR: { major: "rupees", minor: "cents" },
  NPR: { major: "rupees", minor: "paisa" },
  BDT: { major: "taka", minor: "poisha" },
  USD: { major: "dollars", minor: "cents" },
  CAD: { major: "dollars", minor: "cents" },
  AUD: { major: "dollars", minor: "cents" },
  NZD: { major: "dollars", minor: "cents" },
  SGD: { major: "dollars", minor: "cents" },
  HKD: { major: "dollars", minor: "cents" },
  GBP: { major: "pounds", minor: "pence" },
  EUR: { major: "euros", minor: "cents" },
  AED: { major: "dirhams", minor: "fils" },
  SAR: { major: "riyals", minor: "halalas" },
  QAR: { major: "riyals", minor: "dirhams" },
  KWD: { major: "dinars", minor: "fils" },
  BHD: { major: "dinars", minor: "fils" },
  OMR: { major: "rials", minor: "baisa" },
  MYR: { major: "ringgit", minor: "sen" },
  IDR: { major: "rupiah", minor: "sen" },
  TRY: { major: "liras", minor: "kurus" },
  EGP: { major: "pounds", minor: "piastres" },
  ZAR: { major: "rand", minor: "cents" },
  JPY: { major: "yen", minor: "sen" },
  KRW: { major: "won", minor: "jeon" },
  CNY: { major: "yuan", minor: "fen" },
  CHF: { major: "francs", minor: "rappen" },
  SEK: { major: "kronor", minor: "ore" },
  NOK: { major: "kroner", minor: "ore" },
  DKK: { major: "kroner", minor: "ore" },
  RUB: { major: "rubles", minor: "kopecks" },
  BRL: { major: "reais", minor: "centavos" },
  MXN: { major: "pesos", minor: "centavos" },
  NGN: { major: "naira", minor: "kobo" },
  KES: { major: "shillings", minor: "cents" },
};

const INDIAN_CURRENCIES = new Set(["PKR", "INR", "LKR", "NPR", "BDT"]);

function currencyUnits(currency: string): CurrencyUnits {
  const names = CURRENCY_UNITS[currency] ?? {
    major: currency,
    minor: "cents",
  };

  let minorDigits = 2;

  try {
    minorDigits = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    minorDigits = 2;
  }

  return {
    ...names,
    indian: INDIAN_CURRENCIES.has(currency),
    minorDigits,
  };
}

export function amountInWords(value: number | string | null | undefined): string {
  const numeric = typeof value === "string" ? Number(value) : value ?? 0;
  const units = currencyUnits(activeCurrency);

  if (Number.isNaN(numeric)) {
    return `Zero ${units.major} only`;
  }

  const absolute = Math.abs(numeric);
  const major = Math.floor(absolute);
  const factor = 10 ** units.minorDigits;
  const minor = Math.round((absolute - major) * factor);
  const toWords = units.indian
    ? integerToWordsIndian
    : integerToWordsInternational;
  const parts = [`${toWords(major)} ${units.major}`];

  if (minor > 0) {
    parts.push(`and ${toWords(minor)} ${units.minor}`);
  }

  const words = parts.join(" ").replace(/\s+/g, " ").trim();

  return `${words.charAt(0).toUpperCase()}${words.slice(1)} only`;
}
