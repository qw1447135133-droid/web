import { NextRequest, NextResponse } from "next/server";
import { createMemberCoinRechargeOrder } from "@/lib/coin-wallet";
import { sanitizeReturnTo } from "@/lib/payment-orders";
import { getCurrentUserRecord } from "@/lib/session";

function buildReturnUrl(base: string, state: "created" | "error") {
  const url = new URL(base, "http://signalnine.local");
  url.searchParams.set("recharge", state);
  return `${url.pathname}${url.search}`;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const packageId = String(formData.get("packageId") || "").trim();
  const returnTo = sanitizeReturnTo(String(formData.get("returnTo") || "/member"), "/member");
  const current = await getCurrentUserRecord();

  if (!current) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(returnTo)}`, request.url));
  }

  try {
    await createMemberCoinRechargeOrder({
      userId: current.id,
      packageId,
    });

    return NextResponse.redirect(new URL(buildReturnUrl(returnTo, "created"), request.url));
  } catch {
    return NextResponse.redirect(new URL(buildReturnUrl(returnTo, "error"), request.url));
  }
}
