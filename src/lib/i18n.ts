import { cache } from "react";
import { cookies, headers } from "next/headers";
import {
  localeCookieName,
  localeDisplayCookieName,
  normalizeDisplayLocale,
  normalizeLocale,
  resolveRenderLocale,
  type DisplayLocale,
  type Locale,
} from "@/lib/i18n-config";
export {
  defaultLocale,
  defaultDisplayLocale,
  displayLocales,
  getIntlLocale,
  localeCookieName,
  localeDisplayCookieName,
  locales,
  normalizeDisplayLocale,
  normalizeLocale,
  resolveRenderLocale,
  type DisplayLocale,
  type Locale,
} from "@/lib/i18n-config";

export const getCurrentLocale = cache(async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const displayLocale = cookieStore.get(localeDisplayCookieName)?.value;

  if (displayLocale) {
    return resolveRenderLocale(normalizeDisplayLocale(displayLocale));
  }

  const cookieLocale = cookieStore.get(localeCookieName)?.value;

  if (cookieLocale) {
    return normalizeLocale(cookieLocale);
  }

  const headerStore = await headers();
  return normalizeLocale(headerStore.get("accept-language"));
});

export const getCurrentDisplayLocale = cache(async (): Promise<DisplayLocale> => {
  const cookieStore = await cookies();
  const displayLocale = cookieStore.get(localeDisplayCookieName)?.value;

  if (displayLocale) {
    return normalizeDisplayLocale(displayLocale);
  }

  const cookieLocale = cookieStore.get(localeCookieName)?.value;

  if (cookieLocale) {
    return normalizeDisplayLocale(cookieLocale);
  }

  const headerStore = await headers();
  return normalizeDisplayLocale(headerStore.get("accept-language"));
});
