import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n-config";

type FinanceClient = Prisma.TransactionClient | typeof prisma;
type CoinOrderStatus = "pending" | "paid" | "failed" | "closed" | "refunded";
type CoinOrderProvider = "mock" | "manual" | "hosted";
type CoinPackageStatus = "active" | "inactive";
type CoinLedgerDirection = "credit" | "debit";
type FinanceTone = "good" | "warn" | "neutral";

export type AdminFinanceMetric = {
  label: string;
  value: string;
  description: string;
};

export type AdminCoinPackageRecord = {
  id: string;
  key: string;
  title: string;
  description?: string;
  coinAmount: number;
  bonusAmount: number;
  totalCoins: number;
  price: number;
  validityDays?: number;
  badge?: string;
  status: CoinPackageStatus;
  sortOrder: number;
};

export type AdminCoinRechargeOrderRecord = {
  id: string;
  orderNo: string;
  userDisplayName: string;
  userEmail: string;
  packageTitle: string;
  coinAmount: number;
  bonusAmount: number;
  totalCoins: number;
  amount: number;
  status: CoinOrderStatus;
  provider: CoinOrderProvider;
  providerOrderId?: string;
  paymentReference?: string;
  failureReason?: string;
  refundReason?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  failedAt?: string;
  closedAt?: string;
  refundedAt?: string;
  creditedAt?: string;
};

export type AdminFinanceRowCard = {
  title: string;
  subtitle?: string;
  status?: string;
  tone?: FinanceTone;
  meta?: string[];
};

export type AdminFinanceUserOption = {
  id: string;
  label: string;
};

export type AdminFinancePackageOption = {
  id: string;
  label: string;
  status: CoinPackageStatus;
};

export type AdminFinanceDashboard = {
  metrics: AdminFinanceMetric[];
  coinPackages: AdminCoinPackageRecord[];
  rechargeOrders: AdminCoinRechargeOrderRecord[];
  settlementRows: AdminFinanceRowCard[];
  userOptions: AdminFinanceUserOption[];
  packageOptions: AdminFinancePackageOption[];
};

type CoinPackageSeed = {
  key: string;
  titleZhCn: string;
  titleZhTw: string;
  titleEn: string;
  descriptionZhCn: string;
  descriptionZhTw: string;
  descriptionEn: string;
  coinAmount: number;
  bonusAmount: number;
  price: number;
  validityDays?: number;
  badge?: string;
  sortOrder: number;
};

const siteSurfacePaths = ["/", "/member", "/plans", "/admin"];

const defaultCoinPackages: CoinPackageSeed[] = [
  {
    key: "starter-100",
    titleZhCn: "新手包 100 球币",
    titleZhTw: "新手包 100 球幣",
    titleEn: "Starter 100 Coins",
    descriptionZhCn: "适合首次解锁单条计划单和体验会员内容。",
    descriptionZhTw: "適合首次解鎖單條計劃單和體驗會員內容。",
    descriptionEn: "Best for first-time unlocks and trial premium content.",
    coinAmount: 100,
    bonusAmount: 10,
    price: 19,
    validityDays: 30,
    badge: "starter",
    sortOrder: 10,
  },
  {
    key: "growth-500",
    titleZhCn: "进阶包 500 球币",
    titleZhTw: "進階包 500 球幣",
    titleEn: "Growth 500 Coins",
    descriptionZhCn: "适合高频查看专家计划单与组合解锁。",
    descriptionZhTw: "適合高頻查看專家計劃單與組合解鎖。",
    descriptionEn: "For frequent expert picks and bundle unlocks.",
    coinAmount: 500,
    bonusAmount: 80,
    price: 89,
    validityDays: 90,
    badge: "popular",
    sortOrder: 20,
  },
  {
    key: "campaign-1000",
    titleZhCn: "活动包 1000 球币",
    titleZhTw: "活動包 1000 球幣",
    titleEn: "Campaign 1000 Coins",
    descriptionZhCn: "用于重点赛事周和高频推荐解锁。",
    descriptionZhTw: "用於重點賽事週和高頻推薦解鎖。",
    descriptionEn: "Built for high-volume unlock periods and major events.",
    coinAmount: 1000,
    bonusAmount: 220,
    price: 168,
    validityDays: 120,
    badge: "campaign",
    sortOrder: 30,
  },
];

function safeRevalidate(paths: string[]) {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("static generation store missing")) {
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

function localizeCoinPackageTitle(
  pkg: {
    titleZhCn: string;
    titleZhTw: string;
    titleEn: string;
  },
  locale: Locale,
) {
  return localizeText(
    {
      zhCn: pkg.titleZhCn,
      zhTw: pkg.titleZhTw,
      en: pkg.titleEn,
    },
    locale,
  );
}

function localizeCoinPackageDescription(
  pkg: {
    descriptionZhCn: string | null;
    descriptionZhTw: string | null;
    descriptionEn: string | null;
  },
  locale: Locale,
) {
  return localizeText(
    {
      zhCn: pkg.descriptionZhCn ?? "",
      zhTw: pkg.descriptionZhTw ?? pkg.descriptionZhCn ?? "",
      en: pkg.descriptionEn ?? pkg.descriptionZhCn ?? "",
    },
    locale,
  ).trim();
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function getSettlementStatusLabel(locale: Locale, hasRecentOrders: boolean) {
  if (hasRecentOrders) {
    return localizeText(
      {
        zhCn: "待结算",
        zhTw: "待結算",
        en: "Pending",
      },
      locale,
    );
  }

  return localizeText(
    {
      zhCn: "观察中",
      zhTw: "觀察中",
      en: "Watching",
    },
    locale,
  );
}

function getPackageStatusLabel(locale: Locale, status: CoinPackageStatus) {
  if (status === "inactive") {
    return localizeText(
      {
        zhCn: "已停用",
        zhTw: "已停用",
        en: "Inactive",
      },
      locale,
    );
  }

  return localizeText(
    {
      zhCn: "启用中",
      zhTw: "啟用中",
      en: "Active",
    },
    locale,
  );
}

export function getCoinRechargeOrderStatusMeta(
  status: CoinOrderStatus,
  locale: Locale,
) {
  if (status === "paid") {
    return {
      label: localizeText(
        {
          zhCn: "已支付",
          zhTw: "已支付",
          en: "Paid",
        },
        locale,
      ),
      tone: "good" as const,
    };
  }

  if (status === "failed") {
    return {
      label: localizeText(
        {
          zhCn: "失败",
          zhTw: "失敗",
          en: "Failed",
        },
        locale,
      ),
      tone: "warn" as const,
    };
  }

  if (status === "refunded") {
    return {
      label: localizeText(
        {
          zhCn: "已退款",
          zhTw: "已退款",
          en: "Refunded",
        },
        locale,
      ),
      tone: "neutral" as const,
    };
  }

  if (status === "closed") {
    return {
      label: localizeText(
        {
          zhCn: "已关闭",
          zhTw: "已關閉",
          en: "Closed",
        },
        locale,
      ),
      tone: "neutral" as const,
    };
  }

  return {
    label: localizeText(
      {
        zhCn: "待支付",
        zhTw: "待支付",
        en: "Pending",
      },
      locale,
    ),
    tone: "warn" as const,
  };
}

function createCoinOrderNo() {
  const now = new Date();
  const dateLabel = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  return `CR${dateLabel}${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

function createCoinPaymentReference(provider: CoinOrderProvider) {
  const prefix = provider === "hosted" ? "HOSTED" : provider === "mock" ? "MOCK" : "MANUAL";
  return `${prefix}-COIN-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function createCoinProviderOrderId(provider: CoinOrderProvider) {
  const prefix = provider === "hosted" ? "HOSTED" : provider === "mock" ? "MOCK" : "MANUAL";
  return `${prefix}-COIN-ORDER-${randomUUID().slice(0, 10).toUpperCase()}`;
}

function createOrderExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}

async function ensureCoinAccount(client: FinanceClient, userId: string) {
  const existing = await client.coinAccount.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  return client.coinAccount.create({
    data: {
      userId,
    },
  });
}

async function applyCoinAccountAdjustment(
  client: FinanceClient,
  input: {
    userId: string;
    direction: CoinLedgerDirection;
    reason: string;
    amount: number;
    referenceType?: string;
    referenceId?: string;
    note?: string;
    expiresAt?: Date | null;
    allowNegative?: boolean;
  },
) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("COIN_AMOUNT_INVALID");
  }

  const account = await ensureCoinAccount(client, input.userId);
  const balanceBefore = account.balance;
  const signedAmount = input.direction === "credit" ? input.amount : -input.amount;
  const balanceAfter = balanceBefore + signedAmount;

  if (!input.allowNegative && balanceAfter < 0) {
    throw new Error("COIN_ACCOUNT_INSUFFICIENT_BALANCE");
  }

  const now = new Date();

  const updatedAccount = await client.coinAccount.update({
    where: { id: account.id },
    data: {
      balance: balanceAfter,
      lifetimeCredited:
        input.direction === "credit"
          ? { increment: input.amount }
          : undefined,
      lifetimeDebited:
        input.direction === "debit"
          ? { increment: input.amount }
          : undefined,
      lastActivityAt: now,
    },
  });

  await client.coinLedger.create({
    data: {
      accountId: account.id,
      direction: input.direction,
      reason: input.reason,
      amount: input.amount,
      balanceBefore,
      balanceAfter,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      note: input.note ?? null,
      expiresAt: input.expiresAt ?? null,
      createdAt: now,
    },
  });

  return updatedAccount;
}

export async function ensureDefaultCoinPackages() {
  for (const seed of defaultCoinPackages) {
    await prisma.coinPackage.upsert({
      where: { key: seed.key },
      update: {
        titleZhCn: seed.titleZhCn,
        titleZhTw: seed.titleZhTw,
        titleEn: seed.titleEn,
        descriptionZhCn: seed.descriptionZhCn,
        descriptionZhTw: seed.descriptionZhTw,
        descriptionEn: seed.descriptionEn,
        coinAmount: seed.coinAmount,
        bonusAmount: seed.bonusAmount,
        price: seed.price,
        validityDays: seed.validityDays ?? null,
        badge: seed.badge ?? null,
        status: "active",
        sortOrder: seed.sortOrder,
      },
      create: {
        key: seed.key,
        titleZhCn: seed.titleZhCn,
        titleZhTw: seed.titleZhTw,
        titleEn: seed.titleEn,
        descriptionZhCn: seed.descriptionZhCn,
        descriptionZhTw: seed.descriptionZhTw,
        descriptionEn: seed.descriptionEn,
        coinAmount: seed.coinAmount,
        bonusAmount: seed.bonusAmount,
        price: seed.price,
        validityDays: seed.validityDays ?? null,
        badge: seed.badge ?? null,
        status: "active",
        sortOrder: seed.sortOrder,
      },
    });
  }

  safeRevalidate(siteSurfacePaths);
}

export async function createManualCoinRechargeOrder(input: {
  userId: string;
  packageId: string;
  paymentReference?: string;
}) {
  const [user, coinPackage] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    }),
    prisma.coinPackage.findUnique({
      where: { id: input.packageId },
      select: {
        id: true,
        coinAmount: true,
        bonusAmount: true,
        price: true,
      },
    }),
  ]);

  if (!user) {
    throw new Error("COIN_RECHARGE_USER_NOT_FOUND");
  }

  if (!coinPackage) {
    throw new Error("COIN_PACKAGE_NOT_FOUND");
  }

  const created = await prisma.coinRechargeOrder.create({
    data: {
      orderNo: createCoinOrderNo(),
      coinAmount: coinPackage.coinAmount,
      bonusAmount: coinPackage.bonusAmount,
      amount: coinPackage.price,
      status: "pending",
      provider: "manual",
      providerOrderId: createCoinProviderOrderId("manual"),
      expiresAt: createOrderExpiry(),
      paymentReference: input.paymentReference?.trim() || createCoinPaymentReference("manual"),
      userId: user.id,
      packageId: coinPackage.id,
    },
  });

  safeRevalidate(siteSurfacePaths);
  return created;
}

export async function markCoinRechargeOrderPaidByAdmin(input: {
  orderId: string;
  paymentReference?: string;
  allowRecoverFromTerminal?: boolean;
}) {
  const order = await prisma.coinRechargeOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      orderNo: true,
      userId: true,
      status: true,
      coinAmount: true,
      bonusAmount: true,
      paymentReference: true,
    },
  });

  if (!order) {
    throw new Error("COIN_RECHARGE_ORDER_NOT_FOUND");
  }

  if (order.status === "paid") {
    return;
  }

  if (order.status === "refunded") {
    throw new Error("COIN_RECHARGE_ORDER_NOT_PAYABLE");
  }

  if (
    !input.allowRecoverFromTerminal &&
    order.status !== "pending"
  ) {
    throw new Error("COIN_RECHARGE_ORDER_NOT_PAYABLE");
  }

  if (
    input.allowRecoverFromTerminal &&
    order.status !== "pending" &&
    order.status !== "failed" &&
    order.status !== "closed"
  ) {
    throw new Error("COIN_RECHARGE_ORDER_NOT_PAYABLE");
  }

  const now = new Date();
  const totalCoins = order.coinAmount + order.bonusAmount;

  await prisma.$transaction(async (tx) => {
    await applyCoinAccountAdjustment(tx, {
      userId: order.userId,
      direction: "credit",
      reason: "recharge",
      amount: totalCoins,
      referenceType: "coin-recharge-order",
      referenceId: order.id,
      note: order.orderNo,
    });

    await tx.coinRechargeOrder.update({
      where: { id: order.id },
      data: {
        status: "paid",
        paidAt: now,
        creditedAt: now,
        failedAt: null,
        failureReason: null,
        closedAt: null,
        refundedAt: null,
        refundReason: null,
        paymentReference: input.paymentReference?.trim() || order.paymentReference || createCoinPaymentReference("manual"),
      },
    });
  });

  safeRevalidate(siteSurfacePaths);
}

export async function markCoinRechargeOrderFailedByAdmin(input: {
  orderId: string;
  reason?: string;
  paymentReference?: string;
}) {
  const order = await prisma.coinRechargeOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      status: true,
      paymentReference: true,
    },
  });

  if (!order) {
    throw new Error("COIN_RECHARGE_ORDER_NOT_FOUND");
  }

  if (order.status === "failed") {
    return;
  }

  if (order.status !== "pending") {
    throw new Error("COIN_RECHARGE_ORDER_NOT_FAILABLE");
  }

  await prisma.coinRechargeOrder.update({
    where: { id: order.id },
    data: {
      status: "failed",
      paidAt: null,
      creditedAt: null,
      failedAt: new Date(),
      failureReason: input.reason?.trim() || "后台记录该充值订单支付失败，请重新补单。",
      closedAt: null,
      refundedAt: null,
      refundReason: null,
      paymentReference: input.paymentReference?.trim() || order.paymentReference || createCoinPaymentReference("manual"),
    },
  });

  safeRevalidate(siteSurfacePaths);
}

export async function closePendingCoinRechargeOrder(input: {
  orderId: string;
}) {
  const order = await prisma.coinRechargeOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!order) {
    throw new Error("COIN_RECHARGE_ORDER_NOT_FOUND");
  }

  if (order.status !== "pending") {
    return;
  }

  await prisma.coinRechargeOrder.update({
    where: { id: order.id },
    data: {
      status: "closed",
      failedAt: null,
      failureReason: null,
      closedAt: new Date(),
      refundedAt: null,
      refundReason: null,
    },
  });

  safeRevalidate(siteSurfacePaths);
}

export async function refundCoinRechargeOrderByAdmin(input: {
  orderId: string;
  reason?: string;
}) {
  const order = await prisma.coinRechargeOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      orderNo: true,
      userId: true,
      status: true,
      coinAmount: true,
      bonusAmount: true,
    },
  });

  if (!order) {
    throw new Error("COIN_RECHARGE_ORDER_NOT_FOUND");
  }

  if (order.status === "refunded") {
    return;
  }

  if (order.status !== "paid") {
    throw new Error("COIN_RECHARGE_ORDER_NOT_REFUNDABLE");
  }

  const now = new Date();
  const totalCoins = order.coinAmount + order.bonusAmount;

  await prisma.$transaction(async (tx) => {
    await applyCoinAccountAdjustment(tx, {
      userId: order.userId,
      direction: "debit",
      reason: "refund",
      amount: totalCoins,
      referenceType: "coin-recharge-order",
      referenceId: order.id,
      note: input.reason?.trim() || order.orderNo,
      allowNegative: false,
    });

    await tx.coinRechargeOrder.update({
      where: { id: order.id },
      data: {
        status: "refunded",
        refundedAt: now,
        refundReason: input.reason?.trim() || "后台人工退款，金币已回退。",
      },
    });
  });

  safeRevalidate(siteSurfacePaths);
}

export async function getAdminFinanceDashboard(locale: Locale): Promise<AdminFinanceDashboard> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    packagesRaw,
    recentOrdersRaw,
    rechargeTodayCount,
    activePackageCount,
    pendingRechargeCount,
    paidRechargeAggregate,
    totalCoinBalanceAggregate,
    userOptionsRaw,
    paidContentOrders,
  ] = await Promise.all([
    prisma.coinPackage.findMany({
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.coinRechargeOrder.findMany({
      take: 8,
      orderBy: { updatedAt: "desc" },
      include: {
        user: {
          select: {
            displayName: true,
            email: true,
          },
        },
        package: true,
      },
    }),
    prisma.coinRechargeOrder.count({
      where: {
        createdAt: {
          gte: todayStart,
        },
      },
    }),
    prisma.coinPackage.count({
      where: {
        status: "active",
      },
    }),
    prisma.coinRechargeOrder.count({
      where: {
        status: "pending",
      },
    }),
    prisma.coinRechargeOrder.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: "paid",
      },
    }),
    prisma.coinAccount.aggregate({
      _sum: {
        balance: true,
      },
    }),
    prisma.user.findMany({
      take: 24,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        displayName: true,
        email: true,
      },
    }),
    prisma.contentOrder.findMany({
      where: {
        status: "paid",
      },
      select: {
        amount: true,
        contentId: true,
        paidAt: true,
      },
      orderBy: {
        paidAt: "desc",
      },
      take: 200,
    }),
  ]);

  const packages: AdminCoinPackageRecord[] = packagesRaw.map((item) => ({
    id: item.id,
    key: item.key,
    title: localizeCoinPackageTitle(item, locale),
    description: localizeCoinPackageDescription(item, locale) || undefined,
    coinAmount: item.coinAmount,
    bonusAmount: item.bonusAmount,
    totalCoins: item.coinAmount + item.bonusAmount,
    price: item.price,
    validityDays: item.validityDays ?? undefined,
    badge: item.badge ?? undefined,
    status: item.status === "inactive" ? "inactive" : "active",
    sortOrder: item.sortOrder,
  }));

  const rechargeOrders: AdminCoinRechargeOrderRecord[] = recentOrdersRaw.map((order) => ({
    id: order.id,
    orderNo: order.orderNo,
    userDisplayName: order.user.displayName,
    userEmail: order.user.email,
    packageTitle: localizeCoinPackageTitle(order.package, locale),
    coinAmount: order.coinAmount,
    bonusAmount: order.bonusAmount,
    totalCoins: order.coinAmount + order.bonusAmount,
    amount: order.amount,
    status:
      order.status === "paid" ||
      order.status === "failed" ||
      order.status === "closed" ||
      order.status === "refunded"
        ? order.status
        : "pending",
    provider:
      order.provider === "mock" || order.provider === "hosted"
        ? order.provider
        : "manual",
    providerOrderId: order.providerOrderId ?? undefined,
    paymentReference: order.paymentReference ?? undefined,
    failureReason: order.failureReason ?? undefined,
    refundReason: order.refundReason ?? undefined,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    paidAt: order.paidAt?.toISOString(),
    failedAt: order.failedAt?.toISOString(),
    closedAt: order.closedAt?.toISOString(),
    refundedAt: order.refundedAt?.toISOString(),
    creditedAt: order.creditedAt?.toISOString(),
  }));

  const metrics: AdminFinanceMetric[] = [
    {
      label: localizeText(
        {
          zhCn: "今日充值订单",
          zhTw: "今日充值訂單",
          en: "Recharge orders today",
        },
        locale,
      ),
      value: formatCompactNumber(rechargeTodayCount),
      description: localizeText(
        {
          zhCn: "含待支付、已支付与异常关闭订单。",
          zhTw: "含待支付、已支付與異常關閉訂單。",
          en: "Pending, paid, and closed abnormal orders included.",
        },
        locale,
      ),
    },
    {
      label: localizeText(
        {
          zhCn: "在售球币套餐",
          zhTw: "在售球幣套餐",
          en: "Live coin packages",
        },
        locale,
      ),
      value: formatCompactNumber(activePackageCount),
      description: localizeText(
        {
          zhCn: "后台可直接维护价格、赠送比例和有效期。",
          zhTw: "後台可直接維護價格、贈送比例和有效期。",
          en: "Pricing, bonus, and validity are all runtime-configured.",
        },
        locale,
      ),
    },
    {
      label: localizeText(
        {
          zhCn: "待处理充值单",
          zhTw: "待處理充值單",
          en: "Pending recharge orders",
        },
        locale,
      ),
      value: formatCompactNumber(pendingRechargeCount),
      description: localizeText(
        {
          zhCn: "可在后台执行补单、关闭或失败处理。",
          zhTw: "可在後台執行補單、關閉或失敗處理。",
          en: "Ready for manual repair, close, or failure handling.",
        },
        locale,
      ),
    },
    {
      label: localizeText(
        {
          zhCn: "站内球币存量",
          zhTw: "站內球幣存量",
          en: "Coin balance in system",
        },
        locale,
      ),
      value: formatCompactNumber(totalCoinBalanceAggregate._sum.balance ?? 0),
      description: localizeText(
        {
          zhCn: `累计实收 ${formatCompactNumber(paidRechargeAggregate._sum.amount ?? 0)} 元。`,
          zhTw: `累計實收 ${formatCompactNumber(paidRechargeAggregate._sum.amount ?? 0)} 元。`,
          en: `Paid recharge total CNY ${formatCompactNumber(paidRechargeAggregate._sum.amount ?? 0)}.`,
        },
        locale,
      ),
    },
  ];

  const planIds = [...new Set(paidContentOrders.map((item) => item.contentId))];
  const plans = planIds.length
    ? await prisma.articlePlan.findMany({
        where: {
          id: {
            in: planIds,
          },
        },
        select: {
          id: true,
          authorId: true,
        },
      })
    : [];
  const planAuthorMap = new Map(plans.map((plan) => [plan.id, plan.authorId]));
  const authorIds = [...new Set(plans.map((plan) => plan.authorId))];
  const authors = authorIds.length
    ? await prisma.authorTeam.findMany({
        where: {
          id: {
            in: authorIds,
          },
        },
        select: {
          id: true,
          name: true,
        },
      })
    : [];
  const authorNameMap = new Map(authors.map((author) => [author.id, author.name]));
  const settlementMap = new Map<string, { gross: number; count: number; latestPaidAt?: string }>();

  for (const order of paidContentOrders) {
    const authorId = planAuthorMap.get(order.contentId);

    if (!authorId) {
      continue;
    }

    const current = settlementMap.get(authorId) ?? { gross: 0, count: 0 };
    current.gross += order.amount;
    current.count += 1;
    if (order.paidAt) {
      current.latestPaidAt = order.paidAt.toISOString();
    }
    settlementMap.set(authorId, current);
  }

  const settlementRows: AdminFinanceRowCard[] = [...settlementMap.entries()]
    .sort((left, right) => right[1].gross - left[1].gross)
    .slice(0, 4)
    .map(([authorId, summary]) => {
      const estimatedPayout = Math.round(summary.gross * 0.85);
      return {
        title: authorNameMap.get(authorId) ?? authorId,
        subtitle: localizeText(
          {
            zhCn: `收入 ${formatCompactNumber(summary.gross)} 元 / 解锁 ${summary.count} 笔`,
            zhTw: `收入 ${formatCompactNumber(summary.gross)} 元 / 解鎖 ${summary.count} 筆`,
            en: `Revenue CNY ${formatCompactNumber(summary.gross)} / ${summary.count} unlocks`,
          },
          locale,
        ),
        status: getSettlementStatusLabel(locale, summary.count > 0),
        tone: summary.count > 0 ? "warn" : "neutral",
        meta: [
          localizeText(
            {
              zhCn: `预估结算 ${formatCompactNumber(estimatedPayout)} 元`,
              zhTw: `預估結算 ${formatCompactNumber(estimatedPayout)} 元`,
              en: `Projected payout CNY ${formatCompactNumber(estimatedPayout)}`,
            },
            locale,
          ),
          summary.latestPaidAt
            ? localizeText(
                {
                  zhCn: `最近解锁 ${summary.latestPaidAt.slice(0, 16).replace("T", " ")}`,
                  zhTw: `最近解鎖 ${summary.latestPaidAt.slice(0, 16).replace("T", " ")}`,
                  en: `Last unlock ${summary.latestPaidAt.slice(0, 16).replace("T", " ")}`,
                },
                locale,
              )
            : localizeText(
                {
                  zhCn: "暂无最近记录",
                  zhTw: "暫無最近記錄",
                  en: "No recent records",
                },
                locale,
              ),
        ],
      };
    });

  return {
    metrics,
    coinPackages: packages,
    rechargeOrders,
    settlementRows,
    userOptions: userOptionsRaw.map((user) => ({
      id: user.id,
      label: `${user.displayName} (${user.email})`,
    })),
    packageOptions: packages.map((pkg) => ({
      id: pkg.id,
      label: `${pkg.title} / ${pkg.totalCoins}`,
      status: pkg.status,
    })),
  };
}

export function buildFinancePackageCards(
  locale: Locale,
  packages: AdminCoinPackageRecord[],
): AdminFinanceRowCard[] {
  return packages.map((pkg) => ({
    title: pkg.title,
    subtitle: localizeText(
      {
        zhCn: `售价 ${pkg.price} / 本体 ${pkg.coinAmount} / 赠送 ${pkg.bonusAmount}`,
        zhTw: `售價 ${pkg.price} / 本體 ${pkg.coinAmount} / 贈送 ${pkg.bonusAmount}`,
        en: `CNY ${pkg.price} / base ${pkg.coinAmount} / bonus ${pkg.bonusAmount}`,
      },
      locale,
    ),
    status: getPackageStatusLabel(locale, pkg.status),
    tone: pkg.status === "active" ? "good" : "neutral",
    meta: [
      localizeText(
        {
          zhCn: `总球币 ${pkg.totalCoins}`,
          zhTw: `總球幣 ${pkg.totalCoins}`,
          en: `Total coins ${pkg.totalCoins}`,
        },
        locale,
      ),
      pkg.validityDays
        ? localizeText(
            {
              zhCn: `有效期 ${pkg.validityDays} 天`,
              zhTw: `有效期 ${pkg.validityDays} 天`,
              en: `Validity ${pkg.validityDays} days`,
            },
            locale,
          )
        : localizeText(
            {
              zhCn: "长期有效",
              zhTw: "長期有效",
              en: "No expiry",
            },
            locale,
          ),
    ],
  }));
}

