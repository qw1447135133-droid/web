import { membershipPlans } from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";
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
  membershipPlanId?: string;
  membershipExpiresAt?: string;
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

function resolvePlanName(planId: string) {
  return membershipPlans.find((plan) => plan.id === planId)?.name ?? planId;
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
        membershipPlanId: true,
        membershipExpiresAt: true,
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
      membershipPlanId: user.membershipPlanId ?? undefined,
      membershipExpiresAt: user.membershipExpiresAt?.toISOString(),
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
