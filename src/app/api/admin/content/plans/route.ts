import { NextRequest, NextResponse } from "next/server";
import {
  archiveArticlePlan,
  saveArticlePlan,
  toggleArticlePlanHot,
  toggleArticlePlanStatus,
} from "@/lib/admin-content";
import { getSessionContext } from "@/lib/session";

function redirectToAdmin(request: NextRequest, formData: FormData, suffix = "") {
  const url = new URL("/admin", request.url);
  url.searchParams.set("tab", "content");

  const contentSport = String(formData.get("contentSport") || "").trim();
  const contentAuthorId = String(formData.get("contentAuthorId") || "").trim();
  const contentPlanStatus = String(formData.get("contentPlanStatus") || "").trim();
  const contentQuery = String(formData.get("contentQuery") || "").trim();

  if (contentSport && contentSport !== "all") {
    url.searchParams.set("contentSport", contentSport);
  }

  if (contentAuthorId) {
    url.searchParams.set("contentAuthorId", contentAuthorId);
  }

  if (contentPlanStatus && contentPlanStatus !== "all") {
    url.searchParams.set("contentPlanStatus", contentPlanStatus);
  }

  if (contentQuery) {
    url.searchParams.set("contentQuery", contentQuery);
  }

  if (suffix.startsWith("&")) {
    const extra = new URLSearchParams(suffix.slice(1));
    for (const [key, value] of extra.entries()) {
      url.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(url);
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
    return redirectToAdmin(request, formData, "&error=plan");
  }

  return redirectToAdmin(request, formData, "&saved=plan");
}
