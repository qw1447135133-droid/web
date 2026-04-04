import { NextRequest, NextResponse } from "next/server";
import { ensureDefaultCoinPackages } from "@/lib/admin-finance";
import { getSessionContext } from "@/lib/session";

function redirectToAdmin(request: NextRequest, suffix = "") {
  return NextResponse.redirect(new URL(`/admin?tab=finance${suffix}`, request.url));
}

export async function POST(request: NextRequest) {
  const { entitlements } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return NextResponse.redirect(new URL("/login?next=%2Fadmin%3Ftab%3Dfinance", request.url));
  }

  if (!entitlements.canAccessAdminConsole) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  try {
    await ensureDefaultCoinPackages();
  } catch {
    return redirectToAdmin(request, "&error=coin-package");
  }

  return redirectToAdmin(request, "&saved=coin-package-seeded");
}
