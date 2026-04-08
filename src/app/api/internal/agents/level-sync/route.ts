import { NextRequest, NextResponse } from "next/server";
import { runAgentLevelAutomation, syncAgentCommissionPolicies } from "@/lib/admin-agents";

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
        message: "Unauthorized agent level sync trigger.",
      },
      { status: 401 },
    );
  }

  try {
    const url = new URL(request.url);
    const applyPolicies = (url.searchParams.get("applyPolicies") || "true").toLowerCase() !== "false";
    const [policySummary, levelSummary] = await Promise.all([
      applyPolicies ? syncAgentCommissionPolicies() : Promise.resolve(null),
      runAgentLevelAutomation(),
    ]);

    return NextResponse.json({
      ok: true,
      summary: {
        policySummary,
        levelSummary,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent level sync failed.";
    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 },
    );
  }
}
