import { NextRequest, NextResponse } from "next/server";
import {
  closePendingCoinRechargeOrder,
  createManualCoinRechargeOrder,
  markCoinRechargeOrderFailedByAdmin,
  markCoinRechargeOrderPaidByAdmin,
  refundCoinRechargeOrderByAdmin,
} from "@/lib/admin-finance";
import { getSessionContext } from "@/lib/session";

function redirectToAdmin(request: NextRequest, suffix = "") {
  return NextResponse.redirect(new URL(`/admin?tab=finance${suffix}`, request.url));
}

export async function POST(request: NextRequest) {
  const { entitlements } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return NextResponse.redirect(new URL("/login?next=%2Fadmin%3Ftab%3Dfinance", request.url));
  }

  if (!entitlements.canAccessAdminConsole) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "create");
  const orderId = String(formData.get("orderId") || "").trim();
  const userId = String(formData.get("userId") || "").trim();
  const packageId = String(formData.get("packageId") || "").trim();
  const paymentReference = String(formData.get("paymentReference") || "").trim();
  const reason = String(formData.get("reason") || "").trim();

  try {
    if (intent === "create") {
      await createManualCoinRechargeOrder({
        userId,
        packageId,
        paymentReference,
      });
    } else if (intent === "mark-paid") {
      await markCoinRechargeOrderPaidByAdmin({
        orderId,
        paymentReference,
      });
    } else if (intent === "mark-failed") {
      await markCoinRechargeOrderFailedByAdmin({
        orderId,
        paymentReference,
        reason,
      });
    } else if (intent === "close") {
      await closePendingCoinRechargeOrder({
        orderId,
      });
    } else if (intent === "refund") {
      await refundCoinRechargeOrderByAdmin({
        orderId,
        reason,
      });
    } else {
      return redirectToAdmin(request, "&error=coin-recharge-order");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "COIN_ACCOUNT_INSUFFICIENT_BALANCE") {
      return redirectToAdmin(request, "&error=coin-recharge-order-balance");
    }

    return redirectToAdmin(request, "&error=coin-recharge-order");
  }

  return redirectToAdmin(request, "&saved=coin-recharge-order");
}
