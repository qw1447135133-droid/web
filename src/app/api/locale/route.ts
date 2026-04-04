import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  localeCookieName,
  localeDisplayCookieName,
  normalizeDisplayLocale,
  resolveRenderLocale,
} from "@/lib/i18n-config";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { displayLocale?: string; locale?: string };
  const displayLocale = normalizeDisplayLocale(body.displayLocale ?? body.locale);
  const locale = resolveRenderLocale(displayLocale);
  const cookieStore = await cookies();

  cookieStore.set(localeCookieName, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  cookieStore.set(localeDisplayCookieName, displayLocale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true, locale, displayLocale });
}
