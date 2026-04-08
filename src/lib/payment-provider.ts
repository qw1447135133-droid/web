import { getSystemParameterMap } from "@/lib/admin-system";
import type { DisplayLocale, Locale } from "@/lib/i18n-config";

export type PaymentProvider = "mock" | "manual" | "hosted" | "xendit" | "razorpay" | "payu";
export type PaymentProviderFamily = "mock" | "manual" | "hosted";
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

export type PaymentCountryRoute = {
  key: string;
  countryCode?: string;
  countryLabel: string;
  provider: PaymentProvider;
  currency: string;
  wallets: string[];
};

export type PaymentRuntimeConfig = {
  provider: PaymentProvider;
  preferredProvider: PaymentProvider;
  providerFamily: PaymentProviderFamily;
  pendingMinutes: number;
  callbackTokenConfigured: boolean;
  callbackPath: string;
  callbackUrl: string;
  callbackUrlConfigured: boolean;
  callbackAuthMode: "shared-token" | "shared-token+hmac";
  manualCollection: PaymentManualCollectionConfig;
  manualCollectionConfigured: boolean;
  hostedGateway: PaymentHostedGatewayConfig;
  hostedGatewayConfigured: boolean;
  hostedGatewayName?: string;
  hostedSignatureConfigured: boolean;
  routing: PaymentCountryRoute;
  routeSummaries: PaymentCountryRoute[];
  routeFallbackReason?: "provider-not-configured";
};

const paymentProviderExpiryMinutes: Record<PaymentProvider, number> = {
  mock: 30,
  manual: 60 * 24 * 3,
  hosted: 30,
  xendit: 30,
  razorpay: 30,
  payu: 30,
};

const routeDefaults: PaymentCountryRoute[] = [
  {
    key: "default",
    countryLabel: "Global fallback",
    provider: process.env.NODE_ENV === "production" ? "manual" : "mock",
    currency: "USD",
    wallets: ["Bank transfer", "Manual confirmation"],
  },
  {
    key: "vn",
    countryCode: "VN",
    countryLabel: "Vietnam",
    provider: "xendit",
    currency: "VND",
    wallets: ["MoMo", "VN bank transfer", "QR payment"],
  },
  {
    key: "th",
    countryCode: "TH",
    countryLabel: "Thailand",
    provider: "xendit",
    currency: "THB",
    wallets: ["PromptPay", "TH bank transfer", "QR payment"],
  },
  {
    key: "my",
    countryCode: "MY",
    countryLabel: "Malaysia",
    provider: "xendit",
    currency: "MYR",
    wallets: ["FPX", "MY bank transfer", "eWallet"],
  },
  {
    key: "in",
    countryCode: "IN",
    countryLabel: "India",
    provider: "razorpay",
    currency: "INR",
    wallets: ["UPI", "NetBanking", "Cards", "Wallet"],
  },
];

function getProviderConfigSlug(provider: PaymentProvider) {
  if (provider === "xendit" || provider === "razorpay" || provider === "payu") {
    return provider;
  }

  return "hosted";
}

function getProviderEnvPrefix(provider: PaymentProvider) {
  switch (getProviderConfigSlug(provider)) {
    case "xendit":
      return "PAYMENT_XENDIT";
    case "razorpay":
      return "PAYMENT_RAZORPAY";
    case "payu":
      return "PAYMENT_PAYU";
    default:
      return "PAYMENT_HOSTED";
  }
}

function getEnvValue(key: string) {
  return process.env[key]?.trim() ?? "";
}

function parseWalletList(value?: string | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCountryCode(value?: string | null) {
  const normalized = String(value ?? "")
    .trim()
    .slice(0, 2)
    .toUpperCase();

  return normalized || undefined;
}

function normalizeCallbackPath(value?: string | null) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return "/api/payments/callback";
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  return `/${trimmed}`;
}

export function normalizePaymentProvider(value?: string | null): PaymentProvider {
  switch ((value ?? "").trim().toLowerCase()) {
    case "manual":
      return "manual";
    case "hosted":
      return "hosted";
    case "xendit":
      return "xendit";
    case "razorpay":
      return "razorpay";
    case "payu":
      return "payu";
    default:
      return "mock";
  }
}

export function getPaymentProviderFamily(provider: PaymentProvider): PaymentProviderFamily {
  if (provider === "mock") {
    return "mock";
  }

  if (provider === "manual") {
    return "manual";
  }

  return "hosted";
}

export function isHostedPaymentProvider(provider: PaymentProvider) {
  return getPaymentProviderFamily(provider) === "hosted";
}

export function getPaymentProviderReferencePrefix(provider: PaymentProvider) {
  switch (provider) {
    case "mock":
      return "MOCK";
    case "manual":
      return "MANUAL";
    case "xendit":
      return "XENDIT";
    case "razorpay":
      return "RAZORPAY";
    case "payu":
      return "PAYU";
    default:
      return "HOSTED";
  }
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
  const labels: Record<
    PaymentProvider,
    { zhCn: string; zhTw: string; en: string; th: string; vi: string; hi: string }
  > = {
    mock: {
      zhCn: "模拟支付通道",
      zhTw: "模擬支付通道",
      en: "Mock gateway",
      th: "ช่องทางชำระเงินจำลอง",
      vi: "Cong thanh toan mo phong",
      hi: "मॉक पेमेंट गेटवे",
    },
    manual: {
      zhCn: "人工审核收款",
      zhTw: "人工審核收款",
      en: "Manual review",
      th: "ตรวจสอบการชำระเงินด้วยตนเอง",
      vi: "Doi soat thanh toan thu cong",
      hi: "मैन्युअल भुगतान सत्यापन",
    },
    hosted: {
      zhCn: "托管支付通道",
      zhTw: "託管支付通道",
      en: "Hosted gateway",
      th: "ช่องทางชำระเงินแบบโฮสต์",
      vi: "Cong thanh toan duoc luu tru",
      hi: "होस्टेड पेमेंट गेटवे",
    },
    xendit: {
      zhCn: "Xendit 通道",
      zhTw: "Xendit 通道",
      en: "Xendit",
      th: "Xendit",
      vi: "Xendit",
      hi: "Xendit",
    },
    razorpay: {
      zhCn: "Razorpay 通道",
      zhTw: "Razorpay 通道",
      en: "Razorpay",
      th: "Razorpay",
      vi: "Razorpay",
      hi: "Razorpay",
    },
    payu: {
      zhCn: "PayU 通道",
      zhTw: "PayU 通道",
      en: "PayU",
      th: "PayU",
      vi: "PayU",
      hi: "PayU",
    },
  };
  const label = labels[provider] ?? labels.mock;

  if (locale === "zh-TW") {
    return label.zhTw;
  }

  if (locale === "en") {
    return label.en;
  }

  if (locale === "th") {
    return label.th;
  }

  if (locale === "vi") {
    return label.vi;
  }

  if (locale === "hi") {
    return label.hi;
  }

  return label.zhCn;
}

export function getPaymentCallbackToken() {
  return process.env.PAYMENT_CALLBACK_TOKEN?.trim() ?? "";
}

function getProviderSigningSecret(provider: PaymentProvider) {
  const prefix = getProviderEnvPrefix(provider);
  return getEnvValue(`${prefix}_SIGNING_SECRET`) || getEnvValue("PAYMENT_HOSTED_SIGNING_SECRET");
}

export function getPaymentHostedSigningSecret(provider: PaymentProvider = getPaymentProvider()) {
  return getProviderSigningSecret(provider);
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

async function getResolvedPaymentBaseConfigFromMap(parameterMap: Map<string, string>) {
  const baseUrl =
    (parameterMap.get("site.base_url") || getPaymentBaseUrl()).replace(/\/+$/, "");
  const callbackPath = normalizeCallbackPath(parameterMap.get("payments.callback_path") || getPaymentCallbackPath());

  return {
    baseUrl,
    callbackPath,
  };
}

export async function getResolvedPaymentCallbackPath() {
  const parameterMap = await getSystemParameterMap(["site.base_url", "payments.callback_path"]);
  const resolved = await getResolvedPaymentBaseConfigFromMap(parameterMap);
  return resolved.callbackPath;
}

export async function getResolvedPaymentPublicUrl(path: string) {
  const parameterMap = await getSystemParameterMap(["site.base_url", "payments.callback_path"]);
  const resolved = await getResolvedPaymentBaseConfigFromMap(parameterMap);

  if (!resolved.baseUrl) {
    return path;
  }

  if (!path.startsWith("/")) {
    return `${resolved.baseUrl}/${path}`;
  }

  return `${resolved.baseUrl}${path}`;
}

export async function getResolvedPaymentCallbackUrl() {
  const parameterMap = await getSystemParameterMap(["site.base_url", "payments.callback_path"]);
  const resolved = await getResolvedPaymentBaseConfigFromMap(parameterMap);

  if (!resolved.baseUrl) {
    return resolved.callbackPath;
  }

  return `${resolved.baseUrl}${resolved.callbackPath}`;
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

export function getPaymentHostedGatewayConfig(provider: PaymentProvider = getPaymentProvider()): PaymentHostedGatewayConfig {
  const prefix = getProviderEnvPrefix(provider);
  const fallbackName = getPaymentProviderLabel(provider, "en");
  const gatewayName = getEnvValue(`${prefix}_GATEWAY_NAME`) || getEnvValue("PAYMENT_HOSTED_GATEWAY_NAME") || fallbackName;
  const checkoutUrl = getEnvValue(`${prefix}_CHECKOUT_URL`) || getEnvValue("PAYMENT_HOSTED_CHECKOUT_URL");
  const merchantId = getEnvValue(`${prefix}_MERCHANT_ID`) || getEnvValue("PAYMENT_HOSTED_MERCHANT_ID");
  const signingSecret = getProviderSigningSecret(provider);

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
  const hostedGateway = getPaymentHostedGatewayConfig(provider);
  const family = getPaymentProviderFamily(provider);
  const routing = routeDefaults[0];

  return {
    provider,
    preferredProvider: provider,
    providerFamily: family,
    pendingMinutes: getPaymentProviderExpiryMinutes(provider),
    callbackTokenConfigured: Boolean(getPaymentCallbackToken()),
    callbackPath: getPaymentCallbackPath(),
    callbackUrl,
    callbackUrlConfigured: callbackUrl.startsWith("http://") || callbackUrl.startsWith("https://"),
    callbackAuthMode: family === "hosted" ? "shared-token+hmac" : "shared-token",
    manualCollection,
    manualCollectionConfigured: manualCollection.configured,
    hostedGateway,
    hostedGatewayConfigured: hostedGateway.configured,
    hostedGatewayName: hostedGateway.gatewayName,
    hostedSignatureConfigured: hostedGateway.signingSecretConfigured,
    routing,
    routeSummaries: routeDefaults,
  };
}

function buildRouteParameterKeys() {
  const keys = ["payments.runtime.default_provider", "site.base_url", "payments.callback_path"];

  for (const route of routeDefaults) {
    keys.push(`payments.routing.${route.key}.provider`);
    keys.push(`payments.routing.${route.key}.currency`);
    keys.push(`payments.routing.${route.key}.wallets`);
    keys.push(`payments.routing.${route.key}.country_label`);
  }

  for (const provider of ["hosted", "xendit", "razorpay", "payu"] as const) {
    keys.push(`payments.provider.${provider}.gateway_name`);
    keys.push(`payments.provider.${provider}.checkout_url`);
    keys.push(`payments.provider.${provider}.merchant_id`);
    keys.push(`payments.provider.${provider}.signing_secret`);
  }

  keys.push("payments.manual.channel_label");
  keys.push("payments.manual.account_name");
  keys.push("payments.manual.account_no");
  keys.push("payments.manual.qr_code_url");
  keys.push("payments.manual.note");

  return keys;
}

function resolveRouteFromMap(
  parameterMap: Map<string, string>,
  route: PaymentCountryRoute,
): PaymentCountryRoute {
  const prefix = `payments.routing.${route.key}`;
  const configuredWallets = parseWalletList(parameterMap.get(`${prefix}.wallets`));

  return {
    ...route,
    provider: normalizePaymentProvider(parameterMap.get(`${prefix}.provider`) || route.provider),
    currency: parameterMap.get(`${prefix}.currency`) || route.currency,
    wallets: configuredWallets.length > 0 ? configuredWallets : route.wallets,
    countryLabel: parameterMap.get(`${prefix}.country_label`) || route.countryLabel,
  };
}

function getResolvedProviderConfigFromMap(
  parameterMap: Map<string, string>,
  provider: PaymentProvider,
): PaymentHostedGatewayConfig {
  const slug = getProviderConfigSlug(provider);
  const envFallback = getPaymentHostedGatewayConfig(provider);
  const gatewayName = parameterMap.get(`payments.provider.${slug}.gateway_name`) || envFallback.gatewayName;
  const checkoutUrl = parameterMap.get(`payments.provider.${slug}.checkout_url`) || envFallback.checkoutUrl;
  const merchantId = parameterMap.get(`payments.provider.${slug}.merchant_id`) || envFallback.merchantId;
  const signingSecret =
    parameterMap.get(`payments.provider.${slug}.signing_secret`) || getPaymentHostedSigningSecret(provider);

  return {
    configured: Boolean(checkoutUrl && merchantId),
    gatewayName,
    checkoutUrl: checkoutUrl || undefined,
    merchantId: merchantId || undefined,
    signingSecretConfigured: Boolean(signingSecret),
  };
}

function getResolvedManualCollectionConfigFromMap(parameterMap: Map<string, string>) {
  const base = getPaymentManualCollectionConfig();
  const channelLabel = parameterMap.get("payments.manual.channel_label") || base.channelLabel;
  const accountName = parameterMap.get("payments.manual.account_name") || base.accountName;
  const accountNo = parameterMap.get("payments.manual.account_no") || base.accountNo;
  const qrCodeUrl = parameterMap.get("payments.manual.qr_code_url") || base.qrCodeUrl;
  const note = parameterMap.get("payments.manual.note") || base.note;

  return {
    configured: Boolean(channelLabel || accountName || accountNo || qrCodeUrl || note),
    channelLabel: channelLabel || undefined,
    accountName: accountName || undefined,
    accountNo: accountNo || undefined,
    qrCodeUrl: qrCodeUrl || undefined,
    note: note || undefined,
  } satisfies PaymentManualCollectionConfig;
}

function getFallbackProvider(
  preferredProvider: PaymentProvider,
  configuredGateway: PaymentHostedGatewayConfig,
  defaultProvider: PaymentProvider,
  parameterMap: Map<string, string>,
) {
  if (!isHostedPaymentProvider(preferredProvider)) {
    return preferredProvider;
  }

  if (configuredGateway.configured && configuredGateway.signingSecretConfigured) {
    return preferredProvider;
  }

  if (defaultProvider !== preferredProvider) {
    const defaultGateway = getResolvedProviderConfigFromMap(parameterMap, defaultProvider);

    if (!isHostedPaymentProvider(defaultProvider) || (defaultGateway.configured && defaultGateway.signingSecretConfigured)) {
      return defaultProvider;
    }
  }

  return "manual";
}

export async function getResolvedPaymentRuntimeConfig(input?: {
  countryCode?: string | null;
}): Promise<PaymentRuntimeConfig> {
  const parameterMap = await getSystemParameterMap(buildRouteParameterKeys());
  const defaultProvider = normalizePaymentProvider(
    parameterMap.get("payments.runtime.default_provider") || getPaymentProvider(),
  );
  const routeSummaries = routeDefaults.map((route) => resolveRouteFromMap(parameterMap, route));
  const countryCode = normalizeCountryCode(input?.countryCode);
  const route =
    routeSummaries.find((item) => item.countryCode === countryCode) ??
    routeSummaries.find((item) => item.key === "default") ??
    routeDefaults[0];
  const preferredProvider = route.provider;
  const preferredGateway = getResolvedProviderConfigFromMap(parameterMap, preferredProvider);
  const provider = getFallbackProvider(preferredProvider, preferredGateway, defaultProvider, parameterMap);
  const hostedGateway = getResolvedProviderConfigFromMap(parameterMap, provider);
  const manualCollection = getResolvedManualCollectionConfigFromMap(parameterMap);
  const baseConfig = await getResolvedPaymentBaseConfigFromMap(parameterMap);
  const callbackUrl =
    baseConfig.baseUrl ? `${baseConfig.baseUrl}${baseConfig.callbackPath}` : baseConfig.callbackPath;
  const family = getPaymentProviderFamily(provider);

  return {
    provider,
    preferredProvider,
    providerFamily: family,
    pendingMinutes: getPaymentProviderExpiryMinutes(provider),
    callbackTokenConfigured: Boolean(getPaymentCallbackToken()),
    callbackPath: baseConfig.callbackPath,
    callbackUrl,
    callbackUrlConfigured: callbackUrl.startsWith("http://") || callbackUrl.startsWith("https://"),
    callbackAuthMode: family === "hosted" ? "shared-token+hmac" : "shared-token",
    manualCollection,
    manualCollectionConfigured: manualCollection.configured,
    hostedGateway,
    hostedGatewayConfigured: hostedGateway.configured,
    hostedGatewayName: hostedGateway.gatewayName,
    hostedSignatureConfigured: hostedGateway.signingSecretConfigured,
    routing: route,
    routeSummaries,
    routeFallbackReason:
      provider !== preferredProvider && isHostedPaymentProvider(preferredProvider)
        ? "provider-not-configured"
        : undefined,
  };
}

export async function getResolvedPaymentHostedGatewayConfig(provider: PaymentProvider) {
  const parameterMap = await getSystemParameterMap(buildRouteParameterKeys());
  return getResolvedProviderConfigFromMap(parameterMap, provider);
}

export async function getResolvedPaymentManualCollectionConfig() {
  const parameterMap = await getSystemParameterMap(buildRouteParameterKeys());
  return getResolvedManualCollectionConfigFromMap(parameterMap);
}
