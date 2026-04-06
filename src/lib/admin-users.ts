import { membershipPlans } from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";
import { recordUserMembershipEvent } from "@/lib/user-activity";
import type { OrderStatus, UserRole } from "@/lib/types";

export type AdminOrderFilterStatus = "all" | OrderStatus;
export type AdminOrderFilterType = "all" | "membership" | "content";

export type AdminUsersDashboardFilters = {
  query?: string;
  orderStatus?: AdminOrderFilterStatus;
  orderType?: AdminOrderFilterType;
  from?: string;
  to?: string;
  membershipPage?: number;
  contentPage?: number;
  pageSize?: number;
  usersLimit?: number;
  ordersLimit?: number;
};

export type AdminOrderPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

export type AdminUserRecord = {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  referredByAgentName?: string;
  referredByAgentCode?: string;
  membershipPlanId?: string;
  membershipExpiresAt?: string;
  coinBalance: number;
  membershipStatus: "active" | "inactive";
  membershipOrderCount: number;
  contentOrderCount: number;
  createdAt: string;
};

export type AdminMembershipOrderRecord = {
  id: string;
  userDisplayName: string;
  userEmail: string;
  planId: string;
  planName: string;
  amount: number;
  status: OrderStatus;
  provider: "mock" | "manual" | "hosted";
  providerOrderId?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  failedAt?: string;
  failureReason?: string;
  closedAt?: string;
  refundedAt?: string;
  refundReason?: string;
  paymentReference?: string;
};

export type AdminContentOrderRecord = {
  id: string;
  userDisplayName: string;
  userEmail: string;
  contentId: string;
  contentTitle: string;
  amount: number;
  status: OrderStatus;
  provider: "mock" | "manual" | "hosted";
  providerOrderId?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  failedAt?: string;
  failureReason?: string;
  closedAt?: string;
  refundedAt?: string;
  refundReason?: string;
  paymentReference?: string;
};

export type AdminOrderExportRow = {
  orderType: "membership" | "content";
  orderId: string;
  status: OrderStatus;
  provider: "mock" | "manual" | "hosted";
  providerOrderId?: string;
  expiresAt?: string;
  userDisplayName: string;
  userEmail: string;
  subjectId: string;
  subjectTitle: string;
  amount: number;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  failedAt?: string;
  failureReason?: string;
  closedAt?: string;
  refundedAt?: string;
  refundReason?: string;
};

export type AdminUsersDashboard = {
  metrics: {
    userCount: number;
    activeMembershipCount: number;
    membershipOrderCount: number;
    contentOrderCount: number;
  };
  appliedFilters: {
    query: string;
    orderStatus: AdminOrderFilterStatus;
    orderType: AdminOrderFilterType;
    from: string;
    to: string;
    membershipPage: number;
    contentPage: number;
    pageSize: number;
  };
  users: AdminUserRecord[];
  membershipOrders: AdminMembershipOrderRecord[];
  contentOrders: AdminContentOrderRecord[];
  membershipPagination: AdminOrderPagination | null;
  contentPagination: AdminOrderPagination | null;
};

export type AdminPaymentCallbackRecord = {
  id: string;
  provider: "mock" | "manual" | "hosted";
  providerEventId?: string;
  eventKey: string;
  orderType: "membership" | "content";
  orderId?: string;
  providerOrderId?: string;
  paymentReference?: string;
  state: "paid" | "failed" | "closed";
  processingStatus: "received" | "processed" | "ignored" | "conflict" | "failed";
  processingMessage?: string;
  duplicateCount: number;
  createdAt: string;
  lastSeenAt: string;
};

export type AdminPaymentCallbackActivity = {
  metrics: {
    eventCount: number;
    duplicateCount: number;
    conflictCount: number;
    failedCount: number;
  };
  recent: AdminPaymentCallbackRecord[];
};

export type AdminUserDetailLedgerRecord = {
  id: string;
  direction: "credit" | "debit";
  reason: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  note?: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
};

export type AdminUserRechargeOrderRecord = {
  id: string;
  orderNo: string;
  packageTitle: string;
  amount: number;
  totalCoins: number;
  status: OrderStatus;
  provider: "mock" | "manual" | "hosted";
  paymentReference?: string;
  createdAt: string;
  paidAt?: string;
  refundedAt?: string;
  failureReason?: string;
  refundReason?: string;
};

export type AdminUserLoginActivityRecord = {
  id: string;
  source: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
};

export type AdminUserMembershipEventRecord = {
  id: string;
  action: string;
  planId?: string;
  planName?: string;
  previousPlanId?: string;
  previousPlanName?: string;
  previousExpiresAt?: string;
  nextExpiresAt?: string;
  note?: string;
  createdByDisplayName?: string;
  createdAt: string;
};

export type AdminUserSessionRecord = {
  id: string;
  createdAt: string;
  expiresAt: string;
};

export type AdminUserAuditRecord = {
  id: string;
  actorDisplayName: string;
  actorRole: string;
  action: string;
  scope: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  status: string;
  detail?: string;
  createdAt: string;
};

export type AdminUserAgentFinanceSummary = {
  attributedDirectCommissionNet: number;
  attributedDownstreamCommissionNet: number;
  attributedRechargeAmount: number;
  attributedLedgerCount: number;
  lastAttributedAt?: string;
  ownAgentStatus?: string;
  ownTotalCommission?: number;
  ownUnsettledCommission?: number;
  ownSettledWithdrawalAmount: number;
  ownPendingWithdrawalAmount: number;
  ownRejectedWithdrawalAmount: number;
};

export type AdminUserAgentCommissionLedgerRecord = {
  id: string;
  agentId: string;
  agentName: string;
  kind: "direct" | "downstream";
  rechargeOrderNo: string;
  rechargeAmount: number;
  commissionRate: number;
  commissionAmount: number;
  settledAmount: number;
  reversedAmount: number;
  availableAmount: number;
  status: "pending" | "partial" | "settled" | "reversed";
  createdAt: string;
  settledAt?: string;
  reversedAt?: string;
};

export type AdminUserReportSummary = {
  paidMembershipAmount: number;
  paidMembershipCount: number;
  paidContentAmount: number;
  paidContentCount: number;
  paidRechargeAmount: number;
  paidRechargeCount: number;
  refundedAmount: number;
  refundedCount: number;
  lastPaidAt?: string;
  recent30dPaidAmount: number;
  recent30dPaidCount: number;
  recent30dRefundAmount: number;
  recent30dRechargeAmount: number;
};

export type AdminUserTrendPoint = {
  label: string;
  value: number;
};

export type AdminUserReportTrends = {
  paidAmountPoints: AdminUserTrendPoint[];
  rechargeAmountPoints: AdminUserTrendPoint[];
  refundAmountPoints: AdminUserTrendPoint[];
};

export type AdminUserWorkspace = {
  summary: {
    id: string;
    displayName: string;
    email: string;
    role: UserRole;
    createdAt: string;
    updatedAt: string;
    referredAt?: string;
    coinBalance: number;
    coinLifetimeCredited: number;
    coinLifetimeDebited: number;
    coinLastActivityAt?: string;
    membershipPlanId?: string;
    membershipPlanName?: string;
    membershipExpiresAt?: string;
    membershipStatus: "active" | "inactive";
    referredByAgentName?: string;
    referredByAgentCode?: string;
    activeSessionCount: number;
  };
  reportSummary: AdminUserReportSummary;
  reportTrends: AdminUserReportTrends;
  permissions: string[];
  sessions: AdminUserSessionRecord[];
  loginActivities: AdminUserLoginActivityRecord[];
  membershipEvents: AdminUserMembershipEventRecord[];
  ledgers: AdminUserDetailLedgerRecord[];
  rechargeOrders: AdminUserRechargeOrderRecord[];
  membershipOrders: AdminMembershipOrderRecord[];
  contentOrders: AdminContentOrderRecord[];
  paymentCallbacks: AdminPaymentCallbackRecord[];
  auditLogs: AdminUserAuditRecord[];
  agentSummary: {
    referredByAgentName?: string;
    referredByAgentCode?: string;
    ownAgentName?: string;
    ownAgentCode?: string;
    referredUsersCount: number;
    childAgentsCount: number;
  };
  agentFinance: AdminUserAgentFinanceSummary;
  agentCommissionLedgers: AdminUserAgentCommissionLedgerRecord[];
};

function resolvePlanName(planId: string) {
  return membershipPlans.find((plan) => plan.id === planId)?.name ?? planId;
}

function nextMembershipExpiry(currentExpiry: Date | null, durationDays: number) {
  const now = new Date();
  const base = currentExpiry && currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
  const expiresAt = new Date(base);
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  return expiresAt;
}

function normalizeQuery(value?: string) {
  return value?.trim() ?? "";
}

function toUserTrendDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function buildRecentTrendKeys(days: number) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const current = new Date(end);
    current.setDate(end.getDate() - (days - index - 1));
    return toUserTrendDateKey(current);
  });
}

function toTrendLabel(dateKey: string) {
  return dateKey.slice(5);
}

const DEFAULT_ORDER_PAGE_SIZE = 10;
const MAX_ORDER_PAGE_SIZE = 50;

export function normalizeAdminOrderFilterStatus(value?: string | null): AdminOrderFilterStatus {
  if (value === "pending" || value === "paid" || value === "failed" || value === "closed" || value === "refunded") {
    return value;
  }

  return "all";
}

export function normalizeAdminOrderFilterType(value?: string | null): AdminOrderFilterType {
  if (value === "membership" || value === "content") {
    return value;
  }

  return "all";
}

function normalizePositiveInt(value: number | undefined, fallback: number, max?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.trunc(value);

  if (normalized < 1) {
    return fallback;
  }

  if (typeof max === "number") {
    return Math.min(normalized, max);
  }

  return normalized;
}

function parseAdminOrderDateValue(value?: string | null) {
  const raw = value?.trim() ?? "";

  if (!raw) {
    return null;
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    raw,
    date,
  };
}

function resolveAdminOrderDateRange(fromValue?: string | null, toValue?: string | null) {
  const from = parseAdminOrderDateValue(fromValue);
  const to = parseAdminOrderDateValue(toValue);

  if (from && to && from.date > to.date) {
    return {
      from: to.raw,
      to: from.raw,
      fromDate: to.date,
      toDate: from.date,
    };
  }

  return {
    from: from?.raw ?? "",
    to: to?.raw ?? "",
    fromDate: from?.date,
    toDate: to?.date,
  };
}

function buildOrderPagination(total: number, requestedPage: number, pageSize: number): AdminOrderPagination {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}

function buildUserSearch(query: string) {
  return {
    OR: [{ displayName: { contains: query } }, { email: { contains: query } }],
  };
}

function buildMembershipOrderWhere(filters: {
  query: string;
  orderStatus: AdminOrderFilterStatus;
  fromDate?: Date;
  toDate?: Date;
}) {
  return {
    ...(filters.orderStatus !== "all" ? { status: filters.orderStatus } : {}),
    ...(filters.fromDate || filters.toDate
      ? {
          updatedAt: {
            ...(filters.fromDate ? { gte: filters.fromDate } : {}),
            ...(filters.toDate ? { lte: filters.toDate } : {}),
          },
        }
      : {}),
    ...(filters.query
      ? {
          OR: [
            { id: { contains: filters.query } },
            { planId: { contains: filters.query } },
            { providerOrderId: { contains: filters.query } },
            { paymentReference: { contains: filters.query } },
            { user: { is: buildUserSearch(filters.query) } },
          ],
        }
      : {}),
  };
}

function buildContentOrderWhere(filters: {
  query: string;
  orderStatus: AdminOrderFilterStatus;
  fromDate?: Date;
  toDate?: Date;
}) {
  return {
    ...(filters.orderStatus !== "all" ? { status: filters.orderStatus } : {}),
    ...(filters.fromDate || filters.toDate
      ? {
          updatedAt: {
            ...(filters.fromDate ? { gte: filters.fromDate } : {}),
            ...(filters.toDate ? { lte: filters.toDate } : {}),
          },
        }
      : {}),
    ...(filters.query
      ? {
          OR: [
            { id: { contains: filters.query } },
            { contentId: { contains: filters.query } },
            { providerOrderId: { contains: filters.query } },
            { paymentReference: { contains: filters.query } },
            { user: { is: buildUserSearch(filters.query) } },
          ],
        }
      : {}),
  };
}

function toMembershipOrderRecord(order: {
  id: string;
  planId: string;
  amount: number;
  status: string;
  provider: string;
  providerOrderId: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  paidAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  closedAt: Date | null;
  refundedAt: Date | null;
  refundReason: string | null;
  paymentReference: string | null;
  user: {
    displayName: string;
    email: string;
  };
}): AdminMembershipOrderRecord {
  return {
    id: order.id,
    userDisplayName: order.user.displayName,
    userEmail: order.user.email,
    planId: order.planId,
    planName: resolvePlanName(order.planId),
    amount: order.amount,
    status: order.status as OrderStatus,
    provider: order.provider === "manual" ? "manual" : order.provider === "hosted" ? "hosted" : "mock",
    providerOrderId: order.providerOrderId ?? undefined,
    expiresAt: order.expiresAt?.toISOString(),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    paidAt: order.paidAt?.toISOString(),
    failedAt: order.failedAt?.toISOString(),
    failureReason: order.failureReason ?? undefined,
    closedAt: order.closedAt?.toISOString(),
    refundedAt: order.refundedAt?.toISOString(),
    refundReason: order.refundReason ?? undefined,
    paymentReference: order.paymentReference ?? undefined,
  };
}

function toContentOrderRecord(
  order: {
    id: string;
    contentId: string;
    amount: number;
    status: string;
    provider: string;
    providerOrderId: string | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    paidAt: Date | null;
    failedAt: Date | null;
    failureReason: string | null;
    closedAt: Date | null;
    refundedAt: Date | null;
    refundReason: string | null;
    paymentReference: string | null;
    user: {
      displayName: string;
      email: string;
    };
  },
  contentTitles: Map<string, string>,
): AdminContentOrderRecord {
  return {
    id: order.id,
    userDisplayName: order.user.displayName,
    userEmail: order.user.email,
    contentId: order.contentId,
    contentTitle: contentTitles.get(order.contentId) ?? order.contentId,
    amount: order.amount,
    status: order.status as OrderStatus,
    provider: order.provider === "manual" ? "manual" : order.provider === "hosted" ? "hosted" : "mock",
    providerOrderId: order.providerOrderId ?? undefined,
    expiresAt: order.expiresAt?.toISOString(),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    paidAt: order.paidAt?.toISOString(),
    failedAt: order.failedAt?.toISOString(),
    failureReason: order.failureReason ?? undefined,
    closedAt: order.closedAt?.toISOString(),
    refundedAt: order.refundedAt?.toISOString(),
    refundReason: order.refundReason ?? undefined,
    paymentReference: order.paymentReference ?? undefined,
  };
}

function toPaymentCallbackRecord(event: {
  id: string;
  provider: string;
  providerEventId: string | null;
  eventKey: string;
  orderType: string;
  orderId: string | null;
  providerOrderId: string | null;
  paymentReference: string | null;
  state: string;
  processingStatus: string;
  processingMessage: string | null;
  duplicateCount: number;
  createdAt: Date;
  lastSeenAt: Date;
}): AdminPaymentCallbackRecord {
  return {
    id: event.id,
    provider: event.provider === "manual" ? "manual" : event.provider === "hosted" ? "hosted" : "mock",
    providerEventId: event.providerEventId ?? undefined,
    eventKey: event.eventKey,
    orderType: event.orderType === "membership" ? "membership" : "content",
    orderId: event.orderId ?? undefined,
    providerOrderId: event.providerOrderId ?? undefined,
    paymentReference: event.paymentReference ?? undefined,
    state:
      event.state === "failed" || event.state === "closed"
        ? event.state
        : "paid",
    processingStatus:
      event.processingStatus === "processed" ||
      event.processingStatus === "ignored" ||
      event.processingStatus === "conflict" ||
      event.processingStatus === "failed"
        ? event.processingStatus
        : "received",
    processingMessage: event.processingMessage ?? undefined,
    duplicateCount: event.duplicateCount,
    createdAt: event.createdAt.toISOString(),
    lastSeenAt: event.lastSeenAt.toISOString(),
  };
}

async function getContentTitles(contentIds: string[]) {
  if (contentIds.length === 0) {
    return new Map<string, string>();
  }

  return new Map(
    (
      await prisma.articlePlan.findMany({
        where: {
          id: {
            in: [...new Set(contentIds)],
          },
        },
        select: {
          id: true,
          title: true,
        },
      })
    ).map((plan) => [plan.id, plan.title] as const),
  );
}

export async function getAdminUsersDashboard(input: AdminUsersDashboardFilters = {}): Promise<AdminUsersDashboard> {
  const now = new Date();
  const query = normalizeQuery(input.query);
  const orderStatus = normalizeAdminOrderFilterStatus(input.orderStatus);
  const orderType = normalizeAdminOrderFilterType(input.orderType);
  const { from, to, fromDate, toDate } = resolveAdminOrderDateRange(input.from, input.to);
  const membershipPage = normalizePositiveInt(input.membershipPage, 1);
  const contentPage = normalizePositiveInt(input.contentPage, 1);
  const pageSize = normalizePositiveInt(input.pageSize ?? input.ordersLimit, DEFAULT_ORDER_PAGE_SIZE, MAX_ORDER_PAGE_SIZE);
  const usersLimit = input.usersLimit ?? 12;
  const showMembershipOrders = orderType !== "content";
  const showContentOrders = orderType !== "membership";
  const userWhere = query ? buildUserSearch(query) : undefined;
  const membershipOrderWhere = buildMembershipOrderWhere({ query, orderStatus, fromDate, toDate });
  const contentOrderWhere = buildContentOrderWhere({ query, orderStatus, fromDate, toDate });

  const [
    userCount,
    activeMembershipCount,
    membershipOrderCount,
    contentOrderCount,
    users,
    filteredMembershipOrderCount,
    filteredContentOrderCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        membershipExpiresAt: {
          gt: now,
        },
      },
    }),
    prisma.membershipOrder.count(),
    prisma.contentOrder.count(),
    prisma.user.findMany({
      take: usersLimit,
      orderBy: { createdAt: "desc" },
      where: userWhere,
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        referredByAgent: {
          select: {
            displayName: true,
            inviteCode: true,
          },
        },
        membershipPlanId: true,
        membershipExpiresAt: true,
        coinAccount: {
          select: {
            balance: true,
          },
        },
        createdAt: true,
        _count: {
          select: {
            membershipOrders: true,
            contentOrders: true,
          },
        },
      },
    }),
    showMembershipOrders
      ? prisma.membershipOrder.count({
          where: membershipOrderWhere,
        })
      : Promise.resolve(0),
    showContentOrders
      ? prisma.contentOrder.count({
          where: contentOrderWhere,
        })
      : Promise.resolve(0),
  ]);

  const membershipPagination = showMembershipOrders
    ? buildOrderPagination(filteredMembershipOrderCount, membershipPage, pageSize)
    : null;
  const contentPagination = showContentOrders
    ? buildOrderPagination(filteredContentOrderCount, contentPage, pageSize)
    : null;

  const [membershipOrdersRaw, contentOrdersRaw] = await Promise.all([
    showMembershipOrders
      ? prisma.membershipOrder.findMany({
          skip: ((membershipPagination?.page ?? 1) - 1) * pageSize,
          take: pageSize,
          orderBy: { updatedAt: "desc" },
          where: membershipOrderWhere,
          select: {
            id: true,
            planId: true,
            amount: true,
            status: true,
            provider: true,
            providerOrderId: true,
            expiresAt: true,
            createdAt: true,
            updatedAt: true,
            paidAt: true,
            failedAt: true,
            failureReason: true,
            closedAt: true,
            refundedAt: true,
            refundReason: true,
            paymentReference: true,
            user: {
              select: {
                displayName: true,
                email: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    showContentOrders
      ? prisma.contentOrder.findMany({
          skip: ((contentPagination?.page ?? 1) - 1) * pageSize,
          take: pageSize,
          orderBy: { updatedAt: "desc" },
          where: contentOrderWhere,
          select: {
            id: true,
            contentId: true,
            amount: true,
            status: true,
            provider: true,
            providerOrderId: true,
            expiresAt: true,
            createdAt: true,
            updatedAt: true,
            paidAt: true,
            failedAt: true,
            failureReason: true,
            closedAt: true,
            refundedAt: true,
            refundReason: true,
            paymentReference: true,
            user: {
              select: {
                displayName: true,
                email: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const contentTitles = await getContentTitles(contentOrdersRaw.map((order) => order.contentId));

  return {
    metrics: {
      userCount,
      activeMembershipCount,
      membershipOrderCount,
      contentOrderCount,
    },
    appliedFilters: {
      query,
      orderStatus,
      orderType,
      from,
      to,
      membershipPage: membershipPagination?.page ?? membershipPage,
      contentPage: contentPagination?.page ?? contentPage,
      pageSize,
    },
    users: users.map((user) => ({
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role as UserRole,
      referredByAgentName: user.referredByAgent?.displayName ?? undefined,
      referredByAgentCode: user.referredByAgent?.inviteCode ?? undefined,
      membershipPlanId: user.membershipPlanId ?? undefined,
      membershipExpiresAt: user.membershipExpiresAt?.toISOString(),
      coinBalance: user.coinAccount?.balance ?? 0,
      membershipStatus: user.membershipExpiresAt && user.membershipExpiresAt > now ? "active" : "inactive",
      membershipOrderCount: user._count.membershipOrders,
      contentOrderCount: user._count.contentOrders,
      createdAt: user.createdAt.toISOString(),
    })),
    membershipOrders: membershipOrdersRaw.map((order) => toMembershipOrderRecord(order)),
    contentOrders: contentOrdersRaw.map((order) => toContentOrderRecord(order, contentTitles)),
    membershipPagination,
    contentPagination,
  };
}

export async function getAdminPaymentCallbackActivity(limit = 6): Promise<AdminPaymentCallbackActivity> {
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 12));

  const [recentRaw, totalEvents, duplicateAggregate, conflictCount, failedCount] = await Promise.all([
    prisma.paymentCallbackEvent.findMany({
      orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
      take: safeLimit,
      select: {
        id: true,
        provider: true,
        providerEventId: true,
        eventKey: true,
        orderType: true,
        orderId: true,
        providerOrderId: true,
        paymentReference: true,
        state: true,
        processingStatus: true,
        processingMessage: true,
        duplicateCount: true,
        createdAt: true,
        lastSeenAt: true,
      },
    }),
    prisma.paymentCallbackEvent.count(),
    prisma.paymentCallbackEvent.aggregate({
      _sum: {
        duplicateCount: true,
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
  ]);

  return {
    metrics: {
      eventCount: totalEvents,
      duplicateCount: duplicateAggregate._sum.duplicateCount ?? 0,
      conflictCount,
      failedCount,
    },
    recent: recentRaw.map((event) => toPaymentCallbackRecord(event)),
  };
}

export async function getAdminOrdersExportRows(input: AdminUsersDashboardFilters = {}): Promise<AdminOrderExportRow[]> {
  const query = normalizeQuery(input.query);
  const orderStatus = normalizeAdminOrderFilterStatus(input.orderStatus);
  const orderType = normalizeAdminOrderFilterType(input.orderType);
  const { fromDate, toDate } = resolveAdminOrderDateRange(input.from, input.to);
  const showMembershipOrders = orderType !== "content";
  const showContentOrders = orderType !== "membership";
  const membershipOrderWhere = buildMembershipOrderWhere({ query, orderStatus, fromDate, toDate });
  const contentOrderWhere = buildContentOrderWhere({ query, orderStatus, fromDate, toDate });

  const [membershipOrdersRaw, contentOrdersRaw] = await Promise.all([
    showMembershipOrders
      ? prisma.membershipOrder.findMany({
          orderBy: { updatedAt: "desc" },
          where: membershipOrderWhere,
          select: {
            id: true,
            planId: true,
            amount: true,
            status: true,
            provider: true,
            providerOrderId: true,
            expiresAt: true,
            createdAt: true,
            updatedAt: true,
            paidAt: true,
            failedAt: true,
            failureReason: true,
            closedAt: true,
            refundedAt: true,
            refundReason: true,
            paymentReference: true,
            user: {
              select: {
                displayName: true,
                email: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    showContentOrders
      ? prisma.contentOrder.findMany({
          orderBy: { updatedAt: "desc" },
          where: contentOrderWhere,
          select: {
            id: true,
            contentId: true,
            amount: true,
            status: true,
            provider: true,
            providerOrderId: true,
            expiresAt: true,
            createdAt: true,
            updatedAt: true,
            paidAt: true,
            failedAt: true,
            failureReason: true,
            closedAt: true,
            refundedAt: true,
            refundReason: true,
            paymentReference: true,
            user: {
              select: {
                displayName: true,
                email: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const contentTitles = await getContentTitles(contentOrdersRaw.map((order) => order.contentId));
  const membershipRows: AdminOrderExportRow[] = membershipOrdersRaw.map((order) => ({
    orderType: "membership",
    orderId: order.id,
    status: order.status as OrderStatus,
    provider: order.provider === "manual" ? "manual" : order.provider === "hosted" ? "hosted" : "mock",
    providerOrderId: order.providerOrderId ?? undefined,
    expiresAt: order.expiresAt?.toISOString(),
    userDisplayName: order.user.displayName,
    userEmail: order.user.email,
    subjectId: order.planId,
    subjectTitle: resolvePlanName(order.planId),
    amount: order.amount,
    paymentReference: order.paymentReference ?? undefined,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    paidAt: order.paidAt?.toISOString(),
    failedAt: order.failedAt?.toISOString(),
    failureReason: order.failureReason ?? undefined,
    closedAt: order.closedAt?.toISOString(),
    refundedAt: order.refundedAt?.toISOString(),
    refundReason: order.refundReason ?? undefined,
  }));
  const contentRows: AdminOrderExportRow[] = contentOrdersRaw.map((order) => ({
    orderType: "content",
    orderId: order.id,
    status: order.status as OrderStatus,
    provider: order.provider === "manual" ? "manual" : order.provider === "hosted" ? "hosted" : "mock",
    providerOrderId: order.providerOrderId ?? undefined,
    expiresAt: order.expiresAt?.toISOString(),
    userDisplayName: order.user.displayName,
    userEmail: order.user.email,
    subjectId: order.contentId,
    subjectTitle: contentTitles.get(order.contentId) ?? order.contentId,
    amount: order.amount,
    paymentReference: order.paymentReference ?? undefined,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    paidAt: order.paidAt?.toISOString(),
    failedAt: order.failedAt?.toISOString(),
    failureReason: order.failureReason ?? undefined,
    closedAt: order.closedAt?.toISOString(),
    refundedAt: order.refundedAt?.toISOString(),
    refundReason: order.refundReason ?? undefined,
  }));

  return [...membershipRows, ...contentRows].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getAdminUserWorkspace(userId: string): Promise<AdminUserWorkspace | null> {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      email: true,
      role: true,
      referredAt: true,
      membershipPlanId: true,
      membershipExpiresAt: true,
      createdAt: true,
      updatedAt: true,
      referredByAgent: {
        select: {
          displayName: true,
          inviteCode: true,
        },
      },
      agentProfile: {
        select: {
          id: true,
          displayName: true,
          status: true,
          inviteCode: true,
          totalCommission: true,
          unsettledCommission: true,
          _count: {
            select: {
              referredUsers: true,
              childAgents: true,
            },
          },
        },
      },
      coinAccount: {
        select: {
          balance: true,
          lifetimeCredited: true,
          lifetimeDebited: true,
          lastActivityAt: true,
          ledgers: {
            orderBy: { createdAt: "desc" },
            take: 18,
            select: {
              id: true,
              direction: true,
              reason: true,
              amount: true,
              balanceBefore: true,
              balanceAfter: true,
              note: true,
              referenceType: true,
              referenceId: true,
              createdAt: true,
            },
          },
        },
      },
      coinRechargeOrders: {
        orderBy: { updatedAt: "desc" },
        take: 12,
        include: {
          package: {
            select: {
              titleZhCn: true,
              titleEn: true,
            },
          },
        },
      },
      membershipOrders: {
        orderBy: { updatedAt: "desc" },
        take: 12,
        select: {
          id: true,
          planId: true,
          amount: true,
          status: true,
          provider: true,
          providerOrderId: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          paidAt: true,
          failedAt: true,
          failureReason: true,
          closedAt: true,
          refundedAt: true,
          refundReason: true,
          paymentReference: true,
          user: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      },
      contentOrders: {
        orderBy: { updatedAt: "desc" },
        take: 12,
        select: {
          id: true,
          contentId: true,
          amount: true,
          status: true,
          provider: true,
          providerOrderId: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          paidAt: true,
          failedAt: true,
          failureReason: true,
          closedAt: true,
          refundedAt: true,
          refundReason: true,
          paymentReference: true,
          user: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      },
      sessions: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const recent30dThreshold = new Date(now);
  recent30dThreshold.setDate(recent30dThreshold.getDate() - 30);

  const paymentCallbackOrderIds = [...user.membershipOrders.map((item) => item.id), ...user.contentOrders.map((item) => item.id)];
  const paymentCallbackReferences = [
    ...user.membershipOrders.map((item) => item.paymentReference).filter((item): item is string => Boolean(item)),
    ...user.contentOrders.map((item) => item.paymentReference).filter((item): item is string => Boolean(item)),
  ];
  const paymentCallbackProviderOrderIds = [
    ...user.membershipOrders.map((item) => item.providerOrderId).filter((item): item is string => Boolean(item)),
    ...user.contentOrders.map((item) => item.providerOrderId).filter((item): item is string => Boolean(item)),
  ];

  const paymentCallbacksPromise =
    paymentCallbackOrderIds.length > 0 || paymentCallbackReferences.length > 0 || paymentCallbackProviderOrderIds.length > 0
      ? prisma.paymentCallbackEvent.findMany({
          where: {
            OR: [
              ...(paymentCallbackOrderIds.length > 0 ? [{ orderId: { in: paymentCallbackOrderIds } }] : []),
              ...(paymentCallbackReferences.length > 0 ? [{ paymentReference: { in: paymentCallbackReferences } }] : []),
              ...(paymentCallbackProviderOrderIds.length > 0 ? [{ providerOrderId: { in: paymentCallbackProviderOrderIds } }] : []),
            ],
          },
          orderBy: { lastSeenAt: "desc" },
          take: 16,
        })
      : Promise.resolve([]);
  const recentAgentCommissionLedgersPromise = prisma.agentCommissionLedger.findMany({
    where: {
      userId: user.id,
    },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      kind: true,
      rechargeAmount: true,
      commissionRate: true,
      commissionAmount: true,
      settledAmount: true,
      reversedAmount: true,
      status: true,
      createdAt: true,
      settledAt: true,
      reversedAt: true,
      agent: {
        select: {
          id: true,
          displayName: true,
        },
      },
      rechargeOrder: {
        select: {
          orderNo: true,
        },
      },
    },
  });

  const attributedCommissionSummaryPromise = prisma.agentCommissionLedger.groupBy({
    by: ["kind"],
    where: {
      userId: user.id,
    },
    _count: {
      _all: true,
    },
    _sum: {
      rechargeAmount: true,
      commissionAmount: true,
      reversedAmount: true,
    },
    _max: {
      createdAt: true,
    },
  });

  const ownAgentWithdrawalSummaryPromise = user.agentProfile?.id
    ? prisma.agentWithdrawal.groupBy({
        by: ["status"],
        where: {
          agentId: user.agentProfile.id,
        },
        _sum: {
          amount: true,
        },
      })
    : Promise.resolve([]);
  const recent30dMembershipTrendOrdersPromise = prisma.membershipOrder.findMany({
    where: {
      userId: user.id,
      OR: [{ createdAt: { gte: recent30dThreshold } }, { updatedAt: { gte: recent30dThreshold } }],
    },
    select: {
      status: true,
      amount: true,
      createdAt: true,
      updatedAt: true,
      paidAt: true,
      refundedAt: true,
    },
  });
  const recent30dContentTrendOrdersPromise = prisma.contentOrder.findMany({
    where: {
      userId: user.id,
      OR: [{ createdAt: { gte: recent30dThreshold } }, { updatedAt: { gte: recent30dThreshold } }],
    },
    select: {
      status: true,
      amount: true,
      createdAt: true,
      updatedAt: true,
      paidAt: true,
      refundedAt: true,
    },
  });
  const recent30dRechargeTrendOrdersPromise = prisma.coinRechargeOrder.findMany({
    where: {
      userId: user.id,
      OR: [{ createdAt: { gte: recent30dThreshold } }, { updatedAt: { gte: recent30dThreshold } }],
    },
    select: {
      status: true,
      amount: true,
      createdAt: true,
      updatedAt: true,
      paidAt: true,
      refundedAt: true,
    },
  });

  const [
    loginActivities,
    membershipEvents,
    auditLogsRaw,
    paymentCallbacksRaw,
    recentAgentCommissionLedgersRaw,
    attributedCommissionSummaryRaw,
    ownAgentWithdrawalSummaryRaw,
    recent30dMembershipTrendOrders,
    recent30dContentTrendOrders,
    recent30dRechargeTrendOrders,
  ] = await Promise.all([
    prisma.$queryRaw<Array<{
      id: string;
      source: string;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: string;
    }>>`SELECT "id", "source", "ipAddress", "userAgent", "createdAt" FROM "UserLoginActivity" WHERE "userId" = ${user.id} ORDER BY "createdAt" DESC LIMIT 16`,
    prisma.$queryRaw<Array<{
      id: string;
      action: string;
      planId: string | null;
      previousPlanId: string | null;
      previousExpiresAt: string | null;
      nextExpiresAt: string | null;
      note: string | null;
      createdByDisplayName: string | null;
      createdAt: string;
    }>>`SELECT "id", "action", "planId", "previousPlanId", "previousExpiresAt", "nextExpiresAt", "note", "createdByDisplayName", "createdAt" FROM "UserMembershipEvent" WHERE "userId" = ${user.id} ORDER BY "createdAt" DESC LIMIT 16`,
    prisma.adminAuditLog.findMany({
      where: {
        OR: [
          {
            targetId: user.id,
          },
          {
            targetId: {
              in: [
                ...user.coinRechargeOrders.map((item) => item.id),
                ...user.membershipOrders.map((item) => item.id),
                ...user.contentOrders.map((item) => item.id),
              ],
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    paymentCallbacksPromise,
    recentAgentCommissionLedgersPromise,
    attributedCommissionSummaryPromise,
    ownAgentWithdrawalSummaryPromise,
    recent30dMembershipTrendOrdersPromise,
    recent30dContentTrendOrdersPromise,
    recent30dRechargeTrendOrdersPromise,
  ]);

  const contentTitles = await getContentTitles(user.contentOrders.map((order) => order.contentId));
  const targetLabelEntries: Array<[string, string]> = [
    ...user.coinRechargeOrders.map((item) => [item.id, item.orderNo] as [string, string]),
    ...user.membershipOrders.map((item) => [item.id, resolvePlanName(item.planId)] as [string, string]),
    ...user.contentOrders.map((item) => [item.id, contentTitles.get(item.contentId) ?? item.contentId] as [string, string]),
    [user.id, user.displayName],
  ];
  const targetLabelById = new Map<string, string>(targetLabelEntries);
  const permissions = [
    user.membershipExpiresAt && user.membershipExpiresAt > now ? "membership-active" : "membership-inactive",
    user.role === "admin" ? "admin-console" : "member-surface",
    user.contentOrders.some((order) => order.status === "paid") ? "paid-content-access" : "no-paid-content",
    (user.coinAccount?.balance ?? 0) > 0 ? "coin-wallet-funded" : "coin-wallet-empty",
  ];
  const paidMembershipOrders = user.membershipOrders.filter((item) => item.status === "paid");
  const paidContentOrders = user.contentOrders.filter((item) => item.status === "paid");
  const paidRechargeOrders = user.coinRechargeOrders.filter((item) => item.status === "paid");
  const refundedMembershipOrders = user.membershipOrders.filter((item) => item.status === "refunded");
  const refundedContentOrders = user.contentOrders.filter((item) => item.status === "refunded");
  const refundedRechargeOrders = user.coinRechargeOrders.filter((item) => item.status === "refunded");
  const paidMoments = [
    ...paidMembershipOrders.map((item) => item.paidAt ?? item.createdAt),
    ...paidContentOrders.map((item) => item.paidAt ?? item.createdAt),
    ...paidRechargeOrders.map((item) => item.paidAt ?? item.createdAt),
  ].filter((item): item is Date => Boolean(item));
  const lastPaidAt =
    paidMoments.length > 0
      ? paidMoments.reduce((latest, current) => (current.getTime() > latest.getTime() ? current : latest)).toISOString()
      : undefined;
  const recent30dPaidMembershipOrders = paidMembershipOrders.filter((item) => (item.paidAt ?? item.createdAt) >= recent30dThreshold);
  const recent30dPaidContentOrders = paidContentOrders.filter((item) => (item.paidAt ?? item.createdAt) >= recent30dThreshold);
  const recent30dPaidRechargeOrders = paidRechargeOrders.filter((item) => (item.paidAt ?? item.createdAt) >= recent30dThreshold);
  const recent30dRefundedMembershipOrders = refundedMembershipOrders.filter((item) => (item.refundedAt ?? item.updatedAt) >= recent30dThreshold);
  const recent30dRefundedContentOrders = refundedContentOrders.filter((item) => (item.refundedAt ?? item.updatedAt) >= recent30dThreshold);
  const recent30dRefundedRechargeOrders = refundedRechargeOrders.filter((item) => (item.refundedAt ?? item.updatedAt) >= recent30dThreshold);
  const attributedCommissionSummary = attributedCommissionSummaryRaw.reduce(
    (acc, item) => {
      const netCommission = Math.max(0, (item._sum.commissionAmount ?? 0) - (item._sum.reversedAmount ?? 0));

      if (item.kind === "downstream") {
        acc.attributedDownstreamCommissionNet += netCommission;
      } else {
        acc.attributedDirectCommissionNet += netCommission;
      }

      acc.attributedRechargeAmount += item._sum.rechargeAmount ?? 0;
      acc.attributedLedgerCount += item._count._all;
      const maxCreatedAt = item._max.createdAt;
      if (maxCreatedAt && (!acc.lastAttributedAt || maxCreatedAt.getTime() > new Date(acc.lastAttributedAt).getTime())) {
        acc.lastAttributedAt = maxCreatedAt.toISOString();
      }

      return acc;
    },
    {
      attributedDirectCommissionNet: 0,
      attributedDownstreamCommissionNet: 0,
      attributedRechargeAmount: 0,
      attributedLedgerCount: 0,
      lastAttributedAt: undefined as string | undefined,
    },
  );
  const ownAgentWithdrawalSummary = ownAgentWithdrawalSummaryRaw.reduce(
    (acc, item) => {
      const amount = item._sum.amount ?? 0;
      if (item.status === "settled") {
        acc.ownSettledWithdrawalAmount += amount;
      } else if (item.status === "rejected") {
        acc.ownRejectedWithdrawalAmount += amount;
      } else {
        acc.ownPendingWithdrawalAmount += amount;
      }

      return acc;
    },
    {
      ownSettledWithdrawalAmount: 0,
      ownPendingWithdrawalAmount: 0,
      ownRejectedWithdrawalAmount: 0,
    },
  );
  const trendDateKeys = buildRecentTrendKeys(30);
  const paidAmountByDate = new Map(trendDateKeys.map((key) => [key, 0]));
  const rechargeAmountByDate = new Map(trendDateKeys.map((key) => [key, 0]));
  const refundAmountByDate = new Map(trendDateKeys.map((key) => [key, 0]));
  const appendPaidTrendPoint = (dateValue: Date | null | undefined, amount: number, target: Map<string, number>) => {
    const date = dateValue ?? undefined;

    if (!date) {
      return;
    }

    const key = toUserTrendDateKey(date);
    if (!target.has(key)) {
      return;
    }

    target.set(key, (target.get(key) ?? 0) + amount);
  };
  const appendRefundTrendPoint = (dateValue: Date | null | undefined, amount: number) => {
    if (!dateValue) {
      return;
    }

    const key = toUserTrendDateKey(dateValue);
    if (!refundAmountByDate.has(key)) {
      return;
    }

    refundAmountByDate.set(key, (refundAmountByDate.get(key) ?? 0) + amount);
  };

  for (const item of recent30dMembershipTrendOrders) {
    if (item.status === "paid") {
      appendPaidTrendPoint(item.paidAt ?? item.createdAt, item.amount, paidAmountByDate);
    } else if (item.status === "refunded") {
      appendRefundTrendPoint(item.refundedAt ?? item.updatedAt, item.amount);
    }
  }

  for (const item of recent30dContentTrendOrders) {
    if (item.status === "paid") {
      appendPaidTrendPoint(item.paidAt ?? item.createdAt, item.amount, paidAmountByDate);
    } else if (item.status === "refunded") {
      appendRefundTrendPoint(item.refundedAt ?? item.updatedAt, item.amount);
    }
  }

  for (const item of recent30dRechargeTrendOrders) {
    if (item.status === "paid") {
      appendPaidTrendPoint(item.paidAt ?? item.createdAt, item.amount, paidAmountByDate);
      appendPaidTrendPoint(item.paidAt ?? item.createdAt, item.amount, rechargeAmountByDate);
    } else if (item.status === "refunded") {
      appendRefundTrendPoint(item.refundedAt ?? item.updatedAt, item.amount);
    }
  }

  return {
    summary: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role as UserRole,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      referredAt: user.referredAt?.toISOString(),
      coinBalance: user.coinAccount?.balance ?? 0,
      coinLifetimeCredited: user.coinAccount?.lifetimeCredited ?? 0,
      coinLifetimeDebited: user.coinAccount?.lifetimeDebited ?? 0,
      coinLastActivityAt: user.coinAccount?.lastActivityAt?.toISOString(),
      membershipPlanId: user.membershipPlanId ?? undefined,
      membershipPlanName: user.membershipPlanId ? resolvePlanName(user.membershipPlanId) : undefined,
      membershipExpiresAt: user.membershipExpiresAt?.toISOString(),
      membershipStatus: user.membershipExpiresAt && user.membershipExpiresAt > now ? "active" : "inactive",
      referredByAgentName: user.referredByAgent?.displayName ?? undefined,
      referredByAgentCode: user.referredByAgent?.inviteCode ?? undefined,
      activeSessionCount: user.sessions.filter((session) => session.expiresAt > now).length,
    },
    reportSummary: {
      paidMembershipAmount: paidMembershipOrders.reduce((total, item) => total + item.amount, 0),
      paidMembershipCount: paidMembershipOrders.length,
      paidContentAmount: paidContentOrders.reduce((total, item) => total + item.amount, 0),
      paidContentCount: paidContentOrders.length,
      paidRechargeAmount: paidRechargeOrders.reduce((total, item) => total + item.amount, 0),
      paidRechargeCount: paidRechargeOrders.length,
      refundedAmount:
        refundedMembershipOrders.reduce((total, item) => total + item.amount, 0) +
        refundedContentOrders.reduce((total, item) => total + item.amount, 0) +
        refundedRechargeOrders.reduce((total, item) => total + item.amount, 0),
      refundedCount:
        refundedMembershipOrders.length + refundedContentOrders.length + refundedRechargeOrders.length,
      lastPaidAt,
      recent30dPaidAmount:
        recent30dPaidMembershipOrders.reduce((total, item) => total + item.amount, 0) +
        recent30dPaidContentOrders.reduce((total, item) => total + item.amount, 0) +
        recent30dPaidRechargeOrders.reduce((total, item) => total + item.amount, 0),
      recent30dPaidCount:
        recent30dPaidMembershipOrders.length + recent30dPaidContentOrders.length + recent30dPaidRechargeOrders.length,
      recent30dRefundAmount:
        recent30dRefundedMembershipOrders.reduce((total, item) => total + item.amount, 0) +
        recent30dRefundedContentOrders.reduce((total, item) => total + item.amount, 0) +
        recent30dRefundedRechargeOrders.reduce((total, item) => total + item.amount, 0),
      recent30dRechargeAmount: recent30dPaidRechargeOrders.reduce((total, item) => total + item.amount, 0),
    },
    reportTrends: {
      paidAmountPoints: trendDateKeys.map((key) => ({
        label: toTrendLabel(key),
        value: paidAmountByDate.get(key) ?? 0,
      })),
      rechargeAmountPoints: trendDateKeys.map((key) => ({
        label: toTrendLabel(key),
        value: rechargeAmountByDate.get(key) ?? 0,
      })),
      refundAmountPoints: trendDateKeys.map((key) => ({
        label: toTrendLabel(key),
        value: refundAmountByDate.get(key) ?? 0,
      })),
    },
    permissions,
    sessions: user.sessions.map((item) => ({
      id: item.id,
      createdAt: item.createdAt.toISOString(),
      expiresAt: item.expiresAt.toISOString(),
    })),
    loginActivities: loginActivities.map((item) => ({
      id: item.id,
      source: item.source,
      ipAddress: item.ipAddress ?? undefined,
      userAgent: item.userAgent ?? undefined,
      createdAt: new Date(item.createdAt).toISOString(),
    })),
    membershipEvents: membershipEvents.map((item) => ({
      id: item.id,
      action: item.action,
      planId: item.planId ?? undefined,
      planName: item.planId ? resolvePlanName(item.planId) : undefined,
      previousPlanId: item.previousPlanId ?? undefined,
      previousPlanName: item.previousPlanId ? resolvePlanName(item.previousPlanId) : undefined,
      previousExpiresAt: item.previousExpiresAt ? new Date(item.previousExpiresAt).toISOString() : undefined,
      nextExpiresAt: item.nextExpiresAt ? new Date(item.nextExpiresAt).toISOString() : undefined,
      note: item.note ?? undefined,
      createdByDisplayName: item.createdByDisplayName ?? undefined,
      createdAt: new Date(item.createdAt).toISOString(),
    })),
    ledgers: (user.coinAccount?.ledgers ?? []).map((item) => ({
      id: item.id,
      direction: item.direction === "debit" ? "debit" : "credit",
      reason: item.reason,
      amount: item.amount,
      balanceBefore: item.balanceBefore,
      balanceAfter: item.balanceAfter,
      note: item.note ?? undefined,
      referenceType: item.referenceType ?? undefined,
      referenceId: item.referenceId ?? undefined,
      createdAt: item.createdAt.toISOString(),
    })),
    rechargeOrders: user.coinRechargeOrders.map((item) => ({
      id: item.id,
      orderNo: item.orderNo,
      packageTitle: item.package.titleZhCn || item.package.titleEn || item.packageId,
      amount: item.amount,
      totalCoins: item.coinAmount + item.bonusAmount,
      status:
        item.status === "paid" || item.status === "failed" || item.status === "closed" || item.status === "refunded"
          ? (item.status as OrderStatus)
          : "pending",
      provider: item.provider === "manual" ? "manual" : item.provider === "hosted" ? "hosted" : "mock",
      paymentReference: item.paymentReference ?? undefined,
      createdAt: item.createdAt.toISOString(),
      paidAt: item.paidAt?.toISOString(),
      refundedAt: item.refundedAt?.toISOString(),
      failureReason: item.failureReason ?? undefined,
      refundReason: item.refundReason ?? undefined,
    })),
    membershipOrders: user.membershipOrders.map((item) => toMembershipOrderRecord(item)),
    contentOrders: user.contentOrders.map((item) => toContentOrderRecord(item, contentTitles)),
    paymentCallbacks: paymentCallbacksRaw.map((item) => toPaymentCallbackRecord(item)),
    auditLogs: auditLogsRaw.map((item) => ({
      id: item.id,
      actorDisplayName: item.actorDisplayName,
      actorRole: item.actorRole,
      action: item.action,
      scope: item.scope,
      targetType: item.targetType ?? undefined,
      targetId: item.targetId ?? undefined,
      targetLabel: item.targetId ? targetLabelById.get(item.targetId) : undefined,
      status: item.status,
      detail: item.detail ?? undefined,
      createdAt: item.createdAt.toISOString(),
    })),
    agentSummary: {
      referredByAgentName: user.referredByAgent?.displayName ?? undefined,
      referredByAgentCode: user.referredByAgent?.inviteCode ?? undefined,
      ownAgentName: user.agentProfile?.displayName ?? undefined,
      ownAgentCode: user.agentProfile?.inviteCode ?? undefined,
      referredUsersCount: user.agentProfile?._count.referredUsers ?? 0,
      childAgentsCount: user.agentProfile?._count.childAgents ?? 0,
    },
    agentFinance: {
      attributedDirectCommissionNet: attributedCommissionSummary.attributedDirectCommissionNet,
      attributedDownstreamCommissionNet: attributedCommissionSummary.attributedDownstreamCommissionNet,
      attributedRechargeAmount: attributedCommissionSummary.attributedRechargeAmount,
      attributedLedgerCount: attributedCommissionSummary.attributedLedgerCount,
      lastAttributedAt: attributedCommissionSummary.lastAttributedAt,
      ownAgentStatus: user.agentProfile?.status ?? undefined,
      ownTotalCommission: user.agentProfile?.totalCommission ?? undefined,
      ownUnsettledCommission: user.agentProfile?.unsettledCommission ?? undefined,
      ownSettledWithdrawalAmount: ownAgentWithdrawalSummary.ownSettledWithdrawalAmount,
      ownPendingWithdrawalAmount: ownAgentWithdrawalSummary.ownPendingWithdrawalAmount,
      ownRejectedWithdrawalAmount: ownAgentWithdrawalSummary.ownRejectedWithdrawalAmount,
    },
    agentCommissionLedgers: recentAgentCommissionLedgersRaw.map((item) => ({
      id: item.id,
      agentId: item.agent.id,
      agentName: item.agent.displayName,
      kind: item.kind === "downstream" ? "downstream" : "direct",
      rechargeOrderNo: item.rechargeOrder.orderNo,
      rechargeAmount: item.rechargeAmount,
      commissionRate: item.commissionRate,
      commissionAmount: item.commissionAmount,
      settledAmount: item.settledAmount,
      reversedAmount: item.reversedAmount,
      availableAmount: Math.max(0, item.commissionAmount - item.settledAmount - item.reversedAmount),
      status:
        item.status === "settled" || item.status === "reversed" || item.status === "partial"
          ? item.status
          : "pending",
      createdAt: item.createdAt.toISOString(),
      settledAt: item.settledAt?.toISOString(),
      reversedAt: item.reversedAt?.toISOString(),
    })),
  };
}

export async function adminExtendUserMembership(input: {
  userId: string;
  planId: string;
  durationDays: number;
  note?: string;
  createdByDisplayName?: string;
}) {
  const durationDays = Math.max(1, Math.trunc(input.durationDays || 0));
  const planId = input.planId.trim();
  const plan = membershipPlans.find((item) => item.id === planId);

  if (!plan) {
    throw new Error("ADMIN_USER_MEMBERSHIP_PLAN_NOT_FOUND");
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        membershipPlanId: true,
        membershipExpiresAt: true,
      },
    });

    if (!user) {
      throw new Error("ADMIN_USER_NOT_FOUND");
    }

    const nextExpiresAt = nextMembershipExpiry(user.membershipExpiresAt, durationDays);

    await tx.user.update({
      where: { id: user.id },
      data: {
        membershipPlanId: plan.id,
        membershipExpiresAt: nextExpiresAt,
      },
    });

    await recordUserMembershipEvent(tx, {
      userId: user.id,
      action: user.membershipExpiresAt ? "manual-extended" : "manual-activated",
      planId: plan.id,
      previousPlanId: user.membershipPlanId,
      previousExpiresAt: user.membershipExpiresAt,
      nextExpiresAt,
      note: input.note ?? null,
      createdByDisplayName: input.createdByDisplayName ?? "Admin",
    });

    return {
      planId: plan.id,
      expiresAt: nextExpiresAt.toISOString(),
    };
  });
}

export async function adminDisableUserMembership(input: {
  userId: string;
  note?: string;
  createdByDisplayName?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        membershipPlanId: true,
        membershipExpiresAt: true,
      },
    });

    if (!user) {
      throw new Error("ADMIN_USER_NOT_FOUND");
    }

    await tx.user.update({
      where: { id: user.id },
      data: {
        membershipPlanId: null,
        membershipExpiresAt: null,
      },
    });

    await recordUserMembershipEvent(tx, {
      userId: user.id,
      action: "manual-disabled",
      planId: user.membershipPlanId,
      previousPlanId: user.membershipPlanId,
      previousExpiresAt: user.membershipExpiresAt,
      nextExpiresAt: null,
      note: input.note ?? null,
      createdByDisplayName: input.createdByDisplayName ?? "Admin",
    });
  });
}

function escapeCsvValue(value: string | number | undefined) {
  if (value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (stringValue.includes(",") || stringValue.includes("\"") || stringValue.includes("\n")) {
    return `"${stringValue.replaceAll("\"", "\"\"")}"`;
  }

  return stringValue;
}

export function buildAdminOrdersCsv(rows: AdminOrderExportRow[]) {
  const header = [
    "order_type",
    "order_id",
    "status",
    "provider",
    "provider_order_id",
    "expires_at",
    "user_display_name",
    "user_email",
    "subject_id",
    "subject_title",
    "amount_cny",
    "payment_reference",
    "created_at",
    "updated_at",
    "paid_at",
    "failed_at",
    "failure_reason",
    "closed_at",
    "refunded_at",
    "refund_reason",
  ];

  const lines = rows.map((row) =>
    [
      row.orderType,
      row.orderId,
      row.status,
      row.provider,
      row.providerOrderId,
      row.expiresAt,
      row.userDisplayName,
      row.userEmail,
      row.subjectId,
      row.subjectTitle,
      row.amount,
      row.paymentReference,
      row.createdAt,
      row.updatedAt,
      row.paidAt,
      row.failedAt,
      row.failureReason,
      row.closedAt,
      row.refundedAt,
      row.refundReason,
    ]
      .map((value) => escapeCsvValue(value))
      .join(","),
  );

  return `\uFEFF${[header.join(","), ...lines].join("\n")}`;
}
