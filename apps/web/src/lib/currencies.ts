const FALLBACK_CURRENCIES = [
  "PKR",
  "INR",
  "BDT",
  "LKR",
  "NPR",
  "AED",
  "SAR",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
  "USD",
  "GBP",
  "EUR",
  "CAD",
  "AUD",
  "NZD",
  "SGD",
  "HKD",
  "MYR",
  "IDR",
  "TRY",
  "EGP",
  "ZAR",
  "JPY",
  "KRW",
  "CNY",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "RUB",
  "BRL",
  "MXN",
  "NGN",
  "KES",
];

const PRIORITY_CURRENCIES = [
  "PKR",
  "AED",
  "SAR",
  "USD",
  "GBP",
  "EUR",
  "INR",
  "BDT",
];

function supportedCurrencies(): string[] {
  const supportedValuesOf = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf;

  if (typeof supportedValuesOf !== "function") {
    return FALLBACK_CURRENCIES;
  }

  try {
    return supportedValuesOf("currency");
  } catch {
    return FALLBACK_CURRENCIES;
  }
}

export function currencyLabel(currency: string): string {
  try {
    const names = new Intl.DisplayNames(["en"], { type: "currency" });
    return names.of(currency) ?? currency;
  } catch {
    return currency;
  }
}

export function currencyOptions(): { value: string; label: string }[] {
  const all = supportedCurrencies();
  const ordered = [
    ...PRIORITY_CURRENCIES.filter((code) => all.includes(code)),
    ...all.filter((code) => !PRIORITY_CURRENCIES.includes(code)).sort(),
  ];

  return ordered.map((code) => ({
    value: code,
    label: `${code} - ${currencyLabel(code)}`,
  }));
}
