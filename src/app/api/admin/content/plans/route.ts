import { NextRequest, NextResponse } from "next/server";
import {
  archiveArticlePlan,
  saveArticlePlan,
  toggleArticlePlanHot,
  toggleArticlePlanStatus,
} from "@/lib/admin-content";
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
  const planId = String(formData.get("id") || "");

  try {
    if (intent === "toggle-status") {
      await toggleArticlePlanStatus(planId);
    } else if (intent === "toggle-hot") {
      await toggleArticlePlanHot(planId);
    } else if (intent === "archive") {
      await archiveArticlePlan(planId);
    } else {
      await saveArticlePlan(formData);
    }
  } catch {
    return redirectToAdmin(request, "&error=plan");
  }

  return redirectToAdmin(request, "&saved=plan");
}
