import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, AuthServiceError } from "@/lib/auth-service";
import { applyUserAgentAttribution } from "@/lib/agent-attribution";
import { prisma } from "@/lib/prisma";
import { sanitizeReturnTo } from "@/lib/payment-orders";
import { setSessionCookieForUser } from "@/lib/session";
import { recordUserLoginActivity } from "@/lib/user-activity";
import type { UserRole } from "@/lib/types";

function buildLoginRedirect(request: NextRequest, params: { next?: string; error?: string }) {
  const url = new URL("/login", request.url);

  if (params.next) {
    url.searchParams.set("next", params.next);
  }

  if (params.error) {
    url.searchParams.set("error", params.error);
  }

  return url;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const mode = String(formData.get("mode") || "").trim();
  const displayName = String(formData.get("displayName") || "Demo User");
  const email = String(formData.get("email") || "demo@signalnine.local");
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "member") as UserRole;
  const returnTo = sanitizeReturnTo(String(formData.get("returnTo") || "/member"), "/member");
  const inviteCode = String(formData.get("inviteCode") || "").trim();

  if (mode !== "dev-quick") {
    try {
      const user = await authenticateUser({
        email,
        password,
        headers: request.headers,
      });

      await setSessionCookieForUser(user.id);

      return NextResponse.redirect(new URL(returnTo, request.url));
    } catch (error) {
      const errorCode = error instanceof AuthServiceError ? error.code.toLowerCase() : "login_failed";
      return NextResponse.redirect(
        buildLoginRedirect(request, {
          next: returnTo,
          error: errorCode,
        }),
      );
    }
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.redirect(
      buildLoginRedirect(request, {
        next: returnTo,
        error: "dev_login_disabled",
      }),
    );
  }

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
