import { NextRequest, NextResponse } from "next/server";
import { applyPaymentCallback, normalizePaymentOrderType } from "@/lib/payment-orders";
import { getPaymentCallbackToken } from "@/lib/payment-provider";

function isAuthorized(request: NextRequest) {
  const configuredToken = getPaymentCallbackToken();

  if (!configuredToken) {
    return false;
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const headerToken = request.headers.get("x-payment-token")?.trim();

  return bearer === configuredToken || headerToken === configuredToken;
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
  const payload =
    contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());

  const type = normalizePaymentOrderType(String(payload.type || "content"));
  const state = String(payload.state || "");
  const orderId = String(payload.orderId || "");
  const paymentReference = String(payload.paymentReference || "");
  const reason = String(payload.reason || "");

  if (!orderId || (state !== "paid" && state !== "failed" && state !== "closed")) {
    return NextResponse.json(
      {
        ok: false,
        message: "Invalid payment callback payload.",
      },
      { status: 400 },
    );
  }

  try {
    await applyPaymentCallback({
      type,
      orderId,
      state,
      paymentReference,
      reason,
    });

    return NextResponse.json({
      ok: true,
      orderId,
      type,
      state,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Payment callback failed.",
      },
      { status: 500 },
    );
  }
}
