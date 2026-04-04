import { NextRequest, NextResponse } from "next/server";
import {
  batchUpdateAgentWithdrawals,
  reviewAgentApplication,
  saveAgentApplication,
  saveAgentCampaign,
  saveAgentProfile,
  saveAgentWithdrawal,
  saveRecruitmentLead,
  toggleAgentProfileStatus,
} from "@/lib/admin-agents";
import { recordAdminAuditLog } from "@/lib/admin-system";
import { getCurrentUserRecord, getSessionContext } from "@/lib/session";

function redirectToAdmin(request: NextRequest, suffix = "") {
  return NextResponse.redirect(new URL(`/admin?tab=agents${suffix}`, request.url));
}

function redirectWithBatchResult(
  request: NextRequest,
  processedCount: number,
  skippedCount: number,
  failedCount: number,
  totalCount: number,
) {
  return redirectToAdmin(
    request,
    `&saved=agents-withdrawal-batch&agentProcessed=${processedCount}&agentSkipped=${skippedCount}&agentFailed=${failedCount}&agentTotal=${totalCount}`,
  );
}

function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }

  return request.headers.get("x-real-ip") ?? undefined;
}

function parseBatchRefs(formData: FormData) {
  return [
    ...formData.getAll("withdrawalIds").map((value) => String(value || "").trim()).filter(Boolean),
    ...String(formData.get("batchRefs") || "")
      .split(/[\r\n,]+/)
      .map((value) => value.trim())
      .filter(Boolean),
  ];
}

function summarizeBatchRefs(refs: string[]) {
  if (refs.length === 0) {
    return "none";
  }

  if (refs.length <= 6) {
    return refs.join(", ");
  }

  return `${refs.slice(0, 6).join(", ")} ... (+${refs.length - 6})`;
}

export async function POST(request: NextRequest) {
  const { entitlements, session } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return NextResponse.redirect(new URL("/login?next=%2Fadmin%3Ftab%3Dagents", request.url));
  }

  if (!entitlements.canAccessAdminConsole || !entitlements.canManageAgents) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  const currentUser = await getCurrentUserRecord();
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "save-application").trim();
  const ipAddress = getRequestIp(request);

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
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "save-agent-withdrawal",
        scope: "agents.withdrawal",
        targetType: "agent-withdrawal",
        targetId: String(formData.get("id") || formData.get("agentId") || "").trim() || "new",
        detail: `status: ${String(formData.get("status") || "pending").trim()} | payoutReference: ${String(formData.get("payoutReference") || "").trim() || "--"}`,
        ipAddress,
      });
    } else if (intent === "batch-save-withdrawal") {
      const result = await batchUpdateAgentWithdrawals(formData);
      const batchRefs = parseBatchRefs(formData);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "batch-save-agent-withdrawal",
        scope: "agents.withdrawal.batch",
        targetType: "batch-agent-withdrawal",
        targetId: summarizeBatchRefs(batchRefs),
        detail: `status: ${String(formData.get("status") || "pending").trim()} | processedCount: ${result.processedCount} | skippedCount: ${result.skippedCount} | failedCount: ${result.failedCount} | payoutReference: ${String(formData.get("payoutReference") || "").trim() || "--"}`,
        ipAddress,
      });
      return redirectWithBatchResult(
        request,
        result.processedCount,
        result.skippedCount,
        result.failedCount,
        result.totalCount,
      );
    } else {
      return redirectToAdmin(request, "&error=agents");
    }
  } catch (error) {
    try {
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: intent || "unknown-agent-action",
        scope: intent === "batch-save-withdrawal" ? "agents.withdrawal.batch" : "agents",
        targetType: intent === "batch-save-withdrawal" ? "batch-agent-withdrawal" : "agent-action",
        targetId:
          String(formData.get("id") || formData.get("agentId") || "").trim() ||
          summarizeBatchRefs(parseBatchRefs(formData)) ||
          "unknown-target",
        status: "failed",
        detail: error instanceof Error ? error.message : "unknown agent error",
        ipAddress,
      });
    } catch {
      // Ignore audit write failures so the redirect still completes.
    }

    if (error instanceof Error) {
      if (error.message === "AGENT_WITHDRAWAL_INSUFFICIENT_COMMISSION") {
        return redirectToAdmin(request, "&error=agents-withdrawal-balance");
      }

      if (error.message === "AGENT_WITHDRAWAL_LOCKED") {
        return redirectToAdmin(request, "&error=agents-withdrawal-locked");
      }
    }

    return redirectToAdmin(request, intent === "batch-save-withdrawal" ? "&error=agents-withdrawal-batch" : "&error=agents");
  }

  return redirectToAdmin(request, "&saved=agents");
}
