export const localeCookieName = "signalnine-locale";
export const locales = ["zh-CN", "zh-TW", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh-CN";

export function normalizeLocale(value?: string | null): Locale {
  if (!value) {
    return defaultLocale;
  }

  const normalized = value.toLowerCase();

  if (
    normalized.includes("zh-tw") ||
    normalized.includes("zh-hk") ||
    normalized.includes("zh-mo") ||
    normalized.includes("zh-hant")
  ) {
    return "zh-TW";
  }

  if (normalized.includes("en")) {
    return "en";
  }

  return "zh-CN";
}

export function getIntlLocale(locale: Locale) {
  if (locale === "zh-TW") {
    return "zh-Hant-TW";
  }

  if (locale === "en") {
    return "en-US";
  }

  return "zh-CN";
}
