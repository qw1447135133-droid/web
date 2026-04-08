import { NextRequest, NextResponse } from "next/server";
import {
  closePendingCoinRechargeOrder,
  markCoinRechargeOrderFailedByAdmin,
  markCoinRechargeOrderPaidByAdmin,
  refundCoinRechargeOrderByAdmin,
} from "@/lib/admin-finance";
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
  const orderId = String(formData.get("orderId") || "").trim();
  const paymentReference = String(formData.get("paymentReference") || "").trim();
  const reason = String(formData.get("reason") || "").trim();
  const returnTo = String(formData.get("returnTo") || "/admin?tab=users");
  const ipAddress = getRequestIp(request);

  try {
    if (intent === "mark-paid") {
      await markCoinRechargeOrderPaidByAdmin({
        orderId,
        paymentReference,
        note: reason,
        allowRecoverFromTerminal: true,
        operatorUserId: currentUser?.id,
        operatorDisplayName: session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "mark-coin-recharge-paid",
        scope: "finance.coin-recharge-order",
        targetType: "coin-recharge-order",
        targetId: orderId,
        detail: `paymentReference: ${paymentReference || "--"} | note: ${reason || "--"} | source: user-workspace`,
        ipAddress,
      });
      return redirectToPath(request, returnTo, "saved", "order-status");
    }

    if (intent === "mark-failed") {
      await markCoinRechargeOrderFailedByAdmin({
        orderId,
        paymentReference,
        reason,
        operatorUserId: currentUser?.id,
        operatorDisplayName: session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "mark-coin-recharge-failed",
        scope: "finance.coin-recharge-order",
        targetType: "coin-recharge-order",
        targetId: orderId,
        detail: `paymentReference: ${paymentReference || "--"} | reason: ${reason || "--"} | source: user-workspace`,
        ipAddress,
      });
      return redirectToPath(request, returnTo, "saved", "order-status");
    }

    if (intent === "close") {
      await closePendingCoinRechargeOrder({
        orderId,
        operatorUserId: currentUser?.id,
        operatorDisplayName: session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "close-coin-recharge-order",
        scope: "finance.coin-recharge-order",
        targetType: "coin-recharge-order",
        targetId: orderId,
        detail: "source: user-workspace",
        ipAddress,
      });
      return redirectToPath(request, returnTo, "saved", "order-status");
    }

    if (intent === "refund") {
      await refundCoinRechargeOrderByAdmin({
        orderId,
        reason,
        operatorUserId: currentUser?.id,
        operatorDisplayName: session.displayName,
      });
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "refund-coin-recharge-order",
        scope: "finance.coin-recharge-order",
        targetType: "coin-recharge-order",
        targetId: orderId,
        detail: `reason: ${reason || "--"} | source: user-workspace`,
        ipAddress,
      });
      return redirectToPath(request, returnTo, "saved", "refund");
    }
  } catch {
    return redirectToPath(request, returnTo, "error", "user-workspace");
  }

  return redirectToPath(request, returnTo, "error", "user-workspace");
}
