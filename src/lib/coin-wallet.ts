import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { ensureDefaultCoinPackages } from "@/lib/admin-finance";
import type { Locale } from "@/lib/i18n-config";
import { membershipPlans } from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";
import type { MembershipPlanId } from "@/lib/types";

export type CoinUnlockResult =
  | { ok: true; state: "unlocked"; contentOrderId: string; coinPrice: number }
  | { ok: true; state: "already-unlocked"; coinPrice: number }
  | { ok: false; state: "insufficient-balance"; coinPrice: number; balance: number }
  | { ok: false; state: "not-found" }
  | { ok: false; state: "inactive-membership-content" };

export type MembershipCoinPurchaseResult =
  | { ok: true; state: "activated"; membershipOrderId: string; coinPrice: number; expiresAt: string }
  | { ok: false; state: "insufficient-balance"; coinPrice: number; balance: number }
  | { ok: false; state: "not-found" };

export type MemberCoinLedgerRecord = {
  id: string;
  direction: "credit" | "debit";
  reason: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  note?: string;
  createdAt: string;
  referenceType?: string;
  referenceId?: string;
};

export type MemberCoinRechargeRecord = {
  id: string;
  orderNo: string;
  packageTitle: string;
  amount: number;
  totalCoins: number;
  status: "pending" | "paid" | "failed" | "closed" | "refunded";
  createdAt: string;
  updatedAt: string;
  creditedAt?: string;
};

export type MemberCoinCenter = {
  balance: number;
  recentLedgers: MemberCoinLedgerRecord[];
  rechargeOrders: MemberCoinRechargeRecord[];
};

export type PublicCoinPackage = {
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
};

const ARTICLE_COIN_RATE = 6;
const ARTICLE_COIN_MINIMUM = 120;
const MEMBERSHIP_COIN_RATE = 6;
const MEMBERSHIP_COIN_MINIMUM = 300;
const memberSurfacePaths = ["/member", "/admin", "/"];

function createCoinContentReference() {
  return `COIN-CONTENT-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function createCoinContentProviderOrderId() {
  return `COIN-CNT-${randomUUID().slice(0, 10).toUpperCase()}`;
}

function createCoinMembershipReference() {
  return `COIN-MEMBER-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function createCoinMembershipProviderOrderId() {
  return `COIN-MEM-${randomUUID().slice(0, 10).toUpperCase()}`;
}

function createCoinRechargeOrderNo() {
  const now = new Date();
  const dateLabel = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  return `CR${dateLabel}${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

function createCoinRechargeReference() {
  return `MANUAL-COIN-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function createCoinRechargeProviderOrderId() {
  return `MANUAL-COIN-ORDER-${randomUUID().slice(0, 10).toUpperCase()}`;
}

function getCoinPrice(price: number, rate: number, minimum: number) {
  const estimated = Math.ceil((Math.max(price, 1) * rate) / 10) * 10;
  return Math.max(minimum, estimated);
}

export function getArticleCoinPrice(price: number) {
  return getCoinPrice(price, ARTICLE_COIN_RATE, ARTICLE_COIN_MINIMUM);
}

export function getMembershipCoinPrice(price: number) {
  return getCoinPrice(price, MEMBERSHIP_COIN_RATE, MEMBERSHIP_COIN_MINIMUM);
}

function nextMembershipExpiry(currentExpiry: Date | null, durationDays: number) {
  const now = new Date();
  const base = currentExpiry && currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
  const expiresAt = new Date(base);
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  return expiresAt;
}

function localizeCoinPackageText(
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

export async function getAvailableCoinPackages(locale: Locale): Promise<PublicCoinPackage[]> {
  await ensureDefaultCoinPackages();

  const packages = await prisma.coinPackage.findMany({
    where: {
      status: "active",
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      key: true,
      titleZhCn: true,
      titleZhTw: true,
      titleEn: true,
      descriptionZhCn: true,
      descriptionZhTw: true,
      descriptionEn: true,
      coinAmount: true,
      bonusAmount: true,
      price: true,
      validityDays: true,
      badge: true,
    },
  });

  return packages.map((item) => ({
    id: item.id,
    key: item.key,
    title: localizeCoinPackageText(
      {
        zhCn: item.titleZhCn,
        zhTw: item.titleZhTw,
        en: item.titleEn,
      },
      locale,
    ),
    description: localizeCoinPackageText(
      {
        zhCn: item.descriptionZhCn ?? "",
        zhTw: item.descriptionZhTw ?? item.descriptionZhCn ?? "",
        en: item.descriptionEn ?? item.descriptionZhCn ?? "",
      },
      locale,
    ).trim() || undefined,
    coinAmount: item.coinAmount,
    bonusAmount: item.bonusAmount,
    totalCoins: item.coinAmount + item.bonusAmount,
    price: item.price,
    validityDays: item.validityDays ?? undefined,
    badge: item.badge ?? undefined,
  }));
}

export async function createMemberCoinRechargeOrder(input: {
  userId: string;
  packageId: string;
}) {
  await ensureDefaultCoinPackages();

  const [user, coinPackage] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    }),
    prisma.coinPackage.findFirst({
      where: {
        id: input.packageId,
        status: "active",
      },
      select: {
        id: true,
        coinAmount: true,
        bonusAmount: true,
        price: true,
      },
    }),
  ]);

  if (!user || !coinPackage) {
    throw new Error("COIN_PACKAGE_NOT_FOUND");
  }

  const created = await prisma.coinRechargeOrder.create({
    data: {
      orderNo: createCoinRechargeOrderNo(),
      coinAmount: coinPackage.coinAmount,
      bonusAmount: coinPackage.bonusAmount,
      amount: coinPackage.price,
      status: "pending",
      provider: "manual",
      providerOrderId: createCoinRechargeProviderOrderId(),
      expiresAt: null,
      paymentReference: createCoinRechargeReference(),
      userId: user.id,
      packageId: coinPackage.id,
      callbackPayload: JSON.stringify({
        source: "member-center",
      }),
    },
    select: {
      id: true,
    },
  });

  safeRevalidate(memberSurfacePaths);
  return created;
}

export async function unlockArticleWithCoins(input: {
  userId: string;
  contentId: string;
}): Promise<CoinUnlockResult> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      membershipExpiresAt: true,
      contentOrders: {
        where: {
          contentId: input.contentId,
          status: "paid",
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!user) {
    return { ok: false, state: "not-found" };
  }

  const plan = await prisma.articlePlan.findUnique({
    where: { id: input.contentId },
    select: {
      id: true,
      price: true,
      status: true,
    },
  });

  if (!plan) {
    return { ok: false, state: "not-found" };
  }

  if (plan.status !== "published") {
    return { ok: false, state: "inactive-membership-content" };
  }

  const coinPrice = getArticleCoinPrice(plan.price);

  if (user.membershipExpiresAt && user.membershipExpiresAt.getTime() > Date.now()) {
    return { ok: true, state: "already-unlocked", coinPrice };
  }

  if (user.contentOrders.length > 0) {
    return { ok: true, state: "already-unlocked", coinPrice };
  }

  const account = await prisma.coinAccount.findUnique({
    where: { userId: input.userId },
    select: {
      id: true,
      balance: true,
      lifetimeCredited: true,
      lifetimeDebited: true,
    },
  });

  const balance = account?.balance ?? 0;

  if (balance < coinPrice) {
    return {
      ok: false,
      state: "insufficient-balance",
      coinPrice,
      balance,
    };
  }

  const existingOrder = await prisma.contentOrder.findFirst({
    where: {
      userId: input.userId,
      contentId: input.contentId,
      status: {
        in: ["pending", "failed", "closed"],
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
    },
  });

  const paymentReference = createCoinContentReference();
  const providerOrderId = createCoinContentProviderOrderId();
  const now = new Date();

  const contentOrderId = await prisma.$transaction(async (tx) => {
    const coinAccount = await tx.coinAccount.findUnique({
      where: { userId: input.userId },
      select: {
        id: true,
        balance: true,
        lifetimeDebited: true,
      },
    });

    if (!coinAccount || coinAccount.balance < coinPrice) {
      throw new Error("COIN_BALANCE_CHANGED");
    }

    await tx.coinAccount.update({
      where: { id: coinAccount.id },
      data: {
        balance: coinAccount.balance - coinPrice,
        lifetimeDebited: { increment: coinPrice },
        lastActivityAt: now,
      },
    });

    await tx.coinLedger.create({
      data: {
        accountId: coinAccount.id,
        direction: "debit",
        reason: "content_unlock",
        amount: coinPrice,
        balanceBefore: coinAccount.balance,
        balanceAfter: coinAccount.balance - coinPrice,
        referenceType: "content-order",
        referenceId: existingOrder?.id ?? null,
        note: input.contentId,
        createdAt: now,
      },
    });

    if (existingOrder) {
      const updated = await tx.contentOrder.update({
        where: { id: existingOrder.id },
        data: {
          amount: plan.price,
          status: "paid",
          provider: "manual",
          providerOrderId,
          expiresAt: null,
          callbackPayload: JSON.stringify({
            settlement: "coins",
            coinAmount: coinPrice,
          }),
          paymentReference,
          paidAt: now,
          failedAt: null,
          failureReason: null,
          closedAt: null,
          refundedAt: null,
          refundReason: null,
        },
        select: {
          id: true,
        },
      });

      return updated.id;
    }

    const created = await tx.contentOrder.create({
      data: {
        userId: input.userId,
        contentId: input.contentId,
        amount: plan.price,
        status: "paid",
        provider: "manual",
        providerOrderId,
        callbackPayload: JSON.stringify({
          settlement: "coins",
          coinAmount: coinPrice,
        }),
        paymentReference,
        paidAt: now,
      },
      select: {
        id: true,
      },
    });

    return created.id;
  });

  return {
    ok: true,
    state: "unlocked",
    contentOrderId,
    coinPrice,
  };
}

export async function purchaseMembershipWithCoins(input: {
  userId: string;
  planId: MembershipPlanId;
}): Promise<MembershipCoinPurchaseResult> {
  const plan = membershipPlans.find((item) => item.id === input.planId);

  if (!plan) {
    return { ok: false, state: "not-found" };
  }

  const coinPrice = getMembershipCoinPrice(plan.price);
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      role: true,
      membershipExpiresAt: true,
    },
  });

  if (!user) {
    return { ok: false, state: "not-found" };
  }

  const account = await prisma.coinAccount.findUnique({
    where: { userId: input.userId },
    select: {
      id: true,
      balance: true,
    },
  });

  const balance = account?.balance ?? 0;

  if (balance < coinPrice) {
    return {
      ok: false,
      state: "insufficient-balance",
      coinPrice,
      balance,
    };
  }

  const existingOrder = await prisma.membershipOrder.findFirst({
    where: {
      userId: input.userId,
      planId: input.planId,
      status: {
        in: ["pending", "failed", "closed"],
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
    },
  });

  const paymentReference = createCoinMembershipReference();
  const providerOrderId = createCoinMembershipProviderOrderId();
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const coinAccount = await tx.coinAccount.findUnique({
      where: { userId: input.userId },
      select: {
        id: true,
        balance: true,
      },
    });

    if (!coinAccount || coinAccount.balance < coinPrice) {
      throw new Error("COIN_BALANCE_CHANGED");
    }

    const currentUser = await tx.user.findUnique({
      where: { id: input.userId },
      select: {
        membershipExpiresAt: true,
      },
    });

    if (!currentUser) {
      throw new Error("USER_NOT_FOUND");
    }

    const expiresAt = nextMembershipExpiry(currentUser.membershipExpiresAt, plan.durationDays);

    await tx.coinAccount.update({
      where: { id: coinAccount.id },
      data: {
        balance: coinAccount.balance - coinPrice,
        lifetimeDebited: { increment: coinPrice },
        lastActivityAt: now,
      },
    });

    await tx.coinLedger.create({
      data: {
        accountId: coinAccount.id,
        direction: "debit",
        reason: "membership_unlock",
        amount: coinPrice,
        balanceBefore: coinAccount.balance,
        balanceAfter: coinAccount.balance - coinPrice,
        referenceType: "membership-order",
        referenceId: existingOrder?.id ?? null,
        note: input.planId,
        createdAt: now,
      },
    });

    await tx.user.update({
      where: { id: input.userId },
      data: {
        membershipPlanId: input.planId,
        membershipExpiresAt: expiresAt,
      },
    });

    if (existingOrder) {
      const updated = await tx.membershipOrder.update({
        where: { id: existingOrder.id },
        data: {
          amount: plan.price,
          status: "paid",
          provider: "manual",
          providerOrderId,
          expiresAt,
          callbackPayload: JSON.stringify({
            settlement: "coins",
            coinAmount: coinPrice,
          }),
          paymentReference,
          paidAt: now,
          failedAt: null,
          failureReason: null,
          closedAt: null,
          refundedAt: null,
          refundReason: null,
        },
        select: {
          id: true,
        },
      });

      return {
        membershipOrderId: updated.id,
        expiresAt,
      };
    }

    const created = await tx.membershipOrder.create({
      data: {
        userId: input.userId,
        planId: input.planId,
        amount: plan.price,
        status: "paid",
        provider: "manual",
        providerOrderId,
        expiresAt,
        callbackPayload: JSON.stringify({
          settlement: "coins",
          coinAmount: coinPrice,
        }),
        paymentReference,
        paidAt: now,
      },
      select: {
        id: true,
      },
    });

    return {
      membershipOrderId: created.id,
      expiresAt,
    };
  });

  return {
    ok: true,
    state: "activated",
    membershipOrderId: result.membershipOrderId,
    coinPrice,
    expiresAt: result.expiresAt.toISOString(),
  };
}

export async function getMemberCoinCenter(userId: string): Promise<MemberCoinCenter> {
  const [account, ledgers, rechargeOrders] = await Promise.all([
    prisma.coinAccount.findUnique({
      where: { userId },
      select: {
        balance: true,
      },
    }),
    prisma.coinLedger.findMany({
      where: {
        account: {
          userId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 12,
      select: {
        id: true,
        direction: true,
        reason: true,
        amount: true,
        balanceBefore: true,
        balanceAfter: true,
        note: true,
        createdAt: true,
        referenceType: true,
        referenceId: true,
      },
    }),
    prisma.coinRechargeOrder.findMany({
      where: {
        userId,
      },
      include: {
        package: {
          select: {
            titleZhCn: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 8,
    }),
  ]);

  return {
    balance: account?.balance ?? 0,
    recentLedgers: ledgers.map((item) => ({
      id: item.id,
      direction: item.direction === "debit" ? "debit" : "credit",
      reason: item.reason,
      amount: item.amount,
      balanceBefore: item.balanceBefore,
      balanceAfter: item.balanceAfter,
      note: item.note ?? undefined,
      createdAt: item.createdAt.toISOString(),
      referenceType: item.referenceType ?? undefined,
      referenceId: item.referenceId ?? undefined,
    })),
    rechargeOrders: rechargeOrders.map((item) => ({
      id: item.id,
      orderNo: item.orderNo,
      packageTitle: item.package.titleZhCn,
      amount: item.amount,
      totalCoins: item.coinAmount + item.bonusAmount,
      status:
        item.status === "paid" ||
        item.status === "failed" ||
        item.status === "closed" ||
        item.status === "refunded"
          ? item.status
          : "pending",
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      creditedAt: item.creditedAt?.toISOString(),
    })),
  };
}
