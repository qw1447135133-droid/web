import { NextRequest, NextResponse } from "next/server";
import { applyUserAgentAttribution } from "@/lib/agent-attribution";
import { prisma } from "@/lib/prisma";
import { setSessionCookieForUser } from "@/lib/session";
import { recordUserLoginActivity } from "@/lib/user-activity";
import type { UserRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const displayName = String(formData.get("displayName") || "Demo User");
  const email = String(formData.get("email") || "demo@signalnine.local");
  const role = String(formData.get("role") || "member") as UserRole;
  const returnTo = String(formData.get("returnTo") || "/member");
  const inviteCode = String(formData.get("inviteCode") || "").trim();

  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email },
      select: {
        id: true,
        referredByAgentId: true,
      },
    });

    const savedUser = existing
      ? await tx.user.update({
          where: { email },
          data: {
            displayName,
            role,
          },
        })
      : await tx.user.create({
          data: {
            displayName,
            email,
            role,
          },
        });

    if (inviteCode) {
      await applyUserAgentAttribution(tx, {
        userId: savedUser.id,
        inviteCode,
      });
    }

    await recordUserLoginActivity(tx, {
      userId: savedUser.id,
      source: "passwordless-demo",
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
    });

    return savedUser;
  });

  await setSessionCookieForUser(user.id);

  return NextResponse.redirect(new URL(returnTo, request.url));
}
