import { NextRequest, NextResponse } from "next/server";
import { createPendingContentOrder, getCheckoutRedirectPath, sanitizeReturnTo } from "@/lib/payment-orders";
import { getCurrentUserRecord } from "@/lib/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const contentId = String(formData.get("contentId") || "");
  const returnTo = sanitizeReturnTo(String(formData.get("returnTo") || "/plans"), "/plans");

  const current = await getCurrentUserRecord();

  if (!current) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(returnTo)}`, request.url));
  }

  try {
    const order = await createPendingContentOrder({
      userId: current.id,
      contentId,
    });

    return NextResponse.redirect(
      new URL(
        getCheckoutRedirectPath({
          type: "content",
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
