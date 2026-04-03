import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/session";
import { runTrackedSportsSync } from "@/lib/sync/sports-sync";

async function authorizeAdminRequest() {
  const { entitlements } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return { ok: false as const, status: 401, message: "Please sign in before triggering sync." };
  }

  if (!entitlements.canAccessAdminConsole) {
    return { ok: false as const, status: 403, message: "Admin access required." };
  }

  return { ok: true as const };
}

async function runSync() {
  const auth = await authorizeAdminRequest();

  if (!auth.ok) {
    return auth;
  }

  try {
    const summary = await runTrackedSportsSync();

    return { ok: true as const, summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed.";
    return {
      ok: false as const,
      status: message === "SYNC_ALREADY_RUNNING" || message === "SYNC_COOLDOWN_ACTIVE" ? 409 : 500,
      message,
    };
  }
}

export async function GET() {
  const result = await runSync();

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: result.message,
      },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    ...result.summary,
  });
}

export async function POST(request: NextRequest) {
  const result = await runSync();
  const url = new URL("/admin?tab=events", request.url);

  if (!result.ok) {
    url.searchParams.set("error", result.message === "SYNC_ALREADY_RUNNING" || result.message === "SYNC_COOLDOWN_ACTIVE" ? "sync-running" : "sync");
    return NextResponse.redirect(url);
  }

  url.searchParams.set("saved", "sync");
  return NextResponse.redirect(url);
}
