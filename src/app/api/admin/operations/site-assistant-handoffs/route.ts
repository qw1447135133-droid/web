import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/session";
import { resolveAssistantHandoffRequest } from "@/lib/site-assistant-service";

function redirectToAdmin(request: NextRequest, formData: FormData, suffix = "") {
  const url = new URL("/admin", request.url);
  const tab = String(formData.get("tab") || "overview").trim() || "overview";
  url.searchParams.set("tab", tab);

  if (tab === "ai") {
    const aiSport = String(formData.get("aiSport") || "").trim();
    const aiAuthorId = String(formData.get("aiAuthorId") || "").trim();
    const aiResult = String(formData.get("aiResult") || "").trim();
    const aiScope = String(formData.get("aiScope") || "").trim();
    const aiPage = String(formData.get("aiPage") || "").trim();
    const handoffStatus = String(formData.get("handoffStatus") || "").trim();

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

    if (handoffStatus && handoffStatus !== "all") {
      url.searchParams.set("handoffStatus", handoffStatus);
    }
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
  const intent = String(formData.get("intent") || "resolve");
  const id = String(formData.get("id") || "");

  try {
    if (intent === "resolve") {
      await resolveAssistantHandoffRequest(id);
    }
  } catch {
    return redirectToAdmin(request, formData, "&error=assistant-handoff");
  }

  return redirectToAdmin(request, formData, "&saved=assistant-handoff");
}
