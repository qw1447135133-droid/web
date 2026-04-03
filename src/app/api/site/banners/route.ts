import { NextRequest, NextResponse } from "next/server";
import { getHomepageBanners } from "@/lib/content-data";
import { normalizeLocale } from "@/lib/i18n-config";

export async function GET(request: NextRequest) {
  const locale = normalizeLocale(request.nextUrl.searchParams.get("locale"));
  const banners = await getHomepageBanners(locale);

  return NextResponse.json({
    banners,
    locale,
  });
}
