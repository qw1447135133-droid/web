import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminBannerComposer } from "@/components/admin-banner-composer";
import { AdminEventsPanel } from "@/components/admin-events-panel";
import { SectionHeading } from "@/components/section-heading";
import { getAdminAgentsDashboard, getAgentAutomationRuntime } from "@/lib/admin-agents";
import { getAgentPayoutRuntimeConfig } from "@/lib/agent-payout-provider";
import { getRecentAdminExportTasks } from "@/lib/admin-export-tasks";
import { getAdminReportsDashboard } from "@/lib/admin-reports";
import { getAdminSystemDashboard } from "@/lib/admin-system";
import { getAdminEventsDashboard } from "@/lib/admin-events";
import { getAppVersionInfo } from "@/lib/app-version";
import {
  applyHomepageModuleMetrics,
  getArticlePlans as getSiteArticlePlans,
  getAuthorTeams as getSiteAuthorTeams,
  getPredictions as getSitePredictions,
} from "@/lib/content-data";
import {
  getAdminArticlePlans,
  getAdminAuthorApplications,
  getAdminAuthorTeams,
  getAdminPredictionRecords,
} from "@/lib/admin-content";
import {
  buildFinancePackageCards,
  getAdminFinanceDashboard,
  getCoinRechargeOrderStatusMeta,
  getFinanceReconciliationIssueSeverityMeta,
  getFinanceReconciliationScopeLabel,
  getFinanceReconciliationIssueSlaMeta,
  getFinanceReconciliationIssueStatusMeta,
  getFinanceReconciliationIssueTypeLabel,
  getFinanceReconciliationWorkflowStageMeta,
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
  getPaymentProviderLabel,
  getResolvedPaymentRuntimeConfig,
} from "@/lib/payment-provider";
import { getOrderActivityMeta, getOrderFailureMeta, getOrderStatusMeta } from "@/lib/payment-ui";
import { getAdminPushDashboard } from "@/lib/push-notifications";
import { getSessionContext } from "@/lib/session";
import {
  getAdminSiteAds,
  getSiteAdPlacementHint,
  getSiteAdPlacementLabel,
  siteAdPlacements,
} from "@/lib/site-ads";
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
type AdminContentSection = "overview" | "homepage" | "library" | "distribution" | "assistant";
type AdminUsersSection = "overview" | "workspace" | "membership-orders" | "content-orders" | "payments";
type AdminFinanceSection = "overview" | "recharge" | "reconciliation" | "wallets";
type AdminAgentsSection = "overview" | "automation" | "network" | "withdrawals";
type AdminSystemSection = "overview" | "security" | "notifications" | "runtime";
type AdminReportsSection = "overview" | "trends" | "breakdowns" | "exports";
type AdminContentPane =
  | "featured"
  | "banners"
  | "modules"
  | "authors"
  | "plans"
  | "announcements"
  | "ads";
type AdminAssistantKnowledgeStatusFilter = "all" | "active" | "inactive";
type AdminAssistantHandoffStatusFilter = "all" | "pending" | "resolved";
type AdminFinanceIssueQueueFilter = "all" | "overdue" | "unassigned" | "active" | "closed";
type AdminReportsWindow = 7 | 30 | 90 | 180 | 365;
type AdminEventsLeagueStatusFilter = "all" | "active" | "inactive";
type AdminEventsMatchStatusFilter = "all" | "live" | "upcoming" | "finished";
type AdminEventsMatchVisibilityFilter = "all" | "visible" | "hidden";
type AdminEventsAuditStatusFilter = "all" | "success" | "failed";
type AdminEventsAuditTargetTypeFilter = "all" | "league" | "match";
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

function normalizeAdminFinanceIssueQueueFilter(value: string): AdminFinanceIssueQueueFilter {
  if (value === "overdue" || value === "unassigned" || value === "active" || value === "closed") {
    return value;
  }

  return "all";
}

function normalizeAdminReportsWindow(value: string): AdminReportsWindow {
  if (value === "7") {
    return 7;
  }

  if (value === "90") {
    return 90;
  }

  if (value === "180") {
    return 180;
  }

  if (value === "365") {
    return 365;
  }

  return 30;
}

function normalizeAdminEventsLeagueStatusFilter(value: string): AdminEventsLeagueStatusFilter {
  return value === "active" || value === "inactive" ? value : "all";
}

function normalizeAdminEventsMatchStatusFilter(value: string): AdminEventsMatchStatusFilter {
  return value === "live" || value === "upcoming" || value === "finished" ? value : "all";
}

function normalizeAdminEventsMatchVisibilityFilter(value: string): AdminEventsMatchVisibilityFilter {
  return value === "visible" || value === "hidden" ? value : "all";
}

function normalizeAdminEventsAuditStatusFilter(value: string): AdminEventsAuditStatusFilter {
  return value === "success" || value === "failed" ? value : "all";
}

function normalizeAdminEventsAuditTargetTypeFilter(value: string): AdminEventsAuditTargetTypeFilter {
  return value === "league" || value === "match" ? value : "all";
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

function formatAdminFileSize(value?: number) {
  if (!value || value <= 0) {
    return "--";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAdminCoinAmount(value: number, locale: Locale | DisplayLocale) {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(value);
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
    timeZone: "UTC",
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

function getAuthorApplicationStatusMeta(status: string, locale: DisplayLocale) {
  if (status === "approved") {
    return {
      label: locale === "zh-TW" ? "已通過" : locale === "en" || locale === "th" || locale === "vi" || locale === "hi" ? "Approved" : "已通过",
      className: "bg-lime-300/12 text-lime-100",
    };
  }

  if (status === "rejected") {
    return {
      label: locale === "zh-TW" ? "已拒絕" : locale === "en" || locale === "th" || locale === "vi" || locale === "hi" ? "Rejected" : "已拒绝",
      className: "bg-rose-400/12 text-rose-100",
    };
  }

  return {
    label: locale === "zh-TW" ? "待審核" : locale === "en" || locale === "th" || locale === "vi" || locale === "hi" ? "Pending" : "待审核",
    className: "bg-amber-300/12 text-amber-100",
  };
}

function getTrendMaxValue(
  points: Array<{
    impressionCount: number;
    clickCount: number;
  }>,
) {
  return points.reduce((max, item) => Math.max(max, item.impressionCount, item.clickCount), 0);
}

function getSimpleTrendMaxValue(
  points: Array<{
    value: number;
  }>,
) {
  return points.reduce((max, item) => Math.max(max, item.value), 0);
}

function isBooleanSystemParameterKey(key: string) {
  return (
    key === "app.version.force_update" ||
    key === "app.web.install_enabled" ||
    key === "app.web.fullscreen_enabled" ||
    key === "app.push.webpush_enabled" ||
    key === "assistant.ai.enabled"
  );
}

function isTextareaSystemParameterKey(key: string) {
  return key === "app.version.notes" || key.endsWith(".wallets");
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

function AdminHiddenFields({
  values,
}: {
  values: Record<string, string | number | undefined>;
}) {
  return (
    <>
      {Object.entries(values).map(([name, value]) =>
        value === undefined ? null : <input key={name} type="hidden" name={name} value={value} />,
      )}
    </>
  );
}

function AdminContentPaneNav({
  title,
  description,
  items,
  activeKey,
}: {
  title: string;
  description: string;
  items: Array<{
    key: string;
    label: string;
    count: string;
    href: string;
  }>;
  activeKey?: string;
}) {
  return (
    <div className="mt-6 rounded-[1.45rem] border border-white/8 bg-white/[0.035] p-3.5 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="section-label">{title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{description}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-1.5 text-[11px] font-medium text-slate-300">
          {items.length}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {items.map((item) => {
          const isActive = item.key === activeKey;

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`group flex min-w-[calc(50%-0.3125rem)] flex-1 items-center justify-between gap-3 rounded-[1.05rem] border px-3.5 py-2.5 text-sm transition sm:min-w-0 sm:flex-none sm:justify-start sm:rounded-full sm:px-4 sm:py-2 ${
                isActive
                  ? "border-orange-300/35 bg-[linear-gradient(135deg,rgba(251,146,60,0.18),rgba(249,115,22,0.08))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_26px_rgba(249,115,22,0.10)]"
                  : "border-white/10 bg-slate-950/38 text-slate-300 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 flex-none rounded-full transition ${
                  isActive ? "bg-orange-100 shadow-[0_0_12px_rgba(251,191,36,0.45)]" : "bg-slate-500/80 group-hover:bg-slate-200"
                }`}
              />
              <span className="min-w-0 flex-1 text-left leading-5 sm:flex-none sm:whitespace-nowrap sm:leading-none">
                {item.label}
              </span>
              <span
                className={`flex-none rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none transition ${
                  isActive
                    ? "border-orange-200/15 bg-white/10 text-orange-50"
                    : "border-white/8 bg-white/[0.04] text-slate-400 group-hover:text-slate-200"
                }`}
              >
                {item.count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function buildAdminUsersHref(
  filters: AdminUsersTabFilters & { usersSection?: AdminUsersSection },
  overrides: Partial<AdminUsersTabFilters & { usersSection?: AdminUsersSection }> = {},
) {
  const nextFilters = { ...filters, ...overrides };
  const params = new URLSearchParams();

  params.set("tab", "users");
  if (nextFilters.usersSection) {
    params.set("usersSection", nextFilters.usersSection);
  }
  params.set("orderStatus", nextFilters.orderStatus);
  params.set("orderType", nextFilters.orderType);
  setOptionalSearchParam(params, "q", nextFilters.query);
  setOptionalSearchParam(params, "from", nextFilters.from);
  setOptionalSearchParam(params, "to", nextFilters.to);
  params.set("membershipPage", String(nextFilters.membershipPage));
  params.set("contentPage", String(nextFilters.contentPage));

  return `/admin?${params.toString()}`;
}

function buildAdminFinanceHref(
  filters: {
    financeSection?: AdminFinanceSection;
    financeIssueScope: string;
    financeIssueStatus: string;
    financeIssueSeverity: string;
    financeIssueType: string;
    financeIssueQueue: AdminFinanceIssueQueueFilter;
    financeIssueQuery: string;
  },
  overrides: Partial<{
    financeSection?: AdminFinanceSection;
    financeIssueScope: string;
    financeIssueStatus: string;
    financeIssueSeverity: string;
    financeIssueType: string;
    financeIssueQueue: AdminFinanceIssueQueueFilter;
    financeIssueQuery: string;
  }> = {},
) {
  const nextFilters = { ...filters, ...overrides };
  const params = new URLSearchParams();

  params.set("tab", "finance");
  if (nextFilters.financeSection) {
    params.set("financeSection", nextFilters.financeSection);
  }
  params.set("financeIssueScope", nextFilters.financeIssueScope);
  params.set("financeIssueStatus", nextFilters.financeIssueStatus);
  params.set("financeIssueSeverity", nextFilters.financeIssueSeverity);
  params.set("financeIssueType", nextFilters.financeIssueType);
  params.set("financeIssueQueue", nextFilters.financeIssueQueue);
  setOptionalSearchParam(params, "financeIssueQuery", nextFilters.financeIssueQuery);

  return `/admin?${params.toString()}`;
}

function buildAdminAgentsHref(
  filters: { agentsSection?: AdminAgentsSection },
  overrides: Partial<{ agentsSection?: AdminAgentsSection }> = {},
) {
  const nextFilters = { ...filters, ...overrides };
  const params = new URLSearchParams();

  params.set("tab", "agents");
  if (nextFilters.agentsSection) {
    params.set("agentsSection", nextFilters.agentsSection);
  }

  return `/admin?${params.toString()}`;
}

function buildAdminSystemHref(
  filters: { systemSection?: AdminSystemSection },
  overrides: Partial<{ systemSection?: AdminSystemSection; editPushCampaign?: string }> = {},
) {
  const nextFilters = { ...filters, ...overrides };
  const params = new URLSearchParams();

  params.set("tab", "system");
  if (nextFilters.systemSection) {
    params.set("systemSection", nextFilters.systemSection);
  }
  setOptionalSearchParam(params, "editPushCampaign", overrides.editPushCampaign);

  return `/admin?${params.toString()}`;
}

function buildAdminReportsHref(
  filters: {
    reportsSection?: AdminReportsSection;
    reportsWindow: AdminReportsWindow;
    reportsFrom: string;
    reportsTo: string;
    reportsOrderType: string;
    reportsDimension: string;
  },
  overrides: Partial<{
    reportsSection?: AdminReportsSection;
    reportsWindow: AdminReportsWindow;
    reportsFrom: string;
    reportsTo: string;
    reportsOrderType: string;
    reportsDimension: string;
  }> = {},
) {
  const nextFilters = { ...filters, ...overrides };
  const params = new URLSearchParams();

  params.set("tab", "reports");
  if (nextFilters.reportsSection) {
    params.set("reportsSection", nextFilters.reportsSection);
  }
  params.set("reportsWindow", String(nextFilters.reportsWindow));
  setOptionalSearchParam(params, "reportsFrom", nextFilters.reportsFrom);
  setOptionalSearchParam(params, "reportsTo", nextFilters.reportsTo);
  params.set("reportsOrderType", nextFilters.reportsOrderType);
  setOptionalSearchParam(params, "reportsDimension", nextFilters.reportsDimension);

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

function normalizeAdminContentSection(value: string): AdminContentSection | undefined {
  if (
    value === "overview" ||
    value === "homepage" ||
    value === "library" ||
    value === "distribution" ||
    value === "assistant"
  ) {
    return value;
  }

  return undefined;
}

function normalizeAdminUsersSection(value: string): AdminUsersSection | undefined {
  if (
    value === "overview" ||
    value === "workspace" ||
    value === "membership-orders" ||
    value === "content-orders" ||
    value === "payments"
  ) {
    return value;
  }

  return undefined;
}

function normalizeAdminFinanceSection(value: string): AdminFinanceSection | undefined {
  if (value === "overview" || value === "recharge" || value === "reconciliation" || value === "wallets") {
    return value;
  }

  return undefined;
}

function normalizeAdminAgentsSection(value: string): AdminAgentsSection | undefined {
  if (value === "overview" || value === "automation" || value === "network" || value === "withdrawals") {
    return value;
  }

  return undefined;
}

function normalizeAdminSystemSection(value: string): AdminSystemSection | undefined {
  if (value === "overview" || value === "security" || value === "notifications" || value === "runtime") {
    return value;
  }

  return undefined;
}

function normalizeAdminReportsSection(value: string): AdminReportsSection | undefined {
  if (value === "overview" || value === "trends" || value === "breakdowns" || value === "exports") {
    return value;
  }

  return undefined;
}

function normalizeAdminContentPane(value: string): AdminContentPane | undefined {
  if (
    value === "featured" ||
    value === "banners" ||
    value === "modules" ||
    value === "authors" ||
    value === "plans" ||
    value === "announcements" ||
    value === "ads"
  ) {
    return value;
  }

  return undefined;
}

function buildAdminContentHref(
  filters: {
    contentSection?: AdminContentSection;
    contentPane?: AdminContentPane;
    contentSport: AdminSportFilter;
    contentAuthorId: string;
    contentPlanStatus: AdminPlanStatusFilter;
    contentQuery: string;
    knowledgeStatus?: AdminAssistantKnowledgeStatusFilter;
    knowledgeCategory?: string;
    knowledgeQuery?: string;
  },
  overrides?: {
    contentSection?: AdminContentSection;
    contentPane?: AdminContentPane;
    editAuthor?: string;
    editPlan?: string;
    editBanner?: string;
    editSiteAd?: string;
    editFeaturedSlot?: string;
    editModule?: string;
    editAnnouncement?: string;
    editKnowledge?: string;
  },
) {
  const params = new URLSearchParams();
  params.set("tab", "content");

  const nextContentSection = overrides?.contentSection ?? filters.contentSection;
  const nextContentPane =
    overrides && "contentPane" in overrides
      ? overrides.contentPane
      : overrides?.contentSection && overrides.contentSection !== filters.contentSection
        ? undefined
        : filters.contentPane;
  if (nextContentSection && nextContentSection !== "overview") {
    params.set("contentSection", nextContentSection);
  }
  if (nextContentPane) {
    params.set("contentPane", nextContentPane);
  }

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

  if (overrides?.editSiteAd) {
    params.set("editSiteAd", overrides.editSiteAd);
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
  paymentRuntime: Awaited<ReturnType<typeof getResolvedPaymentRuntimeConfig>>,
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

function ExpansionRowsPanel({
  title,
  description,
  rows,
}: {
  title: string;
  description?: string;
  rows: Array<{ title: string; subtitle?: string; status?: string; tone?: "good" | "warn" | "neutral"; meta?: string[] }>;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          {description ? <p className="mt-2 text-sm text-slate-400">{description}</p> : null}
        </div>
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
    provider: "mock" | "manual" | "hosted" | "xendit" | "razorpay" | "payu";
    paymentReference?: string;
    memberNote?: string;
    proofUrl?: string;
    proofUploadedAt?: string;
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
    flagIssue:
      locale === "en" ? "Flag issue" : locale === "zh-TW" ? "加入對帳問題" : "加入对账问题",
    reviewTitle:
      locale === "en" ? "Single-order review" : locale === "zh-TW" ? "單筆審核動作" : "单笔审核动作",
    referenceLabel:
      locale === "en" ? "Payment reference" : locale === "zh-TW" ? "支付流水" : "支付流水",
    referencePlaceholder:
      locale === "en" ? "Optional bank / wallet reference" : locale === "zh-TW" ? "可選，銀行 / 錢包流水號" : "可选，银行 / 钱包流水号",
    noteLabel:
      locale === "en" ? "Handling note" : locale === "zh-TW" ? "處理備註" : "处理备注",
    failPlaceholder:
      locale === "en" ? "Reason shown to finance and support" : locale === "zh-TW" ? "填寫失敗原因，方便財務與客服追蹤" : "填写失败原因，方便财务与客服追踪",
    refundPlaceholder:
      locale === "en" ? "Reason for refund or rollback" : locale === "zh-TW" ? "填寫退款或回退原因" : "填写退款或回退原因",
    closeHint:
      locale === "en" ? "Closing a pending order will stop further crediting." : locale === "zh-TW" ? "關閉待處理訂單後將不再繼續入帳。" : "关闭待处理订单后将不再继续入账。",
    empty:
      locale === "en"
        ? "No coin recharge orders yet. Create one manually from the admin form above."
        : locale === "zh-TW"
          ? "目前還沒有球幣充值訂單，可先用上方表單建立手動訂單。"
          : "当前还没有球币充值订单，可先用上方表单建立手动订单。",
  };
  const batchCopy = {
    title: locale === "en" ? "Batch abnormal order handling" : locale === "zh-TW" ? "批量異常訂單處理" : "批量异常订单处理",
    description:
      locale === "en"
        ? "Select recent recharge orders and run the same finance action in one batch."
        : locale === "zh-TW"
          ? "可選取最近充值單，批量執行補單、記失敗或關閉。"
          : "可选取最近充值单，批量执行补单、记失败或关闭。",
    selection:
      locale === "en" ? "Recent recharge orders" : locale === "zh-TW" ? "最近充值訂單" : "最近充值订单",
    reference:
      locale === "en" ? "Batch reference" : locale === "zh-TW" ? "批次流水號" : "批次流水号",
    reason: locale === "en" ? "Batch note" : locale === "zh-TW" ? "批次備註" : "批次备注",
    referencePlaceholder:
      locale === "en"
        ? "Optional shared payment reference"
        : locale === "zh-TW"
          ? "可選，共用對賬流水號"
          : "可选，共用对账流水号",
    reasonPlaceholder:
      locale === "en"
        ? "Optional note for batch failure handling"
        : locale === "zh-TW"
          ? "可選，批次失敗處理備註"
          : "可选，批次失败处理备注",
    selectionHint:
      locale === "en"
        ? "Hold Ctrl/Cmd for multi-select."
        : locale === "zh-TW"
          ? "可按 Ctrl/Cmd 多選。"
          : "可按 Ctrl/Cmd 多选。",
    batchPaid: locale === "en" ? "Batch mark paid" : locale === "zh-TW" ? "批量補單" : "批量补单",
    batchFailed: locale === "en" ? "Batch mark failed" : locale === "zh-TW" ? "批量記失敗" : "批量记失败",
    batchClose: locale === "en" ? "Batch close" : locale === "zh-TW" ? "批量關閉" : "批量关闭",
    batchRefund: locale === "en" ? "Batch refund" : locale === "zh-TW" ? "批量退款" : "批量退款",
  };

  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <span className="text-sm text-slate-500">{orders.length}</span>
      </div>
      <form action="/api/admin/finance/recharge-orders" method="post" className="mt-5 rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">{batchCopy.title}</p>
            <p className="mt-2 text-sm text-slate-400">{batchCopy.description}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
            {batchCopy.selectionHint}
          </span>
        </div>
        <div className="mt-4 grid gap-4">
          <label className="space-y-2 text-sm">
            <span className="text-slate-400">{batchCopy.selection}</span>
            <select
              name="orderIds"
              multiple
              size={Math.min(Math.max(orders.length, 4), 8)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
            >
              {orders.map((order) => (
                <option key={`finance-batch-order-${order.id}`} value={order.id}>
                  {`${order.orderNo} / ${order.userDisplayName} / ${order.status}`}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-slate-400">{batchCopy.reference}</span>
              <input
                name="paymentReference"
                placeholder={batchCopy.referencePlaceholder}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-400">{batchCopy.reason}</span>
              <input
                name="reason"
                placeholder={batchCopy.reasonPlaceholder}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </label>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            name="intent"
            value="batch-mark-paid"
            disabled={orders.length === 0}
            className="rounded-full border border-lime-300/20 bg-lime-300/10 px-4 py-2 text-sm font-semibold text-lime-100 transition hover:bg-lime-300/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {batchCopy.batchPaid}
          </button>
          <button
            type="submit"
            name="intent"
            value="batch-mark-failed"
            disabled={orders.length === 0}
            className="rounded-full border border-orange-300/20 bg-orange-300/10 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:bg-orange-300/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {batchCopy.batchFailed}
          </button>
          <button
            type="submit"
            name="intent"
            value="batch-close"
            disabled={orders.length === 0}
            className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {batchCopy.batchClose}
          </button>
          <button
            type="submit"
            name="intent"
            value="batch-refund"
            disabled={orders.length === 0}
            className="rounded-full border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {batchCopy.batchRefund}
          </button>
        </div>
      </form>
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
                {order.memberNote ? <p className="mt-3 text-sm text-slate-300">{locale === "en" ? "Member note" : locale === "zh-TW" ? "會員備註" : "会员备注"}: {order.memberNote}</p> : null}
                {order.proofUrl ? (
                  <p className="mt-2 text-sm text-cyan-200">
                    <a href={order.proofUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4 transition hover:text-cyan-100">
                      {locale === "en" ? "Open payment proof" : locale === "zh-TW" ? "查看付款憑證" : "查看付款凭证"}
                    </a>
                    {order.proofUploadedAt ? <span className="ml-2 text-xs text-slate-400">{formatDateTime(order.proofUploadedAt, locale)}</span> : null}
                  </p>
                ) : null}
                {order.failureReason ? <p className="mt-3 text-sm text-orange-100">{order.failureReason}</p> : null}
                {order.refundReason ? <p className="mt-3 text-sm text-slate-300">{order.refundReason}</p> : null}
                <div className="mt-4 grid gap-3 rounded-[1rem] border border-white/8 bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{actionLabel.reviewTitle}</p>
                    {order.status === "pending" ? <p className="text-xs text-slate-400">{actionLabel.closeHint}</p> : null}
                  </div>
                  <form action="/api/admin/finance/recharge-orders" method="post" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                    <input type="hidden" name="orderId" value={order.id} />
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">{actionLabel.referenceLabel}</span>
                      <input
                        name="paymentReference"
                        defaultValue={order.paymentReference ?? ""}
                        placeholder={actionLabel.referencePlaceholder}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">{actionLabel.noteLabel}</span>
                      <input
                        name="reason"
                        placeholder={order.status === "paid" ? actionLabel.refundPlaceholder : actionLabel.failPlaceholder}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {(order.status === "pending" || order.status === "failed" || order.status === "closed") ? (
                        <button type="submit" name="intent" value="mark-paid" className="rounded-full border border-lime-300/20 bg-lime-300/10 px-4 py-2 text-sm text-lime-100 transition hover:bg-lime-300/15">
                          {actionLabel.markPaid}
                        </button>
                      ) : null}
                      {order.status === "pending" ? (
                        <>
                          <button type="submit" name="intent" value="mark-failed" className="rounded-full border border-orange-300/20 bg-orange-300/10 px-4 py-2 text-sm text-orange-100 transition hover:bg-orange-300/15">
                            {actionLabel.markFailed}
                          </button>
                          <button type="submit" name="intent" value="close" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:text-white">
                            {actionLabel.close}
                          </button>
                        </>
                      ) : null}
                      {order.status === "paid" ? (
                        <button type="submit" name="intent" value="refund" className="rounded-full border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-400/15">
                          {actionLabel.refund}
                        </button>
                      ) : null}
                    </div>
                  </form>
                  <form action="/api/admin/finance/recharge-orders" method="post" className="flex flex-wrap gap-2">
                    <input type="hidden" name="intent" value="flag-reconciliation-issue" />
                    <input type="hidden" name="orderRef" value={order.id} />
                    <input type="hidden" name="paymentReference" value={order.paymentReference ?? ""} />
                    <input
                      type="hidden"
                      name="issueType"
                      value={order.status === "refunded" ? "refund_review" : order.status === "pending" ? "missing_payment" : "manual_review"}
                    />
                    <input type="hidden" name="severity" value={order.status === "failed" || order.status === "pending" ? "high" : "medium"} />
                    <input
                      type="hidden"
                      name="summary"
                      value={
                        locale === "en"
                          ? `Recharge order ${order.orderNo} needs reconciliation review`
                          : locale === "zh-TW"
                            ? `充值單 ${order.orderNo} 需要對帳複核`
                            : `充值单 ${order.orderNo} 需要对账复核`
                      }
                    />
                    <input type="hidden" name="detail" value={order.failureReason ?? order.refundReason ?? ""} />
                    <button type="submit" className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/15">
                      {actionLabel.flagIssue}
                    </button>
                  </form>
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

function FinanceReconciliationIssuesPanel({
  title,
  locale,
  issues,
  issueTypeOptions,
  filters,
  summary,
  financeSection,
}: {
  title: string;
  locale: Locale;
  issues: Array<{
    id: string;
    scope: "coin-recharge" | "membership" | "content";
    issueType: string;
    status: "open" | "reviewing" | "resolved" | "ignored";
    severity: "low" | "medium" | "high";
    workflowStage: "triage" | "investigating" | "awaiting-callback" | "awaiting-finance" | "closed";
    summary: string;
    detail?: string;
    paymentReference?: string;
    amount?: number;
    sourceStatus?: string;
    resolutionNote?: string;
    assignedToDisplayName?: string;
    reminderCount: number;
    lastRemindedAt?: string;
    lastReminderNote?: string;
    createdByDisplayName: string;
    resolvedAt?: string;
    createdAt: string;
    updatedAt: string;
    rechargeOrderId?: string;
    membershipOrderId?: string;
    contentOrderId?: string;
    rechargeOrderNo?: string;
    orderRefLabel?: string;
    subjectTitle?: string;
    userDisplayName?: string;
    userEmail?: string;
    ageHours: number;
    isOverdue: boolean;
    isUnassigned: boolean;
  }>;
  issueTypeOptions: string[];
  filters: {
    scope: string;
    status: string;
    severity: string;
    issueType: string;
    queue: AdminFinanceIssueQueueFilter;
    query: string;
  };
  summary: {
    openCount: number;
    reviewingCount: number;
    resolvedCount: number;
    ignoredCount: number;
    highSeverityOpenCount: number;
    overdueCount: number;
    unassignedActiveCount: number;
  };
  financeSection?: AdminFinanceSection;
}) {
  const copy = {
    createTitle:
      locale === "en" ? "Create issue" : locale === "zh-TW" ? "新增對帳問題" : "新增对账问题",
    createDescription:
      locale === "en"
        ? "Use this queue to track recharge exceptions, missing payments, and manual finance reviews."
        : locale === "zh-TW"
          ? "把充值異常、到帳核驗與人工財務複核統一沉澱到對帳問題隊列。"
          : "把充值异常、到账核验与人工财务复核统一沉淀到对账问题队列。",
    issueType: locale === "en" ? "Issue type" : locale === "zh-TW" ? "問題類型" : "问题类型",
    issueScope: locale === "en" ? "Order scope" : locale === "zh-TW" ? "訂單範圍" : "订单范围",
    scanScope: locale === "en" ? "Scan scope" : locale === "zh-TW" ? "掃描範圍" : "扫描范围",
    severity: locale === "en" ? "Priority" : locale === "zh-TW" ? "優先級" : "优先级",
    orderRef: locale === "en" ? "Order ref" : locale === "zh-TW" ? "訂單標識" : "订单标识",
    paymentReference: locale === "en" ? "Payment reference" : locale === "zh-TW" ? "支付流水" : "支付流水",
    summary: locale === "en" ? "Summary" : locale === "zh-TW" ? "問題摘要" : "问题摘要",
    detail: locale === "en" ? "Detail" : locale === "zh-TW" ? "補充說明" : "补充说明",
    orderRefPlaceholder:
      locale === "en"
        ? "Recharge order ID or order number"
        : locale === "zh-TW"
          ? "充值單 ID 或訂單號"
          : "充值单 ID 或订单号",
    paymentReferencePlaceholder:
      locale === "en"
        ? "Optional external payment reference"
        : locale === "zh-TW"
          ? "可選，外部支付流水"
          : "可选，外部支付流水",
    summaryPlaceholder:
      locale === "en"
        ? "Describe the reconciliation issue"
        : locale === "zh-TW"
          ? "描述本次對帳問題"
          : "描述本次对账问题",
    detailPlaceholder:
      locale === "en"
        ? "Optional notes for finance follow-up"
        : locale === "zh-TW"
          ? "可選，填寫財務跟進備註"
          : "可选，填写财务跟进备注",
    submit: locale === "en" ? "Create issue" : locale === "zh-TW" ? "建立問題" : "建立问题",
    scan:
      locale === "en" ? "Run anomaly scan" : locale === "zh-TW" ? "執行異常掃描" : "执行异常扫描",
    scanHint:
      locale === "en"
        ? "Scans stale pending, failed, refunded, and paid-but-not-credited recharge orders."
        : locale === "zh-TW"
          ? "掃描超時待支付、支付失敗、已退款與已支付未入帳的充值單。"
          : "扫描超时待支付、支付失败、已退款与已支付未入账的充值单。",
    empty:
      locale === "en"
        ? "No reconciliation issues yet."
        : locale === "zh-TW"
          ? "目前還沒有對帳問題。"
          : "当前还没有对账问题。",
    notePlaceholder:
      locale === "en"
        ? "Optional handling note"
        : locale === "zh-TW"
          ? "可選，處理備註"
          : "可选，处理备注",
    markReviewing:
      locale === "en" ? "Move to reviewing" : locale === "zh-TW" ? "轉為處理中" : "转为处理中",
    resolve:
      locale === "en" ? "Resolve" : locale === "zh-TW" ? "標記已解決" : "标记已解决",
    ignore:
      locale === "en" ? "Ignore" : locale === "zh-TW" ? "標記忽略" : "标记忽略",
    reopen:
      locale === "en" ? "Reopen" : locale === "zh-TW" ? "重新打開" : "重新打开",
    queueTitle:
      locale === "en" ? "Issue queue" : locale === "zh-TW" ? "問題隊列" : "问题队列",
    highPriority:
      locale === "en" ? "High priority open" : locale === "zh-TW" ? "高優先級待處理" : "高优先级待处理",
    createdBy:
      locale === "en" ? "Created by" : locale === "zh-TW" ? "建立人" : "建立人",
    owner:
      locale === "en" ? "Owner" : locale === "zh-TW" ? "當前跟進" : "当前跟进",
    stage:
      locale === "en" ? "Stage" : locale === "zh-TW" ? "處理階段" : "处理阶段",
    assignOwner:
      locale === "en" ? "Assign owner" : locale === "zh-TW" ? "分配跟進人" : "分配跟进人",
    assignPlaceholder:
      locale === "en" ? "Type owner name" : locale === "zh-TW" ? "輸入跟進人名稱" : "输入跟进人名称",
    assign:
      locale === "en" ? "Assign" : locale === "zh-TW" ? "分配" : "分配",
    resolvedAt:
      locale === "en" ? "Resolved at" : locale === "zh-TW" ? "完成時間" : "完成时间",
    overdue:
      locale === "en" ? "Overdue" : locale === "zh-TW" ? "已逾時" : "已逾时",
    unassigned:
      locale === "en" ? "Unassigned" : locale === "zh-TW" ? "未分配" : "未分配",
    reminders:
      locale === "en" ? "Reminders" : locale === "zh-TW" ? "催辦次數" : "催办次数",
    lastReminder:
      locale === "en" ? "Last reminder" : locale === "zh-TW" ? "最近催辦" : "最近催办",
    remind:
      locale === "en" ? "Remind" : locale === "zh-TW" ? "催辦" : "催办",
    reminderScan:
      locale === "en" ? "Run reminder scan" : locale === "zh-TW" ? "執行催辦掃描" : "执行催办扫描",
    reminderHint:
      locale === "en"
        ? "Reminder scan nudges overdue open issues that have not been reminded recently."
        : locale === "zh-TW"
          ? "催辦掃描會為逾時且近期未催辦的問題補一次系統催辦。"
          : "催办扫描会为逾时且近期未催办的问题补一次系统催办。",
    filterTitle:
      locale === "en" ? "Queue filters" : locale === "zh-TW" ? "隊列篩選" : "队列筛选",
    filterScope:
      locale === "en" ? "Scope" : locale === "zh-TW" ? "範圍" : "范围",
    filterStatus:
      locale === "en" ? "Status" : locale === "zh-TW" ? "狀態" : "状态",
    filterQueue:
      locale === "en" ? "Queue" : locale === "zh-TW" ? "隊列" : "队列",
    filterSearch:
      locale === "en" ? "Search" : locale === "zh-TW" ? "搜尋" : "搜索",
    filterSearchPlaceholder:
      locale === "en"
        ? "Search owner, order, summary, or payment ref"
        : locale === "zh-TW"
          ? "搜尋跟進人、訂單號、摘要或支付流水"
          : "搜索跟进人、订单号、摘要或支付流水",
    applyFilters:
      locale === "en" ? "Apply filters" : locale === "zh-TW" ? "套用篩選" : "应用筛选",
    clearFilters:
      locale === "en" ? "Clear" : locale === "zh-TW" ? "清除" : "清除",
    batchTitle:
      locale === "en" ? "Batch actions" : locale === "zh-TW" ? "批量動作" : "批量动作",
    batchSelectionHint:
      locale === "en"
        ? "Use the multi-select queue to review, resolve, ignore, or remind a group of issues."
        : locale === "zh-TW"
          ? "使用多選隊列統一批量轉處理中、解決、忽略或催辦問題。"
          : "使用多选队列统一批量转处理中、解决、忽略或催办问题。",
    batchSelectPlaceholder:
      locale === "en" ? "Select issues" : locale === "zh-TW" ? "選擇問題" : "选择问题",
    batchReview:
      locale === "en" ? "Batch review" : locale === "zh-TW" ? "批量轉處理中" : "批量转处理中",
    batchResolve:
      locale === "en" ? "Batch resolve" : locale === "zh-TW" ? "批量解決" : "批量解决",
    batchIgnore:
      locale === "en" ? "Batch ignore" : locale === "zh-TW" ? "批量忽略" : "批量忽略",
    batchRemind:
      locale === "en" ? "Batch remind" : locale === "zh-TW" ? "批量催辦" : "批量催办",
    all:
      locale === "en" ? "All" : locale === "zh-TW" ? "全部" : "全部",
    active:
      locale === "en" ? "Active" : locale === "zh-TW" ? "進行中" : "进行中",
    closed:
      locale === "en" ? "Closed" : locale === "zh-TW" ? "已收口" : "已收口",
    keepCurrent:
      locale === "en" ? "Keep current" : locale === "zh-TW" ? "維持現狀" : "维持现状",
  };

  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-orange-100">
            {locale === "en" ? `Open ${summary.openCount}` : locale === "zh-TW" ? `待處理 ${summary.openCount}` : `待处理 ${summary.openCount}`}
          </span>
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-cyan-100">
            {locale === "en"
              ? `Reviewing ${summary.reviewingCount}`
              : locale === "zh-TW"
                ? `處理中 ${summary.reviewingCount}`
                : `处理中 ${summary.reviewingCount}`}
          </span>
          <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-lime-100">
            {locale === "en" ? `Resolved ${summary.resolvedCount}` : locale === "zh-TW" ? `已解決 ${summary.resolvedCount}` : `已解决 ${summary.resolvedCount}`}
          </span>
          <span className="rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-1 text-rose-100">
            {locale === "en" ? `Overdue ${summary.overdueCount}` : locale === "zh-TW" ? `逾時 ${summary.overdueCount}` : `逾时 ${summary.overdueCount}`}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-200">
            {locale === "en"
              ? `Unassigned ${summary.unassignedActiveCount}`
              : locale === "zh-TW"
                ? `未分配 ${summary.unassignedActiveCount}`
                : `未分配 ${summary.unassignedActiveCount}`}
          </span>
        </div>
      </div>
      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
        <form action="/api/admin/finance/recharge-orders" method="post" className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
          <input type="hidden" name="intent" value="flag-reconciliation-issue" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">{copy.createTitle}</p>
              <p className="mt-2 text-sm text-slate-400">{copy.createDescription}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-1 text-xs text-rose-100">
                {copy.highPriority} {summary.highSeverityOpenCount}
              </span>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="submit"
                  name="intent"
                  formNoValidate
                  value="scan-reconciliation-reminders"
                  className="rounded-full border border-white/12 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-white/25 hover:text-white"
                >
                  {copy.reminderScan}
                </button>
                <button
                  type="submit"
                  name="intent"
                  formNoValidate
                  value="scan-reconciliation-issues"
                  className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/15"
                >
                  {copy.scan}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-1 text-xs text-slate-500">
            <p>{copy.scanHint}</p>
            <p>{copy.reminderHint}</p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-slate-400">{copy.issueScope}</span>
              <select name="issueScope" defaultValue="coin-recharge" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                <option value="coin-recharge">{getFinanceReconciliationScopeLabel(locale, "coin-recharge")}</option>
                <option value="membership">{getFinanceReconciliationScopeLabel(locale, "membership")}</option>
                <option value="content">{getFinanceReconciliationScopeLabel(locale, "content")}</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-400">{copy.issueType}</span>
              <select name="issueType" defaultValue="manual_review" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                <option value="manual_review">{getFinanceReconciliationIssueTypeLabel(locale, "manual_review")}</option>
                <option value="missing_payment">{getFinanceReconciliationIssueTypeLabel(locale, "missing_payment")}</option>
                <option value="refund_review">{getFinanceReconciliationIssueTypeLabel(locale, "refund_review")}</option>
                <option value="entitlement_missing">{getFinanceReconciliationIssueTypeLabel(locale, "entitlement_missing")}</option>
                <option value="refund_reversal_missing">{getFinanceReconciliationIssueTypeLabel(locale, "refund_reversal_missing")}</option>
                <option value="stale_pending">{getFinanceReconciliationIssueTypeLabel(locale, "stale_pending")}</option>
                <option value="duplicate_payment_reference">{getFinanceReconciliationIssueTypeLabel(locale, "duplicate_payment_reference")}</option>
                <option value="callback_pending_state">{getFinanceReconciliationIssueTypeLabel(locale, "callback_pending_state")}</option>
                <option value="order_status_conflict">{getFinanceReconciliationIssueTypeLabel(locale, "order_status_conflict")}</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-400">{copy.severity}</span>
              <select name="severity" defaultValue="medium" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                <option value="high">{getFinanceReconciliationIssueSeverityMeta("high", locale).label}</option>
                <option value="medium">{getFinanceReconciliationIssueSeverityMeta("medium", locale).label}</option>
                <option value="low">{getFinanceReconciliationIssueSeverityMeta("low", locale).label}</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-400">{copy.scanScope}</span>
              <select name="scanScope" defaultValue="all" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                <option value="all">{getFinanceReconciliationScopeLabel(locale, "all")}</option>
                <option value="coin-recharge">{getFinanceReconciliationScopeLabel(locale, "coin-recharge")}</option>
                <option value="membership">{getFinanceReconciliationScopeLabel(locale, "membership")}</option>
                <option value="content">{getFinanceReconciliationScopeLabel(locale, "content")}</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-400">{copy.orderRef}</span>
              <input
                name="orderRef"
                placeholder={copy.orderRefPlaceholder}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-400">{copy.paymentReference}</span>
              <input
                name="paymentReference"
                placeholder={copy.paymentReferencePlaceholder}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-slate-400">{copy.summary}</span>
              <input
                name="summary"
                required
                placeholder={copy.summaryPlaceholder}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="text-slate-400">{copy.detail}</span>
              <textarea
                name="detail"
                rows={4}
                placeholder={copy.detailPlaceholder}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </label>
          </div>
          <button type="submit" className="mt-5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15">
            {copy.submit}
          </button>
        </form>
        <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-white">{copy.queueTitle}</p>
            <span className="text-xs text-slate-400">{issues.length}</span>
          </div>
          <form method="get" action="/admin" className="mt-4 rounded-[1rem] border border-white/8 bg-white/[0.02] p-4">
            <input type="hidden" name="tab" value="finance" />
            {financeSection ? <input type="hidden" name="financeSection" value={financeSection} /> : null}
            <p className="text-sm font-medium text-white">{copy.filterTitle}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <label className="space-y-2 text-sm">
                <span className="text-slate-400">{copy.filterScope}</span>
                <select name="financeIssueScope" defaultValue={filters.scope} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                  <option value="all">{copy.all}</option>
                  <option value="coin-recharge">{getFinanceReconciliationScopeLabel(locale, "coin-recharge")}</option>
                  <option value="membership">{getFinanceReconciliationScopeLabel(locale, "membership")}</option>
                  <option value="content">{getFinanceReconciliationScopeLabel(locale, "content")}</option>
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-400">{copy.filterStatus}</span>
                <select name="financeIssueStatus" defaultValue={filters.status} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                  <option value="all">{copy.all}</option>
                  <option value="open">{getFinanceReconciliationIssueStatusMeta("open", locale).label}</option>
                  <option value="reviewing">{getFinanceReconciliationIssueStatusMeta("reviewing", locale).label}</option>
                  <option value="resolved">{getFinanceReconciliationIssueStatusMeta("resolved", locale).label}</option>
                  <option value="ignored">{getFinanceReconciliationIssueStatusMeta("ignored", locale).label}</option>
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-400">{copy.severity}</span>
                <select name="financeIssueSeverity" defaultValue={filters.severity} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                  <option value="all">{copy.all}</option>
                  <option value="high">{getFinanceReconciliationIssueSeverityMeta("high", locale).label}</option>
                  <option value="medium">{getFinanceReconciliationIssueSeverityMeta("medium", locale).label}</option>
                  <option value="low">{getFinanceReconciliationIssueSeverityMeta("low", locale).label}</option>
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-400">{copy.issueType}</span>
                <select name="financeIssueType" defaultValue={filters.issueType} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                  <option value="all">{copy.all}</option>
                  {issueTypeOptions.map((issueType) => (
                    <option key={`finance-issue-type-${issueType}`} value={issueType}>
                      {getFinanceReconciliationIssueTypeLabel(locale, issueType)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-400">{copy.filterQueue}</span>
                <select name="financeIssueQueue" defaultValue={filters.queue} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                  <option value="all">{copy.all}</option>
                  <option value="active">{copy.active}</option>
                  <option value="overdue">{copy.overdue}</option>
                  <option value="unassigned">{copy.unassigned}</option>
                  <option value="closed">{copy.closed}</option>
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-400">{copy.filterSearch}</span>
                <input
                  name="financeIssueQuery"
                  defaultValue={filters.query}
                  placeholder={copy.filterSearchPlaceholder}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="submit" className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15">
                {copy.applyFilters}
              </button>
              <Link
                href={financeSection ? `/admin?tab=finance&financeSection=${financeSection}` : "/admin?tab=finance"}
                className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white"
              >
                {copy.clearFilters}
              </Link>
            </div>
          </form>
          <form action="/api/admin/finance/recharge-orders" method="post" className="mt-4 rounded-[1rem] border border-white/8 bg-white/[0.02] p-4">
            <p className="text-sm font-medium text-white">{copy.batchTitle}</p>
            <p className="mt-2 text-sm text-slate-400">{copy.batchSelectionHint}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
              <label className="space-y-2 text-sm">
                <span className="text-slate-400">{copy.batchSelectPlaceholder}</span>
                <select
                  name="issueIds"
                  multiple
                  size={Math.min(Math.max(issues.length, 4), 10)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                >
                  {issues.map((issue) => (
                    <option key={`finance-batch-issue-${issue.id}`} value={issue.id}>
                      {issue.orderRefLabel ? `${issue.orderRefLabel} / ` : ""}{issue.summary}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-400">{copy.stage}</span>
                <select name="workflowStage" defaultValue="" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                  <option value="">{copy.keepCurrent}</option>
                  <option value="triage">{getFinanceReconciliationWorkflowStageMeta("triage", locale).label}</option>
                  <option value="investigating">{getFinanceReconciliationWorkflowStageMeta("investigating", locale).label}</option>
                  <option value="awaiting-callback">{getFinanceReconciliationWorkflowStageMeta("awaiting-callback", locale).label}</option>
                  <option value="awaiting-finance">{getFinanceReconciliationWorkflowStageMeta("awaiting-finance", locale).label}</option>
                  <option value="closed">{getFinanceReconciliationWorkflowStageMeta("closed", locale).label}</option>
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-400">{copy.assignOwner}</span>
                <input
                  name="assignedToDisplayName"
                  placeholder={copy.assignPlaceholder}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
              </label>
            </div>
            <label className="mt-3 block space-y-2 text-sm">
              <span className="text-slate-400">{copy.detail}</span>
              <textarea
                name="reason"
                rows={3}
                placeholder={copy.notePlaceholder}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="submit" name="intent" value="batch-review-reconciliation-issues" className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/15">
                {copy.batchReview}
              </button>
              <button type="submit" name="intent" value="batch-resolve-reconciliation-issues" className="rounded-full border border-lime-300/20 bg-lime-300/10 px-4 py-2 text-sm text-lime-100 transition hover:bg-lime-300/15">
                {copy.batchResolve}
              </button>
              <button type="submit" name="intent" value="batch-ignore-reconciliation-issues" className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                {copy.batchIgnore}
              </button>
              <button type="submit" name="intent" value="batch-remind-reconciliation-issues" className="rounded-full border border-orange-300/20 bg-orange-300/10 px-4 py-2 text-sm text-orange-100 transition hover:bg-orange-300/15">
                {copy.batchRemind}
              </button>
            </div>
          </form>
          <div className="mt-4 grid gap-4">
            {issues.length > 0 ? (
              issues.map((issue) => {
                const statusMeta = getFinanceReconciliationIssueStatusMeta(issue.status, locale);
                const severityMeta = getFinanceReconciliationIssueSeverityMeta(issue.severity, locale);
                const slaMeta = getFinanceReconciliationIssueSlaMeta(issue, locale);
                const workflowStageMeta = getFinanceReconciliationWorkflowStageMeta(issue.workflowStage, locale);

                return (
                  <div key={issue.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{issue.summary}</p>
                        <p className="mt-2 text-sm text-slate-400">
                          {getFinanceReconciliationScopeLabel(locale, issue.scope)} / {getFinanceReconciliationIssueTypeLabel(locale, issue.issueType)}
                          {issue.orderRefLabel ? ` / ${issue.orderRefLabel}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs ${getExpansionToneClass(statusMeta.tone)}`}>{statusMeta.label}</span>
                        <span className={`rounded-full px-3 py-1 text-xs ${getExpansionToneClass(severityMeta.tone)}`}>{severityMeta.label}</span>
                        <span className={`rounded-full px-3 py-1 text-xs ${getExpansionToneClass(workflowStageMeta.tone)}`}>{workflowStageMeta.label}</span>
                        <span className={`rounded-full px-3 py-1 text-xs ${getExpansionToneClass(slaMeta.tone)}`}>{slaMeta.label}</span>
                      </div>
                    </div>
                    {issue.detail ? <p className="mt-3 text-sm text-slate-300">{issue.detail}</p> : null}
                    {issue.resolutionNote ? <p className="mt-3 text-sm text-lime-100">{issue.resolutionNote}</p> : null}
                    {issue.lastReminderNote ? <p className="mt-3 text-sm text-orange-100">{issue.lastReminderNote}</p> : null}
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                        {copy.createdBy} {issue.createdByDisplayName}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                        {copy.owner} {issue.assignedToDisplayName ?? "--"}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                        {copy.reminders} {issue.reminderCount}
                      </span>
                      {issue.isUnassigned ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                          {copy.unassigned}
                        </span>
                      ) : null}
                      {issue.isOverdue ? (
                        <span className="rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-1 text-rose-100">
                          {copy.overdue}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatDateTime(issue.updatedAt, locale)}</span>
                      {issue.paymentReference ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{issue.paymentReference}</span>
                      ) : null}
                      {issue.subjectTitle ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{issue.subjectTitle}</span>
                      ) : null}
                      {issue.userDisplayName ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{issue.userDisplayName}</span>
                      ) : null}
                      {typeof issue.amount === "number" ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatPrice(issue.amount, locale)}</span>
                      ) : null}
                      {issue.sourceStatus ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{issue.sourceStatus}</span>
                      ) : null}
                      {issue.resolvedAt ? (
                        <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-lime-100">
                          {copy.resolvedAt} {formatDateTime(issue.resolvedAt, locale)}
                        </span>
                      ) : null}
                      {issue.lastRemindedAt ? (
                        <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-orange-100">
                          {copy.lastReminder} {formatDateTime(issue.lastRemindedAt, locale)}
                        </span>
                      ) : null}
                    </div>
                    <form action="/api/admin/finance/recharge-orders" method="post" className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]">
                      <input type="hidden" name="issueId" value={issue.id} />
                      <input
                        name="reason"
                        placeholder={copy.notePlaceholder}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                      />
                      <input
                        name="assignedToDisplayName"
                        defaultValue={issue.assignedToDisplayName ?? ""}
                        placeholder={copy.assignPlaceholder}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                      />
                      <select
                        name="workflowStage"
                        defaultValue={issue.workflowStage}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
                      >
                        <option value="triage">{getFinanceReconciliationWorkflowStageMeta("triage", locale).label}</option>
                        <option value="investigating">{getFinanceReconciliationWorkflowStageMeta("investigating", locale).label}</option>
                        <option value="awaiting-callback">{getFinanceReconciliationWorkflowStageMeta("awaiting-callback", locale).label}</option>
                        <option value="awaiting-finance">{getFinanceReconciliationWorkflowStageMeta("awaiting-finance", locale).label}</option>
                        <option value="closed">{getFinanceReconciliationWorkflowStageMeta("closed", locale).label}</option>
                      </select>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          name="intent"
                          value="assign-reconciliation-issue"
                          className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white"
                        >
                          {copy.assign}
                        </button>
                        <button
                          type="submit"
                          name="intent"
                          value="remind-reconciliation-issue"
                          className="rounded-full border border-orange-300/20 bg-orange-300/10 px-4 py-2 text-sm text-orange-100 transition hover:bg-orange-300/15"
                        >
                          {copy.remind}
                        </button>
                        {issue.status === "open" ? (
                          <button
                            type="submit"
                            name="intent"
                            value="review-reconciliation-issue"
                            className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/15"
                          >
                            {copy.markReviewing}
                          </button>
                        ) : null}
                        {issue.status === "open" || issue.status === "reviewing" ? (
                          <>
                            <button
                              type="submit"
                              name="intent"
                              value="resolve-reconciliation-issue"
                              className="rounded-full border border-lime-300/20 bg-lime-300/10 px-4 py-2 text-sm text-lime-100 transition hover:bg-lime-300/15"
                            >
                              {copy.resolve}
                            </button>
                            <button
                              type="submit"
                              name="intent"
                              value="ignore-reconciliation-issue"
                              className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white"
                            >
                              {copy.ignore}
                            </button>
                          </>
                        ) : null}
                        {issue.status === "resolved" || issue.status === "ignored" ? (
                          <button
                            type="submit"
                            name="intent"
                            value="reopen-reconciliation-issue"
                            className="rounded-full border border-orange-300/20 bg-orange-300/10 px-4 py-2 text-sm text-orange-100 transition hover:bg-orange-300/15"
                          >
                            {copy.reopen}
                          </button>
                        ) : null}
                      </div>
                    </form>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[1.1rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                {copy.empty}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceCoinAccountsPanel({
  title,
  locale,
  accounts,
}: {
  title: string;
  locale: Locale;
  accounts: Array<{
    userId: string;
    userDisplayName: string;
    userEmail: string;
    balance: number;
    lifetimeCredited: number;
    lifetimeDebited: number;
    lastActivityAt?: string;
  }>;
}) {
  const emptyLabel =
    locale === "en"
      ? "No coin accounts yet."
      : locale === "zh-TW"
        ? "目前還沒有球幣帳戶。"
        : "当前还没有球币账户。";

  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <span className="text-sm text-slate-500">{accounts.length}</span>
      </div>
      <div className="mt-5 grid gap-4">
        {accounts.length > 0 ? (
          accounts.map((account) => (
            <div key={account.userId} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{account.userDisplayName}</p>
                  <p className="mt-2 text-sm text-slate-400">{account.userEmail}</p>
                </div>
                <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-sm text-sky-100">
                  {formatAdminCoinAmount(account.balance, locale)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                  {locale === "en"
                    ? `Credited ${formatAdminCoinAmount(account.lifetimeCredited, locale)}`
                    : locale === "zh-TW"
                      ? `累計入帳 ${formatAdminCoinAmount(account.lifetimeCredited, locale)}`
                      : `累计入账 ${formatAdminCoinAmount(account.lifetimeCredited, locale)}`}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                  {locale === "en"
                    ? `Debited ${formatAdminCoinAmount(account.lifetimeDebited, locale)}`
                    : locale === "zh-TW"
                      ? `累計扣減 ${formatAdminCoinAmount(account.lifetimeDebited, locale)}`
                      : `累计扣减 ${formatAdminCoinAmount(account.lifetimeDebited, locale)}`}
                </span>
                {account.lastActivityAt ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                    {locale === "en"
                      ? `Updated ${formatDateTime(account.lastActivityAt, locale)}`
                      : locale === "zh-TW"
                        ? `最近活動 ${formatDateTime(account.lastActivityAt, locale)}`
                        : `最近活动 ${formatDateTime(account.lastActivityAt, locale)}`}
                  </span>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}

function FinanceCoinLedgerPanel({
  title,
  locale,
  entries,
}: {
  title: string;
  locale: Locale;
  entries: Array<{
    id: string;
    userDisplayName: string;
    userEmail: string;
    direction: "credit" | "debit";
    reasonLabel: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    note?: string;
    referenceType?: string;
    referenceId?: string;
    createdAt: string;
  }>;
}) {
  const emptyLabel =
    locale === "en"
      ? "No coin ledger entries yet."
      : locale === "zh-TW"
        ? "目前還沒有球幣流水。"
        : "当前还没有球币流水。";

  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <span className="text-sm text-slate-500">{entries.length}</span>
      </div>
      <div className="mt-5 grid gap-4">
        {entries.length > 0 ? (
          entries.map((entry) => {
            const directionTone =
              entry.direction === "credit"
                ? "border-lime-300/20 bg-lime-300/10 text-lime-100"
                : "border-orange-300/20 bg-orange-300/10 text-orange-100";
            const directionLabel =
              entry.direction === "credit"
                ? locale === "en"
                  ? "Credit"
                  : locale === "zh-TW"
                    ? "加幣"
                    : "加币"
                : locale === "en"
                  ? "Debit"
                  : locale === "zh-TW"
                    ? "扣幣"
                    : "扣币";

            return (
              <div key={entry.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{entry.reasonLabel}</p>
                    <p className="mt-2 text-sm text-slate-400">
                      {entry.userDisplayName} / {entry.userEmail}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs ${directionTone}`}>
                    {directionLabel} {formatAdminCoinAmount(entry.amount, locale)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                    {locale === "en"
                      ? `Before ${formatAdminCoinAmount(entry.balanceBefore, locale)}`
                      : locale === "zh-TW"
                        ? `變動前 ${formatAdminCoinAmount(entry.balanceBefore, locale)}`
                        : `变动前 ${formatAdminCoinAmount(entry.balanceBefore, locale)}`}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                    {locale === "en"
                      ? `After ${formatAdminCoinAmount(entry.balanceAfter, locale)}`
                      : locale === "zh-TW"
                        ? `變動後 ${formatAdminCoinAmount(entry.balanceAfter, locale)}`
                        : `变动后 ${formatAdminCoinAmount(entry.balanceAfter, locale)}`}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                    {formatDateTime(entry.createdAt, locale)}
                  </span>
                  {entry.referenceType ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                      {entry.referenceType}
                    </span>
                  ) : null}
                </div>
                {entry.note ? <p className="mt-3 text-sm text-slate-300">{entry.note}</p> : null}
              </div>
            );
          })
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportsTrendCardsPanel({
  locale,
  reportsWindow,
  trendCards,
  buildWindowHref,
}: {
  locale: Locale;
  reportsWindow: AdminReportsWindow;
  trendCards: Array<{
    key: string;
    title: string;
    description: string;
    value: string;
    tone: "good" | "warn" | "neutral";
    points: Array<{
      label: string;
      value: number;
    }>;
  }>;
  buildWindowHref?: (windowValue: AdminReportsWindow) => string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">{locale === "en" ? "Trend center" : locale === "zh-TW" ? "趨勢中心" : "趋势中心"}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {locale === "en" ? "Long-range business trends" : locale === "zh-TW" ? "長週期業務趨勢" : "长周期业务趋势"}
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            {locale === "en"
              ? "Daily facts now power revenue, coin movement, conversion, and settlement trend cards."
              : locale === "zh-TW"
                ? "報表已按日聚合核心事實，供營收、球幣變動、轉化與結算趨勢共用。"
                : "报表已按日聚合核心事实，供营收、球币变动、转化与结算趋势共用。"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[7, 30, 90, 180, 365].map((windowValue) => {
            const active = reportsWindow === windowValue;

            return (
              <Link
                key={`reports-window-${windowValue}`}
                href={buildWindowHref ? buildWindowHref(windowValue as AdminReportsWindow) : `/admin?tab=reports&reportsWindow=${windowValue}`}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  active
                    ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                    : "border-white/10 text-slate-300 hover:border-white/25 hover:text-white"
                }`}
              >
                {windowValue}
                {locale === "en" ? "D" : " 天"}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-5">
        {trendCards.map((card) => {
          const maxValue = getSimpleTrendMaxValue(card.points);

          return (
            <div key={card.key} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{card.title}</p>
                  <p className="mt-2 text-sm text-slate-400">{card.description}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs ${getExpansionToneClass(card.tone)}`}>{card.value}</span>
              </div>
              <div className="mt-4 flex h-24 items-end gap-1">
                {card.points.map((point, index) => {
                  const height = maxValue > 0 ? Math.max(10, Math.round((point.value / maxValue) * 100)) : 10;

                  return (
                    <div key={`${card.key}-${point.label}-${index}`} className="group relative flex min-w-0 flex-1 justify-center">
                      <div
                        className={`w-full rounded-t-full ${
                          card.tone === "good"
                            ? "bg-lime-300/55"
                            : card.tone === "warn"
                              ? "bg-orange-300/55"
                              : "bg-sky-300/45"
                        }`}
                        style={{ height: `${height}%` }}
                      />
                      <div className="pointer-events-none absolute bottom-full mb-2 hidden rounded-xl border border-white/10 bg-slate-950/95 px-2 py-1 text-[11px] text-white shadow-2xl group-hover:block">
                        {point.label}: {point.value}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex justify-between gap-2 text-[11px] text-slate-500">
                <span>{card.points[0]?.label ?? "--"}</span>
                <span>{card.points[card.points.length - 1]?.label ?? "--"}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
          POST /api/internal/reports/daily-facts
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
          {locale === "en"
            ? "Bearer REPORTS_TRIGGER_TOKEN or SYNC_TRIGGER_TOKEN"
            : locale === "zh-TW"
              ? "Bearer REPORTS_TRIGGER_TOKEN 或 SYNC_TRIGGER_TOKEN"
              : "Bearer REPORTS_TRIGGER_TOKEN 或 SYNC_TRIGGER_TOKEN"}
        </span>
      </div>
    </div>
  );
}

function formatPercentValue(value: number) {
  return `${value.toFixed(1)}%`;
}

function getAgentLevelLabel(level: string, locale: Locale) {
  if (level === "level2") {
    return locale === "en" ? "Level 2" : locale === "zh-TW" ? "二級代理" : "二级代理";
  }

  if (level === "level3") {
    return locale === "en" ? "Level 3" : locale === "zh-TW" ? "三級代理" : "三级代理";
  }

  return locale === "en" ? "Level 1" : locale === "zh-TW" ? "一級代理" : "一级代理";
}

function getAgentStatusMeta(status: string, locale: Locale) {
  if (status === "frozen") {
    return {
      label: locale === "en" ? "Frozen" : locale === "zh-TW" ? "凍結" : "冻结",
      tone: "warn",
    } as const;
  }

  if (status === "inactive") {
    return {
      label: locale === "en" ? "Inactive" : locale === "zh-TW" ? "停用" : "停用",
      tone: "neutral",
    } as const;
  }

  return {
    label: locale === "en" ? "Active" : locale === "zh-TW" ? "正常" : "正常",
    tone: "good",
  } as const;
}

function getApplicationStatusMeta(status: string, locale: Locale) {
  if (status === "approved") {
    return {
      label: locale === "en" ? "Approved" : locale === "zh-TW" ? "已通過" : "已通过",
      tone: "good",
    } as const;
  }

  if (status === "rejected") {
    return {
      label: locale === "en" ? "Rejected" : locale === "zh-TW" ? "已拒絕" : "已拒绝",
      tone: "warn",
    } as const;
  }

  if (status === "needs-material") {
    return {
      label: locale === "en" ? "Need more info" : locale === "zh-TW" ? "補充資料" : "补充资料",
      tone: "neutral",
    } as const;
  }

  return {
    label: locale === "en" ? "Pending" : locale === "zh-TW" ? "待審核" : "待审核",
    tone: "warn",
  } as const;
}

function getLeadStatusMeta(status: string, locale: Locale) {
  if (status === "following") {
    return {
      label: locale === "en" ? "Following" : locale === "zh-TW" ? "跟進中" : "跟进中",
      tone: "warn",
    } as const;
  }

  if (status === "won") {
    return {
      label: locale === "en" ? "Won" : locale === "zh-TW" ? "已成交" : "已成交",
      tone: "good",
    } as const;
  }

  if (status === "invalid") {
    return {
      label: locale === "en" ? "Invalid" : locale === "zh-TW" ? "無效" : "无效",
      tone: "neutral",
    } as const;
  }

  return {
    label: locale === "en" ? "New" : locale === "zh-TW" ? "新線索" : "新线索",
    tone: "good",
  } as const;
}

function getWithdrawalStatusMeta(status: string, locale: Locale) {
  if (status === "settled") {
    return {
      label: locale === "en" ? "Settled" : locale === "zh-TW" ? "已結算" : "已结算",
      tone: "good",
    } as const;
  }

  if (status === "rejected") {
    return {
      label: locale === "en" ? "Rejected" : locale === "zh-TW" ? "已拒絕" : "已拒绝",
      tone: "warn",
    } as const;
  }

  if (status === "paying") {
    return {
      label: locale === "en" ? "Paying" : locale === "zh-TW" ? "打款中" : "打款中",
      tone: "warn",
    } as const;
  }

  if (status === "reviewing") {
    return {
      label: locale === "en" ? "Reviewing" : locale === "zh-TW" ? "審核中" : "审核中",
      tone: "warn",
    } as const;
  }

  if (status === "frozen") {
    return {
      label: locale === "en" ? "Frozen" : locale === "zh-TW" ? "凍結" : "冻结",
      tone: "neutral",
    } as const;
  }

  return {
    label: locale === "en" ? "Pending" : locale === "zh-TW" ? "待結算" : "待结算",
    tone: "neutral",
  } as const;
}

function getExportTaskStatusMeta(status: string, locale: Locale) {
  if (status === "completed") {
    return {
      label: locale === "en" ? "Completed" : locale === "zh-TW" ? "已完成" : "已完成",
      tone: "good",
    } as const;
  }

  if (status === "running") {
    return {
      label: locale === "en" ? "Running" : locale === "zh-TW" ? "執行中" : "执行中",
      tone: "warn",
    } as const;
  }

  if (status === "failed") {
    return {
      label: locale === "en" ? "Failed" : locale === "zh-TW" ? "失敗" : "失败",
      tone: "warn",
    } as const;
  }

  if (status === "expired") {
    return {
      label: locale === "en" ? "Expired" : locale === "zh-TW" ? "已過期" : "已过期",
      tone: "warn",
    } as const;
  }

  return {
    label: locale === "en" ? "Queued" : locale === "zh-TW" ? "排隊中" : "排队中",
    tone: "warn",
  } as const;
}

function getAgentCommissionStatusMeta(status: string, locale: Locale) {
  if (status === "settled") {
    return {
      label: locale === "en" ? "Settled" : locale === "zh-TW" ? "已結算" : "已结算",
      tone: "good",
    } as const;
  }

  if (status === "reversed") {
    return {
      label: locale === "en" ? "Reversed" : locale === "zh-TW" ? "已沖回" : "已冲回",
      tone: "neutral",
    } as const;
  }

  if (status === "partial") {
    return {
      label: locale === "en" ? "Partial" : locale === "zh-TW" ? "部分結算" : "部分结算",
      tone: "warn",
    } as const;
  }

  return {
    label: locale === "en" ? "Pending" : locale === "zh-TW" ? "待結算" : "待结算",
    tone: "warn",
  } as const;
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const displayLocale = await getCurrentDisplayLocale();
  const locale = resolveRenderLocale(displayLocale);
  const { entitlements, session } = await getSessionContext();

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
  const paymentRuntime = await getResolvedPaymentRuntimeConfig();
  const agentPayoutRuntime = getAgentPayoutRuntimeConfig();
  const manualCollection = paymentRuntime.manualCollection;
  const paymentCheckoutFlow = getPaymentCheckoutFlow(paymentRuntime.provider);
  const paymentRuntimeCopy = getPaymentRuntimeCopy(locale, paymentRuntime, paymentCheckoutFlow);
  const { matchStatusLabels, roleLabels } = getSiteCopy(locale);
  const resolved = await searchParams;
  const requestedTab = pickValue(resolved.tab, "overview");
  const editAuthorId = pickValue(resolved.editAuthor, "");
  const editPlanId = pickValue(resolved.editPlan, "");
  const editBannerId = pickValue(resolved.editBanner, "");
  const editSiteAdId = pickValue(resolved.editSiteAd, "");
  const editFeaturedSlotId = pickValue(resolved.editFeaturedSlot, "");
  const editModuleId = pickValue(resolved.editModule, "");
  const editAnnouncementId = pickValue(resolved.editAnnouncement, "");
  const editPushCampaignId = pickValue(resolved.editPushCampaign, "");
  const editLeagueId = pickValue(resolved.editLeague, "");
  const editMatchId = pickValue(resolved.editMatch, "");
  const editPredictionId = pickValue(resolved.editPrediction, "");
  const editKnowledgeId = pickValue(resolved.editKnowledge, "");
  const eventsSport = normalizeAdminSportFilter(pickValue(resolved.eventsSport, "all"));
  const eventsLeagueStatus = normalizeAdminEventsLeagueStatusFilter(
    pickValue(resolved.eventsLeagueStatus, "all"),
  );
  const eventsMatchStatus = normalizeAdminEventsMatchStatusFilter(
    pickValue(resolved.eventsMatchStatus, "all"),
  );
  const eventsMatchVisibility = normalizeAdminEventsMatchVisibilityFilter(
    pickValue(resolved.eventsMatchVisibility ?? resolved.eventsVisibility, "all"),
  );
  const eventsAuditStatus = normalizeAdminEventsAuditStatusFilter(
    pickValue(resolved.eventsAuditStatus, "all"),
  );
  const eventsAuditTargetType = normalizeAdminEventsAuditTargetTypeFilter(
    pickValue(resolved.eventsAuditTargetType, "all"),
  );
  const eventsAuditAction = pickValue(resolved.eventsAuditAction, "all").trim() || "all";
  const eventsAuditQuery = pickValue(resolved.eventsAuditQuery, "").trim();
  const eventsQuery = pickValue(resolved.eventsQuery, "").trim();
  const contentSport = normalizeAdminSportFilter(pickValue(resolved.contentSport, "all"));
  const contentAuthorId = pickValue(resolved.contentAuthorId, "").trim();
  const contentPlanStatus = normalizeAdminPlanStatusFilter(pickValue(resolved.contentPlanStatus, "all"));
  const contentQuery = pickValue(resolved.contentQuery, "").trim();
  const requestedUsersSection = normalizeAdminUsersSection(pickValue(resolved.usersSection, ""));
  const requestedContentSection = normalizeAdminContentSection(pickValue(resolved.contentSection, ""));
  const requestedContentPane = normalizeAdminContentPane(pickValue(resolved.contentPane, ""));
  const requestedFinanceSection = normalizeAdminFinanceSection(pickValue(resolved.financeSection, ""));
  const requestedAgentsSection = normalizeAdminAgentsSection(pickValue(resolved.agentsSection, ""));
  const requestedSystemSection = normalizeAdminSystemSection(pickValue(resolved.systemSection, ""));
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
  const eventsCode = pickValue(resolved.eventsCode, "");
  const seeded = pickValue(resolved.seeded, "");
  const financeProcessed = pickPositiveInt(resolved.financeProcessed, 0);
  const financeFailed = pickPositiveInt(resolved.financeFailed, 0);
  const financeSkipped = pickPositiveInt(resolved.financeSkipped, 0);
  const financeTotal = pickPositiveInt(resolved.financeTotal, 0);
  const financeIssueScope = pickValue(resolved.financeIssueScope, "all").trim();
  const financeIssueStatus = pickValue(resolved.financeIssueStatus, "all").trim();
  const financeIssueSeverity = pickValue(resolved.financeIssueSeverity, "all").trim();
  const financeIssueType = pickValue(resolved.financeIssueType, "all").trim();
  const financeIssueQueue = normalizeAdminFinanceIssueQueueFilter(
    pickValue(resolved.financeIssueQueue, "all").trim(),
  );
  const financeIssueQuery = pickValue(resolved.financeIssueQuery, "").trim();
  const agentProcessed = pickPositiveInt(resolved.agentProcessed, 0);
  const agentFailed = pickPositiveInt(resolved.agentFailed, 0);
  const agentSkipped = pickPositiveInt(resolved.agentSkipped, 0);
  const agentTotal = pickPositiveInt(resolved.agentTotal, 0);
  const agentChanged = pickPositiveInt(resolved.agentChanged, 0);
  const agentPromoted = pickPositiveInt(resolved.agentPromoted, 0);
  const agentDemoted = pickPositiveInt(resolved.agentDemoted, 0);
  const agentCreated = pickPositiveInt(resolved.agentCreated, 0);
  const agentMinimum = pickPositiveInt(resolved.agentMinimum, 0);
  const auditDeletedCount = pickPositiveInt(resolved.auditDeletedCount, 0);
  const auditRetentionDays = pickPositiveInt(resolved.auditRetentionDays, 0);
  const reportTaskId = pickValue(resolved.reportTaskId, "");
  const reportTaskStatus = pickValue(resolved.reportTaskStatus, "");
  const reportScope = pickValue(resolved.reportScope, "");
  const requestedReportsSection = normalizeAdminReportsSection(pickValue(resolved.reportsSection, ""));
  const reportsWindow = normalizeAdminReportsWindow(pickValue(resolved.reportsWindow, "30"));
  const reportsFrom = pickValue(resolved.reportsFrom, "").trim();
  const reportsTo = pickValue(resolved.reportsTo, "").trim();
  const reportsOrderType = pickValue(resolved.reportsOrderType, "all").trim();
  const reportsDimension = pickValue(resolved.reportsDimension, "").trim();
  const orderQuery = pickValue(resolved.q, "");
  const orderStatus = normalizeAdminOrderFilterStatus(pickValue(resolved.orderStatus, "all"));
  const orderType = normalizeAdminOrderFilterType(pickValue(resolved.orderType, "all"));
  const orderFrom = pickValue(resolved.from, "");
  const orderTo = pickValue(resolved.to, "");
  const membershipPage = pickPositiveInt(resolved.membershipPage, 1);
  const contentPage = pickPositiveInt(resolved.contentPage, 1);

  const [footballMatches, basketballMatches, cricketMatches, cricketLeagues, esportsMatches, esportsLeagues, homepageFeaturedPreview, homepageFeaturedSlots, articlePlans, authorTeams, authorApplications, homepageBanners, siteAds, homepageModules, siteAnnouncements, predictionRecords, supportKnowledgeItems, siteArticlePlans, siteAuthorTeams, sitePredictions, usersDashboard, paymentCallbackActivity, recentSyncRuns, syncRotationPlan, assistantHandoffRequests, financeDashboard, agentsDashboard, agentAutomationRuntime, reportsDashboard, exportTasks, systemDashboard, pushDashboard, appVersionInfo, eventsDashboard] = await Promise.all([
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
    getAdminAuthorApplications(),
    getAdminHomepageBanners(),
    getAdminSiteAds(),
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
    getAdminAgentsDashboard(locale),
    getAgentAutomationRuntime(),
    getAdminReportsDashboard(locale, { trendWindowDays: reportsWindow }),
    getRecentAdminExportTasks(),
    getAdminSystemDashboard(locale),
    getAdminPushDashboard(locale),
    getAppVersionInfo(),
    getAdminEventsDashboard({
      sport: eventsSport,
      leagueStatus: eventsLeagueStatus,
      matchStatus: eventsMatchStatus,
      matchVisibility: eventsMatchVisibility,
      query: eventsQuery,
      auditStatus: eventsAuditStatus,
      auditAction: eventsAuditAction,
      auditTargetType: eventsAuditTargetType,
      auditQuery: eventsAuditQuery,
    }),
  ]);

  const matches = [...footballMatches, ...basketballMatches, ...cricketMatches, ...esportsMatches];
  const homepageFeaturedMatches = homepageFeaturedPreview.matches;
  const currentAuthor = authorTeams.find((item) => item.id === editAuthorId);
  const currentPlan = articlePlans.find((item) => item.id === editPlanId);
  const currentBanner = homepageBanners.find((item) => item.id === editBannerId);
  const currentSiteAd = siteAds.find((item) => item.id === editSiteAdId);
  const currentFeaturedSlot = homepageFeaturedSlots.find((item) => item.id === editFeaturedSlotId);
  const currentModule = homepageModules.find((item) => item.id === editModuleId);
  const exportCardMap = new Map(reportsDashboard.exportCards.map((item) => [item.scope, item]));
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
  const currentPushCampaign = pushDashboard.campaigns.find((item) => item.id === editPushCampaignId);
  const scheduledPushCampaignCount = pushDashboard.campaigns.filter((item) => item.status === "scheduled").length;
  const pendingAuthorApplicationCount = authorApplications.filter((item) => item.status === "pending").length;
  const currentLeagueRecord = eventsDashboard.leagues.find((item) => item.id === editLeagueId);
  const currentMatchRecord = eventsDashboard.matches.find((item) => item.id === editMatchId);
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
      titleTh: seed.translations.th.title,
      titleVi: seed.translations.vi.title,
      titleHi: seed.translations.hi.title,
      subtitleZhCn: seed.translations["zh-CN"].subtitle,
      subtitleZhTw: seed.translations["zh-TW"].subtitle,
      subtitleEn: seed.translations.en.subtitle,
      subtitleTh: seed.translations.th.subtitle,
      subtitleVi: seed.translations.vi.subtitle,
      subtitleHi: seed.translations.hi.subtitle,
      descriptionZhCn: seed.translations["zh-CN"].description,
      descriptionZhTw: seed.translations["zh-TW"].description,
      descriptionEn: seed.translations.en.description,
      descriptionTh: seed.translations.th.description,
      descriptionVi: seed.translations.vi.description,
      descriptionHi: seed.translations.hi.description,
      ctaLabelZhCn: seed.translations["zh-CN"].ctaLabel,
      ctaLabelZhTw: seed.translations["zh-TW"].ctaLabel,
      ctaLabelEn: seed.translations.en.ctaLabel,
      ctaLabelTh: seed.translations.th.ctaLabel,
      ctaLabelVi: seed.translations.vi.ctaLabel,
      ctaLabelHi: seed.translations.hi.ctaLabel,
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
  const derivedContentSection =
    requestedContentSection ??
    (editBannerId || editFeaturedSlotId || editModuleId
      ? "homepage"
      : editAuthorId || editPlanId || contentSport !== "all" || !!contentAuthorId || contentPlanStatus !== "all" || !!contentQuery
        ? "library"
        : editAnnouncementId || editSiteAdId
          ? "distribution"
          : editKnowledgeId || knowledgeStatus !== "all" || !!knowledgeCategory || !!knowledgeQuery
            ? "assistant"
            : saved === "banner" || saved === "featured-slot" || saved === "featured-slot-deleted" || saved === "module" || saved === "module-seeded"
              ? "homepage"
              : saved === "author" || saved === "author-application" || !!seeded
                ? "library"
                : saved === "announcement" || saved === "site-ad" || saved === "site-ad-seeded"
                  ? "distribution"
                  : saved === "assistant-knowledge" || saved === "assistant-knowledge-seeded" || error === "assistant-knowledge"
                    ? "assistant"
                    : "overview");
  const contentSection: AdminContentSection = derivedContentSection;
  const isContentOverview = contentSection === "overview";
  const isContentHomepage = contentSection === "homepage";
  const isContentLibrary = contentSection === "library";
  const isContentDistribution = contentSection === "distribution";
  const isContentAssistant = contentSection === "assistant";
  const derivedContentPane: AdminContentPane | undefined =
    contentSection === "homepage"
      ? requestedContentPane === "featured" || requestedContentPane === "banners" || requestedContentPane === "modules"
        ? requestedContentPane
        : editFeaturedSlotId || saved === "featured-slot" || saved === "featured-slot-deleted" || error === "featured-slot"
          ? "featured"
          : editBannerId || saved === "banner" || error === "banner"
            ? "banners"
            : editModuleId || saved === "module" || saved === "module-seeded" || error === "module"
              ? "modules"
              : "featured"
      : contentSection === "library"
        ? requestedContentPane === "authors" || requestedContentPane === "plans"
          ? requestedContentPane
          : editPlanId || saved === "plan" || error === "plan" || contentSport !== "all" || !!contentAuthorId || contentPlanStatus !== "all" || !!contentQuery
            ? "plans"
            : editAuthorId || saved === "author" || saved === "author-application" || error === "author" || error === "author-application"
              ? "authors"
              : "authors"
        : contentSection === "distribution"
          ? requestedContentPane === "announcements" || requestedContentPane === "ads"
            ? requestedContentPane
            : editSiteAdId || saved === "site-ad" || saved === "site-ad-seeded" || error === "site-ad"
              ? "ads"
              : editAnnouncementId || saved === "announcement" || error === "announcement"
                ? "announcements"
                : "announcements"
          : undefined;
  const contentPane = derivedContentPane;
  const isHomepageFeaturedPane = contentSection === "homepage" && contentPane === "featured";
  const isHomepageBannersPane = contentSection === "homepage" && contentPane === "banners";
  const isHomepageModulesPane = contentSection === "homepage" && contentPane === "modules";
  const isLibraryAuthorsPane = contentSection === "library" && contentPane === "authors";
  const isLibraryPlansPane = contentSection === "library" && contentPane === "plans";
  const isDistributionAnnouncementsPane = contentSection === "distribution" && contentPane === "announcements";
  const isDistributionAdsPane = contentSection === "distribution" && contentPane === "ads";
  const contentHomepageBaseHref = buildAdminContentHref({
    contentSection: "homepage",
    contentPane: "featured",
    contentSport,
    contentAuthorId,
    contentPlanStatus,
    contentQuery,
  });
  const systemParameterMap = new Map(systemDashboard.parameters.map((item) => [item.key, item]));
  const auditRetentionParameter = systemParameterMap.get("system.audit.retention_days");
  const auditRetentionDaysValue = Number.parseInt(auditRetentionParameter?.value ?? "180", 10) || 180;

  // AI assistant parameters
  const aiAssistantParams = {
    enabled: systemParameterMap.get("assistant.ai.enabled"),
    model: systemParameterMap.get("assistant.ai.model"),
    baseUrl: systemParameterMap.get("assistant.ai.base_url"),
    apiKey: systemParameterMap.get("assistant.ai.api_key"),
  };
  const aiEnabled = (aiAssistantParams.enabled?.value ?? "false").toLowerCase() !== "false";
  const aiCurrentModel = aiAssistantParams.model?.value ?? "gpt-4.1-mini";

  const curatedAppParameterKeys = [
    "app.version.current",
    "app.version.minimum_supported",
    "app.version.hot_update",
    "app.version.force_update",
    "app.version.update_strategy",
    "app.version.channel",
    "app.version.notes",
    "app.version.download_url",
    "app.web.install_enabled",
    "app.web.fullscreen_enabled",
    "app.web.asset_version",
    "app.push.delivery_mode",
    "app.push.webpush_enabled",
    "app.push.webpush_public_key",
    "app.cdn.asset_prefix",
    "app.cdn.public_asset_host",
    "app.android.package_id",
    "app.android.version_code",
    "app.apk.package_id",
    "app.apk.splash_background",
    "site.timezone_policy",
    "site.timezone_label",
  ];
  const curatedAppParameters = curatedAppParameterKeys
    .map((key) => systemParameterMap.get(key))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
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
              href: `${buildAdminContentHref(
                {
                  contentSection: "homepage",
                  contentPane: "banners",
                  contentSport,
                  contentAuthorId,
                  contentPlanStatus,
                  contentQuery,
                },
              )}#homepage-banner-form`,
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
              href: `${contentHomepageBaseHref}#homepage-featured-slot-form`,
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
  const usersRouteFilters = {
    ...usersTabFilters,
    usersSection: requestedUsersSection ?? "overview",
  };

  const orderExportParams = new URLSearchParams();
  orderExportParams.set("type", usersTabFilters.orderType);
  orderExportParams.set("status", usersTabFilters.orderStatus);
  setOptionalSearchParam(orderExportParams, "q", usersTabFilters.query);
  setOptionalSearchParam(orderExportParams, "from", usersTabFilters.from);
  setOptionalSearchParam(orderExportParams, "to", usersTabFilters.to);

  const usersTabHref = buildAdminUsersHref(usersRouteFilters);
  const orderExportHref = `/api/admin/orders/export?${orderExportParams.toString()}`;
  const currentOrderFilterSummary = buildAdminOrderFilterSummary(usersTabFilters, adminPageCopy, displayLocale);

  const contentNotice = error
    ? adminPageCopy.content.notices.saveFailed
    : seeded
      ? adminPageCopy.content.notices.seeded
      : saved === "site-ad"
        ? locale === "en"
          ? "Site ad workspace was updated."
          : locale === "zh-TW"
            ? "站內廣告位已更新。"
            : "站内广告位已更新。"
      : saved === "site-ad-seeded"
        ? locale === "en"
          ? "Default site ads were initialized."
          : locale === "zh-TW"
            ? "預設站內廣告位已初始化。"
            : "默认站内广告位已初始化。"
      : saved === "author-application"
        ? locale === "en"
          ? "Author application queue was updated."
          : locale === "zh-TW"
            ? "作者申請隊列已更新。"
            : "作者申请队列已更新。"
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
  const eventsNotice =
    saved === "event-league"
      ? locale === "en"
        ? "League changes were saved."
        : locale === "zh-TW"
          ? "聯賽配置已保存。"
          : "联赛配置已保存。"
      : saved === "event-league-status"
        ? locale === "en"
          ? "League status was updated."
          : locale === "zh-TW"
            ? "聯賽狀態已更新。"
            : "联赛状态已更新。"
      : saved === "event-league-featured"
        ? locale === "en"
          ? "League featured flag was updated."
          : locale === "zh-TW"
            ? "聯賽熱門標記已更新。"
            : "联赛热门标记已更新。"
      : saved === "event-league-sort"
        ? locale === "en"
          ? "League sort order was updated."
          : locale === "zh-TW"
            ? "聯賽排序已更新。"
            : "联赛排序已更新。"
      : saved === "event-league-override"
        ? locale === "en"
          ? "League manual override was cleared."
          : locale === "zh-TW"
            ? "聯賽人工覆蓋已清除。"
            : "联赛人工覆盖已清除。"
      : saved === "event-league-delete"
        ? locale === "en"
          ? "League record was deleted."
          : locale === "zh-TW"
            ? "聯賽記錄已刪除。"
            : "联赛记录已删除。"
      : saved === "event-match"
        ? locale === "en"
          ? "Match changes were saved."
          : locale === "zh-TW"
            ? "賽事配置已保存。"
            : "赛事配置已保存。"
      : saved === "event-match-visibility"
        ? locale === "en"
          ? "Match visibility was updated."
          : locale === "zh-TW"
            ? "賽事可見狀態已更新。"
            : "赛事可见状态已更新。"
      : saved === "event-match-override"
        ? locale === "en"
          ? "Match manual override was cleared."
          : locale === "zh-TW"
            ? "賽事人工覆蓋已清除。"
            : "赛事人工覆盖已清除。"
      : saved === "event-match-delete"
        ? locale === "en"
          ? "Match record was deleted."
          : locale === "zh-TW"
            ? "賽事記錄已刪除。"
            : "赛事记录已删除。"
      : error === "event-admin" && eventsCode === "event-delete-confirm"
        ? locale === "en"
          ? "Type DELETE in the confirmation field before removing a record."
          : locale === "zh-TW"
            ? "刪除前請先在確認欄位輸入 DELETE。"
            : "删除前请先在确认栏位输入 DELETE。"
      : error === "event-admin" && eventsCode === "event-league-delete-forbidden"
        ? locale === "en"
          ? "Only manually created leagues can be deleted."
          : locale === "zh-TW"
            ? "只有人工建立的聯賽才可刪除。"
            : "只有人工创建的联赛才可删除。"
      : error === "event-admin" && eventsCode === "event-match-delete-forbidden"
        ? locale === "en"
          ? "Only manually created matches can be deleted."
          : locale === "zh-TW"
            ? "只有人工建立的賽事才可刪除。"
            : "只有人工创建的赛事才可删除。"
      : error === "events" || error === "event-admin"
        ? locale === "en"
          ? "Event workspace update failed."
          : locale === "zh-TW"
            ? "賽事工作台更新失敗。"
            : "赛事工作台更新失败。"
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
      : saved === "batch-coin-adjustment"
        ? locale === "en"
          ? `Batch coin adjustment completed: ${financeProcessed}/${financeTotal} processed, ${financeSkipped} skipped, ${financeFailed} failed.`
          : locale === "zh-TW"
            ? `批量球幣調整已完成：成功 ${financeProcessed}/${financeTotal}，跳過 ${financeSkipped}，失敗 ${financeFailed}。`
            : `批量球币调整已完成：成功 ${financeProcessed}/${financeTotal}，跳过 ${financeSkipped}，失败 ${financeFailed}。`
      : saved === "batch-coin-recharge-order"
        ? locale === "en"
          ? `Batch recharge order handling completed: ${financeProcessed}/${financeTotal} processed, ${financeSkipped} skipped, ${financeFailed} failed.`
          : locale === "zh-TW"
            ? `批量充值單處理已完成：成功 ${financeProcessed}/${financeTotal}，跳過 ${financeSkipped}，失敗 ${financeFailed}。`
            : `批量充值单处理已完成：成功 ${financeProcessed}/${financeTotal}，跳过 ${financeSkipped}，失败 ${financeFailed}。`
      : saved === "finance-reconciliation-scan"
        ? locale === "en"
          ? `Reconciliation scan completed: ${financeProcessed}/${financeTotal} new issues, ${financeSkipped} skipped, ${financeFailed} failed.`
          : locale === "zh-TW"
            ? `對帳掃描已完成：新增 ${financeProcessed}/${financeTotal}，跳過 ${financeSkipped}，失敗 ${financeFailed}。`
            : `对账扫描已完成：新增 ${financeProcessed}/${financeTotal}，跳过 ${financeSkipped}，失败 ${financeFailed}。`
      : saved === "finance-reconciliation-reminder-scan"
        ? locale === "en"
          ? `Reminder scan completed: ${financeProcessed}/${financeTotal} issues reminded, ${financeSkipped} skipped, ${financeFailed} failed.`
          : locale === "zh-TW"
            ? `催辦掃描已完成：催辦 ${financeProcessed}/${financeTotal}，跳過 ${financeSkipped}，失敗 ${financeFailed}。`
            : `催办扫描已完成：催办 ${financeProcessed}/${financeTotal}，跳过 ${financeSkipped}，失败 ${financeFailed}。`
      : saved === "finance-reconciliation-batch"
        ? locale === "en"
          ? `Batch reconciliation actions completed: ${financeProcessed}/${financeTotal} processed, ${financeSkipped} skipped, ${financeFailed} failed.`
          : locale === "zh-TW"
            ? `批量對帳處理已完成：成功 ${financeProcessed}/${financeTotal}，跳過 ${financeSkipped}，失敗 ${financeFailed}。`
            : `批量对账处理已完成：成功 ${financeProcessed}/${financeTotal}，跳过 ${financeSkipped}，失败 ${financeFailed}。`
      : saved === "coin-expiry"
        ? locale === "en"
          ? "Expired recharge cleanup completed."
          : locale === "zh-TW"
            ? "過期充值單清理已完成。"
            : "过期充值单清理已完成。"
      : saved === "coin-adjustment"
        ? locale === "en"
          ? "Coin balance adjustment was saved."
          : locale === "zh-TW"
            ? "球幣餘額調整已保存。"
            : "球币余额调整已保存。"
      : saved === "finance-reconciliation-issue"
        ? locale === "en"
          ? "Reconciliation issue queue was updated."
          : locale === "zh-TW"
            ? "對帳問題隊列已更新。"
            : "对账问题队列已更新。"
      : saved === "coin-recharge-order"
        ? locale === "en"
          ? "Coin recharge order was updated."
          : locale === "zh-TW"
            ? "球幣充值訂單已更新。"
            : "球币充值订单已更新。"
        : error === "coin-adjustment-balance"
          ? locale === "en"
            ? "Coin debit was blocked because the member balance is insufficient."
            : locale === "zh-TW"
              ? "扣減球幣已攔截，會員餘額不足。"
              : "扣减球币已拦截，会员余额不足。"
        : error === "coin-expiry"
          ? locale === "en"
            ? "Expired recharge cleanup failed."
            : locale === "zh-TW"
              ? "過期充值單清理失敗。"
              : "过期充值单清理失败。"
        : error === "coin-recharge-order-balance"
          ? locale === "en"
            ? "Refund was blocked because the member coin balance is insufficient."
            : locale === "zh-TW"
              ? "退款已攔截，會員球幣餘額不足。"
              : "退款已拦截，会员球币余额不足。"
          : error === "batch-coin-adjustment"
            ? locale === "en"
              ? "Batch coin adjustment failed. Check member identifiers, amount, and balance constraints."
              : locale === "zh-TW"
                ? "批量球幣調整失敗，請檢查會員標識、數量與餘額限制。"
                : "批量球币调整失败，请检查会员标识、数量与余额限制。"
        : error === "batch-coin-recharge-order"
            ? locale === "en"
              ? "Batch recharge order handling failed. Check order references and status eligibility."
              : locale === "zh-TW"
                ? "批量充值單處理失敗，請檢查訂單標識與狀態是否符合條件。"
                : "批量充值单处理失败，请检查订单标识与状态是否符合条件。"
          : error === "finance-reconciliation-issue"
            ? locale === "en"
              ? "Reconciliation issue update failed."
              : locale === "zh-TW"
                ? "對帳問題更新失敗。"
                : "对账问题更新失败。"
          : error === "coin-package" || error === "coin-recharge-order" || error === "coin-adjustment"
            ? locale === "en"
              ? "Finance action failed. Please check the form and try again."
              : locale === "zh-TW"
                ? "財務操作失敗，請檢查表單後重試。"
                : "财务操作失败，请检查表单后重试。"
            : null;
  const agentsNotice =
    saved === "agents"
      ? locale === "en"
        ? "Agent and recruitment data was updated."
        : locale === "zh-TW"
          ? "代理與招商資料已更新。"
          : "代理与招商资料已更新。"
      : saved === "agents-automation-policy"
        ? locale === "en"
          ? `Commission policy sync completed: ${agentChanged}/${agentProcessed} profiles updated.`
          : locale === "zh-TW"
            ? `佣金策略同步已完成：更新 ${agentChanged}/${agentProcessed} 個代理檔案。`
            : `佣金策略同步已完成：更新 ${agentChanged}/${agentProcessed} 个代理档案。`
      : saved === "agents-level-sync"
        ? locale === "en"
          ? `Level sync completed: ${agentChanged}/${agentProcessed} changed, ${agentPromoted} promoted, ${agentDemoted} demoted.`
          : locale === "zh-TW"
            ? `等級同步已完成：變更 ${agentChanged}/${agentProcessed}，升級 ${agentPromoted}，降級 ${agentDemoted}。`
            : `等级同步已完成：变更 ${agentChanged}/${agentProcessed}，升级 ${agentPromoted}，降级 ${agentDemoted}。`
      : saved === "agents-weekly-settlement"
        ? locale === "en"
          ? `Weekly settlement completed: ${agentCreated} requests created from ${agentProcessed} eligible agents, ${agentSkipped} skipped, threshold ${agentMinimum}.`
          : locale === "zh-TW"
            ? `週結算已完成：符合條件代理 ${agentProcessed}，建立 ${agentCreated} 筆申請，跳過 ${agentSkipped}，門檻 ${agentMinimum}。`
            : `周结算已完成：符合条件代理 ${agentProcessed}，建立 ${agentCreated} 笔申请，跳过 ${agentSkipped}，门槛 ${agentMinimum}。`
      : saved === "agents-withdrawal-batch"
        ? locale === "en"
          ? `Batch withdrawal processing completed: ${agentProcessed}/${agentTotal} processed, ${agentSkipped} skipped, ${agentFailed} failed.`
          : locale === "zh-TW"
            ? `批量提現處理已完成：成功 ${agentProcessed}/${agentTotal}，跳過 ${agentSkipped}，失敗 ${agentFailed}。`
            : `批量提现处理已完成：成功 ${agentProcessed}/${agentTotal}，跳过 ${agentSkipped}，失败 ${agentFailed}。`
      : error === "agents-withdrawal-balance"
        ? locale === "en"
          ? "Withdrawal settlement was blocked because the agent does not have enough available commission."
          : locale === "zh-TW"
            ? "提現結算已攔截，代理可結算佣金不足。"
            : "提现结算已拦截，代理可结算佣金不足。"
        : error === "agents-withdrawal-locked"
          ? locale === "en"
            ? "Settled withdrawals are locked and cannot be reverted from the admin form."
            : locale === "zh-TW"
              ? "已結算提現已鎖定，暫不支持在後台表單中回退。"
              : "已结算提现已锁定，暂不支持在后台表单中回退。"
      : error === "agents-withdrawal-batch"
        ? locale === "en"
          ? "Batch withdrawal processing failed. Check withdrawal IDs, status eligibility, and commission availability."
          : locale === "zh-TW"
            ? "批量提現處理失敗，請檢查提現 ID、狀態條件與佣金可用額度。"
            : "批量提现处理失败，请检查提现 ID、状态条件与佣金可用额度。"
      : error === "agents"
        ? locale === "en"
          ? "Agent action failed. Please check the form and try again."
          : locale === "zh-TW"
            ? "代理操作失敗，請檢查表單後重試。"
            : "代理操作失败，请检查表单后重试。"
        : null;
  const systemNotice =
    saved === "system"
      ? locale === "en"
        ? "System configuration was updated."
        : locale === "zh-TW"
          ? "系統配置已更新。"
          : "系统配置已更新。"
      : saved === "push-campaign"
        ? locale === "en"
          ? "Push campaign draft was saved."
          : locale === "zh-TW"
            ? "推送活動草稿已保存。"
            : "推送活动草稿已保存。"
      : saved === "push-campaign-sent"
        ? locale === "en"
          ? "Push campaign was sent to the current audience."
          : locale === "zh-TW"
            ? "推送活動已發送到當前受眾。"
            : "推送活动已发送到当前受众。"
      : saved === "push-campaign-cancelled"
        ? locale === "en"
          ? "Push campaign was cancelled."
          : locale === "zh-TW"
            ? "推送活動已取消。"
            : "推送活动已取消。"
      : saved === "push-campaign-dispatched"
        ? locale === "en"
          ? `Scheduled push dispatch completed: ${pickPositiveInt(resolved.pushCampaignDispatched, 0)} sent, ${pickPositiveInt(resolved.pushCampaignFailed, 0)} failed.`
          : locale === "zh-TW"
            ? `定時推送派發已完成：成功 ${pickPositiveInt(resolved.pushCampaignDispatched, 0)} 條，失敗 ${pickPositiveInt(resolved.pushCampaignFailed, 0)} 條。`
            : `定时推送派发已完成：成功 ${pickPositiveInt(resolved.pushCampaignDispatched, 0)} 条，失败 ${pickPositiveInt(resolved.pushCampaignFailed, 0)} 条。`
      : saved === "audit-pruned"
        ? locale === "en"
          ? `Audit retention cleanup completed: ${auditDeletedCount} logs deleted, window ${auditRetentionDays || 180} days.`
          : locale === "zh-TW"
            ? `審計日誌清理已完成：刪除 ${auditDeletedCount} 條，保留視窗 ${auditRetentionDays || 180} 天。`
            : `审计日志清理已完成：删除 ${auditDeletedCount} 条，保留窗口 ${auditRetentionDays || 180} 天。`
      : error === "system"
        ? locale === "en"
          ? "System action failed. Please check the form and try again."
          : locale === "zh-TW"
            ? "系統操作失敗，請檢查表單後重試。"
          : "系统操作失败，请检查表单后重试。"
        : null;
  const reportNotice =
    saved === "report-export-task"
      ? reportTaskStatus === "completed"
        ? locale === "en"
          ? `Export task completed for ${reportScope || "report"}.`
          : locale === "zh-TW"
            ? `${reportScope || "報表"} 匯出任務已完成。`
            : `${reportScope || "报表"} 导出任务已完成。`
        : reportTaskStatus === "failed"
          ? locale === "en"
            ? `Export task failed for ${reportScope || "report"}.`
            : locale === "zh-TW"
              ? `${reportScope || "報表"} 匯出任務失敗。`
              : `${reportScope || "报表"} 导出任务失败。`
          : locale === "en"
            ? `Export task created for ${reportScope || "report"}.`
            : locale === "zh-TW"
              ? `${reportScope || "報表"} 匯出任務已建立。`
              : `${reportScope || "报表"} 导出任务已建立。`
      : error === "report-export-task"
        ? locale === "en"
          ? `Failed to create export task for ${reportScope || "report"}.`
          : locale === "zh-TW"
            ? `${reportScope || "報表"} 匯出任務建立失敗。`
            : `${reportScope || "报表"} 导出任务创建失败。`
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
  const filteredFinanceReconciliationIssues = financeDashboard.reconciliationIssues.filter((issue) => {
    if (financeIssueScope !== "all" && issue.scope !== financeIssueScope) {
      return false;
    }

    if (financeIssueStatus !== "all" && issue.status !== financeIssueStatus) {
      return false;
    }

    if (financeIssueSeverity !== "all" && issue.severity !== financeIssueSeverity) {
      return false;
    }

    if (financeIssueType !== "all" && issue.issueType !== financeIssueType) {
      return false;
    }

    if (financeIssueQueue === "overdue" && !issue.isOverdue) {
      return false;
    }

    if (financeIssueQueue === "unassigned" && !issue.isUnassigned) {
      return false;
    }

    if (financeIssueQueue === "active" && issue.status !== "open" && issue.status !== "reviewing") {
      return false;
    }

    if (financeIssueQueue === "closed" && issue.status !== "resolved" && issue.status !== "ignored") {
      return false;
    }

    if (!financeIssueQuery) {
      return true;
    }

    const haystack = [
      issue.scope,
      issue.summary,
      issue.detail ?? "",
      issue.paymentReference ?? "",
      issue.rechargeOrderNo ?? "",
      issue.orderRefLabel ?? "",
      issue.subjectTitle ?? "",
      issue.userDisplayName ?? "",
      issue.userEmail ?? "",
      issue.assignedToDisplayName ?? "",
      issue.createdByDisplayName,
      issue.reasonCode ?? "",
      issue.sourceStatus ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(financeIssueQuery.toLowerCase());
  });
  const financeIssueTypeOptions = Array.from(
    new Set(financeDashboard.reconciliationIssues.map((issue) => issue.issueType)),
  ).sort((left, right) => left.localeCompare(right));
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
  const contentRouteState = {
    contentSection,
    contentPane,
    contentSport,
    contentAuthorId,
    contentPlanStatus,
    contentQuery,
  };
  const contentKnowledgeRouteState = {
    ...contentRouteState,
    knowledgeStatus,
    knowledgeCategory,
    knowledgeQuery,
  };
  const usersSection = requestedUsersSection ?? "overview";
  const financeSection = requestedFinanceSection ?? "overview";
  const agentsSection = requestedAgentsSection ?? "overview";
  const systemSection = requestedSystemSection ?? "overview";
  const reportsSection = requestedReportsSection ?? "overview";
  const usersRouteState = {
    ...usersDashboard.appliedFilters,
    usersSection,
  };
  const financeRouteState = {
    financeSection,
    financeIssueScope,
    financeIssueStatus,
    financeIssueSeverity,
    financeIssueType,
    financeIssueQueue,
    financeIssueQuery,
  };
  const agentsRouteState = {
    agentsSection,
  };
  const systemRouteState = {
    systemSection,
  };
  const reportsRouteState = {
    reportsSection,
    reportsWindow,
    reportsFrom,
    reportsTo,
    reportsOrderType,
    reportsDimension,
  };
  const showUsersOverview = usersSection === "overview";
  const showUsersWorkspace = usersSection === "overview" || usersSection === "workspace";
  const showUsersMembershipOrders = usersSection === "overview" || usersSection === "membership-orders";
  const showUsersContentOrders = usersSection === "overview" || usersSection === "content-orders";
  const showUsersPayments = usersSection === "overview" || usersSection === "payments";
  const showUserFilters = usersSection !== "overview" && usersSection !== "payments" ? true : showUsersOverview;
  const showFinanceRecharge = financeSection === "overview" || financeSection === "recharge";
  const showFinanceReconciliation = financeSection === "overview" || financeSection === "reconciliation";
  const showFinanceWallets = financeSection === "overview" || financeSection === "wallets";
  const showAgentsOverview = agentsSection === "overview";
  const showAgentsAutomation = agentsSection === "overview" || agentsSection === "automation";
  const showAgentsNetwork = agentsSection === "overview" || agentsSection === "network";
  const showAgentsWithdrawals = agentsSection === "overview" || agentsSection === "withdrawals";
  const showSystemOverview = systemSection === "overview";
  const showSystemSecurity = systemSection === "overview" || systemSection === "security";
  const showSystemNotifications = systemSection === "overview" || systemSection === "notifications";
  const showSystemRuntime = systemSection === "overview" || systemSection === "runtime";
  const showReportsOverview = reportsSection === "overview";
  const showReportsTrends = reportsSection === "overview" || reportsSection === "trends";
  const showReportsBreakdowns = reportsSection === "overview" || reportsSection === "breakdowns";
  const showReportsExports = reportsSection === "overview" || reportsSection === "exports";
  const contentSectionItems: Array<{
    key: AdminContentSection;
    label: string;
    description: string;
    count: string;
    href: string;
  }> = [
    {
      key: "overview",
      label: locale === "en" ? "Overview" : locale === "zh-TW" ? "總覽" : "总览",
      description:
        locale === "en"
          ? "Review homepage readiness, featured previews, and release checks in one place."
          : locale === "zh-TW"
            ? "集中查看首頁 readiness、焦點賽事預覽與發布前檢查。"
            : "集中查看首页 readiness、焦点赛事预览与发布前检查。",
      count:
        locale === "en"
          ? `${homepageReadinessIssueCount} issues`
          : locale === "zh-TW"
            ? `${homepageReadinessIssueCount} 項待處理`
            : `${homepageReadinessIssueCount} 项待处理`,
      href: buildAdminContentHref(contentRouteState, { contentSection: "overview" }),
    },
    {
      key: "homepage",
      label: locale === "en" ? "Homepage Ops" : locale === "zh-TW" ? "首頁運營" : "首页运营",
      description:
        locale === "en"
          ? "Manage banners, featured matches, and homepage modules without mixing in content library work."
          : locale === "zh-TW"
            ? "集中管理 Banner、焦點賽事與首頁模組，不再和內容庫操作混在一起。"
            : "集中管理 Banner、焦点赛事与首页模块，不再和内容库操作混在一起。",
      count: new Intl.NumberFormat(getIntlLocale(displayLocale)).format(
        homepageBanners.length + homepageFeaturedSlots.length + homepageModules.length,
      ),
      href: buildAdminContentHref(contentRouteState, { contentSection: "homepage" }),
    },
    {
      key: "library",
      label: locale === "en" ? "Library" : locale === "zh-TW" ? "內容庫" : "内容库",
      description:
        locale === "en"
          ? "Maintain authors, application review, and paid plan content in one editorial lane."
          : locale === "zh-TW"
            ? "把作者、投稿審核和付費計畫單維護收進同一條內容工作流。"
            : "把作者、投稿审核和付费计划单维护收进同一条内容工作流。",
      count: new Intl.NumberFormat(getIntlLocale(displayLocale)).format(
        authorTeams.length + authorApplications.length + articlePlans.length,
      ),
      href: buildAdminContentHref(contentRouteState, { contentSection: "library" }),
    },
    {
      key: "distribution",
      label: locale === "en" ? "Distribution" : locale === "zh-TW" ? "分發觸點" : "分发触点",
      description:
        locale === "en"
          ? "Configure site announcements and page ad placements for real traffic entry points."
          : locale === "zh-TW"
            ? "配置站內公告與頁面廣告位，統一管理站內分發觸點。"
            : "配置站内公告与页面广告位，统一管理站内分发触点。",
      count: new Intl.NumberFormat(getIntlLocale(displayLocale)).format(
        siteAnnouncements.length + siteAds.length,
      ),
      href: buildAdminContentHref(contentRouteState, { contentSection: "distribution" }),
    },
    {
      key: "assistant",
      label: locale === "en" ? "AI Knowledge" : locale === "zh-TW" ? "AI 知識庫" : "AI 知识库",
      description:
        locale === "en"
          ? "Maintain assistant FAQs, routing links, and reusable service answers."
          : locale === "zh-TW"
            ? "維護 AI 助手常見問答、路由入口與可複用客服回覆。"
            : "维护 AI 助手常见问答、路由入口与可复用客服回复。",
      count: new Intl.NumberFormat(getIntlLocale(displayLocale)).format(supportKnowledgeItems.length),
      href: buildAdminContentHref(contentKnowledgeRouteState, { contentSection: "assistant" }),
    },
  ];
  const activeContentSectionItem =
    contentSectionItems.find((item) => item.key === contentSection) ?? contentSectionItems[0];
  const adminCountFormatter = new Intl.NumberFormat(getIntlLocale(displayLocale));
  const usersPaneItems: Array<{
    key: AdminUsersSection;
    label: string;
    count: string;
    href: string;
  }> = [
    {
      key: "overview",
      label: locale === "en" ? "Overview" : locale === "zh-TW" ? "總覽" : "总览",
      count: adminCountFormatter.format(
        usersDashboard.users.length +
          (usersDashboard.membershipPagination?.total ?? usersDashboard.membershipOrders.length) +
          (usersDashboard.contentPagination?.total ?? usersDashboard.contentOrders.length),
      ),
      href: buildAdminUsersHref(usersRouteFilters, { usersSection: "overview" }),
    },
    {
      key: "workspace",
      label: locale === "en" ? "Users" : locale === "zh-TW" ? "用戶工作台" : "用户工作台",
      count: adminCountFormatter.format(usersDashboard.users.length),
      href: buildAdminUsersHref(usersRouteFilters, { usersSection: "workspace" }),
    },
    {
      key: "membership-orders",
      label: locale === "en" ? "Membership" : locale === "zh-TW" ? "會員訂單" : "会员订单",
      count: adminCountFormatter.format(
        usersDashboard.membershipPagination?.total ?? usersDashboard.membershipOrders.length,
      ),
      href: buildAdminUsersHref(usersRouteFilters, { usersSection: "membership-orders" }),
    },
    {
      key: "content-orders",
      label: locale === "en" ? "Content" : locale === "zh-TW" ? "內容訂單" : "内容订单",
      count: adminCountFormatter.format(
        usersDashboard.contentPagination?.total ?? usersDashboard.contentOrders.length,
      ),
      href: buildAdminUsersHref(usersRouteFilters, { usersSection: "content-orders" }),
    },
    {
      key: "payments",
      label: locale === "en" ? "Payment Ops" : locale === "zh-TW" ? "支付運營" : "支付运营",
      count: adminCountFormatter.format(paymentCallbackActivity.metrics.eventCount),
      href: buildAdminUsersHref(usersRouteFilters, { usersSection: "payments" }),
    },
  ];
  const financePaneItems: Array<{
    key: AdminFinanceSection;
    label: string;
    count: string;
    href: string;
  }> = [
    {
      key: "overview",
      label: locale === "en" ? "Overview" : locale === "zh-TW" ? "總覽" : "总览",
      count: adminCountFormatter.format(
        financeDashboard.coinPackages.length +
          financeDashboard.rechargeOrders.length +
          filteredFinanceReconciliationIssues.length +
          financeDashboard.coinAccounts.length,
      ),
      href: buildAdminFinanceHref(financeRouteState, { financeSection: "overview" }),
    },
    {
      key: "recharge",
      label: locale === "en" ? "Recharge Ops" : locale === "zh-TW" ? "充值運營" : "充值运营",
      count: adminCountFormatter.format(
        financeDashboard.coinPackages.length + financeDashboard.rechargeOrders.length,
      ),
      href: buildAdminFinanceHref(financeRouteState, { financeSection: "recharge" }),
    },
    {
      key: "reconciliation",
      label: locale === "en" ? "Reconciliation" : locale === "zh-TW" ? "對帳中心" : "对账中心",
      count: adminCountFormatter.format(filteredFinanceReconciliationIssues.length),
      href: buildAdminFinanceHref(financeRouteState, { financeSection: "reconciliation" }),
    },
    {
      key: "wallets",
      label: locale === "en" ? "Wallets" : locale === "zh-TW" ? "帳戶流水" : "账户流水",
      count: adminCountFormatter.format(
        financeDashboard.coinAccounts.length + financeDashboard.recentLedgers.length,
      ),
      href: buildAdminFinanceHref(financeRouteState, { financeSection: "wallets" }),
    },
  ];
  const agentsPaneItems: Array<{
    key: AdminAgentsSection;
    label: string;
    count: string;
    href: string;
  }> = [
    {
      key: "overview",
      label: locale === "en" ? "Overview" : locale === "zh-TW" ? "總覽" : "总览",
      count: adminCountFormatter.format(
        agentsDashboard.agents.length + agentsDashboard.withdrawals.length + agentsDashboard.applications.length,
      ),
      href: buildAdminAgentsHref(agentsRouteState, { agentsSection: "overview" }),
    },
    {
      key: "automation",
      label: locale === "en" ? "Automation" : locale === "zh-TW" ? "自動化" : "自动化",
      count: adminCountFormatter.format(agentAutomationRuntime.policies.length),
      href: buildAdminAgentsHref(agentsRouteState, { agentsSection: "automation" }),
    },
    {
      key: "network",
      label: locale === "en" ? "Recruiting" : locale === "zh-TW" ? "招商與代理" : "招商与代理",
      count: adminCountFormatter.format(
        agentsDashboard.applications.length +
          agentsDashboard.leads.length +
          agentsDashboard.campaigns.length +
          agentsDashboard.agents.length,
      ),
      href: buildAdminAgentsHref(agentsRouteState, { agentsSection: "network" }),
    },
    {
      key: "withdrawals",
      label: locale === "en" ? "Withdrawals" : locale === "zh-TW" ? "提現結算" : "提现结算",
      count: adminCountFormatter.format(
        agentsDashboard.withdrawals.length + agentsDashboard.withdrawalExceptions.length,
      ),
      href: buildAdminAgentsHref(agentsRouteState, { agentsSection: "withdrawals" }),
    },
  ];
  const systemPaneItems: Array<{
    key: AdminSystemSection;
    label: string;
    count: string;
    href: string;
  }> = [
    {
      key: "overview",
      label: locale === "en" ? "Overview" : locale === "zh-TW" ? "總覽" : "总览",
      count: adminCountFormatter.format(
        systemDashboard.policies.length +
          systemDashboard.auditLogs.length +
          systemDashboard.alertEvents.length +
          systemDashboard.parameters.length,
      ),
      href: buildAdminSystemHref(systemRouteState, { systemSection: "overview" }),
    },
    {
      key: "security",
      label: locale === "en" ? "Security" : locale === "zh-TW" ? "安全與審計" : "安全与审计",
      count: adminCountFormatter.format(systemDashboard.policies.length + systemDashboard.auditLogs.length),
      href: buildAdminSystemHref(systemRouteState, { systemSection: "security" }),
    },
    {
      key: "notifications",
      label: locale === "en" ? "Notifications" : locale === "zh-TW" ? "通知告警" : "通知告警",
      count: adminCountFormatter.format(
        systemDashboard.alertEvents.length + pushDashboard.campaigns.length,
      ),
      href: buildAdminSystemHref(systemRouteState, { systemSection: "notifications" }),
    },
    {
      key: "runtime",
      label: locale === "en" ? "Runtime" : locale === "zh-TW" ? "運行配置" : "运行配置",
      count: adminCountFormatter.format(systemDashboard.parameters.length),
      href: buildAdminSystemHref(systemRouteState, { systemSection: "runtime" }),
    },
  ];
  const reportsPaneItems: Array<{
    key: AdminReportsSection;
    label: string;
    count: string;
    href: string;
  }> = [
    {
      key: "overview",
      label: locale === "en" ? "Overview" : locale === "zh-TW" ? "總覽" : "总览",
      count: adminCountFormatter.format(
        reportsDashboard.metrics.length +
          reportsDashboard.trendCards.length +
          reportsDashboard.breakdownSections.length +
          reportsDashboard.exportCards.length,
      ),
      href: buildAdminReportsHref(reportsRouteState, { reportsSection: "overview" }),
    },
    {
      key: "trends",
      label: locale === "en" ? "Trends" : locale === "zh-TW" ? "趨勢" : "趋势",
      count: adminCountFormatter.format(
        reportsDashboard.trendCards.length + reportsDashboard.longRangeRows.length,
      ),
      href: buildAdminReportsHref(reportsRouteState, { reportsSection: "trends" }),
    },
    {
      key: "breakdowns",
      label: locale === "en" ? "Breakdowns" : locale === "zh-TW" ? "拆分分析" : "拆分分析",
      count: adminCountFormatter.format(
        reportsDashboard.breakdownSections.length +
          reportsDashboard.revenueRows.length +
          reportsDashboard.growthRows.length +
          reportsDashboard.agentBiRows.length,
      ),
      href: buildAdminReportsHref(reportsRouteState, { reportsSection: "breakdowns" }),
    },
    {
      key: "exports",
      label: locale === "en" ? "Exports" : locale === "zh-TW" ? "匯出中心" : "导出中心",
      count: adminCountFormatter.format(reportsDashboard.exportCards.length + exportTasks.length),
      href: buildAdminReportsHref(reportsRouteState, { reportsSection: "exports" }),
    },
  ];
  const homepagePaneItems: Array<{
    key: Extract<AdminContentPane, "featured" | "banners" | "modules">;
    label: string;
    count: string;
    href: string;
  }> = [
    {
      key: "featured",
      label: locale === "en" ? "Featured Matches" : locale === "zh-TW" ? "焦點賽事" : "焦点赛事",
      count: new Intl.NumberFormat(getIntlLocale(displayLocale)).format(homepageFeaturedSlots.length),
      href: buildAdminContentHref(contentRouteState, { contentSection: "homepage", contentPane: "featured" }),
    },
    {
      key: "banners",
      label: locale === "en" ? "Hero Banners" : locale === "zh-TW" ? "Hero Banner" : "Hero Banner",
      count: new Intl.NumberFormat(getIntlLocale(displayLocale)).format(homepageBanners.length),
      href: buildAdminContentHref(contentRouteState, { contentSection: "homepage", contentPane: "banners" }),
    },
    {
      key: "modules",
      label: locale === "en" ? "Modules" : locale === "zh-TW" ? "首頁模組" : "首页模块",
      count: new Intl.NumberFormat(getIntlLocale(displayLocale)).format(homepageModules.length),
      href: buildAdminContentHref(contentRouteState, { contentSection: "homepage", contentPane: "modules" }),
    },
  ];
  const libraryPaneItems: Array<{
    key: Extract<AdminContentPane, "authors" | "plans">;
    label: string;
    count: string;
    href: string;
  }> = [
    {
      key: "authors",
      label: locale === "en" ? "Authors & Review" : locale === "zh-TW" ? "作者與審核" : "作者与审核",
      count: new Intl.NumberFormat(getIntlLocale(displayLocale)).format(authorTeams.length + authorApplications.length),
      href: buildAdminContentHref(contentRouteState, { contentSection: "library", contentPane: "authors" }),
    },
    {
      key: "plans",
      label: locale === "en" ? "Plans" : locale === "zh-TW" ? "計畫單" : "计划单",
      count: new Intl.NumberFormat(getIntlLocale(displayLocale)).format(filteredArticlePlans.length),
      href: buildAdminContentHref(contentRouteState, { contentSection: "library", contentPane: "plans" }),
    },
  ];
  const distributionPaneItems: Array<{
    key: Extract<AdminContentPane, "announcements" | "ads">;
    label: string;
    count: string;
    href: string;
  }> = [
    {
      key: "announcements",
      label: locale === "en" ? "Announcements" : locale === "zh-TW" ? "站內公告" : "站内公告",
      count: new Intl.NumberFormat(getIntlLocale(displayLocale)).format(siteAnnouncements.length),
      href: buildAdminContentHref(contentRouteState, { contentSection: "distribution", contentPane: "announcements" }),
    },
    {
      key: "ads",
      label: locale === "en" ? "Ad Placements" : locale === "zh-TW" ? "廣告位" : "广告位",
      count: new Intl.NumberFormat(getIntlLocale(displayLocale)).format(siteAds.length),
      href: buildAdminContentHref(contentRouteState, { contentSection: "distribution", contentPane: "ads" }),
    },
  ];

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
  const availableAdminTabs = adminPageCopy.tabs.filter((item) => {
    if (item.value === "content" || item.value === "events" || item.value === "ai") {
      return entitlements.canManageContent;
    }

    if (item.value === "finance") {
      return entitlements.canManageFinance;
    }

    if (item.value === "agents") {
      return entitlements.canManageAgents;
    }

    if (item.value === "system") {
      return entitlements.canManageSystem;
    }

    if (item.value === "reports") {
      return entitlements.canViewReports;
    }

    if (item.value === "users") {
      return entitlements.canManageFinance || entitlements.canManageContent || entitlements.canManageAgents || entitlements.canManageSystem || entitlements.canViewReports;
    }

    return true;
  });
  const tab = availableAdminTabs.some((item) => item.value === requestedTab)
    ? requestedTab
    : (availableAdminTabs[0]?.value ?? "overview");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6">
        <SectionHeading
          eyebrow={adminPageCopy.hero.eyebrow}
          title={adminPageCopy.hero.title}
          description={adminPageCopy.hero.description}
        />

        <div className="mt-6 flex flex-wrap gap-2">
          {availableAdminTabs.map((item) => (
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
          {eventsNotice ? (
            <div
              className={`mt-6 rounded-[1.2rem] border px-4 py-3 text-sm ${
                error === "events"
                  ? "border-rose-300/25 bg-rose-400/10 text-rose-100"
                  : "border-lime-300/20 bg-lime-300/10 text-lime-100"
              }`}
            >
              {eventsNotice}
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
          <AdminEventsPanel
            locale={locale}
            displayLocale={displayLocale}
            dashboard={eventsDashboard}
            sportFilter={eventsSport}
            leagueStatusFilter={eventsLeagueStatus}
            matchStatusFilter={eventsMatchStatus}
            matchVisibilityFilter={eventsMatchVisibility}
            auditStatusFilter={eventsAuditStatus}
            auditActionFilter={eventsAuditAction}
            auditTargetTypeFilter={eventsAuditTargetType}
            auditQueryFilter={eventsAuditQuery}
            query={eventsQuery}
            currentLeague={currentLeagueRecord}
            currentMatch={currentMatchRecord}
          />
        </section>
      ) : null}

      {tab === "content" ? (
        <section className="glass-panel rounded-[2rem] p-6">
          <SectionHeading eyebrow={adminPageCopy.content.eyebrow} title={adminPageCopy.content.title} />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <form action="/api/admin/content/bootstrap" method="post">
              <AdminHiddenFields values={contentRouteState} />
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
                <p className="section-label">
                  {locale === "en" ? "Content workflow" : locale === "zh-TW" ? "內容工作流" : "内容工作流"}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {locale === "en"
                    ? "Split homepage ops, library, distribution, and assistant work into shorter lanes."
                    : locale === "zh-TW"
                      ? "把首頁運營、內容庫、分發與 AI 助手拆成更短的工作區。"
                      : "把首页运营、内容库、分发与 AI 助手拆成更短的工作区。"}
                </h3>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">{activeContentSectionItem.description}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1.5 text-orange-100">
                  {activeContentSectionItem.label}
                </span>
                <span className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1.5 text-slate-200">
                  {activeContentSectionItem.count}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {contentSectionItems.map((item) => {
                const isActive = item.key === contentSection;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`rounded-[1.2rem] border p-4 transition ${
                      isActive
                        ? "border-orange-300/30 bg-orange-300/10 shadow-[0_0_0_1px_rgba(251,146,60,0.18)]"
                        : "border-white/8 bg-slate-950/35 hover:border-white/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-sm font-semibold ${isActive ? "text-white" : "text-slate-100"}`}>
                        {item.label}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] ${
                          isActive ? "bg-orange-300/18 text-orange-100" : "bg-white/8 text-slate-300"
                        }`}
                      >
                        {item.count}
                      </span>
                    </div>
                    <p className={`mt-3 text-sm leading-6 ${isActive ? "text-orange-50/90" : "text-slate-400"}`}>
                      {item.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className={isContentOverview ? "" : "hidden"}>
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
          </div>

          <div className={isContentHomepage ? "" : "hidden"}>
          <AdminContentPaneNav
            title={locale === "en" ? "Homepage ops lanes" : locale === "zh-TW" ? "首頁運營子目錄" : "首页运营子目录"}
            description={
              locale === "en"
                ? "Jump between featured matches, hero banners, and homepage modules so the page stays short during daily operations."
                : locale === "zh-TW"
                  ? "把焦點賽事、Hero Banner 與首頁模組拆成更短的操作面板，日常維護時不用一次看完整頁。"
                  : "把焦点赛事、Hero Banner 与首页模块拆成更短的操作面板，日常维护时不用一次看完整页。"
            }
            items={homepagePaneItems}
            activeKey={contentPane}
          />
          <div className={isHomepageFeaturedPane ? "" : "hidden"}>
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
                    href={buildAdminContentHref(contentRouteState)}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {adminPageCopy.shared.cancelEdit}
                  </Link>
                ) : null}
              </div>

              <input type="hidden" name="intent" value="save" />
              <input type="hidden" name="id" value={currentFeaturedSlot?.id ?? ""} />
              <AdminHiddenFields values={contentRouteState} />

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
                        href={buildAdminContentHref(contentRouteState, { editFeaturedSlot: slot.id })}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30"
                      >
                        {adminPageCopy.content.featuredSlotList.edit}
                      </Link>
                      <form action="/api/admin/operations/homepage-featured-match-slots" method="post">
                        <AdminHiddenFields values={contentRouteState} />
                        <input type="hidden" name="intent" value="move-up" />
                        <input type="hidden" name="id" value={slot.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                          {adminPageCopy.content.featuredSlotList.moveUp}
                        </button>
                      </form>
                      <form action="/api/admin/operations/homepage-featured-match-slots" method="post">
                        <AdminHiddenFields values={contentRouteState} />
                        <input type="hidden" name="intent" value="move-down" />
                        <input type="hidden" name="id" value={slot.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                          {adminPageCopy.content.featuredSlotList.moveDown}
                        </button>
                      </form>
                      <form action="/api/admin/operations/homepage-featured-match-slots" method="post">
                        <AdminHiddenFields values={contentRouteState} />
                        <input type="hidden" name="intent" value="toggle-status" />
                        <input type="hidden" name="id" value={slot.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-orange-300/30 hover:text-white">
                          {slot.status === "active" ? adminPageCopy.content.featuredSlotList.disable : adminPageCopy.content.featuredSlotList.enable}
                        </button>
                      </form>
                      <form action="/api/admin/operations/homepage-featured-match-slots" method="post">
                        <AdminHiddenFields values={contentRouteState} />
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
          </div>
          </div>

          <div className={isContentLibrary ? "" : "hidden"}>
          <AdminContentPaneNav
            title={locale === "en" ? "Library lanes" : locale === "zh-TW" ? "內容庫子目錄" : "内容库子目录"}
            description={
              locale === "en"
                ? "Separate author management from paid plan operations so editors can stay focused on one workflow at a time."
                : locale === "zh-TW"
                  ? "把作者審核與付費計畫單拆開，編輯日常維護時可以只看當前工作流。"
                  : "把作者审核与付费计划单拆开，编辑日常维护时可以只看当前工作流。"
            }
            items={libraryPaneItems}
            activeKey={contentPane}
          />
          <div className="mt-6 grid gap-6">
            <form
              action="/api/admin/content/authors"
              method="post"
              className={`${isLibraryAuthorsPane ? "" : "hidden"} rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.content.authorForm.sectionLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {currentAuthor ? adminPageCopy.content.authorForm.editTitle : adminPageCopy.content.authorForm.createTitle}
                  </h3>
                </div>
                {currentAuthor ? (
                  <Link
                    href={buildAdminContentHref(contentRouteState)}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {adminPageCopy.shared.cancelEdit}
                  </Link>
                ) : null}
              </div>

              <input type="hidden" name="intent" value="save" />
              <input type="hidden" name="id" value={currentAuthor?.id ?? ""} />
              <AdminHiddenFields values={contentRouteState} />

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

            <form
              action="/api/admin/content/plans"
              method="post"
              className={`${isLibraryPlansPane ? "" : "hidden"} rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.content.planForm.sectionLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {currentPlan ? adminPageCopy.content.planForm.editTitle : adminPageCopy.content.planForm.createTitle}
                  </h3>
                </div>
                {currentPlan ? (
                  <Link
                    href={buildAdminContentHref(contentRouteState)}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {adminPageCopy.shared.cancelEdit}
                  </Link>
                ) : null}
              </div>

              <input type="hidden" name="intent" value="save" />
              <input type="hidden" name="id" value={currentPlan?.id ?? ""} />
              <AdminHiddenFields values={contentRouteState} />

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

          <div className="mt-6 grid gap-6">
            <div className={`${isLibraryAuthorsPane ? "" : "hidden"} rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.content.authorList.sectionLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{adminPageCopy.content.authorList.title}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-slate-500">{adminPageCopy.content.authorList.count(authorTeams.length)}</span>
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
                    {locale === "en"
                      ? `${pendingAuthorApplicationCount} pending applications`
                      : locale === "zh-TW"
                        ? `${pendingAuthorApplicationCount} 個待審申請`
                        : `${pendingAuthorApplicationCount} 个待审申请`}
                  </span>
                </div>
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
                        href={buildAdminContentHref(contentRouteState, { editAuthor: author.id })}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30"
                      >
                        {adminPageCopy.content.authorList.edit}
                      </Link>
                      <form action="/api/admin/content/authors" method="post">
                        <AdminHiddenFields values={contentRouteState} />
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

              <div className="mt-6 rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="section-label">
                      {locale === "en" ? "Author applications" : locale === "zh-TW" ? "作者申請" : "作者申请"}
                    </p>
                    <h4 className="mt-2 text-lg font-semibold text-white">
                      {locale === "en" ? "Application review queue" : locale === "zh-TW" ? "申請審核隊列" : "申请审核队列"}
                    </h4>
                  </div>
                  <span className="text-sm text-slate-500">{authorApplications.length}</span>
                </div>

                <div className="mt-4 grid gap-3">
                  {authorApplications.map((application) => {
                    const statusMeta = getAuthorApplicationStatusMeta(application.status, displayLocale);

                    return (
                      <div key={application.id} className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-white">{application.displayName}</p>
                              <span className={`rounded-full px-3 py-1 text-xs ${statusMeta.className}`}>
                                {statusMeta.label}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {application.email} | {application.focus}
                              {application.userDisplayName ? ` | ${application.userDisplayName}` : ""}
                            </p>
                          </div>
                          <span className="text-xs text-slate-500">
                            {formatDateTime(application.createdAt, displayLocale)}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-slate-300">{application.bio}</p>
                        {application.sampleLinks ? (
                          <p className="mt-3 break-all text-xs text-sky-100">{application.sampleLinks}</p>
                        ) : null}
                        {application.reviewNote ? (
                          <p className="mt-3 text-xs text-slate-400">
                            {locale === "en" ? "Review note" : locale === "zh-TW" ? "審核備註" : "审核备注"}: {application.reviewNote}
                          </p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-3">
                          <form action="/api/admin/content/author-applications" method="post" className="flex flex-wrap gap-3">
                            <AdminHiddenFields values={contentRouteState} />
                            <input type="hidden" name="id" value={application.id} />
                            <input type="hidden" name="intent" value="approve" />
                            <input type="hidden" name="reviewedByDisplayName" value={session.displayName} />
                            <input
                              type="text"
                              name="reviewNote"
                              placeholder={locale === "en" ? "Approval note" : locale === "zh-TW" ? "通過備註" : "通过备注"}
                              className="min-w-44 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-white outline-none placeholder:text-slate-500"
                            />
                            <button type="submit" className="rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1.5 text-sm text-lime-100 transition hover:border-lime-300/45 hover:bg-lime-300/15">
                              {locale === "en" ? "Approve" : locale === "zh-TW" ? "通過" : "通过"}
                            </button>
                          </form>
                          <form action="/api/admin/content/author-applications" method="post" className="flex flex-wrap gap-3">
                            <AdminHiddenFields values={contentRouteState} />
                            <input type="hidden" name="id" value={application.id} />
                            <input type="hidden" name="intent" value="reject" />
                            <input type="hidden" name="reviewedByDisplayName" value={session.displayName} />
                            <input
                              type="text"
                              name="reviewNote"
                              placeholder={locale === "en" ? "Rejection note" : locale === "zh-TW" ? "拒絕備註" : "拒绝备注"}
                              className="min-w-44 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-white outline-none placeholder:text-slate-500"
                            />
                            <button type="submit" className="rounded-full border border-rose-300/25 bg-rose-400/10 px-3 py-1.5 text-sm text-rose-100 transition hover:border-rose-300/45 hover:bg-rose-400/15">
                              {locale === "en" ? "Reject" : locale === "zh-TW" ? "拒絕" : "拒绝"}
                            </button>
                          </form>
                          {application.approvedAuthorId ? (
                            <Link
                              href={buildAdminContentHref(contentRouteState, { editAuthor: application.approvedAuthorId })}
                              className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30"
                            >
                              {locale === "en" ? "Open author profile" : locale === "zh-TW" ? "打開作者檔案" : "打开作者档案"}
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {authorApplications.length === 0 ? (
                    <div className="rounded-[1rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-400">
                      {locale === "en"
                        ? "No author applications yet."
                        : locale === "zh-TW"
                          ? "目前還沒有作者申請。"
                          : "目前还没有作者申请。"}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className={`${isLibraryPlansPane ? "" : "hidden"} rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminPageCopy.content.planList.sectionLabel}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{adminPageCopy.content.planList.title}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <form action="/admin" method="get" className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="tab" value="content" />
                    <input type="hidden" name="contentSection" value={contentSection} />
                    <input type="hidden" name="contentPane" value={contentPane ?? ""} />
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
                        href={buildAdminContentHref(contentRouteState, { editPlan: plan.id })}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30"
                      >
                        {adminPageCopy.content.planList.edit}
                      </Link>
                      <form action="/api/admin/content/plans" method="post">
                        <AdminHiddenFields values={contentRouteState} />
                        <input type="hidden" name="intent" value="toggle-status" />
                        <input type="hidden" name="id" value={plan.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-lime-300/30 hover:text-white">
                          {plan.status === "published" ? adminPageCopy.content.planList.switchToDraft : adminPageCopy.content.planList.publish}
                        </button>
                      </form>
                      <form action="/api/admin/content/plans" method="post">
                        <AdminHiddenFields values={contentRouteState} />
                        <input type="hidden" name="intent" value="toggle-hot" />
                        <input type="hidden" name="id" value={plan.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-orange-300/30 hover:text-white">
                          {plan.isHot ? adminPageCopy.content.planList.clearHot : adminPageCopy.content.planList.setHot}
                        </button>
                      </form>
                      <form action="/api/admin/content/plans" method="post">
                        <AdminHiddenFields values={contentRouteState} />
                        <input type="hidden" name="intent" value="archive" />
                        <input type="hidden" name="id" value={plan.id} />
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

          </div>

          <div className={isHomepageBannersPane ? "" : "hidden"}>
          <div id="homepage-banner-form" className="mt-6 grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
            <AdminBannerComposer
              locale={displayLocale}
              currentBanner={currentBanner}
              homepageBannerCount={homepageBanners.length}
              cancelLabel={adminPageCopy.shared.cancelEdit}
              cancelHref={buildAdminContentHref(contentRouteState)}
              hiddenFields={contentRouteState}
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
                          <p className="mt-1 text-sm text-slate-400">TH: {banner.titleTh}</p>
                          <p className="mt-1 text-sm text-slate-400">VI: {banner.titleVi}</p>
                          <p className="mt-1 text-sm text-slate-400">HI: {banner.titleHi}</p>
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
                          href={buildAdminContentHref(contentRouteState, { editBanner: banner.id })}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30"
                        >
                          {adminPageCopy.content.bannerList.edit}
                        </Link>
                        <form action="/api/admin/operations/homepage-banners" method="post">
                          <AdminHiddenFields values={contentRouteState} />
                          <input type="hidden" name="intent" value="duplicate" />
                          <input type="hidden" name="id" value={banner.id} />
                          <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-sky-300/30 hover:text-white">
                            {bannerAnalyticsCopy.duplicate}
                          </button>
                        </form>
                        <form action="/api/admin/operations/homepage-banners" method="post">
                          <AdminHiddenFields values={contentRouteState} />
                          <input type="hidden" name="intent" value="move-up" />
                          <input type="hidden" name="id" value={banner.id} />
                          <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                            {adminPageCopy.content.bannerList.moveUp}
                          </button>
                        </form>
                        <form action="/api/admin/operations/homepage-banners" method="post">
                          <AdminHiddenFields values={contentRouteState} />
                          <input type="hidden" name="intent" value="move-down" />
                          <input type="hidden" name="id" value={banner.id} />
                          <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                            {adminPageCopy.content.bannerList.moveDown}
                          </button>
                        </form>
                        <form action="/api/admin/operations/homepage-banners" method="post">
                          <AdminHiddenFields values={contentRouteState} />
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

          </div>

          <div className={isHomepageModulesPane ? "" : "hidden"}>
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
                    href={buildAdminContentHref(contentRouteState)}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {adminPageCopy.shared.cancelEdit}
                  </Link>
                ) : null}
              </div>

              <input type="hidden" name="intent" value="save" />
              <input type="hidden" name="id" value={currentModule?.id ?? ""} />
              <AdminHiddenFields values={contentRouteState} />

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
                    <AdminHiddenFields values={contentRouteState} />
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
                        href={buildAdminContentHref(contentRouteState, { editModule: module.id })}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30"
                      >
                        {adminPageCopy.content.moduleList.edit}
                      </Link>
                      <form action="/api/admin/operations/homepage-modules" method="post">
                        <AdminHiddenFields values={contentRouteState} />
                        <input type="hidden" name="intent" value="move-up" />
                        <input type="hidden" name="id" value={module.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                          {adminPageCopy.content.moduleList.moveUp}
                        </button>
                      </form>
                      <form action="/api/admin/operations/homepage-modules" method="post">
                        <AdminHiddenFields values={contentRouteState} />
                        <input type="hidden" name="intent" value="move-down" />
                        <input type="hidden" name="id" value={module.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                          {adminPageCopy.content.moduleList.moveDown}
                        </button>
                      </form>
                      <form action="/api/admin/operations/homepage-modules" method="post">
                        <AdminHiddenFields values={contentRouteState} />
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
                      <AdminHiddenFields values={contentRouteState} />
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

          </div>

          <div className={isContentDistribution ? "" : "hidden"}>
          <AdminContentPaneNav
            title={locale === "en" ? "Distribution lanes" : locale === "zh-TW" ? "分發觸點子目錄" : "分发触点子目录"}
            description={
              locale === "en"
                ? "Split site-wide announcements from page ad placements so traffic touchpoints are easier to maintain."
                : locale === "zh-TW"
                  ? "把全站公告與頁面廣告位拆開，維護站內分發觸點時不必來回翻很長的列表。"
                  : "把全站公告与页面广告位拆开，维护站内分发触点时不必来回翻很长的列表。"
            }
            items={distributionPaneItems}
            activeKey={contentPane}
          />
          <div className={isDistributionAnnouncementsPane ? "" : "hidden"}>
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
                    href={buildAdminContentHref(contentRouteState)}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {adminPageCopy.shared.cancelEdit}
                  </Link>
                ) : null}
              </div>

              <input type="hidden" name="intent" value="save" />
              <input type="hidden" name="id" value={currentAnnouncement?.id ?? ""} />
              <AdminHiddenFields values={contentRouteState} />

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
                  ["titleTh", locale === "en" ? "Title (Thai)" : locale === "zh-TW" ? "標題（泰語）" : "标题（泰语）", currentAnnouncement?.titleTh ?? ""],
                  ["titleVi", locale === "en" ? "Title (Vietnamese)" : locale === "zh-TW" ? "標題（越語）" : "标题（越语）", currentAnnouncement?.titleVi ?? ""],
                  ["titleHi", locale === "en" ? "Title (Hindi)" : locale === "zh-TW" ? "標題（印地語）" : "标题（印地语）", currentAnnouncement?.titleHi ?? ""],
                  ["ctaLabelZhCn", adminPageCopy.content.announcementForm.fields.ctaLabelZhCn, currentAnnouncement?.ctaLabelZhCn ?? ""],
                  ["ctaLabelZhTw", adminPageCopy.content.announcementForm.fields.ctaLabelZhTw, currentAnnouncement?.ctaLabelZhTw ?? ""],
                  ["ctaLabelEn", adminPageCopy.content.announcementForm.fields.ctaLabelEn, currentAnnouncement?.ctaLabelEn ?? ""],
                  ["ctaLabelTh", locale === "en" ? "CTA (Thai)" : locale === "zh-TW" ? "按鈕（泰語）" : "按钮（泰语）", currentAnnouncement?.ctaLabelTh ?? ""],
                  ["ctaLabelVi", locale === "en" ? "CTA (Vietnamese)" : locale === "zh-TW" ? "按鈕（越語）" : "按钮（越语）", currentAnnouncement?.ctaLabelVi ?? ""],
                  ["ctaLabelHi", locale === "en" ? "CTA (Hindi)" : locale === "zh-TW" ? "按鈕（印地語）" : "按钮（印地语）", currentAnnouncement?.ctaLabelHi ?? ""],
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
                  ["messageTh", locale === "en" ? "Message (Thai)" : locale === "zh-TW" ? "內容（泰語）" : "内容（泰语）", currentAnnouncement?.messageTh ?? ""],
                  ["messageVi", locale === "en" ? "Message (Vietnamese)" : locale === "zh-TW" ? "內容（越語）" : "内容（越语）", currentAnnouncement?.messageVi ?? ""],
                  ["messageHi", locale === "en" ? "Message (Hindi)" : locale === "zh-TW" ? "內容（印地語）" : "内容（印地语）", currentAnnouncement?.messageHi ?? ""],
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
                        {adminPageCopy.content.announcementList.localePreview}: TW {announcement.titleZhTw} / EN {announcement.titleEn} / TH {announcement.titleTh} / VI {announcement.titleVi} / HI {announcement.titleHi}
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
                        href={buildAdminContentHref(contentRouteState, { editAnnouncement: announcement.id })}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30"
                      >
                        {adminPageCopy.content.announcementList.edit}
                      </Link>
                      <form action="/api/admin/operations/site-announcements" method="post">
                        <AdminHiddenFields values={contentRouteState} />
                        <input type="hidden" name="intent" value="move-up" />
                        <input type="hidden" name="id" value={announcement.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                          {adminPageCopy.content.announcementList.moveUp}
                        </button>
                      </form>
                      <form action="/api/admin/operations/site-announcements" method="post">
                        <AdminHiddenFields values={contentRouteState} />
                        <input type="hidden" name="intent" value="move-down" />
                        <input type="hidden" name="id" value={announcement.id} />
                        <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                          {adminPageCopy.content.announcementList.moveDown}
                        </button>
                      </form>
                      <form action="/api/admin/operations/site-announcements" method="post">
                        <AdminHiddenFields values={contentRouteState} />
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
          </div>

          <div className={isDistributionAdsPane ? "" : "hidden"}>
          <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
            <form action="/api/admin/operations/site-ads" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{locale === "en" ? "Site Ads" : locale === "zh-TW" ? "站內廣告位" : "站内广告位"}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {currentSiteAd
                      ? locale === "en"
                        ? "Edit site ad slot"
                        : locale === "zh-TW"
                          ? "編輯站內廣告位"
                          : "编辑站内广告位"
                      : locale === "en"
                        ? "Create site ad slot"
                        : locale === "zh-TW"
                          ? "新增站內廣告位"
                          : "新增站内广告位"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {locale === "en"
                      ? "Manage real page ad placements for home, member center, plans, database, match detail, and live boards with multilingual fallback copy."
                      : locale === "zh-TW"
                        ? "管理首頁、會員中心、計畫頁、資料庫、賽事詳情與直播頁的站內廣告位，支持多語文案與統一兜底。"
                        : "管理首页、会员中心、计划页、资料库、赛事详情与直播页的站内广告位，支持多语文案与统一兜底。"}
                  </p>
                </div>
                {currentSiteAd ? (
                  <Link
                    href={buildAdminContentHref(contentRouteState)}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {adminPageCopy.shared.cancelEdit}
                  </Link>
                ) : null}
              </div>

              <input type="hidden" name="intent" value="save" />
              <input type="hidden" name="id" value={currentSiteAd?.id ?? ""} />
              <AdminHiddenFields values={contentRouteState} />

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">Key</span>
                  <input type="text" name="key" defaultValue={currentSiteAd?.key ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{locale === "en" ? "Placement" : locale === "zh-TW" ? "投放位置" : "投放位置"}</span>
                  <select name="placement" defaultValue={currentSiteAd?.placement ?? "home-inline"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    {siteAdPlacements.map((placement) => (
                      <option key={placement} value={placement}>
                        {getSiteAdPlacementLabel(placement, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{locale === "en" ? "Format" : locale === "zh-TW" ? "形式" : "形式"}</span>
                  <select name="format" defaultValue={currentSiteAd?.format ?? "image"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="image">image</option>
                    <option value="text">text</option>
                    <option value="html-snippet">html-snippet</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{locale === "en" ? "Theme" : locale === "zh-TW" ? "視覺主題" : "视觉主题"}</span>
                  <select name="theme" defaultValue={currentSiteAd?.theme ?? "neutral"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="neutral">neutral</option>
                    <option value="highlight">highlight</option>
                    <option value="premium">premium</option>
                  </select>
                </label>
                <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4 text-xs text-slate-400 md:col-span-2">
                  <p className="font-medium uppercase tracking-[0.18em] text-slate-500">
                    {locale === "en" ? "Placement guide" : locale === "zh-TW" ? "投放說明" : "投放说明"}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {siteAdPlacements.map((placement) => (
                      <p key={placement}>
                        <span className="text-slate-200">{getSiteAdPlacementLabel(placement, locale)}</span>
                        {" · "}
                        {getSiteAdPlacementHint(placement, locale)}
                      </p>
                    ))}
                  </div>
                </div>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-slate-400">Href</span>
                  <input type="text" name="href" defaultValue={currentSiteAd?.href ?? ""} placeholder="/member" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-slate-400">{locale === "en" ? "Image URL" : locale === "zh-TW" ? "圖片 URL" : "图片 URL"}</span>
                  <input type="text" name="imageUrl" defaultValue={currentSiteAd?.imageUrl ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="text-slate-400">HTML snippet</span>
                  <textarea name="htmlSnippet" rows={3} defaultValue={currentSiteAd?.htmlSnippet ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{locale === "en" ? "Sort order" : locale === "zh-TW" ? "排序" : "排序"}</span>
                  <input type="number" name="sortOrder" defaultValue={currentSiteAd?.sortOrder ?? siteAds.length} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{locale === "en" ? "Status" : locale === "zh-TW" ? "狀態" : "状态"}</span>
                  <select name="status" defaultValue={currentSiteAd?.status ?? "active"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="active">{locale === "en" ? "Active" : locale === "zh-TW" ? "啟用" : "启用"}</option>
                    <option value="inactive">{locale === "en" ? "Inactive" : locale === "zh-TW" ? "停用" : "停用"}</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{locale === "en" ? "Starts at" : locale === "zh-TW" ? "開始時間" : "开始时间"}</span>
                  <input type="datetime-local" name="startsAt" defaultValue={toDateTimeLocalValue(currentSiteAd?.startsAt)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{locale === "en" ? "Ends at" : locale === "zh-TW" ? "結束時間" : "结束时间"}</span>
                  <input type="datetime-local" name="endsAt" defaultValue={toDateTimeLocalValue(currentSiteAd?.endsAt)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                {[
                  ["titleZhCn", locale === "en" ? "Title (zh-CN)" : locale === "zh-TW" ? "標題（簡中）" : "标题（简中）", currentSiteAd?.titleZhCn ?? ""],
                  ["titleZhTw", locale === "en" ? "Title (zh-TW)" : locale === "zh-TW" ? "標題（繁中）" : "标题（繁中）", currentSiteAd?.titleZhTw ?? ""],
                  ["titleEn", "Title (EN)", currentSiteAd?.titleEn ?? ""],
                  ["titleTh", "Title (TH)", currentSiteAd?.titleTh ?? ""],
                  ["titleVi", "Title (VI)", currentSiteAd?.titleVi ?? ""],
                  ["titleHi", "Title (HI)", currentSiteAd?.titleHi ?? ""],
                ].map(([name, label, value]) => (
                  <label key={String(name)} className="space-y-2 text-sm">
                    <span className="text-slate-400">{String(label)}</span>
                    <input type="text" name={String(name)} defaultValue={String(value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                  </label>
                ))}
                {[
                  ["descriptionZhCn", locale === "en" ? "Description (zh-CN)" : locale === "zh-TW" ? "說明（簡中）" : "说明（简中）", currentSiteAd?.descriptionZhCn ?? ""],
                  ["descriptionZhTw", locale === "en" ? "Description (zh-TW)" : locale === "zh-TW" ? "說明（繁中）" : "说明（繁中）", currentSiteAd?.descriptionZhTw ?? ""],
                  ["descriptionEn", "Description (EN)", currentSiteAd?.descriptionEn ?? ""],
                  ["descriptionTh", "Description (TH)", currentSiteAd?.descriptionTh ?? ""],
                  ["descriptionVi", "Description (VI)", currentSiteAd?.descriptionVi ?? ""],
                  ["descriptionHi", "Description (HI)", currentSiteAd?.descriptionHi ?? ""],
                ].map(([name, label, value]) => (
                  <label key={String(name)} className="space-y-2 text-sm md:col-span-2">
                    <span className="text-slate-400">{String(label)}</span>
                    <textarea name={String(name)} rows={2} defaultValue={String(value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                  </label>
                ))}
                {[
                  ["ctaLabelZhCn", "CTA (zh-CN)", currentSiteAd?.ctaLabelZhCn ?? ""],
                  ["ctaLabelZhTw", "CTA (zh-TW)", currentSiteAd?.ctaLabelZhTw ?? ""],
                  ["ctaLabelEn", "CTA (EN)", currentSiteAd?.ctaLabelEn ?? ""],
                  ["ctaLabelTh", "CTA (TH)", currentSiteAd?.ctaLabelTh ?? ""],
                  ["ctaLabelVi", "CTA (VI)", currentSiteAd?.ctaLabelVi ?? ""],
                  ["ctaLabelHi", "CTA (HI)", currentSiteAd?.ctaLabelHi ?? ""],
                ].map(([name, label, value]) => (
                  <label key={String(name)} className="space-y-2 text-sm">
                    <span className="text-slate-400">{String(label)}</span>
                    <input type="text" name={String(name)} defaultValue={String(value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                  </label>
                ))}
              </div>

              <button type="submit" className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
                {currentSiteAd
                  ? locale === "en"
                    ? "Save site ad"
                    : locale === "zh-TW"
                      ? "保存廣告位"
                      : "保存广告位"
                  : locale === "en"
                    ? "Create site ad"
                    : locale === "zh-TW"
                      ? "建立廣告位"
                      : "建立广告位"}
              </button>
            </form>

            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{locale === "en" ? "Site Ads" : locale === "zh-TW" ? "站內廣告位" : "站内广告位"}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "Placement queue" : locale === "zh-TW" ? "投放列表" : "投放列表"}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">{siteAds.length}</span>
                  <form action="/api/admin/operations/site-ads" method="post">
                    <AdminHiddenFields values={contentRouteState} />
                    <input type="hidden" name="intent" value="bootstrap" />
                    <button type="submit" className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-sm text-sky-100 transition hover:border-sky-300/35 hover:bg-sky-300/15">
                      {locale === "en" ? "Import defaults" : locale === "zh-TW" ? "導入預設位" : "导入默认位"}
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                {siteAds.map((ad) => {
                  const ctr = ad.impressionCount > 0 ? `${((ad.clickCount / ad.impressionCount) * 100).toFixed(1)}%` : "--";

                  return (
                    <div key={ad.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{ad.titleZhCn}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {ad.key} | {getSiteAdPlacementLabel(ad.placement, locale)} | {ad.format} | {ad.theme}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs ${ad.status === "active" ? "bg-lime-300/12 text-lime-100" : "bg-white/8 text-slate-300"}`}>
                          {ad.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">{ad.descriptionZhCn}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{locale === "en" ? "Order" : locale === "zh-TW" ? "排序" : "排序"} {ad.sortOrder}</span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{locale === "en" ? "Impressions" : locale === "zh-TW" ? "曝光" : "曝光"} {ad.impressionCount}</span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{locale === "en" ? "Clicks" : locale === "zh-TW" ? "點擊" : "点击"} {ad.clickCount}</span>
                        <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-orange-100">CTR {ctr}</span>
                        {ad.href ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{ad.href}</span> : null}
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                        <p>
                          {locale === "en" ? "Window" : locale === "zh-TW" ? "生效時間" : "生效时间"}:{" "}
                          <span className="text-slate-300">
                            {formatAnnouncementWindow(ad.startsAt, ad.endsAt, displayLocale, locale === "en" ? "Always on" : locale === "zh-TW" ? "長期展示" : "长期展示")}
                          </span>
                        </p>
                        <p>
                          {locale === "en" ? "Last activity" : locale === "zh-TW" ? "最近活動" : "最近活动"}:{" "}
                          <span className="text-slate-300">
                            {ad.lastClickAt
                              ? formatDateTime(ad.lastClickAt, displayLocale)
                              : ad.lastImpressionAt
                                ? formatDateTime(ad.lastImpressionAt, displayLocale)
                                : "--"}
                          </span>
                        </p>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        TW {ad.titleZhTw} / EN {ad.titleEn} / TH {ad.titleTh} / VI {ad.titleVi} / HI {ad.titleHi}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href={buildAdminContentHref(contentRouteState, { editSiteAd: ad.id })}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30"
                        >
                          {locale === "en" ? "Edit" : locale === "zh-TW" ? "編輯" : "编辑"}
                      </Link>
                      <form action="/api/admin/operations/site-ads" method="post">
                        <AdminHiddenFields values={contentRouteState} />
                        <input type="hidden" name="intent" value="move-up" />
                        <input type="hidden" name="id" value={ad.id} />
                          <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                            {locale === "en" ? "Move up" : locale === "zh-TW" ? "上移" : "上移"}
                          </button>
                      </form>
                      <form action="/api/admin/operations/site-ads" method="post">
                        <AdminHiddenFields values={contentRouteState} />
                        <input type="hidden" name="intent" value="move-down" />
                        <input type="hidden" name="id" value={ad.id} />
                          <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-white/30 hover:text-white">
                            {locale === "en" ? "Move down" : locale === "zh-TW" ? "下移" : "下移"}
                          </button>
                      </form>
                      <form action="/api/admin/operations/site-ads" method="post">
                        <AdminHiddenFields values={contentRouteState} />
                        <input type="hidden" name="intent" value="toggle-status" />
                        <input type="hidden" name="id" value={ad.id} />
                          <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-orange-300/30 hover:text-white">
                            {ad.status === "active"
                              ? locale === "en"
                                ? "Disable"
                                : locale === "zh-TW"
                                  ? "停用"
                                  : "停用"
                              : locale === "en"
                                ? "Enable"
                                : locale === "zh-TW"
                                  ? "啟用"
                                  : "启用"}
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
                {siteAds.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                    {locale === "en" ? "No site ads yet. Import defaults or create the first slot." : locale === "zh-TW" ? "目前沒有站內廣告位，可先導入預設位或建立第一條。" : "目前没有站内广告位，可先导入默认位或建立第一条。"}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          </div>

          </div>

          <div className={isContentAssistant ? "" : "hidden"}>
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
              <AdminHiddenFields values={contentKnowledgeRouteState} />

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
                <input type="hidden" name="contentSection" value={contentSection} />
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
                          <AdminHiddenFields values={contentKnowledgeRouteState} />
                          <input type="hidden" name="intent" value="move-up" />
                          <input type="hidden" name="id" value={item.id} />
                          <button type="submit" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                            {assistantKnowledgeCopy.moveUp}
                          </button>
                        </form>
                        <form action="/api/admin/operations/site-assistant-knowledge" method="post">
                          <AdminHiddenFields values={contentKnowledgeRouteState} />
                          <input type="hidden" name="intent" value="move-down" />
                          <input type="hidden" name="id" value={item.id} />
                          <button type="submit" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                            {assistantKnowledgeCopy.moveDown}
                          </button>
                        </form>
                        <form action="/api/admin/operations/site-assistant-knowledge" method="post">
                          <AdminHiddenFields values={contentKnowledgeRouteState} />
                          <input type="hidden" name="intent" value="toggle-status" />
                          <input type="hidden" name="id" value={item.id} />
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

          <AdminContentPaneNav
            title={locale === "en" ? "User order lanes" : locale === "zh-TW" ? "用戶訂單子目錄" : "用户订单子目录"}
            description={
              locale === "en"
                ? "Switch between user workspace, membership orders, content orders, and payment callbacks without scrolling through the whole console."
                : locale === "zh-TW"
                  ? "把用戶工作台、會員訂單、內容訂單與支付回調拆成更短的操作子目錄。"
                  : "把用户工作台、会员订单、内容订单与支付回调拆成更短的操作子目录。"
            }
            items={usersPaneItems}
            activeKey={usersSection}
          />

          <div className={showUsersOverview ? "mt-6 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5" : "hidden"}>
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

          <div className={showUsersPayments ? "mt-6 rounded-[1.4rem] border border-sky-300/15 bg-sky-400/10 p-4" : "hidden"}>
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

          <div className={showUsersPayments ? "mt-6 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4" : "hidden"}>
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

          <div className={showUserFilters ? "mt-6 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4" : "hidden"}>
            <form className="grid gap-3 lg:grid-cols-[1.15fr,0.75fr,0.75fr,0.95fr,0.95fr,auto,auto,auto]" action="/admin" method="get">
              <input type="hidden" name="tab" value="users" />
              <input type="hidden" name="usersSection" value={usersSection} />
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
              <Link href={`/admin?tab=users&usersSection=${usersSection}`} className="inline-flex items-center justify-center rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
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

          <div className={(showUsersWorkspace || showUsersMembershipOrders || showUsersContentOrders) ? "mt-6 grid gap-6 xl:grid-cols-[1.1fr,0.9fr]" : "hidden"}>
            <div className={showUsersWorkspace ? "rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5" : "hidden"}>
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
                        {locale === "en" ? "Coin balance" : locale === "zh-TW" ? "球幣餘額" : "球币余额"} {formatAdminCoinAmount(user.coinBalance, displayLocale)}
                      </span>
                      <span>
                        {adminPageCopy.users.userList.membershipOrders} {user.membershipOrderCount}
                      </span>
                      <span>
                        {adminPageCopy.users.userList.contentOrders} {user.contentOrderCount}
                      </span>
                    </div>

                    {user.referredByAgentName ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                        <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-sky-100">
                          {locale === "en" ? "Agent attribution" : locale === "zh-TW" ? "代理歸因" : "代理归因"}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                          {user.referredByAgentName}
                        </span>
                        {user.referredByAgentCode ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                            Code {user.referredByAgentCode}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    <p className="mt-3 text-sm text-slate-400">
                      {user.membershipPlanId
                        ? adminPageCopy.users.userList.membershipSummary(
                            membershipPlanNames.get(user.membershipPlanId) ?? user.membershipPlanId,
                            user.membershipExpiresAt ? formatDateTime(user.membershipExpiresAt, displayLocale) : adminPageCopy.users.userList.unknownExpiry,
                          )
                        : adminPageCopy.users.userList.noMembership}
                    </p>
                    <div className="mt-4">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="inline-flex items-center justify-center rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1.5 text-sm text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-400/20"
                      >
                        {locale === "en" ? "Open workspace" : locale === "zh-TW" ? "打開工作台" : "打开工作台"}
                      </Link>
                    </div>
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
              {showUsersMembershipOrders && usersTabFilters.orderType !== "content" ? (
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

              {showUsersContentOrders && usersTabFilters.orderType !== "membership" ? (
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
                error === "coin-package" ||
                error === "coin-recharge-order" ||
                error === "coin-recharge-order-balance" ||
                error === "coin-adjustment" ||
                error === "coin-adjustment-balance" ||
                error === "batch-coin-adjustment" ||
                error === "batch-coin-recharge-order" ||
                error === "finance-reconciliation-issue"
                  ? "border-rose-300/25 bg-rose-400/10 text-rose-100"
                  : "border-lime-300/20 bg-lime-300/10 text-lime-100"
              }`}
            >
              {financeNotice}
            </div>
          ) : null}
          <AdminContentPaneNav
            title={locale === "en" ? "Finance lanes" : locale === "zh-TW" ? "球幣財務子目錄" : "球币财务子目录"}
            description={
              locale === "en"
                ? "Jump between recharge operations, reconciliation, and wallet ledgers with the same short navigation used in content ops."
                : locale === "zh-TW"
                  ? "把充值運營、對帳中心與帳戶流水拆成更短的財務子目錄。"
                  : "把充值运营、对账中心与账户流水拆成更短的财务子目录。"
            }
            items={financePaneItems}
            activeKey={financeSection}
          />
          <div className={showFinanceRecharge ? "mt-6 grid gap-6 xl:grid-cols-[0.95fr,1.25fr]" : "hidden"}>
            <div className="grid gap-6">
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
                <div>
                  <p className="section-label">{adminExpansion.finance.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en"
                      ? "Manual coin adjustment"
                      : locale === "zh-TW"
                        ? "人工調整球幣"
                        : "人工调整球币"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {locale === "en"
                      ? "Finance can manually credit or debit a member balance and keep the change in the coin ledger."
                      : locale === "zh-TW"
                        ? "財務可直接為會員加幣或扣幣，系統會同步保留球幣流水。"
                        : "财务可直接为会员加币或扣币，系统会同步保留球币流水。"}
                  </p>
                </div>
                <form action="/api/admin/finance/recharge-orders" method="post" className="mt-6">
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
                        {locale === "en" ? "Amount" : locale === "zh-TW" ? "球幣數量" : "球币数量"}
                      </span>
                      <input
                        name="amount"
                        type="number"
                        min="1"
                        step="1"
                        defaultValue="100"
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">
                        {locale === "en" ? "Note" : locale === "zh-TW" ? "備註" : "备注"}
                      </span>
                      <input
                        name="reason"
                        placeholder={locale === "en" ? "Optional reason or ticket reference" : locale === "zh-TW" ? "可填工單號或調整原因" : "可填工单号或调整原因"}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                      />
                    </label>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      name="intent"
                      value="manual-credit"
                      disabled={financeDashboard.userOptions.length === 0}
                      className="rounded-full border border-lime-300/20 bg-lime-300/10 px-4 py-2 text-sm font-semibold text-lime-100 transition hover:bg-lime-300/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {locale === "en" ? "Add coins" : locale === "zh-TW" ? "加幣入帳" : "加币入账"}
                    </button>
                    <button
                      type="submit"
                      name="intent"
                      value="manual-debit"
                      disabled={financeDashboard.userOptions.length === 0}
                      className="rounded-full border border-orange-300/20 bg-orange-300/10 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:bg-orange-300/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {locale === "en" ? "Deduct coins" : locale === "zh-TW" ? "扣幣出帳" : "扣币出账"}
                    </button>
                  </div>
                </form>
                <div className="mt-6 rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {locale === "en"
                          ? "Expired recharge cleanup"
                          : locale === "zh-TW"
                            ? "過期充值單清理"
                            : "过期充值单清理"}
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        {locale === "en"
                          ? "Run from admin or call the internal endpoint from cron after deployment."
                          : locale === "zh-TW"
                            ? "可由後台手動執行，也可在部署後由伺服器 cron 呼叫內部介面。"
                            : "可由后台手动执行，也可在部署后由服务器 cron 调用内部接口。"}
                      </p>
                    </div>
                    <form action="/api/admin/finance/recharge-orders" method="post">
                      <input type="hidden" name="intent" value="close-expired" />
                      <button
                        type="submit"
                        className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white"
                      >
                        {locale === "en" ? "Run cleanup" : locale === "zh-TW" ? "立即清理" : "立即清理"}
                      </button>
                    </form>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                      POST /api/internal/finance/recharge-expiry
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                      POST /api/internal/finance/reconciliation-scan
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                      POST /api/internal/finance/reminder-scan
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                      {locale === "en"
                        ? "Bearer FINANCE_TRIGGER_TOKEN or SYNC_TRIGGER_TOKEN"
                        : locale === "zh-TW"
                          ? "Bearer FINANCE_TRIGGER_TOKEN 或 SYNC_TRIGGER_TOKEN"
                          : "Bearer FINANCE_TRIGGER_TOKEN 或 SYNC_TRIGGER_TOKEN"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                <div>
                  <p className="section-label">{adminExpansion.finance.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en"
                      ? "Batch coin adjustment"
                      : locale === "zh-TW"
                        ? "批量球幣調整"
                        : "批量球币调整"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {locale === "en"
                      ? "One member identifier per line. Support user ID or email. Apply the same amount to all selected members."
                      : locale === "zh-TW"
                        ? "每行一個會員標識，支援 user ID 或 email，對整批會員套用同一數量。"
                        : "每行一个会员标识，支持 user ID 或 email，对整批会员套用同一数量。"}
                  </p>
                </div>
                <form action="/api/admin/finance/recharge-orders" method="post" className="mt-6">
                  <div className="grid gap-4">
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">
                        {locale === "en" ? "Members" : locale === "zh-TW" ? "會員列表" : "会员列表"}
                      </span>
                      <textarea
                        name="batchRefs"
                        rows={6}
                        placeholder={locale === "en" ? "user@example.com\ncuid_user_id" : locale === "zh-TW" ? "user@example.com\ncuid_user_id" : "user@example.com\ncuid_user_id"}
                        className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">
                        {locale === "en" ? "Amount per member" : locale === "zh-TW" ? "每人球幣數量" : "每人球币数量"}
                      </span>
                      <input
                        name="amount"
                        type="number"
                        min="1"
                        step="1"
                        defaultValue="100"
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">
                        {locale === "en" ? "Batch note" : locale === "zh-TW" ? "批次備註" : "批次备注"}
                      </span>
                      <input
                        name="reason"
                        placeholder={locale === "en" ? "Campaign, ticket, or reconciliation reason" : locale === "zh-TW" ? "活動、工單或對帳原因" : "活动、工单或对账原因"}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                      />
                    </label>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      name="intent"
                      value="batch-manual-credit"
                      className="rounded-full border border-lime-300/20 bg-lime-300/10 px-4 py-2 text-sm font-semibold text-lime-100 transition hover:bg-lime-300/15"
                    >
                      {locale === "en" ? "Batch credit" : locale === "zh-TW" ? "批量加幣" : "批量加币"}
                    </button>
                    <button
                      type="submit"
                      name="intent"
                      value="batch-manual-debit"
                      className="rounded-full border border-orange-300/20 bg-orange-300/10 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:bg-orange-300/15"
                    >
                      {locale === "en" ? "Batch debit" : locale === "zh-TW" ? "批量扣幣" : "批量扣币"}
                    </button>
                  </div>
                </form>
              </div>
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
          <div className={showFinanceRecharge ? "mt-6 grid gap-6 xl:grid-cols-3" : "hidden"}>
            <ExpansionRowsPanel title={adminExpansion.finance.coinPackages.title} rows={financePackageRows} />
            <FinanceRechargeOrdersPanel title={adminExpansion.finance.rechargeOrders.title} locale={locale} orders={financeDashboard.rechargeOrders} />
            <ExpansionRowsPanel title={adminExpansion.finance.settlements.title} rows={financeSettlementRows} />
          </div>
          <div className={showFinanceReconciliation ? "mt-6" : "hidden"}>
            <ExpansionRowsPanel
              title={locale === "en" ? "Recharge reconciliation" : locale === "zh-TW" ? "充值對帳總覽" : "充值对账总览"}
              rows={financeDashboard.reconciliationRows}
            />
          </div>
          <div className={showFinanceReconciliation ? "mt-6" : "hidden"}>
            <FinanceReconciliationIssuesPanel
              title={locale === "en" ? "Reconciliation issue center" : locale === "zh-TW" ? "對帳問題中心" : "对账问题中心"}
              locale={locale}
              issues={filteredFinanceReconciliationIssues}
              issueTypeOptions={financeIssueTypeOptions}
              filters={{
                scope: financeIssueScope,
                status: financeIssueStatus,
                severity: financeIssueSeverity,
                issueType: financeIssueType,
                queue: financeIssueQueue,
                query: financeIssueQuery,
              }}
              summary={financeDashboard.reconciliationSummary}
              financeSection={financeSection}
            />
          </div>
          <div className={showFinanceWallets ? "mt-6 grid gap-6 xl:grid-cols-2" : "hidden"}>
            <FinanceCoinAccountsPanel
              title={locale === "en" ? "Top coin balances" : locale === "zh-TW" ? "球幣餘額帳戶" : "球币余额账户"}
              locale={locale}
              accounts={financeDashboard.coinAccounts}
            />
            <FinanceCoinLedgerPanel
              title={locale === "en" ? "Recent coin ledger" : locale === "zh-TW" ? "最近球幣流水" : "最近球币流水"}
              locale={locale}
              entries={financeDashboard.recentLedgers}
            />
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
          {agentsNotice ? (
            <div
              className={`mt-6 rounded-[1.2rem] border px-4 py-3 text-sm ${
                error === "agents" ? "border-rose-300/25 bg-rose-400/10 text-rose-100" : "border-lime-300/20 bg-lime-300/10 text-lime-100"
              }`}
            >
              {agentsNotice}
            </div>
          ) : null}
          <AdminContentPaneNav
            title={locale === "en" ? "Agent lanes" : locale === "zh-TW" ? "代理招商子目錄" : "代理招商子目录"}
            description={
              locale === "en"
                ? "Separate automation, recruiting operations, and withdrawal settlement into shorter admin lanes."
                : locale === "zh-TW"
                  ? "把自動化、招商運營與提現結算拆成更短的代理子目錄。"
                  : "把自动化、招商运营与提现结算拆成更短的代理子目录。"
            }
            items={agentsPaneItems}
            activeKey={agentsSection}
          />
          <div className={showAgentsOverview ? "mt-6" : "hidden"}>
            <ExpansionMetricGrid items={agentsDashboard.metrics} />
          </div>
          <div className={showAgentsOverview ? "mt-6" : "hidden"}>
            <ExpansionMetricGrid items={agentsDashboard.performanceMetrics} />
          </div>
          <div className={showAgentsAutomation ? "mt-6 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5" : "hidden"}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="section-label">{locale === "en" ? "Automation" : locale === "zh-TW" ? "自動化運營" : "自动化运营"}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {locale === "en" ? "Agent ladder and weekly settlement" : locale === "zh-TW" ? "代理階梯與週結算" : "代理阶梯与周结算"}
                </h3>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">
                  {locale === "en"
                    ? "Run ladder synchronization, commission policy refresh, and weekly withdrawal creation from one runtime panel."
                    : locale === "zh-TW"
                      ? "在同一個面板中執行代理階梯同步、佣金策略刷新與週結算提現申請建立。"
                      : "在同一个面板中执行代理阶梯同步、佣金策略刷新与周结算提现申请建立。"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1.5 text-orange-100">
                  {locale === "en" ? "Weekly threshold" : locale === "zh-TW" ? "週結算門檻" : "周结算门槛"} {agentAutomationRuntime.weeklySettlementMinimum}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                  {locale === "en" ? "Policies" : locale === "zh-TW" ? "階梯策略" : "阶梯策略"} {agentAutomationRuntime.policies.length}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
              <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  {locale === "en" ? "Ladder policy" : locale === "zh-TW" ? "階梯規則" : "阶梯规则"}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {agentAutomationRuntime.policies.map((policy) => (
                    <div key={`agent-policy-${policy.level}`} className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-3">
                      <p className="font-medium text-white">{getAgentLevelLabel(policy.level, locale)}</p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-300">
                        <p>{locale === "en" ? "Direct" : locale === "zh-TW" ? "直推" : "直推"} {formatPercentValue(policy.directRate)}</p>
                        <p>{locale === "en" ? "Downstream" : locale === "zh-TW" ? "下級" : "下级"} {formatPercentValue(policy.downstreamRate)}</p>
                        <p>{locale === "en" ? "Min users" : locale === "zh-TW" ? "最低直推" : "最低直推"} {policy.minReferredUsers}</p>
                        <p>{locale === "en" ? "Min recharge" : locale === "zh-TW" ? "最低充值" : "最低充值"} CNY {formatAdminCoinAmount(policy.minMonthlyRecharge, displayLocale)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  {locale === "en" ? "Automation actions" : locale === "zh-TW" ? "自動化動作" : "自动化动作"}
                </p>
                <div className="mt-4 grid gap-3">
                  <form action="/api/admin/agents" method="post" className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-4">
                    <input type="hidden" name="intent" value="sync-agent-commission-policy" />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{locale === "en" ? "Sync commission policy" : locale === "zh-TW" ? "同步佣金策略" : "同步佣金策略"}</p>
                        <p className="mt-2 text-sm text-slate-400">
                          {locale === "en" ? "Refresh all agent rates from the current ladder table." : locale === "zh-TW" ? "按目前階梯表刷新所有代理的佣金比例。" : "按当前阶梯表刷新所有代理的佣金比例。"}
                        </p>
                      </div>
                      <button type="submit" className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                        {locale === "en" ? "Run now" : locale === "zh-TW" ? "立即執行" : "立即执行"}
                      </button>
                    </div>
                  </form>
                  <form action="/api/admin/agents" method="post" className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-4">
                    <input type="hidden" name="intent" value="run-agent-level-sync" />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{locale === "en" ? "Run ladder sync" : locale === "zh-TW" ? "執行階梯同步" : "执行阶梯同步"}</p>
                        <p className="mt-2 text-sm text-slate-400">
                          {locale === "en" ? "Promote or demote active agents according to referred users and monthly recharge thresholds." : locale === "zh-TW" ? "根據直推用戶與月充值門檻，自動升降活躍代理等級。" : "根据直推用户与月充值门槛，自动升降活跃代理等级。"}
                        </p>
                      </div>
                      <button type="submit" className="rounded-full border border-orange-300/20 bg-orange-300/10 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/35 hover:bg-orange-300/15">
                        {locale === "en" ? "Run sync" : locale === "zh-TW" ? "執行同步" : "执行同步"}
                      </button>
                    </div>
                  </form>
                  <form action="/api/admin/agents" method="post" className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-4">
                    <input type="hidden" name="intent" value="run-agent-weekly-settlement" />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{locale === "en" ? "Run weekly settlement" : locale === "zh-TW" ? "執行週結算" : "执行周结算"}</p>
                        <p className="mt-2 text-sm text-slate-400">
                          {locale === "en" ? "Create reviewing withdrawals for active agents over the weekly settlement threshold." : locale === "zh-TW" ? "為超過週結算門檻的活躍代理建立待審提現申請。" : "为超过周结算门槛的活跃代理建立待审提现申请。"}
                        </p>
                      </div>
                      <button type="submit" className="rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-sm text-sky-100 transition hover:border-sky-300/35 hover:bg-sky-300/15">
                        {locale === "en" ? "Create batch" : locale === "zh-TW" ? "建立批次" : "建立批次"}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-300">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {locale === "en" ? "Last level sync" : locale === "zh-TW" ? "最近階梯同步" : "最近阶梯同步"}
                    </p>
                    <p className="mt-2 font-medium text-white">
                      {agentAutomationRuntime.lastLevelSyncAt ? formatDateTime(agentAutomationRuntime.lastLevelSyncAt, displayLocale) : "--"}
                    </p>
                    {agentAutomationRuntime.lastLevelSyncDetail ? <p className="mt-2 text-xs text-slate-400">{agentAutomationRuntime.lastLevelSyncDetail}</p> : null}
                  </div>
                  <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-300">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {locale === "en" ? "Last weekly settlement" : locale === "zh-TW" ? "最近週結算" : "最近周结算"}
                    </p>
                    <p className="mt-2 font-medium text-white">
                      {agentAutomationRuntime.lastWeeklySettlementAt ? formatDateTime(agentAutomationRuntime.lastWeeklySettlementAt, displayLocale) : "--"}
                    </p>
                    {agentAutomationRuntime.lastWeeklySettlementDetail ? <p className="mt-2 text-xs text-slate-400">{agentAutomationRuntime.lastWeeklySettlementDetail}</p> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={showAgentsNetwork ? "mt-6 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5" : "hidden"}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-label">
                  {locale === "en" ? "Agent BI" : locale === "zh-TW" ? "代理 BI" : "代理 BI"}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {locale === "en" ? "Performance leaderboard" : locale === "zh-TW" ? "業績排行榜" : "业绩排行榜"}
                </h3>
              </div>
              <span className="text-sm text-slate-500">{agentsDashboard.performanceRecords.length}</span>
            </div>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {agentsDashboard.performanceRecords.map((item) => (
                <div key={`agent-performance-${item.agentId}`} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{item.agentName}</p>
                      <p className="mt-2 text-sm text-slate-400">
                        {getAgentLevelLabel(item.level, locale)} / {item.inviteCode}
                        {item.parentAgentName ? ` / ${locale === "en" ? "Parent" : locale === "zh-TW" ? "上級" : "上级"} ${item.parentAgentName}` : ""}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs ${getExpansionToneClass(item.totalCommissionNet > 0 ? "good" : "neutral")}`}>
                      CNY {formatAdminCoinAmount(item.totalCommissionNet, displayLocale)}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                      {locale === "en" ? "Direct users" : locale === "zh-TW" ? "直推用戶" : "直推用户"} {item.referredUsers}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                      {locale === "en" ? "Child agents" : locale === "zh-TW" ? "下級代理" : "下级代理"} {item.childAgents}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                      {locale === "en" ? "Direct orders" : locale === "zh-TW" ? "直推訂單" : "直推订单"} {item.directOrderCount}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                      {locale === "en" ? "Recharge" : locale === "zh-TW" ? "充值額" : "充值额"} CNY {formatAdminCoinAmount(item.directRechargeAmount, displayLocale)}
                    </span>
                    <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-lime-100">
                      {locale === "en" ? "Direct commission" : locale === "zh-TW" ? "直推佣金" : "直推佣金"} CNY {formatAdminCoinAmount(item.directCommissionNet, displayLocale)}
                    </span>
                    <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-cyan-100">
                      {locale === "en" ? "Downstream commission" : locale === "zh-TW" ? "下級分佣" : "下级分佣"} CNY {formatAdminCoinAmount(item.downstreamCommissionNet, displayLocale)}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                      {locale === "en" ? "Unsettled" : locale === "zh-TW" ? "待結算" : "待结算"} CNY {formatAdminCoinAmount(item.unsettledCommission, displayLocale)}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                      {locale === "en" ? "Settled withdrawal" : locale === "zh-TW" ? "已提現" : "已提现"} CNY {formatAdminCoinAmount(item.settledWithdrawalAmount, displayLocale)}
                    </span>
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-amber-100">
                      {locale === "en" ? "Pending payout" : locale === "zh-TW" ? "待打款" : "待打款"} CNY {formatAdminCoinAmount(item.pendingWithdrawalAmount, displayLocale)}
                    </span>
                  </div>
                </div>
              ))}
              {agentsDashboard.performanceRecords.length === 0 ? (
                <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400 xl:col-span-2">
                  {locale === "en" ? "No agent BI data yet." : locale === "zh-TW" ? "目前沒有代理 BI 數據。" : "当前没有代理 BI 数据。"}
                </div>
              ) : null}
            </div>
          </div>
          <div className={showAgentsNetwork ? "mt-6 grid gap-6 xl:grid-cols-2" : "hidden"}>
            <form action="/api/admin/agents" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">
                    {locale === "en" ? "Application intake" : locale === "zh-TW" ? "申請收件" : "申请收件"}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "Create agent application" : locale === "zh-TW" ? "新增代理申請" : "新增代理申请"}
                  </h3>
                </div>
                <span className="text-sm text-slate-500">
                  {locale === "en" ? "Write into approval queue" : locale === "zh-TW" ? "寫入待審清單" : "写入待审清单"}
                </span>
              </div>
              <input type="hidden" name="intent" value="save-application" />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Applicant name" : locale === "zh-TW" ? "申請人姓名" : "申请人姓名"}</span>
                  <input name="applicantName" required className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Phone" : locale === "zh-TW" ? "聯絡電話" : "联系电话"}</span>
                  <input name="phone" required className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Contact handle" : locale === "zh-TW" ? "聯絡方式" : "联系方式"}</span>
                  <input name="contact" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Desired level" : locale === "zh-TW" ? "申請級別" : "申请级别"}</span>
                  <select name="desiredLevel" defaultValue="level1" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="level1">{getAgentLevelLabel("level1", locale)}</option>
                    <option value="level2">{getAgentLevelLabel("level2", locale)}</option>
                    <option value="level3">{getAgentLevelLabel("level3", locale)}</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                  <span>{locale === "en" ? "Channel summary" : locale === "zh-TW" ? "渠道說明" : "渠道说明"}</span>
                  <textarea name="channelSummary" rows={3} required className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                  <span>{locale === "en" ? "Expected monthly users" : locale === "zh-TW" ? "預估月導量" : "预估月导量"}</span>
                  <input name="expectedMonthlyUsers" type="number" min="0" defaultValue="0" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
              </div>
              <button type="submit" className="mt-5 rounded-full border border-lime-300/25 bg-lime-300/10 px-4 py-2 text-sm text-lime-100 transition hover:border-lime-300/45 hover:bg-lime-300/20">
                {locale === "en" ? "Save application" : locale === "zh-TW" ? "保存申請" : "保存申请"}
              </button>
            </form>

            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminExpansion.agents.applications.title}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "Pending and reviewed applications" : locale === "zh-TW" ? "待審與已審申請" : "待审与已审申请"}
                  </h3>
                </div>
                <span className="text-sm text-slate-500">{agentsDashboard.applications.length}</span>
              </div>
              <div className="mt-5 grid gap-4">
                {agentsDashboard.applications.map((item) => {
                  const statusMeta = getApplicationStatusMeta(item.status, locale);
                  return (
                    <div key={item.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{item.applicantName}</p>
                          <p className="mt-2 text-sm text-slate-400">{item.phone}{item.contact ? ` / ${item.contact}` : ""}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs ${getExpansionToneClass(statusMeta.tone)}`}>{statusMeta.label}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{getAgentLevelLabel(item.desiredLevel, locale)}</span>
                        {item.expectedMonthlyUsers ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                            {locale === "en" ? "Expected" : locale === "zh-TW" ? "預估" : "预估"} {item.expectedMonthlyUsers}
                          </span>
                        ) : null}
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatDateTime(item.createdAt, displayLocale)}</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">{item.channelSummary}</p>
                      {item.reviewerNote ? <p className="mt-2 text-xs text-sky-100">{item.reviewerNote}</p> : null}
                      {item.status === "pending" ? (
                        <form action="/api/admin/agents" method="post" className="mt-4 grid gap-3">
                          <input type="hidden" name="intent" value="review-application" />
                          <input type="hidden" name="id" value={item.id} />
                          <div className="grid gap-3 md:grid-cols-2">
                            <select name="reviewAction" defaultValue="approve" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none">
                              <option value="approve">{locale === "en" ? "Approve and create agent" : locale === "zh-TW" ? "通過並建代理" : "通过并建代理"}</option>
                              <option value="needs-material">{locale === "en" ? "Need more info" : locale === "zh-TW" ? "要求補資料" : "要求补资料"}</option>
                              <option value="reject">{locale === "en" ? "Reject" : locale === "zh-TW" ? "拒絕" : "拒绝"}</option>
                            </select>
                            <select name="parentAgentId" defaultValue="" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none">
                              <option value="">{locale === "en" ? "No parent agent" : locale === "zh-TW" ? "無上級代理" : "无上级代理"}</option>
                              {agentsDashboard.agentOptions.map((agent) => (
                                <option key={`${item.id}-${agent.id}`} value={agent.id}>
                                  {agent.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <textarea name="reviewerNote" rows={2} placeholder={locale === "en" ? "Review note" : locale === "zh-TW" ? "審核備註" : "审核备注"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                          <button type="submit" className="w-fit rounded-full border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-sm text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-400/20">
                            {locale === "en" ? "Submit review" : locale === "zh-TW" ? "提交審核" : "提交审核"}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  );
                })}
                {agentsDashboard.applications.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                    {locale === "en" ? "No applications yet." : locale === "zh-TW" ? "目前沒有代理申請。" : "当前没有代理申请。"}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className={showAgentsNetwork ? "mt-6 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5" : "hidden"}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-label">{adminExpansion.agents.withdrawals.title}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {locale === "en" ? "Attributed recharge commissions" : locale === "zh-TW" ? "充值歸因佣金流水" : "充值归因佣金流水"}
                </h3>
              </div>
              <span className="text-sm text-slate-500">{agentsDashboard.commissionLedgers.length}</span>
            </div>
            <div className="mt-5 grid gap-4">
              {agentsDashboard.commissionLedgers.map((item) => {
                const statusMeta = getAgentCommissionStatusMeta(item.status, locale);

                return (
                  <div key={item.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{item.agentName}</p>
                        <p className="mt-2 text-sm text-slate-400">
                          {item.userDisplayName} / {item.userEmail}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs ${getExpansionToneClass(statusMeta.tone)}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                        {item.kind === "downstream"
                          ? locale === "en"
                            ? "Downstream commission"
                            : locale === "zh-TW"
                              ? "下級分佣"
                              : "下级分佣"
                          : locale === "en"
                            ? "Direct commission"
                            : locale === "zh-TW"
                              ? "直推佣金"
                              : "直推佣金"}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                        {item.rechargeOrderNo}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                        {locale === "en" ? "Recharge" : locale === "zh-TW" ? "充值額" : "充值额"} CNY {formatAdminCoinAmount(item.rechargeAmount, displayLocale)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                        {locale === "en" ? "Commission" : locale === "zh-TW" ? "佣金" : "佣金"} CNY {formatAdminCoinAmount(item.commissionAmount, displayLocale)}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                        {locale === "en" ? "Available" : locale === "zh-TW" ? "可結算" : "可结算"} CNY {formatAdminCoinAmount(item.availableAmount, displayLocale)}
                      </span>
                      {item.settledAmount > 0 ? (
                        <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-lime-100">
                          {locale === "en" ? "Settled" : locale === "zh-TW" ? "已結算" : "已结算"} CNY {formatAdminCoinAmount(item.settledAmount, displayLocale)}
                        </span>
                      ) : null}
                      {item.reversedAmount > 0 ? (
                        <span className="rounded-full border border-slate-300/20 bg-white/[0.04] px-3 py-1">
                          {locale === "en" ? "Reversed" : locale === "zh-TW" ? "已沖回" : "已冲回"} CNY {formatAdminCoinAmount(item.reversedAmount, displayLocale)}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                        {formatPercentValue(item.commissionRate)}
                      </span>
                      {item.sourceAgentName ? (
                        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-cyan-100">
                          {locale === "en" ? "From" : locale === "zh-TW" ? "來源代理" : "来源代理"} {item.sourceAgentName}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                        {formatDateTime(item.createdAt, displayLocale)}
                      </span>
                      {item.settledAt ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                          {locale === "en" ? "Settled" : locale === "zh-TW" ? "已結算" : "已结算"} {formatDateTime(item.settledAt, displayLocale)}
                        </span>
                      ) : null}
                      {item.reversedAt ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                          {locale === "en" ? "Reversed" : locale === "zh-TW" ? "已沖回" : "已冲回"} {formatDateTime(item.reversedAt, displayLocale)}
                        </span>
                      ) : null}
                    </div>
                    {item.note ? <p className="mt-3 text-sm text-slate-300">{item.note}</p> : null}
                  </div>
                );
              })}
              {agentsDashboard.commissionLedgers.length === 0 ? (
                <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                  {locale === "en"
                    ? "No attributed commission ledger yet. Use an invite link and complete a recharge order to generate one."
                    : locale === "zh-TW"
                      ? "目前沒有歸因佣金流水，可先使用邀請碼註冊並完成充值來生成。"
                      : "目前没有归因佣金流水，可先使用邀请码注册并完成充值来生成。"}
                </div>
              ) : null}
            </div>
          </div>
          <div className={showAgentsNetwork ? "mt-6 grid gap-6 xl:grid-cols-2" : "hidden"}>
            <form action="/api/admin/agents" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">
                    {locale === "en" ? "Lead pool" : locale === "zh-TW" ? "線索池" : "线索池"}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "Create recruitment lead" : locale === "zh-TW" ? "新增招商線索" : "新增招商线索"}
                  </h3>
                </div>
                <span className="text-sm text-slate-500">
                  {locale === "en" ? "Source, owner, and assignment" : locale === "zh-TW" ? "來源、歸屬與分配" : "来源、归属与分配"}
                </span>
              </div>
              <input type="hidden" name="intent" value="save-lead" />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Lead name" : locale === "zh-TW" ? "線索姓名" : "线索姓名"}</span>
                  <input name="name" required className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Phone" : locale === "zh-TW" ? "聯絡電話" : "联系电话"}</span>
                  <input name="phone" required className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Source channel" : locale === "zh-TW" ? "來源渠道" : "来源渠道"}</span>
                  <input name="sourceChannel" required className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Desired level" : locale === "zh-TW" ? "意向級別" : "意向级别"}</span>
                  <select name="desiredLevel" defaultValue="level1" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="level1">{getAgentLevelLabel("level1", locale)}</option>
                    <option value="level2">{getAgentLevelLabel("level2", locale)}</option>
                    <option value="level3">{getAgentLevelLabel("level3", locale)}</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Owner" : locale === "zh-TW" ? "跟進人" : "跟进人"}</span>
                  <input name="ownerName" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Campaign" : locale === "zh-TW" ? "所屬活動" : "所属活动"}</span>
                  <select name="campaignId" defaultValue="" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="">{locale === "en" ? "No campaign" : locale === "zh-TW" ? "無活動" : "无活动"}</option>
                    {agentsDashboard.campaignOptions.map((campaign) => (
                      <option key={`lead-campaign-${campaign.id}`} value={campaign.id}>
                        {campaign.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Assign agent" : locale === "zh-TW" ? "指派代理" : "指派代理"}</span>
                  <select name="agentId" defaultValue="" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="">{locale === "en" ? "Unassigned" : locale === "zh-TW" ? "未分配" : "未分配"}</option>
                    {agentsDashboard.agentOptions.map((agent) => (
                      <option key={`lead-agent-${agent.id}`} value={agent.id}>
                        {agent.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Status" : locale === "zh-TW" ? "狀態" : "状态"}</span>
                  <select name="status" defaultValue="new" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="new">{getLeadStatusMeta("new", locale).label}</option>
                    <option value="following">{getLeadStatusMeta("following", locale).label}</option>
                    <option value="won">{getLeadStatusMeta("won", locale).label}</option>
                    <option value="invalid">{getLeadStatusMeta("invalid", locale).label}</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                  <span>{locale === "en" ? "Notes" : locale === "zh-TW" ? "備註" : "备注"}</span>
                  <textarea name="note" rows={3} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
              </div>
              <button type="submit" className="mt-5 rounded-full border border-lime-300/25 bg-lime-300/10 px-4 py-2 text-sm text-lime-100 transition hover:border-lime-300/45 hover:bg-lime-300/20">
                {locale === "en" ? "Save lead" : locale === "zh-TW" ? "保存線索" : "保存线索"}
              </button>
            </form>

            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{locale === "en" ? "Lead pipeline" : locale === "zh-TW" ? "線索池" : "线索池"}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "Lead follow-up" : locale === "zh-TW" ? "線索跟進" : "线索跟进"}
                  </h3>
                </div>
                <span className="text-sm text-slate-500">{agentsDashboard.leads.length}</span>
              </div>
              <div className="mt-5 grid gap-4">
                {agentsDashboard.leads.map((lead) => {
                  const statusMeta = getLeadStatusMeta(lead.status, locale);
                  return (
                    <div key={lead.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{lead.name}</p>
                          <p className="mt-2 text-sm text-slate-400">{lead.phone} / {lead.sourceChannel}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs ${getExpansionToneClass(statusMeta.tone)}`}>{statusMeta.label}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{getAgentLevelLabel(lead.desiredLevel, locale)}</span>
                        {lead.ownerName ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{lead.ownerName}</span> : null}
                        {lead.campaignName ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{lead.campaignName}</span> : null}
                        {lead.agentName ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{lead.agentName}</span> : null}
                      </div>
                      {lead.note ? <p className="mt-3 text-sm text-slate-300">{lead.note}</p> : null}
                      <form action="/api/admin/agents" method="post" className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <input type="hidden" name="intent" value="save-lead" />
                        <input type="hidden" name="id" value={lead.id} />
                        <input type="hidden" name="name" value={lead.name} />
                        <input type="hidden" name="phone" value={lead.phone} />
                        <input type="hidden" name="sourceChannel" value={lead.sourceChannel} />
                        <input type="hidden" name="desiredLevel" value={lead.desiredLevel} />
                        <input type="hidden" name="campaignId" value={lead.campaignId ?? ""} />
                        <input type="hidden" name="agentId" value={lead.agentId ?? ""} />
                        <input type="hidden" name="note" value={lead.note ?? ""} />
                        <select name="status" defaultValue={lead.status} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none">
                          <option value="new">{getLeadStatusMeta("new", locale).label}</option>
                          <option value="following">{getLeadStatusMeta("following", locale).label}</option>
                          <option value="won">{getLeadStatusMeta("won", locale).label}</option>
                          <option value="invalid">{getLeadStatusMeta("invalid", locale).label}</option>
                        </select>
                        <input name="ownerName" defaultValue={lead.ownerName ?? ""} placeholder={locale === "en" ? "Owner" : locale === "zh-TW" ? "跟進人" : "跟进人"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                        <button type="submit" className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                          {locale === "en" ? "Update" : locale === "zh-TW" ? "更新" : "更新"}
                        </button>
                      </form>
                    </div>
                  );
                })}
                {agentsDashboard.leads.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                    {locale === "en" ? "No lead in the pool." : locale === "zh-TW" ? "線索池暫無資料。" : "线索池暂无资料。"}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className={showAgentsNetwork ? "mt-6 grid gap-6 xl:grid-cols-2" : "hidden"}>
            <form action="/api/admin/agents" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminExpansion.agents.campaigns.title}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "Create recruitment campaign" : locale === "zh-TW" ? "新增招商活動" : "新增招商活动"}
                  </h3>
                </div>
                <span className="text-sm text-slate-500">
                  {locale === "en" ? "Public recruiting and incentives" : locale === "zh-TW" ? "公開招募與激勵" : "公开招募与激励"}
                </span>
              </div>
              <input type="hidden" name="intent" value="save-campaign" />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                  <span>{locale === "en" ? "Campaign name" : locale === "zh-TW" ? "活動名稱" : "活动名称"}</span>
                  <input name="name" required className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Target agents" : locale === "zh-TW" ? "目標代理數" : "目标代理数"}</span>
                  <input name="targetAgentCount" type="number" min="0" defaultValue="10" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Status" : locale === "zh-TW" ? "狀態" : "状态"}</span>
                  <select name="status" defaultValue="draft" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="draft">{locale === "en" ? "Draft" : locale === "zh-TW" ? "草稿" : "草稿"}</option>
                    <option value="active">{locale === "en" ? "Active" : locale === "zh-TW" ? "進行中" : "进行中"}</option>
                    <option value="archived">{locale === "en" ? "Archived" : locale === "zh-TW" ? "已歸檔" : "已归档"}</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Start time" : locale === "zh-TW" ? "開始時間" : "开始时间"}</span>
                  <input name="startsAt" type="datetime-local" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "End time" : locale === "zh-TW" ? "結束時間" : "结束时间"}</span>
                  <input name="endsAt" type="datetime-local" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                  <span>{locale === "en" ? "Description" : locale === "zh-TW" ? "活動說明" : "活动说明"}</span>
                  <textarea name="description" rows={3} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                  <span>{locale === "en" ? "Incentive policy" : locale === "zh-TW" ? "激勵政策" : "激励政策"}</span>
                  <textarea name="incentivePolicy" rows={3} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-300 md:col-span-2">
                  <input type="checkbox" name="isPublic" className="h-4 w-4 rounded border border-white/15 bg-slate-950/60" />
                  <span>{locale === "en" ? "Visible to public recruitment page" : locale === "zh-TW" ? "同步到公開招募頁" : "同步到公开招募页"}</span>
                </label>
              </div>
              <button type="submit" className="mt-5 rounded-full border border-lime-300/25 bg-lime-300/10 px-4 py-2 text-sm text-lime-100 transition hover:border-lime-300/45 hover:bg-lime-300/20">
                {locale === "en" ? "Save campaign" : locale === "zh-TW" ? "保存活動" : "保存活动"}
              </button>
            </form>

            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminExpansion.agents.campaigns.title}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "Campaign list" : locale === "zh-TW" ? "活動列表" : "活动列表"}
                  </h3>
                </div>
                <span className="text-sm text-slate-500">{agentsDashboard.campaigns.length}</span>
              </div>
              <div className="mt-5 grid gap-4">
                {agentsDashboard.campaigns.map((item) => (
                  <div key={item.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{item.name}</p>
                        <p className="mt-2 text-sm text-slate-400">
                          {item.description || (locale === "en" ? "No description yet." : locale === "zh-TW" ? "尚未填寫活動說明。" : "尚未填写活动说明。")}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs ${getExpansionToneClass(item.status === "active" ? "good" : item.status === "archived" ? "neutral" : "warn")}`}>
                        {item.status === "active"
                          ? locale === "en"
                            ? "Active"
                            : locale === "zh-TW"
                              ? "進行中"
                              : "进行中"
                          : item.status === "archived"
                            ? locale === "en"
                              ? "Archived"
                              : locale === "zh-TW"
                                ? "已歸檔"
                                : "已归档"
                            : locale === "en"
                              ? "Draft"
                              : locale === "zh-TW"
                                ? "草稿"
                                : "草稿"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                        {locale === "en" ? "Target" : locale === "zh-TW" ? "目標" : "目标"} {item.targetAgentCount}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                        {locale === "en" ? "Leads" : locale === "zh-TW" ? "線索" : "线索"} {item.leadCount}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                        {item.isPublic
                          ? locale === "en"
                            ? "Public"
                            : locale === "zh-TW"
                              ? "公開"
                              : "公开"
                          : locale === "en"
                            ? "Private"
                            : locale === "zh-TW"
                              ? "私域"
                              : "私域"}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      {formatAnnouncementWindow(
                        item.startsAt,
                        item.endsAt,
                        displayLocale,
                        locale === "en" ? "Always available" : locale === "zh-TW" ? "長期有效" : "长期有效",
                      )}
                    </p>
                    {item.incentivePolicy ? <p className="mt-2 text-xs text-sky-100">{item.incentivePolicy}</p> : null}
                  </div>
                ))}
                {agentsDashboard.campaigns.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                    {locale === "en" ? "No campaign yet." : locale === "zh-TW" ? "目前沒有招商活動。" : "当前没有招商活动。"}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className={showAgentsWithdrawals ? "mt-6 grid gap-6 xl:grid-cols-2" : "hidden"}>
            <form action="/api/admin/agents" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminExpansion.agents.roster.title}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "Create manual agent profile" : locale === "zh-TW" ? "新增代理檔案" : "新增代理档案"}
                  </h3>
                </div>
                <span className="text-sm text-slate-500">
                  {locale === "en" ? "Invite code and commission settings" : locale === "zh-TW" ? "邀請碼與分佣配置" : "邀请码与分佣配置"}
                </span>
              </div>
              <input type="hidden" name="intent" value="save-agent" />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Display name" : locale === "zh-TW" ? "代理名稱" : "代理名称"}</span>
                  <input name="displayName" required className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Invite code" : locale === "zh-TW" ? "邀請碼" : "邀请码"}</span>
                  <input name="inviteCode" placeholder={locale === "en" ? "Auto generate when empty" : locale === "zh-TW" ? "留空自動生成" : "留空自动生成"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Level" : locale === "zh-TW" ? "級別" : "级别"}</span>
                  <select name="level" defaultValue="level1" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="level1">{getAgentLevelLabel("level1", locale)}</option>
                    <option value="level2">{getAgentLevelLabel("level2", locale)}</option>
                    <option value="level3">{getAgentLevelLabel("level3", locale)}</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Status" : locale === "zh-TW" ? "狀態" : "状态"}</span>
                  <select name="status" defaultValue="active" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="active">{getAgentStatusMeta("active", locale).label}</option>
                    <option value="frozen">{getAgentStatusMeta("frozen", locale).label}</option>
                    <option value="inactive">{getAgentStatusMeta("inactive", locale).label}</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Commission rate" : locale === "zh-TW" ? "直推分佣比" : "直推分佣比"}</span>
                  <input name="commissionRate" type="number" step="0.1" defaultValue="18" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Downstream rate" : locale === "zh-TW" ? "下級分佣比" : "下级分佣比"}</span>
                  <input name="downstreamRate" type="number" step="0.1" defaultValue="8" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Parent agent" : locale === "zh-TW" ? "上級代理" : "上级代理"}</span>
                  <select name="parentAgentId" defaultValue="" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="">{locale === "en" ? "Top level" : locale === "zh-TW" ? "頂級直屬" : "顶级直属"}</option>
                    {agentsDashboard.agentOptions.map((agent) => (
                      <option key={`create-agent-${agent.id}`} value={agent.id}>
                        {agent.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Contact name" : locale === "zh-TW" ? "聯絡人" : "联系人"}</span>
                  <input name="contactName" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Contact phone" : locale === "zh-TW" ? "聯絡電話" : "联系电话"}</span>
                  <input name="contactPhone" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Referred users" : locale === "zh-TW" ? "累計導入會員" : "累计导入会员"}</span>
                  <input name="totalReferredUsers" type="number" min="0" defaultValue="0" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Monthly recharge" : locale === "zh-TW" ? "月充值額" : "月充值额"}</span>
                  <input name="monthlyRechargeAmount" type="number" min="0" defaultValue="0" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Total commission" : locale === "zh-TW" ? "累計佣金" : "累计佣金"}</span>
                  <input name="totalCommission" type="number" min="0" defaultValue="0" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Unsettled commission" : locale === "zh-TW" ? "待結算佣金" : "待结算佣金"}</span>
                  <input name="unsettledCommission" type="number" min="0" defaultValue="0" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                  <span>{locale === "en" ? "Channel summary" : locale === "zh-TW" ? "渠道說明" : "渠道说明"}</span>
                  <textarea name="channelSummary" rows={3} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Payout account" : locale === "zh-TW" ? "收款帳戶" : "收款账户"}</span>
                  <input name="payoutAccount" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                  <span>{locale === "en" ? "Notes" : locale === "zh-TW" ? "備註" : "备注"}</span>
                  <textarea name="notes" rows={2} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
              </div>
              <button type="submit" className="mt-5 rounded-full border border-lime-300/25 bg-lime-300/10 px-4 py-2 text-sm text-lime-100 transition hover:border-lime-300/45 hover:bg-lime-300/20">
                {locale === "en" ? "Save agent profile" : locale === "zh-TW" ? "保存代理資料" : "保存代理资料"}
              </button>
            </form>

            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminExpansion.agents.roster.title}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "Agent roster and hierarchy" : locale === "zh-TW" ? "代理名冊與層級" : "代理名册与层级"}
                  </h3>
                </div>
                <span className="text-sm text-slate-500">{agentsDashboard.agents.length}</span>
              </div>
              <div className="mt-5 grid gap-4">
                {agentsDashboard.agents.map((agent) => {
                  const statusMeta = getAgentStatusMeta(agent.status, locale);
                  return (
                    <div key={agent.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{agent.displayName}</p>
                          <p className="mt-2 text-sm text-slate-400">
                            {getAgentLevelLabel(agent.level, locale)}
                            {agent.parentAgentName ? ` / ${agent.parentAgentName}` : ""}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs ${getExpansionToneClass(statusMeta.tone)}`}>{statusMeta.label}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Code {agent.inviteCode}</span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                          {locale === "en" ? "Direct" : locale === "zh-TW" ? "直推" : "直推"} {formatPercentValue(agent.commissionRate)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                          {locale === "en" ? "Downstream" : locale === "zh-TW" ? "下級" : "下级"} {formatPercentValue(agent.downstreamRate)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                          {locale === "en" ? "Users" : locale === "zh-TW" ? "會員" : "会员"} {agent.totalReferredUsers}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                        <p>{locale === "en" ? "Monthly recharge" : locale === "zh-TW" ? "月充值額" : "月充值额"}: CNY {formatAdminCoinAmount(agent.monthlyRechargeAmount, displayLocale)}</p>
                        <p>{locale === "en" ? "Unsettled commission" : locale === "zh-TW" ? "待結算佣金" : "待结算佣金"}: CNY {formatAdminCoinAmount(agent.unsettledCommission, displayLocale)}</p>
                        {agent.contactPhone ? <p>{locale === "en" ? "Contact" : locale === "zh-TW" ? "聯絡方式" : "联系方式"}: {agent.contactPhone}</p> : null}
                        {agent.payoutAccount ? <p>{locale === "en" ? "Payout account" : locale === "zh-TW" ? "收款帳戶" : "收款账户"}: {agent.payoutAccount}</p> : null}
                      </div>
                      {agent.inviteUrl ? <p className="mt-2 text-xs text-slate-500">{agent.inviteUrl}</p> : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <form action="/api/admin/agents" method="post">
                          <input type="hidden" name="intent" value="toggle-agent-status" />
                          <input type="hidden" name="id" value={agent.id} />
                          <button type="submit" className="rounded-full border border-white/12 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                            {agent.status === "active"
                              ? locale === "en"
                                ? "Freeze"
                                : locale === "zh-TW"
                                  ? "凍結"
                                  : "冻结"
                              : locale === "en"
                                ? "Restore"
                                : locale === "zh-TW"
                                  ? "恢復"
                                  : "恢复"}
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })}
                {agentsDashboard.agents.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                    {locale === "en" ? "No agent profile yet." : locale === "zh-TW" ? "目前沒有代理資料。" : "当前没有代理资料。"}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className={showAgentsWithdrawals ? "mt-6 grid gap-6 xl:grid-cols-2" : "hidden"}>
            <form action="/api/admin/agents" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminExpansion.agents.withdrawals.title}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "Create withdrawal request" : locale === "zh-TW" ? "新增提現申請" : "新增提现申请"}
                  </h3>
                </div>
                <span className="text-sm text-slate-500">
                  {locale === "en" ? "Commission payout review queue" : locale === "zh-TW" ? "佣金打款審核" : "佣金打款审核"}
                </span>
              </div>
              <input type="hidden" name="intent" value="save-withdrawal" />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                  <span>{locale === "en" ? "Agent" : locale === "zh-TW" ? "代理" : "代理"}</span>
                  <select name="agentId" defaultValue={agentsDashboard.agentOptions[0]?.id ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    {agentsDashboard.agentOptions.length === 0 ? (
                      <option value="">{locale === "en" ? "No agent available" : locale === "zh-TW" ? "暫無代理可選" : "暂无代理可选"}</option>
                    ) : null}
                    {agentsDashboard.agentOptions.map((agent) => (
                      <option key={`withdrawal-agent-${agent.id}`} value={agent.id}>
                        {agent.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Amount" : locale === "zh-TW" ? "金額" : "金额"}</span>
                  <input name="amount" type="number" min="1" defaultValue="1000" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Status" : locale === "zh-TW" ? "狀態" : "状态"}</span>
                  <select name="status" defaultValue="pending" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="pending">{getWithdrawalStatusMeta("pending", locale).label}</option>
                    <option value="reviewing">{getWithdrawalStatusMeta("reviewing", locale).label}</option>
                    <option value="paying">{getWithdrawalStatusMeta("paying", locale).label}</option>
                    <option value="settled">{getWithdrawalStatusMeta("settled", locale).label}</option>
                    <option value="rejected">{getWithdrawalStatusMeta("rejected", locale).label}</option>
                    <option value="frozen">{getWithdrawalStatusMeta("frozen", locale).label}</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                  <span>{locale === "en" ? "Payout account" : locale === "zh-TW" ? "打款帳戶" : "打款账户"}</span>
                  <input name="payoutAccount" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Payout channel" : locale === "zh-TW" ? "打款渠道" : "打款渠道"}</span>
                  <input name="payoutChannel" placeholder={locale === "en" ? "Bank / Alipay / USDT" : locale === "zh-TW" ? "銀行 / 支付寶 / USDT" : "银行 / 支付宝 / USDT"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300">
                  <span>{locale === "en" ? "Payout reference" : locale === "zh-TW" ? "打款流水號" : "打款流水号"}</span>
                  <input name="payoutReference" placeholder={locale === "en" ? "Manual payout reference" : locale === "zh-TW" ? "人工打款單號" : "人工打款单号"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                  <span>{locale === "en" ? "Payout operator" : locale === "zh-TW" ? "打款操作人" : "打款操作人"}</span>
                  <input name="payoutOperator" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                  <span>{locale === "en" ? "Proof URL" : locale === "zh-TW" ? "憑證 URL" : "凭证 URL"}</span>
                  <input name="proofUrl" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                  <span>{locale === "en" ? "Note" : locale === "zh-TW" ? "備註" : "备注"}</span>
                  <textarea name="note" rows={2} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
                  <span>{locale === "en" ? "Rejection reason" : locale === "zh-TW" ? "拒絕原因" : "拒绝原因"}</span>
                  <textarea name="rejectionReason" rows={2} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </label>
              </div>
              <button type="submit" className="mt-5 rounded-full border border-lime-300/25 bg-lime-300/10 px-4 py-2 text-sm text-lime-100 transition hover:border-lime-300/45 hover:bg-lime-300/20">
                {locale === "en" ? "Save withdrawal" : locale === "zh-TW" ? "保存提現申請" : "保存提现申请"}
              </button>
            </form>

            <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminExpansion.agents.withdrawals.title}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "Withdrawal review queue" : locale === "zh-TW" ? "提現審核隊列" : "提现审核队列"}
                  </h3>
                </div>
                <span className="text-sm text-slate-500">{agentsDashboard.withdrawals.length}</span>
              </div>
              <form action="/api/admin/agents" method="post" className="mt-5 rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                <input type="hidden" name="intent" value="batch-save-withdrawal" />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {locale === "en" ? "Batch payout writeback" : locale === "zh-TW" ? "批量打款回寫" : "批量打款回写"}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      {locale === "en"
                        ? "Select withdrawals or paste withdrawal IDs, then apply one payout status, reference, operator, and proof link to the whole batch."
                        : locale === "zh-TW"
                          ? "可勾選提現單或貼上提現 ID，對整批同步回寫打款狀態、流水號、操作人與憑證。"
                          : "可勾选提现单或粘贴提现 ID，对整批同步回写打款状态、流水号、操作人与凭证。"}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                    {locale === "en" ? "Ctrl/Cmd multi-select" : locale === "zh-TW" ? "支援 Ctrl/Cmd 多選" : "支持 Ctrl/Cmd 多选"}
                  </span>
                </div>
                <div className="mt-4 grid gap-4">
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-400">
                      {locale === "en" ? "Withdrawal queue" : locale === "zh-TW" ? "提現隊列" : "提现队列"}
                    </span>
                    <select
                      name="withdrawalIds"
                      multiple
                      size={Math.min(Math.max(agentsDashboard.withdrawals.length, 4), 8)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                    >
                      {agentsDashboard.withdrawals.map((item) => (
                        <option key={`withdrawal-batch-${item.id}`} value={item.id}>
                          {`${item.agentName} / ${item.id.slice(0, 8)} / CNY ${formatAdminCoinAmount(item.amount, displayLocale)} / ${getWithdrawalStatusMeta(item.status, locale).label}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-400">
                      {locale === "en" ? "Withdrawal refs" : locale === "zh-TW" ? "提現標識" : "提现标识"}
                    </span>
                    <textarea
                      name="batchRefs"
                      rows={3}
                      placeholder={
                        locale === "en"
                          ? "One withdrawal ID per line, optional when selecting above"
                          : locale === "zh-TW"
                            ? "每行一個提現 ID，不選上方清單時可直接貼上"
                            : "每行一个提现 ID，不选上方清单时可直接粘贴"
                      }
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                    />
                  </label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">{locale === "en" ? "Status" : locale === "zh-TW" ? "狀態" : "状态"}</span>
                      <select name="status" defaultValue="paying" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                        <option value="pending">{getWithdrawalStatusMeta("pending", locale).label}</option>
                        <option value="reviewing">{getWithdrawalStatusMeta("reviewing", locale).label}</option>
                        <option value="paying">{getWithdrawalStatusMeta("paying", locale).label}</option>
                        <option value="settled">{getWithdrawalStatusMeta("settled", locale).label}</option>
                        <option value="rejected">{getWithdrawalStatusMeta("rejected", locale).label}</option>
                        <option value="frozen">{getWithdrawalStatusMeta("frozen", locale).label}</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">{locale === "en" ? "Payout channel" : locale === "zh-TW" ? "打款渠道" : "打款渠道"}</span>
                      <input name="payoutChannel" placeholder={locale === "en" ? "Bank / Alipay / USDT" : locale === "zh-TW" ? "銀行 / 支付寶 / USDT" : "银行 / 支付宝 / USDT"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">{locale === "en" ? "Payout account" : locale === "zh-TW" ? "打款帳戶" : "打款账户"}</span>
                      <input name="payoutAccount" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">{locale === "en" ? "Payout batch no." : locale === "zh-TW" ? "打款批次號" : "打款批次号"}</span>
                      <input name="payoutBatchNo" placeholder={locale === "en" ? "Provider batch / bank batch" : locale === "zh-TW" ? "通道批次號 / 銀行批次號" : "通道批次号 / 银行批次号"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">{locale === "en" ? "Payout reference" : locale === "zh-TW" ? "打款流水號" : "打款流水号"}</span>
                      <input name="payoutReference" placeholder={locale === "en" ? "Batch payout reference" : locale === "zh-TW" ? "批次打款單號" : "批次打款单号"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">{locale === "en" ? "Payout operator" : locale === "zh-TW" ? "打款操作人" : "打款操作人"}</span>
                      <input name="payoutOperator" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">{locale === "en" ? "Proof URL" : locale === "zh-TW" ? "憑證 URL" : "凭证 URL"}</span>
                      <input name="proofUrl" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                    </label>
                  </div>
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-400">{locale === "en" ? "Batch note" : locale === "zh-TW" ? "批次備註" : "批次备注"}</span>
                    <textarea name="note" rows={2} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-400">{locale === "en" ? "Rejection reason" : locale === "zh-TW" ? "拒絕原因" : "拒绝原因"}</span>
                    <textarea name="rejectionReason" rows={2} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                  </label>
                </div>
                <button type="submit" className="mt-4 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 transition hover:border-cyan-300/45 hover:bg-cyan-300/20">
                  {locale === "en" ? "Run batch writeback" : locale === "zh-TW" ? "執行批量回寫" : "执行批量回写"}
                </button>
              </form>
              <div className="mt-4 rounded-[1.2rem] border border-amber-300/15 bg-amber-300/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="section-label">{locale === "en" ? "Exception queue" : locale === "zh-TW" ? "異常復核隊列" : "异常复核队列"}</p>
                    <p className="mt-2 text-sm text-amber-50/85">
                      {locale === "en"
                        ? "Use this queue to quickly spot withdrawals missing batch data, proofs, or callback confirmation."
                        : locale === "zh-TW"
                          ? "集中查看缺少批次號、憑證或回單異常的提現申請。"
                          : "集中查看缺少批次号、凭证或回单异常的提现申请。"}
                    </p>
                  </div>
                  <span className="rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs text-amber-50">
                    {agentsDashboard.withdrawalExceptions.length}
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  {agentsDashboard.withdrawalExceptions.slice(0, 8).map((item) => (
                    <div key={`withdrawal-exception-${item.exceptionType}-${item.id}`} className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{item.agentName}</p>
                          <p className="mt-1 text-sm text-amber-100">{item.exceptionLabel}</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-100">
                          {getWithdrawalStatusMeta(item.status, locale).label}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                          CNY {formatAdminCoinAmount(item.amount, displayLocale)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                          {formatDateTime(item.updatedAt, displayLocale)}
                        </span>
                        {item.payoutBatchNo ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{item.payoutBatchNo}</span> : null}
                        {item.callbackStatus ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{item.callbackStatus}</span> : null}
                      </div>
                    </div>
                  ))}
                  {agentsDashboard.withdrawalExceptions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-300">
                      {locale === "en" ? "No payout exceptions in the current queue." : locale === "zh-TW" ? "目前沒有待復核的打款異常。" : "当前没有待复核的打款异常。"}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 rounded-[1.2rem] border border-sky-300/15 bg-sky-400/10 p-4 text-sm text-sky-50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="section-label">
                      {locale === "en" ? "Payout callback" : locale === "zh-TW" ? "打款回調" : "打款回调"}
                    </p>
                    <p className="mt-2 text-sm text-sky-100/85">
                      {locale === "en"
                        ? "Use this internal endpoint for provider or script writeback after a payout batch is sent."
                        : locale === "zh-TW"
                          ? "打款批次送出後，可由供應商或內部腳本呼叫此介面回寫狀態。"
                          : "打款批次送出后，可由供应商或内部脚本调用此接口回写状态。"}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs ${agentPayoutRuntime.callbackTokenConfigured ? "bg-lime-300/15 text-lime-100" : "bg-rose-400/15 text-rose-100"}`}>
                    {locale === "en"
                      ? `Token ${agentPayoutRuntime.callbackTokenConfigured ? "ready" : "missing"}`
                      : locale === "zh-TW"
                        ? `令牌${agentPayoutRuntime.callbackTokenConfigured ? "已配置" : "未配置"}`
                        : `令牌${agentPayoutRuntime.callbackTokenConfigured ? "已配置" : "未配置"}`}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">
                      {locale === "en" ? "Endpoint" : locale === "zh-TW" ? "介面路徑" : "接口路径"}
                    </p>
                    <p className="mt-2 break-all font-medium">{agentPayoutRuntime.callbackPath}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">
                      {locale === "en" ? "Public URL" : locale === "zh-TW" ? "公開位址" : "公开地址"}
                    </p>
                    <p className="mt-2 break-all font-medium">{agentPayoutRuntime.callbackUrl}</p>
                    {!agentPayoutRuntime.callbackUrlConfigured ? (
                      <p className="mt-2 text-xs text-sky-100/70">
                        {locale === "en"
                          ? "Set AGENT_PAYOUT_CALLBACK_BASE_URL, PAYMENT_CALLBACK_BASE_URL, or SITE_URL after deployment."
                          : locale === "zh-TW"
                            ? "部署後請配置 AGENT_PAYOUT_CALLBACK_BASE_URL、PAYMENT_CALLBACK_BASE_URL 或 SITE_URL。"
                            : "部署后请配置 AGENT_PAYOUT_CALLBACK_BASE_URL、PAYMENT_CALLBACK_BASE_URL 或 SITE_URL。"}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-sky-100/70">
                      {locale === "en" ? "Auth header" : locale === "zh-TW" ? "鑑權方式" : "鉴权方式"}
                    </p>
                    <p className="mt-2 font-medium">
                      {agentPayoutRuntime.callbackAuthMode === "shared-token"
                        ? "Authorization: Bearer <token> / x-agent-payout-token"
                        : locale === "en"
                          ? "Disabled"
                          : locale === "zh-TW"
                            ? "未啟用"
                            : "未启用"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 grid gap-4">
                {agentsDashboard.withdrawals.map((item) => {
                  const statusMeta = getWithdrawalStatusMeta(item.status, locale);
                  return (
                    <div key={item.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{item.agentName}</p>
                          <p className="mt-2 text-sm text-slate-400">CNY {formatAdminCoinAmount(item.amount, displayLocale)}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs ${getExpansionToneClass(statusMeta.tone)}`}>{statusMeta.label}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatDateTime(item.requestedAt, displayLocale)}</span>
                        {item.payoutAccount ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{item.payoutAccount}</span> : null}
                        {item.payoutChannel ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{item.payoutChannel}</span> : null}
                        {item.payoutBatchNo ? (
                          <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-cyan-100">
                            {locale === "en" ? "Batch" : locale === "zh-TW" ? "批次" : "批次"} {item.payoutBatchNo}
                          </span>
                        ) : null}
                        {item.payoutReference ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{item.payoutReference}</span> : null}
                        {item.payoutOperator ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{item.payoutOperator}</span> : null}
                        {item.payoutRequestedAt ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                            {locale === "en" ? "Requested payout" : locale === "zh-TW" ? "已送打款" : "已送打款"} {formatDateTime(item.payoutRequestedAt, displayLocale)}
                          </span>
                        ) : null}
                        {item.callbackStatus ? (
                          <span className="rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1 text-lime-100">
                            {locale === "en" ? "Callback" : locale === "zh-TW" ? "回調" : "回调"} {item.callbackStatus}
                          </span>
                        ) : null}
                        {item.callbackReceivedAt ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                            {locale === "en" ? "Callback at" : locale === "zh-TW" ? "回調時間" : "回调时间"} {formatDateTime(item.callbackReceivedAt, displayLocale)}
                          </span>
                        ) : null}
                        {item.settledAt ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatDateTime(item.settledAt, displayLocale)}</span> : null}
                      </div>
                      {item.note ? <p className="mt-3 text-sm text-slate-300">{item.note}</p> : null}
                      {item.proofUrl ? (
                        <p className="mt-2 text-sm">
                          <a href={item.proofUrl} target="_blank" rel="noreferrer" className="text-cyan-300 transition hover:text-cyan-200">
                            {locale === "en" ? "Open payout proof" : locale === "zh-TW" ? "查看打款憑證" : "查看打款凭证"}
                          </a>
                        </p>
                      ) : null}
                      {item.callbackPayload ? (
                        <details className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                          <summary className="cursor-pointer list-none text-xs uppercase tracking-[0.16em] text-slate-400">
                            {locale === "en" ? "Callback payload" : locale === "zh-TW" ? "回調原文" : "回调原文"}
                          </summary>
                          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-6 text-slate-300">
                            {item.callbackPayload}
                          </pre>
                        </details>
                      ) : null}
                      {item.allocationCount > 0 ? (
                        <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                            <span>
                              {locale === "en"
                                ? `Allocations ${item.allocationCount}`
                                : locale === "zh-TW"
                                  ? `分配筆數 ${item.allocationCount}`
                                  : `分配笔数 ${item.allocationCount}`}
                            </span>
                            <span>
                              {locale === "en" ? "Allocated" : locale === "zh-TW" ? "已分配" : "已分配"} CNY {formatAdminCoinAmount(item.allocatedAmount, displayLocale)}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                            {item.allocationSummary.map((summary) => (
                              <span key={`${item.id}-${summary}`} className="rounded-full border border-white/8 bg-slate-950/60 px-3 py-1">
                                {summary}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {item.rejectionReason ? <p className="mt-2 text-xs text-rose-100">{item.rejectionReason}</p> : null}
                      <form action="/api/admin/agents" method="post" className="mt-4 grid gap-3">
                        <input type="hidden" name="intent" value="save-withdrawal" />
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="agentId" value={item.agentId} />
                        <input type="hidden" name="amount" value={item.amount} />
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                          <select name="status" defaultValue={item.status} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none">
                            <option value="pending">{getWithdrawalStatusMeta("pending", locale).label}</option>
                            <option value="reviewing">{getWithdrawalStatusMeta("reviewing", locale).label}</option>
                            <option value="paying">{getWithdrawalStatusMeta("paying", locale).label}</option>
                            <option value="settled">{getWithdrawalStatusMeta("settled", locale).label}</option>
                            <option value="rejected">{getWithdrawalStatusMeta("rejected", locale).label}</option>
                            <option value="frozen">{getWithdrawalStatusMeta("frozen", locale).label}</option>
                          </select>
                          <button type="submit" className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                            {locale === "en" ? "Update status" : locale === "zh-TW" ? "更新狀態" : "更新状态"}
                          </button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <input name="payoutAccount" defaultValue={item.payoutAccount ?? ""} placeholder={locale === "en" ? "Payout account" : locale === "zh-TW" ? "打款帳戶" : "打款账户"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                          <input name="payoutChannel" defaultValue={item.payoutChannel ?? ""} placeholder={locale === "en" ? "Payout channel" : locale === "zh-TW" ? "打款渠道" : "打款渠道"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                          <input name="payoutBatchNo" defaultValue={item.payoutBatchNo ?? ""} placeholder={locale === "en" ? "Payout batch no." : locale === "zh-TW" ? "打款批次號" : "打款批次号"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                          <input name="payoutReference" defaultValue={item.payoutReference ?? ""} placeholder={locale === "en" ? "Payout reference" : locale === "zh-TW" ? "打款流水號" : "打款流水号"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                          <input name="payoutOperator" defaultValue={item.payoutOperator ?? ""} placeholder={locale === "en" ? "Payout operator" : locale === "zh-TW" ? "打款操作人" : "打款操作人"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                        </div>
                        <input name="proofUrl" defaultValue={item.proofUrl ?? ""} placeholder={locale === "en" ? "Proof URL" : locale === "zh-TW" ? "憑證 URL" : "凭证 URL"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                        <textarea name="note" rows={2} defaultValue={item.note ?? ""} placeholder={locale === "en" ? "Review note" : locale === "zh-TW" ? "審核備註" : "审核备注"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                        <textarea name="rejectionReason" rows={2} defaultValue={item.rejectionReason ?? ""} placeholder={locale === "en" ? "Rejection reason" : locale === "zh-TW" ? "拒絕原因" : "拒绝原因"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                      </form>
                    </div>
                  );
                })}
                {agentsDashboard.withdrawals.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                    {locale === "en" ? "No withdrawal request yet." : locale === "zh-TW" ? "目前沒有提現申請。" : "当前没有提现申请。"}
                  </div>
                ) : null}
              </div>
            </div>
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
          {systemNotice ? (
            <div
              className={`mt-6 rounded-[1.2rem] border px-4 py-3 text-sm ${
                error === "system" ? "border-rose-300/25 bg-rose-400/10 text-rose-100" : "border-lime-300/20 bg-lime-300/10 text-lime-100"
              }`}
            >
              {systemNotice}
            </div>
          ) : null}
          <AdminContentPaneNav
            title={locale === "en" ? "System lanes" : locale === "zh-TW" ? "系統安全子目錄" : "系统安全子目录"}
            description={
              locale === "en"
                ? "Split security, alerts, and runtime configuration into shorter operating lanes, matching the content workspace pattern."
                : locale === "zh-TW"
                  ? "把安全、通知告警與運行配置拆成更短的系統子目錄，和內容管理保持一致。"
                  : "把安全、通知告警与运行配置拆成更短的系统子目录，和内容管理保持一致。"
            }
            items={systemPaneItems}
            activeKey={systemSection}
          />
          <div className={showSystemOverview ? "mt-6" : "hidden"}>
            <ExpansionMetricGrid items={systemDashboard.metrics} />
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className={showSystemSecurity ? "rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5" : "hidden"}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminExpansion.system.roleMatrix.title}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "RBAC policies" : locale === "zh-TW" ? "RBAC 策略" : "RBAC 策略"}
                  </h3>
                </div>
                <span className="text-sm text-slate-500">{systemDashboard.policies.length}</span>
              </div>
              <div className="mt-5 grid gap-4">
                {systemDashboard.policies.map((policy) => (
                  <form key={policy.id} action="/api/admin/system" method="post" className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                    <input type="hidden" name="intent" value="save-role-policy" />
                    <input type="hidden" name="role" value={policy.role} />
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{roleLabels[policy.role as keyof typeof roleLabels] ?? policy.role}</p>
                        <p className="mt-2 text-sm text-slate-400">{policy.description ?? (locale === "en" ? "Custom policy." : locale === "zh-TW" ? "自訂策略。" : "自定义策略。")}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs ${policy.canAccessAdminConsole ? "bg-lime-300/12 text-lime-100" : "bg-white/8 text-slate-300"}`}>
                        {policy.canAccessAdminConsole
                          ? locale === "en"
                            ? "Admin access"
                            : locale === "zh-TW"
                              ? "可進後台"
                              : "可进后台"
                          : locale === "en"
                            ? "Front only"
                            : locale === "zh-TW"
                              ? "前台角色"
                              : "前台角色"}
                      </span>
                    </div>
                    <input name="description" defaultValue={policy.description ?? ""} className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" name="canAccessAdminConsole" defaultChecked={policy.canAccessAdminConsole} className="h-4 w-4 rounded border border-white/15 bg-slate-950/60" /><span>Admin console</span></label>
                      <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" name="canManageContent" defaultChecked={policy.canManageContent} className="h-4 w-4 rounded border border-white/15 bg-slate-950/60" /><span>{locale === "en" ? "Content" : locale === "zh-TW" ? "內容" : "内容"}</span></label>
                      <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" name="canManageFinance" defaultChecked={policy.canManageFinance} className="h-4 w-4 rounded border border-white/15 bg-slate-950/60" /><span>{locale === "en" ? "Finance" : locale === "zh-TW" ? "財務" : "财务"}</span></label>
                      <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" name="canManageAgents" defaultChecked={policy.canManageAgents} className="h-4 w-4 rounded border border-white/15 bg-slate-950/60" /><span>{locale === "en" ? "Agents" : locale === "zh-TW" ? "代理" : "代理"}</span></label>
                      <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" name="canManageSystem" defaultChecked={policy.canManageSystem} className="h-4 w-4 rounded border border-white/15 bg-slate-950/60" /><span>{locale === "en" ? "System" : locale === "zh-TW" ? "系統" : "系统"}</span></label>
                      <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" name="canViewReports" defaultChecked={policy.canViewReports} className="h-4 w-4 rounded border border-white/15 bg-slate-950/60" /><span>{locale === "en" ? "Reports" : locale === "zh-TW" ? "報表" : "报表"}</span></label>
                    </div>
                    <button type="submit" className="mt-4 rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                      {locale === "en" ? "Save policy" : locale === "zh-TW" ? "保存策略" : "保存策略"}
                    </button>
                  </form>
                ))}
              </div>
            </div>

            <div className={showSystemSecurity ? "rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5" : "hidden"}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminExpansion.system.auditLogs.title}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "Recent audit trail" : locale === "zh-TW" ? "最近審計軌跡" : "最近审计轨迹"}
                  </h3>
                </div>
                <span className="text-sm text-slate-500">{systemDashboard.auditLogs.length}</span>
              </div>
              <div className="mt-5 grid gap-4">
                {systemDashboard.auditLogs.map((log) => (
                  <div key={log.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{log.actorDisplayName} / {roleLabels[log.actorRole as keyof typeof roleLabels] ?? log.actorRole}</p>
                        <p className="mt-2 text-sm text-slate-400">{log.action} / {log.scope}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs ${log.status === "success" ? "bg-lime-300/12 text-lime-100" : "bg-orange-300/12 text-orange-100"}`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatDateTime(log.createdAt, displayLocale)}</span>
                      {log.targetType ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{log.targetType}</span> : null}
                      {log.targetId ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{log.targetId}</span> : null}
                      {log.ipAddress ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{log.ipAddress}</span> : null}
                    </div>
                    {log.detail ? <p className="mt-3 text-sm text-slate-300">{log.detail}</p> : null}
                  </div>
                ))}
                {systemDashboard.auditLogs.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                    {locale === "en" ? "No audit logs yet." : locale === "zh-TW" ? "目前沒有審計日誌。" : "当前没有审计日志。"}
                  </div>
                ) : null}
              </div>
            </div>

            <div className={showSystemSecurity ? "rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5" : "hidden"}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="section-label">{locale === "en" ? "Audit retention" : locale === "zh-TW" ? "審計保留策略" : "审计保留策略"}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "Retention window and cleanup" : locale === "zh-TW" ? "保留窗口與清理" : "保留窗口与清理"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {locale === "en"
                      ? "Keep audit logs in UTC+0 and prune stale records with the current retention policy."
                      : locale === "zh-TW"
                        ? "以 UTC+0 為統一時區保留審計日誌，並按當前策略清理過期記錄。"
                        : "以 UTC+0 为统一时区保留审计日志，并按当前策略清理过期记录。"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                    {locale === "en" ? "Current retention" : locale === "zh-TW" ? "當前保留" : "当前保留"} {auditRetentionDaysValue}d
                  </span>
                  <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-sky-100">
                    {appVersionInfo.timezoneLabel}
                  </span>
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <form action="/api/admin/system" method="post" className="rounded-[1rem] border border-white/8 bg-slate-950/35 p-4">
                  <input type="hidden" name="intent" value="save-parameter" />
                  <input type="hidden" name="key" value="system.audit.retention_days" />
                  <input type="hidden" name="category" value={auditRetentionParameter?.category ?? "system"} />
                  <input type="hidden" name="description" value={auditRetentionParameter?.description ?? "Audit log retention window in days."} />
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-400">{locale === "en" ? "Retention days" : locale === "zh-TW" ? "保留天數" : "保留天数"}</span>
                    <input type="number" min="1" name="value" defaultValue={auditRetentionDaysValue} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                  </label>
                  <button type="submit" className="mt-4 rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                    {locale === "en" ? "Update policy" : locale === "zh-TW" ? "更新策略" : "更新策略"}
                  </button>
                </form>
                <form action="/api/admin/system" method="post" className="rounded-[1rem] border border-white/8 bg-slate-950/35 p-4">
                  <input type="hidden" name="intent" value="prune-audit-logs" />
                  <label className="space-y-2 text-sm">
                    <span className="text-slate-400">{locale === "en" ? "Run cleanup with days" : locale === "zh-TW" ? "按天數執行清理" : "按天数执行清理"}</span>
                    <input type="number" min="1" name="retentionDays" defaultValue={auditRetentionDaysValue} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                  </label>
                  <p className="mt-3 text-sm text-slate-400">
                    {locale === "en"
                      ? "Use this for immediate cleanup after policy changes or before log exports."
                      : locale === "zh-TW"
                        ? "策略調整後或導出前，可立即執行一次審計清理。"
                        : "策略调整后或导出前，可立即执行一次审计清理。"}
                  </p>
                  <button type="submit" className="mt-4 rounded-full border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm text-rose-100 transition hover:border-rose-300/35 hover:bg-rose-400/15">
                    {locale === "en" ? "Prune now" : locale === "zh-TW" ? "立即清理" : "立即清理"}
                  </button>
                </form>
              </div>
            </div>

            <div className={showSystemNotifications ? "rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5" : "hidden"}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminExpansion.system.alerts.title}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "Alert channels and incidents" : locale === "zh-TW" ? "告警通道與事件" : "告警通道与事件"}
                  </h3>
                </div>
                <span className="text-sm text-slate-500">{systemDashboard.alertEvents.length}</span>
              </div>
              <form action="/api/admin/system" method="post" className="mt-5 rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                <input type="hidden" name="intent" value="save-alert-channel" />
                <div className="grid gap-4 md:grid-cols-2">
                  <input name="name" placeholder={locale === "en" ? "Channel name" : locale === "zh-TW" ? "通道名稱" : "通道名称"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                  <input name="provider" placeholder="telegram / email / webhook" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                  <input name="target" placeholder={locale === "en" ? "Target address" : locale === "zh-TW" ? "目標地址" : "目标地址"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                  <input name="severityFilter" defaultValue="warn,error,critical" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                  <select name="status" defaultValue="active" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none">
                    <option value="active">{locale === "en" ? "Active" : locale === "zh-TW" ? "啟用" : "启用"}</option>
                    <option value="inactive">{locale === "en" ? "Inactive" : locale === "zh-TW" ? "停用" : "停用"}</option>
                  </select>
                  <input name="note" placeholder={locale === "en" ? "Note" : locale === "zh-TW" ? "備註" : "备注"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                </div>
                <button type="submit" className="mt-4 rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                  {locale === "en" ? "Save alert channel" : locale === "zh-TW" ? "保存告警通道" : "保存告警通道"}
                </button>
              </form>
              <form action="/api/admin/system" method="post" className="mt-4 rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                <input type="hidden" name="intent" value="save-alert-event" />
                <div className="grid gap-4 md:grid-cols-2">
                  <input name="source" placeholder={locale === "en" ? "Source" : locale === "zh-TW" ? "事件來源" : "事件来源"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                  <input name="title" placeholder={locale === "en" ? "Alert title" : locale === "zh-TW" ? "告警標題" : "告警标题"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                  <select name="severity" defaultValue="warn" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none">
                    <option value="info">Info</option>
                    <option value="warn">Warn</option>
                    <option value="error">Error</option>
                    <option value="critical">Critical</option>
                  </select>
                  <select name="channelId" defaultValue="" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none">
                    <option value="">{locale === "en" ? "No channel bind" : locale === "zh-TW" ? "不綁定通道" : "不绑定通道"}</option>
                    {systemDashboard.alertChannels.map((channel) => (
                      <option key={channel.id} value={channel.id}>{channel.name}</option>
                    ))}
                  </select>
                  <textarea name="message" rows={2} placeholder={locale === "en" ? "Alert message" : locale === "zh-TW" ? "告警內容" : "告警内容"} className="md:col-span-2 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                  <textarea name="detail" rows={2} placeholder={locale === "en" ? "Detail" : locale === "zh-TW" ? "詳細信息" : "详细信息"} className="md:col-span-2 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                </div>
                <button type="submit" className="mt-4 rounded-full border border-rose-300/25 bg-rose-400/10 px-4 py-2 text-sm text-rose-100 transition hover:border-rose-300/45 hover:bg-rose-400/20">
                  {locale === "en" ? "Create alert" : locale === "zh-TW" ? "建立告警" : "建立告警"}
                </button>
              </form>
              <div className="mt-4 grid gap-4">
                {systemDashboard.alertEvents.map((event) => (
                  <div key={event.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{event.title}</p>
                        <p className="mt-2 text-sm text-slate-400">{event.source} / {event.message}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs ${event.status === "resolved" ? "bg-lime-300/12 text-lime-100" : event.severity === "critical" || event.severity === "error" ? "bg-rose-400/12 text-rose-100" : "bg-orange-300/12 text-orange-100"}`}>
                        {event.status} / {event.severity}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatDateTime(event.createdAt, displayLocale)}</span>
                      {event.channelName ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{event.channelName}</span> : null}
                      {event.resolvedAt ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{formatDateTime(event.resolvedAt, displayLocale)}</span> : null}
                    </div>
                    {event.detail ? <p className="mt-3 text-sm text-slate-300">{event.detail}</p> : null}
                    {event.status !== "resolved" ? (
                      <form action="/api/admin/system" method="post" className="mt-4">
                        <input type="hidden" name="intent" value="resolve-alert-event" />
                        <input type="hidden" name="id" value={event.id} />
                        <button type="submit" className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                          {locale === "en" ? "Resolve" : locale === "zh-TW" ? "標記已解決" : "标记已解决"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className={showSystemNotifications ? "rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5 md:col-span-2" : "hidden"}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="section-label">{locale === "en" ? "Browser push" : locale === "zh-TW" ? "瀏覽器推送" : "浏览器推送"}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "Push campaign composer" : locale === "zh-TW" ? "推送活動編排" : "推送活动编排"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {locale === "en"
                      ? "Use notification permission + in-site message fanout to simulate campaign delivery before external push providers are connected."
                      : locale === "zh-TW"
                        ? "在外部推送供應商接入前，先用瀏覽器通知權限與站內消息分發完成推送運營閉環。"
                        : "在外部推送供应商接入前，先用浏览器通知权限与站内消息分发完成推送运营闭环。"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                    {locale === "en" ? "Devices" : locale === "zh-TW" ? "設備數" : "设备数"} {pushDashboard.totalDevices}
                  </span>
                  <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1.5 text-lime-100">
                    {locale === "en" ? "Granted" : locale === "zh-TW" ? "已授權" : "已授权"} {pushDashboard.grantedDevices}
                  </span>
                  <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-sky-100">
                    {locale === "en" ? "Active users" : locale === "zh-TW" ? "活躍用戶" : "活跃用户"} {pushDashboard.activeUsers}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
                <form action="/api/admin/system" method="post" className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">
                        {currentPushCampaign
                          ? locale === "en"
                            ? "Edit campaign"
                            : locale === "zh-TW"
                              ? "編輯活動"
                              : "编辑活动"
                          : locale === "en"
                            ? "Create campaign"
                            : locale === "zh-TW"
                              ? "新建活動"
                              : "新建活动"}
                      </p>
                    </div>
                    {currentPushCampaign ? (
                      <Link href={buildAdminSystemHref(systemRouteState, { systemSection })} className="text-sm text-slate-400 transition hover:text-white">
                        {adminPageCopy.shared.cancelEdit}
                      </Link>
                    ) : null}
                  </div>
                  <input type="hidden" name="intent" value="save-push-campaign" />
                  <input type="hidden" name="id" value={currentPushCampaign?.id ?? ""} />
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">Key</span>
                      <input type="text" name="key" defaultValue={currentPushCampaign?.key ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">{locale === "en" ? "Audience" : locale === "zh-TW" ? "受眾" : "受众"}</span>
                      <select name="audience" defaultValue={currentPushCampaign?.audience ?? "all"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                        <option value="all">{locale === "en" ? "All users" : locale === "zh-TW" ? "全部用戶" : "全部用户"}</option>
                        <option value="members">{locale === "en" ? "Members" : locale === "zh-TW" ? "會員" : "会员"}</option>
                        <option value="verified">{locale === "en" ? "Verified email" : locale === "zh-TW" ? "已驗證郵箱" : "已验证邮箱"}</option>
                        <option value="locale">{locale === "en" ? "Locale segment" : locale === "zh-TW" ? "按語言分群" : "按语言分群"}</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-sm md:col-span-2">
                      <span className="text-slate-400">{locale === "en" ? "Title" : locale === "zh-TW" ? "標題" : "标题"}</span>
                      <input type="text" name="title" defaultValue={currentPushCampaign?.title ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                    </label>
                    <label className="space-y-2 text-sm md:col-span-2">
                      <span className="text-slate-400">{locale === "en" ? "Message" : locale === "zh-TW" ? "消息內容" : "消息内容"}</span>
                      <textarea name="message" rows={4} defaultValue={currentPushCampaign?.message ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">{locale === "en" ? "Locale" : locale === "zh-TW" ? "語言" : "语言"}</span>
                      <select name="locale" defaultValue={currentPushCampaign?.locale ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                        <option value="">{locale === "en" ? "All locales" : locale === "zh-TW" ? "全部語言" : "全部语言"}</option>
                        <option value="zh-CN">zh-CN</option>
                        <option value="zh-TW">zh-TW</option>
                        <option value="en">en</option>
                        <option value="th">th</option>
                        <option value="vi">vi</option>
                        <option value="hi">hi</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">{locale === "en" ? "Status" : locale === "zh-TW" ? "狀態" : "状态"}</span>
                      <select name="status" defaultValue={currentPushCampaign?.status ?? "draft"} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                        <option value="draft">draft</option>
                        <option value="scheduled">scheduled</option>
                        <option value="sent">sent</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">{locale === "en" ? "Schedule at" : locale === "zh-TW" ? "預定發送時間" : "预定发送时间"}</span>
                      <input
                        type="datetime-local"
                        name="scheduledForAt"
                        defaultValue={toDateTimeLocalValue(currentPushCampaign?.scheduledForAt)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">Action href</span>
                      <input type="text" name="actionHref" defaultValue={currentPushCampaign?.actionHref ?? ""} placeholder="/member" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-slate-400">Action label</span>
                      <input type="text" name="actionLabel" defaultValue={currentPushCampaign?.actionLabel ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                    </label>
                  </div>
                  <button type="submit" className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
                    {locale === "en" ? "Save campaign" : locale === "zh-TW" ? "保存活動" : "保存活动"}
                  </button>
                </form>

                <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{locale === "en" ? "Campaign queue" : locale === "zh-TW" ? "活動隊列" : "活动队列"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {locale === "en"
                          ? "Cron can call /api/internal/system/push-campaigns/dispatch with SYSTEM_TRIGGER_TOKEN."
                          : locale === "zh-TW"
                            ? "伺服器 cron 可攜帶 SYSTEM_TRIGGER_TOKEN 呼叫 /api/internal/system/push-campaigns/dispatch。"
                            : "服务器 cron 可携带 SYSTEM_TRIGGER_TOKEN 调用 /api/internal/system/push-campaigns/dispatch。"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs text-sky-100">
                        {locale === "en" ? "Scheduled" : locale === "zh-TW" ? "待派發" : "待派发"} {scheduledPushCampaignCount}
                      </span>
                      <span className="text-sm text-slate-500">{pushDashboard.campaigns.length}</span>
                    </div>
                  </div>
                  <form action="/api/admin/system" method="post" className="mt-4 flex flex-wrap items-center gap-3 rounded-[1rem] border border-white/8 bg-white/[0.03] p-3">
                    <input type="hidden" name="intent" value="dispatch-scheduled-push-campaigns" />
                    <input type="hidden" name="limit" value="20" />
                    <button type="submit" className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-sm text-sky-100 transition hover:border-sky-300/35 hover:bg-sky-300/15">
                      {locale === "en" ? "Dispatch due scheduled campaigns" : locale === "zh-TW" ? "派發到時活動" : "派发到时活动"}
                    </button>
                    <span className="text-xs text-slate-500">
                      {locale === "en"
                        ? "Runs the same dispatcher used by the internal cron endpoint."
                        : locale === "zh-TW"
                          ? "與內部 cron 入口共用同一套派發邏輯。"
                          : "与内部 cron 入口共用同一套派发逻辑。"}
                    </span>
                  </form>
                  <div className="mt-4 grid gap-4">
                    {pushDashboard.campaigns.map((campaign) => (
                      <div key={campaign.id} className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">{campaign.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {campaign.key} | {campaign.audience}
                              {campaign.locale ? ` | ${campaign.locale}` : ""}
                            </p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs ${
                            campaign.status === "sent"
                              ? "bg-lime-300/12 text-lime-100"
                              : campaign.status === "cancelled"
                                ? "bg-white/8 text-slate-300"
                                : "bg-orange-300/12 text-orange-100"
                          }`}>
                            {campaign.status}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-slate-300">{campaign.message}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                            {locale === "en" ? "Targets" : locale === "zh-TW" ? "目標數" : "目标数"} {campaign.targetCount}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                            {locale === "en" ? "Delivered" : locale === "zh-TW" ? "已送達" : "已送达"} {campaign.deliveredCount}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                            {formatDateTime(campaign.createdAt, displayLocale)}
                          </span>
                          {campaign.scheduledForAt ? (
                            <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-sky-100">
                              {locale === "en" ? "Schedule" : locale === "zh-TW" ? "排程" : "排程"} {formatDateTime(campaign.scheduledForAt, displayLocale)}
                            </span>
                          ) : null}
                          {campaign.sentAt ? (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                              {locale === "en" ? "Sent" : locale === "zh-TW" ? "已發送" : "已发送"} {formatDateTime(campaign.sentAt, displayLocale)}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <Link href={buildAdminSystemHref(systemRouteState, { systemSection, editPushCampaign: campaign.id })} className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/30">
                            {locale === "en" ? "Edit" : locale === "zh-TW" ? "編輯" : "编辑"}
                          </Link>
                          {campaign.status !== "sent" ? (
                            <form action="/api/admin/system" method="post">
                              <input type="hidden" name="intent" value="send-push-campaign" />
                              <input type="hidden" name="id" value={campaign.id} />
                              <button type="submit" className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-sm text-sky-100 transition hover:border-sky-300/35 hover:bg-sky-300/15">
                                {locale === "en" ? "Send" : locale === "zh-TW" ? "發送" : "发送"}
                              </button>
                            </form>
                          ) : null}
                          {campaign.status !== "cancelled" ? (
                            <form action="/api/admin/system" method="post">
                              <input type="hidden" name="intent" value="cancel-push-campaign" />
                              <input type="hidden" name="id" value={campaign.id} />
                              <button type="submit" className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-rose-300/30 hover:text-white">
                                {locale === "en" ? "Cancel" : locale === "zh-TW" ? "取消" : "取消"}
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {pushDashboard.campaigns.length === 0 ? (
                      <div className="rounded-[1rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-400">
                        {locale === "en" ? "No push campaigns yet." : locale === "zh-TW" ? "目前沒有推送活動。" : "当前没有推送活动。"}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className={showSystemRuntime ? "rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5" : "hidden"}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="section-label">{locale === "en" ? "AI assistant" : locale === "zh-TW" ? "AI 助手" : "AI 助手"}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "Model & provider settings" : locale === "zh-TW" ? "模型與服務商設定" : "模型与服务商设置"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {locale === "en"
                      ? "Configure the AI model used by the floating assistant. Supports any OpenAI-compatible relay."
                      : locale === "zh-TW"
                        ? "設定浮動助手使用的 AI 模型，支援任何 OpenAI 相容中轉站。"
                        : "配置浮动助手使用的 AI 模型，支持任何 OpenAI 兼容中转站。"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className={`rounded-full border px-3 py-1.5 ${aiEnabled ? "border-lime-300/20 bg-lime-300/10 text-lime-100" : "border-white/10 bg-white/[0.04] text-slate-400"}`}>
                    {aiEnabled ? (locale === "en" ? "AI enabled" : "AI 已启用") : (locale === "en" ? "AI disabled" : "AI 已禁用")}
                  </span>
                  {aiEnabled && (
                    <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-sky-100">{aiCurrentModel}</span>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {/* Enable/disable toggle */}
                {aiAssistantParams.enabled ? (
                  <form action="/api/admin/system" method="post" className="rounded-[1rem] border border-white/8 bg-slate-950/35 p-4">
                    <input type="hidden" name="intent" value="save-parameter" />
                    <input type="hidden" name="key" value="assistant.ai.enabled" />
                    <input type="hidden" name="category" value="assistant" />
                    <input type="hidden" name="description" value={aiAssistantParams.enabled.description ?? ""} />
                    <p className="font-medium text-white">{locale === "en" ? "AI enabled" : locale === "zh-TW" ? "啟用 AI" : "启用 AI"}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {locale === "en" ? "Toggle AI-powered replies. Disabled falls back to keyword matching." : locale === "zh-TW" ? "關閉後退回關鍵詞匹配模式。" : "关闭后退回关键词匹配模式。"}
                    </p>
                    <select
                      name="value"
                      defaultValue={aiEnabled ? "true" : "false"}
                      className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
                    >
                      <option value="true">{locale === "en" ? "Enabled" : "启用"}</option>
                      <option value="false">{locale === "en" ? "Disabled" : "禁用"}</option>
                    </select>
                    <div className="mt-3 flex justify-end">
                      <button type="submit" className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                        {locale === "en" ? "Update" : "更新"}
                      </button>
                    </div>
                  </form>
                ) : null}

                {/* Model selector */}
                {aiAssistantParams.model ? (
                  <form action="/api/admin/system" method="post" className="rounded-[1rem] border border-white/8 bg-slate-950/35 p-4">
                    <input type="hidden" name="intent" value="save-parameter" />
                    <input type="hidden" name="key" value="assistant.ai.model" />
                    <input type="hidden" name="category" value="assistant" />
                    <input type="hidden" name="description" value={aiAssistantParams.model.description ?? ""} />
                    <p className="font-medium text-white">{locale === "en" ? "AI model" : locale === "zh-TW" ? "AI 模型" : "AI 模型"}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {locale === "en" ? "Select a preset or type a custom model name." : locale === "zh-TW" ? "選擇預設模型或輸入自訂模型名稱。" : "选择预设模型或输入自定义模型名称。"}
                    </p>
                    <select
                      id="ai-model-preset"
                      defaultValue={["gpt-5.4-mini", "gemini-2.0-flash-preview", "deepseek-v3.2"].includes(aiCurrentModel) ? aiCurrentModel : "custom"}
                      className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
                      onChange={undefined}
                    >
                      <option value="gpt-5.4-mini">gpt-5.4-mini</option>
                      <option value="gemini-2.0-flash-preview">gemini-2.0-flash-preview</option>
                      <option value="deepseek-v3.2">deepseek-v3.2</option>
                      {!["gpt-5.4-mini", "gemini-2.0-flash-preview", "deepseek-v3.2"].includes(aiCurrentModel) && (
                        <option value={aiCurrentModel}>{aiCurrentModel} (current)</option>
                      )}
                    </select>
                    <p className="mt-3 text-xs text-slate-500">
                      {locale === "en" ? "Custom model name (overrides dropdown):" : locale === "zh-TW" ? "自訂模型名稱（覆蓋下拉選項）：" : "自定义模型名称（覆盖下拉选项）："}
                    </p>
                    <input
                      id="ai-model-input"
                      name="value"
                      defaultValue={aiCurrentModel}
                      placeholder="e.g. gpt-4o-mini, claude-3-haiku"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
                    />
                    {/* eslint-disable-next-line @next/next/no-sync-scripts */}
                    <script dangerouslySetInnerHTML={{ __html: `(function(){var s=document.getElementById('ai-model-preset'),i=document.getElementById('ai-model-input');if(s&&i){s.addEventListener('change',function(){i.value=s.value;})}})();` }} />
                    <div className="mt-3 flex justify-end">
                      <button type="submit" className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                        {locale === "en" ? "Update" : "更新"}
                      </button>
                    </div>
                  </form>
                ) : null}

                {/* Base URL */}
                {aiAssistantParams.baseUrl ? (
                  <form action="/api/admin/system" method="post" className="rounded-[1rem] border border-white/8 bg-slate-950/35 p-4">
                    <input type="hidden" name="intent" value="save-parameter" />
                    <input type="hidden" name="key" value="assistant.ai.base_url" />
                    <input type="hidden" name="category" value="assistant" />
                    <input type="hidden" name="description" value={aiAssistantParams.baseUrl.description ?? ""} />
                    <p className="font-medium text-white">{locale === "en" ? "API base URL" : locale === "zh-TW" ? "API 基礎地址" : "API 基础地址"}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {locale === "en"
                        ? "OpenAI-compatible endpoint. For Gemini models, use the tu-zi.com v1beta relay."
                        : locale === "zh-TW"
                          ? "OpenAI 相容端點。Gemini 模型請使用 v1beta 中轉地址。"
                          : "OpenAI 兼容端点。Gemini 模型请使用 v1beta 中转地址。"}
                    </p>
                    <select
                      id="ai-baseurl-preset"
                      className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
                      defaultValue=""
                    >
                      <option value="" disabled>{locale === "en" ? "— Quick presets —" : "— 快速预设 —"}</option>
                      <option value="https://api.tu-zi.com/v1">tu-zi.com /v1 (GPT / DeepSeek)</option>
                      <option value="https://api.tu-zi.com/v1beta">tu-zi.com /v1beta (Gemini)</option>
                      <option value="https://api.openai.com/v1">api.openai.com /v1 (official)</option>
                    </select>
                    <input
                      id="ai-baseurl-input"
                      name="value"
                      defaultValue={aiAssistantParams.baseUrl.value}
                      placeholder="https://api.tu-zi.com/v1"
                      className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
                    />
                    {/* eslint-disable-next-line @next/next/no-sync-scripts */}
                    <script dangerouslySetInnerHTML={{ __html: `(function(){var s=document.getElementById('ai-baseurl-preset'),i=document.getElementById('ai-baseurl-input');if(s&&i){s.addEventListener('change',function(){if(s.value)i.value=s.value;})}})();` }} />
                    <div className="mt-3 flex justify-end">
                      <button type="submit" className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                        {locale === "en" ? "Update" : "更新"}
                      </button>
                    </div>
                  </form>
                ) : null}

                {/* API Key */}
                {aiAssistantParams.apiKey ? (
                  <form action="/api/admin/system" method="post" className="rounded-[1rem] border border-white/8 bg-slate-950/35 p-4">
                    <input type="hidden" name="intent" value="save-parameter" />
                    <input type="hidden" name="key" value="assistant.ai.api_key" />
                    <input type="hidden" name="category" value="assistant" />
                    <input type="hidden" name="description" value={aiAssistantParams.apiKey.description ?? ""} />
                    <p className="font-medium text-white">{locale === "en" ? "API key" : locale === "zh-TW" ? "API 金鑰" : "API 密钥"}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {locale === "en"
                        ? "Stored in the database. Takes precedence over the OPENAI_API_KEY environment variable."
                        : locale === "zh-TW"
                          ? "存入資料庫，優先於環境變數 OPENAI_API_KEY。"
                          : "存入数据库，优先于环境变量 OPENAI_API_KEY。"}
                    </p>
                    <input
                      name="value"
                      type="password"
                      defaultValue={aiAssistantParams.apiKey.value}
                      placeholder="sk-..."
                      className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-500">
                        {aiAssistantParams.apiKey.value ? (locale === "en" ? "Key is set" : "密钥已设置") : (locale === "en" ? "No key set" : "未设置密钥")}
                      </span>
                      <button type="submit" className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                        {locale === "en" ? "Update" : "更新"}
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            </div>

            <div className={showSystemRuntime ? "rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5 md:col-span-2" : "hidden"}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="section-label">{locale === "en" ? "App runtime" : locale === "zh-TW" ? "應用版本控制" : "应用版本控制"}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "Version, hot update, and timezone facade" : locale === "zh-TW" ? "版本、熱更新與時區面板" : "版本、热更新与时区面板"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {locale === "en"
                      ? "Structured controls for the app version API and H5 shell compatibility, without digging into raw parameters first."
                      : locale === "zh-TW"
                        ? "在不先翻原始參數表的前提下，直接維護版本 API、H5 殼兼容與站點時區策略。"
                        : "在不先翻原始参数表的前提下，直接维护版本 API、H5 壳兼容与站点时区策略。"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">v{appVersionInfo.currentVersion}</span>
                  <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-sky-100">{appVersionInfo.releaseChannel}</span>
                  <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1.5 text-orange-100">{appVersionInfo.timezoneLabel}</span>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                <div className="rounded-[1rem] border border-white/8 bg-slate-950/35 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{locale === "en" ? "Current build" : locale === "zh-TW" ? "當前版本" : "当前版本"}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">v{appVersionInfo.currentVersion}</p>
                  <p className="mt-2 text-sm text-slate-400">{appVersionInfo.updateNotes}</p>
                </div>
                <div className="rounded-[1rem] border border-white/8 bg-slate-950/35 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{locale === "en" ? "Hot update" : locale === "zh-TW" ? "熱更新版本" : "热更新版本"}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{appVersionInfo.hotUpdateVersion}</p>
                  <p className="mt-2 text-sm text-slate-400">{appVersionInfo.updateStrategy}</p>
                </div>
                <div className="rounded-[1rem] border border-white/8 bg-slate-950/35 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{locale === "en" ? "Minimum support" : locale === "zh-TW" ? "最低支持版本" : "最低支持版本"}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{appVersionInfo.minimumSupportedVersion}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    {appVersionInfo.forceUpdate
                      ? locale === "en"
                        ? "Force update enabled"
                        : locale === "zh-TW"
                          ? "已開啟強制更新"
                          : "已开启强制更新"
                      : locale === "en"
                        ? "Soft update only"
                        : locale === "zh-TW"
                          ? "目前為柔性升級"
                          : "目前为柔性升级"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                {curatedAppParameters.map((parameter) => (
                  <form key={parameter.id} action="/api/admin/system" method="post" className="rounded-[1rem] border border-white/8 bg-slate-950/35 p-4">
                    <input type="hidden" name="intent" value="save-parameter" />
                    <input type="hidden" name="key" value={parameter.key} />
                    <input type="hidden" name="category" value={parameter.category} />
                    <input type="hidden" name="description" value={parameter.description ?? ""} />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{parameter.key}</p>
                        <p className="mt-2 text-sm text-slate-400">{parameter.description ?? parameter.category}</p>
                      </div>
                      <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{parameter.category}</span>
                    </div>
                    {isBooleanSystemParameterKey(parameter.key) ? (
                      <select
                        name="value"
                        defaultValue={parameter.value.toLowerCase() === "false" ? "false" : "true"}
                        className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : isTextareaSystemParameterKey(parameter.key) ? (
                      <textarea
                        name="value"
                        rows={4}
                        defaultValue={parameter.value}
                        className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none"
                      />
                    ) : (
                      <input name="value" defaultValue={parameter.value} className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                    )}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-slate-500">{formatDateTime(parameter.updatedAt, displayLocale)}</span>
                      <button type="submit" className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                        {locale === "en" ? "Update" : locale === "zh-TW" ? "更新" : "更新"}
                      </button>
                    </div>
                  </form>
                ))}
              </div>
            </div>

            <div className={showSystemRuntime ? "rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5" : "hidden"}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{adminExpansion.system.parameters.title}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {locale === "en" ? "System parameters" : locale === "zh-TW" ? "系統參數" : "系统参数"}
                  </h3>
                </div>
                <span className="text-sm text-slate-500">{systemDashboard.parameters.length}</span>
              </div>
              <form action="/api/admin/system" method="post" className="mt-5 rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                <input type="hidden" name="intent" value="save-parameter" />
                <div className="grid gap-4 md:grid-cols-2">
                  <input name="key" placeholder="reports.export_limit" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                  <input name="category" placeholder={locale === "en" ? "Category" : locale === "zh-TW" ? "分類" : "分类"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                  <input name="value" placeholder={locale === "en" ? "Value" : locale === "zh-TW" ? "值" : "值"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none md:col-span-2" />
                  <textarea name="description" rows={2} placeholder={locale === "en" ? "Description" : locale === "zh-TW" ? "說明" : "说明"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none md:col-span-2" />
                </div>
                <button type="submit" className="mt-4 rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                  {locale === "en" ? "Save parameter" : locale === "zh-TW" ? "保存參數" : "保存参数"}
                </button>
              </form>
              <div className="mt-4 grid gap-4">
                {systemDashboard.parameters.map((item) => (
                  <form key={item.id} action="/api/admin/system" method="post" className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                    <input type="hidden" name="intent" value="save-parameter" />
                    <input type="hidden" name="key" value={item.key} />
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{item.key}</p>
                        <p className="mt-2 text-sm text-slate-400">{item.description ?? item.category}</p>
                      </div>
                      <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{item.category}</span>
                    </div>
                    <input name="value" defaultValue={item.value} className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input name="category" defaultValue={item.category} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                      <input name="description" defaultValue={item.description ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-slate-500">{formatDateTime(item.updatedAt, displayLocale)}</span>
                      <button type="submit" className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                        {locale === "en" ? "Update" : locale === "zh-TW" ? "更新" : "更新"}
                      </button>
                    </div>
                  </form>
                ))}
              </div>
            </div>
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
          {reportNotice ? (
            <div
              className={`mt-6 rounded-[1.2rem] border px-4 py-3 text-sm ${
                error === "report-export-task" || reportTaskStatus === "failed"
                  ? "border-rose-300/25 bg-rose-400/10 text-rose-100"
                  : "border-lime-300/20 bg-lime-300/10 text-lime-100"
              }`}
            >
              {reportNotice}
              {reportTaskId ? (
                <span className="ml-2 text-xs text-current/80">
                  ID: {reportTaskId}
                </span>
              ) : null}
            </div>
          ) : null}
          <AdminContentPaneNav
            title={locale === "en" ? "Report lanes" : locale === "zh-TW" ? "報表中心子目錄" : "报表中心子目录"}
            description={
              locale === "en"
                ? "Break the report dashboard into overview, trends, breakdowns, and exports so operators can jump to the exact layer they need."
                : locale === "zh-TW"
                  ? "把報表中心拆成總覽、趨勢、拆分分析與匯出中心，方便直接跳到需要的層級。"
                  : "把报表中心拆成总览、趋势、拆分分析与导出中心，方便直接跳到需要的层级。"
            }
            items={reportsPaneItems}
            activeKey={reportsSection}
          />
          <div className={showReportsOverview ? "mt-6" : "hidden"}>
            <ExpansionMetricGrid items={reportsDashboard.metrics} />
          </div>
          <div className={showReportsOverview ? "mt-6" : "hidden"}>
            <ExpansionMetricGrid items={reportsDashboard.agentBiMetrics} />
          </div>
          <div className={showReportsTrends ? "mt-6" : "hidden"}>
            <ReportsTrendCardsPanel
              locale={locale}
              reportsWindow={reportsWindow}
              trendCards={reportsDashboard.trendCards}
              buildWindowHref={(windowValue) =>
                buildAdminReportsHref(reportsRouteState, {
                  reportsSection,
                  reportsWindow: windowValue,
                })
              }
            />
          </div>
          <div className={showReportsTrends ? "mt-6 grid gap-6 xl:grid-cols-2" : "hidden"}>
            <ExpansionRowsPanel
              title={locale === "en" ? "Long-range aggregates" : locale === "zh-TW" ? "長週期聚合" : "长周期聚合"}
              rows={reportsDashboard.longRangeRows}
            />
          </div>
          <div className={showReportsBreakdowns ? "mt-6 grid gap-6 xl:grid-cols-3" : "hidden"}>
            {reportsDashboard.breakdownSections.map((section) => (
              <ExpansionRowsPanel
                key={section.key}
                title={section.title}
                description={section.description}
                rows={section.rows}
              />
            ))}
          </div>
          <div className={showReportsBreakdowns ? "mt-6 grid gap-6 xl:grid-cols-2" : "hidden"}>
            <ExpansionRowsPanel
              title={locale === "en" ? "Revenue and conversion" : locale === "zh-TW" ? "營收與轉化" : "营收与转化"}
              rows={reportsDashboard.revenueRows}
            />
            <ExpansionRowsPanel
              title={locale === "en" ? "Growth and channel" : locale === "zh-TW" ? "增長與渠道" : "增长与渠道"}
              rows={reportsDashboard.growthRows}
            />
          </div>
          <div className={showReportsBreakdowns ? "mt-6" : "hidden"}>
            <ExpansionRowsPanel
              title={locale === "en" ? "Agent BI snapshot" : locale === "zh-TW" ? "代理 BI 快照" : "代理 BI 快照"}
              rows={reportsDashboard.agentBiRows}
            />
          </div>
          <div className={showReportsBreakdowns ? "mt-6 grid gap-6 xl:grid-cols-2" : "hidden"}>
            <ExpansionRowsPanel
              title={locale === "en" ? "Operations snapshot" : locale === "zh-TW" ? "運營快照" : "运营快照"}
              rows={reportsDashboard.operationsRows}
            />
            <ExpansionRowsPanel
              title={locale === "en" ? "Runtime and risk" : locale === "zh-TW" ? "運行與風險" : "运行与风险"}
              rows={reportsDashboard.stabilityRows}
            />
          </div>
          <div className={showReportsExports ? "mt-6 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5" : "hidden"}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-label">{adminExpansion.reports.exports.title}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {locale === "en" ? "Export center" : locale === "zh-TW" ? "匯出中心" : "导出中心"}
                </h3>
                <p className="mt-2 max-w-3xl text-sm text-slate-400">
                  {locale === "en"
                    ? "Apply one set of date and dimension filters, then reuse it across report export tasks."
                    : locale === "zh-TW"
                      ? "先設定一組日期與維度條件，再在不同報表匯出任務中重複使用。"
                      : "先设定一组日期与维度条件，再在不同报表导出任务中复用。"}
                </p>
              </div>
              <span className="text-sm text-slate-500">{reportsDashboard.exportCards.length}</span>
            </div>
            <form method="get" action="/admin" className="mt-5 rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
              <input type="hidden" name="tab" value="reports" />
              <input type="hidden" name="reportsSection" value={reportsSection} />
              <input type="hidden" name="reportsWindow" value={reportsWindow} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{locale === "en" ? "From" : locale === "zh-TW" ? "開始日期" : "开始日期"}</span>
                  <input
                    type="date"
                    name="reportsFrom"
                    defaultValue={reportsFrom}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{locale === "en" ? "To" : locale === "zh-TW" ? "結束日期" : "结束日期"}</span>
                  <input
                    type="date"
                    name="reportsTo"
                    defaultValue={reportsTo}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{locale === "en" ? "Order type" : locale === "zh-TW" ? "訂單類型" : "订单类型"}</span>
                  <select
                    name="reportsOrderType"
                    defaultValue={reportsOrderType}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  >
                    <option value="all">{locale === "en" ? "All" : locale === "zh-TW" ? "全部" : "全部"}</option>
                    <option value="membership">{locale === "en" ? "Membership" : locale === "zh-TW" ? "會員" : "会员"}</option>
                    <option value="content">{locale === "en" ? "Content" : locale === "zh-TW" ? "內容" : "内容"}</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-400">{locale === "en" ? "Dimension" : locale === "zh-TW" ? "維度標記" : "维度标记"}</span>
                  <input
                    type="text"
                    name="reportsDimension"
                    defaultValue={reportsDimension}
                    placeholder={locale === "en" ? "league / author / campaign..." : locale === "zh-TW" ? "聯賽 / 作者 / 活動..." : "联赛 / 作者 / 活动..."}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white"
                >
                  {locale === "en" ? "Apply export filters" : locale === "zh-TW" ? "套用匯出篩選" : "应用导出筛选"}
                </button>
                <Link
                  href={buildAdminReportsHref(reportsRouteState, {
                    reportsSection,
                    reportsFrom: "",
                    reportsTo: "",
                    reportsOrderType: "all",
                    reportsDimension: "",
                  })}
                  className="inline-flex items-center justify-center rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
                >
                  {locale === "en" ? "Reset" : locale === "zh-TW" ? "重置" : "重置"}
                </Link>
              </div>
            </form>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reportsDashboard.exportCards.map((item) => (
                <div key={item.scope} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="mt-2 text-sm text-slate-400">{item.description}</p>
                    </div>
                    <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs text-sky-100">
                      {item.badge}
                    </span>
                  </div>
                  <form action="/api/admin/reports/tasks" method="post" className="mt-4">
                    <input type="hidden" name="scope" value={item.scope} />
                    <input type="hidden" name="reportsWindow" value={reportsWindow} />
                    <input type="hidden" name="from" value={reportsFrom} />
                    <input type="hidden" name="to" value={reportsTo} />
                    <input type="hidden" name="orderType" value={reportsOrderType} />
                    <input type="hidden" name="dimension" value={reportsDimension} />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-full border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-sm text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-400/20"
                    >
                      {locale === "en" ? "Create export task" : locale === "zh-TW" ? "建立匯出任務" : "建立导出任务"}
                    </button>
                  </form>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{locale === "en" ? "Task center" : locale === "zh-TW" ? "任務中心" : "任务中心"}</p>
                  <h4 className="mt-2 text-lg font-semibold text-white">
                    {locale === "en" ? "Recent export tasks" : locale === "zh-TW" ? "最近匯出任務" : "最近导出任务"}
                  </h4>
                </div>
                <span className="text-sm text-slate-500">{exportTasks.length}</span>
              </div>
              <div className="mt-4 grid gap-4">
                {exportTasks.map((task) => {
                  const statusMeta = getExportTaskStatusMeta(task.status, locale);
                  const card = exportCardMap.get(task.scope);

                  return (
                    <div key={task.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/45 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{card?.title ?? task.scope}</p>
                          <p className="mt-2 text-sm text-slate-400">
                            {task.requestedByDisplayName} · {task.id}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs ${getExpansionToneClass(statusMeta.tone)}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                          {formatDateTime(task.createdAt, displayLocale)}
                        </span>
                        {task.finishedAt ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                            {locale === "en" ? "Finished" : locale === "zh-TW" ? "完成於" : "完成于"} {formatDateTime(task.finishedAt, displayLocale)}
                          </span>
                        ) : null}
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                          {locale === "en" ? "Rows" : locale === "zh-TW" ? "筆數" : "笔数"} {formatAdminCoinAmount(task.rowCount, displayLocale)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                          {locale === "en" ? "Size" : locale === "zh-TW" ? "大小" : "大小"} {formatAdminFileSize(task.sizeBytes)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                          {locale === "en" ? "Downloads" : locale === "zh-TW" ? "下載次數" : "下载次数"} {formatAdminCoinAmount(task.downloadCount, displayLocale)}
                        </span>
                      </div>
                      {task.errorText ? <p className="mt-3 text-sm text-rose-100">{task.errorText}</p> : null}
                      <div className="mt-4 flex flex-wrap gap-3">
                        {task.status === "completed" ? (
                          <a
                            href={`/api/admin/reports/tasks/${task.id}/download`}
                            className="inline-flex items-center justify-center rounded-full border border-lime-300/25 bg-lime-300/10 px-4 py-2 text-sm text-lime-100 transition hover:border-lime-300/45 hover:bg-lime-300/20"
                          >
                            {locale === "en" ? "Download file" : locale === "zh-TW" ? "下載文件" : "下载文件"}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                {exportTasks.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
                    {locale === "en" ? "No export tasks yet." : locale === "zh-TW" ? "目前沒有匯出任務。" : "当前没有导出任务。"}
                  </div>
                ) : null}
              </div>
            </div>
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
