import { NextRequest, NextResponse } from "next/server";
import { failMockPayment, getCheckoutRedirectPath, normalizePaymentOrderType, sanitizeReturnTo } from "@/lib/payment-orders";
import { getCurrentUserRecord } from "@/lib/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const type = normalizePaymentOrderType(String(formData.get("type") || "content"));
  const orderId = String(formData.get("orderId") || "");
  const fallbackReturnTo = type === "membership" ? "/member" : "/plans";
  const returnTo = sanitizeReturnTo(String(formData.get("returnTo") || fallbackReturnTo), fallbackReturnTo);
  const reason = String(formData.get("reason") || "模拟支付通道返回失败，请重新发起订单。");
  const current = await getCurrentUserRecord();

  if (!current) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(returnTo)}`, request.url));
  }

  const checkoutPath = getCheckoutRedirectPath({
    type,
    orderId,
    returnTo,
  });

  try {
    await failMockPayment({
      type,
      orderId,
      userId: current.id,
      reason,
    });

    const url = new URL(checkoutPath, request.url);
    url.searchParams.set("payment", "failed");
    return NextResponse.redirect(url);
  } catch {
    const url = new URL(checkoutPath, request.url);
    url.searchParams.set("payment", "error");
    return NextResponse.redirect(url);
  }
}
