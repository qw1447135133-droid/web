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
  url.searchParams.set("tab", "ai");

  const aiSport = String(formData.get("aiSport") || "").trim();
  const aiAuthorId = String(formData.get("aiAuthorId") || "").trim();
  const aiResult = String(formData.get("aiResult") || "").trim();
  const aiScope = String(formData.get("aiScope") || "").trim();
  const aiPage = String(formData.get("aiPage") || "").trim();

  if (aiSport && aiSport !== "all") {
    url.searchParams.set("aiSport", aiSport);
  }

  if (aiAuthorId) {
    url.searchParams.set("aiAuthorId", aiAuthorId);
  }

  if (aiResult && aiResult !== "all") {
    url.searchParams.set("aiResult", aiResult);
  }

  if (aiScope && aiScope !== "recent") {
    url.searchParams.set("aiScope", aiScope);
  }

  if (aiPage && aiPage !== "1") {
    url.searchParams.set("aiPage", aiPage);
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
