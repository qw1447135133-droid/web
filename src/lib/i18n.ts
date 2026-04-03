import { cache } from "react";
import { cookies, headers } from "next/headers";
import { localeCookieName, normalizeLocale, type Locale } from "@/lib/i18n-config";
export {
  defaultLocale,
  getIntlLocale,
  localeCookieName,
  locales,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n-config";

export const getCurrentLocale = cache(async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;

  if (cookieLocale) {
    return normalizeLocale(cookieLocale);
  }

  const headerStore = await headers();
  return normalizeLocale(headerStore.get("accept-language"));
});
