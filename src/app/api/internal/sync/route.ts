import { NextRequest, NextResponse } from "next/server";
import { runTrackedSportsSync } from "@/lib/sync/sports-sync";

function isAuthorized(request: NextRequest) {
  const token = process.env.SYNC_TRIGGER_TOKEN?.trim();

  if (!token) {
    return false;
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const headerToken = request.headers.get("x-sync-token")?.trim();

  return bearer === token || headerToken === token;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unauthorized sync trigger.",
      },
      { status: 401 },
    );
  }

  try {
    const summary = await runTrackedSportsSync();

    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Sync failed.",
      },
      { status: 500 },
    );
  }
}
