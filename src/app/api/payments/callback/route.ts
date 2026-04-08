import { NextRequest, NextResponse } from "next/server";
import { normalizePaymentCallbackPayload, verifyHostedGatewayCallbackSignature } from "@/lib/payment-gateway";
import { applyPaymentCallback, normalizePaymentOrderType } from "@/lib/payment-orders";
import { getPaymentCallbackToken, getPaymentProviderFamily, normalizePaymentProvider } from "@/lib/payment-provider";
import { prisma } from "@/lib/prisma";

function isAuthorized(request: NextRequest) {
  const configuredToken = getPaymentCallbackToken();

  if (!configuredToken) {
    return false;
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const headerToken = request.headers.get("x-payment-token")?.trim();

  return bearer === configuredToken || headerToken === configuredToken;
}

async function resolveStoredProvider(input: {
  type: ReturnType<typeof normalizePaymentOrderType>;
  orderId?: string;
  providerOrderId?: string;
  paymentReference?: string;
}) {
  const orderId = input.orderId?.trim();
  const providerOrderId = input.providerOrderId?.trim();
  const paymentReference = input.paymentReference?.trim();

  const select = { provider: true } as const;

  if (input.type === "coin-recharge") {
    if (orderId) {
      return (await prisma.coinRechargeOrder.findUnique({ where: { id: orderId }, select }))?.provider ?? undefined;
    }

    if (providerOrderId) {
      return (
        await prisma.coinRechargeOrder.findFirst({
          where: { providerOrderId },
          select,
        })
      )?.provider ?? undefined;
    }

    if (paymentReference) {
      return (
        await prisma.coinRechargeOrder.findFirst({
          where: { paymentReference },
          select,
        })
      )?.provider ?? undefined;
    }
  } else if (input.type === "membership") {
    if (orderId) {
      return (await prisma.membershipOrder.findUnique({ where: { id: orderId }, select }))?.provider ?? undefined;
    }

    if (providerOrderId) {
      return (
        await prisma.membershipOrder.findFirst({
          where: { providerOrderId },
          select,
        })
      )?.provider ?? undefined;
    }

    if (paymentReference) {
      return (
        await prisma.membershipOrder.findFirst({
          where: { paymentReference },
          select,
        })
      )?.provider ?? undefined;
    }
  } else {
    if (orderId) {
      return (await prisma.contentOrder.findUnique({ where: { id: orderId }, select }))?.provider ?? undefined;
    }

    if (providerOrderId) {
      return (
        await prisma.contentOrder.findFirst({
          where: { providerOrderId },
          select,
        })
      )?.provider ?? undefined;
    }

    if (paymentReference) {
      return (
        await prisma.contentOrder.findFirst({
          where: { paymentReference },
          select,
        })
      )?.provider ?? undefined;
    }
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unauthorized payment callback.",
      },
      { status: 401 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  let rawBody = "";
  let payload: unknown;
  try {
    if (contentType.includes("application/json") || contentType.includes("application/x-www-form-urlencoded") || contentType.includes("text/plain")) {
      rawBody = await request.text();

      if (contentType.includes("application/json")) {
        payload = rawBody.trim() ? JSON.parse(rawBody) : {};
      } else {
        payload = Object.fromEntries(new URLSearchParams(rawBody).entries());
      }
    } else {
      payload = Object.fromEntries((await request.formData()).entries());
    }
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Invalid payment callback payload.",
      },
      { status: 400 },
    );
  }
  const normalizedPayload = normalizePaymentCallbackPayload(payload);
  const payloadRecord =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};

  const type = normalizePaymentOrderType(normalizedPayload.type || String(payloadRecord.type || "content"));
  const state = normalizedPayload.state ?? String(payloadRecord.state || "");
  const orderId = normalizedPayload.orderId ?? String(payloadRecord.orderId || "");
  const provider = normalizedPayload.provider ?? String(payloadRecord.provider || "");
  const providerOrderId = normalizedPayload.providerOrderId ?? String(payloadRecord.providerOrderId || "");
  const paymentReference = normalizedPayload.paymentReference ?? String(payloadRecord.paymentReference || "");
  const reason = normalizedPayload.reason ?? String(payloadRecord.reason || "");
  const expiresAt = normalizedPayload.expiresAt ?? String(payloadRecord.expiresAt || "");
  const signature =
    String(payloadRecord.signature || payloadRecord.sign || payloadRecord.hmac || "").trim() || undefined;

  if ((!orderId && !providerOrderId && !paymentReference) || (state !== "paid" && state !== "failed" && state !== "closed")) {
    return NextResponse.json(
      {
        ok: false,
        message: "Invalid payment callback payload.",
      },
      { status: 400 },
    );
  }

  const storedProvider = provider
    ? normalizePaymentProvider(provider)
    : await resolveStoredProvider({
        type,
        orderId,
        providerOrderId,
        paymentReference,
      });

  if (!provider && signature && !storedProvider) {
    return NextResponse.json(
      {
        ok: false,
        message: "HOSTED_PROVIDER_REQUIRED",
      },
      { status: 400 },
    );
  }

  if (storedProvider && getPaymentProviderFamily(normalizePaymentProvider(storedProvider)) === "hosted") {
    const signature = await verifyHostedGatewayCallbackSignature(payload, rawBody);

    if (!signature.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: signature.reason,
        },
        { status: 401 },
      );
    }
  }

  try {
    const result = await applyPaymentCallback({
      type,
      orderId,
      state,
      provider: storedProvider ?? provider,
      providerOrderId,
      paymentReference,
      reason,
      expiresAt,
      callbackPayload: payload,
    });

    return NextResponse.json({
      ok: true,
      orderId: result.orderId || orderId,
      type,
      state,
      duplicate: result.duplicate,
      eventId: result.eventId,
      eventKey: result.eventKey,
      eventStatus: result.eventStatus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment callback failed.";
    const status =
      message === "PAYMENT_ORDER_NOT_FOUND"
        ? 404
        : message === "PAYMENT_ORDER_ALREADY_REFUNDED"
          ? 409
          : 500;

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status },
    );
  }
}
