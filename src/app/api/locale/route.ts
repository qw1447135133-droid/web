import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { localeCookieName, normalizeLocale } from "@/lib/i18n-config";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { locale?: string };
  const locale = normalizeLocale(body.locale);
  const cookieStore = await cookies();

  cookieStore.set(localeCookieName, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true, locale });
}
