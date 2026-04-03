import { NextRequest, NextResponse } from "next/server";
import {
  bootstrapSupportKnowledgeBase,
} from "@/lib/site-assistant-service";
import {
  moveSupportKnowledgeItem,
  saveSupportKnowledgeItem,
  toggleSupportKnowledgeItemStatus,
} from "@/lib/admin-operations";
import { getSessionContext } from "@/lib/session";

function redirectToAdmin(request: NextRequest, formData: FormData, suffix = "") {
  const url = new URL("/admin", request.url);
  url.searchParams.set("tab", "content");

  const contentSport = String(formData.get("contentSport") || "").trim();
  const contentAuthorId = String(formData.get("contentAuthorId") || "").trim();
  const contentPlanStatus = String(formData.get("contentPlanStatus") || "").trim();
  const contentQuery = String(formData.get("contentQuery") || "").trim();
  const knowledgeStatus = String(formData.get("knowledgeStatus") || "").trim();
  const knowledgeCategory = String(formData.get("knowledgeCategory") || "").trim();
  const knowledgeQuery = String(formData.get("knowledgeQuery") || "").trim();

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

  if (knowledgeStatus && knowledgeStatus !== "all") {
    url.searchParams.set("knowledgeStatus", knowledgeStatus);
  }

  if (knowledgeCategory) {
    url.searchParams.set("knowledgeCategory", knowledgeCategory);
  }

  if (knowledgeQuery) {
    url.searchParams.set("knowledgeQuery", knowledgeQuery);
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
  const id = String(formData.get("id") || "").trim();

  try {
    if (intent === "seed") {
      await bootstrapSupportKnowledgeBase();
      return redirectToAdmin(request, formData, "&saved=assistant-knowledge-seeded");
    }

    if (intent === "toggle-status") {
      await toggleSupportKnowledgeItemStatus(id);
    } else if (intent === "move-up") {
      await moveSupportKnowledgeItem(id, "up");
    } else if (intent === "move-down") {
      await moveSupportKnowledgeItem(id, "down");
    } else {
      const saved = await saveSupportKnowledgeItem(formData);
      return redirectToAdmin(request, formData, `&saved=assistant-knowledge&editKnowledge=${saved.id}`);
    }
  } catch {
    return redirectToAdmin(request, formData, "&error=assistant-knowledge");
  }

  return redirectToAdmin(request, formData, "&saved=assistant-knowledge");
}
