import { NextRequest, NextResponse } from "next/server";
import {
  reviewAgentApplication,
  saveAgentApplication,
  saveAgentCampaign,
  saveAgentProfile,
  saveAgentWithdrawal,
  saveRecruitmentLead,
  toggleAgentProfileStatus,
} from "@/lib/admin-agents";
import { getSessionContext } from "@/lib/session";

function redirectToAdmin(request: NextRequest, suffix = "") {
  return NextResponse.redirect(new URL(`/admin?tab=agents${suffix}`, request.url));
}

export async function POST(request: NextRequest) {
  const { entitlements } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return NextResponse.redirect(new URL("/login?next=%2Fadmin%3Ftab%3Dagents", request.url));
  }

  if (!entitlements.canAccessAdminConsole) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "save-application").trim();

  try {
    if (intent === "save-application") {
      await saveAgentApplication(formData);
    } else if (intent === "review-application") {
      await reviewAgentApplication(formData);
    } else if (intent === "save-agent") {
      await saveAgentProfile(formData);
    } else if (intent === "toggle-agent-status") {
      await toggleAgentProfileStatus(String(formData.get("id") || ""));
    } else if (intent === "save-campaign") {
      await saveAgentCampaign(formData);
    } else if (intent === "save-lead") {
      await saveRecruitmentLead(formData);
    } else if (intent === "save-withdrawal") {
      await saveAgentWithdrawal(formData);
    } else {
      return redirectToAdmin(request, "&error=agents");
    }
  } catch {
    return redirectToAdmin(request, "&error=agents");
  }

  return redirectToAdmin(request, "&saved=agents");
}
