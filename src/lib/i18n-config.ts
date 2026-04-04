export const localeCookieName = "signalnine-locale";
export const localeDisplayCookieName = "signalnine-locale-display";
export const locales = ["zh-CN", "zh-TW", "en"] as const;
export const displayLocales = ["zh-CN", "zh-TW", "en", "th", "vi", "hi"] as const;

export type Locale = (typeof locales)[number];
export type DisplayLocale = (typeof displayLocales)[number];

export const defaultLocale: Locale = "zh-CN";
export const defaultDisplayLocale: DisplayLocale = "zh-CN";

export function normalizeDisplayLocale(value?: string | null): DisplayLocale {
  if (!value) {
    return defaultDisplayLocale;
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

  if (normalized.includes("th")) {
    return "th";
  }

  if (normalized.includes("vi")) {
    return "vi";
  }

  if (normalized.includes("hi") || normalized.includes("india") || normalized.includes("hindi")) {
    return "hi";
  }

  if (normalized.includes("en")) {
    return "en";
  }

  return "zh-CN";
}

export function resolveRenderLocale(displayLocale: DisplayLocale): Locale {
  if (displayLocale === "th" || displayLocale === "vi" || displayLocale === "hi") {
    return "en";
  }

  return displayLocale;
}

export function normalizeLocale(value?: string | null): Locale {
  return resolveRenderLocale(normalizeDisplayLocale(value));
}

export function getIntlLocale(locale: Locale | DisplayLocale) {
  if (locale === "zh-TW") {
    return "zh-Hant-TW";
  }

  if (locale === "th") {
    return "th-TH";
  }

  if (locale === "vi") {
    return "vi-VN";
  }

  if (locale === "hi") {
    return "hi-IN";
  }

  if (locale === "en") {
    return "en-US";
  }

  return "zh-CN";
}
