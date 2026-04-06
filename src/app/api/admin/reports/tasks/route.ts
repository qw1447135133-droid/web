import { NextRequest, NextResponse } from "next/server";
import { createAndRunAdminExportTask } from "@/lib/admin-export-tasks";
import { normalizeAdminReportExportScope } from "@/lib/admin-reports";
import { recordAdminAuditLog } from "@/lib/admin-system";
import { getCurrentUserRecord, getSessionContext } from "@/lib/session";

function redirectToReports(request: NextRequest, suffix = "") {
  return NextResponse.redirect(new URL(`/admin?tab=reports${suffix}`, request.url));
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
    return NextResponse.redirect(new URL("/login?next=%2Fadmin%3Ftab%3Dreports", request.url));
  }

  if (!entitlements.canAccessAdminConsole || !entitlements.canViewReports) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  const currentUser = await getCurrentUserRecord();
  const formData = await request.formData();
  const scope = normalizeAdminReportExportScope(String(formData.get("scope") || "orders"));
  const reportsWindow = Number.parseInt(String(formData.get("reportsWindow") || "30"), 10);
  const normalizedReportsWindow =
    reportsWindow === 7 || reportsWindow === 30 || reportsWindow === 90 || reportsWindow === 180 || reportsWindow === 365
      ? reportsWindow
      : 30;
  const from = String(formData.get("from") || "").trim();
  const to = String(formData.get("to") || "").trim();
  const orderType = String(formData.get("orderType") || "").trim();
  const dimension = String(formData.get("dimension") || "").trim();
  const filtersJson = JSON.stringify({
    reportsWindow: normalizedReportsWindow,
    from: from || undefined,
    to: to || undefined,
    orderType: orderType || undefined,
    dimension: dimension || undefined,
  });
  const ipAddress = getRequestIp(request);

  try {
    const task = await createAndRunAdminExportTask({
      scope,
      requestedByDisplayName: session.displayName,
      requestedByUserId: currentUser?.id,
      filtersJson,
    });

    await recordAdminAuditLog({
      actorUserId: currentUser?.id,
      actorDisplayName: session.displayName,
      actorRole: session.role,
      action: "create-admin-export-task",
      scope: "reports.export-task",
      targetType: "admin-export-task",
      targetId: task.id,
      detail: `scope: ${task.scope} | status: ${task.status} | rows: ${task.rowCount} | filters: ${filtersJson}`,
      ipAddress,
    });

    return redirectToReports(
      request,
      `&saved=report-export-task&reportTaskId=${task.id}&reportTaskStatus=${task.status}&reportScope=${task.scope}`,
    );
  } catch (error) {
    try {
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "create-admin-export-task",
        scope: "reports.export-task",
        targetType: "admin-export-task",
        targetId: scope,
        status: "failed",
        detail: error instanceof Error ? error.message : "ADMIN_EXPORT_TASK_FAILED",
        ipAddress,
      });
    } catch {
      // Ignore secondary audit errors.
    }

    return redirectToReports(request, `&error=report-export-task&reportScope=${scope}`);
  }
}
