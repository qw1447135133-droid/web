import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserRecord } from "@/lib/session";
import { markUserNotificationsRead } from "@/lib/user-notifications";

export async function POST(request: NextRequest) {
  const user = await getCurrentUserRecord();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { ids?: string[]; markAll?: boolean };
    const payload = await markUserNotificationsRead(user.id, {
      ids: body.ids,
      markAll: body.markAll,
    });
    return NextResponse.json(payload);
  }

  const formData = await request.formData();
  const returnTo = String(formData.get("returnTo") || "/account/notifications");
  const ids = formData
    .getAll("notificationId")
    .map((item) => String(item).trim())
    .filter(Boolean);
  const markAll = String(formData.get("markAll") || "").trim() === "1";

  await markUserNotificationsRead(user.id, {
    ids,
    markAll,
  });

  return NextResponse.redirect(new URL(returnTo, request.url));
}
