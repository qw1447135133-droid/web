import { NextRequest, NextResponse } from "next/server";
import { recordSiteAdMetric, type SiteAdMetricType } from "@/lib/site-ads";

function isMetricType(value: string): value is SiteAdMetricType {
  return value === "impression" || value === "click";
}

export async function POST(request: NextRequest) {
  let payload: { adId?: string; type?: string };

  try {
    payload = (await request.json()) as { adId?: string; type?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const adId = payload.adId?.trim();
  const type = payload.type?.trim();

  if (!adId || !type || !isMetricType(type)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await recordSiteAdMetric(adId, type);
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
