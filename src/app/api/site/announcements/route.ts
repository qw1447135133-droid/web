import { NextRequest, NextResponse } from "next/server";
import { getSiteAnnouncements } from "@/lib/content-data";
import { normalizeLocale } from "@/lib/i18n-config";

export async function GET(request: NextRequest) {
  const locale = normalizeLocale(request.nextUrl.searchParams.get("locale"));
  const announcements = await getSiteAnnouncements(locale);

  return NextResponse.json({
    announcements,
    locale,
  });
}
