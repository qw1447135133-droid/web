import { NextRequest, NextResponse } from "next/server";
import { recordHomepageBannerMetric, type HomepageBannerMetricType } from "@/lib/banner-analytics";

function isMetricType(value: string): value is HomepageBannerMetricType {
  return value === "impression" || value === "click";
}

export async function POST(request: NextRequest) {
  let payload: { bannerId?: string; type?: string };

  try {
    payload = (await request.json()) as { bannerId?: string; type?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const bannerId = payload.bannerId?.trim();
  const type = payload.type?.trim();

  if (!bannerId || !type || !isMetricType(type)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await recordHomepageBannerMetric(bannerId, type);
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
