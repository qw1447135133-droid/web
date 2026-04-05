import { createHash, randomUUID } from "node:crypto";
import { membershipPlans } from "@/lib/mock-data";
import {
  getPaymentProvider,
  getPaymentProviderExpiryMinutes,
  normalizePaymentProvider,
  type PaymentProvider,
} from "@/lib/payment-provider";
import { prisma } from "@/lib/prisma";
import { recordUserMembershipEvent } from "@/lib/user-activity";
import type { MembershipPlanId, OrderStatus } from "@/lib/types";

export type PaymentOrderType = "membership" | "content";
export type PaymentReturnState = "success" | "closed" | "failed" | "error";

export type CheckoutOrder = {
  id: string;
  type: PaymentOrderType;
  provider: PaymentProvider;
  providerOrderId?: string;
  expiresAt?: string;
  title: string;
  description: string;
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

export const MEMBERSHIP_REFUND_BLOCKED_ERROR = "MEMBERSHIP_REFUND_BLOCKED";

type PaymentCallbackState = "paid" | "failed" | "closed";
type PaymentCallbackProcessingStatus = "received" | "processed" | "ignored" | "conflict" | "failed";

export type ApplyPaymentCallbackResult = {
  orderId: string;
  duplicate: boolean;
  eventKey: string;
  eventId?: string;
  eventStatus: PaymentCallbackProcessingStatus;
};

function isSafeInternalPath(value?: string, fallback = "/member") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

function buildRedirectWithPaymentState(path: string, payment: PaymentReturnState) {
  const url = new URL(path, "http://signalnine.local");
  url.searchParams.set("payment", payment);
  return `${url.pathname}${url.search}`;
}

function resolveMembershipPlan(planId: MembershipPlanId) {
  return membershipPlans.find((plan) => plan.id === planId) ?? null;
}

function nextMembershipExpiry(currentExpiry: Date | null, durationDays: number) {
  const now = new Date();
  const base = currentExpiry && currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
  const expiresAt = new Date(base);
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  return expiresAt;
}

function createMockPaymentReference(type: PaymentOrderType) {
  const prefix = type === "membership" ? "MEM" : "CNT";
  return `MOCK-${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function createPaymentReference(type: PaymentOrderType, provider = getPaymentProvider()) {
  const prefix = type === "membership" ? "MEM" : "CNT";
  const providerPrefix = provider === "mock" ? "MOCK" : provider === "hosted" ? "HOSTED" : "MANUAL";
  return `${providerPrefix}-${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function createProviderOrderId(type: PaymentOrderType, provider = getPaymentProvider()) {
  const prefix = type === "membership" ? "MEM" : "CNT";
  const providerPrefix = provider === "mock" ? "MOCK" : provider === "hosted" ? "HOSTED" : "MANUAL";
  return `${providerPrefix}-ORDER-${prefix}-${randomUUID().slice(0, 10).toUpperCase()}`;
}

function createOrderExpiry(provider = getPaymentProvider()) {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + getPaymentProviderExpiryMinutes(provider));
  return expiresAt;
}

function buildPendingOrderData(type: PaymentOrderType, provider = getPaymentProvider()) {
  return {
    provider,
    providerOrderId: createProviderOrderId(type, provider),
    expiresAt: createOrderExpiry(provider),
    paymentReference: createPaymentReference(type, provider),
    callbackPayload: null,
  };
}

function shouldRefreshPendingOrder(input: {
  provider: string;
  providerOrderId: string | null;
  paymentReference: string | null;
  expiresAt: Date | null;
}, expectedProvider: PaymentProvider) {
  const now = Date.now();

  return (
    input.provider !== expectedProvider ||
    !input.providerOrderId ||
    !input.paymentReference ||
    !input.expiresAt ||
    input.expiresAt.getTime() <= now
  );
}

function buildDefaultRefundReason(type: PaymentOrderType) {
  return type === "membership"
    ? "后台人工退款，会员权益已回收。"
    : "后台人工退款，内容解锁权益已回收。";
}

export function normalizePaymentOrderType(value?: string | null): PaymentOrderType {
  return value === "membership" ? "membership" : "content";
}

export function sanitizeReturnTo(value: string | null | undefined, fallback = "/member") {
  return isSafeInternalPath(value ?? undefined, fallback);
}

export async function createPendingMembershipOrder(input: {
  userId: string;
  planId: MembershipPlanId;
}) {
  const plan = resolveMembershipPlan(input.planId);
  const provider = getPaymentProvider();
  const pendingOrderData = buildPendingOrderData("membership", provider);

  if (!plan) {
    throw new Error("会员套餐不存在。");
  }

  const existing = await prisma.membershipOrder.findFirst({
    where: {
      userId: input.userId,
      planId: plan.id,
      status: "pending",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      planId: true,
      amount: true,
      status: true,
      provider: true,
      providerOrderId: true,
      expiresAt: true,
      paymentReference: true,
      callbackPayload: true,
      paidAt: true,
      failedAt: true,
      failureReason: true,
      closedAt: true,
      refundedAt: true,
      refundReason: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
    },
  });

  if (existing) {
    if (!shouldRefreshPendingOrder(existing, provider)) {
      return existing;
    }

    return prisma.membershipOrder.update({
      where: { id: existing.id },
      data: pendingOrderData,
    });
  }

  return prisma.membershipOrder.create({
    data: {
      userId: input.userId,
      planId: plan.id,
      amount: plan.price,
      status: "pending",
      ...pendingOrderData,
    },
  });
}

export async function createPendingContentOrder(input: {
  userId: string;
  contentId: string;
}) {
  const provider = getPaymentProvider();
  const pendingOrderData = buildPendingOrderData("content", provider);
  const storedContent = await prisma.articlePlan.findUnique({
    where: { id: input.contentId },
    select: {
      id: true,
      price: true,
      status: true,
    },
  });

  if (!storedContent || storedContent.status !== "published") {
    throw new Error("计划单不存在。");
  }

  const paidOrder = await prisma.contentOrder.findFirst({
    where: {
      userId: input.userId,
      contentId: input.contentId,
      status: "paid",
    },
    orderBy: { paidAt: "desc" },
  });

  if (paidOrder) {
    return paidOrder;
  }

  const existing = await prisma.contentOrder.findFirst({
    where: {
      userId: input.userId,
      contentId: input.contentId,
      status: "pending",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      contentId: true,
      amount: true,
      status: true,
      provider: true,
      providerOrderId: true,
      expiresAt: true,
      paymentReference: true,
      callbackPayload: true,
      paidAt: true,
      failedAt: true,
      failureReason: true,
      closedAt: true,
      refundedAt: true,
      refundReason: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
    },
  });

  if (existing) {
    if (!shouldRefreshPendingOrder(existing, provider)) {
      return existing;
    }

    return prisma.contentOrder.update({
      where: { id: existing.id },
      data: pendingOrderData,
    });
  }

  return prisma.contentOrder.create({
    data: {
      userId: input.userId,
      contentId: input.contentId,
      amount: storedContent.price,
      status: "pending",
      ...pendingOrderData,
    },
  });
}

export async function getCheckoutOrder(input: {
  type: PaymentOrderType;
  orderId: string;
  userId: string;
}): Promise<CheckoutOrder | null> {
  if (input.type === "membership") {
    const order = await prisma.membershipOrder.findFirst({
      where: {
        id: input.orderId,
        userId: input.userId,
      },
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
      },
    });

    if (!order) {
      return null;
    }

    const plan = resolveMembershipPlan(order.planId as MembershipPlanId);

    return {
      id: order.id,
      type: "membership",
      provider: normalizePaymentProvider(order.provider),
      providerOrderId: order.providerOrderId ?? undefined,
      expiresAt: order.expiresAt?.toISOString(),
      title: plan?.name ?? order.planId,
      description: plan?.description ?? "会员权益订单",
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

  const order = await prisma.contentOrder.findFirst({
    where: {
      id: input.orderId,
      userId: input.userId,
    },
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
    },
  });

  if (!order) {
    return null;
  }

  const content = await prisma.articlePlan.findUnique({
    where: { id: order.contentId },
    select: {
      title: true,
      teaser: true,
    },
  });

  return {
    id: order.id,
    type: "content",
    provider: normalizePaymentProvider(order.provider),
    providerOrderId: order.providerOrderId ?? undefined,
    expiresAt: order.expiresAt?.toISOString(),
    title: content?.title ?? order.contentId,
    description: content?.teaser ?? "单条计划单购买订单",
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

export async function confirmMockPayment(input: {
  type: PaymentOrderType;
  orderId: string;
  userId: string;
}) {
  if (input.type === "membership") {
    const order = await prisma.membershipOrder.findFirst({
      where: {
        id: input.orderId,
        userId: input.userId,
      },
      select: {
        id: true,
        planId: true,
        status: true,
        paymentReference: true,
        user: {
          select: {
            membershipExpiresAt: true,
            role: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("会员订单不存在。");
    }

    if (order.status === "paid") {
      return;
    }

    if (order.status !== "pending") {
      throw new Error("当前会员订单不允许继续支付。");
    }

    const plan = resolveMembershipPlan(order.planId as MembershipPlanId);

    if (!plan) {
      throw new Error("会员套餐不存在。");
    }

    const expiresAt = nextMembershipExpiry(order.user.membershipExpiresAt, plan.durationDays);
    const paidAt = new Date();
    const paymentReference = order.paymentReference ?? createMockPaymentReference("membership");

    await prisma.$transaction(async (tx) => {
      await tx.membershipOrder.update({
        where: { id: order.id },
        data: {
          status: "paid",
          paidAt,
          failedAt: null,
          failureReason: null,
          closedAt: null,
          refundedAt: null,
          refundReason: null,
          paymentReference,
        },
      });
      await tx.user.update({
        where: { id: input.userId },
        data: {
          membershipPlanId: plan.id,
          membershipExpiresAt: expiresAt,
          role: order.user.role === "admin" ? "admin" : "member",
        },
      });
      await recordUserMembershipEvent(tx, {
        userId: input.userId,
        action: order.user.membershipExpiresAt ? "extended" : "activated",
        planId: plan.id,
        previousPlanId: order.planId,
        previousExpiresAt: order.user.membershipExpiresAt,
        nextExpiresAt: expiresAt,
        note: "mock-payment-confirmed",
      });
    });

    return;
  }

  const order = await prisma.contentOrder.findFirst({
    where: {
      id: input.orderId,
      userId: input.userId,
    },
    select: {
      id: true,
      status: true,
      paymentReference: true,
    },
  });

  if (!order) {
    throw new Error("内容订单不存在。");
  }

  if (order.status === "paid") {
    return;
  }

  if (order.status !== "pending") {
    throw new Error("当前内容订单不允许继续支付。");
  }

  const paidAt = new Date();
  const paymentReference = order.paymentReference ?? createMockPaymentReference("content");

  await prisma.contentOrder.update({
    where: { id: order.id },
    data: {
      status: "paid",
      paidAt,
      failedAt: null,
      failureReason: null,
      closedAt: null,
      refundedAt: null,
      refundReason: null,
      paymentReference,
    },
  });
}

export async function failMockPayment(input: {
  type: PaymentOrderType;
  orderId: string;
  userId: string;
  reason?: string;
}) {
  const failureReason = input.reason?.trim() || "模拟支付通道返回失败，请重新发起订单。";

  if (input.type === "membership") {
    const order = await prisma.membershipOrder.findFirst({
      where: {
        id: input.orderId,
        userId: input.userId,
      },
      select: {
        id: true,
        status: true,
        paymentReference: true,
      },
    });

    if (!order) {
      throw new Error("会员订单不存在。");
    }

    if (order.status === "failed") {
      return;
    }

    if (order.status !== "pending") {
      throw new Error("当前会员订单不允许标记为支付失败。");
    }

    await prisma.membershipOrder.update({
      where: { id: order.id },
      data: {
        status: "failed",
        paidAt: null,
        failedAt: new Date(),
        failureReason,
        closedAt: null,
        refundedAt: null,
        refundReason: null,
        paymentReference: order.paymentReference ?? createMockPaymentReference("membership"),
      },
    });

    return;
  }

  const order = await prisma.contentOrder.findFirst({
    where: {
      id: input.orderId,
      userId: input.userId,
    },
    select: {
      id: true,
      status: true,
      paymentReference: true,
    },
  });

  if (!order) {
    throw new Error("内容订单不存在。");
  }

  if (order.status === "failed") {
    return;
  }

  if (order.status !== "pending") {
    throw new Error("当前内容订单不允许标记为支付失败。");
  }

  await prisma.contentOrder.update({
    where: { id: order.id },
    data: {
      status: "failed",
      paidAt: null,
      failedAt: new Date(),
      failureReason,
      closedAt: null,
      refundedAt: null,
      refundReason: null,
      paymentReference: order.paymentReference ?? createMockPaymentReference("content"),
    },
  });
}

export async function closeMockPayment(input: {
  type: PaymentOrderType;
  orderId: string;
  userId: string;
}) {
  if (input.type === "membership") {
    const order = await prisma.membershipOrder.findFirst({
      where: {
        id: input.orderId,
        userId: input.userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!order) {
      throw new Error("会员订单不存在。");
    }

    if (order.status === "pending") {
      const closedAt = new Date();
      await prisma.membershipOrder.update({
        where: { id: order.id },
        data: {
          status: "closed",
          failedAt: null,
          failureReason: null,
          closedAt,
          refundedAt: null,
          refundReason: null,
        },
      });
    }

    return;
  }

  const order = await prisma.contentOrder.findFirst({
    where: {
      id: input.orderId,
      userId: input.userId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!order) {
    throw new Error("内容订单不存在。");
  }

  if (order.status === "pending") {
    const closedAt = new Date();
    await prisma.contentOrder.update({
      where: { id: order.id },
      data: {
        status: "closed",
        failedAt: null,
        failureReason: null,
        closedAt,
        refundedAt: null,
        refundReason: null,
      },
    });
  }
}

export async function refundOrderByAdmin(input: {
  type: PaymentOrderType;
  orderId: string;
  reason?: string;
}) {
  const refundReason = input.reason?.trim() || buildDefaultRefundReason(input.type);
  const refundedAt = new Date();

  if (input.type === "membership") {
    const order = await prisma.membershipOrder.findUnique({
      where: { id: input.orderId },
      select: {
        id: true,
        planId: true,
        userId: true,
        status: true,
        user: {
          select: {
            membershipExpiresAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("MEMBERSHIP_ORDER_NOT_FOUND");
    }

    if (order.status === "refunded") {
      return;
    }

    if (order.status !== "paid") {
      throw new Error("MEMBERSHIP_ORDER_NOT_REFUNDABLE");
    }

    const otherPaidOrders = await prisma.membershipOrder.count({
      where: {
        userId: order.userId,
        status: "paid",
        id: {
          not: order.id,
        },
      },
    });

    if (otherPaidOrders > 0) {
      const error = new Error("MEMBERSHIP_REFUND_BLOCKED");
      (error as Error & { code?: string }).code = MEMBERSHIP_REFUND_BLOCKED_ERROR;
      throw error;
    }

    await prisma.$transaction(async (tx) => {
      await tx.membershipOrder.update({
        where: { id: order.id },
        data: {
          status: "refunded",
          failedAt: null,
          failureReason: null,
          closedAt: null,
          refundedAt,
          refundReason,
        },
      });
      await tx.user.update({
        where: { id: order.userId },
        data: {
          membershipPlanId: null,
          membershipExpiresAt: null,
        },
      });
      await recordUserMembershipEvent(tx, {
        userId: order.userId,
        action: "refunded",
        planId: order.planId,
        previousPlanId: order.planId,
        previousExpiresAt: order.user.membershipExpiresAt,
        nextExpiresAt: null,
        note: refundReason,
        createdByDisplayName: "Admin refund",
      });
    });

    return;
  }

  const order = await prisma.contentOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!order) {
    throw new Error("CONTENT_ORDER_NOT_FOUND");
  }

  if (order.status === "refunded") {
    return;
  }

  if (order.status !== "paid") {
    throw new Error("CONTENT_ORDER_NOT_REFUNDABLE");
  }

  await prisma.contentOrder.update({
    where: { id: order.id },
    data: {
      status: "refunded",
      failedAt: null,
      failureReason: null,
      closedAt: null,
      refundedAt,
      refundReason,
    },
  });
}

export async function markOrderPaidByAdmin(input: {
  type: PaymentOrderType;
  orderId: string;
  paymentReference?: string;
  allowRecoverFromTerminal?: boolean;
}) {
  if (input.type === "membership") {
    const order = await prisma.membershipOrder.findUnique({
      where: { id: input.orderId },
      select: {
        id: true,
        planId: true,
        status: true,
        paymentReference: true,
        userId: true,
        user: {
          select: {
            membershipExpiresAt: true,
            role: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("MEMBERSHIP_ORDER_NOT_FOUND");
    }

    if (order.status === "paid") {
      return;
    }

    if (order.status === "refunded") {
      throw new Error("MEMBERSHIP_ORDER_NOT_PAYABLE");
    }

    if (!input.allowRecoverFromTerminal && order.status !== "pending") {
      throw new Error("MEMBERSHIP_ORDER_NOT_PAYABLE");
    }

    if (input.allowRecoverFromTerminal && order.status !== "pending" && order.status !== "failed" && order.status !== "closed") {
      throw new Error("MEMBERSHIP_ORDER_NOT_PAYABLE");
    }

    const plan = resolveMembershipPlan(order.planId as MembershipPlanId);

    if (!plan) {
      throw new Error("MEMBERSHIP_PLAN_NOT_FOUND");
    }

    const paidAt = new Date();
    const paymentReference = input.paymentReference?.trim() || order.paymentReference || createPaymentReference("membership");
    const expiresAt = nextMembershipExpiry(order.user.membershipExpiresAt, plan.durationDays);

    await prisma.$transaction(async (tx) => {
      await tx.membershipOrder.update({
        where: { id: order.id },
        data: {
          status: "paid",
          paidAt,
          failedAt: null,
          failureReason: null,
          closedAt: null,
          refundedAt: null,
          refundReason: null,
          paymentReference,
        },
      });
      await tx.user.update({
        where: { id: order.userId },
        data: {
          membershipPlanId: plan.id,
          membershipExpiresAt: expiresAt,
          role: order.user.role === "admin" ? "admin" : "member",
        },
      });
      await recordUserMembershipEvent(tx, {
        userId: order.userId,
        action: order.user.membershipExpiresAt ? "extended" : "activated",
        planId: plan.id,
        previousPlanId: order.planId,
        previousExpiresAt: order.user.membershipExpiresAt,
        nextExpiresAt: expiresAt,
        note: "admin-paid-recovery",
        createdByDisplayName: "Admin",
      });
    });

    return;
  }

  const order = await prisma.contentOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      status: true,
      paymentReference: true,
    },
  });

  if (!order) {
    throw new Error("CONTENT_ORDER_NOT_FOUND");
  }

  if (order.status === "paid") {
    return;
  }

  if (order.status === "refunded") {
    throw new Error("CONTENT_ORDER_NOT_PAYABLE");
  }

  if (!input.allowRecoverFromTerminal && order.status !== "pending") {
    throw new Error("CONTENT_ORDER_NOT_PAYABLE");
  }

  if (input.allowRecoverFromTerminal && order.status !== "pending" && order.status !== "failed" && order.status !== "closed") {
    throw new Error("CONTENT_ORDER_NOT_PAYABLE");
  }

  await prisma.contentOrder.update({
    where: { id: order.id },
    data: {
      status: "paid",
      paidAt: new Date(),
      failedAt: null,
      failureReason: null,
      closedAt: null,
      refundedAt: null,
      refundReason: null,
      paymentReference: input.paymentReference?.trim() || order.paymentReference || createPaymentReference("content"),
    },
  });
}

export async function markOrderFailedByAdmin(input: {
  type: PaymentOrderType;
  orderId: string;
  reason?: string;
  paymentReference?: string;
}) {
  const failureReason = input.reason?.trim() || "后台记录该订单支付失败，请重新发起支付。";

  if (input.type === "membership") {
    const order = await prisma.membershipOrder.findUnique({
      where: { id: input.orderId },
      select: { id: true, status: true, paymentReference: true },
    });

    if (!order) {
      throw new Error("MEMBERSHIP_ORDER_NOT_FOUND");
    }

    if (order.status === "failed") {
      return;
    }

    if (order.status !== "pending") {
      throw new Error("MEMBERSHIP_ORDER_NOT_FAILABLE");
    }

    await prisma.membershipOrder.update({
      where: { id: order.id },
      data: {
        status: "failed",
        paidAt: null,
        failedAt: new Date(),
        failureReason,
        closedAt: null,
        refundedAt: null,
        refundReason: null,
        paymentReference: input.paymentReference?.trim() || order.paymentReference || createPaymentReference("membership"),
      },
    });

    return;
  }

  const order = await prisma.contentOrder.findUnique({
    where: { id: input.orderId },
    select: { id: true, status: true, paymentReference: true },
  });

  if (!order) {
    throw new Error("CONTENT_ORDER_NOT_FOUND");
  }

  if (order.status === "failed") {
    return;
  }

  if (order.status !== "pending") {
    throw new Error("CONTENT_ORDER_NOT_FAILABLE");
  }

  await prisma.contentOrder.update({
    where: { id: order.id },
    data: {
      status: "failed",
      paidAt: null,
      failedAt: new Date(),
      failureReason,
      closedAt: null,
      refundedAt: null,
      refundReason: null,
      paymentReference: input.paymentReference?.trim() || order.paymentReference || createPaymentReference("content"),
    },
  });
}

export async function closePendingOrderByAdmin(input: {
  type: PaymentOrderType;
  orderId: string;
}) {
  if (input.type === "membership") {
    const order = await prisma.membershipOrder.findUnique({
      where: { id: input.orderId },
      select: { id: true, status: true },
    });

    if (!order) {
      throw new Error("MEMBERSHIP_ORDER_NOT_FOUND");
    }

    if (order.status === "pending") {
      await prisma.membershipOrder.update({
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
    }

    return;
  }

  const order = await prisma.contentOrder.findUnique({
    where: { id: input.orderId },
    select: { id: true, status: true },
  });

  if (!order) {
    throw new Error("CONTENT_ORDER_NOT_FOUND");
  }

  if (order.status === "pending") {
    await prisma.contentOrder.update({
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
  }
}

function parsePaymentCallbackExpiry(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function serializePaymentCallbackPayload(payload?: unknown) {
  if (payload === undefined) {
    return null;
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

function normalizePaymentCallbackEventId(payload?: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.eventId,
    record.providerEventId,
    record.eventID,
    record.event_id,
    record.notifyId,
    record.notify_id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return undefined;
}

function buildPaymentCallbackEventKey(input: {
  provider?: string;
  eventId?: string;
  type: PaymentOrderType;
  orderId?: string;
  providerOrderId?: string;
  paymentReference?: string;
  state: PaymentCallbackState;
  reason?: string;
  expiresAt?: string;
}) {
  const provider = normalizePaymentProvider(input.provider);
  const eventId = input.eventId?.trim();

  if (eventId) {
    return `provider:${provider}:${eventId}`;
  }

  const fingerprint = JSON.stringify({
    provider,
    type: input.type,
    orderId: input.orderId?.trim() ?? "",
    providerOrderId: input.providerOrderId?.trim() ?? "",
    paymentReference: input.paymentReference?.trim() ?? "",
    state: input.state,
    reason: input.reason?.trim() ?? "",
    expiresAt: input.expiresAt?.trim() ?? "",
  });

  return `fallback:${provider}:${createHash("sha256").update(fingerprint).digest("hex")}`;
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

async function registerPaymentCallbackEvent(input: {
  type: PaymentOrderType;
  state: PaymentCallbackState;
  provider?: string;
  orderId?: string;
  providerOrderId?: string;
  paymentReference?: string;
  reason?: string;
  expiresAt?: string;
  callbackPayload?: unknown;
}) {
  const provider = normalizePaymentProvider(input.provider);
  const providerEventId = normalizePaymentCallbackEventId(input.callbackPayload);
  const eventKey = buildPaymentCallbackEventKey({
    provider,
    eventId: providerEventId,
    type: input.type,
    orderId: input.orderId,
    providerOrderId: input.providerOrderId,
    paymentReference: input.paymentReference,
    state: input.state,
    reason: input.reason,
    expiresAt: input.expiresAt,
  });
  const payload = serializePaymentCallbackPayload(input.callbackPayload);
  const now = new Date();
  const baseData = {
    provider,
    providerEventId: providerEventId ?? null,
    eventKey,
    orderType: input.type,
    orderId: input.orderId?.trim() || null,
    providerOrderId: input.providerOrderId?.trim() || null,
    paymentReference: input.paymentReference?.trim() || null,
    state: input.state,
    payload,
    lastSeenAt: now,
  };

  try {
    const event = await prisma.paymentCallbackEvent.create({
      data: baseData,
      select: {
        id: true,
        eventKey: true,
        providerEventId: true,
      },
    });

    return {
      id: event.id,
      eventKey: event.eventKey,
      eventId: event.providerEventId ?? undefined,
      duplicate: false,
      eventStatus: "received" as PaymentCallbackProcessingStatus,
      orderId: input.orderId?.trim() ?? "",
    };
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const event = await prisma.paymentCallbackEvent.update({
      where: { eventKey },
      data: {
        duplicateCount: { increment: 1 },
        lastSeenAt: now,
        ...(payload ? { payload } : {}),
        ...(providerEventId ? { providerEventId } : {}),
        ...(input.orderId?.trim() ? { orderId: input.orderId.trim() } : {}),
        ...(input.providerOrderId?.trim() ? { providerOrderId: input.providerOrderId.trim() } : {}),
        ...(input.paymentReference?.trim() ? { paymentReference: input.paymentReference.trim() } : {}),
      },
      select: {
        id: true,
        eventKey: true,
        providerEventId: true,
        processingStatus: true,
        orderId: true,
      },
    });

    return {
      id: event.id,
      eventKey: event.eventKey,
      eventId: event.providerEventId ?? undefined,
      duplicate: true,
      eventStatus: event.processingStatus as PaymentCallbackProcessingStatus,
      orderId: event.orderId ?? input.orderId?.trim() ?? "",
    };
  }
}

async function finalizePaymentCallbackEvent(input: {
  eventId: string;
  orderId?: string;
  processingStatus: PaymentCallbackProcessingStatus;
  processingMessage?: string;
}) {
  await prisma.paymentCallbackEvent.update({
    where: { id: input.eventId },
    data: {
      orderId: input.orderId?.trim() || undefined,
      processingStatus: input.processingStatus,
      processingMessage: input.processingMessage?.trim() || null,
      lastSeenAt: new Date(),
    },
  });
}

async function resolvePaymentCallbackOrder(input: {
  type: PaymentOrderType;
  orderId?: string;
  provider?: string;
  providerOrderId?: string;
  paymentReference?: string;
}) {
  const orderId = input.orderId?.trim();
  const providerOrderId = input.providerOrderId?.trim();
  const paymentReference = input.paymentReference?.trim();
  const provider = input.provider?.trim() ? normalizePaymentProvider(input.provider) : undefined;

  if (input.type === "membership") {
    if (orderId) {
      return prisma.membershipOrder.findUnique({
        where: { id: orderId },
        select: { id: true },
      });
    }

    if (providerOrderId) {
      return prisma.membershipOrder.findFirst({
        where: provider ? { provider, providerOrderId } : { providerOrderId },
        select: { id: true },
      });
    }

    if (paymentReference) {
      return prisma.membershipOrder.findFirst({
        where: { paymentReference },
        select: { id: true },
      });
    }

    return null;
  }

  if (orderId) {
    return prisma.contentOrder.findUnique({
      where: { id: orderId },
      select: { id: true },
    });
  }

  if (providerOrderId) {
    return prisma.contentOrder.findFirst({
      where: provider ? { provider, providerOrderId } : { providerOrderId },
      select: { id: true },
    });
  }

  if (paymentReference) {
    return prisma.contentOrder.findFirst({
      where: { paymentReference },
      select: { id: true },
    });
  }

  return null;
}

async function recordPaymentCallbackMetadata(input: {
  type: PaymentOrderType;
  orderId: string;
  provider?: string;
  providerOrderId?: string;
  paymentReference?: string;
  expiresAt?: string;
  callbackPayload?: unknown;
}) {
  const callbackExpiresAt = parsePaymentCallbackExpiry(input.expiresAt);
  const data = {
    ...(input.provider?.trim() ? { provider: normalizePaymentProvider(input.provider) } : {}),
    ...(input.providerOrderId?.trim() ? { providerOrderId: input.providerOrderId.trim() } : {}),
    ...(input.paymentReference?.trim() ? { paymentReference: input.paymentReference.trim() } : {}),
    ...(callbackExpiresAt ? { expiresAt: callbackExpiresAt } : {}),
    ...(input.callbackPayload !== undefined
      ? { callbackPayload: serializePaymentCallbackPayload(input.callbackPayload) }
      : {}),
  };

  if (Object.keys(data).length === 0) {
    return;
  }

  if (input.type === "membership") {
    await prisma.membershipOrder.update({
      where: { id: input.orderId },
      data,
    });
    return;
  }

  await prisma.contentOrder.update({
    where: { id: input.orderId },
    data,
  });
}

export async function applyPaymentCallback(input: {
  type: PaymentOrderType;
  orderId?: string;
  state: PaymentCallbackState;
  provider?: string;
  providerOrderId?: string;
  paymentReference?: string;
  reason?: string;
  expiresAt?: string;
  callbackPayload?: unknown;
}): Promise<ApplyPaymentCallbackResult> {
  const registeredEvent = await registerPaymentCallbackEvent(input);

  if (registeredEvent.duplicate) {
    return {
      orderId: registeredEvent.orderId,
      duplicate: true,
      eventKey: registeredEvent.eventKey,
      eventId: registeredEvent.eventId,
      eventStatus: registeredEvent.eventStatus,
    };
  }

  let finalized = false;

  const finalize = async (processingStatus: PaymentCallbackProcessingStatus, processingMessage: string, orderId?: string) => {
    await finalizePaymentCallbackEvent({
      eventId: registeredEvent.id,
      orderId,
      processingStatus,
      processingMessage,
    });
    finalized = true;
  };

  try {
  const target = await resolvePaymentCallbackOrder({
    type: input.type,
    orderId: input.orderId,
    provider: input.provider,
    providerOrderId: input.providerOrderId,
    paymentReference: input.paymentReference,
  });

  if (!target) {
    await finalize("failed", "PAYMENT_ORDER_NOT_FOUND");
    throw new Error("PAYMENT_ORDER_NOT_FOUND");
  }

  await recordPaymentCallbackMetadata({
    type: input.type,
    orderId: target.id,
    provider: input.provider,
    providerOrderId: input.providerOrderId,
    paymentReference: input.paymentReference,
    expiresAt: input.expiresAt,
    callbackPayload: input.callbackPayload,
  });

  const orderState =
    input.type === "membership"
      ? await prisma.membershipOrder.findUnique({
          where: { id: target.id },
          select: { status: true },
        })
      : await prisma.contentOrder.findUnique({
          where: { id: target.id },
          select: { status: true },
        });

  if (!orderState) {
    await finalize("failed", "PAYMENT_ORDER_NOT_FOUND", target.id);
    throw new Error("PAYMENT_ORDER_NOT_FOUND");
  }

  const currentStatus = orderState.status as OrderStatus;

  if (input.state === "paid") {
    if (currentStatus === "paid") {
      await finalize("ignored", "ORDER_ALREADY_PAID", target.id);
      return {
        orderId: target.id,
        duplicate: false,
        eventKey: registeredEvent.eventKey,
        eventId: registeredEvent.eventId,
        eventStatus: "ignored",
      };
    }

    if (currentStatus === "refunded") {
      await finalize("conflict", "PAYMENT_ORDER_ALREADY_REFUNDED", target.id);
      throw new Error("PAYMENT_ORDER_ALREADY_REFUNDED");
    }

    await markOrderPaidByAdmin({
      type: input.type,
      orderId: target.id,
      paymentReference: input.paymentReference,
      allowRecoverFromTerminal: currentStatus === "failed" || currentStatus === "closed",
    });
    await finalize("processed", "ORDER_MARKED_PAID", target.id);
    return {
      orderId: target.id,
      duplicate: false,
      eventKey: registeredEvent.eventKey,
      eventId: registeredEvent.eventId,
      eventStatus: "processed",
    };
  }

  if (input.state === "failed") {
    if (currentStatus === "failed" || currentStatus === "closed" || currentStatus === "paid" || currentStatus === "refunded") {
      await finalize("ignored", `ORDER_ALREADY_${currentStatus.toUpperCase()}`, target.id);
      return {
        orderId: target.id,
        duplicate: false,
        eventKey: registeredEvent.eventKey,
        eventId: registeredEvent.eventId,
        eventStatus: "ignored",
      };
    }

    await markOrderFailedByAdmin({
      type: input.type,
      orderId: target.id,
      paymentReference: input.paymentReference,
      reason: input.reason,
    });
    await finalize("processed", "ORDER_MARKED_FAILED", target.id);
    return {
      orderId: target.id,
      duplicate: false,
      eventKey: registeredEvent.eventKey,
      eventId: registeredEvent.eventId,
      eventStatus: "processed",
    };
  }

  if (currentStatus === "closed" || currentStatus === "failed" || currentStatus === "paid" || currentStatus === "refunded") {
    await finalize("ignored", `ORDER_ALREADY_${currentStatus.toUpperCase()}`, target.id);
    return {
      orderId: target.id,
      duplicate: false,
      eventKey: registeredEvent.eventKey,
      eventId: registeredEvent.eventId,
      eventStatus: "ignored",
    };
  }

  await closePendingOrderByAdmin({
    type: input.type,
    orderId: target.id,
  });
  await finalize("processed", "ORDER_MARKED_CLOSED", target.id);
  return {
    orderId: target.id,
    duplicate: false,
    eventKey: registeredEvent.eventKey,
    eventId: registeredEvent.eventId,
    eventStatus: "processed",
  };
  } catch (error) {
    if (!finalized) {
      const message = error instanceof Error ? error.message : "PAYMENT_CALLBACK_FAILED";
      await finalize("failed", message, registeredEvent.orderId || input.orderId);
    }

    throw error;
  }
}

export function getCheckoutRedirectPath(input: {
  type: PaymentOrderType;
  orderId: string;
  returnTo: string;
}) {
  const fallback = input.type === "membership" ? "/member" : "/plans";
  const url = new URL("/checkout", "http://signalnine.local");
  url.searchParams.set("type", input.type);
  url.searchParams.set("orderId", input.orderId);
  url.searchParams.set("returnTo", sanitizeReturnTo(input.returnTo, fallback));
  return `${url.pathname}${url.search}`;
}

export function getPaymentReturnPath(returnTo: string, payment: PaymentReturnState) {
  return buildRedirectWithPaymentState(returnTo, payment);
}
