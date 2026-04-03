import type { Locale } from "@/lib/i18n";

export type PaymentProvider = "mock" | "manual";

export function getPaymentProvider(): PaymentProvider {
  const configured = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();

  if (configured === "mock" || configured === "manual") {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? "manual" : "mock";
}

export function getPaymentProviderLabel(provider: PaymentProvider, locale: Locale) {
  if (provider === "mock") {
    if (locale === "en") {
      return "Mock gateway";
    }

    if (locale === "zh-TW") {
      return "模擬支付通道";
    }

    return "模拟支付通道";
  }

  if (locale === "en") {
    return "Manual review";
  }

  if (locale === "zh-TW") {
    return "人工審核收款";
  }

  return "人工审核收款";
}

export function getPaymentCallbackToken() {
  return process.env.PAYMENT_CALLBACK_TOKEN?.trim() ?? "";
}
