import { NextRequest, NextResponse } from "next/server";
import { getHomepageBanners } from "@/lib/content-data";
import { normalizeDisplayLocale, resolveRenderLocale } from "@/lib/i18n-config";

export async function GET(request: NextRequest) {
  const locale = normalizeDisplayLocale(request.nextUrl.searchParams.get("locale"));
  const renderLocale = resolveRenderLocale(locale);
  const banners = await getHomepageBanners(locale);

  return NextResponse.json({
    banners,
    locale,
    renderLocale,
  });
}
