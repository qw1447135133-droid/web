import { defaultLocale, getIntlLocale, type DisplayLocale, type Locale } from "@/lib/i18n-config";

export function formatPrice(amount: number, locale: Locale | DisplayLocale = defaultLocale) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(input: string, locale: Locale | DisplayLocale = defaultLocale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(input));
}

export function formatOdd(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  return value.toFixed(2);
}
