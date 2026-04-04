import { NextRequest, NextResponse } from "next/server";
import { scanFinanceReconciliationIssues } from "@/lib/admin-finance";

function isAuthorized(request: NextRequest) {
  const token =
    process.env.FINANCE_TRIGGER_TOKEN?.trim() ||
    process.env.SYNC_TRIGGER_TOKEN?.trim() ||
    "";

  if (!token) {
    return false;
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const headerToken = request.headers.get("x-finance-token")?.trim();

  return bearer === token || headerToken === token;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unauthorized finance trigger.",
      },
      { status: 401 },
    );
  }

  try {
    const summary = await scanFinanceReconciliationIssues({
      createdByDisplayName: "System",
    });

    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Finance reconciliation scan failed.";
    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 },
    );
  }
}
