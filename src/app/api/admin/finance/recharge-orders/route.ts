import { NextRequest, NextResponse } from "next/server";
import {
  adjustCoinAccountByAdmin,
  closeExpiredCoinRechargeOrders,
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
  const amount = Number.parseInt(String(formData.get("amount") || "0").trim(), 10);

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
    } else if (intent === "manual-credit") {
      await adjustCoinAccountByAdmin({
        userId,
        direction: "credit",
        amount,
        note: reason,
      });
    } else if (intent === "manual-debit") {
      await adjustCoinAccountByAdmin({
        userId,
        direction: "debit",
        amount,
        note: reason,
      });
    } else if (intent === "close-expired") {
      await closeExpiredCoinRechargeOrders();
    } else {
      return redirectToAdmin(request, "&error=coin-recharge-order");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "COIN_ACCOUNT_INSUFFICIENT_BALANCE") {
      return redirectToAdmin(
        request,
        intent === "manual-debit" ? "&error=coin-adjustment-balance" : "&error=coin-recharge-order-balance",
      );
    }

    return redirectToAdmin(
      request,
      intent === "manual-credit" || intent === "manual-debit"
        ? "&error=coin-adjustment"
        : intent === "close-expired"
          ? "&error=coin-expiry"
          : "&error=coin-recharge-order",
    );
  }

  return redirectToAdmin(
    request,
    intent === "manual-credit" || intent === "manual-debit"
      ? "&saved=coin-adjustment"
      : intent === "close-expired"
        ? "&saved=coin-expiry"
        : "&saved=coin-recharge-order",
  );
}
