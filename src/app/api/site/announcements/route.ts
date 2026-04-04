import { NextRequest, NextResponse } from "next/server";
import { getSiteAnnouncements } from "@/lib/content-data";
import { normalizeDisplayLocale, resolveRenderLocale } from "@/lib/i18n-config";

export async function GET(request: NextRequest) {
  const locale = normalizeDisplayLocale(request.nextUrl.searchParams.get("locale"));
  const renderLocale = resolveRenderLocale(locale);
  const announcements = await getSiteAnnouncements(locale);

  return NextResponse.json({
    announcements,
    locale,
    renderLocale,
  });
}
