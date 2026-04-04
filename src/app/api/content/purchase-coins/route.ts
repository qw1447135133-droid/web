import { NextRequest, NextResponse } from "next/server";
import { unlockArticleWithCoins } from "@/lib/coin-wallet";
import { sanitizeReturnTo } from "@/lib/payment-orders";
import { getCurrentUserRecord } from "@/lib/session";

function buildReturnUrl(base: string, state: "success" | "insufficient" | "error") {
  const url = new URL(base, "http://signalnine.local");
  url.searchParams.set("coin", state);
  return `${url.pathname}${url.search}`;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const contentId = String(formData.get("contentId") || "");
  const returnTo = sanitizeReturnTo(String(formData.get("returnTo") || "/plans"), "/plans");

  const current = await getCurrentUserRecord();

  if (!current) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(returnTo)}`, request.url));
  }

  try {
    const result = await unlockArticleWithCoins({
      userId: current.id,
      contentId,
    });

    if (result.ok) {
      return NextResponse.redirect(new URL(buildReturnUrl(returnTo, "success"), request.url));
    }

    if (result.state === "insufficient-balance") {
      return NextResponse.redirect(new URL(buildReturnUrl(returnTo, "insufficient"), request.url));
    }

    return NextResponse.redirect(new URL(buildReturnUrl(returnTo, "error"), request.url));
  } catch {
    return NextResponse.redirect(new URL(buildReturnUrl(returnTo, "error"), request.url));
  }
}
