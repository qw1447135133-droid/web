import { NextRequest, NextResponse } from "next/server";
import { adjustCoinAccountByAdmin } from "@/lib/admin-finance";
import { adminDisableUserMembership, adminExtendUserMembership } from "@/lib/admin-users";
import { recordAdminAuditLog } from "@/lib/admin-system";
import { getCurrentUserRecord, getSessionContext } from "@/lib/session";

function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }

  return request.headers.get("x-real-ip") ?? undefined;
}

function redirectToPath(request: NextRequest, returnTo: string, key: "saved" | "error", value: string) {
  const safeReturnTo =
    returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/admin?tab=users";
  const url = new URL(safeReturnTo, request.url);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const { entitlements, session } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return NextResponse.redirect(new URL("/login?next=%2Fadmin%3Ftab%3Dusers", request.url));
  }

  if (!entitlements.canAccessAdminConsole) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  const currentUser = await getCurrentUserRecord();
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const userId = String(formData.get("userId") || "").trim();
  const returnTo = String(formData.get("returnTo") || "/admin?tab=users");
  const ipAddress = getRequestIp(request);

  try {
    if (intent === "extend-membership") {
      const planId = String(formData.get("planId") || "").trim();
      const durationDays = Number.parseInt(String(formData.get("durationDays") || "30"), 10);
      const note = String(formData.get("note") || "").trim();
      const result = await adminExtendUserMembership({
        userId,
        planId,
        durationDays,
        note,
        createdByDisplayName: session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "admin-extend-user-membership",
        scope: "users.membership",
        targetType: "user",
        targetId: userId,
        detail: `planId: ${result.planId} | expiresAt: ${result.expiresAt} | durationDays: ${durationDays}`,
        ipAddress,
      });
      return redirectToPath(request, returnTo, "saved", "user-membership");
    }

    if (intent === "disable-membership") {
      const note = String(formData.get("note") || "").trim();
      await adminDisableUserMembership({
        userId,
        note,
        createdByDisplayName: session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "admin-disable-user-membership",
        scope: "users.membership",
        targetType: "user",
        targetId: userId,
        detail: `note: ${note || "--"}`,
        ipAddress,
      });
      return redirectToPath(request, returnTo, "saved", "user-membership");
    }

    if (intent === "credit-coins" || intent === "debit-coins") {
      const amount = Number.parseInt(String(formData.get("amount") || "0"), 10);
      const note = String(formData.get("note") || "").trim();
      await adjustCoinAccountByAdmin({
        userId,
        direction: intent === "debit-coins" ? "debit" : "credit",
        amount,
        note,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: intent === "debit-coins" ? "admin-debit-user-coins" : "admin-credit-user-coins",
        scope: "users.coin-account",
        targetType: "user",
        targetId: userId,
        detail: `amount: ${amount} | note: ${note || "--"}`,
        ipAddress,
      });
      return redirectToPath(request, returnTo, "saved", "user-coins");
    }
  } catch {
    return redirectToPath(request, returnTo, "error", "user-workspace");
  }

  return redirectToPath(request, returnTo, "error", "user-workspace");
}
