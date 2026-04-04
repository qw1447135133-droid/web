import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminBannerComposer } from "@/components/admin-banner-composer";
import { SectionHeading } from "@/components/section-heading";
import {
  applyHomepageModuleMetrics,
  getArticlePlans as getSiteArticlePlans,
  getAuthorTeams as getSiteAuthorTeams,
  getPredictions as getSitePredictions,
} from "@/lib/content-data";
import { getAdminArticlePlans, getAdminAuthorTeams, getAdminPredictionRecords } from "@/lib/admin-content";
import {
  buildFinancePackageCards,
  getAdminFinanceDashboard,
  getCoinRechargeOrderStatusMeta,
} from "@/lib/admin-finance";
import {
  getAdminAssistantHandoffRequests,
  getAdminHomepageFeaturedMatchSlots,
  getAdminHomepageFeaturedMatches,
  getAdminHomepageBanners,
  getAdminHomepageModules,
  getAdminSupportKnowledgeItems,
  getAdminSiteAnnouncements,
} from "@/lib/admin-operations";
import { getAdminExpansionData, getExpansionToneClass } from "@/lib/admin-expansion";
import { getAdminPageCopy } from "@/lib/admin-page-copy";
import {
  getAdminPaymentCallbackActivity,
  getAdminUsersDashboard,
  normalizeAdminOrderFilterStatus,
  normalizeAdminOrderFilterType,
} from "@/lib/admin-users";
import { formatDateTime, formatPrice } from "@/lib/format";
import { getCurrentDisplayLocale, getIntlLocale, resolveRenderLocale, type DisplayLocale, type Locale } from "@/lib/i18n";
import { localizeMembershipPlan } from "@/lib/localized-content";
import { homepageBannerSeeds, homepageModules as homepageModuleSeeds, membershipPlans } from "@/lib/mock-data";
import { getOpsCopy } from "@/lib/ops-copy";
import { getManualCollectionSummary, getPaymentCheckoutFlow } from "@/lib/payment-gateway";
import {
  getPaymentManualCollectionConfig,
  getPaymentProviderLabel,
  getPaymentRuntimeConfig,
} from "@/lib/payment-provider";
import { getOrderActivityMeta, getOrderFailureMeta, getOrderStatusMeta } from "@/lib/payment-ui";
import { getSessionContext } from "@/lib/session";
import { getMatchesBySport, getTrackedLeagues } from "@/lib/sports-data";
import { getRecentSyncRuns, getSyncRotationPlan } from "@/lib/sync/sports-sync";
import { getSiteCopy } from "@/lib/ui-copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type AdminUsersTabFilters = {
  query: string;
  orderStatus: string;
  orderType: string;
  from: string;
  to: string;
  membershipPage: number;
  contentPage: number;
};

type AdminSportFilter = "all" | "football" | "basketball" | "cricket" | "esports";
type AdminPlanStatusFilter = "all" | "draft" | "published" | "archived";
type AdminPredictionResultFilter = "all" | "pending" | "won" | "lost";
type AdminAiScope = "recent" | "all";
type AdminAssistantKnowledgeStatusFilter = "all" | "active" | "inactive";
type AdminAssistantHandoffStatusFilter = "all" | "pending" | "resolved";
const ADMIN_AI_PAGE_SIZE = 12;

function pickValue(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function pickPositiveInt(value: string | string[] | undefined, fallback: number) {
  const parsed = Number.parseInt(pickValue(value, String(fallback)), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toDateTimeLocalValue(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function setOptionalSearchParam(params: URLSearchParams, key: string, value?: string | number) {
  if (value === undefined || value === "") {
    return;
  }

  params.set(key, String(value));
}

function formatDurationMs(value?: number) {
  if (!value || value < 1000) {
    return value ? `${value}ms` : "--";
  }

  if (value < 60_000) {
    return `${Math.round(value / 1000)}s`;
  }

  const minutes = Math.floor(value / 60_000);
  const seconds = Math.round((value % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function formatAnnouncementWindow(
  startsAt: string | undefined,
  endsAt: string | undefined,
  locale: Locale | DisplayLocale,
  fallback: string,
) {
  if (!startsAt && !endsAt) {
    return fallback;
  }

  const startLabel = startsAt ? formatDateTime(startsAt, locale) : "--";
  const endLabel = endsAt ? formatDateTime(endsAt, locale) : "--";
  return `${startLabel} -> ${endLabel}`;
}

function formatShortDateLabel(value: string, locale: Locale | DisplayLocale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function getBannerThemeSurface(theme: string) {
  if (theme === "field") {
    return {
      glow: "from-lime-300/25 via-emerald-500/12 to-cyan-300/6",
      chip: "border-lime-300/30 bg-lime-300/12 text-lime-100",
    };
  }

  if (theme === "midnight") {
    return {
      glow: "from-sky-300/28 via-indigo-500/14 to-fuchsia-300/8",
      chip: "border-sky-300/30 bg-sky-300/12 text-sky-100",
    };
  }

  return {
    glow: "from-orange-300/30 via-orange-500/14 to-amber-200/8",
    chip: "border-orange-300/30 bg-orange-300/12 text-orange-100",
  };
}

function getBannerRunState(
  banner: {
    status: string;
    startsAt?: string;
    endsAt?: string;
  },
  locale: "zh-CN" | "zh-TW" | "en",
) {
  if (banner.status !== "active") {
    return locale === "en"
      ? { key: "inactive", label: "Inactive", classes: "bg-white/8 text-slate-300" }
      : locale === "zh-TW"
        ? { key: "inactive", label: "未啟用", classes: "bg-white/8 text-slate-300" }
        : { key: "inactive", label: "未启用", classes: "bg-white/8 text-slate-300" };
  }

  const now = Date.now();
  const startsAt = banner.startsAt ? new Date(banner.startsAt).getTime() : undefined;
  const endsAt = banner.endsAt ? new Date(banner.endsAt).getTime() : undefined;

  if (startsAt && startsAt > now) {
    return locale === "en"
      ? { key: "scheduled", label: "Scheduled", classes: "bg-sky-300/12 text-sky-100" }
      : locale === "zh-TW"
        ? { key: "scheduled", label: "待生效", classes: "bg-sky-300/12 text-sky-100" }
        : { key: "scheduled", label: "待生效", classes: "bg-sky-300/12 text-sky-100" };
  }

  if (endsAt && endsAt < now) {
    return locale === "en"
      ? { key: "expired", label: "Expired", classes: "bg-rose-300/12 text-rose-100" }
      : locale === "zh-TW"
        ? { key: "expired", label: "已過期", classes: "bg-rose-300/12 text-rose-100" }
        : { key: "expired", label: "已过期", classes: "bg-rose-300/12 text-rose-100" };
  }

  return locale === "en"
    ? { key: "live", label: "Live", classes: "bg-lime-300/12 text-lime-100" }
    : locale === "zh-TW"
      ? { key: "live", label: "展示中", classes: "bg-lime-300/12 text-lime-100" }
      : { key: "live", label: "展示中", classes: "bg-lime-300/12 text-lime-100" };
}

function getTrendMaxValue(
  points: Array<{
    impressionCount: number;
    clickCount: number;
  }>,
) {
  return points.reduce((max, item) => Math.max(max, item.impressionCount, item.clickCount), 0);
}

function getReadinessStateMeta(
  state: "ready" | "attention",
) {
  if (state === "ready") {
    return {
      badgeClassName: "bg-lime-300/12 text-lime-100",
      dotClassName: "bg-lime-300",
      ringClassName: "border-lime-300/15 bg-lime-300/8",
    };
  }

  return {
    badgeClassName: "bg-orange-300/12 text-orange-100",
    dotClassName: "bg-orange-300",
    ringClassName: "border-orange-300/15 bg-orange-300/8",
  };
}

function buildAdminUsersHref(filters: AdminUsersTabFilters, overrides: Partial<AdminUsersTabFilters> = {}) {
  const nextFilters = { ...filters, ...overrides };
  const params = new URLSearchParams();

  params.set("tab", "users");
  params.set("orderStatus", nextFilters.orderStatus);
  params.set("orderType", nextFilters.orderType);
  setOptionalSearchParam(params, "q", nextFilters.query);
  setOptionalSearchParam(params, "from", nextFilters.from);
  setOptionalSearchParam(params, "to", nextFilters.to);
  params.set("membershipPage", String(nextFilters.membershipPage));
  params.set("contentPage", String(nextFilters.contentPage));

  return `/admin?${params.toString()}`;
}

function normalizeAdminSportFilter(value: string): AdminSportFilter {
  if (value === "football" || value === "basketball" || value === "cricket" || value === "esports") {
    return value;
  }

  return "all";
}

function normalizeAdminPredictionResultFilter(value: string): AdminPredictionResultFilter {
  if (value === "pending" || value === "won" || value === "lost") {
    return value;
  }

  return "all";
}

function normalizeAdminPlanStatusFilter(value: string): AdminPlanStatusFilter {
  if (value === "draft" || value === "published" || value === "archived") {
    return value;
  }

  return "all";
}

function buildAdminContentHref(
  filters: {
    contentSport: AdminSportFilter;
    contentAuthorId: string;
    contentPlanStatus: AdminPlanStatusFilter;
    contentQuery: string;
    knowledgeStatus?: AdminAssistantKnowledgeStatusFilter;
    knowledgeCategory?: string;
    knowledgeQuery?: string;
  },
  overrides?: {
    editAuthor?: string;
    editPlan?: string;
    editBanner?: string;
    editFeaturedSlot?: string;
    editModule?: string;
    editAnnouncement?: string;
    editKnowledge?: string;
  },
) {
  const params = new URLSearchParams();
  params.set("tab", "content");

  if (filters.contentSport !== "all") {
    params.set("contentSport", filters.contentSport);
  }

  if (filters.contentPlanStatus !== "all") {
    params.set("contentPlanStatus", filters.contentPlanStatus);
  }

  setOptionalSearchParam(params, "contentAuthorId", filters.contentAuthorId);
  setOptionalSearchParam(params, "contentQuery", filters.contentQuery);
  if (filters.knowledgeStatus && filters.knowledgeStatus !== "all") {
    params.set("knowledgeStatus", filters.knowledgeStatus);
  }
  setOptionalSearchParam(params, "knowledgeCategory", filters.knowledgeCategory);
  setOptionalSearchParam(params, "knowledgeQuery", filters.knowledgeQuery);

  if (overrides?.editAuthor) {
    params.set("editAuthor", overrides.editAuthor);
  }

  if (overrides?.editPlan) {
    params.set("editPlan", overrides.editPlan);
  }

  if (overrides?.editBanner) {
    params.set("editBanner", overrides.editBanner);
  }

  if (overrides?.editFeaturedSlot) {
    params.set("editFeaturedSlot", overrides.editFeaturedSlot);
  }

  if (overrides?.editModule) {
    params.set("editModule", overrides.editModule);
  }

  if (overrides?.editAnnouncement) {
    params.set("editAnnouncement", overrides.editAnnouncement);
  }

  if (overrides?.editKnowledge) {
    params.set("editKnowledge", overrides.editKnowledge);
  }

  return `/admin?${params.toString()}`;
}

function normalizeAdminAiScope(value: string): AdminAiScope {
  return value === "all" ? "all" : "recent";
}

function normalizeAssistantKnowledgeStatusFilter(value: string): AdminAssistantKnowledgeStatusFilter {
  return value === "active" || value === "inactive" ? value : "all";
}

function normalizeAssistantHandoffStatusFilter(value: string): AdminAssistantHandoffStatusFilter {
  return value === "pending" || value === "resolved" ? value : "all";
}

function buildAdminAiHrefWithFilters(filters: {
  aiSport: AdminSportFilter;
  aiAuthorId: string;
  aiResult: AdminPredictionResultFilter;
  aiScope: AdminAiScope;
  aiPage?: number;
  handoffStatus?: AdminAssistantHandoffStatusFilter;
  editPredictionId?: string;
}) {
  const params = new URLSearchParams();
  params.set("tab", "ai");

  if (filters.aiSport !== "all") {
    params.set("aiSport", filters.aiSport);
  }

  setOptionalSearchParam(params, "aiAuthorId", filters.aiAuthorId);

  if (filters.aiResult !== "all") {
    params.set("aiResult", filters.aiResult);
  }

  if (filters.aiScope !== "recent") {
    params.set("aiScope", filters.aiScope);
  }

  if ((filters.aiPage ?? 1) > 1) {
    params.set("aiPage", String(filters.aiPage));
  }

  if (filters.handoffStatus && filters.handoffStatus !== "all") {
    params.set("handoffStatus", filters.handoffStatus);
  }

  if (filters.editPredictionId) {
    params.set("editPrediction", filters.editPredictionId);
  }

  return `/admin?${params.toString()}`;
}

function buildAdminOrderFilterSummary(
  filters: AdminUsersTabFilters,
  copy: ReturnType<typeof getAdminPageCopy>,
  locale: Locale | DisplayLocale,
) {
  const parts: string[] = [
    copy.users.filters.orderTypeOptions[filters.orderType as keyof typeof copy.users.filters.orderTypeOptions] ?? filters.orderType,
    copy.users.filters.orderStatusOptions[filters.orderStatus as keyof typeof copy.users.filters.orderStatusOptions] ?? filters.orderStatus,
  ];

  if (filters.query) {
    parts.push(`${copy.users.filters.keyword}: ${filters.query}`);
  }

  if (filters.from) {
    parts.push(`${copy.users.filters.updatedFrom}: ${formatDateTime(filters.from, locale)}`);
  }

  if (filters.to) {
    parts.push(`${copy.users.filters.updatedTo}: ${formatDateTime(filters.to, locale)}`);
  }

  return parts.join(" / ");
}

function getPaymentCallbackStateMeta(
  state: "paid" | "failed" | "closed",
  locale: "zh-CN" | "zh-TW" | "en",
) {
  if (state === "failed") {
    return {
      label: locale === "en" ? "Failed" : locale === "zh-TW" ? "失敗" : "失败",
      className: "bg-rose-400/12 text-rose-100",
    };
  }

  if (state === "closed") {
    return {
      label: locale === "en" ? "Closed" : locale === "zh-TW" ? "關閉" : "关闭",
      className: "bg-white/8 text-slate-300",
    };
  }

  return {
    label: locale === "en" ? "Paid" : locale === "zh-TW" ? "支付成功" : "支付成功",
    className: "bg-lime-300/12 text-lime-100",
  };
}

function getPaymentCallbackProcessingMeta(
  status: "received" | "processed" | "ignored" | "conflict" | "failed",
  locale: "zh-CN" | "zh-TW" | "en",
) {
  if (status === "processed") {
    return {
      label: locale === "en" ? "Processed" : locale === "zh-TW" ? "已處理" : "已处理",
      className: "bg-lime-300/12 text-lime-100",
    };
  }

  if (status === "ignored") {
    return {
      label: locale === "en" ? "Ignored" : locale === "zh-TW" ? "已忽略" : "已忽略",
      className: "bg-white/8 text-slate-300",
    };
  }

  if (status === "conflict") {
    return {
      label: locale === "en" ? "Conflict" : locale === "zh-TW" ? "衝突" : "冲突",
      className: "bg-amber-300/15 text-amber-100",
    };
  }

  if (status === "failed") {
    return {
      label: locale === "en" ? "Failed" : locale === "zh-TW" ? "處理失敗" : "处理失败",
      className: "bg-rose-400/12 text-rose-100",
    };
  }

  return {
    label: locale === "en" ? "Received" : locale === "zh-TW" ? "已收到" : "已收到",
    className: "bg-sky-300/12 text-sky-100",
  };
}

function getPaymentRuntimeCopy(
  locale: Locale,
  paymentRuntime: ReturnType<typeof getPaymentRuntimeConfig>,
  paymentCheckoutFlow: ReturnType<typeof getPaymentCheckoutFlow>,
) {
  return {
    runtimeTitle: locale === "en" ? "Payment runtime" : locale === "zh-TW" ? "支付執行環境" : "支付运行环境",
    minutesLabel:
      locale === "en"
        ? `${paymentRuntime.pendingMinutes} min`
        : locale === "zh-TW"
          ? `${paymentRuntime.pendingMinutes} 分鐘`
          : `${paymentRuntime.pendingMinutes} 分钟`,
    authModeLabel:
      locale === "en"
        ? paymentRuntime.callbackAuthMode
        : paymentRuntime.callbackAuthMode === "shared-token"
          ? "共享令牌"
          : "共享令牌 + HMAC",
    authModeTitle: locale === "en" ? "Callback auth" : locale === "zh-TW" ? "回調鑑權" : "回调鉴权",
    callbackAddressTitle: locale === "en" ? "Callback URL" : locale === "zh-TW" ? "回調完整地址" : "回调完整地址",
    collectionTitle: locale === "en" ? "Collection config" : locale === "zh-TW" ? "收款配置" : "收款配置",
    hostedTitle: locale === "en" ? "Hosted gateway" : locale === "zh-TW" ? "託管通道" : "托管通道",
    checkoutModeTitle: locale === "en" ? "Checkout mode" : locale === "zh-TW" ? "收銀模式" : "收银模式",
    collectionReady: locale === "en" ? "Configured" : locale === "zh-TW" ? "已配置" : "已配置",
    collectionMissing: locale === "en" ? "Missing" : locale === "zh-TW" ? "未配置" : "未配置",
    hostedReady: locale === "en" ? "Ready" : locale === "zh-TW" ? "可用" : "可用",
    hostedMissing: locale === "en" ? "Not ready" : locale === "zh-TW" ? "未就緒" : "未就绪",
    checkoutModeLabel:
      paymentCheckoutFlow.mode === "manual-review"
        ? locale === "en"
          ? "Manual review"
          : locale === "zh-TW"
            ? "人工核銷"
            : "人工核销"
        : locale === "en"
          ? "Mock actions"
          : locale === "zh-TW"
            ? "模擬操作"
            : "模拟操作",
    siteUrlHint:
      locale === "en"
        ? "Set `PAYMENT_CALLBACK_BASE_URL` or `SITE_URL` so the gateway can call back with a public URL."
        : locale === "zh-TW"
          ? "請配置 `PAYMENT_CALLBACK_BASE_URL` 或 `SITE_URL`，讓支付通道能回調到公開位址。"
          : "请配置 `PAYMENT_CALLBACK_BASE_URL` 或 `SITE_URL`，让支付通道能回调到公开地址。",
    collectionHint:
      locale === "en"
        ? "Set manual collection env fields so checkout can show account or QR details."
        : locale === "zh-TW"
          ? "請配置人工收款環境變數，讓收銀頁可展示帳號或二維碼資訊。"
          : "请配置人工收款环境变量，让收银页可展示账号或二维码信息。",
    hostedHint:
      locale === "en"
        ? "Set hosted gateway URL, merchant ID, and signing secret before switching `PAYMENT_PROVIDER=hosted`."
        : locale === "zh-TW"
          ? "切到 `PAYMENT_PROVIDER=hosted` 前，請先配置託管通道 URL、商戶號與簽名密鑰。"
          : "切到 `PAYMENT_PROVIDER=hosted` 前，请先配置托管通道 URL、商户号与签名密钥。",
    callbacks: {
      title: locale === "en" ? "Callback events" : locale === "zh-TW" ? "回調事件" : "回调事件",
      subtitle:
        locale === "en"
          ? "Latest gateway notifications and dedupe results."
          : locale === "zh-TW"
            ? "查看最新支付回調與去重結果。"
            : "查看最新支付回调与去重结果。",
      metrics: {
        total: locale === "en" ? "Events" : locale === "zh-TW" ? "事件數" : "事件数",
        duplicates: locale === "en" ? "Duplicates" : locale === "zh-TW" ? "重複" : "重复",
        conflicts: locale === "en" ? "Conflicts" : locale === "zh-TW" ? "衝突" : "冲突",
        failed: locale === "en" ? "Failed" : locale === "zh-TW" ? "失敗" : "失败",
      },
      latestLabel: locale === "en" ? "Latest seen" : locale === "zh-TW" ? "最近收到" : "最近收到",
      empty:
        locale === "en"
          ? "No callback events yet. Once the gateway posts back, status and dedupe traces will appear here."
          : locale === "zh-TW"
            ? "目前還沒有回調事件。支付通道開始回調後，這裡會顯示狀態與去重痕跡。"
            : "当前还没有回调事件。支付通道开始回调后，这里会显示状态与去重痕迹。",
      stateTitle: locale === "en" ? "State" : locale === "zh-TW" ? "回調狀態" : "回调状态",
      resultTitle: locale === "en" ? "Result" : locale === "zh-TW" ? "處理結果" : "处理结果",
      orderIdLabel: locale === "en" ? "Order ID" : locale === "zh-TW" ? "訂單 ID" : "订单 ID",
      eventIdLabel: locale === "en" ? "Event ID" : locale === "zh-TW" ? "事件 ID" : "事件 ID",
      eventKeyLabel: locale === "en" ? "Event key" : locale === "zh-TW" ? "事件鍵" : "事件键",
      duplicateSuffix: locale === "en" ? "duplicate hits" : locale === "zh-TW" ? "次重複命中" : "次重复命中",
    },
  } as const;
}

function getAssistantAdminCopy(locale: Locale, isEditingKnowledgeItem: boolean) {
  return {
    knowledgeNotice: {
      saved:
        locale === "en"
          ? "Assistant knowledge item saved."
          : locale === "zh-TW"
            ? "AI 客服知識條目已保存。"
            : "AI 客服知识条目已保存。",
      seeded:
        locale === "en"
          ? "Default assistant knowledge seeds imported."
          : locale === "zh-TW"
            ? "預設 AI 客服知識種子已導入。"
            : "默认 AI 客服知识种子已导入。",
      failed:
        locale === "en"
          ? "Assistant knowledge operation failed."
          : locale === "zh-TW"
            ? "AI 客服知識操作失敗。"
            : "AI 客服知识操作失败。",
    },
    handoffNotice: {
      saved:
        locale === "en"
          ? "Assistant handoff request marked as resolved."
          : locale === "zh-TW"
            ? "AI 助手轉接請求已標記為完成。"
            : "AI 助手转接请求已标记为完成。",
      failed:
        locale === "en"
          ? "Assistant handoff action failed."
          : locale === "zh-TW"
            ? "AI 助手轉接操作失敗。"
            : "AI 助手转接操作失败。",
    },
    support: {
      eyebrow: locale === "en" ? "Support Queue" : locale === "zh-TW" ? "客服轉接" : "客服转接",
      title: locale === "en" ? "AI assistant handoff queue" : locale === "zh-TW" ? "AI 助手人工轉接隊列" : "AI 助手人工转接队列",
      description:
        locale === "en"
          ? "Requests raised from the floating assistant will appear here for follow-up."
          : locale === "zh-TW"
            ? "使用者在右下角助手中發起的人工轉接請求，會集中顯示在這裡。"
            : "用户在右下角助手中发起的人工转接请求，会集中显示在这里。",
      pending: locale === "en" ? "Pending" : locale === "zh-TW" ? "待處理" : "待处理",
      resolved: locale === "en" ? "Resolved" : locale === "zh-TW" ? "已完成" : "已完成",
      empty:
        locale === "en"
          ? "No assistant handoff requests yet."
          : locale === "zh-TW"
            ? "目前還沒有 AI 助手轉接請求。"
            : "目前还没有 AI 助手转接请求。",
      contact: locale === "en" ? "Contact" : locale === "zh-TW" ? "聯絡方式" : "联系方式",
      requester: locale === "en" ? "Requester" : locale === "zh-TW" ? "發起人" : "发起人",
      note: locale === "en" ? "Note" : locale === "zh-TW" ? "補充說明" : "补充说明",
      conversation: locale === "en" ? "Conversation" : locale === "zh-TW" ? "會話" : "会话",
      markResolved: locale === "en" ? "Mark resolved" : locale === "zh-TW" ? "標記完成" : "标记完成",
      filters: {
        status: locale === "en" ? "Queue status" : locale === "zh-TW" ? "隊列狀態" : "队列状态",
        all: locale === "en" ? "All" : locale === "zh-TW" ? "全部" : "全部",
        apply: locale === "en" ? "Apply" : locale === "zh-TW" ? "套用" : "应用",
        reset: locale === "en" ? "Reset" : locale === "zh-TW" ? "重置" : "重置",
      },
    },
    knowledge: {
      eyebrow: locale === "en" ? "Knowledge Base" : locale === "zh-TW" ? "知識庫" : "知识库",
      title: locale === "en" ? "Assistant FAQ knowledge" : locale === "zh-TW" ? "AI 客服 FAQ 知識庫" : "AI 客服 FAQ 知识库",
      description:
        locale === "en"
          ? "Maintain website-specific Q&A entries used by the floating assistant and fallback answers."
          : locale === "zh-TW"
            ? "維護右下角 AI 客服使用的站內問答知識，供真實模型與備援回覆共同使用。"
            : "维护右下角 AI 客服使用的站内问答知识，供真实模型与备用回复共同使用。",
      formTitle: isEditingKnowledgeItem
        ? locale === "en"
          ? "Edit knowledge item"
          : locale === "zh-TW"
            ? "編輯知識條目"
            : "编辑知识条目"
        : locale === "en"
          ? "Create knowledge item"
          : locale === "zh-TW"
            ? "新增知識條目"
            : "新增知识条目",
      count: (count: number) => (locale === "en" ? `${count} items` : locale === "zh-TW" ? `${count} 條` : `${count} 条`),
      active: locale === "en" ? "Active" : locale === "zh-TW" ? "啟用中" : "启用中",
      inactive: locale === "en" ? "Inactive" : locale === "zh-TW" ? "未啟用" : "未启用",
      seed: locale === "en" ? "Import defaults" : locale === "zh-TW" ? "導入預設" : "导入默认",
      save: locale === "en" ? "Save knowledge" : locale === "zh-TW" ? "保存知識" : "保存知识",
      edit: locale === "en" ? "Edit" : locale === "zh-TW" ? "編輯" : "编辑",
      moveUp: locale === "en" ? "Move up" : locale === "zh-TW" ? "上移" : "上移",
      moveDown: locale === "en" ? "Move down" : locale === "zh-TW" ? "下移" : "下移",
      enable: locale === "en" ? "Enable" : locale === "zh-TW" ? "啟用" : "启用",
      disable: locale === "en" ? "Disable" : locale === "zh-TW" ? "停用" : "停用",
      empty:
        locale === "en"
          ? "No assistant knowledge items yet. Import defaults first or create a custom FAQ."
          : locale === "zh-TW"
            ? "目前還沒有 AI 客服知識條目，可先導入預設問答或建立自定義 FAQ。"
            : "目前还没有 AI 客服知识条目，可先导入默认问答或创建自定义 FAQ。",
      fields: {
        key: locale === "en" ? "Unique key" : locale === "zh-TW" ? "唯一 key" : "唯一 key",
        category: locale === "en" ? "Category" : locale === "zh-TW" ? "分類" : "分类",
        href: locale === "en" ? "Related route" : locale === "zh-TW" ? "關聯路由" : "关联路由",
        tagsText: locale === "en" ? "Tags" : locale === "zh-TW" ? "標籤" : "标签",
        sortOrder: locale === "en" ? "Sort order" : locale === "zh-TW" ? "排序" : "排序",
        status: locale === "en" ? "Status" : locale === "zh-TW" ? "狀態" : "状态",
        questionZhCn: locale === "en" ? "Question (zh-CN)" : locale === "zh-TW" ? "問題（简体）" : "问题（简体）",
        questionZhTw: locale === "en" ? "Question (zh-TW)" : locale === "zh-TW" ? "問題（繁體）" : "问题（繁体）",
        questionEn: locale === "en" ? "Question (EN)" : locale === "zh-TW" ? "問題（英文）" : "问题（英文）",
        answerZhCn: locale === "en" ? "Answer (zh-CN)" : locale === "zh-TW" ? "答案（简体）" : "答案（简体）",
        answerZhTw: locale === "en" ? "Answer (zh-TW)" : locale === "zh-TW" ? "答案（繁體）" : "答案（繁体）",
        answerEn: locale === "en" ? "Answer (EN)" : locale === "zh-TW" ? "答案（英文）" : "答案（英文）",
      },
      tagsHint:
        locale === "en"
          ? "Separate tags with commas, line breaks, or pipes."
          : locale === "zh-TW"
            ? "標籤可用逗號、換行或豎線分隔。"
            : "标签可用逗号、换行或竖线分隔。",
      statusLabels: {
        active: locale === "en" ? "Active" : locale === "zh-TW" ? "啟用" : "启用",
        inactive: locale === "en" ? "Inactive" : locale === "zh-TW" ? "停用" : "停用",
      },
      filters: {
        searchPlaceholder:
          locale === "en" ? "Search key / question / tags" : locale === "zh-TW" ? "搜尋 key / 問題 / 標籤" : "搜索 key / 问题 / 标签",
        allCategories: locale === "en" ? "All categories" : locale === "zh-TW" ? "全部分類" : "全部分类",
        allStatus: locale === "en" ? "All status" : locale === "zh-TW" ? "全部狀態" : "全部状态",
        apply: locale === "en" ? "Apply" : locale === "zh-TW" ? "套用" : "应用",
        reset: locale === "en" ? "Reset" : locale === "zh-TW" ? "重置" : "重置",
      },
      order: (sortOrder: number) => (locale === "en" ? `Order ${sortOrder}` : `排序 ${sortOrder}`),
      localePreview: locale === "en" ? "Locale preview" : locale === "zh-TW" ? "多語預覽" : "多语预览",
      answerLabel: locale === "en" ? "Answer" : locale === "zh-TW" ? "答案" : "答案",
      routeLabel: locale === "en" ? "Route" : locale === "zh-TW" ? "路由" : "路由",
      updatedAt: locale === "en" ? "Updated" : locale === "zh-TW" ? "更新時間" : "更新时间",
    },
  } as const;
}

function getBannerAnalyticsCopy(locale: Locale) {
  return {
    liveCount: (count: number) => (locale === "en" ? `${count} live` : locale === "zh-TW" ? `${count} 條展示中` : `${count} 条展示中`),
    scheduledCount: (count: number) =>
      locale === "en" ? `${count} scheduled` : locale === "zh-TW" ? `${count} 條待生效` : `${count} 条待生效`,
    inactiveCount: (count: number) =>
      locale === "en" ? `${count} inactive` : locale === "zh-TW" ? `${count} 條未啟用` : `${count} 条未启用`,
    heroSlot: (slot: number) => (locale === "en" ? `Hero slot ${slot}` : locale === "zh-TW" ? `首頁第 ${slot} 位` : `首页第 ${slot} 位`),
    standby: locale === "en" ? "Standby" : locale === "zh-TW" ? "候補位" : "候补位",
    order: (sortOrder: number) => (locale === "en" ? `Order ${sortOrder}` : `排序 ${sortOrder}`),
    performance: locale === "en" ? "Performance" : locale === "zh-TW" ? "表現數據" : "表现数据",
    impressions: locale === "en" ? "Impressions" : locale === "zh-TW" ? "曝光" : "曝光",
    clicks: locale === "en" ? "Clicks" : locale === "zh-TW" ? "點擊" : "点击",
    recentImpressions: locale === "en" ? "7D impressions" : locale === "zh-TW" ? "7日曝光" : "7日曝光",
    recentClicks: locale === "en" ? "7D clicks" : locale === "zh-TW" ? "7日點擊" : "7日点击",
    primarySlot: locale === "en" ? "Primary slot" : locale === "zh-TW" ? "主位表現" : "主位表现",
    secondarySlot: locale === "en" ? "Secondary slot" : locale === "zh-TW" ? "次位表現" : "次位表现",
    shortImpressions: locale === "en" ? "Imp" : locale === "zh-TW" ? "曝光" : "曝光",
    shortClicks: locale === "en" ? "Clk" : locale === "zh-TW" ? "點擊" : "点击",
    lastImpression: locale === "en" ? "Last impression" : locale === "zh-TW" ? "最近曝光" : "最近曝光",
    lastClick: locale === "en" ? "Last click" : locale === "zh-TW" ? "最近點擊" : "最近点击",
    trendTitle: locale === "en" ? "7 day trend" : locale === "zh-TW" ? "7日趨勢" : "7日趋势",
    targetLink: locale === "en" ? "Target link" : locale === "zh-TW" ? "跳轉連結" : "跳转链接",
    duplicate: locale === "en" ? "Duplicate" : locale === "zh-TW" ? "複製" : "复制",
    empty:
      locale === "en"
        ? "No homepage banners yet. Create one to let the homepage hero prefer database-managed banners."
        : locale === "zh-TW"
          ? "目前還沒有首頁 Banner，建立後首頁首屏會優先讀取資料庫設定。"
          : "当前还没有首页 Banner，创建后首页首屏会优先读取数据库配置。",
  } as const;
}

function PaginationControls({
  summary,
  previousLabel,
  nextLabel,
  previousHref,
  nextHref,
}: {
  summary: string;
  previousLabel: string;
  nextLabel: string;
  previousHref?: string;
  nextHref?: string;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
      <span className="text-sm text-slate-500">{summary}</span>
      <div className="flex flex-wrap gap-2">
        {previousHref ? (
          <Link
            href={previousHref}
            className="inline-flex items-center justify-center rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white"
          >
            {previousLabel}
          </Link>
        ) : (
          <span className="inline-flex items-center justify-center rounded-full border border-white/8 px-4 py-2 text-sm text-slate-500">
            {previousLabel}
          </span>
        )}
        {nextHref ? (
          <Link
            href={nextHref}
            className="inline-flex items-center justify-center rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white"
          >
            {nextLabel}
          </Link>
        ) : (
          <span className="inline-flex items-center justify-center rounded-full border border-white/8 px-4 py-2 text-sm text-slate-500">
            {nextLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function ExpansionMetricGrid({ items }: { items: Array<{ label: string; value: string; description: string }> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm text-slate-500">{item.label}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
          <p className="mt-2 text-sm text-slate-400">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

function ExpansionRowsPanel({ title, rows }: { title: string; rows: Array<{ title: string; subtitle?: string; status?: string; tone?: "good" | "warn" | "neutral"; meta?: string[] }> }) {
  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <span className="text-sm text-slate-500">{rows.length}</span>
      </div>
      <div className="mt-5 grid gap-4">
        {rows.map((row) => (
          <div key={`${title}-${row.title}`} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">{row.title}</p>
                {row.subtitle ? <p className="mt-2 text-sm text-slate-400">{row.subtitle}</p> : null}
              </div>
              {row.status ? <span className={`rounded-full px-3 py-1 text-xs ${getExpansionToneClass(row.tone)}`}>{row.status}</span> : null}
            </div>
            {row.meta && row.meta.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {row.meta.map((item) => (
                  <span key={`${row.title}-${item}`} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpansionParametersPanel({ title, rows }: { title: string; rows: Array<{ label: string; value: string; hint?: string }> }) {
  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <div className="mt-5 grid gap-3">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium text-white">{row.label}</p>
              <code className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-200">{row.value}</code>
            </div>
            {row.hint ? <p className="mt-2 text-sm text-slate-400">{row.hint}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceRechargeOrdersPanel({
  title,
  locale,
  orders,
}: {
  title: string;
  locale: Locale;
  orders: Array<{
    id: string;
    orderNo: string;
    userDisplayName: string;
    userEmail: string;
    packageTitle: string;
    totalCoins: number;
    amount: number;
    status: "pending" | "paid" | "failed" | "closed" | "refunded";
    provider: "mock" | "manual" | "hosted";
    paymentReference?: string;
    failureReason?: string;
    refundReason?: string;
    createdAt: string;
    updatedAt: string;
    paidAt?: string;
    creditedAt?: string;
  }>;
}) {
  const actionLabel = {
    markPaid:
      locale === "en" ? "Mark paid" : locale === "zh-TW" ? "補單入賬" : "补单入账",
    markFailed:
      locale === "en" ? "Mark failed" : locale === "zh-TW" ? "記為失敗" : "记为失败",
    close: locale === "en" ? "Close" : locale === "zh-TW" ? "關閉" : "关闭",
    refund: locale === "en" ? "Refund" : locale === "zh-TW" ? "退款" : "退款",
    empty:
      locale === "en"
        ? "No coin recharge orders yet. Create one manually from the admin form above."
        : locale === "zh-TW"
          ? "目前還沒有球幣充值訂單，可先用上方表單建立手動訂單。"
          : "当前还没有球币充值订单，可先用上方表单建立手动订单。",
  };

  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <span className="text-sm text-slate-500">{orders.length}</span>
      </div>
      <div className="mt-5 grid gap-4">
        {orders.length > 0 ? (
          orders.map((order) => {
            const statusMeta = getCoinRechargeOrderStatusMeta(order.status, locale);

            return (
              <div key={order.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{order.orderNo}</p>
                    <p className="mt-2 text-sm text-slate-400">
                      {order.userDisplayName} / {order.userEmail}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {order.packageTitle} / {order.totalCoins} / {formatPrice(order.amount, locale)}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs ${getExpansionToneClass(statusMeta.tone)}`}>
                    {statusMeta.label}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                    {order.provider}
                  </span>
                  {order.paymentReference ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                      {order.paymentReference}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                    {formatDateTime(order.updatedAt, locale)}
                  </span>
                  {order.creditedAt ? (
                    <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs text-lime-100">
                      {locale === "en"
                        ? `Credited ${formatDateTime(order.creditedAt, locale)}`
                        : locale === "zh-TW"
                          ? `已入賬 ${formatDateTime(order.creditedAt, locale)}`
                          : `已入账 ${formatDateTime(order.creditedAt, locale)}`}
                    </span>
                  ) : null}
                </div>
                {order.failureReason ? <p className="mt-3 text-sm text-orange-100">{order.failureReason}</p> : null}
                {order.refundReason ? <p className="mt-3 text-sm text-slate-300">{order.refundReason}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {(order.status === "pending" || order.status === "failed" || order.status === "closed") ? (
                    <form action="/api/admin/finance/recharge-orders" method="post">
                      <input type="hidden" name="intent" value="mark-paid" />
                      <input type="hidden" name="orderId" value={order.id} />
                      <button type="submit" className="rounded-full border border-lime-300/20 bg-lime-300/10 px-4 py-2 text-sm text-lime-100 transition hover:bg-lime-300/15">
                        {actionLabel.markPaid}
                      </button>
                    </form>
                  ) : null}
                  {order.status === "pending" ? (
                    <>
                      <form action="/api/admin/finance/recharge-orders" method="post">
                        <input type="hidden" name="intent" value="mark-failed" />
                        <input type="hidden" name="orderId" value={order.id} />
                        <button type="submit" className="rounded-full border border-orange-300/20 bg-orange-300/10 px-4 py-2 text-sm text-orange-100 transition hover:bg-orange-300/15">
                          {actionLabel.markFailed}
                        </button>
                      </form>
                      <form action="/api/admin/finance/recharge-orders" method="post">
                        <input type="hidden" name="intent" value="close" />
                        <input type="hidden" name="orderId" value={order.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:text-white">
                          {actionLabel.close}
                        </button>
                      </form>
                    </>
                  ) : null}
                  {order.status === "paid" ? (
                    <form action="/api/admin/finance/recharge-orders" method="post">
                      <input type="hidden" name="intent" value="refund" />
                      <input type="hidden" name="orderId" value={order.id} />
                      <button type="submit" className="rounded-full border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-400/15">
                        {actionLabel.refund}
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
            {actionLabel.empty}
          </div>
        )}
      </div>
    </div>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const displayLocale = await getCurrentDisplayLocale();
  const locale = resolveRenderLocale(displayLocale);
  const { entitlements } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    redirect("/login?next=%2Fadmin");
  }

  if (!entitlements.canAccessAdminConsole) {
    redirect("/member");
  }

  const adminPageCopy = getAdminPageCopy(locale);
  const adminExpansion = getAdminExpansionData(locale);
  const aiImportPanelCopy = adminPageCopy.aiImport;
  const opsCopy = getOpsCopy(locale);
  const paymentRuntime = getPaymentRuntimeConfig();
  const manualCollection = getPaymentManualCollectionConfig();
  const paymentCheckoutFlow = getPaymentCheckoutFlow(paymentRuntime.provider);
  const paymentRuntimeCopy = getPaymentRuntimeCopy(locale, paymentRuntime, paymentCheckoutFlow);
  const { matchStatusLabels, roleLabels } = getSiteCopy(locale);
  const resolved = await searchParams;
  const tab = pickValue(resolved.tab, "overview");
  const editAuthorId = pickValue(resolved.editAuthor, "");
  const editPlanId = pickValue(resolved.editPlan, "");
  const editBannerId = pickValue(resolved.editBanner, "");
  const editFeaturedSlotId = pickValue(resolved.editFeaturedSlot, "");
  const editModuleId = pickValue(resolved.editModule, "");
  const editAnnouncementId = pickValue(resolved.editAnnouncement, "");
  const editPredictionId = pickValue(resolved.editPrediction, "");
  const editKnowledgeId = pickValue(resolved.editKnowledge, "");
  const contentSport = normalizeAdminSportFilter(pickValue(resolved.contentSport, "all"));
  const contentAuthorId = pickValue(resolved.contentAuthorId, "").trim();
  const contentPlanStatus = normalizeAdminPlanStatusFilter(pickValue(resolved.contentPlanStatus, "all"));
  const contentQuery = pickValue(resolved.contentQuery, "").trim();
  const aiSport = normalizeAdminSportFilter(pickValue(resolved.aiSport, "all"));
  const aiAuthorId = pickValue(resolved.aiAuthorId, "").trim();
  const aiResult = normalizeAdminPredictionResultFilter(pickValue(resolved.aiResult, "all"));
  const aiScope = normalizeAdminAiScope(pickValue(resolved.aiScope, "recent"));
  const aiPage = pickPositiveInt(resolved.aiPage, 1);
  const knowledgeStatus = normalizeAssistantKnowledgeStatusFilter(pickValue(resolved.knowledgeStatus, "all"));
  const knowledgeCategory = pickValue(resolved.knowledgeCategory, "").trim();
  const knowledgeQuery = pickValue(resolved.knowledgeQuery, "").trim();
  const handoffStatus = normalizeAssistantHandoffStatusFilter(pickValue(resolved.handoffStatus, "all"));
  const saved = pickValue(resolved.saved, "");
  const error = pickValue(resolved.error, "");
  const seeded = pickValue(resolved.seeded, "");
  const orderQuery = pickValue(resolved.q, "");
  const orderStatus = normalizeAdminOrderFilterStatus(pickValue(resolved.orderStatus, "all"));
  const orderType = normalizeAdminOrderFilterType(pickValue(resolved.orderType, "all"));
  const orderFrom = pickValue(resolved.from, "");
  const orderTo = pickValue(resolved.to, "");
  const membershipPage = pickPositiveInt(resolved.membershipPage, 1);
  const contentPage = pickPositiveInt(resolved.contentPage, 1);

  const [footballMatches, basketballMatches, cricketMatches, cricketLeagues, esportsMatches, esportsLeagues, homepageFeaturedPreview, homepageFeaturedSlots, articlePlans, authorTeams, homepageBanners, homepageModules, siteAnnouncements, predictionRecords, supportKnowledgeItems, siteArticlePlans, siteAuthorTeams, sitePredictions, usersDashboard, paymentCallbackActivity, recentSyncRuns, syncRotationPlan, assistantHandoffRequests, financeDashboard] = await Promise.all([
    getMatchesBySport("football", locale),
    getMatchesBySport("basketball", locale),
    getMatchesBySport("cricket", locale),
    getTrackedLeagues("cricket", locale),
    getMatchesBySport("esports", locale),
    getTrackedLeagues("esports", locale),
    getAdminHomepageFeaturedMatches(locale, 6),
    getAdminHomepageFeaturedMatchSlots(locale),
    getAdminArticlePlans(),
    getAdminAuthorTeams(),
    getAdminHomepageBanners(),
    getAdminHomepageModules(),
    getAdminSiteAnnouncements(),
    getAdminPredictionRecords(),
    getAdminSupportKnowledgeItems(),
    getSiteArticlePlans(undefined, locale),
    getSiteAuthorTeams(locale),
    getSitePredictions(undefined, locale),
    getAdminUsersDashboard({
      query: orderQuery,
      orderStatus,
      orderType,
      from: orderFrom,
      to: orderTo,
      membershipPage,
      contentPage,
    }),
    getAdminPaymentCallbackActivity(),
    getRecentSyncRuns(),
    getSyncRotationPlan(),
    getAdminAssistantHandoffRequests(),
    getAdminFinanceDashboard(locale),
  ]);

  const matches = [...footballMatches, ...basketballMatches, ...cricketMatches, ...esportsMatches];
  const homepageFeaturedMatches = homepageFeaturedPreview.matches;
  const currentAuthor = authorTeams.find((item) => item.id === editAuthorId);
  const currentPlan = articlePlans.find((item) => item.id === editPlanId);
  const currentBanner = homepageBanners.find((item) => item.id === editBannerId);
  const currentFeaturedSlot = homepageFeaturedSlots.find((item) => item.id === editFeaturedSlotId);
  const currentModule = homepageModules.find((item) => item.id === editModuleId);
  const homepageModuleSeedCodes = new Set(homepageModuleSeeds.map((module) => module.key ?? module.id));
  const homepageModulePreviewSource = [
    ...homepageModuleSeeds.map((module) => homepageModules.find((item) => item.key === (module.key ?? module.id)) ?? module),
    ...homepageModules.filter((module) => !homepageModuleSeedCodes.has(module.key ?? module.id)),
  ];
  const homepageModuleRuntimePreview = applyHomepageModuleMetrics(
    homepageModulePreviewSource,
    {
      footballMatches,
      basketballMatches,
      cricketMatches,
      esportsMatches,
      cricketLeagueCount: cricketLeagues.length,
      esportsLeagueCount: esportsLeagues.length,
      authorCount: siteAuthorTeams.length,
      articlePlanCount: siteArticlePlans.length,
      predictions: sitePredictions,
    },
    locale,
  );
  const homepageModuleRuntimeMetricMap = new Map(
    homepageModuleRuntimePreview.map((module) => [module.key ?? module.id, module.metric]),
  );
  const currentAnnouncement = siteAnnouncements.find((item) => item.id === editAnnouncementId);
  const currentPrediction = predictionRecords.find((item) => item.id === editPredictionId);
  const currentKnowledgeItem = supportKnowledgeItems.find((item) => item.id === editKnowledgeId);
  const assistantAdminCopy = getAssistantAdminCopy(locale, Boolean(currentKnowledgeItem));
  const bannerAnalyticsCopy = getBannerAnalyticsCopy(locale);
  const filteredArticlePlans = articlePlans.filter((plan) => {
    if (contentSport !== "all" && plan.sport !== contentSport) {
      return false;
    }

    if (contentAuthorId && plan.authorId !== contentAuthorId) {
      return false;
    }

    if (contentPlanStatus !== "all" && plan.status !== contentPlanStatus) {
      return false;
    }

    if (contentQuery) {
      const query = contentQuery.toLowerCase();
      const haystack = [plan.title, plan.leagueLabel, plan.matchId ?? "", plan.slug, plan.teaser].join(" ").toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });
  const filteredPredictionRecords = predictionRecords.filter((prediction) => {
    if (aiSport !== "all" && prediction.sport !== aiSport) {
      return false;
    }

    if (aiAuthorId && prediction.authorId !== aiAuthorId) {
      return false;
    }

    if (aiResult !== "all" && prediction.result !== aiResult) {
      return false;
    }

    return true;
  });
  const filteredSupportKnowledgeItems = supportKnowledgeItems.filter((item) => {
    if (knowledgeStatus !== "all" && item.status !== knowledgeStatus) {
      return false;
    }

    if (knowledgeCategory && item.category !== knowledgeCategory) {
      return false;
    }

    if (knowledgeQuery) {
      const query = knowledgeQuery.toLowerCase();
      const haystack = [
        item.key,
        item.category,
        item.questionZhCn,
        item.questionZhTw,
        item.questionEn,
        item.answerZhCn,
        item.answerZhTw,
        item.answerEn,
        item.href ?? "",
        item.tagsText ?? "",
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });
  const filteredAssistantHandoffRequests = assistantHandoffRequests.filter((item) => {
    if (handoffStatus !== "all" && item.status !== handoffStatus) {
      return false;
    }

    return true;
  });
  const aiTotalPages = Math.max(1, Math.ceil(filteredPredictionRecords.length / ADMIN_AI_PAGE_SIZE));
  const resolvedAiPage = aiScope === "all" ? Math.min(aiPage, aiTotalPages) : 1;
  const visiblePredictionRecords =
    aiScope === "all"
      ? filteredPredictionRecords.slice((resolvedAiPage - 1) * ADMIN_AI_PAGE_SIZE, resolvedAiPage * ADMIN_AI_PAGE_SIZE)
      : filteredPredictionRecords.slice(0, 8);
  const membershipPlanNames = new Map<string, string>(
    membershipPlans.map((plan) => [plan.id, localizeMembershipPlan(plan, locale).name]),
  );
  const bannerSeedTemplates = homepageBannerSeeds.map((seed) => ({
    id: seed.id,
    label: seed.translations[locale].title,
    draft: {
      key: seed.key,
      theme: seed.theme,
      href: seed.href,
      imageUrl: seed.imageUrl,
      sortOrder: String(seed.sortOrder),
      status: "active" as const,
      startsAt: toDateTimeLocalValue(seed.startsAt),
      endsAt: toDateTimeLocalValue(seed.endsAt),
      titleZhCn: seed.translations["zh-CN"].title,
      titleZhTw: seed.translations["zh-TW"].title,
      titleEn: seed.translations.en.title,
      subtitleZhCn: seed.translations["zh-CN"].subtitle,
      subtitleZhTw: seed.translations["zh-TW"].subtitle,
      subtitleEn: seed.translations.en.subtitle,
      descriptionZhCn: seed.translations["zh-CN"].description,
      descriptionZhTw: seed.translations["zh-TW"].description,
      descriptionEn: seed.translations.en.description,
      ctaLabelZhCn: seed.translations["zh-CN"].ctaLabel,
      ctaLabelZhTw: seed.translations["zh-TW"].ctaLabel,
      ctaLabelEn: seed.translations.en.ctaLabel,
    },
  }));
  const bannerRunStates = homepageBanners.map((banner) => getBannerRunState(banner, locale));
  const homepageHeroBannerIds = homepageBanners
    .filter((banner, index) => bannerRunStates[index]?.key === "live")
    .slice(0, 3)
    .map((banner) => banner.id);
  const activeLiveBannerCount = bannerRunStates.filter((item) => item.key === "live").length;
  const scheduledBannerCount = bannerRunStates.filter((item) => item.key === "scheduled").length;
  const inactiveBannerCount = bannerRunStates.filter((item) => item.key === "inactive").length;
  const homepageHeroSourceLabel =
    activeLiveBannerCount > 0
      ? adminPageCopy.content.homepageOverview.cards.banners.databaseSource
      : adminPageCopy.content.homepageOverview.cards.banners.fallbackSource;
  const seededHomepageModuleCount = homepageModuleSeeds.filter((module) =>
    homepageModules.some((item) => (item.key ?? item.id) === (module.key ?? module.id)),
  ).length;
  const customHomepageModuleCount = homepageModules.filter(
    (module) => !homepageModuleSeedCodes.has(module.key ?? module.id),
  ).length;
  const homepageModuleCoverageLabel =
    seededHomepageModuleCount === 0
      ? adminPageCopy.content.homepageOverview.cards.modules.empty
      : seededHomepageModuleCount === homepageModuleSeeds.length
        ? adminPageCopy.content.homepageOverview.cards.modules.seeded
        : adminPageCopy.content.homepageOverview.cards.modules.partial(
            seededHomepageModuleCount,
            homepageModuleSeeds.length,
          );
  const contentBaseHref = buildAdminContentHref({ contentSport, contentAuthorId, contentPlanStatus, contentQuery });
  const homepageReadinessItems = [
    {
      key: "banners-ready",
      state: activeLiveBannerCount > 0 ? ("ready" as const) : ("attention" as const),
      title: adminPageCopy.content.homepageReadiness.items.bannersReady.title,
      description:
        activeLiveBannerCount > 0
          ? adminPageCopy.content.homepageReadiness.items.bannersReady.ok
          : adminPageCopy.content.homepageReadiness.items.bannersReady.issue,
      action:
        activeLiveBannerCount > 0
          ? undefined
          : {
              kind: "link" as const,
              href: `${contentBaseHref}#homepage-banner-form`,
              label: adminPageCopy.content.homepageReadiness.actionLabels.createBanner,
            },
    },
    {
      key: "featured-slots",
      state: homepageFeaturedSlots.length > 0 ? ("ready" as const) : ("attention" as const),
      title: adminPageCopy.content.homepageReadiness.items.featuredSlotsReady.title,
      description:
        homepageFeaturedSlots.length > 0
          ? adminPageCopy.content.homepageReadiness.items.featuredSlotsReady.ok
          : adminPageCopy.content.homepageReadiness.items.featuredSlotsReady.issue,
      action:
        homepageFeaturedSlots.length > 0
          ? undefined
          : {
              kind: "link" as const,
              href: `${contentBaseHref}#homepage-featured-slot-form`,
              label: adminPageCopy.content.homepageReadiness.actionLabels.configureSlots,
            },
    },
    {
      key: "featured-source",
      state:
        homepageFeaturedPreview.source === "mock-fallback" || homepageFeaturedPreview.source === "live-fallback"
          ? ("attention" as const)
          : ("ready" as const),
      title: adminPageCopy.content.homepageReadiness.items.featuredSourceReady.title,
      description:
        homepageFeaturedPreview.source === "mock-fallback" || homepageFeaturedPreview.source === "live-fallback"
          ? adminPageCopy.content.homepageReadiness.items.featuredSourceReady.issue
          : adminPageCopy.content.homepageReadiness.items.featuredSourceReady.ok,
      action:
        homepageFeaturedPreview.source === "mock-fallback" || homepageFeaturedPreview.source === "live-fallback"
          ? {
              kind: "link" as const,
              href: "/admin?tab=events",
              label: adminPageCopy.content.homepageReadiness.actionLabels.checkSync,
            }
          : undefined,
    },
    {
      key: "modules-ready",
      state:
        seededHomepageModuleCount === homepageModuleSeeds.length
          ? ("ready" as const)
          : ("attention" as const),
      title: adminPageCopy.content.homepageReadiness.items.modulesReady.title,
      description:
        seededHomepageModuleCount === homepageModuleSeeds.length
          ? adminPageCopy.content.homepageReadiness.items.modulesReady.ok
          : adminPageCopy.content.homepageReadiness.items.modulesReady.issue,
      action:
        seededHomepageModuleCount === homepageModuleSeeds.length
          ? undefined
          : {
              kind: "form" as const,
              action: "/api/admin/operations/homepage-modules",
              intent: "bootstrap",
              label: adminPageCopy.content.homepageReadiness.actionLabels.importModules,
            },
    },
  ];
  const homepageReadinessIssueCount = homepageReadinessItems.filter((item) => item.state === "attention").length;
  const homepageReadinessSummaryLabel =
    homepageReadinessIssueCount === 0
      ? adminPageCopy.content.homepageReadiness.summary.ready
      : adminPageCopy.content.homepageReadiness.summary.attention;

  const usersTabFilters: AdminUsersTabFilters = {
    query: usersDashboard.appliedFilters.query,
    orderStatus: usersDashboard.appliedFilters.orderStatus,
    orderType: usersDashboard.appliedFilters.orderType,
    from: usersDashboard.appliedFilters.from,
    to: usersDashboard.appliedFilters.to,
    membershipPage: usersDashboard.appliedFilters.membershipPage,
    contentPage: usersDashboard.appliedFilters.contentPage,
  };

  const orderExportParams = new URLSearchParams();
  orderExportParams.set("type", usersTabFilters.orderType);
  orderExportParams.set("status", usersTabFilters.orderStatus);
  setOptionalSearchParam(orderExportParams, "q", usersTabFilters.query);
  setOptionalSearchParam(orderExportParams, "from", usersTabFilters.from);
  setOptionalSearchParam(orderExportParams, "to", usersTabFilters.to);

  const usersTabHref = buildAdminUsersHref(usersTabFilters);
  const orderExportHref = `/api/admin/orders/export?${orderExportParams.toString()}`;
  const currentOrderFilterSummary = buildAdminOrderFilterSummary(usersTabFilters, adminPageCopy, displayLocale);

  const contentNotice = error
    ? adminPageCopy.content.notices.saveFailed
    : seeded
      ? adminPageCopy.content.notices.seeded
      : saved === "author"
        ? adminPageCopy.content.notices.authorSaved
        : saved === "banner"
          ? adminPageCopy.content.notices.bannerSaved
        : saved === "featured-slot"
            ? adminPageCopy.content.notices.featuredSlotSaved
          : saved === "featured-slot-deleted"
            ? adminPageCopy.content.notices.featuredSlotDeleted
          : saved === "module"
            ? adminPageCopy.content.notices.moduleSaved
            : saved === "module-seeded"
              ? adminPageCopy.content.notices.moduleSeeded
            : saved === "announcement"
              ? adminPageCopy.content.notices.announcementSaved
              : saved
                ? adminPageCopy.content.notices.planSaved
                : null;

  const syncNotice =
    saved === "sync"
      ? opsCopy.sync.syncSaved
      : error === "sync-running"
        ? opsCopy.sync.alreadyRunning
        : error === "sync"
          ? opsCopy.sync.syncFailed
          : null;

  const refundNotice =
    saved === "refund"
      ? adminPageCopy.users.refundNotices.success
      : saved === "order-status"
        ? opsCopy.adminOrders.statusSaved
      : error === "refund-blocked"
        ? adminPageCopy.users.refundNotices.blocked
      : error === "order-status"
      ? opsCopy.adminOrders.statusFailed
      : error === "refund"
          ? adminPageCopy.users.refundNotices.failed
          : null;
  const financeNotice =
    saved === "coin-package-seeded"
      ? locale === "en"
        ? "Default coin packages were initialized."
        : locale === "zh-TW"
          ? "預設球幣套餐已初始化。"
          : "默认球币套餐已初始化。"
      : saved === "coin-recharge-order"
        ? locale === "en"
          ? "Coin recharge order was updated."
          : locale === "zh-TW"
            ? "球幣充值訂單已更新。"
            : "球币充值订单已更新。"
        : error === "coin-recharge-order-balance"
          ? locale === "en"
            ? "Refund was blocked because the member coin balance is insufficient."
            : locale === "zh-TW"
              ? "退款已攔截，會員球幣餘額不足。"
              : "退款已拦截，会员球币余额不足。"
          : error === "coin-package" || error === "coin-recharge-order"
            ? locale === "en"
              ? "Finance action failed. Please check the form and try again."
              : locale === "zh-TW"
                ? "財務操作失敗，請檢查表單後重試。"
                : "财务操作失败，请检查表单后重试。"
            : null;
  const predictionNotice =
    saved === "prediction"
      ? aiImportPanelCopy.notices.saved
      : saved === "prediction-deleted"
        ? aiImportPanelCopy.notices.deleted
      : error === "prediction"
        ? aiImportPanelCopy.notices.failed
        : null;
  const knowledgeNotice =
    saved === "assistant-knowledge"
        ? assistantAdminCopy.knowledgeNotice.saved
      : saved === "assistant-knowledge-seeded"
        ? assistantAdminCopy.knowledgeNotice.seeded
      : error === "assistant-knowledge"
          ? assistantAdminCopy.knowledgeNotice.failed
        : null;
  const assistantHandoffNotice =
    saved === "assistant-handoff"
      ? assistantAdminCopy.handoffNotice.saved
      : error === "assistant-handoff"
        ? assistantAdminCopy.handoffNotice.failed
        : null;
  const assistantSupportCopy = assistantAdminCopy.support;
  const assistantKnowledgeCopy = assistantAdminCopy.knowledge;
  const assistantPendingCount = assistantHandoffRequests.filter((item) => item.status === "pending").length;
  const assistantResolvedCount = assistantHandoffRequests.filter((item) => item.status === "resolved").length;
  const assistantKnowledgeActiveCount = supportKnowledgeItems.filter((item) => item.status === "active").length;
  const assistantKnowledgeCategories = Array.from(new Set(supportKnowledgeItems.map((item) => item.category))).sort((left, right) =>
    left.localeCompare(right),
  );
  const financePackageRows = buildFinancePackageCards(locale, financeDashboard.coinPackages);
  const financeSettlementRows =
    financeDashboard.settlementRows.length > 0
      ? financeDashboard.settlementRows
      : adminExpansion.finance.settlements.rows;
  const sortedMatches = [...matches].sort((left, right) => new Date(left.kickoff).getTime() - new Date(right.kickoff).getTime());
  const matchLookup = new Map(sortedMatches.map((match) => [match.id, match]));
  const currentFeaturedSlotMatchValue =
    currentFeaturedSlot?.match?.id ?? currentFeaturedSlot?.matchRef ?? currentFeaturedSlot?.matchId ?? "";
  const authorLookup = new Map(authorTeams.map((author) => [author.id, author.name]));
  const predictionMatchValue = currentPrediction?.matchId ?? currentPrediction?.matchRef ?? aiImportPanelCopy.defaults.matchId;
  const predictionMatchOptionExists = sortedMatches.some((match) => match.id === predictionMatchValue);
  const predictionAuthorOptionExists = authorTeams.some((author) => author.id === currentPrediction?.authorId);
  const aiFormTitle = currentPrediction ? aiImportPanelCopy.editTitle : aiImportPanelCopy.createTitle;
  const aiRouteState = {
    aiSport,
    aiAuthorId,
    aiResult,
    aiScope,
    aiPage: resolvedAiPage,
    handoffStatus,
  };
  const contentKnowledgeRouteState = {
    contentSport,
    contentAuthorId,
    contentPlanStatus,
    contentQuery,
    knowledgeStatus,
    knowledgeCategory,
    knowledgeQuery,
  };

  const overviewCards = [
    {
      label: adminPageCopy.overview.cards.matches.label,
      value: adminPageCopy.overview.cards.matches.value(matches.length),
      description: adminPageCopy.overview.cards.matches.description,
    },
    {
      label: adminPageCopy.overview.cards.plans.label,
      value: adminPageCopy.overview.cards.plans.value(articlePlans.length),
      description: adminPageCopy.overview.cards.plans.description,
    },
    {
      label: adminPageCopy.overview.cards.authors.label,
      value: adminPageCopy.overview.cards.authors.value(authorTeams.length),
      description: adminPageCopy.overview.cards.authors.description,
    },
    {
      label: adminPageCopy.overview.cards.predictions.label,
      value: adminPageCopy.overview.cards.predictions.value(predictionRecords.length),
      description: adminPageCopy.overview.cards.predictions.description,
    },
  ];

  const userMetricCards = [
    adminPageCopy.users.metrics.users,
    adminPageCopy.users.metrics.activeMembers,
    adminPageCopy.users.metrics.membershipOrders,
    adminPageCopy.users.metrics.contentOrders,
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6">
        <SectionHeading
          eyebrow={adminPageCopy.hero.eyebrow}
          title={adminPageCopy.hero.title}
          description={adminPageCopy.hero.description}
        />

        <div className="mt-6 flex flex-wrap gap-2">
          {adminPageCopy.tabs.map((item) => (
            <Link
              key={item.value}
              href={`/admin?tab=${item.value}`}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                tab === item.value
                  ? "border-orange-300/30 bg-orange-300/12 text-white"
                  : "border-white/8 bg-white/[0.04] text-slate-300 hover:border-white/18 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {tab === "overview" ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <div key={card.label} className="glass-panel rounded-[1.5rem] p-5">
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{card.value}</p>
              <p className="mt-2 text-sm text-slate-400">{card.description}</p>
            </div>
          ))}
        </section>
      ) : null}

      {tab === "overview" ? (
        <section className="glass-panel rounded-[2rem] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <SectionHeading
              eyebrow={assistantSupportCopy.eyebrow}
              title={assistantSupportCopy.title}
              description={assistantSupportCopy.description}
            />
            <div className="flex flex-wrap gap-3 text-xs text-slate-200">
              <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1.5">
                {assistantSupportCopy.pending}: {assistantPendingCount}
              </span>
              <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1.5">
                {assistantSupportCopy.resolved}: {assistantResolvedCount}
              </span>
            </div>
          </div>
          {assistantHandoffNotice ? (
            <div
              className={`mt-5 rounded-[1.2rem] border px-4 py-3 text-sm ${
                saved === "assistant-handoff"
                  ? "border-lime-300/20 bg-lime-300/10 text-lime-100"
                  : "border-rose-300/20 bg-rose-400/10 text-rose-100"
              }`}
            >
              {assistantHandoffNotice}
            </div>
          ) : null}
          <div className="mt-6 grid gap-4">
            {assistantHandoffRequests.length > 0 ? (
              assistantHandoffRequests.map((item) => (
                <div key={item.id} className="rounded-[1.35rem] border border-white/8 bg-slate-950/40 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">
                          {item.conversationTitle ?? `${assistantSupportCopy.conversation} ${item.conversationId.slice(0, 8)}`}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs ${
                            item.status === "resolved"
                              ? "bg-lime-300/12 text-lime-100"
                              : "bg-orange-300/12 text-orange-100"
                          }`}
                        >
                          {item.status === "resolved" ? assistantSupportCopy.resolved : assistantSupportCopy.pending}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">
                        {assistantSupportCopy.requester}: {item.requesterName ?? "--"}
                        {item.requesterEmail ? ` / ${item.requesterEmail}` : ""}
                      </p>
                    </div>
                    {item.status !== "resolved" ? (
                      <form action="/api/admin/operations/site-assistant-handoffs" method="post">
                        <input type="hidden" name="intent" value="resolve" />
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white"
                        >
                          {assistantSupportCopy.markResolved}
                        </button>
                      </form>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{assistantSupportCopy.contact}</p>
                      <p className="mt-2">{item.contactMethod ?? "--"}</p>
                      {item.contactName ? <p className="mt-1 text-slate-400">{item.contactName}</p> : null}
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{assistantSupportCopy.note}</p>
                      <p className="mt-2">{item.note ?? "--"}</p>
                    </div>
                  </div>
                  {item.conversationSummary ? (
                    <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{assistantSupportCopy.conversation}</p>
                      <p className="mt-2">{item.conversationSummary}</p>
                    </div>
                  ) : null}
                  <p className="mt-4 text-xs text-slate-500">
                    {formatDateTime(item.createdAt, displayLocale)} / {item.locale}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-sm text-slate-400">
                {assistantSupportCopy.empty}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {tab === "events" ? (
        <section className="glass-panel rounded-[2rem] p-6">
          <SectionHeading eyebrow={adminPageCopy.events.eyebrow} title={adminPageCopy.events.title} />
          <div className="mt-6 flex flex-wrap gap-3">
            <form action="/api/admin/sync/trigger" method="post">
              <button
                type="submit"
                className="rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
              >
                {adminPageCopy.events.syncButton}
              </button>
            </form>
            <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300">
              {adminPageCopy.events.pipelineNote}
            </span>
          </div>
          {syncNotice ? (
            <div
              className={`mt-6 rounded-[1.2rem] border px-4 py-3 text-sm ${
                saved === "sync"
                  ? "border-lime-300/20 bg-lime-300/10 text-lime-100"
                  : "border-rose-300/25 bg-rose-400/10 text-rose-100"
              }`}
            >
              {syncNotice}
            </div>
          ) : null}
          <div className="mt-6 rounded-[1.35rem] border border-sky-300/20 bg-sky-400/10 p-5">
            <p className="text-sm font-medium text-sky-100">{opsCopy.sync.dashboardTitle}</p>
            <p className="mt-2 text-sm text-sky-100/85">{opsCopy.sync.dashboardDescription}</p>
            <div className="mt-4 grid gap-3 text-sm text-sky-50 lg:grid-cols-[auto,1fr]">
              <span className="font-medium">{opsCopy.sync.sourceLabel}</span>
              <span className="rounded-xl border border-sky-300/20 bg-slate-950/40 px-3 py-2 text-xs text-sky-100">
                {opsCopy.sync.sourceValue}
              </span>
              <span className="font-medium">{opsCopy.sync.triggerEndpointLabel}</span>
              <code className="rounded-xl border border-sky-300/20 bg-slate-950/40 px-3 py-2 text-xs text-sky-100">
                POST /api/internal/sync
              </code>
            </div>
            <p className="mt-3 text-xs text-sky-100/75">{opsCopy.sync.cronHint}</p>
          </div>
          <div className="mt-6 rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-label">{opsCopy.sync.rotationLabel}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{opsCopy.sync.rotationLabel}</h3>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  {opsCopy.sync.currentWindowLabel} {formatDateTime(syncRotationPlan.currentSlotStartedAt, displayLocale)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  {opsCopy.sync.nextWindowLabel} {formatDateTime(syncRotationPlan.nextSlotStartsAt, displayLocale)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  {opsCopy.sync.cooldownLabel} {syncRotationPlan.cooldownSeconds}s
                </span>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {syncRotationPlan.sports.map((item) => (
                <div key={`rotation-${item.sport}`} className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">{item.sport}</p>
                  <div className="mt-4">
                    <p className="text-xs text-slate-500">{opsCopy.sync.currentWindowLabel}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.currentLeagues.map((leagueName) => (
                        <span key={`${item.sport}-current-${leagueName}`} className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs text-lime-100">
                          {leagueName}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-slate-500">{opsCopy.sync.nextWindowLabel}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.nextLeagues.map((leagueName) => (
                        <span key={`${item.sport}-next-${leagueName}`} className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs text-sky-100">
                          {leagueName}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-label">{opsCopy.sync.latestRuns}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{opsCopy.sync.dashboardTitle}</h3>
              </div>
            </div>
            <div className="mt-5 grid gap-4">
              {recentSyncRuns.map((run) => (
                <div key={run.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium text-white">{run.id.slice(0, 8)}</span>
                      <span className={`rounded-full px-3 py-1 text-xs ${
                        run.status === "completed"
                          ? "border border-lime-300/25 bg-lime-300/10 text-lime-100"
                          : run.status === "completed_with_errors"
                            ? "border border-orange-300/25 bg-orange-400/10 text-orange-100"
                            : run.status === "running"
                              ? "border border-sky-300/25 bg-sky-400/10 text-sky-100"
                              : "border border-rose-300/25 bg-rose-400/10 text-rose-100"
                      }`}>
                        {run.status === "running" ? opsCopy.sync.running : run.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {opsCopy.sync.duration}: {formatDurationMs(run.durationMs)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
                    {run.source ? <span>{opsCopy.sync.sourceLabel} {run.source}</span> : null}
                    <span>{opsCopy.sync.startedAt} {formatDateTime(run.startedAt, displayLocale)}</span>
                    {run.finishedAt ? <span>{opsCopy.sync.finishedAt} {formatDateTime(run.finishedAt, displayLocale)}</span> : null}
                    {run.countsSummary ? <span>{opsCopy.sync.counts} {run.countsSummary}</span> : null}
                  </div>
                  {run.sports && run.sports.length > 0 ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      <span className="text-slate-500">{opsCopy.sync.coverageLabel}</span>
                      {run.sports.map((item) =>
                        item.coveredLeagues.map((leagueName) => (
                          <span
                            key={`${run.id}-${item.sport}-${leagueName}`}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-200"
                          >
                            {item.sport} · {leagueName}
                          </span>
                        )),
                      )}
                    </div>
                  ) : null}
                  {run.failures.length > 0 ? (
                    <p className="mt-3 text-xs text-orange-200">
                      {opsCopy.sync.failures}: {run.failures.join(" | ")}
                    </p>
                  ) : null}
                  {run.errorText ? <p className="mt-3 text-xs text-rose-200">{run.errorText}</p> : null}
                </div>
              ))}
              {recentSyncRuns.length === 0 ? (
                <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                  {opsCopy.sync.noRuns}
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <ExpansionRowsPanel title={adminExpansion.events.dataSources.title} rows={adminExpansion.events.dataSources.rows} />
            <ExpansionRowsPanel title={adminExpansion.events.manualPatches.title} rows={adminExpansion.events.manualPatches.rows} />
            <ExpansionRowsPanel title={adminExpansion.events.leagues.title} rows={adminExpansion.events.leagues.rows} />
          </div>
          <div className="mt-6 grid gap-4">
            {matches.map((match) => (
              <div key={match.id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-white">
                    {match.homeTeam} vs {match.awayTeam}
                  </p>
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
                    {matchStatusLabels[match.status]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{match.insight}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "content" ? (
        <section className="glass-panel rounded-[2rem] p-6">
          <SectionHeading eyebrow={adminPageCopy.content.eyebrow} title={adminPageCopy.content.title} />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <form action="/api/admin/content/bootstrap" method="post">
              <button
                type="submit"
                className="rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
              >
                {adminPageCopy.content.bootstrapButton}
              </button>
            </form>
            <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300">
              {adminPageCopy.content.weeklyTarget}
            </span>
          </div>

          {contentNotice ? (
            <div
              className={`mt-6 rounded-[1.2rem] border px-4 py-3 text-sm ${
                error ? "border-rose-300/25 bg-rose-400/10 text-rose-100" : "border-lime-300/20 bg-lime-300/10 text-lime-100"
              }`}
            >
              {contentNotice}
            </div>
          ) : null}

          {knowledgeNotice ? (
            <div
              className={`mt-6 rounded-[1.2rem] border px-4 py-3 text-sm ${
                error === "assistant-knowledge"
                  ? "border-rose-300/25 bg-rose-400/10 text-rose-100"
                  : "border-lime-300/20 bg-lime-300/10 text-lime-100"
              }`}
            >
              {knowledgeNotice}
            </div>
          ) : null}

          <div className="mt-6 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-label">{adminPageCopy.content.homepageOverview.sectionLabel}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{adminPageCopy.content.homepageOverview.title}</h3>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">{adminPageCopy.content.homepageOverview.description}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  {adminPageCopy.content.homepageOverview.cards.banners.title}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-xl border border-lime-300/15 bg-lime-300/8 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-lime-100/70">
                      {adminPageCopy.content.homepageOverview.cards.banners.live}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">{activeLiveBannerCount}</p>
                  </div>
                  <div className="rounded-xl border border-sky-300/15 bg-sky-300/8 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-sky-100/70">
                      {adminPageCopy.content.homepageOverview.cards.banners.scheduled}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">{scheduledBannerCount}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      {adminPageCopy.content.homepageOverview.cards.banners.inactive}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">{inactiveBannerCount}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-400">
                  {adminPageCopy.content.homepageOverview.cards.banners.sourceLabel}:{" "}
                  <span className="text-white">{homepageHeroSourceLabel}</span>
                </p>
              </div>

              <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  {adminPageCopy.content.homepageOverview.cards.featured.title}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-orange-300/15 bg-orange-300/8 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-orange-100/70">
                      {adminPageCopy.content.homepageOverview.cards.featured.slotsLabel}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">{homepageFeaturedSlots.length}</p>
                  </div>
                  <div className="rounded-xl border border-sky-300/15 bg-sky-300/8 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-sky-100/70">
                      {adminPageCopy.content.homepageOverview.cards.featured.previewLabel}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">{homepageFeaturedMatches.length}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-400">
                  {adminPageCopy.content.homepageOverview.cards.featured.sourceLabel}:{" "}
                  <span className="text-white">
                    {adminPageCopy.content.featuredMatchesPreview.sourceLabels[homepageFeaturedPreview.source]}
                  </span>
                </p>
              </div>

              <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  {adminPageCopy.content.homepageOverview.cards.modules.title}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      {adminPageCopy.content.homepageOverview.cards.modules.totalLabel}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">{homepageModules.length}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      {adminPageCopy.content.homepageOverview.cards.modules.customLabel}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">{customHomepageModuleCount}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-400">
                  {adminPageCopy.content.homepageOverview.cards.modules.seedLabel}:{" "}
                  <span className="text-white">{homepageModuleCoverageLabel}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-label">{adminPageCopy.content.homepageReadiness.sectionLabel}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{adminPageCopy.content.homepageReadiness.title}</h3>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">{adminPageCopy.content.homepageReadiness.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200">
                <span
                  className={`rounded-full border px-3 py-1.5 ${
                    homepageReadinessIssueCount === 0
                      ? "border-lime-300/20 bg-lime-300/10 text-lime-100"
                      : "border-orange-300/20 bg-orange-300/10 text-orange-100"
                  }`}
                >
                  {homepageReadinessSummaryLabel}
                </span>
                <span className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1.5">
                  {adminPageCopy.content.homepageReadiness.summary.issues(homepageReadinessIssueCount)}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {homepageReadinessItems.map((item) => {
                const stateMeta = getReadinessStateMeta(item.state);

                return (
                  <div
                    key={item.key}
                    className={`rounded-[1.2rem] border p-4 ${stateMeta.ringClassName}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${stateMeta.dotClassName}`} />
                        <p className="font-medium text-white">{item.title}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs ${stateMeta.badgeClassName}`}>
                        {item.state === "ready"
                          ? adminPageCopy.content.homepageReadiness.states.ready
                          : adminPageCopy.content.homepageReadiness.states.attention}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
                    {item.action ? (
                      item.action.kind === "link" ? (
                        <Link
                          href={item.action.href}
                          className="mt-4 inline-flex rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30"
                        >
                          {item.action.label}
                        </Link>
                      ) : (
                        <form action={item.action.action} method="post" className="mt-4">
                          <input type="hidden" name="intent" value={item.action.intent} />
                          <button
                            type="submit"
                            className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30"
                          >
                            {item.action.label}
                          </button>
                        </form>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-sky-300/18 bg-sky-400/10 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-label">{adminPageCopy.content.featuredMatchesPreview.sectionLabel}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{adminPageCopy.content.featuredMatchesPreview.title}</h3>
                <p className="mt-2 max-w-3xl text-sm text-sky-100/85">{adminPageCopy.content.featuredMatchesPreview.description}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-200">
                <span className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1.5">
                  {adminPageCopy.content.featuredMatchesPreview.count(homepageFeaturedMatches.length)}
                </span>
                <span className="rounded-full border border-sky-300/20 bg-slate-950/35 px-3 py-1.5">
                  {adminPageCopy.content.featuredMatchesPreview.sourceLabel}{" "}
                  {adminPageCopy.content.featuredMatchesPreview.sourceLabels[homepageFeaturedPreview.source]}
                </span>
              </div>
            </div>

            {homepageFeaturedMatches.length > 0 ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {homepageFeaturedMatches.map((match) => (
                  <div key={`homepage-featured-${match.id}`} className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          {adminPageCopy.content.planList.filterOptions[match.sport]} · {match.leagueName ?? match.leagueSlug}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                        {matchStatusLabels[match.status]}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{adminPageCopy.content.featuredMatchesPreview.scoreLabel}</p>
                        <p className="mt-2 font-medium text-white">{match.score}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{adminPageCopy.content.featuredMatchesPreview.kickoffLabel}</p>
                        <p className="mt-2 font-medium text-white">{match.clock ? match.clock : formatDateTime(match.kickoff, displayLocale)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{adminPageCopy.content.featuredMatchesPreview.matchIdLabel}</p>
                        <p className="mt-2 break-all font-medium text-white">{match.id}</p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-400">{match.statLine}</p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={`/matches/${encodeURIComponent(match.id)}`}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30"
                      >
                        {adminPageCopy.content.featuredMatchesPreview.openMatch}
                      </Link>
                      <Link
                        href={`/live/${match.sport}`}
                        className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-sm text-sky-100 transition hover:border-sky-300/35 hover:bg-sky-300/14"
                      >
                        {adminPageCopy.content.featuredMatchesPreview.openLive}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                {adminPageCopy.content.featuredMatchesPreview.empty}
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
            <form id="homepage-featured-slot-form" action="/api/admin/operations/homepage-featured-match-slots" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.content.featuredSlotForm.sectionLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {currentFeaturedSlot ? adminPageCopy.content.featuredSlotForm.editTitle : adminPageCopy.content.featuredSlotForm.createTitle}
                  </h3>
                </div>
                {currentFeaturedSlot ? (
                  <Link
                    href={buildAdminContentHref({ contentSport, contentAuthorId, contentPlanStatus, contentQuery })}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {adminPageCopy.shared.cancelEdit}
                  </Link>
                ) : null}
              </div>

              <input type="hidden" name="intent" value="save" />
              <input type="hidden" name="id" value={currentFeaturedSlot?.id ?? ""} />

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.featuredSlotForm.fields.key}</span>
                  <input
                    type="text"
                    name="key"
                    defaultValue={currentFeaturedSlot?.key ?? ""}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.featuredSlotForm.fields.sortOrder}</span>
                  <input
                    type="number"
                    name="sortOrder"
                    defaultValue={currentFeaturedSlot?.sortOrder ?? homepageFeaturedSlots.length}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-slate-400">{adminPageCopy.content.featuredSlotForm.fields.matchRef}</span>
                  <select
                    name="matchRef"
                    defaultValue={currentFeaturedSlotMatchValue}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  >
                    <option value="">{adminPageCopy.content.featuredSlotForm.matchPlaceholder}</option>
                    {sortedMatches.map((match) => (
                      <option key={`featured-slot-option-${match.id}`} value={match.id}>
                        {adminPageCopy.shared.sports[match.sport]} | {match.leagueName ?? match.leagueSlug} | {match.homeTeam} vs {match.awayTeam} | {formatDateTime(match.kickoff, displayLocale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.featuredSlotForm.fields.status}</span>
                  <select
                    name="status"
                    defaultValue={currentFeaturedSlot?.status ?? "active"}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  >
                    <option value="active">{adminPageCopy.content.featuredSlotList.statusLabels.active}</option>
                    <option value="inactive">{adminPageCopy.content.featuredSlotList.statusLabels.inactive}</option>
                  </select>
                </label>
              </div>

              <button type="submit" className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
                {currentFeaturedSlot ? adminPageCopy.content.featuredSlotForm.saveButton : adminPageCopy.content.featuredSlotForm.createButton}
              </button>
            </form>

            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.content.featuredSlotList.sectionLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{adminPageCopy.content.featuredSlotList.title}</h3>
                </div>
                <span className="text-sm text-slate-500">{adminPageCopy.content.featuredSlotList.count(homepageFeaturedSlots.length)}</span>
              </div>

              <div className="mt-5 grid gap-4">
                {homepageFeaturedSlots.map((slot) => (
                  <div key={slot.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{slot.match ? `${slot.match.homeTeam} vs ${slot.match.awayTeam}` : slot.key}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {slot.key} | sort {slot.sortOrder}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs ${slot.status === "active" ? "bg-lime-300/12 text-lime-100" : "bg-white/8 text-slate-300"}`}>
                        {adminPageCopy.content.featuredSlotList.statusLabels[slot.status as keyof typeof adminPageCopy.content.featuredSlotList.statusLabels] ?? slot.status}
                      </span>
                    </div>
                    {slot.match ? (
                      <>
                        <p className="mt-3 text-sm text-slate-400">
                          {adminPageCopy.shared.sports[slot.match.sport]} | {slot.match.leagueName ?? slot.match.leagueSlug} | {slot.match.score}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">{slot.match.id}</p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-amber-200">{adminPageCopy.content.featuredSlotList.matchMissing}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={buildAdminContentHref({ contentSport, contentAuthorId, contentPlanStatus, contentQuery }, { editFeaturedSlot: slot.id })}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30"
                      >
                        {adminPageCopy.content.featuredSlotList.edit}
                      </Link>
                      <form action="/api/admin/operations/homepage-featured-match-slots" method="post">
                        <input type="hidden" name="intent" value="move-up" />
                        <input type="hidden" name="id" value={slot.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                          {adminPageCopy.content.featuredSlotList.moveUp}
                        </button>
                      </form>
                      <form action="/api/admin/operations/homepage-featured-match-slots" method="post">
                        <input type="hidden" name="intent" value="move-down" />
                        <input type="hidden" name="id" value={slot.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                          {adminPageCopy.content.featuredSlotList.moveDown}
                        </button>
                      </form>
                      <form action="/api/admin/operations/homepage-featured-match-slots" method="post">
                        <input type="hidden" name="intent" value="toggle-status" />
                        <input type="hidden" name="id" value={slot.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-orange-300/30 hover:text-white">
                          {slot.status === "active" ? adminPageCopy.content.featuredSlotList.disable : adminPageCopy.content.featuredSlotList.enable}
                        </button>
                      </form>
                      <form action="/api/admin/operations/homepage-featured-match-slots" method="post">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={slot.id} />
                        <button type="submit" className="rounded-full border border-rose-400/20 px-3 py-1.5 text-sm text-rose-100 transition hover:border-rose-300/40 hover:text-white">
                          {adminPageCopy.content.featuredSlotList.remove}
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
                {homepageFeaturedSlots.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                    {adminPageCopy.content.featuredMatchesPreview.empty}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr,1.25fr]">
            <form action="/api/admin/content/authors" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.content.authorForm.sectionLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {currentAuthor ? adminPageCopy.content.authorForm.editTitle : adminPageCopy.content.authorForm.createTitle}
                  </h3>
                </div>
                {currentAuthor ? (
                  <Link
                    href={buildAdminContentHref({ contentSport, contentAuthorId, contentPlanStatus, contentQuery })}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {adminPageCopy.shared.cancelEdit}
                  </Link>
                ) : null}
              </div>

              <input type="hidden" name="intent" value="save" />
              <input type="hidden" name="id" value={currentAuthor?.id ?? ""} />

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {(
                  [
                    ["name", adminPageCopy.content.authorForm.fields.name, currentAuthor?.name ?? ""],
                    ["slug", adminPageCopy.content.authorForm.fields.slug, currentAuthor?.slug ?? ""],
                    ["focus", adminPageCopy.content.authorForm.fields.focus, currentAuthor?.focus ?? ""],
                    ["badge", adminPageCopy.content.authorForm.fields.badge, currentAuthor?.badge ?? ""],
                    ["streak", adminPageCopy.content.authorForm.fields.streak, currentAuthor?.streak ?? ""],
                    ["winRate", adminPageCopy.content.authorForm.fields.winRate, currentAuthor?.winRate ?? ""],
                    ["monthlyRoi", adminPageCopy.content.authorForm.fields.monthlyRoi, currentAuthor?.monthlyRoi ?? ""],
                    ["followers", adminPageCopy.content.authorForm.fields.followers, currentAuthor?.followers ?? ""],
                  ] as const
                ).map(([name, label, value]) => (
                  <label key={name} className="space-y-2 text-sm">
                    <span className="text-slate-400">{label}</span>
                    <input
                      type="text"
                      name={name}
                      defaultValue={value}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                    />
                  </label>
                ))}
              </div>

              <label className="mt-4 block space-y-2 text-sm">
                <span className="text-slate-400">{adminPageCopy.content.authorForm.fields.bio}</span>
                <textarea
                  name="bio"
                  rows={4}
                  defaultValue={currentAuthor?.bio ?? ""}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                />
              </label>

              <label className="mt-4 block space-y-2 text-sm">
                <span className="text-slate-400">{adminPageCopy.content.authorForm.fields.status}</span>
                <select
                  name="status"
                  defaultValue={currentAuthor?.status ?? "active"}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                >
                  <option value="active">{adminPageCopy.shared.authorStatus.active}</option>
                  <option value="inactive">{adminPageCopy.shared.authorStatus.inactive}</option>
                </select>
              </label>

              <button
                type="submit"
                className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
              >
                {currentAuthor ? adminPageCopy.content.authorForm.saveButton : adminPageCopy.content.authorForm.createButton}
              </button>
            </form>

            <form action="/api/admin/content/plans" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.content.planForm.sectionLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {currentPlan ? adminPageCopy.content.planForm.editTitle : adminPageCopy.content.planForm.createTitle}
                  </h3>
                </div>
                {currentPlan ? (
                  <Link
                    href={buildAdminContentHref({ contentSport, contentAuthorId, contentPlanStatus, contentQuery })}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {adminPageCopy.shared.cancelEdit}
                  </Link>
                ) : null}
              </div>

              <input type="hidden" name="intent" value="save" />
              <input type="hidden" name="id" value={currentPlan?.id ?? ""} />
              <input type="hidden" name="contentSport" value={contentSport} />
              <input type="hidden" name="contentAuthorId" value={contentAuthorId} />
              <input type="hidden" name="contentPlanStatus" value={contentPlanStatus} />
              <input type="hidden" name="contentQuery" value={contentQuery} />

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-slate-400">{adminPageCopy.content.planForm.fields.title}</span>
                  <input
                    type="text"
                    name="title"
                    defaultValue={currentPlan?.title ?? ""}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.planForm.fields.slug}</span>
                  <input type="text" name="slug" defaultValue={currentPlan?.slug ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.planForm.fields.sport}</span>
                  <select name="sport" defaultValue={currentPlan?.sport ?? "football"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="football">{adminPageCopy.shared.sports.football}</option>
                    <option value="basketball">{adminPageCopy.shared.sports.basketball}</option>
                    <option value="cricket">{adminPageCopy.shared.sports.cricket}</option>
                    <option value="esports">{adminPageCopy.shared.sports.esports}</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.planForm.fields.matchId}</span>
                  <input
                    type="text"
                    name="matchId"
                    defaultValue={currentPlan?.matchId ?? ""}
                    placeholder="m7"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.planForm.fields.leagueLabel}</span>
                  <input type="text" name="leagueLabel" defaultValue={currentPlan?.leagueLabel ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.planForm.fields.kickoff}</span>
                  <input type="datetime-local" name="kickoff" defaultValue={toDateTimeLocalValue(currentPlan?.kickoff)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.planForm.fields.authorId}</span>
                  <select name="authorId" defaultValue={currentPlan?.authorId ?? authorTeams[0]?.id ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    {authorTeams.map((author) => (
                      <option key={author.id} value={author.id}>
                        {author.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.planForm.fields.price}</span>
                  <input type="number" min="0" name="price" defaultValue={currentPlan?.price ?? 38} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.planForm.fields.performance}</span>
                  <input type="text" name="performance" defaultValue={currentPlan?.performance ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.planForm.fields.status}</span>
                  <select name="status" defaultValue={currentPlan?.status ?? "draft"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="draft">{adminPageCopy.shared.planStatus.draft}</option>
                    <option value="published">{adminPageCopy.shared.planStatus.published}</option>
                    <option value="archived">{adminPageCopy.shared.planStatus.archived}</option>
                  </select>
                </label>
              </div>

              {(
                [
                  ["teaser", adminPageCopy.content.planForm.fields.teaser, 3, currentPlan?.teaser ?? ""],
                  ["marketSummary", adminPageCopy.content.planForm.fields.marketSummary, 2, currentPlan?.marketSummary ?? ""],
                  ["previewText", adminPageCopy.content.planForm.fields.previewText, 2, currentPlan?.previewText ?? ""],
                  ["fullAnalysisText", adminPageCopy.content.planForm.fields.fullAnalysisText, 7, currentPlan?.fullAnalysisText ?? ""],
                ] as const
              ).map(([name, label, rows, value]) => (
                <label key={name} className="mt-4 block space-y-2 text-sm">
                  <span className="text-slate-400">{label}</span>
                  <textarea name={name} rows={rows} defaultValue={value} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
              ))}

              <label className="mt-4 block space-y-2 text-sm">
                <span className="text-slate-400">{adminPageCopy.content.planForm.fields.tags}</span>
                <input
                  type="text"
                  name="tagsText"
                  defaultValue={currentPlan?.tagsText ?? ""}
                  placeholder={adminPageCopy.content.planForm.tagPlaceholder}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                />
              </label>

              <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
                <input type="checkbox" name="isHot" defaultChecked={currentPlan?.isHot ?? false} className="h-4 w-4" />
                {adminPageCopy.content.planForm.hotToggle}
              </label>

              <button
                type="submit"
                className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
              >
                {currentPlan ? adminPageCopy.content.planForm.saveButton : adminPageCopy.content.planForm.createButton}
              </button>
            </form>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr,1.2fr]">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.content.authorList.sectionLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{adminPageCopy.content.authorList.title}</h3>
                </div>
                <span className="text-sm text-slate-500">{adminPageCopy.content.authorList.count(authorTeams.length)}</span>
              </div>

              <div className="mt-5 grid gap-4">
                {authorTeams.map((author) => (
                  <div key={author.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{author.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{author.focus}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs ${author.status === "active" ? "bg-lime-300/12 text-lime-100" : "bg-white/8 text-slate-300"}`}>
                        {adminPageCopy.content.authorList.statusLabels[author.status as keyof typeof adminPageCopy.content.authorList.statusLabels] ?? author.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-400">
                      {author.badge} | {adminPageCopy.content.authorList.winRate} {author.winRate} | {adminPageCopy.content.authorList.roi} {author.monthlyRoi}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={buildAdminContentHref({ contentSport, contentAuthorId, contentPlanStatus, contentQuery }, { editAuthor: author.id })}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30"
                      >
                        {adminPageCopy.content.authorList.edit}
                      </Link>
                      <form action="/api/admin/content/authors" method="post">
                        <input type="hidden" name="intent" value="toggle-status" />
                        <input type="hidden" name="id" value={author.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-orange-300/30 hover:text-white">
                          {author.status === "active" ? adminPageCopy.content.authorList.disable : adminPageCopy.content.authorList.enable}
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.content.planList.sectionLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{adminPageCopy.content.planList.title}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <form action="/admin" method="get" className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="tab" value="content" />
                    <label className="text-sm text-slate-400">{adminPageCopy.content.planList.filterLabel}</label>
                    <select
                      name="contentSport"
                      defaultValue={contentSport}
                      className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-white outline-none"
                    >
                      <option value="all">{adminPageCopy.content.planList.filterOptions.all}</option>
                      <option value="football">{adminPageCopy.content.planList.filterOptions.football}</option>
                      <option value="basketball">{adminPageCopy.content.planList.filterOptions.basketball}</option>
                      <option value="cricket">{adminPageCopy.content.planList.filterOptions.cricket}</option>
                      <option value="esports">{adminPageCopy.content.planList.filterOptions.esports}</option>
                    </select>
                    <label className="text-sm text-slate-400">{adminPageCopy.content.planList.authorFilterLabel}</label>
                    <select
                      name="contentAuthorId"
                      defaultValue={contentAuthorId}
                      className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-white outline-none"
                    >
                      <option value="">{adminPageCopy.content.planList.authorFilterAll}</option>
                      {authorTeams.map((author) => (
                        <option key={author.id} value={author.id}>
                          {author.name}
                        </option>
                      ))}
                    </select>
                    <label className="text-sm text-slate-400">{adminPageCopy.content.planList.statusFilterLabel}</label>
                    <select
                      name="contentPlanStatus"
                      defaultValue={contentPlanStatus}
                      className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-white outline-none"
                    >
                      <option value="all">{adminPageCopy.content.planList.statusFilterOptions.all}</option>
                      <option value="draft">{adminPageCopy.content.planList.statusFilterOptions.draft}</option>
                      <option value="published">{adminPageCopy.content.planList.statusFilterOptions.published}</option>
                      <option value="archived">{adminPageCopy.content.planList.statusFilterOptions.archived}</option>
                    </select>
                    <label className="text-sm text-slate-400">{adminPageCopy.content.planList.searchLabel}</label>
                    <input
                      type="text"
                      name="contentQuery"
                      defaultValue={contentQuery}
                      placeholder={adminPageCopy.content.planList.searchPlaceholder}
                      className="min-w-48 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-white outline-none placeholder:text-slate-500"
                    />
                    <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-200 transition hover:border-white/25 hover:text-white">
                      OK
                    </button>
                  </form>
                  <span className="text-sm text-slate-500">{adminPageCopy.content.planList.count(filteredArticlePlans.length)}</span>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                {filteredArticlePlans.map((plan) => (
                  <div key={plan.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{plan.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {plan.leagueLabel} | {formatDateTime(plan.kickoff, displayLocale)}
                        </p>
                        {plan.matchId ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {adminPageCopy.content.planForm.fields.matchId}: {plan.matchId}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs ${plan.status === "published" ? "bg-lime-300/12 text-lime-100" : plan.status === "archived" ? "bg-white/8 text-slate-400" : "bg-orange-400/12 text-orange-200"}`}>
                          {adminPageCopy.content.planList.statusLabels[plan.status as keyof typeof adminPageCopy.content.planList.statusLabels] ?? plan.status}
                        </span>
                        {plan.isHot ? (
                          <span className="rounded-full bg-orange-400/12 px-3 py-1 text-xs text-orange-200">
                            {adminPageCopy.content.planList.hotBadge}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-400">{plan.teaser}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                      <span>{formatPrice(plan.price, displayLocale)}</span>
                      <span>{plan.performance}</span>
                      <span>{adminPageCopy.shared.sports[plan.sport as keyof typeof adminPageCopy.shared.sports]}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={buildAdminContentHref({ contentSport, contentAuthorId, contentPlanStatus, contentQuery }, { editPlan: plan.id })}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30"
                      >
                        {adminPageCopy.content.planList.edit}
                      </Link>
                      <form action="/api/admin/content/plans" method="post">
                        <input type="hidden" name="intent" value="toggle-status" />
                        <input type="hidden" name="id" value={plan.id} />
                        <input type="hidden" name="contentSport" value={contentSport} />
                        <input type="hidden" name="contentAuthorId" value={contentAuthorId} />
                        <input type="hidden" name="contentPlanStatus" value={contentPlanStatus} />
                        <input type="hidden" name="contentQuery" value={contentQuery} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-lime-300/30 hover:text-white">
                          {plan.status === "published" ? adminPageCopy.content.planList.switchToDraft : adminPageCopy.content.planList.publish}
                        </button>
                      </form>
                      <form action="/api/admin/content/plans" method="post">
                        <input type="hidden" name="intent" value="toggle-hot" />
                        <input type="hidden" name="id" value={plan.id} />
                        <input type="hidden" name="contentSport" value={contentSport} />
                        <input type="hidden" name="contentAuthorId" value={contentAuthorId} />
                        <input type="hidden" name="contentPlanStatus" value={contentPlanStatus} />
                        <input type="hidden" name="contentQuery" value={contentQuery} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-orange-300/30 hover:text-white">
                          {plan.isHot ? adminPageCopy.content.planList.clearHot : adminPageCopy.content.planList.setHot}
                        </button>
                      </form>
                      <form action="/api/admin/content/plans" method="post">
                        <input type="hidden" name="intent" value="archive" />
                        <input type="hidden" name="id" value={plan.id} />
                        <input type="hidden" name="contentSport" value={contentSport} />
                        <input type="hidden" name="contentAuthorId" value={contentAuthorId} />
                        <input type="hidden" name="contentPlanStatus" value={contentPlanStatus} />
                        <input type="hidden" name="contentQuery" value={contentQuery} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-rose-300/30 hover:text-white">
                          {adminPageCopy.content.planList.archive}
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
                {filteredArticlePlans.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                    {adminPageCopy.content.planList.empty}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div id="homepage-banner-form" className="mt-6 grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
            <AdminBannerComposer
              locale={displayLocale}
              currentBanner={currentBanner}
              homepageBannerCount={homepageBanners.length}
              cancelLabel={adminPageCopy.shared.cancelEdit}
              cancelHref="/admin?tab=content"
              formCopy={adminPageCopy.content.bannerForm}
              statusCopy={adminPageCopy.content.bannerList.statusLabels}
              seedTemplates={bannerSeedTemplates}
            />

            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.content.bannerList.sectionLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{adminPageCopy.content.bannerList.title}</h3>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                    {adminPageCopy.content.bannerList.count(homepageBanners.length)}
                  </span>
                  <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs text-lime-100">
                    {bannerAnalyticsCopy.liveCount(activeLiveBannerCount)}
                  </span>
                  <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs text-sky-100">
                    {bannerAnalyticsCopy.scheduledCount(scheduledBannerCount)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                    {bannerAnalyticsCopy.inactiveCount(inactiveBannerCount)}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                {homepageBanners.map((banner) => (
                  <div key={banner.id} className="overflow-hidden rounded-[1.2rem] border border-white/8 bg-slate-950/40">
                    {(() => {
                      const runState = getBannerRunState(banner, locale);
                      const homepageSlotIndex = homepageHeroBannerIds.findIndex((id) => id === banner.id);
                      const homepageSlotLabel =
                        homepageSlotIndex >= 0
                          ? bannerAnalyticsCopy.heroSlot(homepageSlotIndex + 1)
                          : bannerAnalyticsCopy.standby;

                      return (
                        <>
                    <div
                      className="relative min-h-52 overflow-hidden border-b border-white/8 p-4"
                      style={{
                        backgroundImage: `linear-gradient(135deg, rgba(3, 8, 20, 0.92), rgba(6, 17, 27, 0.82)), url(${banner.imageUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${getBannerThemeSurface(banner.theme).glow}`} />
                      <div className="relative flex min-h-44 flex-col justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.24em] ${getBannerThemeSurface(banner.theme).chip}`}>
                            {adminPageCopy.content.bannerList.themeLabels[banner.theme as keyof typeof adminPageCopy.content.bannerList.themeLabels]}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs ${runState.classes}`}>
                            {runState.label}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                            {bannerAnalyticsCopy.order(banner.sortOrder)}
                          </span>
                          <span className={`rounded-full border px-3 py-1 text-xs ${
                            homepageSlotIndex >= 0
                              ? "border-orange-300/20 bg-orange-300/10 text-orange-100"
                              : "border-white/10 bg-white/5 text-slate-300"
                          }`}>
                            {homepageSlotLabel}
                          </span>
                        </div>

                        <div>
                          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-300">
                            {banner.subtitleZhCn}
                          </p>
                          <p className="mt-3 text-2xl font-semibold text-white">{banner.titleZhCn}</p>
                          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">{banner.descriptionZhCn}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="grid gap-3 text-sm md:grid-cols-2">
                        <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-3 text-slate-300">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                            {bannerAnalyticsCopy.performance}
                          </p>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-xl border border-white/8 bg-slate-950/50 p-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                                {bannerAnalyticsCopy.impressions}
                              </p>
                              <p className="mt-2 text-lg font-semibold text-white">{banner.impressionCount}</p>
                            </div>
                            <div className="rounded-xl border border-white/8 bg-slate-950/50 p-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                                {bannerAnalyticsCopy.clicks}
                              </p>
                              <p className="mt-2 text-lg font-semibold text-white">{banner.clickCount}</p>
                            </div>
                            <div className="rounded-xl border border-white/8 bg-slate-950/50 p-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">CTR</p>
                              <p className="mt-2 text-lg font-semibold text-white">
                                {banner.impressionCount > 0
                                  ? `${((banner.clickCount / banner.impressionCount) * 100).toFixed(1)}%`
                                  : "--"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-xl border border-white/8 bg-slate-950/50 p-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                                {bannerAnalyticsCopy.recentImpressions}
                              </p>
                              <p className="mt-2 text-lg font-semibold text-white">{banner.recentImpressionCount}</p>
                            </div>
                            <div className="rounded-xl border border-white/8 bg-slate-950/50 p-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                                {bannerAnalyticsCopy.recentClicks}
                              </p>
                              <p className="mt-2 text-lg font-semibold text-white">{banner.recentClickCount}</p>
                            </div>
                            <div className="rounded-xl border border-white/8 bg-slate-950/50 p-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">7D CTR</p>
                              <p className="mt-2 text-lg font-semibold text-white">
                                {banner.recentImpressionCount > 0
                                  ? `${((banner.recentClickCount / banner.recentImpressionCount) * 100).toFixed(1)}%`
                                  : "--"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-[1rem] border border-orange-300/15 bg-orange-300/8 p-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-orange-100/70">
                                {bannerAnalyticsCopy.primarySlot}
                              </p>
                              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <p className="text-slate-400">{bannerAnalyticsCopy.shortImpressions}</p>
                                  <p className="mt-1 font-semibold text-white">{banner.primaryImpressionCount}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400">{bannerAnalyticsCopy.shortClicks}</p>
                                  <p className="mt-1 font-semibold text-white">{banner.primaryClickCount}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400">CTR</p>
                                  <p className="mt-1 font-semibold text-white">
                                    {banner.primaryImpressionCount > 0
                                      ? `${((banner.primaryClickCount / banner.primaryImpressionCount) * 100).toFixed(1)}%`
                                      : "--"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="rounded-[1rem] border border-sky-300/15 bg-sky-300/8 p-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-sky-100/70">
                                {bannerAnalyticsCopy.secondarySlot}
                              </p>
                              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <p className="text-slate-400">{bannerAnalyticsCopy.shortImpressions}</p>
                                  <p className="mt-1 font-semibold text-white">{banner.secondaryImpressionCount}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400">{bannerAnalyticsCopy.shortClicks}</p>
                                  <p className="mt-1 font-semibold text-white">{banner.secondaryClickCount}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400">CTR</p>
                                  <p className="mt-1 font-semibold text-white">
                                    {banner.secondaryImpressionCount > 0
                                      ? `${((banner.secondaryClickCount / banner.secondaryImpressionCount) * 100).toFixed(1)}%`
                                      : "--"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                            <p>
                              {bannerAnalyticsCopy.lastImpression}:{" "}
                              <span className="text-slate-300">
                                {banner.lastImpressionAt ? formatDateTime(banner.lastImpressionAt, displayLocale) : "--"}
                              </span>
                            </p>
                            <p>
                              {bannerAnalyticsCopy.lastClick}:{" "}
                              <span className="text-slate-300">
                                {banner.lastClickAt ? formatDateTime(banner.lastClickAt, displayLocale) : "--"}
                              </span>
                            </p>
                          </div>
                          <div className="mt-4 rounded-[1rem] border border-white/8 bg-slate-950/45 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                                {bannerAnalyticsCopy.trendTitle}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                                <span className="inline-flex items-center gap-1">
                                  <span className="h-2 w-2 rounded-full bg-sky-300" />
                                  {bannerAnalyticsCopy.impressions}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <span className="h-2 w-2 rounded-full bg-orange-300" />
                                  {bannerAnalyticsCopy.clicks}
                                </span>
                              </div>
                            </div>
                            <div className="mt-4 grid grid-cols-7 gap-2">
                              {(() => {
                                const trendMax = getTrendMaxValue(banner.dailyStats);

                                return banner.dailyStats.map((point) => {
                                  const impressionHeight = trendMax > 0 ? Math.max((point.impressionCount / trendMax) * 100, point.impressionCount > 0 ? 10 : 0) : 0;
                                  const clickHeight = trendMax > 0 ? Math.max((point.clickCount / trendMax) * 100, point.clickCount > 0 ? 10 : 0) : 0;

                                  return (
                                    <div key={point.date} className="flex flex-col items-center gap-2">
                                      <div className="flex h-24 items-end gap-1">
                                        <div
                                          className="w-3 rounded-full bg-sky-300/80"
                                          style={{ height: `${impressionHeight}%` }}
                                          title={`${formatShortDateLabel(point.date, displayLocale)} · ${bannerAnalyticsCopy.impressions}: ${point.impressionCount}`}
                                        />
                                        <div
                                          className="w-3 rounded-full bg-orange-300/85"
                                          style={{ height: `${clickHeight}%` }}
                                          title={`${formatShortDateLabel(point.date, displayLocale)} · ${bannerAnalyticsCopy.clicks}: ${point.clickCount}`}
                                        />
                                      </div>
                                      <span className="text-[10px] text-slate-500">
                                        {formatShortDateLabel(point.date, displayLocale)}
                                      </span>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-3 text-slate-300">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{adminPageCopy.content.bannerList.localePreview}</p>
                          <p className="mt-2 text-sm text-white">CN: {banner.titleZhCn}</p>
                          <p className="mt-1 text-sm text-slate-400">TW: {banner.titleZhTw}</p>
                          <p className="mt-1 text-sm text-slate-400">EN: {banner.titleEn}</p>
                        </div>
                        <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-3 text-slate-300">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{adminPageCopy.content.bannerList.activeWindow}</p>
                          <p className="mt-2 text-sm text-white">
                            {formatAnnouncementWindow(
                              banner.startsAt,
                              banner.endsAt,
                              displayLocale,
                              adminPageCopy.content.bannerList.noWindow,
                            )}
                          </p>
                          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">CTA</p>
                          <p className="mt-2 text-sm text-slate-300">{banner.ctaLabelZhCn}</p>
                        </div>
                        <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-3 text-slate-300 md:col-span-2">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                            {bannerAnalyticsCopy.targetLink}
                          </p>
                          <p className="mt-2 break-all text-sm text-white">{banner.href}</p>
                          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">
                            {adminPageCopy.content.bannerList.image}
                          </p>
                          <p className="mt-2 break-all text-sm text-slate-400">{banner.imageUrl}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href={buildAdminContentHref({ contentSport, contentAuthorId, contentPlanStatus, contentQuery }, { editBanner: banner.id })}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30"
                        >
                          {adminPageCopy.content.bannerList.edit}
                        </Link>
                        <form action="/api/admin/operations/homepage-banners" method="post">
                          <input type="hidden" name="intent" value="duplicate" />
                          <input type="hidden" name="id" value={banner.id} />
                          <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-sky-300/30 hover:text-white">
                            {bannerAnalyticsCopy.duplicate}
                          </button>
                        </form>
                        <form action="/api/admin/operations/homepage-banners" method="post">
                          <input type="hidden" name="intent" value="move-up" />
                          <input type="hidden" name="id" value={banner.id} />
                          <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                            {adminPageCopy.content.bannerList.moveUp}
                          </button>
                        </form>
                        <form action="/api/admin/operations/homepage-banners" method="post">
                          <input type="hidden" name="intent" value="move-down" />
                          <input type="hidden" name="id" value={banner.id} />
                          <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                            {adminPageCopy.content.bannerList.moveDown}
                          </button>
                        </form>
                        <form action="/api/admin/operations/homepage-banners" method="post">
                          <input type="hidden" name="intent" value="toggle-status" />
                          <input type="hidden" name="id" value={banner.id} />
                          <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-orange-300/30 hover:text-white">
                            {banner.status === "active" ? adminPageCopy.content.bannerList.disable : adminPageCopy.content.bannerList.enable}
                          </button>
                        </form>
                      </div>
                    </div>
                        </>
                      );
                    })()}
                  </div>
                ))}
                {homepageBanners.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                    {bannerAnalyticsCopy.empty}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
            <form id="homepage-module-form" action="/api/admin/operations/homepage-modules" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.content.moduleForm.sectionLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {currentModule ? adminPageCopy.content.moduleForm.editTitle : adminPageCopy.content.moduleForm.createTitle}
                  </h3>
                </div>
                {currentModule ? (
                  <Link
                    href={buildAdminContentHref({ contentSport, contentAuthorId, contentPlanStatus, contentQuery })}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {adminPageCopy.shared.cancelEdit}
                  </Link>
                ) : null}
              </div>

              <input type="hidden" name="intent" value="save" />
              <input type="hidden" name="id" value={currentModule?.id ?? ""} />

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.moduleForm.fields.title}</span>
                  <input type="text" name="title" defaultValue={currentModule?.title ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.moduleForm.fields.key}</span>
                  <input type="text" name="key" defaultValue={currentModule?.key ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.moduleForm.fields.eyebrow}</span>
                  <input type="text" name="eyebrow" defaultValue={currentModule?.eyebrow ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.moduleForm.fields.metric}</span>
                  <input type="text" name="metric" defaultValue={currentModule?.metric ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <div className="rounded-2xl border border-sky-300/14 bg-sky-300/8 px-4 py-3 text-sm text-sky-100 md:col-span-2">
                  <p className="font-medium text-white">{adminPageCopy.content.moduleForm.runtimePreview}</p>
                  {currentModule ? (
                    <p className="mt-2">
                      {homepageModuleRuntimeMetricMap.get(currentModule.key ?? currentModule.id) ?? currentModule.metric}
                    </p>
                  ) : (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {homepageModuleRuntimePreview.slice(0, 5).map((module) => (
                        <div key={`module-runtime-preview-${module.id}`} className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{module.key ?? module.id}</p>
                          <p className="mt-1 font-medium text-white">{module.metric}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-sky-100/75">{adminPageCopy.content.moduleForm.runtimeHint}</p>
                </div>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-slate-400">{adminPageCopy.content.moduleForm.fields.description}</span>
                  <textarea name="description" rows={3} defaultValue={currentModule?.description ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-slate-400">{adminPageCopy.content.moduleForm.fields.href}</span>
                  <input type="text" name="href" defaultValue={currentModule?.href ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.moduleForm.fields.sortOrder}</span>
                  <input type="number" name="sortOrder" defaultValue={currentModule?.sortOrder ?? homepageModules.length} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.moduleForm.fields.status}</span>
                  <select name="status" defaultValue={currentModule?.status ?? "active"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="active">{adminPageCopy.content.moduleList.statusLabels.active}</option>
                    <option value="inactive">{adminPageCopy.content.moduleList.statusLabels.inactive}</option>
                  </select>
                </label>
              </div>

              <button type="submit" className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
                {currentModule ? adminPageCopy.content.moduleForm.saveButton : adminPageCopy.content.moduleForm.createButton}
              </button>
            </form>

            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.content.moduleList.sectionLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{adminPageCopy.content.moduleList.title}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">{adminPageCopy.content.moduleList.count(homepageModules.length)}</span>
                  <form action="/api/admin/operations/homepage-modules" method="post">
                    <input type="hidden" name="intent" value="bootstrap" />
                    <button type="submit" className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-sm text-sky-100 transition hover:border-sky-300/35 hover:bg-sky-300/15">
                      {adminPageCopy.content.moduleList.seedButton}
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                {homepageModules.map((module) => (
                  <div key={module.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{module.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {module.eyebrow} | {module.key} | {module.href}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs ${module.status === "active" ? "bg-lime-300/12 text-lime-100" : "bg-white/8 text-slate-300"}`}>
                        {adminPageCopy.content.moduleList.statusLabels[module.status as keyof typeof adminPageCopy.content.moduleList.statusLabels] ?? module.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-400">{module.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                      <span>{adminPageCopy.content.moduleList.savedMetric}: {module.metric}</span>
                      <span>{adminPageCopy.content.moduleList.runtimeMetric}: {homepageModuleRuntimeMetricMap.get(module.key ?? module.id) ?? module.metric}</span>
                      <span>sort {module.sortOrder}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={buildAdminContentHref({ contentSport, contentAuthorId, contentPlanStatus, contentQuery }, { editModule: module.id })}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30"
                      >
                        {adminPageCopy.content.moduleList.edit}
                      </Link>
                      <form action="/api/admin/operations/homepage-modules" method="post">
                        <input type="hidden" name="intent" value="move-up" />
                        <input type="hidden" name="id" value={module.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                          {adminPageCopy.content.moduleList.moveUp}
                        </button>
                      </form>
                      <form action="/api/admin/operations/homepage-modules" method="post">
                        <input type="hidden" name="intent" value="move-down" />
                        <input type="hidden" name="id" value={module.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                          {adminPageCopy.content.moduleList.moveDown}
                        </button>
                      </form>
                      <form action="/api/admin/operations/homepage-modules" method="post">
                        <input type="hidden" name="intent" value="toggle-status" />
                        <input type="hidden" name="id" value={module.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-orange-300/30 hover:text-white">
                          {module.status === "active" ? adminPageCopy.content.moduleList.disable : adminPageCopy.content.moduleList.enable}
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
                {homepageModules.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                    <p>{adminPageCopy.content.moduleList.empty}</p>
                    <form action="/api/admin/operations/homepage-modules" method="post" className="mt-4">
                      <input type="hidden" name="intent" value="bootstrap" />
                      <button type="submit" className="rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-sm text-sky-100 transition hover:border-sky-300/35 hover:bg-sky-300/15">
                        {adminPageCopy.content.moduleList.seedButton}
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
            <form action="/api/admin/operations/site-announcements" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.content.announcementForm.sectionLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {currentAnnouncement
                      ? adminPageCopy.content.announcementForm.editTitle
                      : adminPageCopy.content.announcementForm.createTitle}
                  </h3>
                </div>
                {currentAnnouncement ? (
                  <Link
                    href={buildAdminContentHref({ contentSport, contentAuthorId, contentPlanStatus, contentQuery })}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {adminPageCopy.shared.cancelEdit}
                  </Link>
                ) : null}
              </div>

              <input type="hidden" name="intent" value="save" />
              <input type="hidden" name="id" value={currentAnnouncement?.id ?? ""} />

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.announcementForm.fields.key}</span>
                  <input type="text" name="key" defaultValue={currentAnnouncement?.key ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.announcementForm.fields.tone}</span>
                  <select name="tone" defaultValue={currentAnnouncement?.tone ?? "info"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    {Object.entries(adminPageCopy.content.announcementForm.toneLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.announcementForm.fields.startsAt}</span>
                  <input type="datetime-local" name="startsAt" defaultValue={toDateTimeLocalValue(currentAnnouncement?.startsAt)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.announcementForm.fields.endsAt}</span>
                  <input type="datetime-local" name="endsAt" defaultValue={toDateTimeLocalValue(currentAnnouncement?.endsAt)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-slate-400">{adminPageCopy.content.announcementForm.fields.href}</span>
                  <input type="text" name="href" defaultValue={currentAnnouncement?.href ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.announcementForm.fields.sortOrder}</span>
                  <input type="number" name="sortOrder" defaultValue={currentAnnouncement?.sortOrder ?? siteAnnouncements.length} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{adminPageCopy.content.announcementForm.fields.status}</span>
                  <select name="status" defaultValue={currentAnnouncement?.status ?? "active"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="active">{adminPageCopy.content.announcementList.statusLabels.active}</option>
                    <option value="inactive">{adminPageCopy.content.announcementList.statusLabels.inactive}</option>
                  </select>
                </label>
                {[
                  ["titleZhCn", adminPageCopy.content.announcementForm.fields.titleZhCn, currentAnnouncement?.titleZhCn ?? ""],
                  ["titleZhTw", adminPageCopy.content.announcementForm.fields.titleZhTw, currentAnnouncement?.titleZhTw ?? ""],
                  ["titleEn", adminPageCopy.content.announcementForm.fields.titleEn, currentAnnouncement?.titleEn ?? ""],
                  ["ctaLabelZhCn", adminPageCopy.content.announcementForm.fields.ctaLabelZhCn, currentAnnouncement?.ctaLabelZhCn ?? ""],
                  ["ctaLabelZhTw", adminPageCopy.content.announcementForm.fields.ctaLabelZhTw, currentAnnouncement?.ctaLabelZhTw ?? ""],
                  ["ctaLabelEn", adminPageCopy.content.announcementForm.fields.ctaLabelEn, currentAnnouncement?.ctaLabelEn ?? ""],
                ].map(([name, label, defaultValue]) => (
                  <label key={name} className="space-y-2 text-sm">
                    <span className="text-slate-400">{label}</span>
                    <input type="text" name={name} defaultValue={defaultValue} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                  </label>
                ))}
                {[
                  ["messageZhCn", adminPageCopy.content.announcementForm.fields.messageZhCn, currentAnnouncement?.messageZhCn ?? ""],
                  ["messageZhTw", adminPageCopy.content.announcementForm.fields.messageZhTw, currentAnnouncement?.messageZhTw ?? ""],
                  ["messageEn", adminPageCopy.content.announcementForm.fields.messageEn, currentAnnouncement?.messageEn ?? ""],
                ].map(([name, label, defaultValue]) => (
                  <label key={name} className="space-y-2 text-sm md:col-span-2">
                    <span className="text-slate-400">{label}</span>
                    <textarea name={name} rows={3} defaultValue={defaultValue} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                  </label>
                ))}
              </div>

              <button type="submit" className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
                {currentAnnouncement
                  ? adminPageCopy.content.announcementForm.saveButton
                  : adminPageCopy.content.announcementForm.createButton}
              </button>
            </form>

            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.content.announcementList.sectionLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{adminPageCopy.content.announcementList.title}</h3>
                </div>
                <span className="text-sm text-slate-500">{adminPageCopy.content.announcementList.count(siteAnnouncements.length)}</span>
              </div>

              <div className="mt-5 grid gap-4">
                {siteAnnouncements.map((announcement) => (
                  <div key={announcement.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{announcement.titleZhCn}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {announcement.key} | {adminPageCopy.content.announcementList.toneLabels[announcement.tone as keyof typeof adminPageCopy.content.announcementList.toneLabels]}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs ${announcement.status === "active" ? "bg-lime-300/12 text-lime-100" : "bg-white/8 text-slate-300"}`}>
                        {adminPageCopy.content.announcementList.statusLabels[announcement.status as keyof typeof adminPageCopy.content.announcementList.statusLabels] ?? announcement.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-slate-300">
                      <p>{announcement.messageZhCn}</p>
                      <p className="text-slate-400">
                        {adminPageCopy.content.announcementList.localePreview}: TW {announcement.titleZhTw} / EN {announcement.titleEn}
                      </p>
                      <p className="text-slate-400">
                        {adminPageCopy.content.announcementList.activeWindow}: {formatAnnouncementWindow(
                          announcement.startsAt,
                          announcement.endsAt,
                          displayLocale,
                          adminPageCopy.content.announcementList.noWindow,
                        )}
                      </p>
                      {announcement.href ? (
                        <p className="text-slate-400">
                          {announcement.href}
                          {announcement.ctaLabelZhCn ? ` | ${adminPageCopy.content.announcementList.cta}: ${announcement.ctaLabelZhCn}` : ""}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={buildAdminContentHref({ contentSport, contentAuthorId, contentPlanStatus, contentQuery }, { editAnnouncement: announcement.id })}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30"
                      >
                        {adminPageCopy.content.announcementList.edit}
                      </Link>
                      <form action="/api/admin/operations/site-announcements" method="post">
                        <input type="hidden" name="intent" value="move-up" />
                        <input type="hidden" name="id" value={announcement.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                          {adminPageCopy.content.announcementList.moveUp}
                        </button>
                      </form>
                      <form action="/api/admin/operations/site-announcements" method="post">
                        <input type="hidden" name="intent" value="move-down" />
                        <input type="hidden" name="id" value={announcement.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                          {adminPageCopy.content.announcementList.moveDown}
                        </button>
                      </form>
                      <form action="/api/admin/operations/site-announcements" method="post">
                        <input type="hidden" name="intent" value="toggle-status" />
                        <input type="hidden" name="id" value={announcement.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-orange-300/30 hover:text-white">
                          {announcement.status === "active"
                            ? adminPageCopy.content.announcementList.disable
                            : adminPageCopy.content.announcementList.enable}
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
                {siteAnnouncements.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                    {adminPageCopy.content.announcementList.empty}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr,1.28fr]">
            <form action="/api/admin/operations/site-assistant-knowledge" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-label">{assistantKnowledgeCopy.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{assistantKnowledgeCopy.formTitle}</h3>
                  <p className="mt-2 text-sm text-slate-400">{assistantKnowledgeCopy.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentKnowledgeItem ? (
                    <Link
                      href={buildAdminContentHref(contentKnowledgeRouteState)}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/25 hover:text-white"
                    >
                      {adminPageCopy.shared.cancelEdit}
                    </Link>
                  ) : null}
                  <button
                    type="submit"
                    name="intent"
                    value="seed"
                    formAction="/api/admin/operations/site-assistant-knowledge"
                    formMethod="post"
                    className="rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm text-sky-100 transition hover:border-sky-300/35 hover:bg-sky-400/20"
                  >
                    {assistantKnowledgeCopy.seed}
                  </button>
                </div>
              </div>
              <input type="hidden" name="id" value={currentKnowledgeItem?.id ?? ""} />
              <input type="hidden" name="contentSport" value={contentSport} />
              <input type="hidden" name="contentAuthorId" value={contentAuthorId} />
              <input type="hidden" name="contentPlanStatus" value={contentPlanStatus} />
              <input type="hidden" name="contentQuery" value={contentQuery} />
              <input type="hidden" name="knowledgeStatus" value={knowledgeStatus} />
              <input type="hidden" name="knowledgeCategory" value={knowledgeCategory} />
              <input type="hidden" name="knowledgeQuery" value={knowledgeQuery} />

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{assistantKnowledgeCopy.fields.key}</span>
                  <input type="text" name="key" defaultValue={currentKnowledgeItem?.key ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{assistantKnowledgeCopy.fields.category}</span>
                  <input type="text" name="category" defaultValue={currentKnowledgeItem?.category ?? "general"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{assistantKnowledgeCopy.fields.href}</span>
                  <input type="text" name="href" defaultValue={currentKnowledgeItem?.href ?? ""} placeholder="/member" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{assistantKnowledgeCopy.fields.tagsText}</span>
                  <input type="text" name="tagsText" defaultValue={currentKnowledgeItem?.tagsText ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                  <p className="text-xs text-slate-500">{assistantKnowledgeCopy.tagsHint}</p>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{assistantKnowledgeCopy.fields.sortOrder}</span>
                  <input type="number" name="sortOrder" defaultValue={currentKnowledgeItem?.sortOrder ?? supportKnowledgeItems.length} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{assistantKnowledgeCopy.fields.status}</span>
                  <select name="status" defaultValue={currentKnowledgeItem?.status ?? "active"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="active">{assistantKnowledgeCopy.statusLabels.active}</option>
                    <option value="inactive">{assistantKnowledgeCopy.statusLabels.inactive}</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{assistantKnowledgeCopy.fields.questionZhCn}</span>
                  <textarea name="questionZhCn" rows={3} defaultValue={currentKnowledgeItem?.questionZhCn ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{assistantKnowledgeCopy.fields.questionZhTw}</span>
                  <textarea name="questionZhTw" rows={3} defaultValue={currentKnowledgeItem?.questionZhTw ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{assistantKnowledgeCopy.fields.questionEn}</span>
                  <textarea name="questionEn" rows={3} defaultValue={currentKnowledgeItem?.questionEn ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{assistantKnowledgeCopy.fields.answerZhCn}</span>
                  <textarea name="answerZhCn" rows={6} defaultValue={currentKnowledgeItem?.answerZhCn ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{assistantKnowledgeCopy.fields.answerZhTw}</span>
                  <textarea name="answerZhTw" rows={6} defaultValue={currentKnowledgeItem?.answerZhTw ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{assistantKnowledgeCopy.fields.answerEn}</span>
                  <textarea name="answerEn" rows={6} defaultValue={currentKnowledgeItem?.answerEn ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
              </div>

              <button type="submit" className="mt-5 w-fit rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
                {assistantKnowledgeCopy.save}
              </button>
            </form>

            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-label">{assistantKnowledgeCopy.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{assistantKnowledgeCopy.title}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300">
                    {assistantKnowledgeCopy.count(filteredSupportKnowledgeItems.length)}
                  </span>
                  <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-4 py-2 text-sm text-lime-100">
                    {assistantKnowledgeActiveCount} {assistantKnowledgeCopy.active}
                  </span>
                </div>
              </div>

              <form action="/admin" method="get" className="mt-4 grid gap-3 md:grid-cols-[1.1fr,0.8fr,0.8fr,auto,auto]">
                <input type="hidden" name="tab" value="content" />
                <input type="hidden" name="contentSport" value={contentSport} />
                <input type="hidden" name="contentAuthorId" value={contentAuthorId} />
                <input type="hidden" name="contentPlanStatus" value={contentPlanStatus} />
                <input type="hidden" name="contentQuery" value={contentQuery} />
                <input
                  type="text"
                  name="knowledgeQuery"
                  defaultValue={knowledgeQuery}
                  placeholder={assistantKnowledgeCopy.filters.searchPlaceholder}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
                />
                <select name="knowledgeCategory" defaultValue={knowledgeCategory} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none">
                  <option value="">{assistantKnowledgeCopy.filters.allCategories}</option>
                  {assistantKnowledgeCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select name="knowledgeStatus" defaultValue={knowledgeStatus} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none">
                  <option value="all">{assistantKnowledgeCopy.filters.allStatus}</option>
                  <option value="active">{assistantKnowledgeCopy.statusLabels.active}</option>
                  <option value="inactive">{assistantKnowledgeCopy.statusLabels.inactive}</option>
                </select>
                <button type="submit" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
                  {assistantKnowledgeCopy.filters.apply}
                </button>
                <Link href={buildAdminContentHref({ ...contentKnowledgeRouteState, knowledgeStatus: "all", knowledgeCategory: "", knowledgeQuery: "" })} className="inline-flex items-center justify-center rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                  {assistantKnowledgeCopy.filters.reset}
                </Link>
              </form>

              <div className="mt-5 space-y-4">
                {filteredSupportKnowledgeItems.map((item) => {
                  const isEditing = currentKnowledgeItem?.id === item.id;

                  return (
                    <article
                      key={item.id}
                      className={`rounded-[1.2rem] border p-4 ${
                        isEditing ? "border-orange-300/35 bg-orange-400/6" : "border-white/8 bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{item.category}</span>
                          <span className={`rounded-full px-3 py-1 text-xs ${
                            item.status === "active" ? "bg-lime-300/12 text-lime-100" : "bg-white/8 text-slate-300"
                          }`}>
                            {item.status === "active" ? assistantKnowledgeCopy.statusLabels.active : assistantKnowledgeCopy.statusLabels.inactive}
                          </span>
                          <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
                            {assistantKnowledgeCopy.order(item.sortOrder)}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {assistantKnowledgeCopy.updatedAt}: {formatDateTime(item.updatedAt, displayLocale)}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{assistantKnowledgeCopy.localePreview}</p>
                          <p className="mt-3 text-sm font-semibold text-white">CN: {item.questionZhCn}</p>
                          <p className="mt-2 text-sm text-slate-400">TW: {item.questionZhTw}</p>
                          <p className="mt-2 text-sm text-slate-400">EN: {item.questionEn}</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{assistantKnowledgeCopy.answerLabel}</p>
                          <p className="mt-3 text-sm leading-7 text-slate-300">{item.answerZhCn}</p>
                          {item.href ? (
                            <p className="mt-3 text-xs text-slate-500">
                              {assistantKnowledgeCopy.routeLabel}: <span className="text-slate-300">{item.href}</span>
                            </p>
                          ) : null}
                          {item.tagsText ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.tagsText.split("|").filter(Boolean).map((tag) => (
                                <span key={`${item.id}-${tag}`} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={buildAdminContentHref(contentKnowledgeRouteState, {
                            editKnowledge: item.id,
                          })}
                          className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-orange-300/30 hover:text-white"
                        >
                          {assistantKnowledgeCopy.edit}
                        </Link>
                        <form action="/api/admin/operations/site-assistant-knowledge" method="post">
                          <input type="hidden" name="intent" value="move-up" />
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="contentSport" value={contentSport} />
                          <input type="hidden" name="contentAuthorId" value={contentAuthorId} />
                          <input type="hidden" name="contentPlanStatus" value={contentPlanStatus} />
                          <input type="hidden" name="contentQuery" value={contentQuery} />
                          <input type="hidden" name="knowledgeStatus" value={knowledgeStatus} />
                          <input type="hidden" name="knowledgeCategory" value={knowledgeCategory} />
                          <input type="hidden" name="knowledgeQuery" value={knowledgeQuery} />
                          <button type="submit" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                            {assistantKnowledgeCopy.moveUp}
                          </button>
                        </form>
                        <form action="/api/admin/operations/site-assistant-knowledge" method="post">
                          <input type="hidden" name="intent" value="move-down" />
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="contentSport" value={contentSport} />
                          <input type="hidden" name="contentAuthorId" value={contentAuthorId} />
                          <input type="hidden" name="contentPlanStatus" value={contentPlanStatus} />
                          <input type="hidden" name="contentQuery" value={contentQuery} />
                          <input type="hidden" name="knowledgeStatus" value={knowledgeStatus} />
                          <input type="hidden" name="knowledgeCategory" value={knowledgeCategory} />
                          <input type="hidden" name="knowledgeQuery" value={knowledgeQuery} />
                          <button type="submit" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                            {assistantKnowledgeCopy.moveDown}
                          </button>
                        </form>
                        <form action="/api/admin/operations/site-assistant-knowledge" method="post">
                          <input type="hidden" name="intent" value="toggle-status" />
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="contentSport" value={contentSport} />
                          <input type="hidden" name="contentAuthorId" value={contentAuthorId} />
                          <input type="hidden" name="contentPlanStatus" value={contentPlanStatus} />
                          <input type="hidden" name="contentQuery" value={contentQuery} />
                          <input type="hidden" name="knowledgeStatus" value={knowledgeStatus} />
                          <input type="hidden" name="knowledgeCategory" value={knowledgeCategory} />
                          <input type="hidden" name="knowledgeQuery" value={knowledgeQuery} />
                          <button type="submit" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-orange-300/30 hover:text-white">
                            {item.status === "active" ? assistantKnowledgeCopy.disable : assistantKnowledgeCopy.enable}
                          </button>
                        </form>
                      </div>
                    </article>
                  );
                })}

                {filteredSupportKnowledgeItems.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                    {assistantKnowledgeCopy.empty}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

        </section>
      ) : null}

      {tab === "users" ? (
        <section className="glass-panel rounded-[2rem] p-6">
          <SectionHeading eyebrow={adminPageCopy.users.eyebrow} title={adminPageCopy.users.title} />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {userMetricCards.map((card, index) => {
              const value = [usersDashboard.metrics.userCount, usersDashboard.metrics.activeMembershipCount, usersDashboard.metrics.membershipOrderCount, usersDashboard.metrics.contentOrderCount][index];
              return (
                <div key={card.label} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
                  <p className="mt-2 text-sm text-slate-400">{card.description}</p>
                </div>
              );
            })}
          </div>

          {refundNotice ? (
            <div
              className={`mt-6 rounded-[1.2rem] border px-4 py-3 text-sm ${
                error ? "border-rose-300/25 bg-rose-400/10 text-rose-100" : "border-sky-300/25 bg-sky-400/10 text-sky-100"
              }`}
            >
              {refundNotice}
            </div>
          ) : null}

          <div className="mt-6 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-label">{adminPageCopy.users.eyebrow}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{adminExpansion.users.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{adminExpansion.users.description}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {adminExpansion.users.detailCards.map((card) => (
                <div key={card.title} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                  <p className="font-medium text-white">{card.title}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {card.items.map((item) => (
                      <span key={`${card.title}-${item}`} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-[1.4rem] border border-sky-300/15 bg-sky-400/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-label">{paymentRuntimeCopy.runtimeTitle}</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{getPaymentProviderLabel(paymentRuntime.provider, locale)}</h3>
                <p className="mt-2 max-w-3xl text-sm text-sky-100/85">{opsCopy.adminOrders.actionHint}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${paymentRuntime.callbackTokenConfigured ? "bg-lime-300/15 text-lime-100" : "bg-rose-400/15 text-rose-100"}`}>
                {opsCopy.checkout.callbackStatusLabel}: {paymentRuntime.callbackTokenConfigured ? opsCopy.checkout.callbackStatusReady : opsCopy.checkout.callbackStatusMissing}
              </span>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-sky-50 sm:grid-cols-3 xl:grid-cols-8">
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">{opsCopy.checkout.providerLabel}</p>
                <p className="mt-2 font-medium">{getPaymentProviderLabel(paymentRuntime.provider, locale)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">{paymentRuntimeCopy.checkoutModeTitle}</p>
                <p className="mt-2 font-medium">{paymentRuntimeCopy.checkoutModeLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">{opsCopy.checkout.pendingWindowLabel}</p>
                <p className="mt-2 font-medium">{paymentRuntimeCopy.minutesLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">{opsCopy.checkout.callbackEndpointLabel}</p>
                <p className="mt-2 break-all font-medium">{paymentRuntime.callbackPath}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">{paymentRuntimeCopy.callbackAddressTitle}</p>
                <p className="mt-2 break-all font-medium">{paymentRuntime.callbackUrl}</p>
                {!paymentRuntime.callbackUrlConfigured ? <p className="mt-2 text-xs text-sky-100/70">{paymentRuntimeCopy.siteUrlHint}</p> : null}
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">{paymentRuntimeCopy.authModeTitle}</p>
                <p className="mt-2 font-medium">{paymentRuntimeCopy.authModeLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">{paymentRuntimeCopy.collectionTitle}</p>
                <p className="mt-2 font-medium">{manualCollection.configured ? paymentRuntimeCopy.collectionReady : paymentRuntimeCopy.collectionMissing}</p>
                {manualCollection.configured ? (
                  <p className="mt-2 text-xs text-sky-100/70">{getManualCollectionSummary(manualCollection, locale)}</p>
                ) : (
                  <p className="mt-2 text-xs text-sky-100/70">{paymentRuntimeCopy.collectionHint}</p>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">{paymentRuntimeCopy.hostedTitle}</p>
                <p className="mt-2 font-medium">
                  {paymentRuntime.hostedGatewayConfigured && paymentRuntime.hostedSignatureConfigured ? paymentRuntimeCopy.hostedReady : paymentRuntimeCopy.hostedMissing}
                </p>
                <p className="mt-2 text-xs text-sky-100/70">
                  {paymentRuntime.hostedGatewayName ?? "--"}
                  {paymentRuntime.hostedGatewayConfigured ? "" : ` · ${paymentRuntimeCopy.hostedHint}`}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-label">{paymentRuntimeCopy.callbacks.title}</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{paymentRuntimeCopy.callbacks.subtitle}</h3>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                {paymentRuntimeCopy.callbacks.latestLabel}:{" "}
                {paymentCallbackActivity.recent[0] ? formatDateTime(paymentCallbackActivity.recent[0].lastSeenAt, displayLocale) : "--"}
              </span>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-100 sm:grid-cols-4">
              {[
                [paymentRuntimeCopy.callbacks.metrics.total, String(paymentCallbackActivity.metrics.eventCount)],
                [paymentRuntimeCopy.callbacks.metrics.duplicates, String(paymentCallbackActivity.metrics.duplicateCount)],
                [paymentRuntimeCopy.callbacks.metrics.conflicts, String(paymentCallbackActivity.metrics.conflictCount)],
                [paymentRuntimeCopy.callbacks.metrics.failed, String(paymentCallbackActivity.metrics.failedCount)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3">
              {paymentCallbackActivity.recent.map((event) => {
                const stateMeta = getPaymentCallbackStateMeta(event.state, locale);
                const processingMeta = getPaymentCallbackProcessingMeta(event.processingStatus, locale);

                return (
                  <div key={event.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs ${stateMeta.className}`}>{stateMeta.label}</span>
                        <span className={`rounded-full px-3 py-1 text-xs ${processingMeta.className}`}>{processingMeta.label}</span>
                        <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
                          {event.orderType === "membership"
                            ? adminPageCopy.users.membershipOrders.sectionLabel
                            : adminPageCopy.users.contentOrders.sectionLabel}
                        </span>
                        <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
                          {getPaymentProviderLabel(event.provider, locale)}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">{formatDateTime(event.lastSeenAt, displayLocale)}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                      <p>
                        {paymentRuntimeCopy.callbacks.stateTitle}: {stateMeta.label}
                      </p>
                      <p className="md:text-right">
                        {paymentRuntimeCopy.callbacks.resultTitle}: {processingMeta.label}
                      </p>
                      <p>
                        {paymentRuntimeCopy.callbacks.orderIdLabel}: {event.orderId ?? "--"}
                      </p>
                      <p className="md:text-right">
                        {event.providerEventId
                          ? `${paymentRuntimeCopy.callbacks.eventIdLabel}: ${event.providerEventId}`
                          : `${paymentRuntimeCopy.callbacks.eventKeyLabel}: ${event.eventKey.slice(0, 18)}...`}
                      </p>
                      <p>
                        {adminPageCopy.users.membershipOrders.providerOrderId}: {event.providerOrderId ?? "--"}
                      </p>
                      <p className="md:text-right">
                        {opsCopy.checkout.referenceLabel}: {event.paymentReference ?? "--"}
                      </p>
                    </div>
                    {event.processingMessage ? (
                      <p className="mt-3 text-xs text-slate-500">{event.processingMessage}</p>
                    ) : null}
                    {event.duplicateCount > 0 ? (
                      <p className="mt-2 text-xs text-amber-100/85">
                        +{event.duplicateCount} {paymentRuntimeCopy.callbacks.duplicateSuffix}
                      </p>
                    ) : null}
                  </div>
                );
              })}
              {paymentCallbackActivity.recent.length === 0 ? (
                <div className="rounded-[1.1rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                  {paymentRuntimeCopy.callbacks.empty}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
            <form className="grid gap-3 lg:grid-cols-[1.15fr,0.75fr,0.75fr,0.95fr,0.95fr,auto,auto,auto]" action="/admin" method="get">
              <input type="hidden" name="tab" value="users" />
              <input
                type="text"
                name="q"
                defaultValue={usersTabFilters.query}
                placeholder={adminPageCopy.users.filters.searchPlaceholder}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
              />
              <select name="orderStatus" defaultValue={usersTabFilters.orderStatus} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none">
                {Object.entries(adminPageCopy.users.filters.orderStatusOptions).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select name="orderType" defaultValue={usersTabFilters.orderType} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none">
                {Object.entries(adminPageCopy.users.filters.orderTypeOptions).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <label className="space-y-2 text-xs text-slate-500">
                <span className="px-1">{adminPageCopy.users.filters.updatedFrom}</span>
                <input type="datetime-local" name="from" defaultValue={toDateTimeLocalValue(usersTabFilters.from)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
              </label>
              <label className="space-y-2 text-xs text-slate-500">
                <span className="px-1">{adminPageCopy.users.filters.updatedTo}</span>
                <input type="datetime-local" name="to" defaultValue={toDateTimeLocalValue(usersTabFilters.to)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
              </label>
              <button type="submit" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
                {adminPageCopy.users.filters.apply}
              </button>
              <Link href="/admin?tab=users" className="inline-flex items-center justify-center rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                {adminPageCopy.users.filters.reset}
              </Link>
              <Link href={orderExportHref} className="inline-flex items-center justify-center rounded-full border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-sm text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-400/20">
                {adminPageCopy.users.filters.exportCsv}
              </Link>
            </form>
            <p className="mt-3 text-xs text-slate-500">
              {adminPageCopy.users.filters.currentFilters}: {currentOrderFilterSummary}
            </p>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.users.userList.sectionLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{adminPageCopy.users.userList.title}</h3>
                </div>
                <span className="text-sm text-slate-500">{adminPageCopy.users.userList.count(usersDashboard.users.length)}</span>
              </div>

              <div className="mt-5 grid gap-4">
                {usersDashboard.users.map((user) => (
                  <div key={user.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{user.displayName}</p>
                        <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-200">{roleLabels[user.role]}</span>
                        <span className={`rounded-full px-3 py-1 text-xs ${user.membershipStatus === "active" ? "bg-lime-300/12 text-lime-100" : "bg-white/8 text-slate-300"}`}>
                          {user.membershipStatus === "active" ? adminPageCopy.users.userList.activeMembership : adminPageCopy.users.userList.regularUser}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300">
                      <span>
                        {adminPageCopy.users.userList.registeredAt} {formatDateTime(user.createdAt, displayLocale)}
                      </span>
                      <span>
                        {adminPageCopy.users.userList.membershipOrders} {user.membershipOrderCount}
                      </span>
                      <span>
                        {adminPageCopy.users.userList.contentOrders} {user.contentOrderCount}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-slate-400">
                      {user.membershipPlanId
                        ? adminPageCopy.users.userList.membershipSummary(
                            membershipPlanNames.get(user.membershipPlanId) ?? user.membershipPlanId,
                            user.membershipExpiresAt ? formatDateTime(user.membershipExpiresAt, displayLocale) : adminPageCopy.users.userList.unknownExpiry,
                          )
                        : adminPageCopy.users.userList.noMembership}
                    </p>
                  </div>
                ))}
                {usersDashboard.users.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                    {adminPageCopy.users.userList.empty}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-6">
              {usersTabFilters.orderType !== "content" ? (
                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="section-label">{adminPageCopy.users.membershipOrders.sectionLabel}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{adminPageCopy.users.membershipOrders.title}</h3>
                    </div>
                    <span className="text-sm text-slate-500">
                      {adminPageCopy.users.membershipOrders.count(usersDashboard.membershipPagination?.total ?? usersDashboard.membershipOrders.length)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4">
                    {usersDashboard.membershipOrders.map((order) => {
                      const statusMeta = getOrderStatusMeta(order.status, locale);
                      const activityMeta = getOrderActivityMeta(order, locale);
                      const failureMeta = getOrderFailureMeta(order, locale);
                      const issueToneClass = failureMeta?.tone === "info" ? "text-sky-200" : "text-rose-200";
                      return (
                        <div key={order.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-medium text-white">{order.userDisplayName}</p>
                            <span className={statusMeta.className}>{statusMeta.label}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-400">{order.userEmail}</p>
                          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
                            <span>{membershipPlanNames.get(order.planId) ?? order.planName}</span>
                            <span>{formatPrice(order.amount, displayLocale)}</span>
                            <span>{adminPageCopy.users.membershipOrders.createdAt} {formatDateTime(order.createdAt, displayLocale)}</span>
                            <span>{adminPageCopy.users.membershipOrders.paymentProvider} {getPaymentProviderLabel(order.provider, locale)}</span>
                            {activityMeta.value ? <span>{activityMeta.label} {formatDateTime(activityMeta.value, displayLocale)}</span> : null}
                            {order.expiresAt ? <span>{adminPageCopy.users.membershipOrders.expiresAt} {formatDateTime(order.expiresAt, displayLocale)}</span> : null}
                          </div>
                          {order.providerOrderId ? (
                            <p className="mt-2 text-xs text-slate-500">
                              {adminPageCopy.users.membershipOrders.providerOrderId} {order.providerOrderId}
                            </p>
                          ) : null}
                          {order.paymentReference ? (
                            <p className="mt-2 text-xs text-slate-500">
                              {adminPageCopy.users.membershipOrders.paymentReference} {order.paymentReference}
                            </p>
                          ) : null}
                          {failureMeta ? <p className={`mt-2 text-xs ${issueToneClass}`}>{failureMeta.label}: {failureMeta.value}</p> : null}
                          {order.status === "pending" ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              <form action="/api/admin/orders/update-status" method="post">
                                <input type="hidden" name="intent" value="mark-paid" />
                                <input type="hidden" name="type" value="membership" />
                                <input type="hidden" name="orderId" value={order.id} />
                                <input type="hidden" name="paymentReference" value={order.paymentReference ?? order.id} />
                                <input type="hidden" name="returnTo" value={usersTabHref} />
                                <button type="submit" className="rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1.5 text-sm text-lime-100 transition hover:border-lime-300/45 hover:bg-lime-300/20">
                                  {opsCopy.adminOrders.markPaid}
                                </button>
                              </form>
                              <form action="/api/admin/orders/update-status" method="post">
                                <input type="hidden" name="intent" value="mark-failed" />
                                <input type="hidden" name="type" value="membership" />
                                <input type="hidden" name="orderId" value={order.id} />
                                <input type="hidden" name="paymentReference" value={order.paymentReference ?? order.id} />
                                <input type="hidden" name="reason" value="后台确认该会员订单收款失败，请重新发起支付。" />
                                <input type="hidden" name="returnTo" value={usersTabHref} />
                                <button type="submit" className="rounded-full border border-rose-300/25 bg-rose-400/10 px-3 py-1.5 text-sm text-rose-100 transition hover:border-rose-300/45 hover:bg-rose-400/20">
                                  {opsCopy.adminOrders.markFailed}
                                </button>
                              </form>
                              <form action="/api/admin/orders/update-status" method="post">
                                <input type="hidden" name="intent" value="close" />
                                <input type="hidden" name="type" value="membership" />
                                <input type="hidden" name="orderId" value={order.id} />
                                <input type="hidden" name="returnTo" value={usersTabHref} />
                                <button type="submit" className="rounded-full border border-white/12 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                                  {opsCopy.adminOrders.closePending}
                                </button>
                              </form>
                            </div>
                          ) : null}
                          {order.status === "paid" ? (
                            <form action="/api/admin/orders/refund" method="post" className="mt-4">
                              <input type="hidden" name="type" value="membership" />
                              <input type="hidden" name="orderId" value={order.id} />
                              <input type="hidden" name="reason" value={adminPageCopy.users.membershipOrders.manualRefundReason} />
                              <input type="hidden" name="returnTo" value={usersTabHref} />
                              <button type="submit" className="rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1.5 text-sm text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-400/20">
                                {adminPageCopy.users.membershipOrders.refundAction}
                              </button>
                            </form>
                          ) : null}
                        </div>
                      );
                    })}
                    {usersDashboard.membershipOrders.length === 0 ? (
                      <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                        {adminPageCopy.users.membershipOrders.empty}
                      </div>
                    ) : null}
                  </div>

                  {usersDashboard.membershipPagination && usersDashboard.membershipPagination.total > 0 ? (
                    <PaginationControls
                      summary={adminPageCopy.users.pagination.summary(
                        usersDashboard.membershipPagination.page,
                        usersDashboard.membershipPagination.totalPages,
                        usersDashboard.membershipPagination.total,
                      )}
                      previousLabel={adminPageCopy.users.pagination.previous}
                      nextLabel={adminPageCopy.users.pagination.next}
                      previousHref={
                        usersDashboard.membershipPagination.hasPrev
                          ? buildAdminUsersHref(usersTabFilters, { membershipPage: usersDashboard.membershipPagination.page - 1 })
                          : undefined
                      }
                      nextHref={
                        usersDashboard.membershipPagination.hasNext
                          ? buildAdminUsersHref(usersTabFilters, { membershipPage: usersDashboard.membershipPagination.page + 1 })
                          : undefined
                      }
                    />
                  ) : null}
                </div>
              ) : null}

              {usersTabFilters.orderType !== "membership" ? (
                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="section-label">{adminPageCopy.users.contentOrders.sectionLabel}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{adminPageCopy.users.contentOrders.title}</h3>
                    </div>
                    <span className="text-sm text-slate-500">
                      {adminPageCopy.users.contentOrders.count(usersDashboard.contentPagination?.total ?? usersDashboard.contentOrders.length)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4">
                    {usersDashboard.contentOrders.map((order) => {
                      const statusMeta = getOrderStatusMeta(order.status, locale);
                      const activityMeta = getOrderActivityMeta(order, locale);
                      const failureMeta = getOrderFailureMeta(order, locale);
                      const issueToneClass = failureMeta?.tone === "info" ? "text-sky-200" : "text-rose-200";
                      return (
                        <div key={order.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-medium text-white">{order.userDisplayName}</p>
                            <span className={statusMeta.className}>{statusMeta.label}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-400">{order.userEmail}</p>
                          <p className="mt-3 text-sm text-slate-300">{order.contentTitle}</p>
                          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
                            <span>{formatPrice(order.amount, displayLocale)}</span>
                            <span>{adminPageCopy.users.contentOrders.createdAt} {formatDateTime(order.createdAt, displayLocale)}</span>
                            <span>{adminPageCopy.users.contentOrders.paymentProvider} {getPaymentProviderLabel(order.provider, locale)}</span>
                            {activityMeta.value ? <span>{activityMeta.label} {formatDateTime(activityMeta.value, displayLocale)}</span> : null}
                            {order.expiresAt ? <span>{adminPageCopy.users.contentOrders.expiresAt} {formatDateTime(order.expiresAt, displayLocale)}</span> : null}
                          </div>
                          {order.providerOrderId ? (
                            <p className="mt-2 text-xs text-slate-500">
                              {adminPageCopy.users.contentOrders.providerOrderId} {order.providerOrderId}
                            </p>
                          ) : null}
                          {order.paymentReference ? (
                            <p className="mt-2 text-xs text-slate-500">
                              {adminPageCopy.users.contentOrders.paymentReference} {order.paymentReference}
                            </p>
                          ) : null}
                          {failureMeta ? <p className={`mt-2 text-xs ${issueToneClass}`}>{failureMeta.label}: {failureMeta.value}</p> : null}
                          {order.status === "pending" ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              <form action="/api/admin/orders/update-status" method="post">
                                <input type="hidden" name="intent" value="mark-paid" />
                                <input type="hidden" name="type" value="content" />
                                <input type="hidden" name="orderId" value={order.id} />
                                <input type="hidden" name="paymentReference" value={order.paymentReference ?? order.id} />
                                <input type="hidden" name="returnTo" value={usersTabHref} />
                                <button type="submit" className="rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1.5 text-sm text-lime-100 transition hover:border-lime-300/45 hover:bg-lime-300/20">
                                  {opsCopy.adminOrders.markPaid}
                                </button>
                              </form>
                              <form action="/api/admin/orders/update-status" method="post">
                                <input type="hidden" name="intent" value="mark-failed" />
                                <input type="hidden" name="type" value="content" />
                                <input type="hidden" name="orderId" value={order.id} />
                                <input type="hidden" name="paymentReference" value={order.paymentReference ?? order.id} />
                                <input type="hidden" name="reason" value="后台确认该内容订单收款失败，请重新发起支付。" />
                                <input type="hidden" name="returnTo" value={usersTabHref} />
                                <button type="submit" className="rounded-full border border-rose-300/25 bg-rose-400/10 px-3 py-1.5 text-sm text-rose-100 transition hover:border-rose-300/45 hover:bg-rose-400/20">
                                  {opsCopy.adminOrders.markFailed}
                                </button>
                              </form>
                              <form action="/api/admin/orders/update-status" method="post">
                                <input type="hidden" name="intent" value="close" />
                                <input type="hidden" name="type" value="content" />
                                <input type="hidden" name="orderId" value={order.id} />
                                <input type="hidden" name="returnTo" value={usersTabHref} />
                                <button type="submit" className="rounded-full border border-white/12 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                                  {opsCopy.adminOrders.closePending}
                                </button>
                              </form>
                            </div>
                          ) : null}
                          {order.status === "paid" ? (
                            <form action="/api/admin/orders/refund" method="post" className="mt-4">
                              <input type="hidden" name="type" value="content" />
                              <input type="hidden" name="orderId" value={order.id} />
                              <input type="hidden" name="reason" value={adminPageCopy.users.contentOrders.manualRefundReason} />
                              <input type="hidden" name="returnTo" value={usersTabHref} />
                              <button type="submit" className="rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1.5 text-sm text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-400/20">
                                {adminPageCopy.users.contentOrders.refundAction}
                              </button>
                            </form>
                          ) : null}
                        </div>
                      );
                    })}
                    {usersDashboard.contentOrders.length === 0 ? (
                      <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                        {adminPageCopy.users.contentOrders.empty}
                      </div>
                    ) : null}
                  </div>

                  {usersDashboard.contentPagination && usersDashboard.contentPagination.total > 0 ? (
                    <PaginationControls
                      summary={adminPageCopy.users.pagination.summary(
                        usersDashboard.contentPagination.page,
                        usersDashboard.contentPagination.totalPages,
                        usersDashboard.contentPagination.total,
                      )}
                      previousLabel={adminPageCopy.users.pagination.previous}
                      nextLabel={adminPageCopy.users.pagination.next}
                      previousHref={
                        usersDashboard.contentPagination.hasPrev
                          ? buildAdminUsersHref(usersTabFilters, { contentPage: usersDashboard.contentPagination.page - 1 })
                          : undefined
                      }
                      nextHref={
                        usersDashboard.contentPagination.hasNext
                          ? buildAdminUsersHref(usersTabFilters, { contentPage: usersDashboard.contentPagination.page + 1 })
                          : undefined
                      }
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "finance" ? (
        <section className="glass-panel rounded-[2rem] p-6">
          <SectionHeading
            eyebrow={adminExpansion.finance.eyebrow}
            title={adminExpansion.finance.title}
            description={adminExpansion.finance.description}
          />
          {financeNotice ? (
            <div
              className={`mt-6 rounded-[1.2rem] border px-4 py-3 text-sm ${
                error === "coin-package" || error === "coin-recharge-order" || error === "coin-recharge-order-balance"
                  ? "border-rose-300/25 bg-rose-400/10 text-rose-100"
                  : "border-lime-300/20 bg-lime-300/10 text-lime-100"
              }`}
            >
              {financeNotice}
            </div>
          ) : null}
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr,1.25fr]">
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminExpansion.finance.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en"
                      ? "Package bootstrap"
                      : locale === "zh-TW"
                        ? "套餐初始化"
                        : "套餐初始化"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {locale === "en"
                      ? "Seed the default coin packages first, then create manual recharge orders for finance testing."
                      : locale === "zh-TW"
                        ? "先初始化預設球幣套餐，再建立手動充值訂單，方便財務和運營驗證流程。"
                        : "先初始化默认球币套餐，再建立手动充值订单，方便财务和运营验证流程。"}
                  </p>
                </div>
                <form action="/api/admin/finance/packages" method="post">
                  <button
                    type="submit"
                    className="rounded-full border border-orange-300/20 bg-orange-300/10 px-4 py-2 text-sm text-orange-100 transition hover:bg-orange-300/15"
                  >
                    {locale === "en"
                      ? "Init packages"
                      : locale === "zh-TW"
                        ? "初始化套餐"
                        : "初始化套餐"}
                  </button>
                </form>
              </div>
              <form action="/api/admin/finance/recharge-orders" method="post" className="mt-6">
                <input type="hidden" name="intent" value="create" />
                <div className="grid gap-4">
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-400">
                      {locale === "en" ? "Member" : locale === "zh-TW" ? "會員" : "会员"}
                    </span>
                    <select
                      name="userId"
                      defaultValue={financeDashboard.userOptions[0]?.id ?? ""}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                    >
                      {financeDashboard.userOptions.length === 0 ? (
                        <option value="">
                          {locale === "en"
                            ? "No users"
                            : locale === "zh-TW"
                              ? "暫無用戶"
                              : "暂无用户"}
                        </option>
                      ) : (
                        financeDashboard.userOptions.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.label}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-400">
                      {locale === "en" ? "Coin package" : locale === "zh-TW" ? "球幣套餐" : "球币套餐"}
                    </span>
                    <select
                      name="packageId"
                      defaultValue={financeDashboard.packageOptions.find((item) => item.status === "active")?.id ?? financeDashboard.packageOptions[0]?.id ?? ""}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                    >
                      {financeDashboard.packageOptions.length === 0 ? (
                        <option value="">
                          {locale === "en"
                            ? "No packages"
                            : locale === "zh-TW"
                              ? "暫無套餐"
                              : "暂无套餐"}
                        </option>
                      ) : (
                        financeDashboard.packageOptions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-400">
                      {locale === "en" ? "Payment reference" : locale === "zh-TW" ? "支付流水號" : "支付流水号"}
                    </span>
                    <input
                      name="paymentReference"
                      placeholder={locale === "en" ? "Optional manual reference" : locale === "zh-TW" ? "可選，人工對賬用" : "可选，人工对账用"}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={financeDashboard.userOptions.length === 0 || financeDashboard.packageOptions.length === 0}
                  className="mt-5 rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {locale === "en"
                    ? "Create recharge order"
                    : locale === "zh-TW"
                      ? "建立充值訂單"
                      : "建立充值订单"}
                </button>
              </form>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-white">
                  {locale === "en"
                    ? "Finance snapshot"
                    : locale === "zh-TW"
                      ? "財務快照"
                      : "财务快照"}
                </h3>
                <span className="text-sm text-slate-500">
                  {locale === "en"
                    ? `Users ${financeDashboard.userOptions.length}`
                    : locale === "zh-TW"
                      ? `用戶 ${financeDashboard.userOptions.length}`
                      : `用户 ${financeDashboard.userOptions.length}`}
                </span>
              </div>
              <div className="mt-5 grid gap-3">
                {financeDashboard.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-400">{metric.label}</p>
                      <p className="text-xl font-semibold text-white">{metric.value}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{metric.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <ExpansionRowsPanel title={adminExpansion.finance.coinPackages.title} rows={financePackageRows} />
            <FinanceRechargeOrdersPanel title={adminExpansion.finance.rechargeOrders.title} locale={locale} orders={financeDashboard.rechargeOrders} />
            <ExpansionRowsPanel title={adminExpansion.finance.settlements.title} rows={financeSettlementRows} />
          </div>
        </section>
      ) : null}

      {tab === "agents" ? (
        <section className="glass-panel rounded-[2rem] p-6">
          <SectionHeading
            eyebrow={adminExpansion.agents.eyebrow}
            title={adminExpansion.agents.title}
            description={adminExpansion.agents.description}
          />
          <div className="mt-6">
            <ExpansionMetricGrid items={adminExpansion.agents.metrics} />
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <ExpansionRowsPanel title={adminExpansion.agents.applications.title} rows={adminExpansion.agents.applications.rows} />
            <ExpansionRowsPanel title={adminExpansion.agents.roster.title} rows={adminExpansion.agents.roster.rows} />
            <ExpansionRowsPanel title={adminExpansion.agents.campaigns.title} rows={adminExpansion.agents.campaigns.rows} />
            <ExpansionRowsPanel title={adminExpansion.agents.withdrawals.title} rows={adminExpansion.agents.withdrawals.rows} />
          </div>
        </section>
      ) : null}

      {tab === "system" ? (
        <section className="glass-panel rounded-[2rem] p-6">
          <SectionHeading
            eyebrow={adminExpansion.system.eyebrow}
            title={adminExpansion.system.title}
            description={adminExpansion.system.description}
          />
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <ExpansionRowsPanel title={adminExpansion.system.roleMatrix.title} rows={adminExpansion.system.roleMatrix.rows} />
            <ExpansionRowsPanel title={adminExpansion.system.auditLogs.title} rows={adminExpansion.system.auditLogs.rows} />
            <ExpansionRowsPanel title={adminExpansion.system.alerts.title} rows={adminExpansion.system.alerts.rows} />
            <ExpansionParametersPanel title={adminExpansion.system.parameters.title} rows={adminExpansion.system.parameters.rows} />
          </div>
        </section>
      ) : null}

      {tab === "reports" ? (
        <section className="glass-panel rounded-[2rem] p-6">
          <SectionHeading
            eyebrow={adminExpansion.reports.eyebrow}
            title={adminExpansion.reports.title}
            description={adminExpansion.reports.description}
          />
          <div className="mt-6">
            <ExpansionMetricGrid items={adminExpansion.reports.metrics} />
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <ExpansionRowsPanel title={adminExpansion.reports.boards.title} rows={adminExpansion.reports.boards.rows} />
            <ExpansionRowsPanel title={adminExpansion.reports.exports.title} rows={adminExpansion.reports.exports.rows} />
          </div>
        </section>
      ) : null}

      {tab === "ai" ? (
        <section className="glass-panel rounded-[2rem] p-6">
          <SectionHeading eyebrow={adminPageCopy.aiImport.eyebrow} title={adminPageCopy.aiImport.title} />
          {predictionNotice ? (
            <div
              className={`mt-6 rounded-[1.2rem] border px-4 py-3 text-sm ${
                error === "prediction" ? "border-rose-300/25 bg-rose-400/10 text-rose-100" : "border-lime-300/20 bg-lime-300/10 text-lime-100"
              }`}
            >
              {predictionNotice}
            </div>
          ) : null}
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr,1.25fr]">
            <form action="/api/admin/ai-import" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.aiImport.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{aiFormTitle}</h3>
                </div>
                {currentPrediction ? (
                  <Link
                    href={buildAdminAiHrefWithFilters(aiRouteState)}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/25 hover:text-white"
                  >
                    {adminPageCopy.shared.cancelEdit}
                  </Link>
                ) : null}
              </div>
              <input type="hidden" name="id" value={currentPrediction?.id ?? ""} />
              <input type="hidden" name="aiSport" value={aiSport} />
              <input type="hidden" name="aiAuthorId" value={aiAuthorId} />
              <input type="hidden" name="aiResult" value={aiResult} />
              <input type="hidden" name="aiScope" value={aiScope} />
              <input type="hidden" name="aiPage" value={resolvedAiPage} />
              <input type="hidden" name="handoffStatus" value={handoffStatus} />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{aiImportPanelCopy.fields.sport}</span>
                  <select
                    name="sport"
                    defaultValue={currentPrediction?.sport ?? aiImportPanelCopy.defaults.sport}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  >
                    <option value="football">{adminPageCopy.shared.sports.football}</option>
                    <option value="basketball">{adminPageCopy.shared.sports.basketball}</option>
                    <option value="cricket">{adminPageCopy.shared.sports.cricket}</option>
                    <option value="esports">{adminPageCopy.shared.sports.esports}</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{aiImportPanelCopy.fields.matchId}</span>
                  <select
                    name="matchId"
                    defaultValue={predictionMatchValue}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  >
                    <option value="">--</option>
                    {currentPrediction?.matchRef && !predictionMatchOptionExists ? (
                      <option value={currentPrediction.matchRef}>{currentPrediction.matchRef}</option>
                    ) : null}
                    {sortedMatches.map((match) => (
                      <option key={match.id} value={match.id}>
                        [{adminPageCopy.shared.sports[match.sport]}] {match.homeTeam} vs {match.awayTeam}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{aiImportPanelCopy.fields.authorId}</span>
                  <select
                    name="authorId"
                    defaultValue={currentPrediction?.authorId ?? authorTeams[0]?.id ?? ""}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  >
                    <option value="">--</option>
                    {currentPrediction?.authorId && !predictionAuthorOptionExists ? (
                      <option value={currentPrediction.authorId}>{currentPrediction.authorId}</option>
                    ) : null}
                    {authorTeams.map((author) => (
                      <option key={author.id} value={author.id}>
                        {author.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{aiImportPanelCopy.fields.result}</span>
                  <select
                    name="result"
                    defaultValue={currentPrediction?.result ?? "pending"}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  >
                    <option value="pending">{aiImportPanelCopy.resultOptions.pending}</option>
                    <option value="won">{aiImportPanelCopy.resultOptions.won}</option>
                    <option value="lost">{aiImportPanelCopy.resultOptions.lost}</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-slate-400">{aiImportPanelCopy.fields.market}</span>
                  <input
                    type="text"
                    name="market"
                    defaultValue={currentPrediction?.market ?? aiImportPanelCopy.defaults.market}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-slate-400">{aiImportPanelCopy.fields.pick}</span>
                  <input
                    type="text"
                    name="pick"
                    defaultValue={currentPrediction?.pick ?? aiImportPanelCopy.defaults.pick}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{aiImportPanelCopy.fields.confidence}</span>
                  <input
                    type="text"
                    name="confidence"
                    defaultValue={currentPrediction?.confidence ?? aiImportPanelCopy.defaults.confidence}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{aiImportPanelCopy.fields.expectedEdge}</span>
                  <input
                    type="text"
                    name="expectedEdge"
                    defaultValue={currentPrediction?.expectedEdge ?? aiImportPanelCopy.defaults.expectedEdge}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  />
                </label>
              </div>

              <label className="mt-4 block space-y-2 text-sm">
                <span className="text-slate-400">{aiImportPanelCopy.fields.factorsText}</span>
                <textarea
                  name="factorsText"
                  rows={4}
                  defaultValue={currentPrediction?.factorsText ?? aiImportPanelCopy.defaults.factorsText}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                />
              </label>
              <label className="mt-4 block space-y-2 text-sm">
                <span className="text-slate-400">{aiImportPanelCopy.fields.explanation}</span>
                <textarea
                  name="explanation"
                  rows={5}
                  defaultValue={currentPrediction?.explanation ?? aiImportPanelCopy.defaults.explanation}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                />
              </label>
              <button type="submit" className="mt-5 w-fit rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
                {aiImportPanelCopy.submit}
              </button>
            </form>

            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.aiImport.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{aiImportPanelCopy.listTitle}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <form action="/admin" method="get" className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="tab" value="ai" />
                    <input type="hidden" name="handoffStatus" value={handoffStatus} />
                    <label className="text-sm text-slate-400">{aiImportPanelCopy.filters.sport}</label>
                    <select
                      name="aiSport"
                      defaultValue={aiSport}
                      className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-white outline-none"
                    >
                      <option value="all">{aiImportPanelCopy.filters.sportOptions.all}</option>
                      <option value="football">{aiImportPanelCopy.filters.sportOptions.football}</option>
                      <option value="basketball">{aiImportPanelCopy.filters.sportOptions.basketball}</option>
                      <option value="cricket">{aiImportPanelCopy.filters.sportOptions.cricket}</option>
                      <option value="esports">{aiImportPanelCopy.filters.sportOptions.esports}</option>
                    </select>
                    <label className="text-sm text-slate-400">{aiImportPanelCopy.filters.author}</label>
                    <select
                      name="aiAuthorId"
                      defaultValue={aiAuthorId}
                      className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-white outline-none"
                    >
                      <option value="">{aiImportPanelCopy.filters.authorAll}</option>
                      {authorTeams.map((author) => (
                        <option key={author.id} value={author.id}>
                          {author.name}
                        </option>
                      ))}
                    </select>
                    <label className="text-sm text-slate-400">{aiImportPanelCopy.filters.result}</label>
                    <select
                      name="aiResult"
                      defaultValue={aiResult}
                      className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-white outline-none"
                    >
                      <option value="all">{aiImportPanelCopy.filters.resultOptions.all}</option>
                      <option value="pending">{aiImportPanelCopy.filters.resultOptions.pending}</option>
                      <option value="won">{aiImportPanelCopy.filters.resultOptions.won}</option>
                      <option value="lost">{aiImportPanelCopy.filters.resultOptions.lost}</option>
                    </select>
                    <label className="text-sm text-slate-400">{aiImportPanelCopy.filters.scope}</label>
                    <select
                      name="aiScope"
                      defaultValue={aiScope}
                      className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-white outline-none"
                    >
                      <option value="recent">{aiImportPanelCopy.filters.scopeOptions.recent}</option>
                      <option value="all">{aiImportPanelCopy.filters.scopeOptions.all}</option>
                    </select>
                    <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-200 transition hover:border-white/25 hover:text-white">
                      OK
                    </button>
                  </form>
                  <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300">
                    {aiImportPanelCopy.listCount(filteredPredictionRecords.length)}
                  </span>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {visiblePredictionRecords.map((prediction) => {
                  const match = prediction.matchId ? matchLookup.get(prediction.matchId) : undefined;
                  const authorName = prediction.authorId ? authorLookup.get(prediction.authorId) ?? prediction.authorId : "--";
                  const isEditing = currentPrediction?.id === prediction.id;

                  return (
                    <article
                      key={prediction.id}
                      className={`rounded-[1.2rem] border p-4 ${
                        isEditing ? "border-orange-300/35 bg-orange-400/6" : "border-white/8 bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
                            {adminPageCopy.shared.sports[prediction.sport]}
                          </span>
                          <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
                            {authorName}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-lime-300/10 px-3 py-1 text-xs text-lime-100">
                            {prediction.confidence}
                          </span>
                          <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
                            {aiImportPanelCopy.resultOptions[prediction.result as keyof typeof aiImportPanelCopy.resultOptions] ?? prediction.result}
                          </span>
                        </div>
                      </div>
                      <h4 className="mt-4 text-lg font-semibold text-white">{prediction.pick}</h4>
                      <p className="mt-2 text-sm text-slate-400">{prediction.market}</p>
                      <p className="mt-3 text-sm leading-7 text-slate-300">{prediction.explanation}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {prediction.factorsText.split("\n").filter(Boolean).map((factor) => (
                          <span key={`${prediction.id}-${factor}`} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                            {factor}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-slate-400 md:grid-cols-2">
                        <span>{prediction.matchRef || prediction.matchId || "--"}</span>
                        <span className="md:text-right">{formatDateTime(prediction.updatedAt, displayLocale)}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                        <span className="text-orange-200">{prediction.expectedEdge}</span>
                        <div className="flex flex-wrap gap-2">
                          {match ? (
                            <Link
                              href={`/matches/${match.id}`}
                              className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-orange-300/30 hover:text-white"
                            >
                              {aiImportPanelCopy.openMatch}
                            </Link>
                          ) : null}
                          <Link
                            href={buildAdminAiHrefWithFilters({
                              ...aiRouteState,
                              editPredictionId: prediction.id,
                            })}
                            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-orange-300/30 hover:text-white"
                          >
                            {aiImportPanelCopy.edit}
                          </Link>
                          <form action="/api/admin/ai-import" method="post">
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="id" value={prediction.id} />
                            <input type="hidden" name="aiSport" value={aiSport} />
                            <input type="hidden" name="aiAuthorId" value={aiAuthorId} />
                            <input type="hidden" name="aiResult" value={aiResult} />
                            <input type="hidden" name="aiScope" value={aiScope} />
                            <input type="hidden" name="aiPage" value={resolvedAiPage} />
                            <input type="hidden" name="handoffStatus" value={handoffStatus} />
                            <button type="submit" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-rose-300/30 hover:text-white">
                              {aiImportPanelCopy.delete}
                            </button>
                          </form>
                        </div>
                      </div>
                    </article>
                  );
                })}
                {filteredPredictionRecords.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                    {aiImportPanelCopy.empty}
                  </div>
                ) : null}
                {aiScope === "all" && filteredPredictionRecords.length > 0 ? (
                  <PaginationControls
                    summary={adminPageCopy.users.pagination.summary(
                      resolvedAiPage,
                      aiTotalPages,
                      filteredPredictionRecords.length,
                    )}
                    previousLabel={adminPageCopy.users.pagination.previous}
                    nextLabel={adminPageCopy.users.pagination.next}
                    previousHref={
                      resolvedAiPage > 1
                        ? buildAdminAiHrefWithFilters({
                            ...aiRouteState,
                            aiPage: resolvedAiPage - 1,
                          })
                        : undefined
                    }
                    nextHref={
                      resolvedAiPage < aiTotalPages
                        ? buildAdminAiHrefWithFilters({
                            ...aiRouteState,
                            aiPage: resolvedAiPage + 1,
                          })
                        : undefined
                    }
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-label">{assistantSupportCopy.eyebrow}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{assistantSupportCopy.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{assistantSupportCopy.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1.5 text-xs text-orange-100">
                  {assistantSupportCopy.pending}: {assistantPendingCount}
                </span>
                <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1.5 text-xs text-lime-100">
                  {assistantSupportCopy.resolved}: {assistantResolvedCount}
                </span>
              </div>
            </div>

            {assistantHandoffNotice ? (
              <div
                className={`mt-5 rounded-[1.2rem] border px-4 py-3 text-sm ${
                  saved === "assistant-handoff"
                    ? "border-lime-300/20 bg-lime-300/10 text-lime-100"
                    : "border-rose-300/20 bg-rose-400/10 text-rose-100"
                }`}
              >
                {assistantHandoffNotice}
              </div>
            ) : null}

            <form action="/admin" method="get" className="mt-5 flex flex-wrap items-center gap-3">
              <input type="hidden" name="tab" value="ai" />
              <input type="hidden" name="aiSport" value={aiSport} />
              <input type="hidden" name="aiAuthorId" value={aiAuthorId} />
              <input type="hidden" name="aiResult" value={aiResult} />
              <input type="hidden" name="aiScope" value={aiScope} />
              <input type="hidden" name="aiPage" value={resolvedAiPage} />
              <label className="text-sm text-slate-400">{assistantSupportCopy.filters.status}</label>
              <select name="handoffStatus" defaultValue={handoffStatus} className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-white outline-none">
                <option value="all">{assistantSupportCopy.filters.all}</option>
                <option value="pending">{assistantSupportCopy.pending}</option>
                <option value="resolved">{assistantSupportCopy.resolved}</option>
              </select>
              <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-200 transition hover:border-white/25 hover:text-white">
                {assistantSupportCopy.filters.apply}
              </button>
              <Link
                href={buildAdminAiHrefWithFilters({
                  ...aiRouteState,
                  handoffStatus: "all",
                })}
                className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/25 hover:text-white"
              >
                {assistantSupportCopy.filters.reset}
              </Link>
            </form>

            <div className="mt-5 grid gap-4">
              {filteredAssistantHandoffRequests.length > 0 ? (
                filteredAssistantHandoffRequests.map((item) => (
                  <div key={item.id} className="rounded-[1.35rem] border border-white/8 bg-slate-950/40 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white">
                            {item.conversationTitle ?? `${assistantSupportCopy.conversation} ${item.conversationId.slice(0, 8)}`}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs ${
                              item.status === "resolved"
                                ? "bg-lime-300/12 text-lime-100"
                                : "bg-orange-300/12 text-orange-100"
                            }`}
                          >
                            {item.status === "resolved" ? assistantSupportCopy.resolved : assistantSupportCopy.pending}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">
                          {assistantSupportCopy.requester}: {item.requesterName ?? "--"}
                          {item.requesterEmail ? ` / ${item.requesterEmail}` : ""}
                        </p>
                      </div>
                      {item.status !== "resolved" ? (
                        <form action="/api/admin/operations/site-assistant-handoffs" method="post">
                          <input type="hidden" name="intent" value="resolve" />
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="tab" value="ai" />
                          <input type="hidden" name="aiSport" value={aiSport} />
                          <input type="hidden" name="aiAuthorId" value={aiAuthorId} />
                          <input type="hidden" name="aiResult" value={aiResult} />
                          <input type="hidden" name="aiScope" value={aiScope} />
                          <input type="hidden" name="aiPage" value={resolvedAiPage} />
                          <input type="hidden" name="handoffStatus" value={handoffStatus} />
                          <button
                            type="submit"
                            className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white"
                          >
                            {assistantSupportCopy.markResolved}
                          </button>
                        </form>
                      ) : null}
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{assistantSupportCopy.contact}</p>
                        <p className="mt-2">{item.contactMethod ?? "--"}</p>
                        {item.contactName ? <p className="mt-1 text-slate-400">{item.contactName}</p> : null}
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{assistantSupportCopy.note}</p>
                        <p className="mt-2">{item.note ?? "--"}</p>
                      </div>
                    </div>
                    {item.conversationSummary ? (
                      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{assistantSupportCopy.conversation}</p>
                        <p className="mt-2">{item.conversationSummary}</p>
                      </div>
                    ) : null}
                    <p className="mt-4 text-xs text-slate-500">
                      {formatDateTime(item.createdAt, displayLocale)} / {item.locale}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-sm text-slate-400">
                  {assistantSupportCopy.empty}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
