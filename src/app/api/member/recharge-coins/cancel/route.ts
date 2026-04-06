import { NextRequest, NextResponse } from "next/server";
import { cancelMemberCoinRechargeOrder } from "@/lib/coin-wallet";
import { sanitizeReturnTo } from "@/lib/payment-orders";
import { getCurrentUserRecord } from "@/lib/session";

function buildReturnUrl(base: string, state: "cancelled" | "cancel-error") {
  const url = new URL(base, "http://signalnine.local");
  url.searchParams.set("recharge", state);
  return `${url.pathname}${url.search}`;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const orderId = String(formData.get("orderId") || "").trim();
  const returnTo = sanitizeReturnTo(String(formData.get("returnTo") || "/member"), "/member");
  const current = await getCurrentUserRecord();

  if (!current) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(returnTo)}`, request.url));
  }

  try {
    await cancelMemberCoinRechargeOrder({
      userId: current.id,
      orderId,
      operatorDisplayName: current.displayName || current.email || "member",
    });

    return NextResponse.redirect(new URL(buildReturnUrl(returnTo, "cancelled"), request.url));
  } catch {
    return NextResponse.redirect(new URL(buildReturnUrl(returnTo, "cancel-error"), request.url));
  }
}
