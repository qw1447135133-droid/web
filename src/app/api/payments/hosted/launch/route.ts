import { NextRequest, NextResponse } from "next/server";
import { buildHostedGatewayRedirectUrl } from "@/lib/payment-gateway";
import {
  getCheckoutOrder,
  getCheckoutRedirectPath,
  normalizePaymentOrderType,
  sanitizeReturnTo,
} from "@/lib/payment-orders";
import { getPaymentProviderFamily, normalizePaymentProvider } from "@/lib/payment-provider";
import { getCurrentUserRecord } from "@/lib/session";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = normalizePaymentOrderType(searchParams.get("type"));
  const orderId = searchParams.get("orderId")?.trim() ?? "";
  const fallbackReturnTo = type === "membership" ? "/member" : type === "coin-recharge" ? `/member/recharge/${orderId}` : "/plans";
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"), fallbackReturnTo);
  const current = await getCurrentUserRecord();

  if (!current) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(returnTo)}`, request.url));
  }

  const fallbackCheckoutUrl = new URL(
    getCheckoutRedirectPath({
      type,
      orderId,
      returnTo,
    }),
    request.url,
  );

  try {
    const order = await getCheckoutOrder({
      type,
      orderId,
      userId: current.id,
    });

    if (!order || getPaymentProviderFamily(normalizePaymentProvider(order.provider)) !== "hosted") {
      fallbackCheckoutUrl.searchParams.set("payment", "error");
      return NextResponse.redirect(fallbackCheckoutUrl);
    }

    if (order.status !== "pending") {
      return NextResponse.redirect(fallbackCheckoutUrl);
    }

    const redirectUrl = await buildHostedGatewayRedirectUrl({
      order,
      returnTo,
    });

    return NextResponse.redirect(redirectUrl);
  } catch {
    fallbackCheckoutUrl.searchParams.set("payment", "error");
    return NextResponse.redirect(fallbackCheckoutUrl);
  }
}
