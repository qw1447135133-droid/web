import { NextRequest, NextResponse } from "next/server";
import { runSystemAlertAutomationScan } from "@/lib/admin-system";

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
        message: "Unauthorized system alert trigger.",
      },
      { status: 401 },
    );
  }

  try {
    const summary = await runSystemAlertAutomationScan();

    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "System alert scan failed.";
    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 },
    );
  }
}
