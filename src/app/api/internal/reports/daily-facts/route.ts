import { NextRequest, NextResponse } from "next/server";
import { refreshAdminReportDailyFacts } from "@/lib/admin-reports";

function isAuthorized(request: NextRequest) {
  const token =
    process.env.REPORTS_TRIGGER_TOKEN?.trim() ||
    process.env.SYNC_TRIGGER_TOKEN?.trim() ||
    "";

  if (!token) {
    return false;
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const headerToken = request.headers.get("x-reports-token")?.trim();

  return bearer === token || headerToken === token;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unauthorized reports trigger.",
      },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const windowDays = Number.parseInt(url.searchParams.get("windowDays") ?? "30", 10);
  const scopeParam = url.searchParams.get("scope") ?? "all";
  const scope =
    scopeParam === "overview" ||
    scopeParam === "content-by-sport" ||
    scopeParam === "content-by-league" ||
    scopeParam === "content-by-author"
      ? scopeParam
      : "all";

  try {
    const summary = await refreshAdminReportDailyFacts(windowDays, scope);
    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin report daily fact sync failed.";
    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 },
    );
  }
}
