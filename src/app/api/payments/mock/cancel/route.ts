import { NextRequest, NextResponse } from "next/server";
import {
  closeMockPayment,
  getPaymentReturnPath,
  normalizePaymentOrderType,
  sanitizeReturnTo,
} from "@/lib/payment-orders";
import { getCurrentUserRecord } from "@/lib/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const type = normalizePaymentOrderType(String(formData.get("type") || "content"));
  const orderId = String(formData.get("orderId") || "");
  const fallbackReturnTo =
    type === "membership" ? "/member" : type === "coin-recharge" ? `/member/recharge/${encodeURIComponent(orderId)}` : "/plans";
  const returnTo = sanitizeReturnTo(
    String(formData.get("returnTo") || fallbackReturnTo),
    fallbackReturnTo,
  );
  const current = await getCurrentUserRecord();

  if (!current) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(returnTo)}`, request.url));
  }

  try {
    await closeMockPayment({
      type,
      orderId,
      userId: current.id,
    });
    return NextResponse.redirect(new URL(getPaymentReturnPath(returnTo, "closed"), request.url));
  } catch {
    return NextResponse.redirect(new URL(getPaymentReturnPath(returnTo, "error"), request.url));
  }
}
