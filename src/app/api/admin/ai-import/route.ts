import { NextRequest, NextResponse } from "next/server";
import { deletePredictionRecord, savePredictionRecord } from "@/lib/admin-content";
import { getSessionContext } from "@/lib/session";

function redirectToAdmin(request: NextRequest, formData: FormData, suffix = "") {
  const url = new URL("/admin", request.url);
  url.searchParams.set("tab", "ai");

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

  try {
    if (intent === "delete") {
      await deletePredictionRecord(String(formData.get("id") || ""));
      return redirectToAdmin(request, formData, "&saved=prediction-deleted");
    }

    await savePredictionRecord(formData);
  } catch {
    return redirectToAdmin(request, formData, "&error=prediction");
  }

  return redirectToAdmin(request, formData, "&saved=prediction");
}
