import { NextRequest, NextResponse } from "next/server";
import { getSiteAds } from "@/lib/content-data";
import { normalizeDisplayLocale, type DisplayLocale } from "@/lib/i18n-config";
import type { SiteAdPlacement } from "@/lib/types";

function normalizePlacement(value: string | null): SiteAdPlacement | undefined {
  if (
    value === "home-inline" ||
    value === "member-inline" ||
    value === "plans-inline" ||
    value === "database-inline" ||
    value === "match-detail-inline" ||
    value === "live-footer"
  ) {
    return value;
  }

  return undefined;
}

export async function GET(request: NextRequest) {
  const locale = normalizeDisplayLocale(request.nextUrl.searchParams.get("locale"));
  const placement = normalizePlacement(request.nextUrl.searchParams.get("placement"));
  const ads = await getSiteAds(locale as DisplayLocale, placement);

  return NextResponse.json({
    locale,
    placement: placement ?? null,
    ads,
  });
}
