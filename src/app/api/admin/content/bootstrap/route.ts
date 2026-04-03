import { NextRequest, NextResponse } from "next/server";
import { bootstrapMockContent } from "@/lib/admin-content";
import {
  bootstrapHomepageFeaturedMatchSlots,
  bootstrapMockHomepageBanners,
  bootstrapMockHomepageModules,
  bootstrapMockSiteAnnouncements,
} from "@/lib/admin-operations";
import { bootstrapSupportKnowledgeBase } from "@/lib/site-assistant-service";
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

  try {
    await bootstrapMockContent();
    await bootstrapMockHomepageBanners();
    await bootstrapMockHomepageModules();
    await bootstrapHomepageFeaturedMatchSlots();
    await bootstrapMockSiteAnnouncements();
    await bootstrapSupportKnowledgeBase();
  } catch {
    return redirectToAdmin(request, "&error=bootstrap");
  }

  return redirectToAdmin(request, "&seeded=content");
}
