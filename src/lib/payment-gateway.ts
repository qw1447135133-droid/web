import { createHmac } from "node:crypto";
import type { Locale } from "@/lib/i18n";
import {
  getCheckoutRedirectPath,
  type PaymentOrderType,
} from "@/lib/payment-orders";
import {
  getPaymentCallbackUrl,
  getPaymentHostedGatewayConfig,
  getPaymentHostedSigningSecret,
  getPaymentPublicUrl,
  normalizePaymentProvider,
  type PaymentManualCollectionConfig,
  type PaymentProvider,
} from "@/lib/payment-provider";

export type PaymentCheckoutMode = "mock-actions" | "manual-review" | "hosted-redirect";

export type PaymentCheckoutFlow = {
  provider: PaymentProvider;
  mode: PaymentCheckoutMode;
  showMockActions: boolean;
  showManualCollection: boolean;
};

export type NormalizedPaymentCallbackPayload = {
  provider?: PaymentProvider;
  type: PaymentOrderType;
  state?: "paid" | "failed" | "closed";
  orderId?: string;
  providerOrderId?: string;
  paymentReference?: string;
  reason?: string;
  expiresAt?: string;
  eventId?: string;
};

export type HostedGatewayLaunchOrder = {
  id: string;
  type: PaymentOrderType;
  provider: PaymentProvider;
  providerOrderId?: string;
  paymentReference?: string;
  amount: number;
  title: string;
};

function pickStringValue(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const candidate = payload[key];

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

function normalizePaymentState(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if (normalized === "paid" || normalized === "success" || normalized === "succeeded" || normalized === "trade_success" || normalized === "trade_finished") {
    return "paid" as const;
  }

  if (normalized === "failed" || normalized === "fail" || normalized === "error" || normalized === "payment_failed") {
    return "failed" as const;
  }

  if (normalized === "closed" || normalized === "cancelled" || normalized === "canceled" || normalized === "trade_closed") {
    return "closed" as const;
  }

  return undefined;
}

export function getPaymentCheckoutFlow(provider: PaymentProvider): PaymentCheckoutFlow {
  const normalizedProvider = normalizePaymentProvider(provider);

  if (normalizedProvider === "hosted") {
    return {
      provider: normalizedProvider,
      mode: "hosted-redirect",
      showMockActions: false,
      showManualCollection: false,
    };
  }

  if (normalizedProvider === "manual") {
    return {
      provider: normalizedProvider,
      mode: "manual-review",
      showMockActions: false,
      showManualCollection: true,
    };
  }

  return {
    provider: normalizedProvider,
    mode: "mock-actions",
    showMockActions: true,
    showManualCollection: false,
  };
}

export function getPaymentCheckoutActionTargets(input: {
  type: PaymentOrderType;
  orderId: string;
  returnTo: string;
}) {
  return {
    confirm: {
      action: "/api/payments/mock/confirm",
      type: input.type,
      orderId: input.orderId,
      returnTo: input.returnTo,
    },
    fail: {
      action: "/api/payments/mock/fail",
      type: input.type,
      orderId: input.orderId,
      returnTo: input.returnTo,
    },
    cancel: {
      action: "/api/payments/mock/cancel",
      type: input.type,
      orderId: input.orderId,
      returnTo: input.returnTo,
    },
  };
}

export function getPaymentLaunchRedirectPath(input: {
  provider: PaymentProvider;
  type: PaymentOrderType;
  orderId: string;
  returnTo: string;
}) {
  const flow = getPaymentCheckoutFlow(input.provider);

  if (flow.mode === "hosted-redirect") {
    const url = new URL("/api/payments/hosted/launch", "http://signalnine.local");
    url.searchParams.set("type", input.type);
    url.searchParams.set("orderId", input.orderId);
    url.searchParams.set("returnTo", input.returnTo);
    return `${url.pathname}${url.search}`;
  }

  if (flow.mode === "manual-review" || flow.mode === "mock-actions") {
    return getCheckoutRedirectPath({
      type: input.type,
      orderId: input.orderId,
      returnTo: input.returnTo,
    });
  }

  return getCheckoutRedirectPath({
    type: input.type,
    orderId: input.orderId,
    returnTo: input.returnTo,
  });
}

export function normalizePaymentCallbackPayload(payload: unknown): NormalizedPaymentCallbackPayload {
  const record =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};

  const providerRaw = pickStringValue(record, ["provider", "channel"]);
  const typeRaw = pickStringValue(record, ["type", "orderType"]);
  const stateRaw = pickStringValue(record, ["state", "status", "trade_status", "tradeStatus"]);

  return {
    provider: providerRaw ? normalizePaymentProvider(providerRaw) : undefined,
    type: typeRaw === "membership" ? "membership" : "content",
    state: normalizePaymentState(stateRaw),
    orderId: pickStringValue(record, ["orderId", "outTradeNo", "out_trade_no", "merchantOrderId"]) || undefined,
    providerOrderId: pickStringValue(record, ["providerOrderId", "tradeNo", "trade_no", "transactionId", "transaction_id"]) || undefined,
    paymentReference: pickStringValue(record, ["paymentReference", "reference", "payment_reference"]) || undefined,
    reason: pickStringValue(record, ["reason", "failureReason", "fail_reason", "message"]) || undefined,
    expiresAt: pickStringValue(record, ["expiresAt", "expiredAt", "expires_at"]) || undefined,
    eventId: pickStringValue(record, ["eventId", "providerEventId", "event_id", "notifyId", "notify_id"]) || undefined,
  };
}

function buildHostedGatewaySignatureBase(input: {
  merchantId: string;
  type: PaymentOrderType;
  orderId: string;
  providerOrderId: string;
  paymentReference: string;
  amount: number;
  callbackUrl: string;
  returnUrl: string;
}) {
  return [
    ["amount", String(input.amount)],
    ["callbackUrl", input.callbackUrl],
    ["merchantId", input.merchantId],
    ["orderId", input.orderId],
    ["paymentReference", input.paymentReference],
    ["providerOrderId", input.providerOrderId],
    ["returnUrl", input.returnUrl],
    ["type", input.type],
  ]
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

export function buildHostedGatewayRedirectUrl(input: {
  order: HostedGatewayLaunchOrder;
  returnTo: string;
}) {
  const config = getPaymentHostedGatewayConfig();

  if (!config.configured || !config.checkoutUrl || !config.merchantId) {
    throw new Error("HOSTED_GATEWAY_NOT_CONFIGURED");
  }

  const returnUrl = getPaymentPublicUrl(
    getCheckoutRedirectPath({
      type: input.order.type,
      orderId: input.order.id,
      returnTo: input.returnTo,
    }),
  );
  const callbackUrl = getPaymentCallbackUrl();
  const baseString = buildHostedGatewaySignatureBase({
    merchantId: config.merchantId,
    type: input.order.type,
    orderId: input.order.id,
    providerOrderId: input.order.providerOrderId ?? input.order.id,
    paymentReference: input.order.paymentReference ?? input.order.id,
    amount: input.order.amount,
    callbackUrl,
    returnUrl,
  });
  const signature = getPaymentHostedSigningSecret()
    ? createHmac("sha256", getPaymentHostedSigningSecret()).update(baseString).digest("hex")
    : "";
  const url = new URL(config.checkoutUrl);

  url.searchParams.set("merchantId", config.merchantId);
  url.searchParams.set("type", input.order.type);
  url.searchParams.set("orderId", input.order.id);
  url.searchParams.set("providerOrderId", input.order.providerOrderId ?? input.order.id);
  url.searchParams.set("paymentReference", input.order.paymentReference ?? input.order.id);
  url.searchParams.set("amount", String(input.order.amount));
  url.searchParams.set("subject", input.order.title);
  url.searchParams.set("callbackUrl", callbackUrl);
  url.searchParams.set("returnUrl", returnUrl);

  if (signature) {
    url.searchParams.set("signature", signature);
  }

  return url.toString();
}

export function verifyHostedGatewayCallbackSignature(payload: unknown, rawBody?: string) {
  const config = getPaymentHostedGatewayConfig();
  const secret = getPaymentHostedSigningSecret();

  if (!config.configured || !secret) {
    return {
      ok: false,
      reason: "HOSTED_SIGNATURE_NOT_CONFIGURED",
    } as const;
  }

  const record =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  const normalized = normalizePaymentCallbackPayload(payload);
  const signature = pickStringValue(record, ["signature", "sign", "hmac"]);

  if (!signature) {
    return {
      ok: false,
      reason: "HOSTED_SIGNATURE_MISSING",
    } as const;
  }

  const providerOrderId = normalized.providerOrderId ?? "";
  const orderId = normalized.orderId ?? "";
  const paymentReference = normalized.paymentReference ?? "";
  const callbackUrl = getPaymentCallbackUrl();
  const returnUrl = pickStringValue(record, ["returnUrl", "return_url"]);
  const amountRaw = pickStringValue(record, ["amount", "totalAmount", "total_amount"]);
  const amount = Number.parseInt(amountRaw, 10);
  const computed = createHmac("sha256", secret)
    .update(
      buildHostedGatewaySignatureBase({
        merchantId: config.merchantId ?? "",
        type: normalized.type,
        orderId,
        providerOrderId,
        paymentReference,
        amount: Number.isFinite(amount) ? amount : 0,
        callbackUrl,
        returnUrl,
      }),
    )
    .digest("hex");
  const rawComputed = rawBody?.trim()
    ? createHmac("sha256", secret).update(rawBody).digest("hex")
    : "";
  const matched = computed === signature || (rawComputed ? rawComputed === signature : false);

  return {
    ok: matched,
    reason: matched ? "OK" : "HOSTED_SIGNATURE_INVALID",
  } as const;
}

export function getManualCollectionSummary(config: PaymentManualCollectionConfig, locale: Locale) {
  if (!config.configured) {
    return locale === "en"
      ? "Manual collection details are not configured yet."
      : locale === "zh-TW"
        ? "目前尚未配置人工收款資訊。"
        : "目前尚未配置人工收款信息。";
  }

  return [
    config.channelLabel,
    config.accountName,
    config.accountNo,
    config.note,
  ]
    .filter(Boolean)
    .join(" / ");
}
