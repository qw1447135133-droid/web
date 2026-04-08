import { NextRequest, NextResponse } from "next/server";
import { createMemberCoinRechargeOrder } from "@/lib/coin-wallet";
import { sanitizeReturnTo } from "@/lib/payment-orders";
import { getCurrentUserRecord } from "@/lib/session";

function buildReturnUrl(
  base: string,
  state: "created" | "error",
  details?: {
    orderNo?: string;
    paymentReference?: string | null;
    totalCoins?: number;
    amount?: number;
  },
) {
  const url = new URL(base, "http://signalnine.local");
  url.searchParams.set("recharge", state);

  if (details?.orderNo) {
    url.searchParams.set("rechargeOrderNo", details.orderNo);
  }

  if (details?.paymentReference) {
    url.searchParams.set("rechargeReference", details.paymentReference);
  }

  if (typeof details?.totalCoins === "number") {
    url.searchParams.set("rechargeCoins", String(details.totalCoins));
  }

  if (typeof details?.amount === "number") {
    url.searchParams.set("rechargeAmount", String(details.amount));
  }

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
    const created = await createMemberCoinRechargeOrder({
      userId: current.id,
      packageId,
    });
    const detailPath = `/member/recharge/${encodeURIComponent(created.id)}`;

    return NextResponse.redirect(
      new URL(
        buildReturnUrl(detailPath, "created", {
          orderNo: created.orderNo,
          paymentReference: created.paymentReference,
          totalCoins: created.coinAmount + created.bonusAmount,
          amount: created.amount,
        }),
        request.url,
      ),
    );
  } catch {
    return NextResponse.redirect(new URL(buildReturnUrl(returnTo, "error"), request.url));
  }
}
