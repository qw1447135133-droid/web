import type { Prisma } from "@prisma/client";
import { membershipPlans } from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";
import type { DisplayLocale, Locale } from "@/lib/i18n-config";
import type { NotificationCategory, UserNotification as UserNotificationItem } from "@/lib/types";
import { accountT } from "@/lib/account-copy";

type NotificationClient = Prisma.TransactionClient | typeof prisma;

type NotificationLevel = "info" | "success" | "warning" | "error";

type StoredNotificationRecord = {
  id: string;
  category: string;
  type: string;
  level: string;
  title: string | null;
  message: string | null;
  actionHref: string | null;
  actionLabel: string | null;
  payloadJson: string | null;
  readAt: Date | null;
  createdAt: Date;
};

type NotificationPayload = Record<string, string | number | boolean | null | undefined>;

function parsePayload(payloadJson: string | null): NotificationPayload {
  if (!payloadJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(payloadJson) as NotificationPayload;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function planLabel(planId: string | undefined) {
  if (!planId) {
    return undefined;
  }

  return membershipPlans.find((item) => item.id === planId)?.name ?? planId;
}

function getDefaultActionLabel(locale: Locale | DisplayLocale) {
  return accountT(locale, "查看详情", "查看詳情", "Open", "เปิด", "Mo", "Open");
}

function getVerifyActionLabel(locale: Locale | DisplayLocale) {
  return accountT(locale, "立即验证", "立即驗證", "Verify now", "ยืนยันตอนนี้", "Xac minh ngay", "Verify now");
}

function formatNotification(record: StoredNotificationRecord, locale: Locale | DisplayLocale): UserNotificationItem {
  const payload = parsePayload(record.payloadJson);
  const fallbackOpenLabel = record.actionLabel?.trim() || getDefaultActionLabel(locale);
  const category = (["system", "recharge", "order", "membership", "support"].includes(record.category)
    ? record.category
    : "system") as NotificationCategory;
  const level = (["success", "warning", "error"].includes(record.level) ? record.level : "info") as UserNotificationItem["level"];

  let title = record.title?.trim() || "";
  let message = record.message?.trim() || "";
  let actionLabel = record.actionLabel?.trim() || undefined;

  switch (record.type) {
    case "recharge_created":
      title = title || accountT(locale, "充值申请已提交", "充值申請已提交", "Recharge request submitted");
      message =
        message ||
        accountT(
          locale,
          `订单 ${payload.orderNo ?? "--"} 已创建，请按指引完成付款并保留流水号 ${payload.paymentReference ?? "--"}。`,
          `訂單 ${payload.orderNo ?? "--"} 已建立，請依指引完成付款並保留流水號 ${payload.paymentReference ?? "--"}。`,
          `Order ${payload.orderNo ?? "--"} has been created. Follow the payment guide and keep reference ${payload.paymentReference ?? "--"}.`,
        );
      actionLabel = actionLabel || fallbackOpenLabel;
      break;
    case "recharge_paid":
      title = title || accountT(locale, "球币已到账", "球幣已到帳", "Coins credited");
      message =
        message ||
        accountT(
          locale,
          `充值单 ${payload.orderNo ?? "--"} 已审核入账，当前可用球币已更新。`,
          `充值單 ${payload.orderNo ?? "--"} 已審核入帳，目前可用球幣已更新。`,
          `Recharge ${payload.orderNo ?? "--"} has been credited and your available coin balance has been updated.`,
        );
      actionLabel = actionLabel || fallbackOpenLabel;
      break;
    case "recharge_failed":
      title = title || accountT(locale, "充值处理失败", "充值處理失敗", "Recharge failed");
      message =
        message ||
        accountT(
          locale,
          `充值单 ${payload.orderNo ?? "--"} 已标记失败，请重新提交或联系运营。`,
          `充值單 ${payload.orderNo ?? "--"} 已標記失敗，請重新提交或聯絡營運。`,
          `Recharge ${payload.orderNo ?? "--"} was marked as failed. Submit a new request or contact operations.`,
        );
      actionLabel = actionLabel || fallbackOpenLabel;
      break;
    case "recharge_closed":
      title = title || accountT(locale, "充值单已关闭", "充值單已關閉", "Recharge closed");
      message =
        message ||
        accountT(
          locale,
          `充值单 ${payload.orderNo ?? "--"} 已关闭，不会继续入账。`,
          `充值單 ${payload.orderNo ?? "--"} 已關閉，不會繼續入帳。`,
          `Recharge ${payload.orderNo ?? "--"} has been closed and will not be credited.`,
        );
      actionLabel = actionLabel || fallbackOpenLabel;
      break;
    case "recharge_refunded":
      title = title || accountT(locale, "充值单已退款", "充值單已退款", "Recharge refunded");
      message =
        message ||
        accountT(
          locale,
          `充值单 ${payload.orderNo ?? "--"} 已退款，如曾入账球币已同步回退。`,
          `充值單 ${payload.orderNo ?? "--"} 已退款，如曾入帳球幣已同步回退。`,
          `Recharge ${payload.orderNo ?? "--"} was refunded and any credited coins were rolled back.`,
        );
      actionLabel = actionLabel || fallbackOpenLabel;
      break;
    case "membership_activated":
      title = title || accountT(locale, "会员权益已生效", "會員權益已生效", "Membership activated");
      message =
        message ||
        accountT(
          locale,
          `${planLabel(String(payload.planId ?? "")) ?? accountT(locale, "会员套餐", "會員方案", "membership plan")} 已生效，新的到期时间为 ${payload.expiresAt ?? "--"}。`,
          `${planLabel(String(payload.planId ?? "")) ?? accountT(locale, "會員方案", "會員方案", "membership plan")} 已生效，新的到期時間為 ${payload.expiresAt ?? "--"}。`,
          `${planLabel(String(payload.planId ?? "")) ?? "Membership plan"} is active. The new expiry time is ${payload.expiresAt ?? "--"}.`,
        );
      actionLabel = actionLabel || fallbackOpenLabel;
      break;
    case "membership_refunded":
      title = title || accountT(locale, "会员订单已退款", "會員訂單已退款", "Membership refunded");
      message =
        message ||
        accountT(
          locale,
          `会员订单 ${payload.orderId ?? "--"} 已退款，权益已同步回收。`,
          `會員訂單 ${payload.orderId ?? "--"} 已退款，權益已同步回收。`,
          `Membership order ${payload.orderId ?? "--"} has been refunded and the entitlement was revoked.`,
        );
      actionLabel = actionLabel || fallbackOpenLabel;
      break;
    case "content_paid":
      title = title || accountT(locale, "内容已解锁", "內容已解鎖", "Content unlocked");
      message =
        message ||
        accountT(
          locale,
          `已获得内容 ${payload.subjectTitle ?? payload.subjectId ?? "--"} 的访问权限。`,
          `已取得內容 ${payload.subjectTitle ?? payload.subjectId ?? "--"} 的存取權限。`,
          `You now have access to ${payload.subjectTitle ?? payload.subjectId ?? "--"}.`,
        );
      actionLabel = actionLabel || fallbackOpenLabel;
      break;
    case "order_failed":
      title = title || accountT(locale, "订单处理失败", "訂單處理失敗", "Order failed");
      message =
        message ||
        accountT(
          locale,
          `${payload.subjectType === "membership" ? "会员" : "内容"}订单 ${payload.orderId ?? "--"} 支付失败，请重新发起。`,
          `${payload.subjectType === "membership" ? "會員" : "內容"}訂單 ${payload.orderId ?? "--"} 支付失敗，請重新發起。`,
          `${payload.subjectType === "membership" ? "Membership" : "Content"} order ${payload.orderId ?? "--"} failed. Please create a new payment.`,
        );
      actionLabel = actionLabel || fallbackOpenLabel;
      break;
    case "order_closed":
      title = title || accountT(locale, "订单已关闭", "訂單已關閉", "Order closed");
      message =
        message ||
        accountT(
          locale,
          `订单 ${payload.orderId ?? "--"} 已关闭。`,
          `訂單 ${payload.orderId ?? "--"} 已關閉。`,
          `Order ${payload.orderId ?? "--"} has been closed.`,
        );
      actionLabel = actionLabel || fallbackOpenLabel;
      break;
    case "assistant_handoff_requested":
      title = title || accountT(locale, "已提交人工转接", "已提交人工轉接", "Human handoff requested");
      message =
        message ||
        accountT(
          locale,
          "你的客服请求已进入后台待处理队列，后续结果会继续写入消息中心。",
          "你的客服請求已進入後台待處理隊列，後續結果會繼續寫入消息中心。",
          "Your support request entered the admin follow-up queue. Updates will continue to appear here.",
        );
      actionLabel = actionLabel || fallbackOpenLabel;
      break;
    case "assistant_handoff_resolved":
      title = title || accountT(locale, "人工客服已跟进", "人工客服已跟進", "Support follow-up completed");
      message =
        message ||
        accountT(
          locale,
          "你的人工转接请求已由运营处理，可继续在站内 AI 助手中补充问题。",
          "你的人工轉接請求已由營運處理，可繼續在站內 AI 助手中補充問題。",
          "Your handoff request has been handled by operations. You can continue inside the site assistant if needed.",
        );
      actionLabel = actionLabel || fallbackOpenLabel;
      break;
    case "email_verification_requested":
      title = title || accountT(locale, "邮箱验证待处理", "信箱驗證待處理", "Email verification pending");
      message =
        message ||
        accountT(
          locale,
          `请验证邮箱 ${payload.email ?? "--"}。当前验证链接已同步写入站内消息中心。`,
          `請驗證信箱 ${payload.email ?? "--"}。目前驗證連結已同步寫入站內消息中心。`,
          `Please verify ${payload.email ?? "--"}. The verification link has also been written into your message center.`,
        );
      actionLabel = actionLabel || getVerifyActionLabel(locale);
      break;
    case "email_verified":
      title = title || accountT(locale, "邮箱验证成功", "信箱驗證成功", "Email verified");
      message =
        message ||
        accountT(
          locale,
          `邮箱 ${payload.email ?? "--"} 已验证完成。`,
          `信箱 ${payload.email ?? "--"} 已驗證完成。`,
          `${payload.email ?? "Your email"} has been verified successfully.`,
        );
      actionLabel = actionLabel || fallbackOpenLabel;
      break;
    default:
      title = title || accountT(locale, "系统通知", "系統通知", "System notification");
      message = message || accountT(locale, "你有一条新的站内通知。", "你有一條新的站內通知。", "You have a new in-site notification.");
      actionLabel = actionLabel || (record.actionHref ? fallbackOpenLabel : undefined);
      break;
  }

  return {
    id: record.id,
    category,
    type: record.type,
    level,
    title,
    message,
    actionHref: record.actionHref ?? undefined,
    actionLabel,
    readAt: record.readAt?.toISOString(),
    createdAt: record.createdAt.toISOString(),
  };
}

export async function createUserNotification(
  client: NotificationClient,
  input: {
    userId: string;
    category: NotificationCategory;
    type: string;
    level?: NotificationLevel;
    title?: string;
    message?: string;
    actionHref?: string;
    actionLabel?: string;
    payload?: NotificationPayload;
  },
) {
  await client.userNotification.create({
    data: {
      userId: input.userId,
      category: input.category,
      type: input.type,
      level: input.level ?? "info",
      title: input.title?.trim() || null,
      message: input.message?.trim() || null,
      actionHref: input.actionHref?.trim() || null,
      actionLabel: input.actionLabel?.trim() || null,
      payloadJson: input.payload ? JSON.stringify(input.payload) : null,
    },
  });
}

export async function getUserNotifications(
  userId: string,
  locale: Locale | DisplayLocale,
  options?: { category?: NotificationCategory | "all"; limit?: number },
) {
  const where = {
    userId,
    ...(options?.category && options.category !== "all" ? { category: options.category } : {}),
  };
  const [rows, unreadCount] = await Promise.all([
    prisma.userNotification.findMany({
      where,
      orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
      take: options?.limit ?? 40,
      select: {
        id: true,
        category: true,
        type: true,
        level: true,
        title: true,
        message: true,
        actionHref: true,
        actionLabel: true,
        payloadJson: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.userNotification.count({
      where: {
        userId,
        readAt: null,
      },
    }),
  ]);

  return {
    unreadCount,
    items: rows.map((row) => formatNotification(row, locale)),
  };
}

export async function getUnreadUserNotificationCount(userId: string) {
  return prisma.userNotification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

export async function markUserNotificationsRead(userId: string, input?: { ids?: string[]; markAll?: boolean }) {
  const ids = Array.from(new Set((input?.ids ?? []).map((item) => item.trim()).filter(Boolean)));

  if (!input?.markAll && ids.length === 0) {
    return { count: 0 };
  }

  const result = await prisma.userNotification.updateMany({
    where: {
      userId,
      readAt: null,
      ...(input?.markAll ? {} : { id: { in: ids } }),
    },
    data: {
      readAt: new Date(),
    },
  });

  return { count: result.count };
}

export async function notifyRechargeCreated(
  client: NotificationClient,
  input: { userId: string; orderId: string; orderNo: string; paymentReference?: string | null; totalCoins: number; amount: number },
) {
  return createUserNotification(client, {
    userId: input.userId,
    category: "recharge",
    type: "recharge_created",
    actionHref: `/member/recharge/${encodeURIComponent(input.orderId)}`,
    payload: {
      orderId: input.orderId,
      orderNo: input.orderNo,
      paymentReference: input.paymentReference ?? undefined,
      totalCoins: input.totalCoins,
      amount: input.amount,
    },
  });
}

export async function notifyRechargeStateChanged(
  client: NotificationClient,
  input: {
    userId: string;
    orderId: string;
    orderNo: string;
    state: "paid" | "failed" | "closed" | "refunded";
    paymentReference?: string | null;
  },
) {
  const type =
    input.state === "paid"
      ? "recharge_paid"
      : input.state === "failed"
        ? "recharge_failed"
        : input.state === "closed"
          ? "recharge_closed"
          : "recharge_refunded";
  const level: NotificationLevel = input.state === "paid" ? "success" : input.state === "failed" ? "warning" : "info";

  return createUserNotification(client, {
    userId: input.userId,
    category: "recharge",
    type,
    level,
    actionHref: `/member/recharge/${encodeURIComponent(input.orderId)}`,
    payload: {
      orderId: input.orderId,
      orderNo: input.orderNo,
      paymentReference: input.paymentReference ?? undefined,
    },
  });
}

export async function notifyMembershipActivated(
  client: NotificationClient,
  input: { userId: string; orderId: string; planId: string; expiresAt?: Date | string | null },
) {
  return createUserNotification(client, {
    userId: input.userId,
    category: "membership",
    type: "membership_activated",
    level: "success",
    actionHref: "/member",
    payload: {
      orderId: input.orderId,
      planId: input.planId,
      expiresAt: input.expiresAt ? new Date(input.expiresAt).toISOString() : undefined,
    },
  });
}

export async function notifyMembershipRefunded(
  client: NotificationClient,
  input: { userId: string; orderId: string; planId: string },
) {
  return createUserNotification(client, {
    userId: input.userId,
    category: "membership",
    type: "membership_refunded",
    level: "warning",
    actionHref: "/member",
    payload: {
      orderId: input.orderId,
      planId: input.planId,
    },
  });
}

export async function notifyContentPaid(
  client: NotificationClient,
  input: { userId: string; orderId: string; subjectId: string; subjectTitle?: string },
) {
  return createUserNotification(client, {
    userId: input.userId,
    category: "order",
    type: "content_paid",
    level: "success",
    actionHref: "/member#member-entitlements",
    payload: {
      orderId: input.orderId,
      subjectId: input.subjectId,
      subjectTitle: input.subjectTitle ?? undefined,
    },
  });
}

export async function notifyOrderStateChanged(
  client: NotificationClient,
  input: { userId: string; orderId: string; subjectType: "membership" | "content"; state: "failed" | "closed" },
) {
  return createUserNotification(client, {
    userId: input.userId,
    category: "order",
    type: input.state === "failed" ? "order_failed" : "order_closed",
    level: input.state === "failed" ? "warning" : "info",
    actionHref: "/member#member-orders",
    payload: {
      orderId: input.orderId,
      subjectType: input.subjectType,
    },
  });
}

export async function notifySupportHandoffRequested(
  client: NotificationClient,
  input: { userId: string; conversationId?: string | null },
) {
  return createUserNotification(client, {
    userId: input.userId,
    category: "support",
    type: "assistant_handoff_requested",
    actionHref: "/account/notifications#account-support",
    payload: {
      conversationId: input.conversationId ?? undefined,
    },
  });
}

export async function notifySupportHandoffResolved(
  client: NotificationClient,
  input: { userId: string; conversationId?: string | null },
) {
  return createUserNotification(client, {
    userId: input.userId,
    category: "support",
    type: "assistant_handoff_resolved",
    level: "success",
    actionHref: "/account/notifications#account-support",
    payload: {
      conversationId: input.conversationId ?? undefined,
    },
  });
}

export async function notifyEmailVerificationRequested(
  client: NotificationClient,
  input: { userId: string; email: string; verifyPath: string },
) {
  return createUserNotification(client, {
    userId: input.userId,
    category: "system",
    type: "email_verification_requested",
    actionHref: input.verifyPath,
    payload: {
      email: input.email,
    },
  });
}

export async function notifyEmailVerified(client: NotificationClient, input: { userId: string; email: string }) {
  return createUserNotification(client, {
    userId: input.userId,
    category: "system",
    type: "email_verified",
    level: "success",
    actionHref: "/account/security/email",
    payload: {
      email: input.email,
    },
  });
}
