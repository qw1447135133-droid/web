import { NextRequest, NextResponse } from "next/server";
import {
  recordHomepageBannerMetric,
  type HomepageBannerMetricType,
  type HomepageBannerPlacement,
} from "@/lib/banner-analytics";

function isMetricType(value: string): value is HomepageBannerMetricType {
  return value === "impression" || value === "click";
}

function isPlacement(value: string): value is HomepageBannerPlacement {
  return value === "primary" || value === "secondary";
}

export async function POST(request: NextRequest) {
  let payload: { bannerId?: string; type?: string; placement?: string };

  try {
    payload = (await request.json()) as { bannerId?: string; type?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const bannerId = payload.bannerId?.trim();
  const type = payload.type?.trim();
  const placement = payload.placement?.trim();

  if (!bannerId || !type || !placement || !isMetricType(type) || !isPlacement(placement)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await recordHomepageBannerMetric(bannerId, type, placement);
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
