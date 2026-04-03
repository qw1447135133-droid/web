import { NextRequest, NextResponse } from "next/server";
import {
  moveSiteAnnouncement,
  saveSiteAnnouncement,
  toggleSiteAnnouncementStatus,
} from "@/lib/admin-operations";
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
  const id = String(formData.get("id") || "");

  try {
    if (intent === "toggle-status") {
      await toggleSiteAnnouncementStatus(id);
    } else if (intent === "move-up") {
      await moveSiteAnnouncement(id, "up");
    } else if (intent === "move-down") {
      await moveSiteAnnouncement(id, "down");
    } else {
      await saveSiteAnnouncement(formData);
    }
  } catch {
    return redirectToAdmin(request, "&error=announcement");
  }

  return redirectToAdmin(request, "&saved=announcement");
}
