import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/session";
import { runTrackedSportsSync } from "@/lib/sync/sports-sync";

function redirectToEvents(request: NextRequest, suffix = "") {
  return NextResponse.redirect(new URL(`/admin?tab=events${suffix}`, request.url));
}

export async function POST(request: NextRequest) {
  const { entitlements } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return NextResponse.redirect(new URL("/login?next=%2Fadmin%3Ftab%3Devents", request.url));
  }

  if (!entitlements.canAccessAdminConsole) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  try {
    await runTrackedSportsSync();
    return redirectToEvents(request, "&saved=sync");
  } catch (error) {
    const message = error instanceof Error ? error.message : "SYNC_FAILED";
    return redirectToEvents(request, message === "SYNC_ALREADY_RUNNING" ? "&error=sync-running" : "&error=sync");
  }
}
