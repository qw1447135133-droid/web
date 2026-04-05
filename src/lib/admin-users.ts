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

export type AdminUserWorkspace = {
  summary: {
    id: string;
    displayName: string;
    email: string;
    role: UserRole;
    createdAt: string;
    updatedAt: string;
    coinBalance: number;
    membershipPlanId?: string;
    membershipPlanName?: string;
    membershipExpiresAt?: string;
    membershipStatus: "active" | "inactive";
    referredByAgentName?: string;
    referredByAgentCode?: string;
    activeSessionCount: number;
  };
  permissions: string[];
  sessions: AdminUserSessionRecord[];
  loginActivities: AdminUserLoginActivityRecord[];
  membershipEvents: AdminUserMembershipEventRecord[];
  ledgers: AdminUserDetailLedgerRecord[];
  rechargeOrders: AdminUserRechargeOrderRecord[];
  membershipOrders: AdminMembershipOrderRecord[];
  contentOrders: AdminContentOrderRecord[];
  agentSummary: {
    referredByAgentName?: string;
    referredByAgentCode?: string;
    ownAgentName?: string;
    ownAgentCode?: string;
    referredUsersCount: number;
    childAgentsCount: number;
  };
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
          displayName: true,
          inviteCode: true,
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

  const [loginActivities, membershipEvents] = await Promise.all([
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
  ]);

  const contentTitles = await getContentTitles(user.contentOrders.map((order) => order.contentId));
  const permissions = [
    user.membershipExpiresAt && user.membershipExpiresAt > now ? "membership-active" : "membership-inactive",
    user.role === "admin" ? "admin-console" : "member-surface",
    user.contentOrders.some((order) => order.status === "paid") ? "paid-content-access" : "no-paid-content",
    (user.coinAccount?.balance ?? 0) > 0 ? "coin-wallet-funded" : "coin-wallet-empty",
  ];

  return {
    summary: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role as UserRole,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      coinBalance: user.coinAccount?.balance ?? 0,
      membershipPlanId: user.membershipPlanId ?? undefined,
      membershipPlanName: user.membershipPlanId ? resolvePlanName(user.membershipPlanId) : undefined,
      membershipExpiresAt: user.membershipExpiresAt?.toISOString(),
      membershipStatus: user.membershipExpiresAt && user.membershipExpiresAt > now ? "active" : "inactive",
      referredByAgentName: user.referredByAgent?.displayName ?? undefined,
      referredByAgentCode: user.referredByAgent?.inviteCode ?? undefined,
      activeSessionCount: user.sessions.filter((session) => session.expiresAt > now).length,
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
    agentSummary: {
      referredByAgentName: user.referredByAgent?.displayName ?? undefined,
      referredByAgentCode: user.referredByAgent?.inviteCode ?? undefined,
      ownAgentName: user.agentProfile?.displayName ?? undefined,
      ownAgentCode: user.agentProfile?.inviteCode ?? undefined,
      referredUsersCount: user.agentProfile?._count.referredUsers ?? 0,
      childAgentsCount: user.agentProfile?._count.childAgents ?? 0,
    },
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
