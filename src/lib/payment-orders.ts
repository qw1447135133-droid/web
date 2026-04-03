import { randomUUID } from "node:crypto";
import { membershipPlans } from "@/lib/mock-data";
import { getPaymentProvider, type PaymentProvider } from "@/lib/payment-provider";
import { prisma } from "@/lib/prisma";
import type { MembershipPlanId, OrderStatus } from "@/lib/types";

export type PaymentOrderType = "membership" | "content";
export type PaymentReturnState = "success" | "closed" | "failed" | "error";

export type CheckoutOrder = {
  id: string;
  type: PaymentOrderType;
  provider: PaymentProvider;
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

function createPaymentReference(type: PaymentOrderType) {
  const provider = getPaymentProvider();
  const prefix = type === "membership" ? "MEM" : "CNT";
  const providerPrefix = provider === "mock" ? "MOCK" : "MANUAL";
  return `${providerPrefix}-${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
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
  });

  if (existing) {
    return existing;
  }

  return prisma.membershipOrder.create({
    data: {
      userId: input.userId,
      planId: plan.id,
      amount: plan.price,
      status: "pending",
      paymentReference: createPaymentReference("membership"),
    },
  });
}

export async function createPendingContentOrder(input: {
  userId: string;
  contentId: string;
}) {
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

  const existing = await prisma.contentOrder.findFirst({
    where: {
      userId: input.userId,
      contentId: input.contentId,
      status: "pending",
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return existing;
  }

  return prisma.contentOrder.create({
    data: {
      userId: input.userId,
      contentId: input.contentId,
      amount: storedContent.price,
      status: "pending",
      paymentReference: createPaymentReference("content"),
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
      provider: getPaymentProvider(),
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
    provider: getPaymentProvider(),
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

    await prisma.$transaction([
      prisma.membershipOrder.update({
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
      }),
      prisma.user.update({
        where: { id: input.userId },
        data: {
          membershipPlanId: plan.id,
          membershipExpiresAt: expiresAt,
          role: order.user.role === "admin" ? "admin" : "member",
        },
      }),
    ]);

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
        userId: true,
        status: true,
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

    await prisma.$transaction([
      prisma.membershipOrder.update({
        where: { id: order.id },
        data: {
          status: "refunded",
          failedAt: null,
          failureReason: null,
          closedAt: null,
          refundedAt,
          refundReason,
        },
      }),
      prisma.user.update({
        where: { id: order.userId },
        data: {
          membershipPlanId: null,
          membershipExpiresAt: null,
        },
      }),
    ]);

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

    if (order.status !== "pending") {
      throw new Error("MEMBERSHIP_ORDER_NOT_PAYABLE");
    }

    const plan = resolveMembershipPlan(order.planId as MembershipPlanId);

    if (!plan) {
      throw new Error("MEMBERSHIP_PLAN_NOT_FOUND");
    }

    const paidAt = new Date();
    const paymentReference = input.paymentReference?.trim() || order.paymentReference || createPaymentReference("membership");
    const expiresAt = nextMembershipExpiry(order.user.membershipExpiresAt, plan.durationDays);

    await prisma.$transaction([
      prisma.membershipOrder.update({
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
      }),
      prisma.user.update({
        where: { id: order.userId },
        data: {
          membershipPlanId: plan.id,
          membershipExpiresAt: expiresAt,
          role: order.user.role === "admin" ? "admin" : "member",
        },
      }),
    ]);

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

  if (order.status !== "pending") {
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

export async function applyPaymentCallback(input: {
  type: PaymentOrderType;
  orderId: string;
  state: "paid" | "failed" | "closed";
  paymentReference?: string;
  reason?: string;
}) {
  if (input.state === "paid") {
    return markOrderPaidByAdmin({
      type: input.type,
      orderId: input.orderId,
      paymentReference: input.paymentReference,
    });
  }

  if (input.state === "failed") {
    return markOrderFailedByAdmin({
      type: input.type,
      orderId: input.orderId,
      paymentReference: input.paymentReference,
      reason: input.reason,
    });
  }

  return closePendingOrderByAdmin({
    type: input.type,
    orderId: input.orderId,
  });
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
