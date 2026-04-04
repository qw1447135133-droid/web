import { NextRequest, NextResponse } from "next/server";
import {
  recordAdminAuditLog,
  resolveSystemAlertEvent,
  saveAdminRolePolicy,
  saveSystemAlertChannel,
  saveSystemAlertEvent,
  saveSystemParameter,
} from "@/lib/admin-system";
import { getCurrentUserRecord, getSessionContext } from "@/lib/session";

function redirectToSystem(request: NextRequest, suffix = "") {
  return NextResponse.redirect(new URL(`/admin?tab=system${suffix}`, request.url));
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
    } else {
      return redirectToSystem(request, "&error=system");
    }
  } catch {
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
