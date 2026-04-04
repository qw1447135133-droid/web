import type { DisplayLocale, Locale } from "@/lib/i18n-config";

export type PaymentProvider = "mock" | "manual" | "hosted";
export type PaymentManualCollectionConfig = {
  configured: boolean;
  channelLabel?: string;
  accountName?: string;
  accountNo?: string;
  qrCodeUrl?: string;
  note?: string;
};
export type PaymentHostedGatewayConfig = {
  configured: boolean;
  gatewayName: string;
  checkoutUrl?: string;
  merchantId?: string;
  signingSecretConfigured: boolean;
};

export type PaymentRuntimeConfig = {
  provider: PaymentProvider;
  pendingMinutes: number;
  callbackTokenConfigured: boolean;
  callbackPath: string;
  callbackUrl: string;
  callbackUrlConfigured: boolean;
  callbackAuthMode: "shared-token" | "shared-token+hmac";
  manualCollectionConfigured: boolean;
  hostedGatewayConfigured: boolean;
  hostedGatewayName?: string;
  hostedSignatureConfigured: boolean;
};

const paymentProviderExpiryMinutes: Record<PaymentProvider, number> = {
  mock: 30,
  manual: 60 * 24 * 3,
  hosted: 30,
};

export function normalizePaymentProvider(value?: string | null): PaymentProvider {
  if (value === "hosted") {
    return "hosted";
  }

  if (value === "manual") {
    return "manual";
  }

  return "mock";
}

export function getPaymentProvider(): PaymentProvider {
  const configured = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();

  if (configured) {
    return normalizePaymentProvider(configured);
  }

  return process.env.NODE_ENV === "production" ? "manual" : "mock";
}

export function getPaymentProviderExpiryMinutes(provider: PaymentProvider = getPaymentProvider()) {
  const configured = Number.parseInt(process.env.PAYMENT_PENDING_MINUTES?.trim() ?? "", 10);

  if (Number.isFinite(configured) && configured >= 5) {
    return configured;
  }

  return paymentProviderExpiryMinutes[provider];
}

export function getPaymentProviderLabel(provider: PaymentProvider, locale: Locale | DisplayLocale) {
  if (provider === "mock") {
    if (locale === "en") {
      return "Mock gateway";
    }

    if (locale === "zh-TW") {
      return "模擬支付通道";
    }

    if (locale === "th") {
      return "ช่องทางชำระเงินจำลอง";
    }

    if (locale === "vi") {
      return "Cổng thanh toán mô phỏng";
    }

    if (locale === "hi") {
      return "मॉक पेमेंट गेटवे";
    }

    return "模拟支付通道";
  }

  if (provider === "hosted") {
    if (locale === "en") {
      return "Hosted gateway";
    }

    if (locale === "zh-TW") {
      return "託管支付通道";
    }

    if (locale === "th") {
      return "ช่องทางชำระเงินแบบโฮสต์";
    }

    if (locale === "vi") {
      return "Cổng thanh toán được lưu trữ";
    }

    if (locale === "hi") {
      return "होस्टेड पेमेंट गेटवे";
    }

    return "托管支付通道";
  }

  if (locale === "en") {
    return "Manual review";
  }

  if (locale === "zh-TW") {
    return "人工審核收款";
  }

  if (locale === "th") {
    return "ตรวจสอบการชำระเงินด้วยตนเอง";
  }

  if (locale === "vi") {
    return "Đối soát thanh toán thủ công";
  }

  if (locale === "hi") {
    return "मैन्युअल भुगतान सत्यापन";
  }

  return "人工审核收款";
}

export function getPaymentCallbackToken() {
  return process.env.PAYMENT_CALLBACK_TOKEN?.trim() ?? "";
}

export function getPaymentHostedSigningSecret() {
  return process.env.PAYMENT_HOSTED_SIGNING_SECRET?.trim() ?? "";
}

function getPaymentBaseUrl() {
  const configured =
    process.env.PAYMENT_CALLBACK_BASE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "";

  return configured.replace(/\/+$/, "");
}

export function getPaymentPublicUrl(path: string) {
  const baseUrl = getPaymentBaseUrl();

  if (!baseUrl) {
    return path;
  }

  if (!path.startsWith("/")) {
    return `${baseUrl}/${path}`;
  }

  return `${baseUrl}${path}`;
}

export function getPaymentCallbackPath() {
  return "/api/payments/callback";
}

export function getPaymentCallbackUrl() {
  return getPaymentPublicUrl(getPaymentCallbackPath());
}

export function getPaymentManualCollectionConfig(): PaymentManualCollectionConfig {
  const channelLabel = process.env.PAYMENT_MANUAL_CHANNEL_LABEL?.trim() ?? "";
  const accountName = process.env.PAYMENT_MANUAL_ACCOUNT_NAME?.trim() ?? "";
  const accountNo = process.env.PAYMENT_MANUAL_ACCOUNT_NO?.trim() ?? "";
  const qrCodeUrl = process.env.PAYMENT_MANUAL_QR_CODE_URL?.trim() ?? "";
  const note = process.env.PAYMENT_MANUAL_NOTE?.trim() ?? "";

  return {
    configured: Boolean(channelLabel || accountName || accountNo || qrCodeUrl || note),
    channelLabel: channelLabel || undefined,
    accountName: accountName || undefined,
    accountNo: accountNo || undefined,
    qrCodeUrl: qrCodeUrl || undefined,
    note: note || undefined,
  };
}

export function getPaymentHostedGatewayConfig(): PaymentHostedGatewayConfig {
  const gatewayName = process.env.PAYMENT_HOSTED_GATEWAY_NAME?.trim() || "Hosted Gateway";
  const checkoutUrl = process.env.PAYMENT_HOSTED_CHECKOUT_URL?.trim() ?? "";
  const merchantId = process.env.PAYMENT_HOSTED_MERCHANT_ID?.trim() ?? "";
  const signingSecret = getPaymentHostedSigningSecret();

  return {
    configured: Boolean(checkoutUrl && merchantId),
    gatewayName,
    checkoutUrl: checkoutUrl || undefined,
    merchantId: merchantId || undefined,
    signingSecretConfigured: Boolean(signingSecret),
  };
}

export function getPaymentRuntimeConfig(): PaymentRuntimeConfig {
  const provider = getPaymentProvider();
  const callbackUrl = getPaymentCallbackUrl();
  const manualCollection = getPaymentManualCollectionConfig();
  const hostedGateway = getPaymentHostedGatewayConfig();

  return {
    provider,
    pendingMinutes: getPaymentProviderExpiryMinutes(provider),
    callbackTokenConfigured: Boolean(getPaymentCallbackToken()),
    callbackPath: getPaymentCallbackPath(),
    callbackUrl,
    callbackUrlConfigured: callbackUrl.startsWith("http://") || callbackUrl.startsWith("https://"),
    callbackAuthMode: provider === "hosted" ? "shared-token+hmac" : "shared-token",
    manualCollectionConfigured: manualCollection.configured,
    hostedGatewayConfigured: hostedGateway.configured,
    hostedGatewayName: hostedGateway.gatewayName,
    hostedSignatureConfigured: hostedGateway.signingSecretConfigured,
  };
}
