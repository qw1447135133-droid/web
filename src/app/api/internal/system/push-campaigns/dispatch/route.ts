import { NextRequest, NextResponse } from "next/server";
import { dispatchScheduledPushCampaigns } from "@/lib/push-notifications";

function isAuthorized(request: NextRequest) {
  const token =
    process.env.SYSTEM_TRIGGER_TOKEN?.trim() ||
    process.env.SYNC_TRIGGER_TOKEN?.trim() ||
    "";

  if (!token) {
    return false;
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const headerToken = request.headers.get("x-system-token")?.trim();

  return bearer === token || headerToken === token;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unauthorized push campaign dispatch trigger.",
      },
      { status: 401 },
    );
  }

  try {
    const url = new URL(request.url);
    const limit = Number.parseInt(url.searchParams.get("limit") || "", 10);
    const summary = await dispatchScheduledPushCampaigns(Number.isFinite(limit) ? limit : 20);

    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scheduled push campaign dispatch failed.";
    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 },
    );
  }
}
