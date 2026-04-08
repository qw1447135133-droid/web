import { NextRequest, NextResponse } from "next/server";
import { bootstrapMockContent } from "@/lib/admin-content";
import { redirectToAdminContent } from "@/lib/admin-content-redirect";
import {
  bootstrapHomepageFeaturedMatchSlots,
  bootstrapMockHomepageBanners,
  bootstrapMockHomepageModules,
  bootstrapMockSiteAnnouncements,
} from "@/lib/admin-operations";
import { bootstrapMockSiteAds } from "@/lib/site-ads";
import { bootstrapSupportKnowledgeBase } from "@/lib/site-assistant-service";
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

  try {
    await bootstrapMockContent();
    await bootstrapMockHomepageBanners();
    await bootstrapMockHomepageModules();
    await bootstrapHomepageFeaturedMatchSlots();
    await bootstrapMockSiteAnnouncements();
    await bootstrapMockSiteAds();
    await bootstrapSupportKnowledgeBase();
  } catch {
    return redirectToAdminContent(request, {
      formData,
      fallbackSection: "overview",
      suffix: "&error=bootstrap",
    });
  }

  return redirectToAdminContent(request, {
    formData,
    fallbackSection: "overview",
    suffix: "&seeded=content",
  });
}
