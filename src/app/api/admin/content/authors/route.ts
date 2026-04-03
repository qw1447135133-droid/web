import { NextRequest, NextResponse } from "next/server";
import { saveAuthorTeam, toggleAuthorTeamStatus } from "@/lib/admin-content";
import { getSessionContext } from "@/lib/session";

function redirectToAdmin(request: NextRequest, suffix = "") {
  return NextResponse.redirect(new URL(`/admin?tab=content${suffix}`, request.url));
}

export async function POST(request: NextRequest) {
  const { entitlements } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return NextResponse.redirect(new URL("/login?next=%2Fadmin", request.url));
  }

  if (!entitlements.canManageContent) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "save");

  try {
    if (intent === "toggle-status") {
      await toggleAuthorTeamStatus(String(formData.get("id") || ""));
    } else {
      await saveAuthorTeam(formData);
    }
  } catch {
    return redirectToAdmin(request, "&error=author");
  }

  return redirectToAdmin(request, "&saved=author");
}
