import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminBannerComposer } from "@/components/admin-banner-composer";
import { SectionHeading } from "@/components/section-heading";
import { getAdminArticlePlans, getAdminAuthorTeams, getAdminPredictionRecords } from "@/lib/admin-content";
import {
  getAdminHomepageBanners,
  getAdminHomepageModules,
  getAdminSiteAnnouncements,
} from "@/lib/admin-operations";
import { getAdminPageCopy } from "@/lib/admin-page-copy";
import {
  getAdminPaymentCallbackActivity,
  getAdminUsersDashboard,
  normalizeAdminOrderFilterStatus,
  normalizeAdminOrderFilterType,
} from "@/lib/admin-users";
import { formatDateTime, formatPrice } from "@/lib/format";
import { getCurrentLocale } from "@/lib/i18n";
import { localizeMembershipPlan } from "@/lib/localized-content";
import { homepageBannerSeeds, membershipPlans } from "@/lib/mock-data";
import { getOpsCopy } from "@/lib/ops-copy";
import { getManualCollectionSummary, getPaymentCheckoutFlow } from "@/lib/payment-gateway";
import {
  getPaymentManualCollectionConfig,
  getPaymentProviderLabel,
  getPaymentRuntimeConfig,
} from "@/lib/payment-provider";
import { getOrderActivityMeta, getOrderFailureMeta, getOrderStatusMeta } from "@/lib/payment-ui";
import { getSessionContext } from "@/lib/session";
import { getMatchesBySport } from "@/lib/sports-data";
import { getRecentSyncRuns } from "@/lib/sync/sports-sync";
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
  locale: "zh-CN" | "zh-TW" | "en",
  fallback: string,
) {
  if (!startsAt && !endsAt) {
    return fallback;
  }

  const startLabel = startsAt ? formatDateTime(startsAt, locale) : "--";
  const endLabel = endsAt ? formatDateTime(endsAt, locale) : "--";
  return `${startLabel} -> ${endLabel}`;
}

function formatShortDateLabel(value: string, locale: "zh-CN" | "zh-TW" | "en") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "zh-TW" ? "zh-Hant-TW" : "zh-CN", {
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
  filters: { contentSport: AdminSportFilter; contentAuthorId: string; contentPlanStatus: AdminPlanStatusFilter; contentQuery: string },
  overrides?: { editAuthor?: string; editPlan?: string; editBanner?: string; editModule?: string; editAnnouncement?: string },
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

  if (overrides?.editAuthor) {
    params.set("editAuthor", overrides.editAuthor);
  }

  if (overrides?.editPlan) {
    params.set("editPlan", overrides.editPlan);
  }

  if (overrides?.editBanner) {
    params.set("editBanner", overrides.editBanner);
  }

  if (overrides?.editModule) {
    params.set("editModule", overrides.editModule);
  }

  if (overrides?.editAnnouncement) {
    params.set("editAnnouncement", overrides.editAnnouncement);
  }

  return `/admin?${params.toString()}`;
}

function normalizeAdminAiScope(value: string): AdminAiScope {
  return value === "all" ? "all" : "recent";
}

function buildAdminAiHrefWithFilters(filters: {
  aiSport: AdminSportFilter;
  aiAuthorId: string;
  aiResult: AdminPredictionResultFilter;
  aiScope: AdminAiScope;
  aiPage?: number;
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

  if (filters.editPredictionId) {
    params.set("editPrediction", filters.editPredictionId);
  }

  return `/admin?${params.toString()}`;
}

function buildAdminOrderFilterSummary(
  filters: AdminUsersTabFilters,
  copy: ReturnType<typeof getAdminPageCopy>,
  locale: "zh-CN" | "zh-TW" | "en",
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

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const locale = await getCurrentLocale();
  const { entitlements } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    redirect("/login?next=%2Fadmin");
  }

  if (!entitlements.canAccessAdminConsole) {
    redirect("/member");
  }

  const adminPageCopy = getAdminPageCopy(locale);
  const aiImportPanelCopy = adminPageCopy.aiImport;
  const opsCopy = getOpsCopy(locale);
  const paymentRuntime = getPaymentRuntimeConfig();
  const manualCollection = getPaymentManualCollectionConfig();
  const paymentCheckoutFlow = getPaymentCheckoutFlow(paymentRuntime.provider);
  const paymentRuntimeTitle = locale === "en" ? "Payment runtime" : locale === "zh-TW" ? "支付執行環境" : "支付运行环境";
  const paymentMinutesLabel = locale === "en" ? `${paymentRuntime.pendingMinutes} min` : locale === "zh-TW" ? `${paymentRuntime.pendingMinutes} 分鐘` : `${paymentRuntime.pendingMinutes} 分钟`;
  const paymentAuthModeLabel =
    locale === "en"
      ? paymentRuntime.callbackAuthMode
      : locale === "zh-TW"
        ? paymentRuntime.callbackAuthMode === "shared-token"
          ? "共享令牌"
          : "共享令牌 + HMAC"
        : paymentRuntime.callbackAuthMode === "shared-token"
          ? "共享令牌"
          : "共享令牌 + HMAC";
  const paymentAuthModeTitle = locale === "en" ? "Callback auth" : locale === "zh-TW" ? "回調鑑權" : "回调鉴权";
  const paymentCallbackAddressTitle = locale === "en" ? "Callback URL" : locale === "zh-TW" ? "回調完整地址" : "回调完整地址";
  const paymentCollectionTitle = locale === "en" ? "Collection config" : locale === "zh-TW" ? "收款配置" : "收款配置";
  const paymentHostedTitle = locale === "en" ? "Hosted gateway" : locale === "zh-TW" ? "託管通道" : "托管通道";
  const paymentCheckoutModeTitle = locale === "en" ? "Checkout mode" : locale === "zh-TW" ? "收銀模式" : "收银模式";
  const paymentCollectionReady = locale === "en" ? "Configured" : locale === "zh-TW" ? "已配置" : "已配置";
  const paymentCollectionMissing = locale === "en" ? "Missing" : locale === "zh-TW" ? "未配置" : "未配置";
  const paymentHostedReady = locale === "en" ? "Ready" : locale === "zh-TW" ? "可用" : "可用";
  const paymentHostedMissing = locale === "en" ? "Not ready" : locale === "zh-TW" ? "未就緒" : "未就绪";
  const paymentCheckoutModeLabel =
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
          : "模拟操作";
  const paymentSiteUrlHint =
    locale === "en"
      ? "Set `PAYMENT_CALLBACK_BASE_URL` or `SITE_URL` so the gateway can call back with a public URL."
      : locale === "zh-TW"
        ? "請配置 `PAYMENT_CALLBACK_BASE_URL` 或 `SITE_URL`，讓支付通道能回調到公開位址。"
        : "请配置 `PAYMENT_CALLBACK_BASE_URL` 或 `SITE_URL`，让支付通道能回调到公开地址。";
  const paymentCollectionHint =
    locale === "en"
      ? "Set manual collection env fields so checkout can show account or QR details."
      : locale === "zh-TW"
        ? "請配置人工收款環境變數，讓收銀頁可展示帳號或二維碼資訊。"
        : "请配置人工收款环境变量，让收银页可展示账号或二维码信息。";
  const paymentHostedHint =
    locale === "en"
      ? "Set hosted gateway URL, merchant ID, and signing secret before switching `PAYMENT_PROVIDER=hosted`."
      : locale === "zh-TW"
        ? "切到 `PAYMENT_PROVIDER=hosted` 前，請先配置託管通道 URL、商戶號與簽名密鑰。"
        : "切到 `PAYMENT_PROVIDER=hosted` 前，请先配置托管通道 URL、商户号与签名密钥。";
  const paymentCallbacksCopy = {
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
  } as const;
  const { matchStatusLabels, roleLabels } = getSiteCopy(locale);
  const resolved = await searchParams;
  const tab = pickValue(resolved.tab, "overview");
  const editAuthorId = pickValue(resolved.editAuthor, "");
  const editPlanId = pickValue(resolved.editPlan, "");
  const editBannerId = pickValue(resolved.editBanner, "");
  const editModuleId = pickValue(resolved.editModule, "");
  const editAnnouncementId = pickValue(resolved.editAnnouncement, "");
  const editPredictionId = pickValue(resolved.editPrediction, "");
  const contentSport = normalizeAdminSportFilter(pickValue(resolved.contentSport, "all"));
  const contentAuthorId = pickValue(resolved.contentAuthorId, "").trim();
  const contentPlanStatus = normalizeAdminPlanStatusFilter(pickValue(resolved.contentPlanStatus, "all"));
  const contentQuery = pickValue(resolved.contentQuery, "").trim();
  const aiSport = normalizeAdminSportFilter(pickValue(resolved.aiSport, "all"));
  const aiAuthorId = pickValue(resolved.aiAuthorId, "").trim();
  const aiResult = normalizeAdminPredictionResultFilter(pickValue(resolved.aiResult, "all"));
  const aiScope = normalizeAdminAiScope(pickValue(resolved.aiScope, "recent"));
  const aiPage = pickPositiveInt(resolved.aiPage, 1);
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

  const [footballMatches, basketballMatches, cricketMatches, esportsMatches, articlePlans, authorTeams, homepageBanners, homepageModules, siteAnnouncements, predictionRecords, usersDashboard, paymentCallbackActivity, recentSyncRuns] = await Promise.all([
    getMatchesBySport("football", locale),
    getMatchesBySport("basketball", locale),
    getMatchesBySport("cricket", locale),
    getMatchesBySport("esports", locale),
    getAdminArticlePlans(),
    getAdminAuthorTeams(),
    getAdminHomepageBanners(),
    getAdminHomepageModules(),
    getAdminSiteAnnouncements(),
    getAdminPredictionRecords(),
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
  ]);

  const matches = [...footballMatches, ...basketballMatches, ...cricketMatches, ...esportsMatches];
  const currentAuthor = authorTeams.find((item) => item.id === editAuthorId);
  const currentPlan = articlePlans.find((item) => item.id === editPlanId);
  const currentBanner = homepageBanners.find((item) => item.id === editBannerId);
  const currentModule = homepageModules.find((item) => item.id === editModuleId);
  const currentAnnouncement = siteAnnouncements.find((item) => item.id === editAnnouncementId);
  const currentPrediction = predictionRecords.find((item) => item.id === editPredictionId);
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
  const currentOrderFilterSummary = buildAdminOrderFilterSummary(usersTabFilters, adminPageCopy, locale);

  const contentNotice = error
    ? adminPageCopy.content.notices.saveFailed
    : seeded
      ? adminPageCopy.content.notices.seeded
      : saved === "author"
        ? adminPageCopy.content.notices.authorSaved
        : saved === "banner"
          ? adminPageCopy.content.notices.bannerSaved
        : saved === "module"
          ? adminPageCopy.content.notices.moduleSaved
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
  const aiNotice =
    saved === "prediction"
      ? aiImportPanelCopy.notices.saved
      : saved === "prediction-deleted"
        ? aiImportPanelCopy.notices.deleted
      : error === "prediction"
        ? aiImportPanelCopy.notices.failed
        : null;
  const sortedMatches = [...matches].sort((left, right) => new Date(left.kickoff).getTime() - new Date(right.kickoff).getTime());
  const matchLookup = new Map(sortedMatches.map((match) => [match.id, match]));
  const authorLookup = new Map(authorTeams.map((author) => [author.id, author.name]));
  const predictionMatchValue = currentPrediction?.matchId ?? currentPrediction?.matchRef ?? aiImportPanelCopy.defaults.matchId;
  const predictionMatchOptionExists = sortedMatches.some((match) => match.id === predictionMatchValue);
  const predictionAuthorOptionExists = authorTeams.some((author) => author.id === currentPrediction?.authorId);
  const aiFormTitle = currentPrediction ? aiImportPanelCopy.editTitle : aiImportPanelCopy.createTitle;

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
                    <span>{opsCopy.sync.startedAt} {formatDateTime(run.startedAt, locale)}</span>
                    {run.finishedAt ? <span>{opsCopy.sync.finishedAt} {formatDateTime(run.finishedAt, locale)}</span> : null}
                    {run.countsSummary ? <span>{opsCopy.sync.counts} {run.countsSummary}</span> : null}
                  </div>
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
                          {plan.leagueLabel} | {formatDateTime(plan.kickoff, locale)}
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
                      <span>{formatPrice(plan.price, locale)}</span>
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
                    {locale === "en"
                      ? "No plans match the current sport filter."
                      : locale === "zh-TW"
                        ? "目前篩選條件下沒有計畫單。"
                        : "当前筛选条件下没有计划单。"}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
            <AdminBannerComposer
              locale={locale}
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
                    {locale === "en" ? `${activeLiveBannerCount} live` : locale === "zh-TW" ? `${activeLiveBannerCount} 條展示中` : `${activeLiveBannerCount} 条展示中`}
                  </span>
                  <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs text-sky-100">
                    {locale === "en" ? `${scheduledBannerCount} scheduled` : locale === "zh-TW" ? `${scheduledBannerCount} 條待生效` : `${scheduledBannerCount} 条待生效`}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                    {locale === "en" ? `${inactiveBannerCount} inactive` : locale === "zh-TW" ? `${inactiveBannerCount} 條未啟用` : `${inactiveBannerCount} 条未启用`}
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
                          ? locale === "en"
                            ? `Hero slot ${homepageSlotIndex + 1}`
                            : locale === "zh-TW"
                              ? `首頁第 ${homepageSlotIndex + 1} 位`
                              : `首页第 ${homepageSlotIndex + 1} 位`
                          : locale === "en"
                            ? "Standby"
                            : locale === "zh-TW"
                              ? "候補位"
                              : "候补位";

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
                            {locale === "en" ? `Order ${banner.sortOrder}` : locale === "zh-TW" ? `排序 ${banner.sortOrder}` : `排序 ${banner.sortOrder}`}
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
                            {locale === "en" ? "Performance" : locale === "zh-TW" ? "表現數據" : "表现数据"}
                          </p>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-xl border border-white/8 bg-slate-950/50 p-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                                {locale === "en" ? "Impressions" : locale === "zh-TW" ? "曝光" : "曝光"}
                              </p>
                              <p className="mt-2 text-lg font-semibold text-white">{banner.impressionCount}</p>
                            </div>
                            <div className="rounded-xl border border-white/8 bg-slate-950/50 p-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                                {locale === "en" ? "Clicks" : locale === "zh-TW" ? "點擊" : "点击"}
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
                                {locale === "en" ? "7D impressions" : locale === "zh-TW" ? "7日曝光" : "7日曝光"}
                              </p>
                              <p className="mt-2 text-lg font-semibold text-white">{banner.recentImpressionCount}</p>
                            </div>
                            <div className="rounded-xl border border-white/8 bg-slate-950/50 p-3">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                                {locale === "en" ? "7D clicks" : locale === "zh-TW" ? "7日點擊" : "7日点击"}
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
                                {locale === "en" ? "Primary slot" : locale === "zh-TW" ? "主位表現" : "主位表现"}
                              </p>
                              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <p className="text-slate-400">{locale === "en" ? "Imp" : locale === "zh-TW" ? "曝光" : "曝光"}</p>
                                  <p className="mt-1 font-semibold text-white">{banner.primaryImpressionCount}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400">{locale === "en" ? "Clk" : locale === "zh-TW" ? "點擊" : "点击"}</p>
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
                                {locale === "en" ? "Secondary slot" : locale === "zh-TW" ? "次位表現" : "次位表现"}
                              </p>
                              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <p className="text-slate-400">{locale === "en" ? "Imp" : locale === "zh-TW" ? "曝光" : "曝光"}</p>
                                  <p className="mt-1 font-semibold text-white">{banner.secondaryImpressionCount}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400">{locale === "en" ? "Clk" : locale === "zh-TW" ? "點擊" : "点击"}</p>
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
                              {locale === "en" ? "Last impression" : locale === "zh-TW" ? "最近曝光" : "最近曝光"}:{" "}
                              <span className="text-slate-300">
                                {banner.lastImpressionAt ? formatDateTime(banner.lastImpressionAt, locale) : "--"}
                              </span>
                            </p>
                            <p>
                              {locale === "en" ? "Last click" : locale === "zh-TW" ? "最近點擊" : "最近点击"}:{" "}
                              <span className="text-slate-300">
                                {banner.lastClickAt ? formatDateTime(banner.lastClickAt, locale) : "--"}
                              </span>
                            </p>
                          </div>
                          <div className="mt-4 rounded-[1rem] border border-white/8 bg-slate-950/45 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                                {locale === "en" ? "7 day trend" : locale === "zh-TW" ? "7日趨勢" : "7日趋势"}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                                <span className="inline-flex items-center gap-1">
                                  <span className="h-2 w-2 rounded-full bg-sky-300" />
                                  {locale === "en" ? "Impressions" : locale === "zh-TW" ? "曝光" : "曝光"}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <span className="h-2 w-2 rounded-full bg-orange-300" />
                                  {locale === "en" ? "Clicks" : locale === "zh-TW" ? "點擊" : "点击"}
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
                                          title={`${formatShortDateLabel(point.date, locale)} · ${
                                            locale === "en" ? "Impressions" : locale === "zh-TW" ? "曝光" : "曝光"
                                          }: ${point.impressionCount}`}
                                        />
                                        <div
                                          className="w-3 rounded-full bg-orange-300/85"
                                          style={{ height: `${clickHeight}%` }}
                                          title={`${formatShortDateLabel(point.date, locale)} · ${
                                            locale === "en" ? "Clicks" : locale === "zh-TW" ? "點擊" : "点击"
                                          }: ${point.clickCount}`}
                                        />
                                      </div>
                                      <span className="text-[10px] text-slate-500">
                                        {formatShortDateLabel(point.date, locale)}
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
                              locale,
                              adminPageCopy.content.bannerList.noWindow,
                            )}
                          </p>
                          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">CTA</p>
                          <p className="mt-2 text-sm text-slate-300">{banner.ctaLabelZhCn}</p>
                        </div>
                        <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-3 text-slate-300 md:col-span-2">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                            {locale === "en" ? "Target link" : locale === "zh-TW" ? "跳轉連結" : "跳转链接"}
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
                            {locale === "en" ? "Duplicate" : locale === "zh-TW" ? "複製" : "复制"}
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
                    {locale === "en"
                      ? "No homepage banners yet. Create one to let the homepage hero prefer database-managed banners."
                      : locale === "zh-TW"
                        ? "目前還沒有首頁 Banner，建立後首頁首屏會優先讀取資料庫設定。"
                        : "当前还没有首页 Banner，创建后首页首屏会优先读取数据库配置。"}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
            <form action="/api/admin/operations/homepage-modules" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
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
                <span className="text-sm text-slate-500">{adminPageCopy.content.moduleList.count(homepageModules.length)}</span>
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
                      <span>{module.metric}</span>
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
                    {locale === "en"
                      ? "No homepage modules yet. Create the first module to let the homepage prefer database-managed operation slots."
                      : locale === "zh-TW"
                        ? "目前還沒有首頁營運位，建立後首頁會優先讀取資料庫設定。"
                        : "当前还没有首页运营位，创建后首页会优先读取数据库配置。"}
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
                          locale,
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
                    {locale === "en"
                      ? "No site announcements yet. Create one to expose cross-site operating messages in the header."
                      : locale === "zh-TW"
                        ? "目前還沒有站內公告，建立後會顯示在全站頭部。"
                        : "当前还没有站内公告，创建后会显示在全站头部。"}
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

          <div className="mt-6 rounded-[1.4rem] border border-sky-300/15 bg-sky-400/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-label">{paymentRuntimeTitle}</p>
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
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">{paymentCheckoutModeTitle}</p>
                <p className="mt-2 font-medium">{paymentCheckoutModeLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">{opsCopy.checkout.pendingWindowLabel}</p>
                <p className="mt-2 font-medium">{paymentMinutesLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">{opsCopy.checkout.callbackEndpointLabel}</p>
                <p className="mt-2 break-all font-medium">{paymentRuntime.callbackPath}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">{paymentCallbackAddressTitle}</p>
                <p className="mt-2 break-all font-medium">{paymentRuntime.callbackUrl}</p>
                {!paymentRuntime.callbackUrlConfigured ? <p className="mt-2 text-xs text-sky-100/70">{paymentSiteUrlHint}</p> : null}
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">{paymentAuthModeTitle}</p>
                <p className="mt-2 font-medium">{paymentAuthModeLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">{paymentCollectionTitle}</p>
                <p className="mt-2 font-medium">{manualCollection.configured ? paymentCollectionReady : paymentCollectionMissing}</p>
                {manualCollection.configured ? (
                  <p className="mt-2 text-xs text-sky-100/70">{getManualCollectionSummary(manualCollection, locale)}</p>
                ) : (
                  <p className="mt-2 text-xs text-sky-100/70">{paymentCollectionHint}</p>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">{paymentHostedTitle}</p>
                <p className="mt-2 font-medium">
                  {paymentRuntime.hostedGatewayConfigured && paymentRuntime.hostedSignatureConfigured ? paymentHostedReady : paymentHostedMissing}
                </p>
                <p className="mt-2 text-xs text-sky-100/70">
                  {paymentRuntime.hostedGatewayName ?? "--"}
                  {paymentRuntime.hostedGatewayConfigured ? "" : ` · ${paymentHostedHint}`}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-label">{paymentCallbacksCopy.title}</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{paymentCallbacksCopy.subtitle}</h3>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                {paymentCallbacksCopy.latestLabel}:{" "}
                {paymentCallbackActivity.recent[0] ? formatDateTime(paymentCallbackActivity.recent[0].lastSeenAt, locale) : "--"}
              </span>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-100 sm:grid-cols-4">
              {[
                [paymentCallbacksCopy.metrics.total, String(paymentCallbackActivity.metrics.eventCount)],
                [paymentCallbacksCopy.metrics.duplicates, String(paymentCallbackActivity.metrics.duplicateCount)],
                [paymentCallbacksCopy.metrics.conflicts, String(paymentCallbackActivity.metrics.conflictCount)],
                [paymentCallbacksCopy.metrics.failed, String(paymentCallbackActivity.metrics.failedCount)],
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
                      <span className="text-xs text-slate-500">{formatDateTime(event.lastSeenAt, locale)}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                      <p>
                        {paymentCallbacksCopy.stateTitle}: {stateMeta.label}
                      </p>
                      <p className="md:text-right">
                        {paymentCallbacksCopy.resultTitle}: {processingMeta.label}
                      </p>
                      <p>
                        {paymentCallbacksCopy.orderIdLabel}: {event.orderId ?? "--"}
                      </p>
                      <p className="md:text-right">
                        {event.providerEventId
                          ? `${paymentCallbacksCopy.eventIdLabel}: ${event.providerEventId}`
                          : `${paymentCallbacksCopy.eventKeyLabel}: ${event.eventKey.slice(0, 18)}...`}
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
                        +{event.duplicateCount} {paymentCallbacksCopy.duplicateSuffix}
                      </p>
                    ) : null}
                  </div>
                );
              })}
              {paymentCallbackActivity.recent.length === 0 ? (
                <div className="rounded-[1.1rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                  {paymentCallbacksCopy.empty}
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
                        {adminPageCopy.users.userList.registeredAt} {formatDateTime(user.createdAt, locale)}
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
                            user.membershipExpiresAt ? formatDateTime(user.membershipExpiresAt, locale) : adminPageCopy.users.userList.unknownExpiry,
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
                            <span>{formatPrice(order.amount, locale)}</span>
                            <span>{adminPageCopy.users.membershipOrders.createdAt} {formatDateTime(order.createdAt, locale)}</span>
                            <span>{adminPageCopy.users.membershipOrders.paymentProvider} {getPaymentProviderLabel(order.provider, locale)}</span>
                            {activityMeta.value ? <span>{activityMeta.label} {formatDateTime(activityMeta.value, locale)}</span> : null}
                            {order.expiresAt ? <span>{adminPageCopy.users.membershipOrders.expiresAt} {formatDateTime(order.expiresAt, locale)}</span> : null}
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
                            <span>{formatPrice(order.amount, locale)}</span>
                            <span>{adminPageCopy.users.contentOrders.createdAt} {formatDateTime(order.createdAt, locale)}</span>
                            <span>{adminPageCopy.users.contentOrders.paymentProvider} {getPaymentProviderLabel(order.provider, locale)}</span>
                            {activityMeta.value ? <span>{activityMeta.label} {formatDateTime(activityMeta.value, locale)}</span> : null}
                            {order.expiresAt ? <span>{adminPageCopy.users.contentOrders.expiresAt} {formatDateTime(order.expiresAt, locale)}</span> : null}
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

      {tab === "ai" ? (
        <section className="glass-panel rounded-[2rem] p-6">
          <SectionHeading eyebrow={adminPageCopy.aiImport.eyebrow} title={adminPageCopy.aiImport.title} />
          {aiNotice ? (
            <div
              className={`mt-6 rounded-[1.2rem] border px-4 py-3 text-sm ${
                error === "prediction" ? "border-rose-300/25 bg-rose-400/10 text-rose-100" : "border-lime-300/20 bg-lime-300/10 text-lime-100"
              }`}
            >
              {aiNotice}
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
                    href={buildAdminAiHrefWithFilters({ aiSport, aiAuthorId, aiResult, aiScope, aiPage: resolvedAiPage })}
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
                        <span className="md:text-right">{formatDateTime(prediction.updatedAt, locale)}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                        <span className="text-orange-200">{prediction.expectedEdge}</span>
                        <div className="flex flex-wrap gap-2">
                          {match ? (
                            <Link
                              href={`/matches/${match.id}`}
                              className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-orange-300/30 hover:text-white"
                            >
                              {locale === "en" ? "Open match" : locale === "zh-TW" ? "查看比賽" : "查看比赛"}
                            </Link>
                          ) : null}
                          <Link
                            href={buildAdminAiHrefWithFilters({
                              aiSport,
                              aiAuthorId,
                              aiResult,
                              aiScope,
                              aiPage: resolvedAiPage,
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
                            aiSport,
                            aiAuthorId,
                            aiResult,
                            aiScope,
                            aiPage: resolvedAiPage - 1,
                          })
                        : undefined
                    }
                    nextHref={
                      resolvedAiPage < aiTotalPages
                        ? buildAdminAiHrefWithFilters({
                            aiSport,
                            aiAuthorId,
                            aiResult,
                            aiScope,
                            aiPage: resolvedAiPage + 1,
                          })
                        : undefined
                    }
                  />
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
