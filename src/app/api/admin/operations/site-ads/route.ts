import { NextRequest, NextResponse } from "next/server";
import {
  bootstrapMockSiteAds,
  moveSiteAd,
  saveSiteAd,
  toggleSiteAdStatus,
} from "@/lib/site-ads";
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
  const intent = String(formData.get("intent") || "save").trim();
  const id = String(formData.get("id") || "").trim();

  try {
    if (intent === "toggle-status") {
      await toggleSiteAdStatus(id);
    } else if (intent === "move-up") {
      await moveSiteAd(id, "up");
    } else if (intent === "move-down") {
      await moveSiteAd(id, "down");
    } else if (intent === "bootstrap") {
      await bootstrapMockSiteAds();
    } else {
      await saveSiteAd(formData);
    }
  } catch {
    return redirectToAdminContent(request, {
      formData,
      fallbackSection: "distribution",
      suffix: "&error=site-ad",
    });
  }

  return redirectToAdminContent(request, {
    formData,
    fallbackSection: "distribution",
    suffix: intent === "bootstrap" ? "&saved=site-ad-seeded" : "&saved=site-ad",
  });
}
