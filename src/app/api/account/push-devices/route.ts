import { NextRequest, NextResponse } from "next/server";
import { normalizeDisplayLocale } from "@/lib/i18n-config";
import { upsertUserPushDevice } from "@/lib/push-notifications";
import { getCurrentUserRecord } from "@/lib/session";

export async function POST(request: NextRequest) {
  const user = await getCurrentUserRecord();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json()) as {
    deviceKey?: string;
    permission?: string;
    locale?: string;
    platform?: string;
    userAgent?: string;
    subscription?: {
      endpoint?: string;
      keys?: {
        p256dh?: string;
        auth?: string;
      };
    } | null;
  };

  await upsertUserPushDevice(user.id, {
    deviceKey: String(body.deviceKey || "").trim(),
    permission: String(body.permission || "default").trim(),
    locale: normalizeDisplayLocale(body.locale),
    platform: String(body.platform || "").trim() || undefined,
    userAgent: String(body.userAgent || "").trim() || undefined,
    subscription:
      body.subscription &&
      typeof body.subscription.endpoint === "string" &&
      typeof body.subscription.keys?.p256dh === "string" &&
      typeof body.subscription.keys?.auth === "string"
        ? {
            endpoint: body.subscription.endpoint.trim(),
            keys: {
              p256dh: body.subscription.keys.p256dh.trim(),
              auth: body.subscription.keys.auth.trim(),
            },
          }
        : null,
  });

  return NextResponse.json({ ok: true });
}
