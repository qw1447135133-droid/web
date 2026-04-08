import { NextRequest, NextResponse } from "next/server";
import {
  pruneAdminAuditLogs,
  recordAdminAuditLog,
  resolveSystemAlertEvent,
  saveAdminRolePolicy,
  saveSystemAlertChannel,
  saveSystemAlertEvent,
  saveSystemParameter,
} from "@/lib/admin-system";
import {
  cancelPushCampaign,
  dispatchScheduledPushCampaigns,
  savePushCampaign,
  sendPushCampaign,
} from "@/lib/push-notifications";
import { getCurrentUserRecord, getSessionContext } from "@/lib/session";

function redirectToSystem(request: NextRequest, suffix = "") {
  return NextResponse.redirect(new URL(`/admin?tab=system${suffix}`, request.url));
}

function redirectWithSaved(request: NextRequest, saved: string, extra?: Record<string, string | number | undefined>) {
  const params = new URLSearchParams({ tab: "system", saved });

  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value === undefined || value === "") {
      continue;
    }

    params.set(key, String(value));
  }

  return NextResponse.redirect(new URL(`/admin?${params.toString()}`, request.url));
}

function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }

  return request.headers.get("x-real-ip") ?? undefined;
}

export async function POST(request: NextRequest) {
  const { entitlements, session } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return NextResponse.redirect(new URL("/login?next=%2Fadmin%3Ftab%3Dsystem", request.url));
  }

  if (!entitlements.canAccessAdminConsole || !entitlements.canManageSystem) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  const currentUser = await getCurrentUserRecord();
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const ipAddress = getRequestIp(request);

  try {
    if (intent === "save-role-policy") {
      await saveAdminRolePolicy(formData);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "save-role-policy",
        scope: "system.role-policy",
        targetType: "role",
        targetId: String(formData.get("role") || "").trim(),
        detail: parseDetail(formData, ["role", "description"]),
        ipAddress,
      });
    } else if (intent === "save-parameter") {
      await saveSystemParameter(formData);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "save-parameter",
        scope: "system.parameter",
        targetType: "parameter",
        targetId: String(formData.get("key") || "").trim(),
        detail: parseDetail(formData, ["key", "category"]),
        ipAddress,
      });
    } else if (intent === "save-alert-channel") {
      await saveSystemAlertChannel(formData);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "save-alert-channel",
        scope: "system.alert-channel",
        targetType: "alert-channel",
        targetId: String(formData.get("name") || "").trim(),
        detail: parseDetail(formData, ["name", "provider", "target"]),
        ipAddress,
      });
    } else if (intent === "save-alert-event") {
      await saveSystemAlertEvent(formData);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "save-alert-event",
        scope: "system.alert-event",
        targetType: "alert-event",
        targetId: String(formData.get("title") || "").trim(),
        detail: parseDetail(formData, ["source", "title", "severity"]),
        ipAddress,
      });
    } else if (intent === "resolve-alert-event") {
      const id = String(formData.get("id") || "").trim();
      await resolveSystemAlertEvent(id);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "resolve-alert-event",
        scope: "system.alert-event",
        targetType: "alert-event",
        targetId: id,
        ipAddress,
      });
    } else if (intent === "save-push-campaign") {
      await savePushCampaign(formData, {
        userId: currentUser?.id,
        displayName: session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "save-push-campaign",
        scope: "system.push-campaign",
        targetType: "push-campaign",
        targetId: String(formData.get("id") || formData.get("key") || formData.get("title") || "").trim() || "new",
        detail: parseDetail(formData, ["title", "audience", "locale", "status"]),
        ipAddress,
      });
      return redirectWithSaved(request, "push-campaign");
    } else if (intent === "send-push-campaign") {
      const id = String(formData.get("id") || "").trim();
      await sendPushCampaign(id);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "send-push-campaign",
        scope: "system.push-campaign",
        targetType: "push-campaign",
        targetId: id,
        ipAddress,
      });
      return redirectWithSaved(request, "push-campaign-sent");
    } else if (intent === "cancel-push-campaign") {
      const id = String(formData.get("id") || "").trim();
      await cancelPushCampaign(id);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "cancel-push-campaign",
        scope: "system.push-campaign",
        targetType: "push-campaign",
        targetId: id,
        ipAddress,
      });
      return redirectWithSaved(request, "push-campaign-cancelled");
    } else if (intent === "dispatch-scheduled-push-campaigns") {
      const limit = Number.parseInt(String(formData.get("limit") || "").trim(), 10);
      const summary = await dispatchScheduledPushCampaigns(Number.isFinite(limit) ? limit : 20);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "dispatch-scheduled-push-campaigns",
        scope: "system.push-campaign",
        targetType: "push-campaign-batch",
        targetId: `${summary.dispatchedCount}/${summary.scannedCount}`,
        detail: `dispatched=${summary.dispatchedCount} failed=${summary.failedCount}`,
        ipAddress,
      });
      return redirectWithSaved(request, "push-campaign-dispatched", {
        pushCampaignDispatched: summary.dispatchedCount,
        pushCampaignFailed: summary.failedCount,
      });
    } else if (intent === "prune-audit-logs") {
      const retentionDays = Number.parseInt(String(formData.get("retentionDays") || "").trim(), 10);
      const summary = await pruneAdminAuditLogs(Number.isFinite(retentionDays) ? retentionDays : undefined);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "prune-audit-logs",
        scope: "system.audit-retention",
        targetType: "admin-audit-log",
        targetId: `${summary.deletedCount}`,
        detail: `retentionDays: ${summary.retentionDays} | cutoff: ${summary.cutoff}`,
        ipAddress,
      });
      return redirectWithSaved(request, "audit-pruned", {
        auditDeletedCount: summary.deletedCount,
        auditRetentionDays: summary.retentionDays,
      });
    } else {
      return redirectToSystem(request, "&error=system");
    }
  } catch (error) {
    try {
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: intent || "unknown-system-action",
        scope: "system",
        targetType: "system-action",
        targetId: String(formData.get("id") || formData.get("key") || formData.get("title") || "").trim() || "unknown",
        status: "failed",
        detail: error instanceof Error ? error.message : "unknown system error",
        ipAddress,
      });
    } catch {
      // Ignore audit write failures to preserve redirect behaviour.
    }

    return redirectToSystem(request, "&error=system");
  }

  return redirectToSystem(request, "&saved=system");
}

function parseDetail(formData: FormData, keys: string[]) {
  return keys
    .map((key) => {
      const value = String(formData.get(key) || "").trim();
      return value ? `${key}: ${value}` : "";
    })
    .filter(Boolean)
    .join(" | ");
}
