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

function redirectToPath(request: NextRequest, returnTo: string, params: Record<string, string | undefined>) {
  const safeReturnTo =
    returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/admin?tab=users";
  const url = new URL(safeReturnTo, request.url);

  for (const key of Array.from(url.searchParams.keys())) {
    if (key === "saved" || key === "error" || key.startsWith("saved") || key.startsWith("error")) {
      url.searchParams.delete(key);
    }
  }

  for (const [key, value] of Object.entries(params)) {
    if (!value) {
      continue;
    }

    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url);
}

function getErrorCode(error: unknown) {
  return error instanceof Error ? error.message : "UNKNOWN";
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
  const orderNo = String(formData.get("orderNo") || "").trim();
  const amount = Number.parseInt(String(formData.get("amount") || "0"), 10);
  const paymentReference = String(formData.get("paymentReference") || "").trim();
  const reason = String(formData.get("reason") || "").trim();
  const returnTo = String(formData.get("returnTo") || "/admin?tab=users");
  const ipAddress = getRequestIp(request);

  try {
    if (intent === "mark-paid") {
      await markCoinRechargeOrderPaidByAdmin({
        orderId,
        paymentReference,
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
        detail: `paymentReference: ${paymentReference || "--"} | source: user-workspace`,
        ipAddress,
      });
      return redirectToPath(request, returnTo, {
        saved: "order-status",
        savedAction: intent,
        savedOrderNo: orderNo,
        savedOrderAmount: String(amount),
      });
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
      return redirectToPath(request, returnTo, {
        saved: "order-status",
        savedAction: intent,
        savedOrderNo: orderNo,
        savedOrderAmount: String(amount),
      });
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
      return redirectToPath(request, returnTo, {
        saved: "order-status",
        savedAction: intent,
        savedOrderNo: orderNo,
        savedOrderAmount: String(amount),
      });
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
      return redirectToPath(request, returnTo, {
        saved: "refund",
        savedAction: intent,
        savedOrderNo: orderNo,
        savedOrderAmount: String(amount),
      });
    }
  } catch (error) {
    return redirectToPath(request, returnTo, {
      error: "user-workspace",
      errorAction: intent,
      errorCode: getErrorCode(error),
    });
  }

  return redirectToPath(request, returnTo, {
    error: "user-workspace",
    errorAction: intent,
  });
}
