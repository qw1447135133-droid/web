import { NextRequest, NextResponse } from "next/server";
import { getAdminExportTaskDownload } from "@/lib/admin-export-tasks";
import { getSessionContext } from "@/lib/session";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { entitlements } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return NextResponse.redirect(new URL("/login?next=%2Fadmin%3Ftab%3Dreports", request.url));
  }

  if (!entitlements.canAccessAdminConsole || !entitlements.canViewReports) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  const { id } = await context.params;

  try {
    const { task, file } = await getAdminExportTaskDownload(id);

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": task.mimeType,
        "Content-Disposition": `attachment; filename="${task.filename ?? `${task.scope}.csv`}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ADMIN_EXPORT_TASK_NOT_READY";
    const status = message === "ADMIN_EXPORT_TASK_NOT_FOUND" ? 404 : 409;

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status },
    );
  }
}
