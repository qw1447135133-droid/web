import { NextRequest, NextResponse } from "next/server";
import {
  buildAdminOrdersCsv,
  getAdminOrdersExportRows,
  normalizeAdminOrderFilterStatus,
  normalizeAdminOrderFilterType,
} from "@/lib/admin-users";
import { getSessionContext } from "@/lib/session";

export async function GET(request: NextRequest) {
  const { entitlements } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return NextResponse.redirect(new URL("/login?next=%2Fadmin", request.url));
  }

  if (!entitlements.canAccessAdminConsole) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const orderStatus = normalizeAdminOrderFilterStatus(request.nextUrl.searchParams.get("status"));
  const orderType = normalizeAdminOrderFilterType(request.nextUrl.searchParams.get("type"));
  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "";
  const rows = await getAdminOrdersExportRows({
    query,
    orderStatus,
    orderType,
    from,
    to,
  });
  const csv = buildAdminOrdersCsv(rows);
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="admin-orders-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
