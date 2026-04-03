import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { canAccessContent, getSessionEntitlements, hasActiveMembership } from "@/lib/entitlements";
import { normalizePaymentProvider } from "@/lib/payment-provider";
import { prisma } from "@/lib/prisma";
import type { MembershipPlanId, OrderStatus, SessionContext, SessionUser, UserRole } from "@/lib/types";

const SESSION_COOKIE = "signal-nine-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const defaultSession: SessionUser = {
  displayName: "Guest",
  email: "",
  role: "visitor",
  purchasedContentIds: [],
  membershipOrders: [],
  contentOrders: [],
};

function toSessionUser(user: {
  displayName: string;
  email: string;
  role: string;
  membershipPlanId: string | null;
  membershipExpiresAt: Date | null;
  membershipOrders: {
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
  }[];
  contentOrders: {
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
  }[];
}): SessionUser {
  return {
    displayName: user.displayName,
    email: user.email,
    role: (user.role as UserRole) ?? "member",
    membershipPlanId: (user.membershipPlanId as MembershipPlanId | undefined) ?? undefined,
    membershipExpiresAt: user.membershipExpiresAt?.toISOString(),
    purchasedContentIds: user.contentOrders
      .filter((order) => order.status === "paid")
      .map((order) => order.contentId),
    membershipOrders: user.membershipOrders.map((order) => ({
      id: order.id,
      planId: order.planId as MembershipPlanId,
      amount: order.amount,
      status: order.status as OrderStatus,
      provider: normalizePaymentProvider(order.provider),
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
    })),
    contentOrders: user.contentOrders.map((order) => ({
      id: order.id,
      contentId: order.contentId,
      amount: order.amount,
      status: order.status as OrderStatus,
      provider: normalizePaymentProvider(order.provider),
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
    })),
  };
}

async function getSessionTokenFromCookie() {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

export async function getSessionUser() {
  const token = await getSessionTokenFromCookie();

  if (!token) {
    return defaultSession;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          membershipOrders: {
            orderBy: { updatedAt: "desc" },
            take: 8,
          },
          contentOrders: {
            orderBy: { updatedAt: "desc" },
            take: 12,
          },
        },
      },
    },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) {
      await prisma.session.delete({ where: { token } });
    }
    return defaultSession;
  }

  return toSessionUser(session.user);
}

export async function getSessionContext(): Promise<SessionContext> {
  const session = await getSessionUser();

  return {
    session,
    entitlements: getSessionEntitlements(session),
  };
}

export async function getCurrentUserRecord() {
  const token = await getSessionTokenFromCookie();

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) {
      await prisma.session.delete({ where: { token } });
    }
    return null;
  }

  return session.user;
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export async function setSessionCookieForUser(userId: string) {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  const store = await cookies();
  const previousToken = store.get(SESSION_COOKIE)?.value;

  if (previousToken) {
    await prisma.session.deleteMany({ where: { token: previousToken } });
  }

  await prisma.session.create({
    data: {
      token,
      expiresAt,
      userId,
    },
  });

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }

  store.delete(SESSION_COOKIE);
}

export { canAccessContent, hasActiveMembership };
