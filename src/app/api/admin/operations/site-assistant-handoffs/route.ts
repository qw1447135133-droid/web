import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/session";
import { resolveAssistantHandoffRequest } from "@/lib/site-assistant-service";

function redirectToAdmin(request: NextRequest, suffix = "") {
  return NextResponse.redirect(new URL(`/admin?tab=overview${suffix}`, request.url));
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
    return redirectToAdmin(request, "&error=assistant-handoff");
  }

  return redirectToAdmin(request, "&saved=assistant-handoff");
}
