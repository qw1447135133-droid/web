import { defaultLocale, type DisplayLocale, type Locale } from "@/lib/i18n-config";
import type { OrderStatus } from "@/lib/types";
import { getSiteCopy } from "@/lib/ui-copy";

export type PaymentResultScope = "checkout" | "member" | "plans" | "plan";
export type PaymentResultState = "success" | "closed" | "failed" | "error";

const orderStatusBadgeTones: Record<OrderStatus, string> = {
  pending: "border-orange-300/25 bg-orange-400/10 text-orange-100",
  paid: "border-lime-300/25 bg-lime-300/10 text-lime-100",
  failed: "border-rose-300/25 bg-rose-400/10 text-rose-100",
  closed: "border-white/12 bg-white/[0.03] text-slate-300",
  refunded: "border-sky-300/25 bg-sky-400/10 text-sky-100",
};

const paymentResultTones: Record<PaymentResultState, string> = {
  success: "border-lime-300/20 bg-lime-300/10 text-lime-100",
  closed: "border-white/12 bg-white/[0.03] text-slate-300",
  failed: "border-rose-300/25 bg-rose-400/12 text-rose-100",
  error: "border-rose-300/20 bg-rose-400/10 text-rose-100",
};

export function getOrderStatusMeta(status: OrderStatus, locale: Locale | DisplayLocale = defaultLocale) {
  const { orderStatusLabels } = getSiteCopy(locale);

  return {
    label: orderStatusLabels[status],
    className: `rounded-full border px-3 py-1 text-xs font-medium ${orderStatusBadgeTones[status]}`,
  };
}

export function getOrderActivityMeta(
  order: {
    status: OrderStatus;
    updatedAt?: string;
    paidAt?: string;
    failedAt?: string;
    closedAt?: string;
    refundedAt?: string;
  },
  locale: Locale | DisplayLocale = defaultLocale,
) {
  const { paymentUiCopy } = getSiteCopy(locale);

  if (order.status === "paid" && order.paidAt) {
    return { label: paymentUiCopy.activityLabels.paidAt, value: order.paidAt };
  }

  if (order.status === "failed" && order.failedAt) {
    return { label: paymentUiCopy.activityLabels.failedAt, value: order.failedAt };
  }

  if (order.status === "closed" && order.closedAt) {
    return { label: paymentUiCopy.activityLabels.closedAt, value: order.closedAt };
  }

  if (order.status === "refunded" && (order.refundedAt || order.updatedAt)) {
    return { label: paymentUiCopy.activityLabels.refundedAt, value: order.refundedAt ?? order.updatedAt };
  }

  return { label: paymentUiCopy.activityLabels.updatedAt, value: order.updatedAt };
}

export function getOrderFailureMeta(
  order: {
    status: OrderStatus;
    failureReason?: string;
    refundReason?: string;
  },
  locale: Locale | DisplayLocale = defaultLocale,
) {
  const { paymentUiCopy } = getSiteCopy(locale);

  if (order.status === "failed") {
    return {
      label: paymentUiCopy.failureLabel,
      value: order.failureReason?.trim() || paymentUiCopy.defaultFailureReason,
      tone: "error" as const,
    };
  }

  if (order.status === "refunded") {
    return {
      label: paymentUiCopy.refundLabel,
      value: order.refundReason?.trim() || paymentUiCopy.defaultRefundReason,
      tone: "info" as const,
    };
  }

  return null;
}

export function getPaymentResultMeta(scope: PaymentResultScope, value: string, locale: Locale | DisplayLocale = defaultLocale) {
  if (value !== "success" && value !== "closed" && value !== "failed" && value !== "error") {
    return null;
  }

  const { paymentUiCopy } = getSiteCopy(locale);

  return {
    message: paymentUiCopy.paymentResults[scope][value],
    className: `mt-6 rounded-[1.25rem] border px-4 py-3 text-sm ${paymentResultTones[value]}`,
  };
}
