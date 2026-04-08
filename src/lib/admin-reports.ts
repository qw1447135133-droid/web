import { prisma } from "@/lib/prisma";
import { getIntlLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n-config";
import { buildAdminOrdersCsv, getAdminOrdersExportRows } from "@/lib/admin-users";
import { getAgentPerformanceSnapshot } from "@/lib/admin-agents";

type ReportTone = "good" | "warn" | "neutral";

export type AdminReportMetric = {
  label: string;
  value: string;
  description: string;
};

export type AdminReportRow = {
  title: string;
  subtitle?: string;
  status?: string;
  tone?: ReportTone;
  meta?: string[];
};

export type AdminReportExportCard = {
  scope: AdminReportExportScope;
  title: string;
  description: string;
  badge: string;
};

export type AdminReportTrendPoint = {
  label: string;
  value: number;
};

export type AdminReportTrendCard = {
  key: string;
  title: string;
  description: string;
  value: string;
  tone: ReportTone;
  points: AdminReportTrendPoint[];
};

export type AdminReportBreakdownSection = {
  key: string;
  title: string;
  description: string;
  rows: AdminReportRow[];
};

export type AdminReportsDashboard = {
  metrics: AdminReportMetric[];
  agentBiMetrics: AdminReportMetric[];
  trendCards: AdminReportTrendCard[];
  longRangeRows: AdminReportRow[];
  breakdownSections: AdminReportBreakdownSection[];
  revenueRows: AdminReportRow[];
  growthRows: AdminReportRow[];
  agentBiRows: AdminReportRow[];
  operationsRows: AdminReportRow[];
  stabilityRows: AdminReportRow[];
  exportCards: AdminReportExportCard[];
};

export type AdminReportExportScope =
  | "orders"
  | "finance-reconciliation"
  | "coin-recharges"
  | "coin-ledgers"
  | "agent-applications"
  | "agents"
  | "agent-commissions"
  | "agent-performance"
  | "leads"
  | "withdrawals";

export type AdminReportExportFilters = {
  reportsWindow?: 7 | 30 | 90 | 180 | 365;
  from?: string;
  to?: string;
  orderType?: "all" | "membership" | "content";
  dimension?: string;
};

export type AdminReportRefreshScope =
  | "overview"
  | "content-by-sport"
  | "content-by-league"
  | "content-by-author"
  | "all";

type AdminReportDailyMetricKey =
  | "revenue_membership"
  | "revenue_content"
  | "revenue_recharge"
  | "membership_conversions"
  | "content_unlocks"
  | "coin_consumption"
  | "agent_commission_generated"
  | "agent_commission_reversed"
  | "agent_withdrawal_settled";

type AdminReportBreakdownWindow = 30 | 90 | 180 | 365;

type AdminReportBreakdownBucket = {
  label: string;
  subtitle?: string;
  orderCount: number;
  revenueAmount: number;
  selectedOrderCount: number;
  selectedRevenueAmount: number;
  revenueByWindow: Record<AdminReportBreakdownWindow, number>;
};

const BREAKDOWN_WINDOWS: AdminReportBreakdownWindow[] = [30, 90, 180, 365];
const CONTENT_BREAKDOWN_SCOPES: Array<Exclude<AdminReportRefreshScope, "overview" | "all">> = [
  "content-by-sport",
  "content-by-league",
  "content-by-author",
];
const globalForAdminReports = globalThis as typeof globalThis & {
  __signalNineAdminReportEnsurePromises?: Map<string, Promise<void>>;
};

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

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(value);
}

function formatCurrency(value: number, locale: Locale) {
  return `CNY ${formatNumber(value, locale)}`;
}

function formatPercent(value: number, locale: Locale) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatShortDate(value: Date, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(value: Date) {
  const next = startOfDay(value);
  next.setDate(next.getDate() + 1);
  return next;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function toMetricDateKey(value: Date) {
  return startOfDay(value).toISOString().slice(0, 10);
}

function fromMetricDateKey(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function clampTrendWindow(value?: number) {
  if (value === 7 || value === 90 || value === 180 || value === 365) {
    return value;
  }

  return 30;
}

function buildDateRange(windowDays: number) {
  const normalizedWindow = clampTrendWindow(windowDays);
  const end = startOfDay(new Date());
  const start = addDays(end, -(normalizedWindow - 1));
  return { start, end: endOfDay(end), windowDays: normalizedWindow };
}

function buildDateKeys(windowDays: number) {
  const { start, windowDays: normalizedWindow } = buildDateRange(windowDays);
  return Array.from({ length: normalizedWindow }, (_, index) => toMetricDateKey(addDays(start, index)));
}

function buildMetricDateBounds(windowDays: number) {
  const dateKeys = buildDateKeys(windowDays);
  const start = fromMetricDateKey(dateKeys[0]);
  const end = new Date(fromMetricDateKey(dateKeys[dateKeys.length - 1]).getTime() + 24 * 60 * 60 * 1000);
  return { start, end, dateKeys };
}

function formatMonthLabel(value: Date, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    year: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(value);
}

function formatSportLabel(value: string, locale: Locale) {
  switch (value) {
    case "football":
      return localizeText({ zhCn: "足球", zhTw: "足球", en: "Football" }, locale);
    case "basketball":
      return localizeText({ zhCn: "篮球", zhTw: "籃球", en: "Basketball" }, locale);
    case "cricket":
      return localizeText({ zhCn: "板球", zhTw: "板球", en: "Cricket" }, locale);
    case "esports":
      return localizeText({ zhCn: "电竞", zhTw: "電競", en: "Esports" }, locale);
    default:
      return value || localizeText({ zhCn: "未知运动", zhTw: "未知運動", en: "Unknown sport" }, locale);
  }
}

function formatReportWindowLabel(windowDays: number, locale: Locale) {
  return locale === "en" ? `${windowDays}D` : `${windowDays} 天`;
}

function buildBreakdownRows(
  buckets: AdminReportBreakdownBucket[],
  locale: Locale,
  options: {
    emptyTitle: {
      zhCn: string;
      zhTw: string;
      en: string;
    };
    emptySubtitle: {
      zhCn: string;
      zhTw: string;
      en: string;
    };
    selectedWindowDays: number;
  },
) {
  const totalSelectedOrders = buckets.reduce((sum, bucket) => sum + bucket.selectedOrderCount, 0);
  const totalSelectedRevenue = buckets.reduce((sum, bucket) => sum + bucket.selectedRevenueAmount, 0);

  if (buckets.length === 0) {
    return [
      {
        title: localizeText(options.emptyTitle, locale),
        subtitle: localizeText(options.emptySubtitle, locale),
        tone: "neutral" as const,
        status: formatReportWindowLabel(options.selectedWindowDays, locale),
      },
    ];
  }

  return buckets.slice(0, 6).map((bucket, index) => {
    const share = totalSelectedRevenue > 0 ? (bucket.selectedRevenueAmount / totalSelectedRevenue) * 100 : 0;
    const averageRevenue =
      bucket.selectedOrderCount > 0 ? bucket.selectedRevenueAmount / bucket.selectedOrderCount : 0;

    return {
      title: `${index + 1}. ${bucket.label}`,
      subtitle: bucket.subtitle,
      tone: bucket.selectedRevenueAmount > 0 ? ("good" as const) : ("neutral" as const),
      status: `${formatReportWindowLabel(options.selectedWindowDays, locale)} ${formatCurrency(bucket.selectedRevenueAmount, locale)}`,
      meta: [
        localizeText(
          {
            zhCn: `${formatReportWindowLabel(options.selectedWindowDays, locale)} ${formatNumber(bucket.selectedOrderCount, locale)} 笔解锁`,
            zhTw: `${formatReportWindowLabel(options.selectedWindowDays, locale)} ${formatNumber(bucket.selectedOrderCount, locale)} 筆解鎖`,
            en: `${formatNumber(bucket.selectedOrderCount, locale)} unlocks in ${formatReportWindowLabel(options.selectedWindowDays, locale)}`,
          },
          locale,
        ),
        localizeText(
          {
            zhCn: `营收占比 ${formatPercent(share, locale)}%`,
            zhTw: `營收占比 ${formatPercent(share, locale)}%`,
            en: `${formatPercent(share, locale)}% revenue share`,
          },
          locale,
        ),
        localizeText(
          {
            zhCn: `客单 ${formatCurrency(averageRevenue, locale)}`,
            zhTw: `客單 ${formatCurrency(averageRevenue, locale)}`,
            en: `Avg ${formatCurrency(averageRevenue, locale)}`,
          },
          locale,
        ),
        ...BREAKDOWN_WINDOWS.map(
          (windowDays) => `${formatReportWindowLabel(windowDays, locale)} ${formatCurrency(bucket.revenueByWindow[windowDays], locale)}`,
        ),
        totalSelectedOrders > 0
          ? localizeText(
              {
                zhCn: `当前窗口总单量 ${formatNumber(totalSelectedOrders, locale)}`,
                zhTw: `目前窗口總單量 ${formatNumber(totalSelectedOrders, locale)}`,
                en: `${formatNumber(totalSelectedOrders, locale)} total orders in current window`,
              },
              locale,
            )
          : localizeText({ zhCn: "当前窗口总单量 0", zhTw: "目前窗口總單量 0", en: "0 total orders in current window" }, locale),
      ],
    };
  });
}

function compressTrendPoints(
  points: Array<{ dateKey: string; value: number }>,
  windowDays: number,
  locale: Locale,
): AdminReportTrendPoint[] {
  if (windowDays <= 90) {
    return points.map((point) => ({
      label: formatShortDate(new Date(`${point.dateKey}T00:00:00.000Z`), locale),
      value: point.value,
    }));
  }

  if (windowDays <= 180) {
    const buckets: AdminReportTrendPoint[] = [];

    for (let index = 0; index < points.length; index += 7) {
      const chunk = points.slice(index, index + 7);

      if (chunk.length === 0) {
        continue;
      }

      const first = new Date(`${chunk[0].dateKey}T00:00:00.000Z`);
      const last = new Date(`${chunk[chunk.length - 1].dateKey}T00:00:00.000Z`);
      buckets.push({
        label: `${formatShortDate(first, locale)}-${formatShortDate(last, locale)}`,
        value: chunk.reduce((sum, item) => sum + item.value, 0),
      });
    }

    return buckets;
  }

  const monthly = new Map<string, { metricDate: Date; value: number }>();

  for (const point of points) {
    const metricDate = new Date(`${point.dateKey}T00:00:00.000Z`);
    const monthKey = `${metricDate.getUTCFullYear()}-${String(metricDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const existing = monthly.get(monthKey);

    if (existing) {
      existing.value += point.value;
      continue;
    }

    monthly.set(monthKey, {
      metricDate,
      value: point.value,
    });
  }

  return Array.from(monthly.values()).map((item) => ({
    label: formatMonthLabel(item.metricDate, locale),
    value: item.value,
  }));
}

function sumTrendWindow(
  trendFacts: Awaited<ReturnType<typeof getDailyFactSeries>>,
  metricKeys: AdminReportDailyMetricKey[],
  valueField: "countValue" | "amountValue",
  windowDays: number,
) {
  const dateKeys = trendFacts.dateKeys.slice(-windowDays);

  return dateKeys.reduce(
    (sum, dateKey) =>
      sum +
      metricKeys.reduce(
        (metricSum, metricKey) => metricSum + (trendFacts.series.get(metricKey)?.get(dateKey)?.[valueField] ?? 0),
        0,
      ),
    0,
  );
}

function emptyDailyFactMap(windowDays: number) {
  const byMetric = new Map<AdminReportDailyMetricKey, Map<string, { countValue: number; amountValue: number }>>();
  const metricKeys: AdminReportDailyMetricKey[] = [
    "revenue_membership",
    "revenue_content",
    "revenue_recharge",
    "membership_conversions",
    "content_unlocks",
    "coin_consumption",
    "agent_commission_generated",
    "agent_commission_reversed",
    "agent_withdrawal_settled",
  ];
  const dateKeys = buildDateKeys(windowDays);

  for (const metricKey of metricKeys) {
    byMetric.set(
      metricKey,
      new Map(dateKeys.map((dateKey) => [dateKey, { countValue: 0, amountValue: 0 }])),
    );
  }

  return byMetric;
}

function getAgentLevelSummary(value: string, locale: Locale) {
  if (value === "level3") {
    return localizeText({ zhCn: "三级代理", zhTw: "三級代理", en: "Level 3" }, locale);
  }

  if (value === "level2") {
    return localizeText({ zhCn: "二级代理", zhTw: "二級代理", en: "Level 2" }, locale);
  }

  return localizeText({ zhCn: "一级代理", zhTw: "一級代理", en: "Level 1" }, locale);
}

export function normalizeAdminReportExportScope(value?: string | null): AdminReportExportScope {
  switch (value) {
    case "finance-reconciliation":
    case "coin-recharges":
    case "coin-ledgers":
    case "agent-applications":
    case "agents":
    case "agent-commissions":
    case "agent-performance":
    case "leads":
    case "withdrawals":
    case "orders":
      return value;
    default:
      return "orders";
  }
}

export function normalizeAdminReportExportFilters(
  value?: Partial<AdminReportExportFilters> | string | null,
): AdminReportExportFilters {
  const parsed =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value) as Partial<AdminReportExportFilters>;
          } catch {
            return {};
          }
        })()
      : value ?? {};
  const reportsWindow =
    parsed.reportsWindow === 7 ||
    parsed.reportsWindow === 30 ||
    parsed.reportsWindow === 90 ||
    parsed.reportsWindow === 180 ||
    parsed.reportsWindow === 365
      ? parsed.reportsWindow
      : undefined;

  return {
    reportsWindow,
    from: typeof parsed.from === "string" ? parsed.from.trim() || undefined : undefined,
    to: typeof parsed.to === "string" ? parsed.to.trim() || undefined : undefined,
    orderType:
      parsed.orderType === "membership" || parsed.orderType === "content" || parsed.orderType === "all"
        ? parsed.orderType
        : undefined,
    dimension: typeof parsed.dimension === "string" ? parsed.dimension.trim() || undefined : undefined,
  };
}

function resolveExportDateRange(filters?: AdminReportExportFilters) {
  const normalized = normalizeAdminReportExportFilters(filters);
  const fromDate = normalized.from ? new Date(normalized.from) : undefined;
  const toDate = normalized.to ? new Date(normalized.to) : undefined;

  if ((fromDate && Number.isFinite(fromDate.getTime())) || (toDate && Number.isFinite(toDate.getTime()))) {
    return {
      fromDate: fromDate && Number.isFinite(fromDate.getTime()) ? fromDate : undefined,
      toDate: toDate && Number.isFinite(toDate.getTime()) ? toDate : undefined,
      filters: normalized,
    };
  }

  if (normalized.reportsWindow) {
    const { start, end } = buildDateRange(normalized.reportsWindow);
    return {
      fromDate: start,
      toDate: end,
      filters: normalized,
    };
  }

  return {
    fromDate: undefined,
    toDate: undefined,
    filters: normalized,
  };
}

async function rebuildAdminReportOverviewDailyFacts(windowDays: number) {
  const { start, end } = buildDateRange(windowDays);
  const dateKeys = buildDateKeys(windowDays);
  const dailyFacts = emptyDailyFactMap(windowDays);

  const [
    membershipOrders,
    contentOrders,
    coinRechargeOrders,
    coinLedgerDebits,
    agentCommissionLedgers,
    reversedCommissionLedgers,
    settledWithdrawals,
  ] = await Promise.all([
    prisma.membershipOrder.findMany({
      where: {
        status: "paid",
        paidAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        amount: true,
        paidAt: true,
      },
    }),
    prisma.contentOrder.findMany({
      where: {
        status: "paid",
        paidAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        amount: true,
        paidAt: true,
      },
    }),
    prisma.coinRechargeOrder.findMany({
      where: {
        status: "paid",
        paidAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        amount: true,
        paidAt: true,
      },
    }),
    prisma.coinLedger.findMany({
      where: {
        direction: "debit",
        createdAt: {
          gte: start,
          lt: end,
        },
        reason: {
          in: ["content_unlock", "membership_unlock", "refund"],
        },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    }),
    prisma.agentCommissionLedger.findMany({
      where: {
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        commissionAmount: true,
        createdAt: true,
      },
    }),
    prisma.agentCommissionLedger.findMany({
      where: {
        reversedAt: {
          gte: start,
          lt: end,
        },
        reversedAmount: {
          gt: 0,
        },
      },
      select: {
        reversedAmount: true,
        reversedAt: true,
      },
    }),
    prisma.agentWithdrawal.findMany({
      where: {
        status: "settled",
        settledAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        amount: true,
        settledAt: true,
      },
    }),
  ]);

  const incrementMetric = (
    metricKey: AdminReportDailyMetricKey,
    dateKey: string,
    countValue: number,
    amountValue: number,
  ) => {
    const metricMap = dailyFacts.get(metricKey);
    const existing = metricMap?.get(dateKey);

    if (!metricMap || !existing) {
      return;
    }

    existing.countValue += countValue;
    existing.amountValue += amountValue;
  };

  for (const item of membershipOrders) {
    if (!item.paidAt) {
      continue;
    }

    const dateKey = toMetricDateKey(item.paidAt);
    incrementMetric("revenue_membership", dateKey, 1, item.amount);
    incrementMetric("membership_conversions", dateKey, 1, item.amount);
  }

  for (const item of contentOrders) {
    if (!item.paidAt) {
      continue;
    }

    const dateKey = toMetricDateKey(item.paidAt);
    incrementMetric("revenue_content", dateKey, 1, item.amount);
    incrementMetric("content_unlocks", dateKey, 1, item.amount);
  }

  for (const item of coinRechargeOrders) {
    if (!item.paidAt) {
      continue;
    }

    incrementMetric("revenue_recharge", toMetricDateKey(item.paidAt), 1, item.amount);
  }

  for (const item of coinLedgerDebits) {
    incrementMetric("coin_consumption", toMetricDateKey(item.createdAt), 1, item.amount);
  }

  for (const item of agentCommissionLedgers) {
    incrementMetric("agent_commission_generated", toMetricDateKey(item.createdAt), 1, item.commissionAmount);
  }

  for (const item of reversedCommissionLedgers) {
    if (!item.reversedAt) {
      continue;
    }

    incrementMetric("agent_commission_reversed", toMetricDateKey(item.reversedAt), 1, item.reversedAmount);
  }

  for (const item of settledWithdrawals) {
    if (!item.settledAt) {
      continue;
    }

    incrementMetric("agent_withdrawal_settled", toMetricDateKey(item.settledAt), 1, item.amount);
  }

  const rows = dateKeys.flatMap((dateKey) => {
    const metricDate = fromMetricDateKey(dateKey);
    return (Array.from(dailyFacts.entries()) as Array<
      [AdminReportDailyMetricKey, Map<string, { countValue: number; amountValue: number }>]
    >).map(([metricKey, metricMap]) => {
      const metric = metricMap.get(dateKey) ?? { countValue: 0, amountValue: 0 };
      return {
        metricDate,
        scope: "overview",
        metricKey,
        dimensionKey: "",
        countValue: metric.countValue,
        amountValue: metric.amountValue,
        extraJson: null,
      };
    });
  });
  const dedupedRows = Array.from(
    new Map(
      rows.map((row) => [
        `${row.metricDate.toISOString()}::${row.scope}::${row.metricKey}::${row.dimensionKey}`,
        row,
      ]),
    ).values(),
  );

  let insertedCount = 0;
  await prisma.$transaction(async (tx) => {
    for (const row of dedupedRows) {
      await tx.adminReportDailyFact.upsert({
        where: {
          metricDate_scope_metricKey_dimensionKey: {
            metricDate: row.metricDate,
            scope: row.scope,
            metricKey: row.metricKey,
            dimensionKey: row.dimensionKey,
          },
        },
        update: {
          countValue: row.countValue,
          amountValue: row.amountValue,
          extraJson: row.extraJson,
        },
        create: row,
      });
      insertedCount += 1;
    }
  });

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    dayCount: dateKeys.length,
    recordCount: insertedCount,
    deletedCount: 0,
  };
}

async function ensureAdminReportDailyFacts(windowDays: number) {
  const normalizedWindow = Math.max(365, clampTrendWindow(windowDays));
  const key = `overview:${normalizedWindow}`;
  const cache = globalForAdminReports.__signalNineAdminReportEnsurePromises ?? new Map<string, Promise<void>>();
  globalForAdminReports.__signalNineAdminReportEnsurePromises = cache;

  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        const existingCount = await prisma.adminReportDailyFact.count({
          where: {
            scope: "overview",
          },
        });
        const expectedMinimum = buildDateKeys(normalizedWindow).length * 9;

        if (existingCount < expectedMinimum) {
          await rebuildAdminReportOverviewDailyFacts(normalizedWindow);
        }
      })().finally(() => {
        cache.delete(key);
      }),
    );
  }

  await cache.get(key);
}

async function getDailyFactSeries(windowDays: number) {
  await ensureAdminReportDailyFacts(windowDays);
  const { start, end } = buildMetricDateBounds(windowDays);
  const rows = await prisma.adminReportDailyFact.findMany({
    where: {
      scope: "overview",
      metricDate: {
        gte: start,
        lt: end,
      },
    },
    orderBy: [{ metricDate: "asc" }],
    select: {
      metricDate: true,
      metricKey: true,
      countValue: true,
      amountValue: true,
    },
  });

  const series = emptyDailyFactMap(windowDays);

  for (const row of rows) {
    const metricKey = row.metricKey as AdminReportDailyMetricKey;
    const metricMap = series.get(metricKey);

    if (!metricMap) {
      continue;
    }

    metricMap.set(toMetricDateKey(row.metricDate), {
      countValue: row.countValue,
      amountValue: row.amountValue,
    });
  }

  return { series, dateKeys: buildDateKeys(windowDays) };
}

function parseBreakdownExtraJson(
  value: string | null,
): {
  label?: string;
  subtitle?: string;
  sportKey?: string;
} {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return {
      label: typeof (parsed as { label?: unknown }).label === "string" ? String((parsed as { label?: unknown }).label) : undefined,
      subtitle:
        typeof (parsed as { subtitle?: unknown }).subtitle === "string"
          ? String((parsed as { subtitle?: unknown }).subtitle)
          : undefined,
      sportKey:
        typeof (parsed as { sportKey?: unknown }).sportKey === "string"
          ? String((parsed as { sportKey?: unknown }).sportKey)
          : undefined,
    };
  } catch {
    return {};
  }
}

async function ensureAdminReportBreakdownFacts(
  scope: Exclude<AdminReportRefreshScope, "overview" | "all">,
) {
  const key = `${scope}:365`;
  const cache = globalForAdminReports.__signalNineAdminReportEnsurePromises ?? new Map<string, Promise<void>>();
  globalForAdminReports.__signalNineAdminReportEnsurePromises = cache;

  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        const existingCount = await prisma.adminReportDailyFact.count({
          where: {
            scope,
          },
        });

        if (existingCount > 0) {
          return;
        }

        const { start, end } = buildDateRange(365);
        const paidOrderCount = await prisma.contentOrder.count({
          where: {
            status: "paid",
            paidAt: {
              gte: start,
              lt: end,
            },
          },
        });

        if (paidOrderCount === 0) {
          return;
        }

        await rebuildAdminReportContentBreakdownFacts(365, scope);
      })().finally(() => {
        cache.delete(key);
      }),
    );
  }

  await cache.get(key);
}

async function getAdminReportBreakdownBuckets(
  scope: Exclude<AdminReportRefreshScope, "overview" | "all">,
  selectedWindowDays: number,
  locale: Locale,
) {
  await ensureAdminReportBreakdownFacts(scope);

  const { start, end } = buildMetricDateBounds(365);
  const selectedWindowStart = buildMetricDateBounds(selectedWindowDays).start;
  const rows = await prisma.adminReportDailyFact.findMany({
    where: {
      scope,
      metricDate: {
        gte: start,
        lt: end,
      },
    },
    orderBy: [{ metricDate: "asc" }, { amountValue: "desc" }],
    select: {
      metricDate: true,
      dimensionKey: true,
      countValue: true,
      amountValue: true,
      extraJson: true,
    },
  });

  const bucketMap = new Map<string, AdminReportBreakdownBucket>();
  const breakdownWindowStarts = new Map(
    BREAKDOWN_WINDOWS.map((windowDays) => [windowDays, buildMetricDateBounds(windowDays).start]),
  );

  for (const row of rows) {
    const extra = parseBreakdownExtraJson(row.extraJson);
    const sportKey = extra.sportKey?.trim() || extra.subtitle?.trim() || extra.label?.trim() || row.dimensionKey;
    const label =
      scope === "content-by-sport"
        ? formatSportLabel(extra.sportKey?.trim() || extra.label?.trim() || row.dimensionKey, locale)
        : extra.label?.trim() || row.dimensionKey;
    const subtitle =
      scope === "content-by-league"
        ? formatSportLabel(extra.sportKey?.trim() || extra.subtitle?.trim() || "unknown", locale)
        : extra.subtitle?.trim() || undefined;
    const existing = bucketMap.get(row.dimensionKey);
    const isSelected = row.metricDate >= selectedWindowStart;
    const matchedWindows = BREAKDOWN_WINDOWS.filter((windowDays) => {
      const windowStart = breakdownWindowStarts.get(windowDays);
      return Boolean(windowStart && row.metricDate >= windowStart);
    });

    if (existing) {
      existing.orderCount += row.countValue;
      existing.revenueAmount += row.amountValue;
      if (isSelected) {
        existing.selectedOrderCount += row.countValue;
        existing.selectedRevenueAmount += row.amountValue;
      }
      for (const windowDays of matchedWindows) {
        existing.revenueByWindow[windowDays] += row.amountValue;
      }
      continue;
    }

    bucketMap.set(row.dimensionKey, {
      label,
      subtitle: scope === "content-by-sport" ? undefined : subtitle,
      orderCount: row.countValue,
      revenueAmount: row.amountValue,
      selectedOrderCount: isSelected ? row.countValue : 0,
      selectedRevenueAmount: isSelected ? row.amountValue : 0,
      revenueByWindow: {
        30: matchedWindows.includes(30) ? row.amountValue : 0,
        90: matchedWindows.includes(90) ? row.amountValue : 0,
        180: matchedWindows.includes(180) ? row.amountValue : 0,
        365: matchedWindows.includes(365) ? row.amountValue : 0,
      },
    });
  }

  return Array.from(bucketMap.values()).sort(
    (left, right) =>
      right.selectedRevenueAmount - left.selectedRevenueAmount ||
      right.revenueByWindow[365] - left.revenueByWindow[365] ||
      right.selectedOrderCount - left.selectedOrderCount ||
      left.label.localeCompare(right.label),
  );
}

async function rebuildAdminReportContentBreakdownFacts(
  windowDays: number,
  scope: Exclude<AdminReportRefreshScope, "overview" | "all">,
) {
  const { start, end, windowDays: normalizedWindow } = buildDateRange(windowDays);
  const paidOrders = await prisma.contentOrder.findMany({
    where: {
      status: "paid",
      paidAt: {
        gte: start,
        lt: end,
      },
    },
    select: {
      contentId: true,
      amount: true,
      paidAt: true,
    },
  });

  const contentPlanIds = Array.from(
    new Set(paidOrders.map((item) => item.contentId).filter((item) => item.trim().length > 0)),
  );
  const contentPlans =
    contentPlanIds.length > 0
      ? await prisma.articlePlan.findMany({
          where: {
            id: {
              in: contentPlanIds,
            },
          },
          select: {
            id: true,
            sport: true,
            leagueLabel: true,
            author: {
              select: {
                id: true,
                name: true,
                focus: true,
              },
            },
          },
        })
      : [];
  const contentPlanMap = new Map(contentPlans.map((item) => [item.id, item]));
  const aggregated = new Map<
    string,
    {
      metricDate: Date;
      dimensionKey: string;
      countValue: number;
      amountValue: number;
      extraJson: string | null;
    }
  >();

  for (const order of paidOrders) {
    if (!order.paidAt) {
      continue;
    }

    const plan = contentPlanMap.get(order.contentId);
    const sportKey = plan?.sport?.trim() || "unknown";
    const leagueLabel = plan?.leagueLabel?.trim() || "unassigned";
    const authorId = plan?.author.id?.trim() || `unknown:${order.contentId}`;
    const authorName = plan?.author.name?.trim() || "Unknown author";
    const authorFocus = plan?.author.focus?.trim() || sportKey;
    const metricDate = fromMetricDateKey(toMetricDateKey(order.paidAt));

    const breakdown =
      scope === "content-by-sport"
        ? {
            dimensionKey: sportKey,
            extraJson: JSON.stringify({
              label: sportKey,
              sportKey,
            }),
          }
        : scope === "content-by-league"
          ? {
              dimensionKey: `${sportKey}:${leagueLabel}`,
              extraJson: JSON.stringify({
                label: leagueLabel,
                subtitle: sportKey,
                sportKey,
              }),
            }
          : {
              dimensionKey: authorId,
              extraJson: JSON.stringify({
                label: authorName,
                subtitle: authorFocus,
                sportKey,
              }),
            };

    const aggregateKey = `${metricDate.toISOString()}::${breakdown.dimensionKey}`;
    const existing = aggregated.get(aggregateKey);

    if (existing) {
      existing.countValue += 1;
      existing.amountValue += order.amount;
      continue;
    }

    aggregated.set(aggregateKey, {
      metricDate,
      dimensionKey: breakdown.dimensionKey,
      countValue: 1,
      amountValue: order.amount,
      extraJson: breakdown.extraJson,
    });
  }

  const rows = Array.from(aggregated.values()).map((row) => ({
    metricDate: row.metricDate,
    scope,
    metricKey: "content_paid" as const,
    dimensionKey: row.dimensionKey,
    countValue: row.countValue,
    amountValue: row.amountValue,
    extraJson: row.extraJson,
  }));
  let insertedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      await tx.adminReportDailyFact.upsert({
        where: {
          metricDate_scope_metricKey_dimensionKey: {
            metricDate: row.metricDate,
            scope: row.scope,
            metricKey: row.metricKey,
            dimensionKey: row.dimensionKey,
          },
        },
        update: {
          countValue: row.countValue,
          amountValue: row.amountValue,
          extraJson: row.extraJson,
        },
        create: row,
      });
      insertedCount += 1;
    }
  });

  return {
    scope,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    dayCount: buildDateKeys(normalizedWindow).length,
    recordCount: insertedCount,
    deletedCount: 0,
  };
}

export async function refreshAdminReportDailyFacts(
  windowDays = 30,
  scope: AdminReportRefreshScope = "all",
) {
  const normalizedWindow = clampTrendWindow(windowDays);
  const scopes: Array<Exclude<AdminReportRefreshScope, "all">> =
    scope === "all" ? ["overview", ...CONTENT_BREAKDOWN_SCOPES] : [scope];
  const processedScopes = [];

  for (const currentScope of scopes) {
    if (currentScope === "overview") {
      processedScopes.push(
        await rebuildAdminReportOverviewDailyFacts(normalizedWindow),
      );
      continue;
    }

    processedScopes.push(
      await rebuildAdminReportContentBreakdownFacts(normalizedWindow, currentScope),
    );
  }

  return {
    scope,
    windowDays: normalizedWindow,
    processedScopes,
    recordCount: processedScopes.reduce((sum, item) => sum + item.recordCount, 0),
    deletedCount: processedScopes.reduce(
      (sum, item) => sum + ("deletedCount" in item ? Number(item.deletedCount ?? 0) : 0),
      0,
    ),
    startDate: processedScopes[0]?.startDate,
    endDate: processedScopes[0]?.endDate,
  };
}

type CsvRow = Record<string, string | number | null | undefined>;

type AgentCommissionExportRow = {
  createdAt: Date;
  agent: {
    displayName: string;
  };
  kind?: string | null;
  sourceAgentId?: string | null;
  sourceAgentName?: string | null;
  user: {
    displayName: string;
    email: string;
  };
  rechargeOrder: {
    orderNo: string;
  };
  rechargeAmount: number;
  commissionRate: number;
  commissionAmount: number;
  settledAmount: number;
  reversedAmount: number;
  status: string;
  settledAt?: Date | null;
  reversedAt?: Date | null;
  note?: string | null;
};

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = value == null ? "" : String(value);

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replaceAll("\"", "\"\"")}"`;
  }

  return normalized;
}

function buildCsv(rows: CsvRow[]) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ];

  return `\uFEFF${lines.join("\n")}`;
}

export async function getAdminReportsDashboard(
  locale: Locale,
  options?: {
    trendWindowDays?: number;
  },
): Promise<AdminReportsDashboard> {
  const now = new Date();
  const trendWindowDays = clampTrendWindow(options?.trendWindowDays);
  const reportWindowRange = buildDateRange(trendWindowDays);

  const [
    membershipPaid,
    contentPaid,
    rechargePaid,
    activeMembershipCount,
    publishedPlanCount,
    hotPlanCount,
    totalPredictionCount,
    pendingPredictionCount,
    activeBannerCount,
    activeAnnouncementCount,
    activeKnowledgeCount,
    pendingHandoffCount,
    pendingApplications,
    activeAgents,
    newLeads,
    followingLeads,
    pendingWithdrawals,
    settledWithdrawals,
    totalSyncRuns,
    failedSyncRuns,
    recentSyncRuns,
    callbackConflicts,
    callbackFailed,
    pendingRechargeOrders,
    agentPerformanceSnapshot,
    trendFacts,
    longRangeTrendFacts,
    sportBreakdownBuckets,
    leagueBreakdownBuckets,
    authorBreakdownBuckets,
  ] = await Promise.all([
    prisma.membershipOrder.aggregate({
      _count: { id: true },
      _sum: { amount: true },
      where: { status: "paid" },
    }),
    prisma.contentOrder.aggregate({
      _count: { id: true },
      _sum: { amount: true },
      where: { status: "paid" },
    }),
    prisma.coinRechargeOrder.aggregate({
      _count: { id: true },
      _sum: { amount: true },
      where: { status: "paid" },
    }),
    prisma.user.count({
      where: {
        membershipExpiresAt: {
          gt: now,
        },
      },
    }),
    prisma.articlePlan.count({
      where: {
        status: "published",
      },
    }),
    prisma.articlePlan.count({
      where: {
        status: "published",
        isHot: true,
      },
    }),
    prisma.predictionRecord.count(),
    prisma.predictionRecord.count({
      where: {
        result: "pending",
      },
    }),
    prisma.homepageBanner.count({
      where: {
        status: "active",
      },
    }),
    prisma.siteAnnouncement.count({
      where: {
        status: "active",
      },
    }),
    prisma.supportKnowledgeItem.count({
      where: {
        status: "active",
      },
    }),
    prisma.assistantHandoffRequest.count({
      where: {
        status: "pending",
      },
    }),
    prisma.agentApplication.count({
      where: {
        status: "pending",
      },
    }),
    prisma.agentProfile.count({
      where: {
        status: "active",
      },
    }),
    prisma.recruitmentLead.count({
      where: {
        status: "new",
      },
    }),
    prisma.recruitmentLead.count({
      where: {
        status: "following",
      },
    }),
    prisma.agentWithdrawal.count({
      where: {
        status: {
          in: ["pending", "reviewing", "paying"],
        },
      },
    }),
    prisma.agentWithdrawal.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: "settled",
      },
    }),
    prisma.syncRun.count(),
    prisma.syncRun.count({
      where: {
        status: "failed",
      },
    }),
    prisma.syncRun.findMany({
      take: 8,
      orderBy: {
        startedAt: "desc",
      },
      select: {
        status: true,
      },
    }),
    prisma.paymentCallbackEvent.count({
      where: {
        processingStatus: "conflict",
      },
    }),
    prisma.paymentCallbackEvent.count({
      where: {
        processingStatus: "failed",
      },
    }),
    prisma.coinRechargeOrder.count({
      where: {
        status: "pending",
      },
    }),
    getAgentPerformanceSnapshot(),
    getDailyFactSeries(trendWindowDays),
    getDailyFactSeries(365),
    getAdminReportBreakdownBuckets("content-by-sport", trendWindowDays, locale),
    getAdminReportBreakdownBuckets("content-by-league", trendWindowDays, locale),
    getAdminReportBreakdownBuckets("content-by-author", trendWindowDays, locale),
  ]);

  const membershipRevenue = membershipPaid._sum.amount ?? 0;
  const contentRevenue = contentPaid._sum.amount ?? 0;
  const rechargeRevenue = rechargePaid._sum.amount ?? 0;
  const totalRevenue = membershipRevenue + contentRevenue + rechargeRevenue;
  const totalPaidOrders = (membershipPaid._count.id ?? 0) + (contentPaid._count.id ?? 0) + (rechargePaid._count.id ?? 0);
  const recentSuccessCount = recentSyncRuns.filter((item) => item.status === "success").length;
  const agentBiRows = agentPerformanceSnapshot.slice(0, 6);
  const totalAttributedRecharge = agentPerformanceSnapshot.reduce((total, item) => total + item.directRechargeAmount, 0);
  const totalDirectCommission = agentPerformanceSnapshot.reduce((total, item) => total + item.directCommissionNet, 0);
  const totalDownstreamCommission = agentPerformanceSnapshot.reduce((total, item) => total + item.downstreamCommissionNet, 0);
  const totalPendingPayout = agentPerformanceSnapshot.reduce((total, item) => total + item.pendingWithdrawalAmount, 0);
  const totalSettledWithdrawal = agentPerformanceSnapshot.reduce((total, item) => total + item.settledWithdrawalAmount, 0);
  const totalReferredUsers = agentPerformanceSnapshot.reduce((total, item) => total + item.referredUsers, 0);
  const totalChildAgents = agentPerformanceSnapshot.reduce((total, item) => total + item.childAgents, 0);
  const breakdownSections: AdminReportBreakdownSection[] = [
    {
      key: "sport",
      title: localizeText(
        { zhCn: "内容营收按运动拆分", zhTw: "內容營收按運動拆分", en: "Content revenue by sport" },
        locale,
      ),
      description: localizeText(
        {
          zhCn: `按最近 ${trendWindowDays} 天已支付内容订单拆分各运动表现。`,
          zhTw: `按最近 ${trendWindowDays} 天已支付內容訂單拆分各運動表現。`,
          en: `Break down paid content performance by sport in the last ${trendWindowDays} days.`,
        },
        locale,
      ),
      rows: buildBreakdownRows(sportBreakdownBuckets, locale, {
        emptyTitle: { zhCn: "暂无内容订单", zhTw: "暫無內容訂單", en: "No content orders yet" },
        emptySubtitle: {
          zhCn: "当前周期内还没有已支付的内容解锁订单。",
          zhTw: "當前週期內還沒有已支付的內容解鎖訂單。",
          en: "There are no paid content unlock orders in the current window.",
        },
        selectedWindowDays: trendWindowDays,
      }),
    },
    {
      key: "league",
      title: localizeText(
        { zhCn: "内容营收按联赛拆分", zhTw: "內容營收按聯賽拆分", en: "Content revenue by league" },
        locale,
      ),
      description: localizeText(
        {
          zhCn: "帮助运营识别最能带来付费解锁的联赛主题。",
          zhTw: "幫助運營識別最能帶來付費解鎖的聯賽主題。",
          en: "Identify which league themes generate the strongest paid unlock demand.",
        },
        locale,
      ),
      rows: buildBreakdownRows(leagueBreakdownBuckets, locale, {
        emptyTitle: { zhCn: "暂无联赛拆分", zhTw: "暫無聯賽拆分", en: "No league breakdown yet" },
        emptySubtitle: {
          zhCn: "待内容订单进入后，这里会显示联赛维度的解锁营收排行。",
          zhTw: "待內容訂單進入後，這裡會顯示聯賽維度的解鎖營收排行。",
          en: "League-level unlock revenue rankings will appear once paid orders arrive.",
        },
        selectedWindowDays: trendWindowDays,
      }),
    },
    {
      key: "author",
      title: localizeText(
        { zhCn: "内容营收按作者拆分", zhTw: "內容營收按作者拆分", en: "Content revenue by author" },
        locale,
      ),
      description: localizeText(
        {
          zhCn: "用于观察专家团队的带单能力与内容变现效率。",
          zhTw: "用於觀察專家團隊的帶單能力與內容變現效率。",
          en: "Track author monetization strength and paid conversion efficiency.",
        },
        locale,
      ),
      rows: buildBreakdownRows(authorBreakdownBuckets, locale, {
        emptyTitle: { zhCn: "暂无作者拆分", zhTw: "暫無作者拆分", en: "No author breakdown yet" },
        emptySubtitle: {
          zhCn: "当前周期内还没有可归因到作者的已支付内容订单。",
          zhTw: "當前週期內還沒有可歸因到作者的已支付內容訂單。",
          en: "There are no author-attributed paid content orders in the current window.",
        },
        selectedWindowDays: trendWindowDays,
      }),
    },
  ];
  const buildTrendPoints = (
    metricKeys: AdminReportDailyMetricKey[],
    valueField: "countValue" | "amountValue",
  ) =>
    compressTrendPoints(
      trendFacts.dateKeys.map((dateKey) => ({
        dateKey,
        value: metricKeys.reduce(
          (sum, metricKey) => sum + (trendFacts.series.get(metricKey)?.get(dateKey)?.[valueField] ?? 0),
          0,
        ),
      })),
      trendWindowDays,
      locale,
    );
  const totalTrendValue = (points: AdminReportTrendPoint[]) =>
    points.reduce((sum, point) => sum + point.value, 0);
  const revenueTrendPoints = buildTrendPoints(
    ["revenue_membership", "revenue_content", "revenue_recharge"],
    "amountValue",
  );
  const coinConsumptionTrendPoints = buildTrendPoints(["coin_consumption"], "amountValue");
  const membershipConversionTrendPoints = buildTrendPoints(["membership_conversions"], "countValue");
  const agentCommissionTrendPoints = buildTrendPoints(
    ["agent_commission_generated"],
    "amountValue",
  );
  const settledWithdrawalTrendPoints = buildTrendPoints(
    ["agent_withdrawal_settled"],
    "amountValue",
  );
  const longRangeRows: AdminReportRow[] = [
    {
      title: localizeText({ zhCn: "营收累计阶梯", zhTw: "營收累計階梯", en: "Revenue ladder" }, locale),
      subtitle: localizeText(
        {
          zhCn: "比较 30 / 90 / 180 / 365 天已实现营收，观察收入斜率变化。",
          zhTw: "比較 30 / 90 / 180 / 365 天已實現營收，觀察收入斜率變化。",
          en: "Compare realized revenue across 30 / 90 / 180 / 365 day windows.",
        },
        locale,
      ),
      status: `365D ${formatCurrency(
        sumTrendWindow(longRangeTrendFacts, ["revenue_membership", "revenue_content", "revenue_recharge"], "amountValue", 365),
        locale,
      )}`,
      tone: "good",
      meta: [30, 90, 180].map((windowDays) => `${windowDays}D ${formatCurrency(
        sumTrendWindow(longRangeTrendFacts, ["revenue_membership", "revenue_content", "revenue_recharge"], "amountValue", windowDays),
        locale,
      )}`),
    },
    {
      title: localizeText({ zhCn: "充值入金阶梯", zhTw: "充值入金階梯", en: "Recharge ladder" }, locale),
      subtitle: localizeText(
        {
          zhCn: "用长周期观察充值强度是否持续抬升或回落。",
          zhTw: "用長週期觀察充值強度是否持續抬升或回落。",
          en: "Track whether recharge intensity is accelerating or cooling off.",
        },
        locale,
      ),
      status: `365D ${formatCurrency(
        sumTrendWindow(longRangeTrendFacts, ["revenue_recharge"], "amountValue", 365),
        locale,
      )}`,
      tone: "neutral",
      meta: [30, 90, 180].map((windowDays) => `${windowDays}D ${formatCurrency(
        sumTrendWindow(longRangeTrendFacts, ["revenue_recharge"], "amountValue", windowDays),
        locale,
      )}`),
    },
    {
      title: localizeText({ zhCn: "会员转化阶梯", zhTw: "會員轉化階梯", en: "Membership conversion ladder" }, locale),
      subtitle: localizeText(
        {
          zhCn: "对比不同周期的会员转化单量，判断增长稳定度。",
          zhTw: "對比不同週期的會員轉化單量，判斷增長穩定度。",
          en: "Compare paid membership conversion volume across longer windows.",
        },
        locale,
      ),
      status: `365D ${formatNumber(
        sumTrendWindow(longRangeTrendFacts, ["membership_conversions"], "countValue", 365),
        locale,
      )}`,
      tone: "good",
      meta: [30, 90, 180].map((windowDays) => `${windowDays}D ${formatNumber(
        sumTrendWindow(longRangeTrendFacts, ["membership_conversions"], "countValue", windowDays),
        locale,
      )}`),
    },
    {
      title: localizeText({ zhCn: "代理结算阶梯", zhTw: "代理結算階梯", en: "Agent settlement ladder" }, locale),
      subtitle: localizeText(
        {
          zhCn: "同时看佣金生成与已结算提现，判断代理现金流压力。",
          zhTw: "同時看佣金生成與已結算提現，判斷代理現金流壓力。",
          en: "View commission generation and settled withdrawals together.",
        },
        locale,
      ),
      status: `365D ${formatCurrency(
        sumTrendWindow(longRangeTrendFacts, ["agent_commission_generated"], "amountValue", 365),
        locale,
      )}`,
      tone: totalPendingPayout > 0 ? "warn" : "neutral",
      meta: [30, 90, 180].map((windowDays) => `${windowDays}D ${formatCurrency(
        sumTrendWindow(longRangeTrendFacts, ["agent_withdrawal_settled"], "amountValue", windowDays),
        locale,
      )}`),
    },
  ];
  const trendCards: AdminReportTrendCard[] = [
    {
      key: "revenue",
      title: localizeText(
        { zhCn: "营收趋势", zhTw: "營收趨勢", en: "Revenue trend" },
        locale,
      ),
      description: localizeText(
        {
          zhCn: `最近 ${trendWindowDays} 天会员、内容与球币充值合计营收。`,
          zhTw: `最近 ${trendWindowDays} 天會員、內容與球幣充值合計營收。`,
          en: `Combined membership, content, and recharge revenue in the last ${trendWindowDays} days.`,
        },
        locale,
      ),
      value: formatCurrency(totalTrendValue(revenueTrendPoints), locale),
      tone: "good",
      points: revenueTrendPoints,
    },
    {
      key: "coin-consumption",
      title: localizeText(
        { zhCn: "球币消耗", zhTw: "球幣消耗", en: "Coin consumption" },
        locale,
      ),
      description: localizeText(
        {
          zhCn: "统计内容解锁、会员开通与退款回退对应的球币变动。",
          zhTw: "統計內容解鎖、會員開通與退款回退對應的球幣變動。",
          en: "Coin movement tied to unlocks, membership, and refund reversals.",
        },
        locale,
      ),
      value: formatNumber(totalTrendValue(coinConsumptionTrendPoints), locale),
      tone: "neutral",
      points: coinConsumptionTrendPoints,
    },
    {
      key: "membership-conversion",
      title: localizeText(
        { zhCn: "会员转化", zhTw: "會員轉化", en: "Membership conversions" },
        locale,
      ),
      description: localizeText(
        {
          zhCn: `最近 ${trendWindowDays} 天已支付会员订单数。`,
          zhTw: `最近 ${trendWindowDays} 天已支付會員訂單數。`,
          en: `Paid membership orders in the last ${trendWindowDays} days.`,
        },
        locale,
      ),
      value: formatNumber(totalTrendValue(membershipConversionTrendPoints), locale),
      tone: "good",
      points: membershipConversionTrendPoints,
    },
    {
      key: "agent-commission",
      title: localizeText(
        { zhCn: "代理佣金生成", zhTw: "代理佣金生成", en: "Agent commission generated" },
        locale,
      ),
      description: localizeText(
        {
          zhCn: `最近 ${trendWindowDays} 天新生成的代理佣金金额。`,
          zhTw: `最近 ${trendWindowDays} 天新生成的代理佣金金額。`,
          en: `New commission amount generated in the last ${trendWindowDays} days.`,
        },
        locale,
      ),
      value: formatCurrency(totalTrendValue(agentCommissionTrendPoints), locale),
      tone: "good",
      points: agentCommissionTrendPoints,
    },
    {
      key: "withdrawal-settled",
      title: localizeText(
        { zhCn: "已结算提现", zhTw: "已結算提現", en: "Settled withdrawals" },
        locale,
      ),
      description: localizeText(
        {
          zhCn: `最近 ${trendWindowDays} 天已完成打款的提现金额。`,
          zhTw: `最近 ${trendWindowDays} 天已完成打款的提現金額。`,
          en: `Settled withdrawal amount in the last ${trendWindowDays} days.`,
        },
        locale,
      ),
      value: formatCurrency(totalTrendValue(settledWithdrawalTrendPoints), locale),
      tone: totalTrendValue(settledWithdrawalTrendPoints) > 0 ? "good" : "neutral",
      points: settledWithdrawalTrendPoints,
    },
  ];

  return {
    metrics: [
      {
        label: localizeText(
          { zhCn: "累计已实现营收", zhTw: "累計已實現營收", en: "Realized revenue" },
          locale,
        ),
        value: formatCurrency(totalRevenue, locale),
        description: localizeText(
          {
            zhCn: `会员、内容和球币充值合计 ${formatNumber(totalPaidOrders, locale)} 笔已支付订单。`,
            zhTw: `會員、內容和球幣充值合計 ${formatNumber(totalPaidOrders, locale)} 筆已支付訂單。`,
            en: `${formatNumber(totalPaidOrders, locale)} paid orders across membership, content, and coin recharge.`,
          },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "有效会员数", zhTw: "有效會員數", en: "Active members" },
          locale,
        ),
        value: formatNumber(activeMembershipCount, locale),
        description: localizeText(
          {
            zhCn: `会员实收 ${formatCurrency(membershipRevenue, locale)}。`,
            zhTw: `會員實收 ${formatCurrency(membershipRevenue, locale)}。`,
            en: `Membership revenue ${formatCurrency(membershipRevenue, locale)}.`,
          },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "已发布内容", zhTw: "已發布內容", en: "Published content" },
          locale,
        ),
        value: formatNumber(publishedPlanCount, locale),
        description: localizeText(
          {
            zhCn: `热门计划 ${formatNumber(hotPlanCount, locale)} 条，AI 预测 ${formatNumber(totalPredictionCount, locale)} 条。`,
            zhTw: `熱門計劃 ${formatNumber(hotPlanCount, locale)} 條，AI 預測 ${formatNumber(totalPredictionCount, locale)} 條。`,
            en: `${formatNumber(hotPlanCount, locale)} hot plans and ${formatNumber(totalPredictionCount, locale)} prediction records.`,
          },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "活跃代理网络", zhTw: "活躍代理網路", en: "Active agent network" },
          locale,
        ),
        value: formatNumber(activeAgents, locale),
        description: localizeText(
          {
            zhCn: `待审申请 ${formatNumber(pendingApplications, locale)} 条，线索池 ${formatNumber(newLeads + followingLeads, locale)} 条。`,
            zhTw: `待審申請 ${formatNumber(pendingApplications, locale)} 條，線索池 ${formatNumber(newLeads + followingLeads, locale)} 條。`,
            en: `${formatNumber(pendingApplications, locale)} pending applications and ${formatNumber(newLeads + followingLeads, locale)} leads in pipeline.`,
          },
          locale,
        ),
      },
    ],
    agentBiMetrics: [
      {
        label: localizeText(
          { zhCn: "归因充值额", zhTw: "歸因充值額", en: "Attributed recharge" },
          locale,
        ),
        value: formatCurrency(totalAttributedRecharge, locale),
        description: localizeText(
          {
            zhCn: `当前代理网络累计直推用户 ${formatNumber(totalReferredUsers, locale)} 人。`,
            zhTw: `當前代理網路累計直推用戶 ${formatNumber(totalReferredUsers, locale)} 人。`,
            en: `${formatNumber(totalReferredUsers, locale)} directly attributed users in the agent network.`,
          },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "直推净佣金", zhTw: "直推淨佣金", en: "Direct net commission" },
          locale,
        ),
        value: formatCurrency(totalDirectCommission, locale),
        description: localizeText(
          {
            zhCn: `下级分佣累计 ${formatCurrency(totalDownstreamCommission, locale)}。`,
            zhTw: `下級分佣累計 ${formatCurrency(totalDownstreamCommission, locale)}。`,
            en: `Downstream commission totals ${formatCurrency(totalDownstreamCommission, locale)}.`,
          },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "代理层级扩展", zhTw: "代理層級擴展", en: "Downstream expansion" },
          locale,
        ),
        value: formatNumber(totalChildAgents, locale),
        description: localizeText(
          {
            zhCn: "统计所有代理已挂接的下级代理数量。",
            zhTw: "統計所有代理已掛接的下級代理數量。",
            en: "Total number of downstream agents attached to the network.",
          },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "待打款压力", zhTw: "待打款壓力", en: "Pending payout" },
          locale,
        ),
        value: formatCurrency(totalPendingPayout, locale),
        description: localizeText(
          {
            zhCn: `已完成提现 ${formatCurrency(totalSettledWithdrawal, locale)}。`,
            zhTw: `已完成提現 ${formatCurrency(totalSettledWithdrawal, locale)}。`,
            en: `Settled withdrawals total ${formatCurrency(totalSettledWithdrawal, locale)}.`,
          },
          locale,
        ),
      },
    ],
    trendCards,
    longRangeRows,
    breakdownSections,
    revenueRows: [
      {
        title: localizeText({ zhCn: "会员订单营收", zhTw: "會員訂單營收", en: "Membership revenue" }, locale),
        subtitle: localizeText(
          {
            zhCn: `${formatNumber(membershipPaid._count.id ?? 0, locale)} 笔已支付会员订单`,
            zhTw: `${formatNumber(membershipPaid._count.id ?? 0, locale)} 筆已支付會員訂單`,
            en: `${formatNumber(membershipPaid._count.id ?? 0, locale)} paid membership orders`,
          },
          locale,
        ),
        status: formatCurrency(membershipRevenue, locale),
        tone: "good",
      },
      {
        title: localizeText({ zhCn: "内容解锁营收", zhTw: "內容解鎖營收", en: "Content unlock revenue" }, locale),
        subtitle: localizeText(
          {
            zhCn: `${formatNumber(contentPaid._count.id ?? 0, locale)} 笔已支付内容订单`,
            zhTw: `${formatNumber(contentPaid._count.id ?? 0, locale)} 筆已支付內容訂單`,
            en: `${formatNumber(contentPaid._count.id ?? 0, locale)} paid content orders`,
          },
          locale,
        ),
        status: formatCurrency(contentRevenue, locale),
        tone: "good",
      },
      {
        title: localizeText({ zhCn: "球币充值实收", zhTw: "球幣充值實收", en: "Coin recharge revenue" }, locale),
        subtitle: localizeText(
          {
            zhCn: `${formatNumber(rechargePaid._count.id ?? 0, locale)} 笔已支付充值单`,
            zhTw: `${formatNumber(rechargePaid._count.id ?? 0, locale)} 筆已支付充值單`,
            en: `${formatNumber(rechargePaid._count.id ?? 0, locale)} paid recharge orders`,
          },
          locale,
        ),
        status: formatCurrency(rechargeRevenue, locale),
        tone: "good",
      },
      {
        title: localizeText({ zhCn: "充值待处理", zhTw: "充值待處理", en: "Recharge pending" }, locale),
        subtitle: localizeText(
          {
            zhCn: "用于对账、手动补单和异常关闭。",
            zhTw: "用於對帳、手動補單和異常關閉。",
            en: "Used for reconciliation, manual repair, and abnormal close.",
          },
          locale,
        ),
        status: formatNumber(pendingRechargeOrders, locale),
        tone: pendingRechargeOrders > 0 ? "warn" : "neutral",
      },
    ],
    growthRows: [
      {
        title: localizeText({ zhCn: "代理申请审批池", zhTw: "代理申請審批池", en: "Agent application queue" }, locale),
        subtitle: localizeText(
          {
            zhCn: "待审申请可直接转正式代理。",
            zhTw: "待審申請可直接轉正式代理。",
            en: "Pending applications can be approved into active agents.",
          },
          locale,
        ),
        status: formatNumber(pendingApplications, locale),
        tone: pendingApplications > 0 ? "warn" : "neutral",
      },
      {
        title: localizeText({ zhCn: "活跃代理名册", zhTw: "活躍代理名冊", en: "Active agent roster" }, locale),
        subtitle: localizeText(
          {
            zhCn: "已生成邀请码并保持归因能力。",
            zhTw: "已生成邀請碼並保持歸因能力。",
            en: "Invite codes are ready for attribution.",
          },
          locale,
        ),
        status: formatNumber(activeAgents, locale),
        tone: "good",
      },
      {
        title: localizeText({ zhCn: "招商线索池", zhTw: "招商線索池", en: "Recruitment leads" }, locale),
        subtitle: localizeText(
          {
            zhCn: `新线索 ${formatNumber(newLeads, locale)} / 跟进中 ${formatNumber(followingLeads, locale)}`,
            zhTw: `新線索 ${formatNumber(newLeads, locale)} / 跟進中 ${formatNumber(followingLeads, locale)}`,
            en: `${formatNumber(newLeads, locale)} new and ${formatNumber(followingLeads, locale)} following`,
          },
          locale,
        ),
        status: formatNumber(newLeads + followingLeads, locale),
        tone: followingLeads > 0 ? "warn" : "neutral",
      },
      {
        title: localizeText({ zhCn: "佣金提现审核", zhTw: "佣金提現審核", en: "Commission withdrawals" }, locale),
        subtitle: localizeText(
          {
            zhCn: `已结算 ${formatCurrency(settledWithdrawals._sum.amount ?? 0, locale)}`,
            zhTw: `已結算 ${formatCurrency(settledWithdrawals._sum.amount ?? 0, locale)}`,
            en: `Settled ${formatCurrency(settledWithdrawals._sum.amount ?? 0, locale)}`,
          },
          locale,
        ),
        status: formatNumber(pendingWithdrawals, locale),
        tone: pendingWithdrawals > 0 ? "warn" : "neutral",
      },
    ],
    agentBiRows: agentBiRows.map((item) => ({
      title: `${item.agentName} / ${item.inviteCode}`,
      subtitle: localizeText(
        {
          zhCn: `${getAgentLevelSummary(item.level, locale)} / 直推 ${formatNumber(item.referredUsers, locale)} / 下级 ${formatNumber(item.childAgents, locale)}`,
          zhTw: `${getAgentLevelSummary(item.level, locale)} / 直推 ${formatNumber(item.referredUsers, locale)} / 下級 ${formatNumber(item.childAgents, locale)}`,
          en: `${getAgentLevelSummary(item.level, locale)} / ${formatNumber(item.referredUsers, locale)} direct / ${formatNumber(item.childAgents, locale)} downstream`,
        },
        locale,
      ),
      status: formatCurrency(item.totalCommissionNet, locale),
      tone: item.totalCommissionNet > 0 ? "good" : "neutral",
      meta: [
        localizeText(
          {
            zhCn: `直推充值 ${formatCurrency(item.directRechargeAmount, locale)}`,
            zhTw: `直推充值 ${formatCurrency(item.directRechargeAmount, locale)}`,
            en: `Direct recharge ${formatCurrency(item.directRechargeAmount, locale)}`,
          },
          locale,
        ),
        localizeText(
          {
            zhCn: `直推佣金 ${formatCurrency(item.directCommissionNet, locale)}`,
            zhTw: `直推佣金 ${formatCurrency(item.directCommissionNet, locale)}`,
            en: `Direct commission ${formatCurrency(item.directCommissionNet, locale)}`,
          },
          locale,
        ),
        localizeText(
          {
            zhCn: `下级分佣 ${formatCurrency(item.downstreamCommissionNet, locale)}`,
            zhTw: `下級分佣 ${formatCurrency(item.downstreamCommissionNet, locale)}`,
            en: `Downstream commission ${formatCurrency(item.downstreamCommissionNet, locale)}`,
          },
          locale,
        ),
        localizeText(
          {
            zhCn: `待结算 ${formatCurrency(item.unsettledCommission, locale)}`,
            zhTw: `待結算 ${formatCurrency(item.unsettledCommission, locale)}`,
            en: `Unsettled ${formatCurrency(item.unsettledCommission, locale)}`,
          },
          locale,
        ),
        localizeText(
          {
            zhCn: `已提现 ${formatCurrency(item.settledWithdrawalAmount, locale)}`,
            zhTw: `已提現 ${formatCurrency(item.settledWithdrawalAmount, locale)}`,
            en: `Settled withdrawal ${formatCurrency(item.settledWithdrawalAmount, locale)}`,
          },
          locale,
        ),
        localizeText(
          {
            zhCn: `待打款 ${formatCurrency(item.pendingWithdrawalAmount, locale)}`,
            zhTw: `待打款 ${formatCurrency(item.pendingWithdrawalAmount, locale)}`,
            en: `Pending payout ${formatCurrency(item.pendingWithdrawalAmount, locale)}`,
          },
          locale,
        ),
      ],
    })),
    operationsRows: [
      {
        title: localizeText({ zhCn: "计划单发布面", zhTw: "計劃單發布面", en: "Plan publishing" }, locale),
        subtitle: localizeText(
          {
            zhCn: `已发布 ${formatNumber(publishedPlanCount, locale)} 条，热门 ${formatNumber(hotPlanCount, locale)} 条。`,
            zhTw: `已發布 ${formatNumber(publishedPlanCount, locale)} 條，熱門 ${formatNumber(hotPlanCount, locale)} 條。`,
            en: `${formatNumber(publishedPlanCount, locale)} published and ${formatNumber(hotPlanCount, locale)} hot.`,
          },
          locale,
        ),
        status: localizeText({ zhCn: "运行中", zhTw: "運行中", en: "Live" }, locale),
        tone: "good",
      },
      {
        title: localizeText({ zhCn: "AI 预测池", zhTw: "AI 預測池", en: "AI prediction pool" }, locale),
        subtitle: localizeText(
          {
            zhCn: `待结算 ${formatNumber(pendingPredictionCount, locale)} 条。`,
            zhTw: `待結算 ${formatNumber(pendingPredictionCount, locale)} 條。`,
            en: `${formatNumber(pendingPredictionCount, locale)} pending results.`,
          },
          locale,
        ),
        status: formatNumber(totalPredictionCount, locale),
        tone: "neutral",
      },
      {
        title: localizeText({ zhCn: "首页运营位", zhTw: "首頁運營位", en: "Homepage operations" }, locale),
        subtitle: localizeText(
          {
            zhCn: `Banner ${formatNumber(activeBannerCount, locale)} / 公告 ${formatNumber(activeAnnouncementCount, locale)}`,
            zhTw: `Banner ${formatNumber(activeBannerCount, locale)} / 公告 ${formatNumber(activeAnnouncementCount, locale)}`,
            en: `${formatNumber(activeBannerCount, locale)} banners and ${formatNumber(activeAnnouncementCount, locale)} announcements`,
          },
          locale,
        ),
        status: localizeText({ zhCn: "已上线", zhTw: "已上線", en: "Configured" }, locale),
        tone: "good",
      },
      {
        title: localizeText({ zhCn: "AI 客服知识库", zhTw: "AI 客服知識庫", en: "Assistant knowledge base" }, locale),
        subtitle: localizeText(
          {
            zhCn: `启用条目 ${formatNumber(activeKnowledgeCount, locale)} / 待人工转接 ${formatNumber(pendingHandoffCount, locale)}`,
            zhTw: `啟用條目 ${formatNumber(activeKnowledgeCount, locale)} / 待人工轉接 ${formatNumber(pendingHandoffCount, locale)}`,
            en: `${formatNumber(activeKnowledgeCount, locale)} active items and ${formatNumber(pendingHandoffCount, locale)} pending handoffs`,
          },
          locale,
        ),
        status: pendingHandoffCount > 0
          ? localizeText({ zhCn: "需跟进", zhTw: "需跟進", en: "Needs follow-up" }, locale)
          : localizeText({ zhCn: "稳定", zhTw: "穩定", en: "Stable" }, locale),
        tone: pendingHandoffCount > 0 ? "warn" : "good",
      },
    ],
    stabilityRows: [
      {
        title: localizeText({ zhCn: "同步任务总量", zhTw: "同步任務總量", en: "Sync run volume" }, locale),
        subtitle: localizeText(
          {
            zhCn: `最近 8 次成功 ${formatNumber(recentSuccessCount, locale)} 次。`,
            zhTw: `最近 8 次成功 ${formatNumber(recentSuccessCount, locale)} 次。`,
            en: `${formatNumber(recentSuccessCount, locale)} successful runs in the latest 8.`,
          },
          locale,
        ),
        status: formatNumber(totalSyncRuns, locale),
        tone: "neutral",
      },
      {
        title: localizeText({ zhCn: "同步失败监控", zhTw: "同步失敗監控", en: "Sync failures" }, locale),
        subtitle: localizeText(
          {
            zhCn: "基于 SyncRun 实时统计失败运行次数。",
            zhTw: "基於 SyncRun 即時統計失敗運行次數。",
            en: "Real-time failed run count from SyncRun.",
          },
          locale,
        ),
        status: formatNumber(failedSyncRuns, locale),
        tone: failedSyncRuns > 0 ? "warn" : "good",
      },
      {
        title: localizeText({ zhCn: "支付回调冲突", zhTw: "支付回調衝突", en: "Callback conflicts" }, locale),
        subtitle: localizeText(
          {
            zhCn: `失败回调 ${formatNumber(callbackFailed, locale)} 次。`,
            zhTw: `失敗回調 ${formatNumber(callbackFailed, locale)} 次。`,
            en: `${formatNumber(callbackFailed, locale)} failed callback events.`,
          },
          locale,
        ),
        status: formatNumber(callbackConflicts, locale),
        tone: callbackConflicts > 0 ? "warn" : "good",
      },
      {
        title: localizeText({ zhCn: "导出中心", zhTw: "匯出中心", en: "Export center" }, locale),
        subtitle: localizeText(
          {
            zhCn: "订单、球币、代理链路 CSV 可直接下载。",
            zhTw: "訂單、球幣、代理鏈路 CSV 可直接下載。",
            en: "Orders, coin, and agent CSVs are ready to download.",
          },
          locale,
        ),
        status: localizeText({ zhCn: "已开放", zhTw: "已開放", en: "Available" }, locale),
        tone: "good",
      },
    ],
    exportCards: [
      {
        scope: "orders",
        title: localizeText({ zhCn: "订单总表", zhTw: "訂單總表", en: "Orders CSV" }, locale),
        description: localizeText(
          {
            zhCn: "会员订单与内容订单统一导出。",
            zhTw: "會員訂單與內容訂單統一導出。",
            en: "Membership and content orders in one export.",
          },
          locale,
        ),
        badge: "CSV",
      },
      {
        scope: "finance-reconciliation",
        title: localizeText({ zhCn: "财务对账表", zhTw: "財務對帳表", en: "Finance reconciliation" }, locale),
        description: localizeText(
          {
            zhCn: "统一导出会员、内容、球币充值和退款状态，方便财务核对。",
            zhTw: "統一導出會員、內容、球幣充值與退款狀態，方便財務核對。",
            en: "Unified export of membership, content, coin recharge, and refund status.",
          },
          locale,
        ),
        badge: "Finance",
      },
      {
        scope: "coin-recharges",
        title: localizeText({ zhCn: "球币充值单", zhTw: "球幣充值單", en: "Coin recharges" }, locale),
        description: localizeText(
          {
            zhCn: "导出充值订单、支付状态和到账信息。",
            zhTw: "導出充值訂單、支付狀態和到帳資訊。",
            en: "Recharge orders with payment and credit status.",
          },
          locale,
        ),
        badge: "Finance",
      },
      {
        scope: "coin-ledgers",
        title: localizeText({ zhCn: "球币流水", zhTw: "球幣流水", en: "Coin ledger" }, locale),
        description: localizeText(
          {
            zhCn: "导出球币加减流水、前后余额和引用单据。",
            zhTw: "導出球幣加減流水、前後餘額和引用單據。",
            en: "Ledger entries with before and after balances.",
          },
          locale,
        ),
        badge: "Finance",
      },
      {
        scope: "agents",
        title: localizeText({ zhCn: "代理名册", zhTw: "代理名冊", en: "Agent roster" }, locale),
        description: localizeText(
          {
            zhCn: "导出代理层级、邀请码和佣金配置。",
            zhTw: "導出代理層級、邀請碼和佣金配置。",
            en: "Hierarchy, invite codes, and commission settings.",
          },
          locale,
        ),
        badge: "Agents",
      },
      {
        scope: "agent-applications",
        title: localizeText({ zhCn: "代理申请池", zhTw: "代理申請池", en: "Agent applications" }, locale),
        description: localizeText(
          {
            zhCn: "导出代理申请、审批结果与转正情况。",
            zhTw: "導出代理申請、審批結果與轉正情況。",
            en: "Application queue, review result, and approved profile linkage.",
          },
          locale,
        ),
        badge: "Agents",
      },
      {
        scope: "agent-commissions",
        title: localizeText({ zhCn: "代理佣金流水", zhTw: "代理佣金流水", en: "Agent commissions" }, locale),
        description: localizeText(
          {
            zhCn: "导出归因充值、佣金金额、已结算/已冲回与可结算余额。",
            zhTw: "導出歸因充值、佣金金額、已結算/已沖回與可結算餘額。",
            en: "Commission ledger with settled, reversed, and available amounts.",
          },
          locale,
        ),
        badge: "Agents",
      },
      {
        scope: "agent-performance",
        title: localizeText({ zhCn: "代理业绩看板", zhTw: "代理業績看板", en: "Agent performance" }, locale),
        description: localizeText(
          {
            zhCn: "导出代理层级、归因用户、累计佣金与提现表现。",
            zhTw: "導出代理層級、歸因用戶、累計佣金與提現表現。",
            en: "Agent hierarchy, attributed users, commission totals, and withdrawals.",
          },
          locale,
        ),
        badge: "BI",
      },
      {
        scope: "leads",
        title: localizeText({ zhCn: "招商线索", zhTw: "招商線索", en: "Recruitment leads" }, locale),
        description: localizeText(
          {
            zhCn: "导出招商活动、线索归属和跟进状态。",
            zhTw: "導出招商活動、線索歸屬和跟進狀態。",
            en: "Campaign, ownership, and follow-up status in one CSV.",
          },
          locale,
        ),
        badge: "Agents",
      },
      {
        scope: "withdrawals",
        title: localizeText({ zhCn: "提现审核", zhTw: "提現審核", en: "Withdrawal review" }, locale),
        description: localizeText(
          {
            zhCn: "导出代理提现状态、金额和备注。",
            zhTw: "導出代理提現狀態、金額和備註。",
            en: "Withdrawals with status, amount, and notes.",
          },
          locale,
        ),
        badge: "Agents",
      },
    ],
  };
}

export async function buildAdminReportExport(scope: AdminReportExportScope, filters?: AdminReportExportFilters) {
  const { fromDate, toDate, filters: normalizedFilters } = resolveExportDateRange(filters);

  if (scope === "orders") {
    const rows = await getAdminOrdersExportRows({
      orderType: normalizedFilters.orderType ?? "all",
      from: fromDate?.toISOString(),
      to: toDate?.toISOString(),
    });
    return {
      filename: "admin-orders",
      csv: buildAdminOrdersCsv(rows),
    };
  }

  if (scope === "finance-reconciliation") {
    const [orderRows, rechargeOrders] = await Promise.all([
      getAdminOrdersExportRows({
        orderType: normalizedFilters.orderType ?? "all",
        from: fromDate?.toISOString(),
        to: toDate?.toISOString(),
      }),
      prisma.coinRechargeOrder.findMany({
        where:
          fromDate || toDate
            ? {
                updatedAt: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {}),
                },
              }
            : undefined,
        orderBy: { updatedAt: "desc" },
        include: {
          user: {
            select: {
              displayName: true,
              email: true,
            },
          },
          package: {
            select: {
              titleZhCn: true,
              titleEn: true,
            },
          },
        },
      }),
    ]);

    return {
      filename: "admin-finance-reconciliation",
      csv: buildCsv([
        ...orderRows.map((item) => ({
          channel: item.orderType,
          orderNo: item.orderId,
          status: item.status,
          reconciliationStatus:
            item.status === "paid"
              ? "entitled"
              : item.status === "refunded"
                ? "reversed"
                : item.status,
          provider: item.provider,
          providerOrderId: item.providerOrderId ?? "",
          paymentReference: item.paymentReference ?? "",
          userDisplayName: item.userDisplayName,
          userEmail: item.userEmail,
          subjectTitle: item.subjectTitle,
          amount: item.amount,
          coinAmount: "",
          bonusAmount: "",
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          paidAt: item.paidAt ?? "",
          refundedAt: item.refundedAt ?? "",
          creditedAt: "",
          failureReason: item.failureReason ?? "",
          refundReason: item.refundReason ?? "",
        })),
        ...rechargeOrders.map((item) => ({
          channel: "coin-recharge",
          orderNo: item.orderNo,
          status: item.status,
          reconciliationStatus:
            item.status === "paid"
              ? item.creditedAt
                ? "credited"
                : "paid-not-credited"
              : item.status === "refunded"
                ? "refunded"
                : item.status,
          provider: item.provider,
          providerOrderId: item.providerOrderId ?? "",
          paymentReference: item.paymentReference ?? "",
          userDisplayName: item.user.displayName,
          userEmail: item.user.email,
          subjectTitle: item.package.titleZhCn || item.package.titleEn,
          amount: item.amount,
          coinAmount: item.coinAmount,
          bonusAmount: item.bonusAmount,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          paidAt: item.paidAt?.toISOString() ?? "",
          refundedAt: item.refundedAt?.toISOString() ?? "",
          creditedAt: item.creditedAt?.toISOString() ?? "",
          failureReason: item.failureReason ?? "",
          refundReason: item.refundReason ?? "",
        })),
      ]),
    };
  }

  if (scope === "coin-recharges") {
    const records = await prisma.coinRechargeOrder.findMany({
      where:
        fromDate || toDate
          ? {
              updatedAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : undefined,
      orderBy: { updatedAt: "desc" },
      include: {
        user: {
          select: {
            displayName: true,
            email: true,
          },
        },
        package: {
          select: {
            titleZhCn: true,
            titleEn: true,
          },
        },
      },
    });

    return {
      filename: "admin-coin-recharges",
      csv: buildCsv(
        records.map((item) => ({
          orderNo: item.orderNo,
          userDisplayName: item.user.displayName,
          userEmail: item.user.email,
          packageTitle: item.package.titleZhCn || item.package.titleEn,
          amount: item.amount,
          coinAmount: item.coinAmount,
          bonusAmount: item.bonusAmount,
          status: item.status,
          provider: item.provider,
          paymentReference: item.paymentReference ?? "",
          providerOrderId: item.providerOrderId ?? "",
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          paidAt: item.paidAt?.toISOString() ?? "",
          refundedAt: item.refundedAt?.toISOString() ?? "",
        })),
      ),
    };
  }

  if (scope === "coin-ledgers") {
    const records = await prisma.coinLedger.findMany({
      where:
        fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        account: {
          include: {
            user: {
              select: {
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return {
      filename: "admin-coin-ledgers",
      csv: buildCsv(
        records.map((item) => ({
          createdAt: item.createdAt.toISOString(),
          userDisplayName: item.account.user.displayName,
          userEmail: item.account.user.email,
          direction: item.direction,
          reason: item.reason,
          amount: item.amount,
          balanceBefore: item.balanceBefore,
          balanceAfter: item.balanceAfter,
          referenceType: item.referenceType ?? "",
          referenceId: item.referenceId ?? "",
          note: item.note ?? "",
        })),
      ),
    };
  }

  if (scope === "agent-applications") {
    const records = await prisma.agentApplication.findMany({
      where:
        fromDate || toDate
          ? {
              updatedAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : undefined,
      orderBy: { updatedAt: "desc" },
    });

    return {
      filename: "admin-agent-applications",
      csv: buildCsv(
        records.map((item) => ({
          applicantName: item.applicantName,
          phone: item.phone,
          contact: item.contact ?? "",
          channelSummary: item.channelSummary,
          expectedMonthlyUsers: item.expectedMonthlyUsers ?? "",
          desiredLevel: item.desiredLevel,
          status: item.status,
          reviewerNote: item.reviewerNote ?? "",
          createdAt: item.createdAt.toISOString(),
          reviewedAt: item.reviewedAt?.toISOString() ?? "",
        })),
      ),
    };
  }

  if (scope === "agents") {
    const records = await prisma.agentProfile.findMany({
      where:
        fromDate || toDate
          ? {
              updatedAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : undefined,
      orderBy: { updatedAt: "desc" },
      include: {
        parentAgent: {
          select: {
            displayName: true,
          },
        },
      },
    });

    return {
      filename: "admin-agents",
      csv: buildCsv(
        records.map((item) => ({
          displayName: item.displayName,
          level: item.level,
          status: item.status,
          inviteCode: item.inviteCode,
          parentAgentName: item.parentAgent?.displayName ?? "",
          commissionRate: item.commissionRate,
          downstreamRate: item.downstreamRate,
          totalReferredUsers: item.totalReferredUsers,
          monthlyRechargeAmount: item.monthlyRechargeAmount,
          totalCommission: item.totalCommission,
          unsettledCommission: item.unsettledCommission,
          payoutAccount: item.payoutAccount ?? "",
          updatedAt: item.updatedAt.toISOString(),
        })),
      ),
    };
  }

  if (scope === "leads") {
    const records = await prisma.recruitmentLead.findMany({
      where:
        fromDate || toDate
          ? {
              updatedAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : undefined,
      orderBy: { updatedAt: "desc" },
      include: {
        campaign: {
          select: {
            name: true,
          },
        },
        agent: {
          select: {
            displayName: true,
          },
        },
      },
    });

    return {
      filename: "admin-recruitment-leads",
      csv: buildCsv(
        records.map((item) => ({
          name: item.name,
          phone: item.phone,
          sourceChannel: item.sourceChannel,
          desiredLevel: item.desiredLevel,
          status: item.status,
          ownerName: item.ownerName ?? "",
          campaignName: item.campaign?.name ?? "",
          agentName: item.agent?.displayName ?? "",
          note: item.note ?? "",
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
      ),
    };
  }

  if (scope === "agent-commissions") {
    const recordsUntyped = await prisma.agentCommissionLedger.findMany({
      where:
        fromDate || toDate
          ? {
              createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        agent: {
          select: {
            displayName: true,
          },
        },
        user: {
          select: {
            displayName: true,
            email: true,
          },
        },
        rechargeOrder: {
          select: {
            orderNo: true,
          },
        },
      },
    });
    const records = recordsUntyped as AgentCommissionExportRow[];

    return {
      filename: "admin-agent-commissions",
      csv: buildCsv(
        records.map((item) => {
          const availableAmount = Math.max(0, item.commissionAmount - item.settledAmount - item.reversedAmount);
          return {
            createdAt: item.createdAt.toISOString(),
            agentName: item.agent.displayName,
            kind: item.kind,
            sourceAgentId: item.sourceAgentId ?? "",
            sourceAgentName: item.sourceAgentName ?? "",
            userDisplayName: item.user.displayName,
            userEmail: item.user.email,
            rechargeOrderNo: item.rechargeOrder.orderNo,
            rechargeAmount: item.rechargeAmount,
            commissionRate: item.commissionRate,
            commissionAmount: item.commissionAmount,
            settledAmount: item.settledAmount,
            reversedAmount: item.reversedAmount,
            availableAmount,
            status: item.status,
            settledAt: item.settledAt?.toISOString() ?? "",
            reversedAt: item.reversedAt?.toISOString() ?? "",
            note: item.note ?? "",
          };
        }),
      ),
    };
  }

  if (scope === "agent-performance") {
    const [agents, withdrawals] = await Promise.all([
      prisma.agentProfile.findMany({
        where:
          fromDate || toDate
            ? {
                updatedAt: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {}),
                },
              }
            : undefined,
        orderBy: { updatedAt: "desc" },
        include: {
          parentAgent: {
            select: {
              displayName: true,
            },
          },
        },
      }),
      prisma.agentWithdrawal.groupBy({
        by: ["agentId", "status"],
        where:
          fromDate || toDate
            ? {
                updatedAt: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {}),
                },
              }
            : undefined,
        _count: {
          _all: true,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const withdrawalStats = withdrawals.reduce<Record<string, {
      pendingCount: number;
      pendingAmount: number;
      settledCount: number;
      settledAmount: number;
      rejectedCount: number;
      rejectedAmount: number;
    }>>((accumulator, item) => {
      const entry = accumulator[item.agentId] ?? {
        pendingCount: 0,
        pendingAmount: 0,
        settledCount: 0,
        settledAmount: 0,
        rejectedCount: 0,
        rejectedAmount: 0,
      };

      const amount = item._sum.amount ?? 0;
      if (item.status === "settled") {
        entry.settledCount += item._count._all;
        entry.settledAmount += amount;
      } else if (item.status === "rejected") {
        entry.rejectedCount += item._count._all;
        entry.rejectedAmount += amount;
      } else {
        entry.pendingCount += item._count._all;
        entry.pendingAmount += amount;
      }

      accumulator[item.agentId] = entry;
      return accumulator;
    }, {});

    return {
      filename: "admin-agent-performance",
      csv: buildCsv(
        agents.map((item) => {
          const stats = withdrawalStats[item.id] ?? {
            pendingCount: 0,
            pendingAmount: 0,
            settledCount: 0,
            settledAmount: 0,
            rejectedCount: 0,
            rejectedAmount: 0,
          };

          return {
            displayName: item.displayName,
            level: item.level,
            status: item.status,
            inviteCode: item.inviteCode,
            parentAgentName: item.parentAgent?.displayName ?? "",
            totalReferredUsers: item.totalReferredUsers,
            monthlyRechargeAmount: item.monthlyRechargeAmount,
            totalCommission: item.totalCommission,
            unsettledCommission: item.unsettledCommission,
            payoutAccount: item.payoutAccount ?? "",
            pendingWithdrawalCount: stats.pendingCount,
            pendingWithdrawalAmount: stats.pendingAmount,
            settledWithdrawalCount: stats.settledCount,
            settledWithdrawalAmount: stats.settledAmount,
            rejectedWithdrawalCount: stats.rejectedCount,
            rejectedWithdrawalAmount: stats.rejectedAmount,
            updatedAt: item.updatedAt.toISOString(),
          };
        }),
      ),
    };
  }

  const records = await prisma.agentWithdrawal.findMany({
    where:
      fromDate || toDate
        ? {
            updatedAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : undefined,
    orderBy: { updatedAt: "desc" },
    select: {
      amount: true,
      status: true,
      payoutAccount: true,
      payoutChannel: true,
      payoutReference: true,
      payoutOperator: true,
      note: true,
      proofUrl: true,
      rejectionReason: true,
      requestedAt: true,
      reviewedAt: true,
      settledAt: true,
      agent: {
        select: {
          displayName: true,
        },
      },
      allocations: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: {
          commissionLedger: {
            select: {
              rechargeOrder: {
                select: {
                  orderNo: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return {
    filename: "admin-agent-withdrawals",
    csv: buildCsv(
      records.map((item) => ({
        agentName: item.agent.displayName,
        amount: item.amount,
        status: item.status,
        payoutAccount: item.payoutAccount ?? "",
        payoutChannel: item.payoutChannel ?? "",
        payoutReference: item.payoutReference ?? "",
        payoutOperator: item.payoutOperator ?? "",
        note: item.note ?? "",
        proofUrl: item.proofUrl ?? "",
        allocationCount: item.allocations.length,
        allocatedAmount: item.allocations.reduce((total, allocation) => total + allocation.amount, 0),
        allocationRefs: item.allocations.map((allocation) => allocation.commissionLedger.rechargeOrder.orderNo).join(" | "),
        rejectionReason: item.rejectionReason ?? "",
        requestedAt: item.requestedAt.toISOString(),
        reviewedAt: item.reviewedAt?.toISOString() ?? "",
        settledAt: item.settledAt?.toISOString() ?? "",
      })),
    ),
  };
}

