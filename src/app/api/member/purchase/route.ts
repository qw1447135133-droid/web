import { NextRequest, NextResponse } from "next/server";
import { getPaymentLaunchRedirectPath } from "@/lib/payment-gateway";
import { createPendingMembershipOrder, sanitizeReturnTo } from "@/lib/payment-orders";
import { normalizePaymentProvider } from "@/lib/payment-provider";
import { getCurrentUserRecord } from "@/lib/session";
import type { MembershipPlanId } from "@/lib/types";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const planId = String(formData.get("planId") || "monthly") as MembershipPlanId;
  const returnTo = sanitizeReturnTo(String(formData.get("returnTo") || "/member"), "/member");

  const current = await getCurrentUserRecord();

  if (!current) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(returnTo)}`, request.url));
  }

  try {
    const order = await createPendingMembershipOrder({
      userId: current.id,
      planId,
    });

    return NextResponse.redirect(
      new URL(
        getPaymentLaunchRedirectPath({
          provider: normalizePaymentProvider(order.provider),
          type: "membership",
          orderId: order.id,
          returnTo,
        }),
        request.url,
      ),
    );
  } catch {
    return NextResponse.redirect(new URL(returnTo, request.url));
  }
}
