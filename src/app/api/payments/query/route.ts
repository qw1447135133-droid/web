import { NextRequest, NextResponse } from "next/server";
import { getCurrentDisplayLocale } from "@/lib/i18n";
import { getMemberCoinRechargeDetail } from "@/lib/coin-wallet";
import { getCheckoutOrder } from "@/lib/payment-orders";
import { prisma } from "@/lib/prisma";
import { getCurrentUserRecord } from "@/lib/session";

type QueryableOrderType = "coin-recharge" | "membership" | "content";

function normalizeOrderType(value: string | null): QueryableOrderType {
  if (value === "membership" || value === "content") {
    return value;
  }

  return "coin-recharge";
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUserRecord();

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const orderId = request.nextUrl.searchParams.get("orderId")?.trim() || "";
  const type = normalizeOrderType(request.nextUrl.searchParams.get("type"));
  const locale = await getCurrentDisplayLocale();

  if (!orderId) {
    return NextResponse.json({ error: "ORDER_ID_REQUIRED" }, { status: 400 });
  }

  const order =
    type === "coin-recharge"
      ? await getMemberCoinRechargeDetail(user.id, orderId, locale)
      : await getCheckoutOrder({
          type,
          orderId,
          userId: user.id,
        });

  if (!order) {
    return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
  }

  const callbackEvents = await prisma.paymentCallbackEvent.findMany({
    where: {
      orderId,
      orderType: type,
    },
    orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
    take: 10,
    select: {
      id: true,
      provider: true,
      state: true,
      processingStatus: true,
      processingMessage: true,
      duplicateCount: true,
      lastSeenAt: true,
      createdAt: true,
      paymentReference: true,
      providerOrderId: true,
    },
  });

  return NextResponse.json({
    orderType: type,
    order,
    providerQuery: {
      supported: false,
      mode: "local-callback-log",
      message: "External provider query adapters are not connected in this environment. Returning local callback and reconciliation history only.",
      callbackEventCount: callbackEvents.length,
      conflictCount: callbackEvents.filter((item) => item.processingStatus === "conflict").length,
      duplicateNotificationCount: callbackEvents.reduce((sum, item) => sum + item.duplicateCount, 0),
      lastCallbackAt: callbackEvents[0]?.lastSeenAt.toISOString() ?? null,
      events: callbackEvents.map((item) => ({
        id: item.id,
        provider: item.provider,
        state: item.state,
        processingStatus: item.processingStatus,
        processingMessage: item.processingMessage,
        duplicateCount: item.duplicateCount,
        paymentReference: item.paymentReference,
        providerOrderId: item.providerOrderId,
        lastSeenAt: item.lastSeenAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
      })),
    },
  });
}
