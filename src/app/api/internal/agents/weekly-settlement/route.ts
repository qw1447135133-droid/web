import { NextRequest, NextResponse } from "next/server";
import { runWeeklyAgentSettlement } from "@/lib/admin-agents";

function isAuthorized(request: NextRequest) {
  const token =
    process.env.AGENTS_TRIGGER_TOKEN?.trim() ||
    process.env.SYNC_TRIGGER_TOKEN?.trim() ||
    "";

  if (!token) {
    return false;
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const headerToken = request.headers.get("x-agents-token")?.trim();

  return bearer === token || headerToken === token;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unauthorized weekly settlement trigger.",
      },
      { status: 401 },
    );
  }

  try {
    const summary = await runWeeklyAgentSettlement();
    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Weekly settlement failed.";
    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 },
    );
  }
}
