import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n-config";
import type { UserRole } from "@/lib/types";

type PolicyRecord = {
  role: string;
  description?: string;
  canAccessAdminConsole: boolean;
  canManageContent: boolean;
  canManageFinance: boolean;
  canManageAgents: boolean;
  canManageSystem: boolean;
  canViewReports: boolean;
};

export type AdminSystemMetric = {
  label: string;
  value: string;
  description: string;
};

export type AdminSystemPolicyRecord = PolicyRecord & {
  id: string;
  updatedAt: string;
};

export type AdminSystemAuditRecord = {
  id: string;
  actorDisplayName: string;
  actorRole: string;
  action: string;
  scope: string;
  targetType?: string;
  targetId?: string;
  status: string;
  detail?: string;
  ipAddress?: string;
  createdAt: string;
};

export type AdminSystemAlertChannelRecord = {
  id: string;
  name: string;
  provider: string;
  target: string;
  severityFilter: string;
  status: string;
  note?: string;
  lastTriggeredAt?: string;
  updatedAt: string;
};

export type AdminSystemAlertEventRecord = {
  id: string;
  source: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  detail?: string;
  channelId?: string;
  channelName?: string;
  createdAt: string;
  resolvedAt?: string;
};

export type AdminSystemParameterRecord = {
  id: string;
  key: string;
  value: string;
  category: string;
  description?: string;
  updatedAt: string;
};

export type AdminSystemDashboard = {
  metrics: AdminSystemMetric[];
  policies: AdminSystemPolicyRecord[];
  auditLogs: AdminSystemAuditRecord[];
  alertChannels: AdminSystemAlertChannelRecord[];
  alertEvents: AdminSystemAlertEventRecord[];
  parameters: AdminSystemParameterRecord[];
};

const adminPaths = ["/admin"];
const defaultAppVersion = process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "1.0.0";
const defaultAppChannel = process.env.NEXT_PUBLIC_APP_CHANNEL?.trim() || "web-stable";
const defaultAppNotes =
  process.env.NEXT_PUBLIC_APP_UPDATE_NOTES?.trim() ||
  "Web commercial build with account workspace, notifications, and coin recharge support.";
const globalForAdminSystem = globalThis as typeof globalThis & {
  __signalNineAdminSystemSeedsReady?: boolean;
  __signalNineAdminSystemSeedPromise?: Promise<void>;
};

const defaultRolePolicies: Array<PolicyRecord> = [
  {
    role: "admin",
    description: "Full access to all admin modules.",
    canAccessAdminConsole: true,
    canManageContent: true,
    canManageFinance: true,
    canManageAgents: true,
    canManageSystem: true,
    canViewReports: true,
  },
  {
    role: "operator",
    description: "Content, homepage operations, AI, and report viewing.",
    canAccessAdminConsole: true,
    canManageContent: true,
    canManageFinance: false,
    canManageAgents: false,
    canManageSystem: false,
    canViewReports: true,
  },
  {
    role: "finance",
    description: "Finance and reports access.",
    canAccessAdminConsole: true,
    canManageContent: false,
    canManageFinance: true,
    canManageAgents: false,
    canManageSystem: false,
    canViewReports: true,
  },
  {
    role: "member",
    description: "Front-office member access only.",
    canAccessAdminConsole: false,
    canManageContent: false,
    canManageFinance: false,
    canManageAgents: false,
    canManageSystem: false,
    canViewReports: false,
  },
  {
    role: "visitor",
    description: "Anonymous visitor access only.",
    canAccessAdminConsole: false,
    canManageContent: false,
    canManageFinance: false,
    canManageAgents: false,
    canManageSystem: false,
    canViewReports: false,
  },
];

const defaultSystemParameters = [
  {
    key: "site.base_url",
    value: process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim() || "http://47.238.249.104",
    category: "site",
    description: "Public base URL before domain binding.",
  },
  {
    key: "payments.callback_path",
    value: "/api/payments/callback",
    category: "payments",
    description: "Hosted payment callback path.",
  },
  {
    key: "payments.runtime.default_provider",
    value: process.env.PAYMENT_PROVIDER?.trim() || (process.env.NODE_ENV === "production" ? "manual" : "mock"),
    category: "payments",
    description: "Default active payment provider before country routing is applied.",
  },
  {
    key: "payments.manual.channel_label",
    value: process.env.PAYMENT_MANUAL_CHANNEL_LABEL?.trim() || "Manual bank transfer",
    category: "payments",
    description: "Member-facing manual collection channel label.",
  },
  {
    key: "payments.manual.account_name",
    value: process.env.PAYMENT_MANUAL_ACCOUNT_NAME?.trim() || "",
    category: "payments",
    description: "Member-facing manual collection account name.",
  },
  {
    key: "payments.manual.account_no",
    value: process.env.PAYMENT_MANUAL_ACCOUNT_NO?.trim() || "",
    category: "payments",
    description: "Member-facing manual collection account / wallet identifier.",
  },
  {
    key: "payments.manual.qr_code_url",
    value: process.env.PAYMENT_MANUAL_QR_CODE_URL?.trim() || "",
    category: "payments",
    description: "Member-facing manual collection QR code URL.",
  },
  {
    key: "payments.manual.note",
    value: process.env.PAYMENT_MANUAL_NOTE?.trim() || "",
    category: "payments",
    description: "Member-facing manual collection note.",
  },
  {
    key: "payments.member.guide",
    value: "Create a recharge request, transfer with the payment reference, then wait for finance review.",
    category: "payments",
    description: "Member-facing recharge guide shown on recharge pages.",
  },
  {
    key: "payments.routing.default.provider",
    value: process.env.NODE_ENV === "production" ? "manual" : "mock",
    category: "payments",
    description: "Fallback country route provider when no specific country match is configured.",
  },
  {
    key: "payments.routing.default.currency",
    value: "USD",
    category: "payments",
    description: "Fallback settlement currency label.",
  },
  {
    key: "payments.routing.default.wallets",
    value: "Bank transfer,Manual confirmation",
    category: "payments",
    description: "Fallback wallet or payment method labels shown in checkout.",
  },
  {
    key: "payments.routing.default.country_label",
    value: "Global fallback",
    category: "payments",
    description: "Fallback country or region label shown in checkout.",
  },
  {
    key: "payments.routing.vn.provider",
    value: "xendit",
    category: "payments",
    description: "Preferred routed provider for Vietnam.",
  },
  {
    key: "payments.routing.vn.currency",
    value: "VND",
    category: "payments",
    description: "Displayed currency for Vietnam checkout experiences.",
  },
  {
    key: "payments.routing.vn.wallets",
    value: "MoMo,VN bank transfer,QR payment",
    category: "payments",
    description: "Displayed wallet methods for Vietnam.",
  },
  {
    key: "payments.routing.vn.country_label",
    value: "Vietnam",
    category: "payments",
    description: "Country label for Vietnam route.",
  },
  {
    key: "payments.routing.th.provider",
    value: "xendit",
    category: "payments",
    description: "Preferred routed provider for Thailand.",
  },
  {
    key: "payments.routing.th.currency",
    value: "THB",
    category: "payments",
    description: "Displayed currency for Thailand checkout experiences.",
  },
  {
    key: "payments.routing.th.wallets",
    value: "PromptPay,TH bank transfer,QR payment",
    category: "payments",
    description: "Displayed wallet methods for Thailand.",
  },
  {
    key: "payments.routing.th.country_label",
    value: "Thailand",
    category: "payments",
    description: "Country label for Thailand route.",
  },
  {
    key: "payments.routing.my.provider",
    value: "xendit",
    category: "payments",
    description: "Preferred routed provider for Malaysia.",
  },
  {
    key: "payments.routing.my.currency",
    value: "MYR",
    category: "payments",
    description: "Displayed currency for Malaysia checkout experiences.",
  },
  {
    key: "payments.routing.my.wallets",
    value: "FPX,MY bank transfer,eWallet",
    category: "payments",
    description: "Displayed wallet methods for Malaysia.",
  },
  {
    key: "payments.routing.my.country_label",
    value: "Malaysia",
    category: "payments",
    description: "Country label for Malaysia route.",
  },
  {
    key: "payments.routing.in.provider",
    value: "razorpay",
    category: "payments",
    description: "Preferred routed provider for India.",
  },
  {
    key: "payments.routing.in.currency",
    value: "INR",
    category: "payments",
    description: "Displayed currency for India checkout experiences.",
  },
  {
    key: "payments.routing.in.wallets",
    value: "UPI,NetBanking,Cards,Wallet",
    category: "payments",
    description: "Displayed wallet methods for India.",
  },
  {
    key: "payments.routing.in.country_label",
    value: "India",
    category: "payments",
    description: "Country label for India route.",
  },
  {
    key: "payments.provider.xendit.gateway_name",
    value: "Xendit",
    category: "payments",
    description: "Gateway label used when Xendit is selected.",
  },
  {
    key: "payments.provider.xendit.checkout_url",
    value: process.env.PAYMENT_XENDIT_CHECKOUT_URL?.trim() || "",
    category: "payments",
    description: "Hosted checkout URL for Xendit.",
  },
  {
    key: "payments.provider.xendit.merchant_id",
    value: process.env.PAYMENT_XENDIT_MERCHANT_ID?.trim() || "",
    category: "payments",
    description: "Merchant identifier for Xendit routing.",
  },
  {
    key: "payments.provider.xendit.signing_secret",
    value: process.env.PAYMENT_XENDIT_SIGNING_SECRET?.trim() || "",
    category: "payments",
    description: "Signing secret for Xendit callback verification.",
  },
  {
    key: "payments.provider.razorpay.gateway_name",
    value: "Razorpay",
    category: "payments",
    description: "Gateway label used when Razorpay is selected.",
  },
  {
    key: "payments.provider.razorpay.checkout_url",
    value: process.env.PAYMENT_RAZORPAY_CHECKOUT_URL?.trim() || "",
    category: "payments",
    description: "Hosted checkout URL for Razorpay.",
  },
  {
    key: "payments.provider.razorpay.merchant_id",
    value: process.env.PAYMENT_RAZORPAY_MERCHANT_ID?.trim() || "",
    category: "payments",
    description: "Merchant identifier for Razorpay routing.",
  },
  {
    key: "payments.provider.razorpay.signing_secret",
    value: process.env.PAYMENT_RAZORPAY_SIGNING_SECRET?.trim() || "",
    category: "payments",
    description: "Signing secret for Razorpay callback verification.",
  },
  {
    key: "payments.provider.payu.gateway_name",
    value: "PayU",
    category: "payments",
    description: "Gateway label used when PayU is selected.",
  },
  {
    key: "payments.provider.payu.checkout_url",
    value: process.env.PAYMENT_PAYU_CHECKOUT_URL?.trim() || "",
    category: "payments",
    description: "Hosted checkout URL for PayU.",
  },
  {
    key: "payments.provider.payu.merchant_id",
    value: process.env.PAYMENT_PAYU_MERCHANT_ID?.trim() || "",
    category: "payments",
    description: "Merchant identifier for PayU routing.",
  },
  {
    key: "payments.provider.payu.signing_secret",
    value: process.env.PAYMENT_PAYU_SIGNING_SECRET?.trim() || "",
    category: "payments",
    description: "Signing secret for PayU callback verification.",
  },
  {
    key: "sync.strategy",
    value: "free-api-primary + scrape-fallback",
    category: "sync",
    description: "Current sync pipeline strategy.",
  },
  {
    key: "site.timezone_policy",
    value: "UTC",
    category: "site",
    description: "Canonical site timezone policy for match, report, and admin displays.",
  },
  {
    key: "site.timezone_label",
    value: "UTC+0",
    category: "site",
    description: "Member-facing timezone label exposed in APIs and admin runtime.",
  },
  {
    key: "reports.export_limit",
    value: "100000",
    category: "reports",
    description: "Soft export row cap per CSV.",
  },
  {
    key: "system.audit.retention_days",
    value: "180",
    category: "system",
    description: "Audit log retention window in days.",
  },
  {
    key: "app.version.current",
    value: defaultAppVersion,
    category: "app",
    description: "Current web / H5 commercial build version.",
  },
  {
    key: "app.version.channel",
    value: defaultAppChannel,
    category: "app",
    description: "Release channel exposed to shell apps and web install prompts.",
  },
  {
    key: "app.version.notes",
    value: defaultAppNotes,
    category: "app",
    description: "Current release notes displayed by the version API.",
  },
  {
    key: "app.version.download_url",
    value: process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL?.trim() || "",
    category: "app",
    description: "Download URL reserved for future APK distribution.",
  },
  {
    key: "app.version.minimum_supported",
    value: defaultAppVersion,
    category: "app",
    description: "Minimum supported version before soft or force update prompts.",
  },
  {
    key: "app.version.hot_update",
    value: defaultAppVersion,
    category: "app",
    description: "Hot-update asset version exposed to shell apps and H5 containers.",
  },
  {
    key: "app.version.force_update",
    value: "false",
    category: "app",
    description: "Whether the current minimum version should be treated as a forced update.",
  },
  {
    key: "app.version.update_strategy",
    value: "web-cache-refresh",
    category: "app",
    description: "Current update strategy label used by the version endpoint.",
  },
  {
    key: "app.web.install_enabled",
    value: process.env.APP_WEB_INSTALL_ENABLED?.trim() || "true",
    category: "app",
    description: "Controls whether H5 install prompts are exposed.",
  },
  {
    key: "app.web.fullscreen_enabled",
    value: process.env.APP_WEB_FULLSCREEN_ENABLED?.trim() || "true",
    category: "app",
    description: "Controls whether fullscreen-compatible shell hints are exposed.",
  },
  {
    key: "app.web.asset_version",
    value: process.env.APP_WEB_ASSET_VERSION?.trim() || defaultAppVersion,
    category: "app",
    description: "Static asset cache-busting version for H5 / shell integration.",
  },
  {
    key: "app.android.package_id",
    value: process.env.ANDROID_APP_PACKAGE_ID?.trim() || "",
    category: "app",
    description: "Android shell package id used by asset links and release tracking.",
  },
  {
    key: "app.android.version_code",
    value: process.env.ANDROID_APP_VERSION_CODE?.trim() || "",
    category: "app",
    description: "Android shell versionCode mirrored into the web admin runtime.",
  },
  {
    key: "app.cdn.asset_prefix",
    value: process.env.NEXT_PUBLIC_CDN_ASSET_PREFIX?.trim() || "",
    category: "app",
    description: "Static asset prefix used when the web shell is fronted by a CDN origin.",
  },
  {
    key: "app.apk.package_id",
    value: process.env.APP_APK_PACKAGE_ID?.trim() || "com.nowscore.signalnine",
    category: "app",
    description: "Android package identifier reserved for H5 shell packaging.",
  },
  {
    key: "app.apk.splash_background",
    value: process.env.APP_APK_SPLASH_BACKGROUND?.trim() || "#07111f",
    category: "app",
    description: "Splash background color used by H5 shell and future APK wrappers.",
  },
  {
    key: "app.push.delivery_mode",
    value: process.env.APP_PUSH_DELIVERY_MODE?.trim() || "in-site+browser",
    category: "app",
    description: "Current push delivery mode. External providers can be added later.",
  },
  {
    key: "app.push.webpush_enabled",
    value: process.env.APP_PUSH_WEBPUSH_ENABLED?.trim() || "true",
    category: "app",
    description: "Whether the browser push bridge should expose web-push readiness.",
  },
  {
    key: "app.push.webpush_public_key",
    value: process.env.WEB_PUSH_PUBLIC_KEY?.trim() || "",
    category: "app",
    description: "Optional public VAPID key mirrored into the app version API for browser push subscription.",
  },
  {
    key: "app.cdn.public_asset_host",
    value: process.env.NEXT_PUBLIC_CDN_PUBLIC_HOST?.trim() || "",
    category: "app",
    description: "Optional public CDN host used for shell metadata and deployment checks.",
  },
  {
    key: "agents.level1.direct_rate",
    value: "32",
    category: "agents",
    description: "Direct commission rate for level1 agents.",
  },
  {
    key: "agents.level1.downstream_rate",
    value: "8",
    category: "agents",
    description: "Downstream commission rate for level1 agents.",
  },
  {
    key: "agents.level2.direct_rate",
    value: "45",
    category: "agents",
    description: "Direct commission rate for level2 agents.",
  },
  {
    key: "agents.level2.downstream_rate",
    value: "12",
    category: "agents",
    description: "Downstream commission rate for level2 agents.",
  },
  {
    key: "agents.level3.direct_rate",
    value: "55",
    category: "agents",
    description: "Direct commission rate for level3 agents.",
  },
  {
    key: "agents.level3.downstream_rate",
    value: "18",
    category: "agents",
    description: "Downstream commission rate for level3 agents.",
  },
  {
    key: "agents.level2.min_referred_users",
    value: "30",
    category: "agents",
    description: "Minimum referred users required for auto-promotion to level2.",
  },
  {
    key: "agents.level2.min_monthly_recharge",
    value: "30000",
    category: "agents",
    description: "Minimum monthly attributed recharge required for auto-promotion to level2.",
  },
  {
    key: "agents.level3.min_referred_users",
    value: "80",
    category: "agents",
    description: "Minimum referred users required for auto-promotion to level3.",
  },
  {
    key: "agents.level3.min_monthly_recharge",
    value: "100000",
    category: "agents",
    description: "Minimum monthly attributed recharge required for auto-promotion to level3.",
  },
  {
    key: "agents.weekly_settlement_minimum",
    value: "500",
    category: "agents",
    description: "Minimum unsettled commission required to generate a weekly settlement request.",
  },
  {
    key: "assistant.ai.enabled",
    value: process.env.OPENAI_API_KEY?.trim() ? "true" : "false",
    category: "assistant",
    description: "Enable AI-powered assistant replies. When disabled, the assistant falls back to keyword matching.",
  },
  {
    key: "assistant.ai.model",
    value: process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
    category: "assistant",
    description: "AI model used for assistant replies. Preset options: gpt-5.4-mini, gemini-2.0-flash-preview, deepseek-v3.2. Custom models are also supported.",
  },
  {
    key: "assistant.ai.base_url",
    value: process.env.OPENAI_BASE_URL?.trim() || "https://api.tu-zi.com/v1",
    category: "assistant",
    description: "OpenAI-compatible API base URL. Supports any relay or proxy that follows the /v1/chat/completions interface.",
  },
  {
    key: "assistant.ai.api_key",
    value: process.env.OPENAI_API_KEY?.trim() || "",
    category: "assistant",
    description: "API key for the AI provider. Stored in the database and takes precedence over the OPENAI_API_KEY environment variable.",
  },
];

function safeRevalidate(paths: string[]) {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        (!error.message.includes("static generation store missing") &&
          !error.message.includes("during render which is unsupported"))
      ) {
        throw error;
      }
    }
  }
}

function localizeText(
  value: {
    zhCn: string;
    zhTw: string;
    en: string;
  },
  locale: Locale,
) {
  if (locale === "zh-TW") {
    return value.zhTw;
  }

  if (locale === "en") {
    return value.en;
  }

  return value.zhCn;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function parseOptionalText(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw || undefined;
}

function parseBoolean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim() === "on";
}

function normalizeAlertSeverity(value: string) {
  if (value === "info" || value === "warn" || value === "error" || value === "critical") {
    return value;
  }

  return "warn";
}

const automatedAlertSources = [
  "payment-callback-monitor",
  "sync-monitor",
  "finance-reconciliation-monitor",
  "assistant-handoff-monitor",
] as const;

type AutomatedSystemAlertInput = {
  eventKey: string;
  source: (typeof automatedAlertSources)[number];
  title: string;
  message: string;
  severity: "info" | "warn" | "error" | "critical";
  detail?: string;
};

function severityMatchesFilter(filter: string, severity: string) {
  const items = filter
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (items.length === 0) {
    return true;
  }

  return items.includes(severity.toLowerCase());
}

async function resolveAlertChannelId(severity: AutomatedSystemAlertInput["severity"]) {
  const channels = await prisma.systemAlertChannel.findMany({
    where: {
      status: "active",
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      severityFilter: true,
    },
  });

  return channels.find((item) => severityMatchesFilter(item.severityFilter, severity))?.id ?? null;
}

async function upsertAutomatedSystemAlert(input: AutomatedSystemAlertInput) {
  const existing = await prisma.systemAlertEvent.findUnique({
    where: { eventKey: input.eventKey },
    select: { id: true, status: true, channelId: true },
  });
  const channelId = await resolveAlertChannelId(input.severity);

  const event = existing
    ? await prisma.systemAlertEvent.update({
        where: { eventKey: input.eventKey },
        data: {
          source: input.source,
          title: input.title,
          message: input.message,
          severity: input.severity,
          status: "open",
          detail: input.detail ?? null,
          resolvedAt: null,
          channelId,
        },
      })
    : await prisma.systemAlertEvent.create({
        data: {
          eventKey: input.eventKey,
          source: input.source,
          title: input.title,
          message: input.message,
          severity: input.severity,
          status: "open",
          detail: input.detail ?? null,
          channelId,
        },
      });

  if (channelId) {
    await prisma.systemAlertChannel.update({
      where: { id: channelId },
      data: {
        lastTriggeredAt: new Date(),
      },
    });
  }

  return {
    event,
    state: existing ? (existing.status === "resolved" ? "reopened" : "updated") : "created",
  };
}

async function resolveClearedAutomatedAlerts(activeEventKeys: Set<string>) {
  const staleOpenAlerts = await prisma.systemAlertEvent.findMany({
    where: {
      status: "open",
      source: {
        in: [...automatedAlertSources],
      },
    },
    select: {
      id: true,
      eventKey: true,
    },
  });

  const idsToResolve = staleOpenAlerts
    .filter((item) => item.eventKey && !activeEventKeys.has(item.eventKey))
    .map((item) => item.id);

  if (idsToResolve.length === 0) {
    return 0;
  }

  const result = await prisma.systemAlertEvent.updateMany({
    where: {
      id: {
        in: idsToResolve,
      },
    },
    data: {
      status: "resolved",
      resolvedAt: new Date(),
    },
  });

  return result.count;
}

function getDefaultRolePolicy(role: string): PolicyRecord {
  return defaultRolePolicies.find((item) => item.role === role) ?? {
    role,
    description: "Custom role policy.",
    canAccessAdminConsole: false,
    canManageContent: false,
    canManageFinance: false,
    canManageAgents: false,
    canManageSystem: false,
    canViewReports: false,
  };
}

async function ensureAdminSystemSeeds() {
  if (globalForAdminSystem.__signalNineAdminSystemSeedsReady) {
    return;
  }

  if (!globalForAdminSystem.__signalNineAdminSystemSeedPromise) {
    globalForAdminSystem.__signalNineAdminSystemSeedPromise = (async () => {
      const [roles, parameters] = await Promise.all([
        prisma.adminRolePolicy.findMany({
          select: { role: true },
        }),
        prisma.systemParameter.findMany({
          select: { key: true },
        }),
      ]);
      const existingRoles = new Set(roles.map((item) => item.role));
      const existingKeys = new Set(parameters.map((item) => item.key));

      const missingPolicies = defaultRolePolicies.filter((item) => !existingRoles.has(item.role));
      const missingParameters = defaultSystemParameters.filter((item) => !existingKeys.has(item.key));

      if (missingPolicies.length === 0 && missingParameters.length === 0) {
        globalForAdminSystem.__signalNineAdminSystemSeedsReady = true;
        return;
      }

      for (const policy of missingPolicies) {
        await prisma.adminRolePolicy.upsert({
          where: { role: policy.role },
          update: {},
          create: policy,
        });
      }

      for (const parameter of missingParameters) {
        await prisma.systemParameter.upsert({
          where: { key: parameter.key },
          update: {},
          create: parameter,
        });
      }

      globalForAdminSystem.__signalNineAdminSystemSeedsReady = true;
    })().finally(() => {
      globalForAdminSystem.__signalNineAdminSystemSeedPromise = undefined;
    });
  }

  await globalForAdminSystem.__signalNineAdminSystemSeedPromise;
}

export async function getRolePolicyEntitlements(role: UserRole | string) {
  const stored = await prisma.adminRolePolicy.findUnique({
    where: { role },
  });

  return stored ?? getDefaultRolePolicy(role);
}

export async function recordAdminAuditLog(input: {
  actorUserId?: string | null;
  actorDisplayName: string;
  actorRole: string;
  action: string;
  scope: string;
  targetType?: string;
  targetId?: string;
  status?: string;
  detail?: string;
  ipAddress?: string;
}) {
  await prisma.adminAuditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorDisplayName: input.actorDisplayName,
      actorRole: input.actorRole,
      action: input.action,
      scope: input.scope,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      status: input.status ?? "success",
      detail: input.detail ?? null,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

export async function getAdminSystemDashboard(locale: Locale): Promise<AdminSystemDashboard> {
  await ensureAdminSystemSeeds();

  const [policiesRaw, auditLogsRaw, channelsRaw, alertsRaw, parametersRaw] = await Promise.all([
    prisma.adminRolePolicy.findMany({
      orderBy: [{ canAccessAdminConsole: "desc" }, { role: "asc" }],
    }),
    prisma.adminAuditLog.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
    }),
    prisma.systemAlertChannel.findMany({
      take: 12,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.systemAlertEvent.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
      include: {
        channel: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.systemParameter.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    }),
  ]);

  const openAlerts = alertsRaw.filter((item) => item.status === "open").length;
  const activeChannels = channelsRaw.filter((item) => item.status === "active").length;
  const successfulAuditLogs = auditLogsRaw.filter((item) => item.status === "success").length;
  const adminRoles = policiesRaw.filter((item) => item.canAccessAdminConsole).length;

  return {
    metrics: [
      {
        label: localizeText({ zhCn: "后台角色策略", zhTw: "後台角色策略", en: "Role policies" }, locale),
        value: formatNumber(adminRoles),
        description: localizeText(
          {
            zhCn: "具备后台入口权限的角色数量。",
            zhTw: "具備後台入口權限的角色數量。",
            en: "Roles that can enter the admin console.",
          },
          locale,
        ),
      },
      {
        label: localizeText({ zhCn: "最近审计日志", zhTw: "最近審計日誌", en: "Recent audit logs" }, locale),
        value: formatNumber(auditLogsRaw.length),
        description: localizeText(
          {
            zhCn: `成功 ${formatNumber(successfulAuditLogs)} 条，覆盖最近后台动作。`,
            zhTw: `成功 ${formatNumber(successfulAuditLogs)} 條，覆蓋最近後台動作。`,
            en: `${formatNumber(successfulAuditLogs)} successful items in the latest audit trail.`,
          },
          locale,
        ),
      },
      {
        label: localizeText({ zhCn: "启用告警通道", zhTw: "啟用告警通道", en: "Active alert channels" }, locale),
        value: formatNumber(activeChannels),
        description: localizeText(
          {
            zhCn: `当前打开告警 ${formatNumber(openAlerts)} 条。`,
            zhTw: `當前打開告警 ${formatNumber(openAlerts)} 條。`,
            en: `${formatNumber(openAlerts)} open alert events right now.`,
          },
          locale,
        ),
      },
      {
        label: localizeText({ zhCn: "系统参数项", zhTw: "系統參數項", en: "System parameters" }, locale),
        value: formatNumber(parametersRaw.length),
        description: localizeText(
          {
            zhCn: "运行环境、同步、支付和报表开关集中管理。",
            zhTw: "運行環境、同步、支付和報表開關集中管理。",
            en: "Runtime, sync, payment, and report switches in one place.",
          },
          locale,
        ),
      },
    ],
    policies: policiesRaw.map((item) => ({
      id: item.id,
      role: item.role,
      description: item.description ?? undefined,
      canAccessAdminConsole: item.canAccessAdminConsole,
      canManageContent: item.canManageContent,
      canManageFinance: item.canManageFinance,
      canManageAgents: item.canManageAgents,
      canManageSystem: item.canManageSystem,
      canViewReports: item.canViewReports,
      updatedAt: item.updatedAt.toISOString(),
    })),
    auditLogs: auditLogsRaw.map((item) => ({
      id: item.id,
      actorDisplayName: item.actorDisplayName,
      actorRole: item.actorRole,
      action: item.action,
      scope: item.scope,
      targetType: item.targetType ?? undefined,
      targetId: item.targetId ?? undefined,
      status: item.status,
      detail: item.detail ?? undefined,
      ipAddress: item.ipAddress ?? undefined,
      createdAt: item.createdAt.toISOString(),
    })),
    alertChannels: channelsRaw.map((item) => ({
      id: item.id,
      name: item.name,
      provider: item.provider,
      target: item.target,
      severityFilter: item.severityFilter,
      status: item.status,
      note: item.note ?? undefined,
      lastTriggeredAt: item.lastTriggeredAt?.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    alertEvents: alertsRaw.map((item) => ({
      id: item.id,
      source: item.source,
      title: item.title,
      message: item.message,
      severity: item.severity,
      status: item.status,
      detail: item.detail ?? undefined,
      channelId: item.channelId ?? undefined,
      channelName: item.channel?.name ?? undefined,
      createdAt: item.createdAt.toISOString(),
      resolvedAt: item.resolvedAt?.toISOString(),
    })),
    parameters: parametersRaw.map((item) => ({
      id: item.id,
      key: item.key,
      value: item.value,
      category: item.category,
      description: item.description ?? undefined,
      updatedAt: item.updatedAt.toISOString(),
    })),
  };
}

export async function saveAdminRolePolicy(formData: FormData) {
  const role = String(formData.get("role") || "").trim();

  if (!role) {
    throw new Error("SYSTEM_ROLE_POLICY_INVALID");
  }

  await prisma.adminRolePolicy.upsert({
    where: { role },
    update: {
      description: parseOptionalText(formData.get("description")) ?? null,
      canAccessAdminConsole: parseBoolean(formData.get("canAccessAdminConsole")),
      canManageContent: parseBoolean(formData.get("canManageContent")),
      canManageFinance: parseBoolean(formData.get("canManageFinance")),
      canManageAgents: parseBoolean(formData.get("canManageAgents")),
      canManageSystem: parseBoolean(formData.get("canManageSystem")),
      canViewReports: parseBoolean(formData.get("canViewReports")),
    },
    create: {
      role,
      description: parseOptionalText(formData.get("description")) ?? null,
      canAccessAdminConsole: parseBoolean(formData.get("canAccessAdminConsole")),
      canManageContent: parseBoolean(formData.get("canManageContent")),
      canManageFinance: parseBoolean(formData.get("canManageFinance")),
      canManageAgents: parseBoolean(formData.get("canManageAgents")),
      canManageSystem: parseBoolean(formData.get("canManageSystem")),
      canViewReports: parseBoolean(formData.get("canViewReports")),
    },
  });

  safeRevalidate(adminPaths);
}

export async function saveSystemParameter(formData: FormData) {
  const key = String(formData.get("key") || "").trim();
  const value = String(formData.get("value") || "").trim();

  if (!key || !value) {
    throw new Error("SYSTEM_PARAMETER_INVALID");
  }

  await prisma.systemParameter.upsert({
    where: { key },
    update: {
      value,
      category: String(formData.get("category") || "general").trim() || "general",
      description: parseOptionalText(formData.get("description")) ?? null,
    },
    create: {
      key,
      value,
      category: String(formData.get("category") || "general").trim() || "general",
      description: parseOptionalText(formData.get("description")) ?? null,
    },
  });

  safeRevalidate(adminPaths);
}

export async function saveSystemAlertChannel(formData: FormData) {
  const id = parseOptionalText(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const provider = String(formData.get("provider") || "").trim();
  const target = String(formData.get("target") || "").trim();

  if (!name || !provider || !target) {
    throw new Error("SYSTEM_ALERT_CHANNEL_INVALID");
  }

  const payload = {
    name,
    provider,
    target,
    severityFilter: String(formData.get("severityFilter") || "warn,error").trim() || "warn,error",
    status: String(formData.get("status") || "active").trim() || "active",
    note: parseOptionalText(formData.get("note")) ?? null,
  };

  if (id) {
    await prisma.systemAlertChannel.update({
      where: { id },
      data: payload,
    });
  } else {
    await prisma.systemAlertChannel.create({
      data: payload,
    });
  }

  safeRevalidate(adminPaths);
}

export async function saveSystemAlertEvent(formData: FormData) {
  const source = String(formData.get("source") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!source || !title || !message) {
    throw new Error("SYSTEM_ALERT_EVENT_INVALID");
  }

  await prisma.systemAlertEvent.create({
    data: {
      source,
      title,
      message,
      severity: normalizeAlertSeverity(String(formData.get("severity") || "warn")),
      status: "open",
      detail: parseOptionalText(formData.get("detail")) ?? null,
      channelId: parseOptionalText(formData.get("channelId")) ?? null,
    },
  });

  safeRevalidate(adminPaths);
}

export async function resolveSystemAlertEvent(id: string) {
  if (!id) {
    throw new Error("SYSTEM_ALERT_EVENT_INVALID");
  }

  await prisma.systemAlertEvent.update({
    where: { id },
    data: {
      status: "resolved",
      resolvedAt: new Date(),
    },
  });

  safeRevalidate(adminPaths);
}

export async function getSystemParameterMap(keys?: string[]) {
  await ensureAdminSystemSeeds();

  const rows = await prisma.systemParameter.findMany({
    where: keys?.length
      ? {
          key: {
            in: keys,
          },
        }
      : undefined,
    select: {
      key: true,
      value: true,
    },
  });

  return new Map(rows.map((item) => [item.key, item.value.trim()]));
}

export async function pruneAdminAuditLogs(retentionDays?: number) {
  const parameterMap =
    typeof retentionDays === "number"
      ? null
      : await getSystemParameterMap(["system.audit.retention_days"]);
  const configuredDays =
    typeof retentionDays === "number"
      ? retentionDays
      : Number.parseInt(parameterMap?.get("system.audit.retention_days") || "180", 10);
  const days = Number.isFinite(configuredDays) && configuredDays > 0 ? configuredDays : 180;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await prisma.adminAuditLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoff,
      },
    },
  });

  safeRevalidate(adminPaths);

  return {
    deletedCount: result.count,
    retentionDays: days,
    cutoff: cutoff.toISOString(),
  };
}

export async function runSystemAlertAutomationScan() {
  await ensureAdminSystemSeeds();

  const now = new Date();
  const paymentCutoff = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3);
  const syncSuccessCutoff = new Date(now.getTime() - 1000 * 60 * 90);
  const stuckSyncCutoff = new Date(now.getTime() - 1000 * 60 * 20);
  const financeCutoff = new Date(now.getTime() - 1000 * 60 * 60 * 12);
  const handoffCutoff = new Date(now.getTime() - 1000 * 60 * 60 * 2);

  const [
    callbackExceptions,
    latestCompletedSyncRun,
    staleRunningSyncRuns,
    overdueFinanceIssues,
    staleHandoffs,
  ] = await Promise.all([
    prisma.paymentCallbackEvent.findMany({
      where: {
        processingStatus: {
          in: ["conflict", "failed"],
        },
        lastSeenAt: {
          gte: paymentCutoff,
        },
      },
      orderBy: [{ lastSeenAt: "desc" }],
      take: 20,
      select: {
        id: true,
        provider: true,
        orderType: true,
        orderId: true,
        paymentReference: true,
        providerOrderId: true,
        processingStatus: true,
        processingMessage: true,
        duplicateCount: true,
        lastSeenAt: true,
      },
    }),
    prisma.syncRun.findFirst({
      where: {
        status: {
          in: ["completed", "completed_with_errors"],
        },
      },
      orderBy: [{ finishedAt: "desc" }, { startedAt: "desc" }],
      select: {
        id: true,
        scope: true,
        status: true,
        finishedAt: true,
      },
    }),
    prisma.syncRun.findMany({
      where: {
        status: "running",
        startedAt: {
          lte: stuckSyncCutoff,
        },
      },
      orderBy: [{ startedAt: "asc" }],
      select: {
        id: true,
        scope: true,
        source: true,
        startedAt: true,
      },
    }),
    prisma.financeReconciliationIssue.findMany({
      where: {
        status: {
          in: ["open", "in_progress"],
        },
        updatedAt: {
          lte: financeCutoff,
        },
      },
      orderBy: [{ severity: "desc" }, { updatedAt: "asc" }],
      take: 20,
      select: {
        id: true,
        scope: true,
        summary: true,
        severity: true,
        assignedToDisplayName: true,
        updatedAt: true,
      },
    }),
    prisma.assistantHandoffRequest.findMany({
      where: {
        status: "pending",
        updatedAt: {
          lte: handoffCutoff,
        },
      },
      orderBy: [{ updatedAt: "asc" }],
      take: 20,
      select: {
        id: true,
        locale: true,
        contactName: true,
        contactMethod: true,
        updatedAt: true,
      },
    }),
  ]);

  const activeEventKeys = new Set<string>();
  let createdCount = 0;
  let reopenedCount = 0;
  let updatedCount = 0;

  for (const item of callbackExceptions) {
    const eventKey = `payment-callback:${item.id}`;
    activeEventKeys.add(eventKey);
    const result = await upsertAutomatedSystemAlert({
      eventKey,
      source: "payment-callback-monitor",
      title: item.processingStatus === "conflict" ? "Payment callback conflict" : "Payment callback failed",
      message: `${item.provider} ${item.orderType} callback requires review.`,
      severity: item.processingStatus === "conflict" ? "error" : "warn",
      detail: [
        item.paymentReference ? `paymentReference=${item.paymentReference}` : "",
        item.providerOrderId ? `providerOrderId=${item.providerOrderId}` : "",
        item.orderId ? `orderId=${item.orderId}` : "",
        item.processingMessage ? `message=${item.processingMessage}` : "",
        item.duplicateCount > 0 ? `duplicateCount=${item.duplicateCount}` : "",
        `lastSeenAt=${item.lastSeenAt.toISOString()}`,
      ]
        .filter(Boolean)
        .join(" | "),
    });

    if (result.state === "created") createdCount += 1;
    else if (result.state === "reopened") reopenedCount += 1;
    else updatedCount += 1;
  }

  if (!latestCompletedSyncRun || !latestCompletedSyncRun.finishedAt || latestCompletedSyncRun.finishedAt < syncSuccessCutoff) {
    const eventKey = "sync:no-recent-success";
    activeEventKeys.add(eventKey);
    const result = await upsertAutomatedSystemAlert({
      eventKey,
      source: "sync-monitor",
      title: "Sync pipeline has no recent successful run",
      message: "No completed sync run was found within the freshness window.",
      severity: "error",
      detail: latestCompletedSyncRun?.finishedAt
        ? `lastFinishedAt=${latestCompletedSyncRun.finishedAt.toISOString()} | scope=${latestCompletedSyncRun.scope} | status=${latestCompletedSyncRun.status}`
        : "No completed sync run found.",
    });

    if (result.state === "created") createdCount += 1;
    else if (result.state === "reopened") reopenedCount += 1;
    else updatedCount += 1;
  }

  for (const item of staleRunningSyncRuns) {
    const eventKey = `sync:stuck-run:${item.id}`;
    activeEventKeys.add(eventKey);
    const result = await upsertAutomatedSystemAlert({
      eventKey,
      source: "sync-monitor",
      title: "Sync run appears to be stuck",
      message: `${item.scope} has been running beyond the expected window.`,
      severity: "warn",
      detail: `runId=${item.id} | source=${item.source} | startedAt=${item.startedAt.toISOString()}`,
    });

    if (result.state === "created") createdCount += 1;
    else if (result.state === "reopened") reopenedCount += 1;
    else updatedCount += 1;
  }

  for (const item of overdueFinanceIssues) {
    const eventKey = `finance-reconciliation:${item.id}`;
    activeEventKeys.add(eventKey);
    const result = await upsertAutomatedSystemAlert({
      eventKey,
      source: "finance-reconciliation-monitor",
      title: "Overdue reconciliation issue requires follow-up",
      message: item.summary,
      severity: item.severity === "high" ? "error" : "warn",
      detail: [
        `scope=${item.scope}`,
        item.assignedToDisplayName ? `assignee=${item.assignedToDisplayName}` : "assignee=unassigned",
        `updatedAt=${item.updatedAt.toISOString()}`,
      ].join(" | "),
    });

    if (result.state === "created") createdCount += 1;
    else if (result.state === "reopened") reopenedCount += 1;
    else updatedCount += 1;
  }

  for (const item of staleHandoffs) {
    const eventKey = `assistant-handoff:${item.id}`;
    activeEventKeys.add(eventKey);
    const result = await upsertAutomatedSystemAlert({
      eventKey,
      source: "assistant-handoff-monitor",
      title: "Pending assistant handoff is overdue",
      message: `A pending handoff request has not been resolved in time.`,
      severity: "warn",
      detail: [
        item.contactName ? `contactName=${item.contactName}` : "",
        item.contactMethod ? `contactMethod=${item.contactMethod}` : "",
        `locale=${item.locale}`,
        `updatedAt=${item.updatedAt.toISOString()}`,
      ]
        .filter(Boolean)
        .join(" | "),
    });

    if (result.state === "created") createdCount += 1;
    else if (result.state === "reopened") reopenedCount += 1;
    else updatedCount += 1;
  }

  const resolvedCount = await resolveClearedAutomatedAlerts(activeEventKeys);
  safeRevalidate(adminPaths);

  return {
    createdCount,
    reopenedCount,
    updatedCount,
    resolvedCount,
    openIssueCount: activeEventKeys.size,
  };
}
