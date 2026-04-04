import { NextRequest, NextResponse } from "next/server";
import { buildAdminReportExport, normalizeAdminReportExportScope } from "@/lib/admin-reports";
import { getSessionContext } from "@/lib/session";

export async function GET(request: NextRequest) {
  const { entitlements } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return NextResponse.redirect(new URL("/login?next=%2Fadmin", request.url));
  }

  if (!entitlements.canAccessAdminConsole) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  const scope = normalizeAdminReportExportScope(request.nextUrl.searchParams.get("scope"));
  const { filename, csv } = await buildAdminReportExport(scope);
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
