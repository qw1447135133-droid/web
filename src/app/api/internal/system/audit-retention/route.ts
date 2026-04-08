import { NextRequest, NextResponse } from "next/server";
import { pruneAdminAuditLogs } from "@/lib/admin-system";

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
        message: "Unauthorized audit retention trigger.",
      },
      { status: 401 },
    );
  }

  try {
    const url = new URL(request.url);
    const retentionDays = Number.parseInt(url.searchParams.get("retentionDays") || "", 10);
    const summary = await pruneAdminAuditLogs(Number.isFinite(retentionDays) ? retentionDays : undefined);

    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audit retention cleanup failed.";
    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 },
    );
  }
}
