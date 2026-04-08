import { NextRequest, NextResponse } from "next/server";
import { normalizeDisplayLocale } from "@/lib/i18n-config";
import { getCurrentUserRecord } from "@/lib/session";
import { getUserNotifications } from "@/lib/user-notifications";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserRecord();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const category = request.nextUrl.searchParams.get("category")?.trim() || "all";
  const limit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "40", 10);
  const locale = normalizeDisplayLocale(request.nextUrl.searchParams.get("locale"));
  const payload = await getUserNotifications(user.id, locale, {
    category: category === "all" ? "all" : (category as "system" | "recharge" | "order" | "membership" | "support"),
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 40,
  });

  return NextResponse.json({
    ...payload,
    notifications: payload.items,
    category,
  });
}
