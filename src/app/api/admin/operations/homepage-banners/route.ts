import { NextRequest, NextResponse } from "next/server";
import {
  duplicateHomepageBanner,
  moveHomepageBanner,
  saveHomepageBanner,
  toggleHomepageBannerStatus,
} from "@/lib/admin-operations";
import { redirectToAdminContent } from "@/lib/admin-content-redirect";
import { getSessionContext } from "@/lib/session";

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
      await toggleHomepageBannerStatus(id);
    } else if (intent === "move-up") {
      await moveHomepageBanner(id, "up");
    } else if (intent === "move-down") {
      await moveHomepageBanner(id, "down");
    } else if (intent === "duplicate") {
      const duplicated = await duplicateHomepageBanner(id);
      return redirectToAdminContent(request, {
        formData,
        fallbackSection: "homepage",
        suffix: `&saved=banner&editBanner=${duplicated.id}`,
      });
    } else {
      await saveHomepageBanner(formData);
    }
  } catch {
    return redirectToAdminContent(request, { formData, fallbackSection: "homepage", suffix: "&error=banner" });
  }

  return redirectToAdminContent(request, { formData, fallbackSection: "homepage", suffix: "&saved=banner" });
}
