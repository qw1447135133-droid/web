import { NextRequest, NextResponse } from "next/server";
import {
  closePendingOrderByAdmin,
  markOrderFailedByAdmin,
  markOrderPaidByAdmin,
  normalizePaymentOrderType,
  sanitizeReturnTo,
} from "@/lib/payment-orders";
import { getSessionContext } from "@/lib/session";

function buildRedirect(request: NextRequest, returnTo: string, state: "saved" | "error") {
  const url = new URL(returnTo, request.url);
  url.searchParams.set(state === "saved" ? "saved" : "error", state === "saved" ? "order-status" : "order-status");
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const { entitlements } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return NextResponse.redirect(new URL("/login?next=%2Fadmin%3Ftab%3Dusers", request.url));
  }

  if (!entitlements.canAccessAdminConsole) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  const formData = await request.formData();
  const type = normalizePaymentOrderType(String(formData.get("type") || "content"));
  const orderId = String(formData.get("orderId") || "");
  const intent = String(formData.get("intent") || "");
  const paymentReference = String(formData.get("paymentReference") || "");
  const reason = String(formData.get("reason") || "");
  const returnTo = sanitizeReturnTo(String(formData.get("returnTo") || "/admin?tab=users"), "/admin?tab=users");

  try {
    if (intent === "mark-paid") {
      await markOrderPaidByAdmin({
        type,
        orderId,
        paymentReference,
      });
    } else if (intent === "mark-failed") {
      await markOrderFailedByAdmin({
        type,
        orderId,
        paymentReference,
        reason,
      });
    } else if (intent === "close") {
      await closePendingOrderByAdmin({
        type,
        orderId,
      });
    } else {
      return buildRedirect(request, returnTo, "error");
    }

    return buildRedirect(request, returnTo, "saved");
  } catch {
    return buildRedirect(request, returnTo, "error");
  }
}
