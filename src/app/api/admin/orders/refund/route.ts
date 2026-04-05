import { NextRequest, NextResponse } from "next/server";
import {
  MEMBERSHIP_REFUND_BLOCKED_ERROR,
  normalizePaymentOrderType,
  refundOrderByAdmin,
  sanitizeReturnTo,
} from "@/lib/payment-orders";
import { getSessionContext } from "@/lib/session";

function redirectToAdmin(request: NextRequest, returnTo: string, feedbackKey: "saved" | "error", feedbackValue: string) {
  const safeReturnTo = sanitizeReturnTo(returnTo, "/admin?tab=users");
  const url = new URL(safeReturnTo, request.url);
  url.searchParams.set(feedbackKey, feedbackValue);

  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const { entitlements } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return NextResponse.redirect(new URL("/login?next=%2Fadmin", request.url));
  }

  if (!entitlements.canAccessAdminConsole) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  const formData = await request.formData();
  const type = normalizePaymentOrderType(String(formData.get("type") || "content"));
  const orderId = String(formData.get("orderId") || "");
  const reason = String(formData.get("reason") || "");
  const returnTo = String(formData.get("returnTo") || "/admin?tab=users");

  try {
    await refundOrderByAdmin({
      type,
      orderId,
      reason,
    });

    return redirectToAdmin(request, returnTo, "saved", "refund");
  } catch (error) {
    const errorCode =
      error instanceof Error && "code" in error
        ? String((error as Error & { code?: string }).code || "")
        : "";

    if (errorCode === MEMBERSHIP_REFUND_BLOCKED_ERROR) {
      return redirectToAdmin(request, returnTo, "error", "refund-blocked");
    }

    return redirectToAdmin(request, returnTo, "error", "refund");
  }
}
