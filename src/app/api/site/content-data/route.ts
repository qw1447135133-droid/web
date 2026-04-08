import { NextRequest, NextResponse } from "next/server";
import { getSiteContentPayload, type SiteContentIncludeKey } from "@/lib/content-data";
import { normalizeDisplayLocale, resolveRenderLocale } from "@/lib/i18n-config";
import type { Sport } from "@/lib/types";

const allIncludeKeys: SiteContentIncludeKey[] = [
  "banners",
  "announcements",
  "ads",
  "homepageModules",
  "authors",
  "articlePlans",
  "predictions",
];

function normalizeInclude(searchValue: string | null) {
  if (!searchValue?.trim()) {
    return allIncludeKeys;
  }

  const include = searchValue
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is SiteContentIncludeKey => allIncludeKeys.includes(item as SiteContentIncludeKey));

  return include.length > 0 ? include : allIncludeKeys;
}

function normalizeSport(value: string | null): Sport | undefined {
  if (value === "football" || value === "basketball" || value === "cricket" || value === "esports") {
    return value;
  }

  return undefined;
}

export async function GET(request: NextRequest) {
  const locale = normalizeDisplayLocale(request.nextUrl.searchParams.get("locale"));
  const renderLocale = resolveRenderLocale(locale);
  const include = normalizeInclude(request.nextUrl.searchParams.get("include"));
  const sport = normalizeSport(request.nextUrl.searchParams.get("sport"));
  const data = await getSiteContentPayload(locale, {
    include,
    sport,
  });

  return NextResponse.json({
    locale,
    renderLocale,
    include,
    sport: sport ?? null,
    data,
  });
}
