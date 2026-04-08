import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type {
  AdminContentOrderRecord,
  AdminMembershipOrderRecord,
  AdminUserAuditRecord,
  AdminUserRechargeOrderRecord,
  AdminUserWorkspace,
} from "@/lib/admin-users";
import { getAdminUserWorkspace } from "@/lib/admin-users";
import { getCurrentDisplayLocale, type DisplayLocale } from "@/lib/i18n";
import { getIntlLocale } from "@/lib/i18n-config";
import { membershipPlans } from "@/lib/mock-data";
import { getSessionContext } from "@/lib/session";

type WorkspaceOrderKind = "membership" | "content" | "recharge";
type WorkspaceOrderStatus = "pending" | "paid" | "failed" | "closed" | "refunded";
type WorkspaceActionType = "paid" | "failed" | "closed" | "refunded";
type WorkspaceOrderView = "all" | "needs-action" | "paid" | "refunded";
type WorkspaceQueueStatusFilter = "all" | "pending" | "failed" | "closed";
type WorkspaceAuditStatusFilter = "all" | "success" | "failed";
type WorkspaceAuditScopeFilter = "all" | "users" | "finance" | "orders";
type WorkspaceActivityWindow = "all" | "7d" | "30d";
type WorkspaceCallbackView = "all" | "exceptions" | "duplicates";

type UnifiedWorkspaceOrder = {
  id: string;
  kind: WorkspaceOrderKind;
  title: string;
  orderNo?: string;
  amount: number;
  status: WorkspaceOrderStatus;
  createdAt: string;
  paymentReference?: string;
  paidAt?: string;
  failedAt?: string;
  closedAt?: string;
  refundedAt?: string;
  failureReason?: string;
  refundReason?: string;
};

type WorkspaceOrderAction = {
  id: string;
  kind: WorkspaceOrderKind;
  type: WorkspaceActionType;
  title: string;
  status: WorkspaceOrderStatus;
  at: string;
  note?: string;
};

type ParsedAuditDetail = {
  key: string;
  value: string;
};

type WorkspaceAnomalyHighlight = {
  id: string;
  href: string;
  adminHref?: string;
  tone: "alert" | "attention" | "good" | "neutral";
  title: string;
  detail: string;
};

type WorkspaceCardWarning = {
  label: string;
  tone: "alert" | "attention";
};

const WORKSPACE_LIMIT_OPTIONS = [5, 10, 20, 50] as const;

function t(locale: DisplayLocale, zhCN: string, zhTW: string, en: string) {
  if (locale === "en" || locale === "th" || locale === "vi" || locale === "hi") return en;
  if (locale === "zh-TW") return zhTW;
  return zhCN;
}

function getSingleSearchParam(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return "";
}

function normalizeOrderView(value: string): WorkspaceOrderView {
  return value === "needs-action" || value === "paid" || value === "refunded" ? value : "all";
}

function normalizeQueueStatusFilter(value: string): WorkspaceQueueStatusFilter {
  return value === "pending" || value === "failed" || value === "closed" ? value : "all";
}

function normalizeAuditStatusFilter(value: string): WorkspaceAuditStatusFilter {
  return value === "success" || value === "failed" ? value : "all";
}

function normalizeAuditScopeFilter(value: string): WorkspaceAuditScopeFilter {
  return value === "users" || value === "finance" || value === "orders" ? value : "all";
}

function normalizeActivityWindow(value: string): WorkspaceActivityWindow {
  return value === "7d" || value === "30d" ? value : "all";
}

function normalizeCallbackView(value: string): WorkspaceCallbackView {
  return value === "exceptions" || value === "duplicates" ? value : "all";
}

function normalizeSectionLimit(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return WORKSPACE_LIMIT_OPTIONS.includes(parsed as (typeof WORKSPACE_LIMIT_OPTIONS)[number]) ? parsed : fallback;
}

function setOptionalSearchParam(params: URLSearchParams, key: string, value?: string) {
  if (!value) {
    params.delete(key);
    return;
  }

  params.set(key, value);
}

function buildWorkspaceHref(
  pathname: string,
  searchParams: Record<string, string | string[] | undefined>,
  overrides: Partial<Record<string, string>>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "saved" || key === "error" || key.startsWith("saved") || key.startsWith("error")) {
      continue;
    }

    if (typeof value === "string") {
      params.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    setOptionalSearchParam(params, key, value);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function formatDateTime(value: string | undefined, locale: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatCurrency(value: number, locale: string) {
  return `CNY ${formatNumber(value, locale)}`;
}

function limitLabel(limit: number, locale: DisplayLocale) {
  return t(locale, `前 ${limit} 条`, `前 ${limit} 條`, `Top ${limit}`);
}

function getSummaryCardTone(state: "alert" | "attention" | "good" | "neutral") {
  switch (state) {
    case "alert":
      return "border-rose-300/20 bg-rose-400/10 text-rose-100";
    case "attention":
      return "border-amber-300/20 bg-amber-300/10 text-amber-100";
    case "good":
      return "border-lime-300/20 bg-lime-300/10 text-lime-100";
    default:
      return "border-white/10 bg-white/[0.04] text-slate-100";
  }
}

function getSummaryDotTone(state: "alert" | "attention" | "good" | "neutral") {
  switch (state) {
    case "alert":
      return "bg-rose-300";
    case "attention":
      return "bg-amber-300";
    case "good":
      return "bg-lime-300";
    default:
      return "bg-slate-400";
  }
}

function getWarningChipTone(tone: "alert" | "attention") {
  return tone === "alert"
    ? "border-rose-300/25 bg-rose-400/10 text-rose-100"
    : "border-amber-300/25 bg-amber-300/10 text-amber-100";
}

function actionLabel(action: string, locale: DisplayLocale) {
  switch (action) {
    case "activated":
    case "manual-activated":
      return t(locale, "启用会员", "啟用會員", "Membership activated");
    case "extended":
    case "manual-extended":
      return t(locale, "延长会员", "延長會員", "Membership extended");
    case "refunded":
      return t(locale, "会员退款", "會員退款", "Membership refunded");
    case "manual-disabled":
      return t(locale, "关闭会员", "關閉會員", "Membership disabled");
    default:
      return action;
  }
}

function orderStatusLabel(status: WorkspaceOrderStatus, locale: DisplayLocale) {
  switch (status) {
    case "paid":
      return t(locale, "已支付", "已支付", "Paid");
    case "pending":
      return t(locale, "待支付", "待支付", "Pending");
    case "failed":
      return t(locale, "支付失败", "支付失敗", "Failed");
    case "closed":
      return t(locale, "已关闭", "已關閉", "Closed");
    case "refunded":
      return t(locale, "已退款", "已退款", "Refunded");
    default:
      return status;
  }
}

function orderStatusTone(status: WorkspaceOrderStatus) {
  if (status === "paid") return "border-lime-300/25 bg-lime-300/10 text-lime-100";
  if (status === "pending") return "border-sky-300/25 bg-sky-400/10 text-sky-100";
  if (status === "refunded") return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  if (status === "failed" || status === "closed") return "border-rose-300/25 bg-rose-400/10 text-rose-100";
  return "border-white/10 bg-white/[0.05] text-slate-200";
}

function orderKindLabel(kind: WorkspaceOrderKind, locale: DisplayLocale) {
  switch (kind) {
    case "membership":
      return t(locale, "会员订单", "會員訂單", "Membership");
    case "content":
      return t(locale, "内容订单", "內容訂單", "Content");
    case "recharge":
      return t(locale, "充值订单", "充值訂單", "Recharge");
    default:
      return kind;
  }
}

function actionTypeLabel(type: WorkspaceActionType, locale: DisplayLocale) {
  switch (type) {
    case "paid":
      return t(locale, "补单 / 支付完成", "補單 / 支付完成", "Paid / recovered");
    case "failed":
      return t(locale, "标记失败", "標記失敗", "Marked failed");
    case "closed":
      return t(locale, "关闭订单", "關閉訂單", "Closed order");
    case "refunded":
      return t(locale, "退款完成", "退款完成", "Refund completed");
    default:
      return type;
  }
}

function orderViewLabel(view: WorkspaceOrderView, locale: DisplayLocale) {
  switch (view) {
    case "needs-action":
      return t(locale, "待处理", "待處理", "Needs action");
    case "paid":
      return t(locale, "已支付", "已支付", "Paid");
    case "refunded":
      return t(locale, "已退款", "已退款", "Refunded");
    default:
      return t(locale, "全部订单", "全部訂單", "All orders");
  }
}

function auditStatusLabel(filter: WorkspaceAuditStatusFilter, locale: DisplayLocale) {
  switch (filter) {
    case "success":
      return t(locale, "成功", "成功", "Success");
    case "failed":
      return t(locale, "失败", "失敗", "Failed");
    default:
      return t(locale, "全部状态", "全部狀態", "All statuses");
  }
}

function auditScopeFilterLabel(filter: WorkspaceAuditScopeFilter, locale: DisplayLocale) {
  switch (filter) {
    case "users":
      return t(locale, "用户与会员", "用戶與會員", "Users and membership");
    case "finance":
      return t(locale, "财务与充值", "財務與充值", "Finance and recharges");
    case "orders":
      return t(locale, "订单相关", "訂單相關", "Order-related");
    default:
      return t(locale, "全部范围", "全部範圍", "All scopes");
  }
}

function activityWindowLabel(window: WorkspaceActivityWindow, locale: DisplayLocale) {
  switch (window) {
    case "7d":
      return t(locale, "近 7 天", "近 7 天", "Last 7 days");
    case "30d":
      return t(locale, "近 30 天", "近 30 天", "Last 30 days");
    default:
      return t(locale, "全部时间", "全部時間", "All time");
  }
}

function queueStatusFilterLabel(filter: WorkspaceQueueStatusFilter, locale: DisplayLocale) {
  switch (filter) {
    case "pending":
      return t(locale, "待支付", "待支付", "Pending");
    case "failed":
      return t(locale, "失败", "失敗", "Failed");
    case "closed":
      return t(locale, "已关闭", "已關閉", "Closed");
    default:
      return t(locale, "全部队列", "全部隊列", "All queue");
  }
}

function callbackViewLabel(filter: WorkspaceCallbackView, locale: DisplayLocale) {
  switch (filter) {
    case "exceptions":
      return t(locale, "仅看冲突/失败", "僅看衝突/失敗", "Exceptions only");
    case "duplicates":
      return t(locale, "仅看重复", "僅看重複", "Duplicates only");
    default:
      return t(locale, "全部回调", "全部回調", "All callbacks");
  }
}

function adminAuditActionLabel(action: string, locale: DisplayLocale) {
  switch (action) {
    case "admin-extend-user-membership":
      return t(locale, "延长会员", "延長會員", "Extended membership");
    case "admin-disable-user-membership":
      return t(locale, "关闭会员", "關閉會員", "Disabled membership");
    case "admin-credit-user-coins":
    case "manual-credit-coins":
      return t(locale, "加球币", "加球幣", "Credited coins");
    case "admin-debit-user-coins":
    case "manual-debit-coins":
      return t(locale, "扣球币", "扣球幣", "Debited coins");
    case "mark-coin-recharge-paid":
      return t(locale, "充值补单", "充值補單", "Marked recharge paid");
    case "mark-coin-recharge-failed":
      return t(locale, "充值标记失败", "充值標記失敗", "Marked recharge failed");
    case "close-coin-recharge-order":
      return t(locale, "关闭充值单", "關閉充值單", "Closed recharge order");
    case "refund-coin-recharge-order":
      return t(locale, "充值退款", "充值退款", "Refunded recharge order");
    default:
      return action;
  }
}

function adminAuditStatusTone(status: string) {
  return status === "failed"
    ? "border-rose-300/25 bg-rose-400/10 text-rose-100"
    : "border-lime-300/25 bg-lime-300/10 text-lime-100";
}

function getPaymentCallbackStateMeta(state: "paid" | "failed" | "closed", locale: DisplayLocale) {
  if (state === "failed") {
    return {
      label: t(locale, "失败", "失敗", "Failed"),
      className: "bg-rose-400/12 text-rose-100",
    };
  }

  if (state === "closed") {
    return {
      label: t(locale, "关闭", "關閉", "Closed"),
      className: "bg-white/8 text-slate-300",
    };
  }

  return {
    label: t(locale, "支付成功", "支付成功", "Paid"),
    className: "bg-lime-300/12 text-lime-100",
  };
}

function getPaymentCallbackProcessingMeta(
  status: "received" | "processed" | "ignored" | "conflict" | "failed",
  locale: DisplayLocale,
) {
  if (status === "processed") {
    return {
      label: t(locale, "已处理", "已處理", "Processed"),
      className: "bg-lime-300/12 text-lime-100",
    };
  }

  if (status === "ignored") {
    return {
      label: t(locale, "已忽略", "已忽略", "Ignored"),
      className: "bg-white/8 text-slate-300",
    };
  }

  if (status === "conflict") {
    return {
      label: t(locale, "冲突", "衝突", "Conflict"),
      className: "bg-amber-300/15 text-amber-100",
    };
  }

  if (status === "failed") {
    return {
      label: t(locale, "处理失败", "處理失敗", "Failed"),
      className: "bg-rose-400/12 text-rose-100",
    };
  }

  return {
    label: t(locale, "已收到", "已收到", "Received"),
    className: "bg-sky-300/12 text-sky-100",
  };
}

function getWorkspaceActionErrorMeta(errorCode: string, errorAction: string, locale: DisplayLocale) {
  switch (errorCode) {
    case "ADMIN_USER_MEMBERSHIP_PLAN_NOT_FOUND":
      return {
        title: t(locale, "会员操作失败：套餐不存在。", "會員操作失敗：套餐不存在。", "Membership action failed: plan not found."),
        detail: t(locale, "请先检查会员套餐配置，再重新提交延长或开通动作。", "請先檢查會員套餐配置，再重新提交延長或開通動作。", "Check the membership plan configuration before retrying."),
      };
    case "ADMIN_USER_NOT_FOUND":
      return {
        title: t(locale, "用户不存在或已失效。", "用戶不存在或已失效。", "The user no longer exists."),
        detail: t(locale, "建议返回用户列表重新检索，避免继续在失效记录上执行动作。", "建議返回用戶列表重新檢索，避免繼續在失效記錄上執行動作。", "Return to the user list and reload the record before retrying."),
      };
    case "COIN_AMOUNT_INVALID":
      return {
        title: t(locale, "球币操作失败：金额无效。", "球幣操作失敗：金額無效。", "Coin action failed: invalid amount."),
        detail: t(locale, "请输入大于 0 的整数金额，再重新提交。", "請輸入大於 0 的整數金額，再重新提交。", "Enter an integer amount greater than 0 and submit again."),
      };
    case "COIN_ACCOUNT_INSUFFICIENT_BALANCE":
      return {
        title: t(locale, "扣币失败：余额不足。", "扣幣失敗：餘額不足。", "Debit failed: insufficient balance."),
        detail: t(locale, "请先核对当前余额与扣减金额，必要时改为部分扣减或补充备注。", "請先核對目前餘額與扣減金額，必要時改為部分扣減或補充備註。", "Review the wallet balance and debit amount before retrying."),
      };
    case "COIN_RECHARGE_ORDER_NOT_FOUND":
      return {
        title: t(locale, "充值订单不存在。", "充值訂單不存在。", "Recharge order not found."),
        detail: t(locale, "该订单可能已被删除或当前页面数据已过期，请刷新后重试。", "該訂單可能已被刪除或目前頁面資料已過期，請重新整理後重試。", "The order may be missing or the page data is stale. Refresh and retry."),
      };
    case "COIN_RECHARGE_ORDER_NOT_PAYABLE":
      return {
        title: t(locale, "补单失败：订单当前状态不可转支付成功。", "補單失敗：訂單目前狀態不可轉支付成功。", "Mark paid failed: order is not payable."),
        detail: t(locale, "请先检查订单是否已关闭、已退款或已处于支付成功状态。", "請先檢查訂單是否已關閉、已退款或已處於支付成功狀態。", "Check whether the order is already closed, refunded, or paid."),
      };
    case "COIN_RECHARGE_ORDER_NOT_FAILABLE":
      return {
        title: t(locale, "标记失败未执行：订单状态不允许。", "標記失敗未執行：訂單狀態不允許。", "Mark failed skipped: order state is not eligible."),
        detail: t(locale, "只有特定状态下的充值单才能转为失败，请先核对当前订单状态。", "只有特定狀態下的充值單才能轉為失敗，請先核對目前訂單狀態。", "Only eligible order states can be marked failed."),
      };
    case "COIN_RECHARGE_ORDER_NOT_REFUNDABLE":
      return {
        title: t(locale, "退款失败：订单当前不可退款。", "退款失敗：訂單目前不可退款。", "Refund failed: order is not refundable."),
        detail: t(locale, "请先确认订单是否已支付且未完成退款。", "請先確認訂單是否已支付且未完成退款。", "Confirm the order is paid and not already refunded."),
      };
    default:
      return {
        title:
          errorAction === "refund"
            ? t(locale, "退款执行失败。", "退款執行失敗。", "Refund action failed.")
            : t(locale, "刚刚的后台动作执行失败，请稍后重试。", "剛剛的後台動作執行失敗，請稍後重試。", "The latest admin action failed."),
        detail:
          errorAction === "refund"
            ? t(locale, "建议优先核对订单状态、退款条件和球币余额是否满足回退要求。", "建議優先核對訂單狀態、退款條件與球幣餘額是否滿足回退要求。", "Review the order state, refund eligibility, and coin balance before retrying.")
            : t(locale, "你可以在下方后台审计和订单队列中继续定位失败原因。", "你可以在下方後台審計與訂單隊列中繼續定位失敗原因。", "Use the audit feed and order queue below to inspect the failure."),
      };
  }
}

function agentProfileStatusLabel(status: string | undefined, locale: DisplayLocale) {
  switch (status) {
    case "active":
      return t(locale, "活跃", "活躍", "Active");
    case "frozen":
      return t(locale, "冻结", "凍結", "Frozen");
    case "inactive":
      return t(locale, "停用", "停用", "Inactive");
    default:
      return t(locale, "未开通", "未開通", "Not enabled");
  }
}

function agentCommissionKindLabel(kind: "direct" | "downstream", locale: DisplayLocale) {
  return kind === "downstream"
    ? t(locale, "下级分佣", "下級分佣", "Downstream")
    : t(locale, "直推佣金", "直推佣金", "Direct");
}

function agentCommissionStatusLabel(
  status: "pending" | "partial" | "settled" | "reversed",
  locale: DisplayLocale,
) {
  switch (status) {
    case "settled":
      return t(locale, "已结算", "已結算", "Settled");
    case "partial":
      return t(locale, "部分结算", "部分結算", "Partial");
    case "reversed":
      return t(locale, "已冲回", "已沖回", "Reversed");
    default:
      return t(locale, "待结算", "待結算", "Pending");
  }
}

function agentCommissionStatusTone(status: "pending" | "partial" | "settled" | "reversed") {
  switch (status) {
    case "settled":
      return "border-lime-300/20 bg-lime-300/10 text-lime-100";
    case "partial":
      return "border-sky-300/20 bg-sky-400/10 text-sky-100";
    case "reversed":
      return "border-rose-300/20 bg-rose-400/10 text-rose-100";
    default:
      return "border-amber-300/20 bg-amber-300/10 text-amber-100";
  }
}

function getAuditScopeLabel(scope: string, locale: DisplayLocale) {
  if (scope.startsWith("users.membership")) {
    return t(locale, "用户 / 会员", "用戶 / 會員", "Users / membership");
  }

  if (scope.startsWith("users.coin-account")) {
    return t(locale, "用户 / 球币账户", "用戶 / 球幣帳戶", "Users / coin wallet");
  }

  if (scope.startsWith("finance.coin-recharge-order")) {
    return t(locale, "财务 / 充值订单", "財務 / 充值訂單", "Finance / recharge orders");
  }

  if (scope.startsWith("finance.coin-account")) {
    return t(locale, "财务 / 球币账户", "財務 / 球幣帳戶", "Finance / coin wallet");
  }

  if (scope.startsWith("finance.reconciliation-issue")) {
    return t(locale, "财务 / 对账问题", "財務 / 對賬問題", "Finance / reconciliation");
  }

  return scope;
}

function humanizeAuditKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .trim();
}

function getAuditDetailKeyLabel(key: string, locale: DisplayLocale) {
  switch (key) {
    case "planId":
      return t(locale, "会员方案", "會員方案", "Plan");
    case "expiresAt":
      return t(locale, "到期时间", "到期時間", "Expires at");
    case "durationDays":
      return t(locale, "时长天数", "時長天數", "Duration");
    case "amount":
      return t(locale, "金额", "金額", "Amount");
    case "note":
      return t(locale, "备注", "備註", "Note");
    case "reason":
      return t(locale, "原因", "原因", "Reason");
    case "paymentReference":
      return t(locale, "支付流水", "支付流水", "Payment ref");
    case "source":
      return t(locale, "来源", "來源", "Source");
    case "status":
      return t(locale, "状态", "狀態", "Status");
    case "processedCount":
      return t(locale, "处理数", "處理數", "Processed");
    case "skippedCount":
      return t(locale, "跳过数", "跳過數", "Skipped");
    case "failedCount":
      return t(locale, "失败数", "失敗數", "Failed");
    case "workflowStage":
      return t(locale, "阶段", "階段", "Stage");
    case "orderRef":
      return t(locale, "订单引用", "訂單引用", "Order ref");
    case "issueType":
      return t(locale, "问题类型", "問題類型", "Issue type");
    case "severity":
      return t(locale, "优先级", "優先級", "Severity");
    case "reminderCount":
      return t(locale, "催办次数", "催辦次數", "Reminders");
    case "created":
      return t(locale, "是否创建", "是否建立", "Created");
    case "rows":
      return t(locale, "行数", "行數", "Rows");
    case "scope":
      return t(locale, "范围", "範圍", "Scope");
    case "filters":
      return t(locale, "筛选条件", "篩選條件", "Filters");
    default:
      return humanizeAuditKey(key);
  }
}

function parseAuditDetail(detail?: string): ParsedAuditDetail[] {
  if (!detail) {
    return [];
  }

  const segments = detail
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return [];
  }

  const parsed = segments
    .map((item) => {
      const separatorIndex = item.indexOf(":");

      if (separatorIndex < 1) {
        return null;
      }

      const key = item.slice(0, separatorIndex).trim();
      const value = item.slice(separatorIndex + 1).trim();

      if (!key || !value) {
        return null;
      }

      return { key, value };
    })
    .filter((item): item is ParsedAuditDetail => Boolean(item));

  return parsed.length === segments.length ? parsed : [];
}

function matchesOrderView(order: UnifiedWorkspaceOrder, view: WorkspaceOrderView) {
  if (view === "needs-action") {
    return order.status === "pending" || order.status === "failed" || order.status === "closed";
  }

  if (view === "paid") {
    return order.status === "paid";
  }

  if (view === "refunded") {
    return order.status === "refunded";
  }

  return true;
}

function matchesAuditStatus(log: AdminUserAuditRecord, filter: WorkspaceAuditStatusFilter) {
  if (filter === "failed") {
    return log.status === "failed";
  }

  if (filter === "success") {
    return log.status !== "failed";
  }

  return true;
}

function matchesAuditScope(log: AdminUserAuditRecord, filter: WorkspaceAuditScopeFilter) {
  if (filter === "users") {
    return log.scope.startsWith("users.");
  }

  if (filter === "finance") {
    return log.scope.startsWith("finance.");
  }

  if (filter === "orders") {
    const targetType = (log.targetType ?? "").toLowerCase();
    return log.scope.includes("order") || targetType.includes("order");
  }

  return true;
}

function matchesQueueStatus(order: UnifiedWorkspaceOrder, filter: WorkspaceQueueStatusFilter) {
  if (filter === "all") {
    return true;
  }

  return order.status === filter;
}

function matchesCallbackView(
  callback: AdminUserWorkspace["paymentCallbacks"][number],
  filter: WorkspaceCallbackView,
) {
  if (filter === "exceptions") {
    return callback.processingStatus === "conflict" || callback.processingStatus === "failed";
  }

  if (filter === "duplicates") {
    return callback.duplicateCount > 0;
  }

  return true;
}

function isWithinActivityWindow(value: string | undefined, window: WorkspaceActivityWindow) {
  if (window === "all" || !value) {
    return true;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = Date.now();
  const diff = now - date.getTime();
  const maxAge = window === "7d" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  return diff <= maxAge;
}

function toUnifiedMembershipOrder(order: AdminMembershipOrderRecord): UnifiedWorkspaceOrder {
  return {
    id: order.id,
    kind: "membership",
    title: order.planName,
    amount: order.amount,
    status: order.status,
    createdAt: order.createdAt,
    paymentReference: order.paymentReference,
    paidAt: order.paidAt,
    failedAt: order.failedAt,
    closedAt: order.closedAt,
    refundedAt: order.refundedAt,
    failureReason: order.failureReason,
    refundReason: order.refundReason,
  };
}

function toUnifiedContentOrder(order: AdminContentOrderRecord): UnifiedWorkspaceOrder {
  return {
    id: order.id,
    kind: "content",
    title: order.contentTitle,
    amount: order.amount,
    status: order.status,
    createdAt: order.createdAt,
    paymentReference: order.paymentReference,
    paidAt: order.paidAt,
    failedAt: order.failedAt,
    closedAt: order.closedAt,
    refundedAt: order.refundedAt,
    failureReason: order.failureReason,
    refundReason: order.refundReason,
  };
}

function toUnifiedRechargeOrder(order: AdminUserRechargeOrderRecord): UnifiedWorkspaceOrder {
  return {
    id: order.id,
    kind: "recharge",
    title: order.packageTitle,
    orderNo: order.orderNo,
    amount: order.amount,
    status: order.status,
    createdAt: order.createdAt,
    paymentReference: order.paymentReference,
    paidAt: order.paidAt,
    refundedAt: order.refundedAt,
    failureReason: order.failureReason,
    refundReason: order.refundReason,
  };
}

function buildOrderActionTimeline(orders: UnifiedWorkspaceOrder[]) {
  const actions: WorkspaceOrderAction[] = [];

  for (const order of orders) {
    if (order.paidAt) {
      actions.push({
        id: `${order.kind}-${order.id}-paid`,
        kind: order.kind,
        type: "paid",
        title: order.title,
        status: order.status,
        at: order.paidAt,
      });
    }

    if (order.failedAt) {
      actions.push({
        id: `${order.kind}-${order.id}-failed`,
        kind: order.kind,
        type: "failed",
        title: order.title,
        status: order.status,
        at: order.failedAt,
        note: order.failureReason,
      });
    }

    if (order.closedAt) {
      actions.push({
        id: `${order.kind}-${order.id}-closed`,
        kind: order.kind,
        type: "closed",
        title: order.title,
        status: order.status,
        at: order.closedAt,
      });
    }

    if (order.refundedAt) {
      actions.push({
        id: `${order.kind}-${order.id}-refunded`,
        kind: order.kind,
        type: "refunded",
        title: order.title,
        status: order.status,
        at: order.refundedAt,
        note: order.refundReason,
      });
    }
  }

  return actions.sort((left, right) => right.at.localeCompare(left.at));
}

function getPermissionSummary(workspace: AdminUserWorkspace, locale: DisplayLocale, paidContentCount: number) {
  const intlLocale = getIntlLocale(locale);
  const hasAdminAccess = workspace.summary.role === "admin";

  return [
    {
      label: t(locale, "会员权限", "會員權限", "Membership access"),
      value:
        workspace.summary.membershipStatus === "active"
          ? t(locale, "有效", "有效", "Active")
          : t(locale, "未开通", "未開通", "Inactive"),
      description:
        workspace.summary.membershipPlanName ??
        t(locale, "未绑定会员方案", "未綁定會員方案", "No plan attached"),
      tone:
        workspace.summary.membershipStatus === "active"
          ? "border-lime-300/20 bg-lime-300/10 text-lime-100"
          : "border-white/10 bg-white/[0.04] text-slate-200",
    },
    {
      label: t(locale, "内容解锁", "內容解鎖", "Content entitlements"),
      value: formatNumber(paidContentCount, intlLocale),
      description: t(locale, "已支付内容单数量", "已支付內容單數量", "Paid content unlock orders"),
      tone:
        paidContentCount > 0
          ? "border-sky-300/20 bg-sky-400/10 text-sky-100"
          : "border-white/10 bg-white/[0.04] text-slate-200",
    },
    {
      label: t(locale, "球币钱包", "球幣錢包", "Coin wallet"),
      value:
        workspace.summary.coinBalance > 0
          ? t(locale, "已入金", "已入金", "Funded")
          : t(locale, "空钱包", "空錢包", "Empty"),
      description: `${t(locale, "余额", "餘額", "Balance")} ${formatNumber(workspace.summary.coinBalance, intlLocale)}`,
      tone:
        workspace.summary.coinBalance > 0
          ? "border-orange-300/20 bg-orange-300/10 text-orange-100"
          : "border-white/10 bg-white/[0.04] text-slate-200",
    },
    {
      label: t(locale, "后台权限", "後台權限", "Admin access"),
      value:
        hasAdminAccess
          ? t(locale, "可进后台", "可進後台", "Admin enabled")
          : t(locale, "前台用户", "前台用戶", "Member only"),
      description: hasAdminAccess
        ? t(locale, "具备后台控制台权限", "具備後台控制台權限", "Can access admin console")
        : t(locale, "仅保留前台会员侧权限", "僅保留前台會員側權限", "No admin console access"),
      tone:
        hasAdminAccess
          ? "border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100"
          : "border-white/10 bg-white/[0.04] text-slate-200",
    },
  ];
}

function OrderCard({
  order,
  locale,
  intlLocale,
  returnTo,
  warnings = [],
}: {
  order: AdminMembershipOrderRecord | AdminContentOrderRecord;
  locale: DisplayLocale;
  intlLocale: string;
  returnTo: string;
  warnings?: WorkspaceCardWarning[];
}) {
  const type = "planName" in order ? "membership" : "content";
  const title = "planName" in order ? order.planName : order.contentTitle;
  const failReasonPlaceholder = t(
    locale,
    "后台确认支付失败，请重新发起支付。",
    "後台確認支付失敗，請重新發起支付。",
    "Payment failed. Please retry checkout.",
  );
  const refundReason = t(locale, "用户工作台退款操作", "用戶工作台退款操作", "Refund initiated from user workspace");

  return (
    <div className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium text-white">{title}</p>
        <span className={`rounded-full px-3 py-1 text-xs ${orderStatusTone(order.status)}`}>{orderStatusLabel(order.status, locale)}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
        <span>{formatCurrency(order.amount, intlLocale)}</span>
        <span>{formatDateTime(order.createdAt, intlLocale)}</span>
        {order.paymentReference ? <span>{t(locale, "支付流水", "支付流水", "Payment reference")} {order.paymentReference}</span> : null}
      </div>
      {order.providerOrderId ? <p className="mt-2 text-xs text-slate-500">Provider ID {order.providerOrderId}</p> : null}
      {order.failureReason ? <p className="mt-2 text-xs text-rose-200">{t(locale, "失败原因", "失敗原因", "Failure reason")}: {order.failureReason}</p> : null}
      {order.refundReason ? <p className="mt-2 text-xs text-amber-200">{t(locale, "退款原因", "退款原因", "Refund reason")}: {order.refundReason}</p> : null}
      {warnings.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {warnings.map((item) => (
            <span key={`${order.id}-${item.label}`} className={`rounded-full border px-3 py-1 text-xs ${getWarningChipTone(item.tone)}`}>
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {order.status === "pending" ? (
          <>
            <form action="/api/admin/orders/update-status" method="post">
              <input type="hidden" name="intent" value="mark-paid" />
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="paymentReference" value={order.paymentReference ?? order.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button type="submit" className="rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1.5 text-sm text-lime-100 transition hover:border-lime-300/45 hover:bg-lime-300/20">
                {t(locale, "补单", "補單", "Mark paid")}
              </button>
            </form>
            <form action="/api/admin/orders/update-status" method="post">
              <input type="hidden" name="intent" value="mark-failed" />
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="paymentReference" value={order.paymentReference ?? order.id} />
              <input type="hidden" name="reason" value={failReasonPlaceholder} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button type="submit" className="rounded-full border border-rose-300/25 bg-rose-400/10 px-3 py-1.5 text-sm text-rose-100 transition hover:border-rose-300/45 hover:bg-rose-400/20">
                {t(locale, "标记失败", "標記失敗", "Mark failed")}
              </button>
            </form>
            <form action="/api/admin/orders/update-status" method="post">
              <input type="hidden" name="intent" value="close" />
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button type="submit" className="rounded-full border border-white/12 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                {t(locale, "关闭", "關閉", "Close")}
              </button>
            </form>
          </>
        ) : null}
        {order.status === "paid" ? (
          <form action="/api/admin/orders/refund" method="post">
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="reason" value={refundReason} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <button type="submit" className="rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1.5 text-sm text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-400/20">
              {t(locale, "退款", "退款", "Refund")}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function SectionLimitControls({
  pathname,
  searchParams,
  paramName,
  currentLimit,
  total,
  locale,
}: {
  pathname: string;
  searchParams: Record<string, string | string[] | undefined>;
  paramName: string;
  currentLimit: number;
  total: number;
  locale: DisplayLocale;
}) {
  if (total <= WORKSPACE_LIMIT_OPTIONS[0]) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {WORKSPACE_LIMIT_OPTIONS.filter((item) => item <= total || item === currentLimit).map((item) => {
        const active = item === currentLimit;
        return (
          <Link
            key={`${paramName}-${item}`}
            href={buildWorkspaceHref(pathname, searchParams, {
              [paramName]: item === 10 ? "" : String(item),
            })}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              active
                ? "border-white/20 bg-white/[0.08] text-white"
                : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
            }`}
          >
            {limitLabel(item, locale)}
          </Link>
        );
      })}
    </div>
  );
}

function buildTrendPath(points: Array<{ label: string; value: number }>, width: number, height: number) {
  if (points.length === 0) {
    return "";
  }

  const maxValue = Math.max(...points.map((item) => item.value), 0);
  const safeMax = maxValue <= 0 ? 1 : maxValue;
  const stepX = points.length === 1 ? 0 : width / (points.length - 1);

  return points
    .map((item, index) => {
      const x = index * stepX;
      const y = height - (item.value / safeMax) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function TrendMiniCard({
  title,
  value,
  description,
  points,
  toneClass,
  locale,
  intlLocale,
}: {
  title: string;
  value: string;
  description: string;
  points: Array<{ label: string; value: number }>;
  toneClass: string;
  locale: DisplayLocale;
  intlLocale: string;
}) {
  const width = 220;
  const height = 56;
  const path = buildTrendPath(points, width, height);
  const total = points.reduce((sum, item) => sum + item.value, 0);
  const peak = points.reduce((max, item) => Math.max(max, item.value), 0);

  return (
    <div className={`rounded-[1.05rem] border px-4 py-3 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-75">{title}</p>
          <p className="mt-2 text-lg font-semibold">{value}</p>
        </div>
        <div className="text-right text-[11px] opacity-75">
          <p>{description}</p>
          <p className="mt-1">{points[0]?.label ?? "--"} - {points[points.length - 1]?.label ?? "--"}</p>
        </div>
      </div>
      <div className="mt-3 rounded-[0.9rem] border border-white/8 bg-slate-950/30 px-3 py-3">
        {path ? (
          <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full" preserveAspectRatio="none" aria-hidden="true">
            <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <div className="flex h-14 items-center justify-center text-xs text-slate-400">--</div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs opacity-80">
        <span>{t(locale, "峰值", "峰值", "Peak")} {formatCurrency(peak, intlLocale)}</span>
        <span>{t(locale, "累计", "累計", "Total")} {formatCurrency(total, intlLocale)}</span>
      </div>
    </div>
  );
}

function buildAdminFinanceHref(overrides: {
  financeIssueStatus?: string;
  financeIssueSeverity?: string;
  financeIssueType?: string;
  financeIssueQueue?: string;
  financeIssueQuery?: string;
} = {}) {
  const params = new URLSearchParams();
  params.set("tab", "finance");
  setOptionalSearchParam(params, "financeIssueStatus", overrides.financeIssueStatus);
  setOptionalSearchParam(params, "financeIssueSeverity", overrides.financeIssueSeverity);
  setOptionalSearchParam(params, "financeIssueType", overrides.financeIssueType);
  setOptionalSearchParam(params, "financeIssueQueue", overrides.financeIssueQueue);
  setOptionalSearchParam(params, "financeIssueQuery", overrides.financeIssueQuery);
  return `/admin?${params.toString()}`;
}

function buildAdminAgentsHref() {
  const params = new URLSearchParams();
  params.set("tab", "agents");
  return `/admin?${params.toString()}`;
}

function buildAdminReportsHref(reportsWindow: "7" | "30" | "90" = "30") {
  const params = new URLSearchParams();
  params.set("tab", "reports");
  params.set("reportsWindow", reportsWindow);
  return `/admin?${params.toString()}`;
}

export default async function AdminUserWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { entitlements } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    redirect("/login?next=%2Fadmin%3Ftab%3Dusers");
  }

  if (!entitlements.canAccessAdminConsole) {
    redirect("/member");
  }

  const [{ userId }, resolvedSearchParamsRaw, displayLocale] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
    getCurrentDisplayLocale(),
  ]);
  const resolvedSearchParams = resolvedSearchParamsRaw as Record<string, string | string[] | undefined>;
  const workspace = await getAdminUserWorkspace(userId);

  if (!workspace) {
    notFound();
  }

  const intlLocale = getIntlLocale(displayLocale);
  const saved = getSingleSearchParam(resolvedSearchParams.saved);
  const error = getSingleSearchParam(resolvedSearchParams.error);
  const savedAction = getSingleSearchParam(resolvedSearchParams.savedAction);
  const savedAmount = Number.parseInt(getSingleSearchParam(resolvedSearchParams.savedAmount) || "0", 10);
  const savedPlanId = getSingleSearchParam(resolvedSearchParams.savedPlanId);
  const savedDurationDays = Number.parseInt(getSingleSearchParam(resolvedSearchParams.savedDurationDays) || "0", 10);
  const savedOrderNo = getSingleSearchParam(resolvedSearchParams.savedOrderNo);
  const savedOrderAmount = Number.parseInt(getSingleSearchParam(resolvedSearchParams.savedOrderAmount) || "0", 10);
  const errorAction = getSingleSearchParam(resolvedSearchParams.errorAction);
  const errorCode = getSingleSearchParam(resolvedSearchParams.errorCode);
  const orderView = normalizeOrderView(getSingleSearchParam(resolvedSearchParams.orderView));
  const queueStatus = normalizeQueueStatusFilter(getSingleSearchParam(resolvedSearchParams.queueStatus));
  const auditStatus = normalizeAuditStatusFilter(getSingleSearchParam(resolvedSearchParams.auditStatus));
  const auditScope = normalizeAuditScopeFilter(getSingleSearchParam(resolvedSearchParams.auditScope));
  const activityWindow = normalizeActivityWindow(getSingleSearchParam(resolvedSearchParams.activityWindow));
  const callbackView = normalizeCallbackView(getSingleSearchParam(resolvedSearchParams.callbackView));
  const membershipEventLimit = normalizeSectionLimit(getSingleSearchParam(resolvedSearchParams.membershipEventLimit), 10);
  const ledgerLimit = normalizeSectionLimit(getSingleSearchParam(resolvedSearchParams.ledgerLimit), 10);
  const purchasedContentLimit = normalizeSectionLimit(getSingleSearchParam(resolvedSearchParams.purchasedContentLimit), 10);
  const actionQueueLimit = normalizeSectionLimit(getSingleSearchParam(resolvedSearchParams.actionQueueLimit), 10);
  const actionTimelineLimit = normalizeSectionLimit(getSingleSearchParam(resolvedSearchParams.actionTimelineLimit), 10);
  const loginLimit = normalizeSectionLimit(getSingleSearchParam(resolvedSearchParams.loginLimit), 10);
  const sessionLimit = normalizeSectionLimit(getSingleSearchParam(resolvedSearchParams.sessionLimit), 10);
  const rechargeLimit = normalizeSectionLimit(getSingleSearchParam(resolvedSearchParams.rechargeLimit), 10);
  const callbackLimit = normalizeSectionLimit(getSingleSearchParam(resolvedSearchParams.callbackLimit), 10);
  const agentCommissionLimit = normalizeSectionLimit(getSingleSearchParam(resolvedSearchParams.agentCommissionLimit), 10);
  const auditLimit = normalizeSectionLimit(getSingleSearchParam(resolvedSearchParams.auditLimit), 10);
  const membershipOrderLimit = normalizeSectionLimit(getSingleSearchParam(resolvedSearchParams.membershipOrderLimit), 10);
  const contentOrderLimit = normalizeSectionLimit(getSingleSearchParam(resolvedSearchParams.contentOrderLimit), 10);
  const workspacePath = `/admin/users/${workspace.summary.id}`;
  const returnTo = buildWorkspaceHref(workspacePath, resolvedSearchParams, {});
  const membershipActionReturnTo = `${returnTo}#membership-actions`;
  const rechargeActionReturnTo = `${returnTo}#recharge-orders`;
  const membershipUnifiedOrders = workspace.membershipOrders.map((item) => toUnifiedMembershipOrder(item));
  const contentUnifiedOrders = workspace.contentOrders.map((item) => toUnifiedContentOrder(item));
  const rechargeUnifiedOrders = workspace.rechargeOrders.map((item) => toUnifiedRechargeOrder(item));
  const unifiedOrders = [
    ...membershipUnifiedOrders,
    ...contentUnifiedOrders,
    ...rechargeUnifiedOrders,
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const paidContentOrders = workspace.contentOrders.filter((item) => item.status === "paid");
  const pendingActionCount = unifiedOrders.filter(
    (item) => item.status === "pending" || item.status === "failed" || item.status === "closed",
  ).length;
  const filteredUnifiedOrders = unifiedOrders.filter((item) => matchesOrderView(item, orderView));
  const actionQueue = filteredUnifiedOrders.filter((item) => item.status === "pending" || item.status === "failed" || item.status === "closed");
  const filteredActionTimeline = buildOrderActionTimeline(filteredUnifiedOrders).filter((item) =>
    isWithinActivityWindow(item.at, activityWindow),
  );
  const actionTimeline = filteredActionTimeline.slice(0, actionTimelineLimit);
  const filteredMembershipOrderIds = new Set(
    membershipUnifiedOrders.filter((item) => matchesOrderView(item, orderView)).map((item) => item.id),
  );
  const filteredContentOrderIds = new Set(
    contentUnifiedOrders.filter((item) => matchesOrderView(item, orderView)).map((item) => item.id),
  );
  const filteredRechargeOrderIds = new Set(
    rechargeUnifiedOrders.filter((item) => matchesOrderView(item, orderView)).map((item) => item.id),
  );
  const filteredMembershipOrders = workspace.membershipOrders.filter((item) => filteredMembershipOrderIds.has(item.id));
  const filteredContentOrders = workspace.contentOrders.filter((item) => filteredContentOrderIds.has(item.id));
  const filteredRechargeOrders = workspace.rechargeOrders.filter((item) => filteredRechargeOrderIds.has(item.id));
  const filteredAuditLogs = workspace.auditLogs.filter(
    (item) =>
      matchesAuditStatus(item, auditStatus) &&
      matchesAuditScope(item, auditScope) &&
      isWithinActivityWindow(item.createdAt, activityWindow),
  );
  const filteredMembershipEvents = workspace.membershipEvents.filter((item) => isWithinActivityWindow(item.createdAt, activityWindow));
  const filteredLedgers = workspace.ledgers.filter((item) => isWithinActivityWindow(item.createdAt, activityWindow));
  const filteredLoginActivities = workspace.loginActivities.filter((item) => isWithinActivityWindow(item.createdAt, activityWindow));
  const filteredSessions = workspace.sessions.filter((item) => isWithinActivityWindow(item.createdAt, activityWindow));
  const filteredQueueOrders = actionQueue.filter((item) => matchesQueueStatus(item, queueStatus));
  const filteredPaymentCallbacks = workspace.paymentCallbacks.filter(
    (item) => isWithinActivityWindow(item.lastSeenAt, activityWindow) && matchesCallbackView(item, callbackView),
  );
  const filteredAgentCommissionLedgers = workspace.agentCommissionLedgers.filter((item) =>
    isWithinActivityWindow(item.createdAt, activityWindow),
  );
  const rechargeCreditLedgerIds = new Set(
    workspace.ledgers
      .filter((item) => item.referenceType === "coin-recharge-order" && item.direction === "credit" && item.referenceId)
      .map((item) => item.referenceId as string),
  );
  const rechargeDebitLedgerIds = new Set(
    workspace.ledgers
      .filter((item) => item.referenceType === "coin-recharge-order" && item.direction === "debit" && item.referenceId)
      .map((item) => item.referenceId as string),
  );
  const rechargeOrdersById = new Map(workspace.rechargeOrders.map((item) => [item.id, item]));
  const visibleMembershipEvents = filteredMembershipEvents.slice(0, membershipEventLimit);
  const visibleLedgers = filteredLedgers.slice(0, ledgerLimit);
  const visiblePaidContentOrders = paidContentOrders.slice(0, purchasedContentLimit);
  const visibleActionQueue = filteredQueueOrders.slice(0, actionQueueLimit);
  const visibleLoginActivities = filteredLoginActivities.slice(0, loginLimit);
  const visibleSessions = filteredSessions.slice(0, sessionLimit);
  const visibleRechargeOrders = filteredRechargeOrders.slice(0, rechargeLimit);
  const visiblePaymentCallbacks = filteredPaymentCallbacks.slice(0, callbackLimit);
  const visibleAgentCommissionLedgers = filteredAgentCommissionLedgers.slice(0, agentCommissionLimit);
  const visibleAuditLogs = filteredAuditLogs.slice(0, auditLimit);
  const visibleMembershipOrders = filteredMembershipOrders.slice(0, membershipOrderLimit);
  const visibleContentOrders = filteredContentOrders.slice(0, contentOrderLimit);
  const rechargeWarningsById = new Map<string, WorkspaceCardWarning[]>();
  for (const item of filteredRechargeOrders) {
    const warnings: WorkspaceCardWarning[] = [];

    if (item.status === "paid" && !rechargeCreditLedgerIds.has(item.id)) {
      warnings.push({
        label: t(displayLocale, "未匹配加币流水", "未匹配加幣流水", "Missing credit ledger"),
        tone: "alert",
      });
    }

    if ((item.status === "failed" || item.status === "closed") && rechargeCreditLedgerIds.has(item.id)) {
      warnings.push({
        label: t(displayLocale, "终态订单仍已加币", "終態訂單仍已加幣", "Credited after terminal status"),
        tone: "alert",
      });
    }

    if (item.status === "refunded" && !rechargeDebitLedgerIds.has(item.id)) {
      warnings.push({
        label: t(displayLocale, "退款未见回退流水", "退款未見回退流水", "Missing refund rollback"),
        tone: "attention",
      });
    }

    if (warnings.length > 0) {
      rechargeWarningsById.set(item.id, warnings);
    }
  }

  const membershipWarningsById = new Map<string, WorkspaceCardWarning[]>();
  for (const item of filteredMembershipOrders) {
    const warnings: WorkspaceCardWarning[] = [];

    if (item.status === "paid" && workspace.summary.membershipStatus !== "active") {
      warnings.push({
        label: t(displayLocale, "已支付但当前未生效", "已支付但目前未生效", "Paid but inactive"),
        tone: "alert",
      });
    }

    if (item.status === "refunded" && workspace.summary.membershipStatus === "active") {
      warnings.push({
        label: t(displayLocale, "退款后仍有效需核对覆盖", "退款後仍有效需核對覆蓋", "Active after refund, verify coverage"),
        tone: "attention",
      });
    }

    if (warnings.length > 0) {
      membershipWarningsById.set(item.id, warnings);
    }
  }

  const membershipEventWarningsById = new Map<string, WorkspaceCardWarning[]>();
  for (const item of filteredMembershipEvents) {
    const warnings: WorkspaceCardWarning[] = [];

    if (item.action === "manual-disabled") {
      warnings.push({
        label: t(displayLocale, "人工关闭", "人工關閉", "Manual disable"),
        tone: "attention",
      });
    }

    if (item.action === "refunded") {
      warnings.push({
        label: t(displayLocale, "退款事件", "退款事件", "Refund event"),
        tone: "attention",
      });

      if (workspace.summary.membershipStatus === "active") {
        warnings.push({
          label: t(displayLocale, "当前仍有效需核对覆盖", "目前仍有效需核對覆蓋", "Still active, verify coverage"),
          tone: "attention",
        });
      }
    }

    if (
      (item.action === "activated" ||
        item.action === "manual-activated" ||
        item.action === "extended" ||
        item.action === "manual-extended") &&
      !item.nextExpiresAt
    ) {
      warnings.push({
        label: t(displayLocale, "缺少生效到期时间", "缺少生效到期時間", "Missing next expiry"),
        tone: "alert",
      });
    }

    if (warnings.length > 0) {
      membershipEventWarningsById.set(item.id, warnings);
    }
  }

  const ledgerWarningsById = new Map<string, WorkspaceCardWarning[]>();
  for (const item of filteredLedgers) {
    const warnings: WorkspaceCardWarning[] = [];
    const relatedRechargeOrder =
      item.referenceType === "coin-recharge-order" && item.referenceId ? rechargeOrdersById.get(item.referenceId) : undefined;

    if (item.referenceType === "coin-recharge-order") {
      if (!relatedRechargeOrder) {
        warnings.push({
          label: t(displayLocale, "关联充值单缺失", "關聯充值單缺失", "Missing recharge order"),
          tone: "attention",
        });
      } else if (item.direction === "credit" && relatedRechargeOrder.status !== "paid" && relatedRechargeOrder.status !== "refunded") {
        warnings.push({
          label: t(displayLocale, "非支付成功订单却已加币", "非支付成功訂單卻已加幣", "Credited before paid"),
          tone: "alert",
        });
      } else if (item.direction === "debit" && relatedRechargeOrder.status !== "refunded") {
        warnings.push({
          label: t(displayLocale, "未退款订单出现回退", "未退款訂單出現回退", "Rollback before refund"),
          tone: "alert",
        });
      }
    }

    if (warnings.length > 0) {
      ledgerWarningsById.set(item.id, warnings);
    }
  }
  const membershipEventWarningCount = Array.from(membershipEventWarningsById.values()).reduce(
    (total, warnings) => total + warnings.length,
    0,
  );
  const ledgerWarningCount = Array.from(ledgerWarningsById.values()).reduce((total, warnings) => total + warnings.length, 0);
  const permissionSummary = getPermissionSummary(workspace, displayLocale, paidContentOrders.length);
  const savedPlanName = membershipPlans.find((plan) => plan.id === savedPlanId)?.name ?? savedPlanId;
  const errorMeta = error ? getWorkspaceActionErrorMeta(errorCode, errorAction, displayLocale) : null;
  const noticeTitle =
    saved === "user-membership"
      ? savedAction === "disable-membership"
        ? t(displayLocale, "会员已关闭。", "會員已關閉。", "Membership disabled.")
        : t(displayLocale, "会员状态已更新。", "會員狀態已更新。", "Membership status updated.")
      : saved === "user-coins"
        ? savedAction === "debit-coins"
          ? t(displayLocale, "球币已扣减。", "球幣已扣減。", "Coins debited.")
          : t(displayLocale, "球币余额已更新。", "球幣餘額已更新。", "Coin balance updated.")
        : saved === "order-status"
          ? savedAction === "mark-paid"
            ? t(displayLocale, "充值订单已补单成功。", "充值訂單已補單成功。", "Recharge order marked as paid.")
            : savedAction === "mark-failed"
              ? t(displayLocale, "充值订单已标记失败。", "充值訂單已標記失敗。", "Recharge order marked as failed.")
              : t(displayLocale, "充值订单已关闭。", "充值訂單已關閉。", "Recharge order closed.")
          : saved === "refund"
            ? t(displayLocale, "退款已完成。", "退款已完成。", "Refund completed.")
            : error === "refund-blocked"
              ? t(
                  displayLocale,
                  "退款被拦截：该用户仍有其他有效会员订单，请先核对会员到期时间。",
                  "退款被攔截：該用戶仍有其他有效會員訂單，請先核對會員到期時間。",
                  "Refund blocked because this user still has another paid membership order.",
                )
              : error
                ? (errorMeta?.title ?? t(displayLocale, "刚刚的后台动作执行失败，请稍后重试。", "剛剛的後台動作執行失敗，請稍後重試。", "The latest admin action failed."))
                : "";
  const noticeDetail =
    saved === "user-membership"
      ? savedAction === "disable-membership"
        ? t(
            displayLocale,
            "当前会员权限已经失效，可在下方会员记录中核对关闭动作和生效时间。",
            "目前會員權限已經失效，可在下方會員記錄中核對關閉動作與生效時間。",
            "The membership entitlement is now inactive. Review the timeline below for the recorded change.",
          )
        : t(
            displayLocale,
            `${savedPlanName || t(displayLocale, "会员方案", "會員方案", "Membership plan")} · 延长 ${formatNumber(Math.max(savedDurationDays, 0), intlLocale)} 天 · 当前到期 ${formatDateTime(workspace.summary.membershipExpiresAt, intlLocale)}`,
            `${savedPlanName || t(displayLocale, "會員方案", "會員方案", "Membership plan")} · 延長 ${formatNumber(Math.max(savedDurationDays, 0), intlLocale)} 天 · 目前到期 ${formatDateTime(workspace.summary.membershipExpiresAt, intlLocale)}`,
            `${savedPlanName || "Membership plan"} · extended by ${formatNumber(Math.max(savedDurationDays, 0), intlLocale)} days · expires ${formatDateTime(workspace.summary.membershipExpiresAt, intlLocale)}`,
          )
      : saved === "user-coins"
        ? t(
            displayLocale,
            `${savedAction === "debit-coins" ? t(displayLocale, "变动金额", "變動金額", "Amount changed") : t(displayLocale, "入账金额", "入賬金額", "Amount credited")} ${formatNumber(Math.max(savedAmount, 0), intlLocale)} · 当前余额 ${formatNumber(workspace.summary.coinBalance, intlLocale)}`,
            `${savedAction === "debit-coins" ? t(displayLocale, "變動金額", "變動金額", "Amount changed") : t(displayLocale, "入賬金額", "入賬金額", "Amount credited")} ${formatNumber(Math.max(savedAmount, 0), intlLocale)} · 目前餘額 ${formatNumber(workspace.summary.coinBalance, intlLocale)}`,
            `${savedAction === "debit-coins" ? "Amount changed" : "Amount credited"} ${formatNumber(Math.max(savedAmount, 0), intlLocale)} · current balance ${formatNumber(workspace.summary.coinBalance, intlLocale)}`,
          )
        : saved === "order-status"
          ? t(
              displayLocale,
              `${savedOrderNo || "--"} · ${savedOrderAmount > 0 ? `${formatCurrency(savedOrderAmount, intlLocale)} · ` : ""}${savedAction === "mark-paid" ? t(displayLocale, "已推进到支付成功并应同步生成入账流水。", "已推進到支付成功並應同步生成入賬流水。", "Moved to paid and should generate the credit ledger.") : savedAction === "mark-failed" ? t(displayLocale, "已转为失败状态，可继续观察是否需要补单或关闭。", "已轉為失敗狀態，可繼續觀察是否需要補單或關閉。", "Moved to failed. Continue reviewing whether recovery or closure is needed.") : t(displayLocale, "已关闭，后续不会再继续自动处理。", "已關閉，後續不會再繼續自動處理。", "Closed and will no longer continue through the normal flow.")}`,
              `${savedOrderNo || "--"} · ${savedOrderAmount > 0 ? `${formatCurrency(savedOrderAmount, intlLocale)} · ` : ""}${savedAction === "mark-paid" ? t(displayLocale, "已推進到支付成功並應同步生成入賬流水。", "已推進到支付成功並應同步生成入賬流水。", "Moved to paid and should generate the credit ledger.") : savedAction === "mark-failed" ? t(displayLocale, "已轉為失敗狀態，可繼續觀察是否需要補單或關閉。", "已轉為失敗狀態，可繼續觀察是否需要補單或關閉。", "Moved to failed. Continue reviewing whether recovery or closure is needed.") : t(displayLocale, "已關閉，後續不會再繼續自動處理。", "已關閉，後續不會再繼續自動處理。", "Closed and will no longer continue through the normal flow.")}`,
              `${savedOrderNo || "--"} · ${savedOrderAmount > 0 ? `${formatCurrency(savedOrderAmount, intlLocale)} · ` : ""}${savedAction === "mark-paid" ? "Moved to paid and should generate the credit ledger." : savedAction === "mark-failed" ? "Moved to failed. Continue reviewing whether recovery or closure is needed." : "Closed and removed from the normal processing flow."}`,
            )
          : saved === "refund"
            ? t(
                displayLocale,
                `${savedOrderNo || "--"} · ${savedOrderAmount > 0 ? `${formatCurrency(savedOrderAmount, intlLocale)} · ` : ""}${t(displayLocale, "请在充值订单与球币流水中核对退款和回退是否同时落账。", "請在充值訂單與球幣流水中核對退款與回退是否同時落賬。", "Verify both the refund record and the rollback ledger below.")}`,
                `${savedOrderNo || "--"} · ${savedOrderAmount > 0 ? `${formatCurrency(savedOrderAmount, intlLocale)} · ` : ""}${t(displayLocale, "請在充值訂單與球幣流水中核對退款與回退是否同時落賬。", "請在充值訂單與球幣流水中核對退款與回退是否同時落賬。", "Verify both the refund record and the rollback ledger below.")}`,
                `${savedOrderNo || "--"} · ${savedOrderAmount > 0 ? `${formatCurrency(savedOrderAmount, intlLocale)} · ` : ""}Verify both the refund record and the rollback ledger below.`,
              )
            : error
              ? (errorMeta?.detail ?? "")
              : "";
  const orderViewOptions: WorkspaceOrderView[] = ["all", "needs-action", "paid", "refunded"];
  const queueStatusOptions: WorkspaceQueueStatusFilter[] = ["all", "pending", "failed", "closed"];
  const auditStatusOptions: WorkspaceAuditStatusFilter[] = ["all", "failed", "success"];
  const auditScopeOptions: WorkspaceAuditScopeFilter[] = ["all", "users", "finance", "orders"];
  const activityWindowOptions: WorkspaceActivityWindow[] = ["all", "7d", "30d"];
  const callbackViewOptions: WorkspaceCallbackView[] = ["all", "exceptions", "duplicates"];
  const failedAuditCount = filteredAuditLogs.filter((item) => item.status === "failed").length;
  const rechargeAttentionCount = filteredRechargeOrders.filter(
    (item) => item.status === "pending" || item.status === "failed",
  ).length;
  const paidRechargeWithoutCredit = filteredRechargeOrders.filter(
    (item) => item.status === "paid" && !rechargeCreditLedgerIds.has(item.id),
  );
  const terminalRechargeWithCredit = filteredRechargeOrders.filter(
    (item) =>
      (item.status === "failed" || item.status === "closed") &&
      rechargeCreditLedgerIds.has(item.id),
  );
  const refundedRechargeWithoutRollback = filteredRechargeOrders.filter(
    (item) => item.status === "refunded" && !rechargeDebitLedgerIds.has(item.id),
  );
  const rechargeMismatchCount =
    paidRechargeWithoutCredit.length +
    terminalRechargeWithCredit.length +
    refundedRechargeWithoutRollback.length;
  const callbackConflictCount = filteredPaymentCallbacks.filter(
    (item) => item.processingStatus === "conflict" || item.processingStatus === "failed",
  ).length;
  const callbackDuplicateCount = filteredPaymentCallbacks.filter((item) => item.duplicateCount > 0).length;
  const latestCallbackException = filteredPaymentCallbacks.find(
    (item) => item.processingStatus === "conflict" || item.processingStatus === "failed" || item.duplicateCount > 0,
  );
  const latestFailedAudit = filteredAuditLogs.find((item) => item.status === "failed");
  const latestRechargeAttention = filteredRechargeOrders.find(
    (item) => item.status === "pending" || item.status === "failed",
  );
  const latestActionQueueItem = actionQueue[0];
  const paidMembershipOrders = workspace.membershipOrders.filter((item) => item.status === "paid");
  const refundedMembershipOrders = workspace.membershipOrders.filter((item) => item.status === "refunded");
  const manualInterventionActions = new Set([
    "admin-extend-user-membership",
    "admin-disable-user-membership",
    "admin-credit-user-coins",
    "admin-debit-user-coins",
    "manual-credit-coins",
    "manual-debit-coins",
    "mark-coin-recharge-paid",
    "mark-coin-recharge-failed",
    "close-coin-recharge-order",
    "refund-coin-recharge-order",
  ]);
  const manualInterventionLogs = filteredAuditLogs.filter((item) => manualInterventionActions.has(item.action));
  const recentManualInterventionLogs = manualInterventionLogs.slice(0, 4);
  const latestMembershipEvent = workspace.membershipEvents[0];
  const latestCoinLedger = workspace.ledgers[0];
  const membershipRefundCoverageRisk =
    workspace.summary.membershipStatus === "active" && refundedMembershipOrders.length > 0;
  const anomalySummaryCards = [
    {
      id: "orders",
      href: "#order-action-queue",
      label: t(displayLocale, "待处理订单", "待處理訂單", "Orders needing action"),
      value: formatNumber(actionQueue.length, intlLocale),
      description: t(displayLocale, "待补单、失败或已关闭后待复核", "待補單、失敗或已關閉後待復核", "Pending, failed, or closed orders awaiting review"),
      tone: getSummaryCardTone(actionQueue.length > 0 ? "alert" : "good"),
    },
    {
      id: "audit",
      href: "#admin-audit",
      label: t(displayLocale, "后台失败操作", "後台失敗操作", "Failed admin actions"),
      value: formatNumber(failedAuditCount, intlLocale),
      description: t(displayLocale, "当前筛选窗口内的失败审计记录", "目前篩選視窗內的失敗審計記錄", "Failed audit entries within the current window"),
      tone: getSummaryCardTone(failedAuditCount > 0 ? "alert" : "good"),
    },
    {
      id: "recharge",
      href: "#recharge-orders",
      label: t(displayLocale, "充值异常", "充值異常", "Recharge exceptions"),
      value: formatNumber(rechargeAttentionCount + rechargeMismatchCount, intlLocale),
      description:
        rechargeMismatchCount > 0
          ? t(
              displayLocale,
              `待处理 ${rechargeAttentionCount}，对账不一致 ${rechargeMismatchCount}`,
              `待處理 ${rechargeAttentionCount}，對賬不一致 ${rechargeMismatchCount}`,
              `Needs review ${rechargeAttentionCount}, mismatch ${rechargeMismatchCount}`,
            )
          : t(displayLocale, "待处理或失败的充值订单", "待處理或失敗的充值訂單", "Pending or failed recharge orders"),
      tone: getSummaryCardTone(rechargeAttentionCount + rechargeMismatchCount > 0 ? "attention" : "good"),
    },
    {
      id: "membership",
      href: "#membership-actions",
      label: t(displayLocale, "会员健康度", "會員健康度", "Membership health"),
      value:
        workspace.summary.membershipStatus === "active"
          ? t(displayLocale, "有效", "有效", "Healthy")
          : t(displayLocale, "未开通", "未開通", "Inactive"),
      description:
        workspace.summary.membershipStatus === "active"
          ? `${t(displayLocale, "到期时间", "到期時間", "Expires")} ${formatDateTime(workspace.summary.membershipExpiresAt, intlLocale)}`
          : t(displayLocale, "建议核对是否需要手工开通或续期", "建議核對是否需要手工開通或續期", "Review whether a manual activation or extension is needed"),
      tone: getSummaryCardTone(
        workspace.summary.membershipStatus === "active"
          ? "good"
          : "neutral",
      ),
    },
  ];
  const anomalyHighlights: WorkspaceAnomalyHighlight[] = [];

  if (actionQueue.length > 0) {
    anomalyHighlights.push({
      id: "orders",
      href: "#order-action-queue",
      adminHref: buildAdminFinanceHref({
        financeIssueQueue: "active",
        financeIssueQuery: workspace.summary.id,
      }),
      tone: "alert",
      title: t(displayLocale, "订单队列待处理", "訂單隊列待處理", "Order queue requires attention"),
      detail: latestActionQueueItem
        ? `${orderKindLabel(latestActionQueueItem.kind, displayLocale)} · ${latestActionQueueItem.title} · ${orderStatusLabel(latestActionQueueItem.status, displayLocale)}`
        : t(displayLocale, "存在待处理订单。", "存在待處理訂單。", "Orders require review."),
    });
  }

  if (failedAuditCount > 0) {
    anomalyHighlights.push({
      id: "audit",
      href: "#admin-audit",
      adminHref: buildAdminFinanceHref({
        financeIssueQueue: "active",
        financeIssueQuery: workspace.summary.id,
      }),
      tone: "alert",
      title: t(displayLocale, "后台操作出现失败", "後台操作出現失敗", "Admin actions failed"),
      detail: latestFailedAudit
        ? `${adminAuditActionLabel(latestFailedAudit.action, displayLocale)} · ${getAuditScopeLabel(latestFailedAudit.scope, displayLocale)}`
        : t(displayLocale, "当前窗口内存在失败审计。", "目前視窗內存在失敗審計。", "Failed audit items exist in this window."),
    });
  }

  if (rechargeAttentionCount > 0) {
    anomalyHighlights.push({
      id: "recharge",
      href: "#recharge-orders",
      adminHref: buildAdminFinanceHref({
        financeIssueQueue: "active",
        financeIssueQuery: latestRechargeAttention?.orderNo ?? workspace.summary.id,
      }),
      tone: "attention",
      title: t(displayLocale, "充值单需要复核", "充值單需要復核", "Recharge orders need review"),
      detail: latestRechargeAttention
        ? `${latestRechargeAttention.orderNo} · ${orderStatusLabel(latestRechargeAttention.status, displayLocale)}`
        : t(displayLocale, "当前窗口内存在充值异常。", "目前視窗內存在充值異常。", "Recharge exceptions exist in this window."),
    });
  }

  if (paidRechargeWithoutCredit.length > 0) {
    anomalyHighlights.push({
      id: "recharge-credit-missing",
      href: "#recharge-orders",
      adminHref: buildAdminFinanceHref({
        financeIssueQueue: "active",
        financeIssueQuery: paidRechargeWithoutCredit[0]?.orderNo ?? workspace.summary.id,
      }),
      tone: "alert",
      title: t(displayLocale, "充值已支付但未见加币流水", "充值已支付但未見加幣流水", "Paid recharge missing credit ledger"),
      detail: `${paidRechargeWithoutCredit[0]?.orderNo ?? "--"} · ${t(displayLocale, "当前加载记录内未匹配到入账", "目前載入記錄內未匹配到入賬", "No credit entry in loaded records")}`,
    });
  }

  if (terminalRechargeWithCredit.length > 0) {
    anomalyHighlights.push({
      id: "recharge-terminal-credit-conflict",
      href: "#recharge-orders",
      adminHref: buildAdminFinanceHref({
        financeIssueQueue: "active",
        financeIssueQuery: terminalRechargeWithCredit[0]?.orderNo ?? workspace.summary.id,
      }),
      tone: "alert",
      title: t(displayLocale, "失败/关闭充值单仍有加币", "失敗/關閉充值單仍有加幣", "Failed or closed recharge still credited"),
      detail: `${terminalRechargeWithCredit[0]?.orderNo ?? "--"} · ${orderStatusLabel(terminalRechargeWithCredit[0]?.status ?? "failed", displayLocale)}`,
    });
  }

  if (refundedRechargeWithoutRollback.length > 0) {
    anomalyHighlights.push({
      id: "recharge-refund-rollback-missing",
      href: "#recharge-orders",
      adminHref: buildAdminFinanceHref({
        financeIssueQueue: "active",
        financeIssueQuery: refundedRechargeWithoutRollback[0]?.orderNo ?? workspace.summary.id,
      }),
      tone: "attention",
      title: t(displayLocale, "充值已退款但未见回退流水", "充值已退款但未見回退流水", "Refunded recharge missing rollback ledger"),
      detail: `${refundedRechargeWithoutRollback[0]?.orderNo ?? "--"} · ${t(displayLocale, "建议核对球币是否已回退", "建議核對球幣是否已回退", "Verify that coins were rolled back")}`,
    });
  }

  if (workspace.summary.membershipStatus !== "active") {
    anomalyHighlights.push({
      id: "membership-inactive",
      href: "#membership-actions",
      tone: paidMembershipOrders.length > 0 ? "alert" : "attention",
      title: t(displayLocale, "会员当前未生效", "會員目前未生效", "Membership is inactive"),
      detail:
        paidMembershipOrders.length > 0
          ? `${t(displayLocale, "已支付会员单", "已支付會員單", "Paid membership orders")} ${formatNumber(paidMembershipOrders.length, intlLocale)}`
          : t(displayLocale, "建议核对是否需要手工开通或延期。", "建議核對是否需要手工開通或延期。", "Review whether manual activation or extension is needed."),
    });
  }

  if (membershipRefundCoverageRisk) {
    anomalyHighlights.push({
      id: "membership-refund-coverage-risk",
      href: "#membership-orders",
      tone: "attention",
      title: t(displayLocale, "会员退款后仍存在有效权限", "會員退款後仍存在有效權限", "Membership still active after refund"),
      detail: t(
        displayLocale,
        "请核对是否由其他有效会员单覆盖当前会员状态。",
        "請核對是否由其他有效會員單覆蓋目前會員狀態。",
        "Verify whether another paid membership order is correctly covering the active entitlement.",
      ),
    });
  }

  if (manualInterventionLogs.length >= 3) {
    anomalyHighlights.push({
      id: "manual-intervention-heavy",
      href: "#admin-audit",
      tone: "attention",
      title: t(displayLocale, "人工干预次数偏多", "人工干預次數偏多", "Heavy manual intervention"),
      detail: `${t(displayLocale, "当前窗口内人工操作", "目前視窗內人工操作", "Manual operations in current window")} ${formatNumber(manualInterventionLogs.length, intlLocale)}`,
    });
  }

  if (callbackConflictCount > 0 || callbackDuplicateCount > 0) {
    anomalyHighlights.push({
      id: "payment-callbacks",
      href: "#payment-callbacks",
      adminHref: buildAdminFinanceHref({
        financeIssueQueue: "active",
        financeIssueQuery:
          latestCallbackException?.paymentReference ??
          latestCallbackException?.orderId ??
          workspace.summary.id,
      }),
      tone: callbackConflictCount > 0 ? "alert" : "attention",
      title: t(displayLocale, "支付回调需复核", "支付回調需復核", "Payment callbacks need review"),
      detail: latestCallbackException
        ? `${orderKindLabel(
            latestCallbackException.orderType === "membership" ? "membership" : "content",
            displayLocale,
          )} · ${getPaymentCallbackProcessingMeta(latestCallbackException.processingStatus, displayLocale).label}`
        : t(displayLocale, "存在重复或冲突回调。", "存在重複或衝突回調。", "Duplicate or conflicting callbacks detected."),
    });
  }
  const jumpLinks = [
    { href: "#profile", label: t(displayLocale, "基础资料", "基礎資料", "Profile") },
    { href: "#admin-links", label: t(displayLocale, "后台联动", "後台聯動", "Admin links") },
    { href: "#report-snapshot", label: t(displayLocale, "报表快照", "報表快照", "Report snapshot") },
    { href: "#coin-account-summary", label: t(displayLocale, "钱包摘要", "錢包摘要", "Wallet summary") },
    { href: "#agent-finance", label: t(displayLocale, "代理财务", "代理財務", "Agent finance") },
    { href: "#agent-commission-ledgers", label: t(displayLocale, "佣金明细", "佣金明細", "Commission detail") },
    { href: "#membership-actions", label: t(displayLocale, "会员操作", "會員操作", "Membership actions") },
    { href: "#membership-timeline", label: t(displayLocale, "会员记录", "會員記錄", "Membership timeline") },
    { href: "#coin-ledger", label: t(displayLocale, "球币流水", "球幣流水", "Coin ledger") },
    { href: "#purchased-content", label: t(displayLocale, "已购内容", "已購內容", "Purchased content") },
    { href: "#agent-attribution", label: t(displayLocale, "代理关系", "代理關係", "Agent attribution") },
    { href: "#order-action-queue", label: t(displayLocale, "订单队列", "訂單隊列", "Order queue") },
    { href: "#order-action-history", label: t(displayLocale, "处置记录", "處置記錄", "Action history") },
    { href: "#login-activities", label: t(displayLocale, "登录日志", "登入日誌", "Login activities") },
    { href: "#sessions", label: t(displayLocale, "会话", "會話", "Sessions") },
    { href: "#recharge-orders", label: t(displayLocale, "充值订单", "充值訂單", "Recharge orders") },
    { href: "#payment-callbacks", label: t(displayLocale, "支付回调", "支付回調", "Payment callbacks") },
    { href: "#admin-audit", label: t(displayLocale, "后台审计", "後台審計", "Admin audit") },
    { href: "#membership-orders", label: t(displayLocale, "会员订单", "會員訂單", "Membership orders") },
    { href: "#content-orders", label: t(displayLocale, "内容订单", "內容訂單", "Content orders") },
  ];
  const financeSearchTerms = Array.from(
    new Set(
      [
        workspace.summary.email,
        latestRechargeAttention?.orderNo,
        paidRechargeWithoutCredit[0]?.orderNo,
        terminalRechargeWithCredit[0]?.orderNo,
        refundedRechargeWithoutRollback[0]?.orderNo,
        latestCallbackException?.paymentReference,
        latestCallbackException?.providerOrderId,
      ].filter((item): item is string => Boolean(item)),
    ),
  ).slice(0, 4);
  const adminDeepLinks = [
    {
      id: "finance-email",
      href: `/admin?tab=finance&financeIssueQueue=active&financeIssueQuery=${encodeURIComponent(workspace.summary.email)}`,
      title: t(displayLocale, "财务对账", "財務對賬", "Finance reconciliation"),
      description: t(
        displayLocale,
        "用用户邮箱打开对账问题中心，快速核对充值与退款异常。",
        "用用戶信箱打開對賬問題中心，快速核對充值與退款異常。",
        "Open finance reconciliation with the user email to review recharge and refund exceptions.",
      ),
      badge: workspace.summary.email,
    },
    ...financeSearchTerms
      .filter((item) => item !== workspace.summary.email)
      .map((item, index) => ({
        id: `finance-term-${index}`,
        href: `/admin?tab=finance&financeIssueQueue=active&financeIssueQuery=${encodeURIComponent(item)}`,
        title: t(displayLocale, "财务问题检索", "財務問題檢索", "Finance issue search"),
        description: t(
          displayLocale,
          "直接带入订单号或支付流水，定位相关对账问题。",
          "直接帶入訂單號或支付流水，定位相關對賬問題。",
          "Jump into reconciliation using an order number or payment reference.",
        ),
        badge: item,
      })),
    {
      id: "agents",
      href: "/admin?tab=agents",
      title: t(displayLocale, "代理体系", "代理體系", "Agents"),
      description: t(
        displayLocale,
        "查看上级代理、代理档案、提现与佣金总览。",
        "查看上級代理、代理檔案、提現與佣金總覽。",
        "Open the agent console for attribution, commissions, and withdrawals.",
      ),
      badge: workspace.agentSummary.referredByAgentName ?? workspace.agentSummary.ownAgentName ?? t(displayLocale, "代理总览", "代理總覽", "Agent overview"),
    },
    {
      id: "reports",
      href: "/admin?tab=reports&reportsWindow=30",
      title: t(displayLocale, "报表中心", "報表中心", "Reports"),
      description: t(
        displayLocale,
        "打开 30 天报表窗口，核对转化、充值与代理表现。",
        "打開 30 天報表窗口，核對轉化、充值與代理表現。",
        "Open the 30-day reporting window for revenue, conversion, and agent performance.",
      ),
      badge: t(displayLocale, "最近 30 天", "最近 30 天", "Last 30 days"),
    },
  ];

  return (
    <section className="mx-auto max-w-[1500px] px-4 py-8 md:px-6">
      <div className="glass-panel rounded-[2rem] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-label">User Workspace</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{workspace.summary.displayName}</h1>
            <p className="mt-2 text-sm text-slate-400">{workspace.summary.email}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">User ID {workspace.summary.id}</span>
              <span
                className={`rounded-full border px-3 py-1 ${
                  workspace.summary.emailVerifiedAt
                    ? "border-lime-300/20 bg-lime-300/10 text-lime-100"
                    : "border-amber-300/20 bg-amber-300/10 text-amber-100"
                }`}
              >
                {workspace.summary.emailVerifiedAt
                  ? t(displayLocale, "邮箱已验证", "信箱已驗證", "Email verified")
                  : t(displayLocale, "邮箱待验证", "信箱待驗證", "Email pending")}
              </span>
              {workspace.summary.preferredLocale ? (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                  {t(displayLocale, "偏好语言", "偏好語言", "Preferred locale")} {workspace.summary.preferredLocale}
                </span>
              ) : null}
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                {t(displayLocale, "最近更新", "最近更新", "Updated")} {formatDateTime(workspace.summary.updatedAt, intlLocale)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={buildAdminFinanceHref({
                financeIssueQueue: "active",
                financeIssueQuery: workspace.summary.id,
              })}
              className="inline-flex items-center justify-center rounded-full border border-orange-300/20 bg-orange-300/10 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/40 hover:bg-orange-300/20"
            >
              {t(displayLocale, "财务联动", "財務聯動", "Finance desk")}
            </Link>
            <Link
              href={buildAdminAgentsHref()}
              className="inline-flex items-center justify-center rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-4 py-2 text-sm text-fuchsia-100 transition hover:border-fuchsia-300/40 hover:bg-fuchsia-300/20"
            >
              {t(displayLocale, "代理联动", "代理聯動", "Agent desk")}
            </Link>
            <Link
              href={buildAdminReportsHref("30")}
              className="inline-flex items-center justify-center rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-sm text-sky-100 transition hover:border-sky-300/40 hover:bg-sky-300/20"
            >
              {t(displayLocale, "报表联动", "報表聯動", "Reports")}
            </Link>
            <Link
              href="/admin?tab=users"
              className="inline-flex items-center justify-center rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white"
            >
              {t(displayLocale, "返回用户列表", "返回用戶列表", "Back to users")}
            </Link>
            <span className={`rounded-full px-3 py-2 text-xs ${workspace.summary.membershipStatus === "active" ? "bg-lime-300/12 text-lime-100" : "bg-white/8 text-slate-300"}`}>
              {workspace.summary.membershipStatus === "active"
                ? t(displayLocale, "会员有效", "會員有效", "Member active")
                : t(displayLocale, "普通用户", "普通用戶", "Regular user")}
            </span>
          </div>
        </div>

        {noticeTitle ? (
          <div className={`mt-6 rounded-[1.2rem] border px-4 py-3 text-sm ${error ? "border-rose-300/25 bg-rose-400/10 text-rose-100" : "border-lime-300/20 bg-lime-300/10 text-lime-100"}`}>
            <p className="font-medium">{noticeTitle}</p>
            {noticeDetail ? <p className="mt-1 text-xs opacity-85">{noticeDetail}</p> : null}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {[
            [t(displayLocale, "球币余额", "球幣餘額", "Coin balance"), formatNumber(workspace.summary.coinBalance, intlLocale)],
            [t(displayLocale, "有效会话", "有效會話", "Active sessions"), formatNumber(workspace.summary.activeSessionCount, intlLocale)],
            [t(displayLocale, "已购内容", "已購內容", "Purchased content"), formatNumber(paidContentOrders.length, intlLocale)],
            [t(displayLocale, "待处理订单", "待處理訂單", "Orders needing action"), formatNumber(pendingActionCount, intlLocale)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-label">{t(displayLocale, "工作台筛选", "工作台篩選", "Workspace filters")}</p>
              <h2 className="mt-2 text-xl font-semibold text-white">{t(displayLocale, "订单与审计视图", "訂單與審計視圖", "Order and audit views")}</h2>
            </div>
            <Link
              href={buildWorkspaceHref(workspacePath, resolvedSearchParams, {
                orderView: "",
                queueStatus: "",
                auditStatus: "",
                auditScope: "",
                activityWindow: "",
                callbackView: "",
              })}
              className="text-sm text-slate-400 transition hover:text-white"
            >
              {t(displayLocale, "重置筛选", "重置篩選", "Reset filters")}
            </Link>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-5">
            <div className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
              <p className="text-sm font-medium text-white">{t(displayLocale, "订单视图", "訂單視圖", "Order view")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {orderViewOptions.map((item) => {
                  const active = item === orderView;
                  return (
                    <Link
                      key={item}
                      href={buildWorkspaceHref(workspacePath, resolvedSearchParams, { orderView: item === "all" ? "" : item })}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        active
                          ? "border-orange-300/35 bg-orange-300/14 text-orange-100"
                          : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {orderViewLabel(item, displayLocale)}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
              <p className="text-sm font-medium text-white">{t(displayLocale, "待处理队列", "待處理隊列", "Queue focus")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {queueStatusOptions.map((item) => {
                  const active = item === queueStatus;
                  return (
                    <Link
                      key={item}
                      href={buildWorkspaceHref(workspacePath, resolvedSearchParams, { queueStatus: item === "all" ? "" : item })}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        active
                          ? "border-amber-300/35 bg-amber-300/14 text-amber-100"
                          : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {queueStatusFilterLabel(item, displayLocale)}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
              <p className="text-sm font-medium text-white">{t(displayLocale, "审计状态", "審計狀態", "Audit status")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {auditStatusOptions.map((item) => {
                  const active = item === auditStatus;
                  return (
                    <Link
                      key={item}
                      href={buildWorkspaceHref(workspacePath, resolvedSearchParams, { auditStatus: item === "all" ? "" : item })}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        active
                          ? "border-sky-300/35 bg-sky-300/14 text-sky-100"
                          : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {auditStatusLabel(item, displayLocale)}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
              <p className="text-sm font-medium text-white">{t(displayLocale, "审计范围", "審計範圍", "Audit scope")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {auditScopeOptions.map((item) => {
                  const active = item === auditScope;
                  return (
                    <Link
                      key={item}
                      href={buildWorkspaceHref(workspacePath, resolvedSearchParams, { auditScope: item === "all" ? "" : item })}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        active
                          ? "border-fuchsia-300/35 bg-fuchsia-300/14 text-fuchsia-100"
                          : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {auditScopeFilterLabel(item, displayLocale)}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
              <p className="text-sm font-medium text-white">{t(displayLocale, "回调视图", "回調視圖", "Callback view")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {callbackViewOptions.map((item) => {
                  const active = item === callbackView;
                  return (
                    <Link
                      key={item}
                      href={buildWorkspaceHref(workspacePath, resolvedSearchParams, { callbackView: item === "all" ? "" : item })}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        active
                          ? "border-cyan-300/35 bg-cyan-300/14 text-cyan-100"
                          : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {callbackViewLabel(item, displayLocale)}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
              <p className="text-sm font-medium text-white">{t(displayLocale, "活动时间", "活動時間", "Activity window")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {activityWindowOptions.map((item) => {
                  const active = item === activityWindow;
                  return (
                    <Link
                      key={item}
                      href={buildWorkspaceHref(workspacePath, resolvedSearchParams, {
                        activityWindow: item === "all" ? "" : item,
                      })}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        active
                          ? "border-lime-300/35 bg-lime-300/14 text-lime-100"
                          : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {activityWindowLabel(item, displayLocale)}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-label">{t(displayLocale, "异常摘要", "異常摘要", "Operational highlights")}</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{t(displayLocale, "优先处理事项", "優先處理事項", "Priority items")}</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {anomalySummaryCards.map((item) => (
                <Link key={item.id} href={item.href} className={`rounded-[1.1rem] border px-4 py-4 transition hover:translate-y-[-1px] ${item.tone}`}>
                  <p className="text-xs uppercase tracking-[0.18em] opacity-75">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                  <p className="mt-2 text-sm opacity-85">{item.description}</p>
                </Link>
              ))}
            </div>
            <div className="mt-4 rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{t(displayLocale, "当前预警", "目前預警", "Current alerts")}</p>
                <span className="text-xs text-slate-500">{formatNumber(anomalyHighlights.length, intlLocale)}</span>
              </div>
              <div className="mt-3 grid gap-2">
                {anomalyHighlights.length > 0 ? (
                  anomalyHighlights.map((item) => (
                    <div key={item.id} className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-slate-200">
                      <Link
                        href={item.href}
                        className="flex items-start gap-3 transition hover:text-white"
                      >
                        <span className={`mt-1 size-2 rounded-full ${getSummaryDotTone(item.tone)}`} />
                        <span className="flex-1">
                          <span className="font-medium text-white">{item.title}</span>
                          <span className="mt-1 block text-slate-400">{item.detail}</span>
                        </span>
                      </Link>
                      {item.adminHref ? (
                        <div className="mt-3 pl-5">
                          <Link
                            href={item.adminHref}
                            className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
                          >
                            {t(displayLocale, "前往后台联动处理", "前往後台聯動處理", "Open linked admin view")}
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">
                    {t(
                      displayLocale,
                      "当前筛选窗口内没有明显异常，适合继续核对会员、订单和内容权益的一致性。",
                      "目前篩選視窗內沒有明顯異常，適合繼續核對會員、訂單與內容權益的一致性。",
                      "No major alerts in the current window. This is a good time to verify membership, order, and entitlement consistency.",
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-label">{t(displayLocale, "快速跳转", "快速跳轉", "Quick jump")}</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{t(displayLocale, "页面锚点", "頁面錨點", "Section anchors")}</h2>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {jumpLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
          <div className="grid gap-6">
            <div id="profile" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="section-label">{t(displayLocale, "基础资料", "基礎資料", "Profile")}</p>
                <span className="text-sm text-slate-500">{t(displayLocale, "当前有效权限", "當前有效權限", "Effective permissions")}</span>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                <p>{t(displayLocale, "角色", "角色", "Role")}: {workspace.summary.role}</p>
                <p>{t(displayLocale, "注册时间", "註冊時間", "Registered")}: {formatDateTime(workspace.summary.createdAt, intlLocale)}</p>
                <p>{t(displayLocale, "归因时间", "歸因時間", "Referred at")}: {formatDateTime(workspace.summary.referredAt, intlLocale)}</p>
                <p>{t(displayLocale, "邮箱验证", "信箱驗證", "Email verification")}: {workspace.summary.emailVerifiedAt ? formatDateTime(workspace.summary.emailVerifiedAt, intlLocale) : "--"}</p>
                <p>{t(displayLocale, "待更新邮箱", "待更新信箱", "Pending email")}: {workspace.summary.pendingEmail ?? "--"}</p>
                <p>{t(displayLocale, "联系渠道", "聯絡渠道", "Contact method")}: {workspace.summary.contactMethod ?? "--"}</p>
                <p>{t(displayLocale, "联系信息", "聯絡資訊", "Contact value")}: {workspace.summary.contactValue ?? "--"}</p>
                <p>{t(displayLocale, "偏好语言", "偏好語言", "Preferred locale")}: {workspace.summary.preferredLocale ?? "--"}</p>
                <p>{t(displayLocale, "国家/地区", "國家 / 地區", "Country / region")}: {workspace.summary.countryCode ?? "--"}</p>
                <p>{t(displayLocale, "会员方案", "會員方案", "Membership plan")}: {workspace.summary.membershipPlanName ?? "--"}</p>
                <p>{t(displayLocale, "会员到期", "會員到期", "Membership expiry")}: {formatDateTime(workspace.summary.membershipExpiresAt, intlLocale)}</p>
                <p>{t(displayLocale, "钱包最近活动", "錢包最近活動", "Wallet last activity")}: {formatDateTime(workspace.summary.coinLastActivityAt, intlLocale)}</p>
                <p>{t(displayLocale, "代理归因", "代理歸因", "Agent attribution")}: {workspace.summary.referredByAgentName ?? "--"}</p>
                <p>{t(displayLocale, "邀请码", "邀請碼", "Invite code")}: {workspace.summary.referredByAgentCode ?? "--"}</p>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {permissionSummary.map((item) => (
                  <div key={item.label} className={`rounded-[1.1rem] border px-4 py-4 ${item.tone}`}>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-75">{item.label}</p>
                    <p className="mt-2 text-lg font-semibold">{item.value}</p>
                    <p className="mt-2 text-sm opacity-80">{item.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {workspace.permissions.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div id="admin-links" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-label">{t(displayLocale, "后台联动", "後台聯動", "Admin links")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Cross-console shortcuts</h3>
                </div>
                <span className="text-sm text-slate-500">{formatNumber(adminDeepLinks.length, intlLocale)}</span>
              </div>
              <div className="mt-5 grid gap-3">
                {adminDeepLinks.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4 transition hover:border-white/15 hover:bg-slate-950/50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-white">{item.title}</p>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                        {item.badge}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{item.description}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div id="report-snapshot" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-label">{t(displayLocale, "报表快照", "報表快照", "Report snapshot")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">User commercial snapshot</h3>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={buildAdminReportsHref("30")}
                    className="text-xs text-slate-400 transition hover:text-white"
                  >
                    {t(displayLocale, "打开报表后台", "打開報表後台", "Open reports")}
                  </Link>
                  <span className="text-sm text-slate-500">
                    {t(displayLocale, "最近支付", "最近支付", "Last paid")} {formatDateTime(workspace.reportSummary.lastPaidAt, intlLocale)}
                  </span>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: t(displayLocale, "会员付费", "會員付費", "Membership revenue"),
                    value: formatCurrency(workspace.reportSummary.paidMembershipAmount, intlLocale),
                    meta: `${t(displayLocale, "订单", "訂單", "Orders")} ${formatNumber(workspace.reportSummary.paidMembershipCount, intlLocale)}`,
                    tone: "border-lime-300/20 bg-lime-300/10 text-lime-100",
                  },
                  {
                    label: t(displayLocale, "内容解锁", "內容解鎖", "Content revenue"),
                    value: formatCurrency(workspace.reportSummary.paidContentAmount, intlLocale),
                    meta: `${t(displayLocale, "订单", "訂單", "Orders")} ${formatNumber(workspace.reportSummary.paidContentCount, intlLocale)}`,
                    tone: "border-sky-300/20 bg-sky-400/10 text-sky-100",
                  },
                  {
                    label: t(displayLocale, "充值金额", "充值金額", "Recharge revenue"),
                    value: formatCurrency(workspace.reportSummary.paidRechargeAmount, intlLocale),
                    meta: `${t(displayLocale, "成功单", "成功單", "Paid orders")} ${formatNumber(workspace.reportSummary.paidRechargeCount, intlLocale)}`,
                    tone: "border-orange-300/20 bg-orange-300/10 text-orange-100",
                  },
                  {
                    label: t(displayLocale, "退款金额", "退款金額", "Refunded amount"),
                    value: formatCurrency(workspace.reportSummary.refundedAmount, intlLocale),
                    meta: `${t(displayLocale, "退款单", "退款單", "Refunded orders")} ${formatNumber(workspace.reportSummary.refundedCount, intlLocale)}`,
                    tone: "border-amber-300/20 bg-amber-300/10 text-amber-100",
                  },
                ].map((item) => (
                  <div key={item.label} className={`rounded-[1.1rem] border px-4 py-4 ${item.tone}`}>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-75">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                    <p className="mt-2 text-sm opacity-80">{item.meta}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  {
                    label: t(displayLocale, "近 30 天支付", "近 30 天支付", "Paid in last 30d"),
                    value: formatCurrency(workspace.reportSummary.recent30dPaidAmount, intlLocale),
                    meta: `${t(displayLocale, "订单", "訂單", "Orders")} ${formatNumber(workspace.reportSummary.recent30dPaidCount, intlLocale)}`,
                  },
                  {
                    label: t(displayLocale, "近 30 天充值", "近 30 天充值", "Recharge in last 30d"),
                    value: formatCurrency(workspace.reportSummary.recent30dRechargeAmount, intlLocale),
                    meta: t(displayLocale, "用于观察近期开单与充值强度。", "用於觀察近期期單與充值強度。", "Tracks recent recharge intensity."),
                  },
                  {
                    label: t(displayLocale, "近 30 天退款", "近 30 天退款", "Refunded in last 30d"),
                    value: formatCurrency(workspace.reportSummary.recent30dRefundAmount, intlLocale),
                    meta: t(displayLocale, "用于判断近期退款和回滚压力。", "用於判斷近期退款與回滾壓力。", "Tracks recent refund pressure."),
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.05rem] border border-white/8 bg-slate-950/35 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.meta}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <TrendMiniCard
                  title={t(displayLocale, "支付趋势", "支付趨勢", "Paid trend")}
                  value={formatCurrency(workspace.reportSummary.recent30dPaidAmount, intlLocale)}
                  description={t(displayLocale, "会员、内容与充值成功金额合并观察。", "會員、內容與充值成功金額合併觀察。", "Combined paid revenue from membership, content, and recharge.")}
                  points={workspace.reportTrends.paidAmountPoints}
                  toneClass="border-lime-300/20 bg-lime-300/10 text-lime-100"
                  locale={displayLocale}
                  intlLocale={intlLocale}
                />
                <TrendMiniCard
                  title={t(displayLocale, "充值趋势", "充值趨勢", "Recharge trend")}
                  value={formatCurrency(workspace.reportSummary.recent30dRechargeAmount, intlLocale)}
                  description={t(displayLocale, "用于判断近 30 天充值活跃度与峰值日。", "用於判斷近 30 天充值活躍度與峰值日。", "Tracks recharge activity and peak days across the last 30 days.")}
                  points={workspace.reportTrends.rechargeAmountPoints}
                  toneClass="border-orange-300/20 bg-orange-300/10 text-orange-100"
                  locale={displayLocale}
                  intlLocale={intlLocale}
                />
                <TrendMiniCard
                  title={t(displayLocale, "退款趋势", "退款趨勢", "Refund trend")}
                  value={formatCurrency(workspace.reportSummary.recent30dRefundAmount, intlLocale)}
                  description={t(displayLocale, "用于识别近期退款和回滚压力变化。", "用於識別近期退款和回滾壓力變化。", "Highlights recent refund and rollback pressure.")}
                  points={workspace.reportTrends.refundAmountPoints}
                  toneClass="border-amber-300/20 bg-amber-300/10 text-amber-100"
                  locale={displayLocale}
                  intlLocale={intlLocale}
                />
              </div>
            </div>

            <div id="coin-account-summary" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-label">{t(displayLocale, "钱包摘要", "錢包摘要", "Wallet summary")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Coin wallet summary</h3>
                </div>
                <span className="text-sm text-slate-500">
                  {t(displayLocale, "最近活动", "最近活動", "Last activity")} {formatDateTime(workspace.summary.coinLastActivityAt, intlLocale)}
                </span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: t(displayLocale, "当前余额", "目前餘額", "Current balance"),
                    value: formatNumber(workspace.summary.coinBalance, intlLocale),
                    tone: "border-orange-300/20 bg-orange-300/10 text-orange-100",
                  },
                  {
                    label: t(displayLocale, "累计入账", "累計入賬", "Lifetime credited"),
                    value: formatNumber(workspace.summary.coinLifetimeCredited, intlLocale),
                    tone: "border-lime-300/20 bg-lime-300/10 text-lime-100",
                  },
                  {
                    label: t(displayLocale, "累计消耗", "累計消耗", "Lifetime debited"),
                    value: formatNumber(workspace.summary.coinLifetimeDebited, intlLocale),
                    tone: "border-amber-300/20 bg-amber-300/10 text-amber-100",
                  },
                  {
                    label: t(displayLocale, "净流入", "淨流入", "Net flow"),
                    value: formatNumber(
                      workspace.summary.coinLifetimeCredited - workspace.summary.coinLifetimeDebited,
                      intlLocale,
                    ),
                    tone: "border-sky-300/20 bg-sky-400/10 text-sky-100",
                  },
                ].map((item) => (
                  <div key={item.label} className={`rounded-[1.1rem] border px-4 py-4 ${item.tone}`}>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-75">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {t(displayLocale, "近 30 天走势", "近 30 天走勢", "30-day trends")}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      {t(
                        displayLocale,
                        "按日观察支付、充值与退款波动，方便定位异常冲高、回落和退款压力。",
                        "按日觀察支付、充值與退款波動，方便定位異常衝高、回落與退款壓力。",
                        "Daily paid, recharge, and refund movement for quick anomaly spotting.",
                      )}
                    </p>
                  </div>
                  <Link
                    href={buildAdminReportsHref("30")}
                    className="text-xs text-slate-400 transition hover:text-white"
                  >
                    {t(displayLocale, "查看完整趋势", "查看完整趨勢", "Open full trends")}
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 xl:grid-cols-3">
                  <TrendMiniCard
                    locale={displayLocale}
                    intlLocale={intlLocale}
                    title={t(displayLocale, "支付走势", "支付走勢", "Paid trend")}
                    value={formatCurrency(workspace.reportSummary.recent30dPaidAmount, intlLocale)}
                    description={t(
                      displayLocale,
                      `近 30 天订单 ${formatNumber(workspace.reportSummary.recent30dPaidCount, intlLocale)}`,
                      `近 30 天訂單 ${formatNumber(workspace.reportSummary.recent30dPaidCount, intlLocale)}`,
                      `Orders in 30d ${formatNumber(workspace.reportSummary.recent30dPaidCount, intlLocale)}`,
                    )}
                    points={workspace.reportTrends.paidAmountPoints}
                    toneClass="border-lime-300/20 bg-lime-300/10 text-lime-100"
                  />
                  <TrendMiniCard
                    locale={displayLocale}
                    intlLocale={intlLocale}
                    title={t(displayLocale, "充值走势", "充值走勢", "Recharge trend")}
                    value={formatCurrency(workspace.reportSummary.recent30dRechargeAmount, intlLocale)}
                    description={t(
                      displayLocale,
                      "观察充值热度与渠道活跃度。",
                      "觀察充值熱度與渠道活躍度。",
                      "Shows recharge intensity and channel activity.",
                    )}
                    points={workspace.reportTrends.rechargeAmountPoints}
                    toneClass="border-orange-300/20 bg-orange-300/10 text-orange-100"
                  />
                  <TrendMiniCard
                    locale={displayLocale}
                    intlLocale={intlLocale}
                    title={t(displayLocale, "退款走势", "退款走勢", "Refund trend")}
                    value={formatCurrency(workspace.reportSummary.recent30dRefundAmount, intlLocale)}
                    description={t(
                      displayLocale,
                      `累计退款单 ${formatNumber(workspace.reportSummary.refundedCount, intlLocale)}`,
                      `累計退款單 ${formatNumber(workspace.reportSummary.refundedCount, intlLocale)}`,
                      `Refunded orders ${formatNumber(workspace.reportSummary.refundedCount, intlLocale)}`,
                    )}
                    points={workspace.reportTrends.refundAmountPoints}
                    toneClass="border-amber-300/20 bg-amber-300/10 text-amber-100"
                  />
                </div>
              </div>
            </div>

            <div id="agent-finance" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-label">{t(displayLocale, "代理财务", "代理財務", "Agent finance")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Agent attribution finance</h3>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={buildAdminAgentsHref()}
                    className="text-xs text-slate-400 transition hover:text-white"
                  >
                    {t(displayLocale, "打开代理后台", "打開代理後台", "Open agents")}
                  </Link>
                  <span className="text-sm text-slate-500">
                    {t(displayLocale, "最近归因", "最近歸因", "Last attribution")} {formatDateTime(workspace.agentFinance.lastAttributedAt, intlLocale)}
                  </span>
                </div>
              </div>
              {(workspace.agentFinance.attributedLedgerCount > 0 ||
                (workspace.agentFinance.ownTotalCommission ?? 0) > 0 ||
                workspace.agentFinance.ownPendingWithdrawalAmount > 0 ||
                workspace.agentFinance.ownSettledWithdrawalAmount > 0) ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {[
                  {
                    label: t(displayLocale, "直推佣金贡献", "直推佣金貢獻", "Direct commission"),
                    value: formatCurrency(workspace.agentFinance.attributedDirectCommissionNet, intlLocale),
                    meta: `${t(displayLocale, "账本", "賬本", "Ledgers")} ${formatNumber(workspace.agentFinance.attributedLedgerCount, intlLocale)}`,
                    tone: "border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100",
                  },
                  {
                    label: t(displayLocale, "下级分佣贡献", "下級分佣貢獻", "Downstream commission"),
                    value: formatCurrency(workspace.agentFinance.attributedDownstreamCommissionNet, intlLocale),
                    meta: `${t(displayLocale, "充值额", "充值額", "Recharge")} ${formatCurrency(workspace.agentFinance.attributedRechargeAmount, intlLocale)}`,
                    tone: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
                  },
                  {
                    label: t(displayLocale, "自身代理总佣金", "自身代理總佣金", "Own total commission"),
                    value: formatCurrency(workspace.agentFinance.ownTotalCommission ?? 0, intlLocale),
                    meta: `${t(displayLocale, "状态", "狀態", "Status")} ${agentProfileStatusLabel(workspace.agentFinance.ownAgentStatus, displayLocale)}`,
                    tone: "border-lime-300/20 bg-lime-300/10 text-lime-100",
                  },
                  {
                    label: t(displayLocale, "待结算 / 已提现", "待結算 / 已提現", "Unsettled / settled"),
                    value: `${formatCurrency(workspace.agentFinance.ownUnsettledCommission ?? 0, intlLocale)} / ${formatCurrency(workspace.agentFinance.ownSettledWithdrawalAmount, intlLocale)}`,
                    meta: `${t(displayLocale, "待打款", "待打款", "Pending payout")} ${formatCurrency(workspace.agentFinance.ownPendingWithdrawalAmount, intlLocale)}`,
                    tone: "border-amber-300/20 bg-amber-300/10 text-amber-100",
                  },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-[1.1rem] border px-4 py-4 ${item.tone}`}>
                      <p className="text-xs uppercase tracking-[0.18em] opacity-75">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                      <p className="mt-2 text-sm opacity-80">{item.meta}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[1.1rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-400">
                  {t(
                    displayLocale,
                    "当前用户还没有形成可观测的代理佣金或提现数据，可继续从代理关系和充值行为切入排查。",
                    "目前用戶還沒有形成可觀測的代理佣金或提現資料，可繼續從代理關係與充值行為切入排查。",
                    "No material agent commission or withdrawal data is attached to this user yet.",
                  )}
                </div>
              )}
            </div>

            <div id="agent-commission-ledgers" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-label">{t(displayLocale, "佣金明细", "佣金明細", "Commission detail")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Recent attributed commission ledgers</h3>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={buildAdminAgentsHref()} className="text-xs text-slate-400 transition hover:text-white">
                    {t(displayLocale, "打开代理后台", "打開代理後台", "Open agents")}
                  </Link>
                  <span className="text-sm text-slate-500">
                    {filteredAgentCommissionLedgers.length} / {workspace.agentCommissionLedgers.length}
                  </span>
                </div>
              </div>
              <SectionLimitControls
                pathname={workspacePath}
                searchParams={resolvedSearchParams}
                paramName="agentCommissionLimit"
                currentLimit={agentCommissionLimit}
                total={filteredAgentCommissionLedgers.length}
                locale={displayLocale}
              />
              <div className="mt-5 grid gap-3">
                {visibleAgentCommissionLedgers.map((item) => (
                  <div key={item.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{item.agentName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {agentCommissionKindLabel(item.kind, displayLocale)} · {t(displayLocale, "充值单", "充值單", "Recharge")} {item.rechargeOrderNo}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs ${agentCommissionStatusTone(item.status)}`}>
                        {agentCommissionStatusLabel(item.status, displayLocale)}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm text-slate-300">
                      <span>{t(displayLocale, "充值额", "充值額", "Recharge")} {formatCurrency(item.rechargeAmount, intlLocale)}</span>
                      <span>{t(displayLocale, "佣金率", "佣金率", "Rate")} {(item.commissionRate * 100).toFixed(2)}%</span>
                      <span>{t(displayLocale, "佣金额", "佣金額", "Commission")} {formatCurrency(item.commissionAmount, intlLocale)}</span>
                      <span>{t(displayLocale, "可用金额", "可用金額", "Available")} {formatCurrency(item.availableAmount, intlLocale)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
                      <span>{t(displayLocale, "创建", "建立", "Created")} {formatDateTime(item.createdAt, intlLocale)}</span>
                      {item.settledAt ? <span>{t(displayLocale, "结算", "結算", "Settled")} {formatDateTime(item.settledAt, intlLocale)}</span> : null}
                      {item.reversedAt ? <span>{t(displayLocale, "冲回", "沖回", "Reversed")} {formatDateTime(item.reversedAt, intlLocale)}</span> : null}
                    </div>
                  </div>
                ))}
                {filteredAgentCommissionLedgers.length === 0 ? (
                  <div className="rounded-[1.1rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-400">
                    {t(
                      displayLocale,
                      "当前筛选窗口内还没有归因佣金明细，可继续观察充值与代理关系是否形成分佣。",
                      "目前篩選視窗內還沒有歸因佣金明細，可繼續觀察充值與代理關係是否形成分佣。",
                      "No attributed commission ledgers for the current filter yet.",
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div id="membership-actions" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <form action="/api/admin/users" method="post" className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                  <p className="section-label">{t(displayLocale, "会员操作", "會員操作", "Membership actions")}</p>
                  <input type="hidden" name="intent" value="extend-membership" />
                  <input type="hidden" name="userId" value={workspace.summary.id} />
                  <input type="hidden" name="returnTo" value={membershipActionReturnTo} />
                  <div className="mt-4 grid gap-3">
                    <select name="planId" defaultValue={workspace.summary.membershipPlanId ?? membershipPlans[0]?.id ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none">
                      {membershipPlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                    <input name="durationDays" type="number" min="1" defaultValue="30" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" placeholder={t(displayLocale, "延长天数", "延長天數", "Duration in days")} />
                    <textarea name="note" rows={3} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" placeholder={t(displayLocale, "操作备注", "操作備註", "Operation note")} />
                    <button type="submit" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
                      {t(displayLocale, "延长 / 开通会员", "延長 / 開通會員", "Extend / activate membership")}
                    </button>
                  </div>
                </form>

                <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                  <p className="section-label">{t(displayLocale, "快捷动作", "快捷動作", "Quick actions")}</p>
                  <div className="mt-4 grid gap-3">
                    <form action="/api/admin/users" method="post" className="grid gap-3">
                      <input type="hidden" name="intent" value="disable-membership" />
                      <input type="hidden" name="userId" value={workspace.summary.id} />
                      <input type="hidden" name="returnTo" value={membershipActionReturnTo} />
                      <textarea name="note" rows={2} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" placeholder={t(displayLocale, "关闭会员备注", "關閉會員備註", "Disable note")} />
                      <button type="submit" className="rounded-full border border-rose-300/25 bg-rose-400/10 px-4 py-2 text-sm text-rose-100 transition hover:border-rose-300/45 hover:bg-rose-400/20">
                        {t(displayLocale, "关闭会员", "關閉會員", "Disable membership")}
                      </button>
                    </form>
                    <form action="/api/admin/users" method="post" className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <input type="hidden" name="intent" value="credit-coins" />
                      <input type="hidden" name="userId" value={workspace.summary.id} />
                      <input type="hidden" name="returnTo" value={membershipActionReturnTo} />
                      <input name="amount" type="number" min="1" defaultValue="100" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                      <input name="note" type="text" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" placeholder={t(displayLocale, "加币备注", "加幣備註", "Credit note")} />
                      <button type="submit" className="rounded-full border border-lime-300/25 bg-lime-300/10 px-4 py-2 text-sm text-lime-100 transition hover:border-lime-300/45 hover:bg-lime-300/20">
                        {t(displayLocale, "加球币", "加球幣", "Credit coins")}
                      </button>
                    </form>
                    <form action="/api/admin/users" method="post" className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <input type="hidden" name="intent" value="debit-coins" />
                      <input type="hidden" name="userId" value={workspace.summary.id} />
                      <input type="hidden" name="returnTo" value={membershipActionReturnTo} />
                      <input name="amount" type="number" min="1" defaultValue="100" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                      <input name="note" type="text" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" placeholder={t(displayLocale, "扣币备注", "扣幣備註", "Debit note")} />
                      <button type="submit" className="rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-sm text-amber-100 transition hover:border-amber-300/45 hover:bg-amber-300/20">
                        {t(displayLocale, "扣球币", "扣球幣", "Debit coins")}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                  <p className="section-label">{t(displayLocale, "当前状态", "目前狀態", "Current state")}</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {[
                      {
                        label: t(displayLocale, "会员状态", "會員狀態", "Membership"),
                        value:
                          workspace.summary.membershipStatus === "active"
                            ? t(displayLocale, "有效", "有效", "Active")
                            : t(displayLocale, "未开通", "未開通", "Inactive"),
                        meta: workspace.summary.membershipPlanName ?? t(displayLocale, "暂无方案", "暫無方案", "No active plan"),
                      },
                      {
                        label: t(displayLocale, "会员到期", "會員到期", "Membership expiry"),
                        value: formatDateTime(workspace.summary.membershipExpiresAt, intlLocale),
                        meta:
                          latestMembershipEvent?.createdAt
                            ? `${t(displayLocale, "最近变更", "最近變更", "Latest event")} ${formatDateTime(latestMembershipEvent.createdAt, intlLocale)}`
                            : t(displayLocale, "暂无会员变更记录", "暫無會員變更記錄", "No membership events yet"),
                      },
                      {
                        label: t(displayLocale, "球币余额", "球幣餘額", "Coin balance"),
                        value: formatNumber(workspace.summary.coinBalance, intlLocale),
                        meta:
                          latestCoinLedger?.createdAt
                            ? `${t(displayLocale, "最近流水", "最近流水", "Latest ledger")} ${formatDateTime(latestCoinLedger.createdAt, intlLocale)}`
                            : t(displayLocale, "暂无球币流水", "暫無球幣流水", "No wallet ledger yet"),
                      },
                      {
                        label: t(displayLocale, "当前权限", "目前權限", "Permissions"),
                        value: formatNumber(workspace.permissions.length, intlLocale),
                        meta: t(
                          displayLocale,
                          "会员、内容、钱包与后台能力的即时摘要。",
                          "會員、內容、錢包與後台能力的即時摘要。",
                          "Live snapshot across membership, content, wallet, and admin access.",
                        ),
                      },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                        <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                        <p className="mt-2 text-sm text-slate-400">{item.meta}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="section-label">{t(displayLocale, "最近手工动作", "最近手工動作", "Recent manual actions")}</p>
                      <h4 className="mt-2 text-lg font-semibold text-white">{t(displayLocale, "动作回写快照", "動作回寫快照", "Operation receipts")}</h4>
                    </div>
                    <Link href="#admin-audit" className="text-xs text-slate-400 transition hover:text-white">
                      {t(displayLocale, "打开完整审计", "打開完整審計", "Open full audit")}
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {recentManualInterventionLogs.length > 0 ? (
                      recentManualInterventionLogs.map((item) => {
                        const parsedDetail = parseAuditDetail(item.detail);

                        return (
                          <div key={item.id} className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-white">{adminAuditActionLabel(item.action, displayLocale)}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {item.actorDisplayName} · {getAuditScopeLabel(item.scope, displayLocale)}
                                </p>
                              </div>
                              <span className={`rounded-full border px-3 py-1 text-xs ${adminAuditStatusTone(item.status)}`}>
                                {item.status === "failed"
                                  ? t(displayLocale, "失败", "失敗", "Failed")
                                  : t(displayLocale, "成功", "成功", "Success")}
                              </span>
                            </div>
                            {parsedDetail.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {parsedDetail.slice(0, 3).map((detail) => (
                                  <span key={`${item.id}-${detail.key}`} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                                    {getAuditDetailKeyLabel(detail.key, displayLocale)}: {detail.value}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            <p className="mt-3 text-xs text-slate-500">{formatDateTime(item.createdAt, intlLocale)}</p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-[1rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-400">
                        {t(
                          displayLocale,
                          "当前筛选窗口内还没有手工动作回写记录，后续执行会员或球币操作后会在这里优先显示。",
                          "目前篩選視窗內還沒有手工動作回寫記錄，後續執行會員或球幣操作後會在這裡優先顯示。",
                          "Manual action receipts will appear here after membership or coin operations run.",
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div id="membership-timeline" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{t(displayLocale, "会员变更记录", "會員變更記錄", "Membership timeline")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Membership timeline</h3>
                </div>
                <div className="flex items-center gap-2">
                  {membershipEventWarningCount > 0 ? (
                    <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
                      {t(displayLocale, "异常", "異常", "Warnings")} {formatNumber(membershipEventWarningCount, intlLocale)}
                    </span>
                  ) : null}
                  <span className="text-sm text-slate-500">{filteredMembershipEvents.length} / {workspace.membershipEvents.length}</span>
                </div>
              </div>
              <SectionLimitControls
                pathname={workspacePath}
                searchParams={resolvedSearchParams}
                paramName="membershipEventLimit"
                currentLimit={membershipEventLimit}
                total={filteredMembershipEvents.length}
                locale={displayLocale}
              />
              <div className="mt-5 grid gap-3">
                {visibleMembershipEvents.map((item) => (
                  <div key={item.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-white">{actionLabel(item.action, displayLocale)}</p>
                      <span className="text-xs text-slate-500">{formatDateTime(item.createdAt, intlLocale)}</span>
                    </div>
                    {(membershipEventWarningsById.get(item.id)?.length ?? 0) > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(membershipEventWarningsById.get(item.id) ?? []).map((warning) => (
                          <span key={`${item.id}-${warning.label}`} className={`rounded-full border px-3 py-1 text-xs ${getWarningChipTone(warning.tone)}`}>
                            {warning.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
                      <span>{t(displayLocale, "方案", "方案", "Plan")}: {item.planName ?? "--"}</span>
                      <span>{t(displayLocale, "前到期", "前到期", "Previous expiry")}: {formatDateTime(item.previousExpiresAt, intlLocale)}</span>
                      <span>{t(displayLocale, "后到期", "後到期", "Next expiry")}: {formatDateTime(item.nextExpiresAt, intlLocale)}</span>
                    </div>
                    {item.note ? <p className="mt-2 text-sm text-slate-400">{item.note}</p> : null}
                  </div>
                ))}
                {filteredMembershipEvents.length === 0 ? <p className="text-sm text-slate-500">{t(displayLocale, "当前筛选下暂无会员变更记录。", "目前篩選下暫無會員變更記錄。", "No membership history for the current filter.")}</p> : null}
              </div>
            </div>

            <div id="coin-ledger" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{t(displayLocale, "球币流水", "球幣流水", "Coin ledger")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Coin ledger</h3>
                </div>
                <div className="flex items-center gap-2">
                  {ledgerWarningCount > 0 ? (
                    <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
                      {t(displayLocale, "异常", "異常", "Warnings")} {formatNumber(ledgerWarningCount, intlLocale)}
                    </span>
                  ) : null}
                  <span className="text-sm text-slate-500">{filteredLedgers.length} / {workspace.ledgers.length}</span>
                </div>
              </div>
              <SectionLimitControls
                pathname={workspacePath}
                searchParams={resolvedSearchParams}
                paramName="ledgerLimit"
                currentLimit={ledgerLimit}
                total={filteredLedgers.length}
                locale={displayLocale}
              />
              <div className="mt-5 grid gap-3">
                {visibleLedgers.map((item) => (
                  <div key={item.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-white">{item.reason}</p>
                      <span className={`rounded-full px-3 py-1 text-xs ${item.direction === "credit" ? "bg-lime-300/12 text-lime-100" : "bg-amber-300/12 text-amber-100"}`}>
                        {item.direction === "credit" ? "+" : "-"}
                        {formatNumber(item.amount, intlLocale)}
                      </span>
                    </div>
                    {(ledgerWarningsById.get(item.id)?.length ?? 0) > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(ledgerWarningsById.get(item.id) ?? []).map((warning) => (
                          <span key={`${item.id}-${warning.label}`} className={`rounded-full border px-3 py-1 text-xs ${getWarningChipTone(warning.tone)}`}>
                            {warning.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
                      <span>{t(displayLocale, "余额变化", "餘額變化", "Balance flow")}: {formatNumber(item.balanceBefore, intlLocale)} → {formatNumber(item.balanceAfter, intlLocale)}</span>
                      <span>{formatDateTime(item.createdAt, intlLocale)}</span>
                      {item.referenceType ? <span>{item.referenceType}</span> : null}
                    </div>
                    {item.note ? <p className="mt-2 text-sm text-slate-400">{item.note}</p> : null}
                  </div>
                ))}
                {filteredLedgers.length === 0 ? <p className="text-sm text-slate-500">{t(displayLocale, "当前筛选下暂无球币流水。", "目前篩選下暫無球幣流水。", "No coin ledger records for the current filter.")}</p> : null}
              </div>
            </div>

            <div id="purchased-content" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{t(displayLocale, "已购内容", "已購內容", "Purchased content")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Purchased content</h3>
                </div>
                <span className="text-sm text-slate-500">{paidContentOrders.length}</span>
              </div>
              <SectionLimitControls
                pathname={workspacePath}
                searchParams={resolvedSearchParams}
                paramName="purchasedContentLimit"
                currentLimit={purchasedContentLimit}
                total={paidContentOrders.length}
                locale={displayLocale}
              />
              <div className="mt-5 grid gap-3">
                {visiblePaidContentOrders.map((item) => (
                  <div key={item.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-white">{item.contentTitle}</p>
                      <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs text-lime-100">
                        {formatCurrency(item.amount, intlLocale)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
                      <span>{formatDateTime(item.paidAt ?? item.createdAt, intlLocale)}</span>
                      {item.paymentReference ? <span>{t(displayLocale, "支付流水", "支付流水", "Payment reference")} {item.paymentReference}</span> : null}
                    </div>
                  </div>
                ))}
                {paidContentOrders.length === 0 ? <p className="text-sm text-slate-500">{t(displayLocale, "暂无已支付内容单。", "暫無已支付內容單。", "No paid content orders yet.")}</p> : null}
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div id="agent-attribution" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="section-label">{t(displayLocale, "代理关系", "代理關係", "Agent attribution")}</p>
                <Link
                  href={buildAdminAgentsHref()}
                  className="text-xs text-slate-400 transition hover:text-white"
                >
                  {t(displayLocale, "打开代理后台", "打開代理後台", "Open agents")}
                </Link>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <p>{t(displayLocale, "上级代理", "上級代理", "Parent agent")}: {workspace.agentSummary.referredByAgentName ?? "--"}</p>
                <p>{t(displayLocale, "归因邀请码", "歸因邀請碼", "Attribution code")}: {workspace.agentSummary.referredByAgentCode ?? "--"}</p>
                <p>{t(displayLocale, "自身代理身份", "自身代理身份", "Own agent profile")}: {workspace.agentSummary.ownAgentName ?? "--"}</p>
                <p>{t(displayLocale, "自身邀请码", "自身邀請碼", "Own invite code")}: {workspace.agentSummary.ownAgentCode ?? "--"}</p>
                <p>{t(displayLocale, "直推用户数", "直推用戶數", "Direct users")}: {formatNumber(workspace.agentSummary.referredUsersCount, intlLocale)}</p>
                <p>{t(displayLocale, "下级代理数", "下級代理數", "Child agents")}: {formatNumber(workspace.agentSummary.childAgentsCount, intlLocale)}</p>
              </div>
            </div>

            <div id="order-action-queue" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{t(displayLocale, "异常订单与待处理队列", "異常訂單與待處理隊列", "Order action queue")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Order action queue</h3>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={buildAdminFinanceHref({
                      financeIssueQueue: "active",
                      financeIssueQuery: workspace.summary.id,
                    })}
                    className="text-xs text-slate-400 transition hover:text-white"
                  >
                    {t(displayLocale, "打开财务后台", "打開財務後台", "Open finance")}
                  </Link>
                  <span className="text-sm text-slate-500">{filteredQueueOrders.length} / {filteredUnifiedOrders.length}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {queueStatusOptions.map((item) => {
                  const active = item === queueStatus;
                  return (
                    <Link
                      key={`queue-section-${item}`}
                      href={buildWorkspaceHref(workspacePath, resolvedSearchParams, { queueStatus: item === "all" ? "" : item })}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        active
                          ? "border-amber-300/35 bg-amber-300/14 text-amber-100"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {queueStatusFilterLabel(item, displayLocale)}
                    </Link>
                  );
                })}
              </div>
              <SectionLimitControls
                pathname={workspacePath}
                searchParams={resolvedSearchParams}
                paramName="actionQueueLimit"
                currentLimit={actionQueueLimit}
                total={filteredQueueOrders.length}
                locale={displayLocale}
              />
              <div className="mt-5 grid gap-3">
                {visibleActionQueue.map((item) => (
                  <div key={`${item.kind}-${item.id}`} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{orderKindLabel(item.kind, displayLocale)}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs ${orderStatusTone(item.status)}`}>{orderStatusLabel(item.status, displayLocale)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
                      <span>{t(displayLocale, "金额", "金額", "Amount")}: {formatCurrency(item.amount, intlLocale)}</span>
                      <span>{t(displayLocale, "创建于", "建立於", "Created")}: {formatDateTime(item.createdAt, intlLocale)}</span>
                      {item.paymentReference ? <span>{t(displayLocale, "支付流水", "支付流水", "Payment reference")} {item.paymentReference}</span> : null}
                    </div>
                    {item.failureReason ? <p className="mt-2 text-xs text-rose-200">{t(displayLocale, "失败原因", "失敗原因", "Failure reason")}: {item.failureReason}</p> : null}
                    {item.refundReason ? <p className="mt-2 text-xs text-amber-200">{t(displayLocale, "退款原因", "退款原因", "Refund reason")}: {item.refundReason}</p> : null}
                  </div>
                ))}
                {filteredQueueOrders.length === 0 ? <p className="text-sm text-slate-500">{t(displayLocale, "当前筛选下没有待处理的订单异常。", "目前篩選下沒有待處理的訂單異常。", "No order exceptions for the current filter.")}</p> : null}
              </div>
            </div>

            <div id="order-action-history" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{t(displayLocale, "退款与订单处置记录", "退款與訂單處置記錄", "Refund and order actions")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Refund and order action history</h3>
                </div>
                <span className="text-sm text-slate-500">{actionTimeline.length}</span>
              </div>
              <SectionLimitControls
                pathname={workspacePath}
                searchParams={resolvedSearchParams}
                paramName="actionTimelineLimit"
                currentLimit={actionTimelineLimit}
                total={filteredActionTimeline.length}
                locale={displayLocale}
              />
              <div className="mt-5 grid gap-3">
                {actionTimeline.map((item) => (
                  <div key={item.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{actionTypeLabel(item.type, displayLocale)}</p>
                        <p className="mt-1 text-xs text-slate-500">{orderKindLabel(item.kind, displayLocale)} · {item.title}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs ${orderStatusTone(item.status)}`}>{orderStatusLabel(item.status, displayLocale)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
                      <span>{formatDateTime(item.at, intlLocale)}</span>
                    </div>
                    {item.note ? <p className="mt-2 text-sm text-slate-400">{item.note}</p> : null}
                  </div>
                ))}
                {actionTimeline.length === 0 ? <p className="text-sm text-slate-500">{t(displayLocale, "暂无订单处置记录。", "暫無訂單處置記錄。", "No order actions yet.")}</p> : null}
              </div>
            </div>

            <div id="login-activities" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{t(displayLocale, "登录日志", "登入日誌", "Login activities")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Recent login activities</h3>
                </div>
                <span className="text-sm text-slate-500">{filteredLoginActivities.length} / {workspace.loginActivities.length}</span>
              </div>
              <SectionLimitControls
                pathname={workspacePath}
                searchParams={resolvedSearchParams}
                paramName="loginLimit"
                currentLimit={loginLimit}
                total={filteredLoginActivities.length}
                locale={displayLocale}
              />
              <div className="mt-5 grid gap-3">
                {visibleLoginActivities.map((item) => (
                  <div key={item.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4 text-sm text-slate-300">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-white">{item.source}</p>
                      <span className="text-xs text-slate-500">{formatDateTime(item.createdAt, intlLocale)}</span>
                    </div>
                    <p className="mt-2">IP: {item.ipAddress ?? "--"}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{item.userAgent ?? "--"}</p>
                  </div>
                ))}
                {filteredLoginActivities.length === 0 ? <p className="text-sm text-slate-500">{t(displayLocale, "当前筛选下暂无登录记录。", "目前篩選下暫無登入記錄。", "No login activity for the current filter.")}</p> : null}
              </div>
            </div>

            <div id="sessions" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{t(displayLocale, "会话", "會話", "Sessions")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Active sessions</h3>
                </div>
                <span className="text-sm text-slate-500">{filteredSessions.length} / {workspace.sessions.length}</span>
              </div>
              <SectionLimitControls
                pathname={workspacePath}
                searchParams={resolvedSearchParams}
                paramName="sessionLimit"
                currentLimit={sessionLimit}
                total={filteredSessions.length}
                locale={displayLocale}
              />
              <div className="mt-5 grid gap-3">
                {visibleSessions.map((item) => (
                  <div key={item.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4 text-sm text-slate-300">
                    <p>{t(displayLocale, "创建", "建立", "Created")}: {formatDateTime(item.createdAt, intlLocale)}</p>
                    <p className="mt-1">{t(displayLocale, "到期", "到期", "Expires")}: {formatDateTime(item.expiresAt, intlLocale)}</p>
                  </div>
                ))}
                {filteredSessions.length === 0 ? <p className="text-sm text-slate-500">{t(displayLocale, "当前筛选下暂无有效会话。", "目前篩選下暫無有效會話。", "No active sessions for the current filter.")}</p> : null}
              </div>
            </div>

            <div id="recharge-orders" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{t(displayLocale, "充值订单", "充值訂單", "Recharge orders")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Recharge orders</h3>
                </div>
                <span className="text-sm text-slate-500">{filteredRechargeOrders.length} / {workspace.rechargeOrders.length}</span>
              </div>
              <SectionLimitControls
                pathname={workspacePath}
                searchParams={resolvedSearchParams}
                paramName="rechargeLimit"
                currentLimit={rechargeLimit}
                total={filteredRechargeOrders.length}
                locale={displayLocale}
              />
              <div className="mt-5 grid gap-3">
                {visibleRechargeOrders.map((item) => (
                  <div key={item.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-white">{item.packageTitle}</p>
                      <span className={`rounded-full px-3 py-1 text-xs ${orderStatusTone(item.status)}`}>{orderStatusLabel(item.status, displayLocale)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
                      <span>{t(displayLocale, "订单号", "訂單號", "Order no.")}: {item.orderNo}</span>
                      <span>{t(displayLocale, "金额", "金額", "Amount")}: {formatCurrency(item.amount, intlLocale)}</span>
                      <span>{t(displayLocale, "球币", "球幣", "Coins")}: {formatNumber(item.totalCoins, intlLocale)}</span>
                    </div>
                    {item.failureReason ? <p className="mt-2 text-xs text-rose-200">{t(displayLocale, "失败原因", "失敗原因", "Failure reason")}: {item.failureReason}</p> : null}
                    {item.refundReason ? <p className="mt-2 text-xs text-amber-200">{t(displayLocale, "退款原因", "退款原因", "Refund reason")}: {item.refundReason}</p> : null}
                    {(rechargeWarningsById.get(item.id)?.length ?? 0) > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(rechargeWarningsById.get(item.id) ?? []).map((warning) => (
                          <span key={`${item.id}-${warning.label}`} className={`rounded-full border px-3 py-1 text-xs ${getWarningChipTone(warning.tone)}`}>
                            {warning.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.status === "pending" ? (
                        <>
                          <form action="/api/admin/users/recharge-workspace" method="post">
                            <input type="hidden" name="intent" value="mark-paid" />
                            <input type="hidden" name="orderId" value={item.id} />
                            <input type="hidden" name="orderNo" value={item.orderNo} />
                            <input type="hidden" name="amount" value={String(item.amount)} />
                            <input type="hidden" name="paymentReference" value={item.paymentReference ?? item.orderNo} />
                            <input type="hidden" name="returnTo" value={rechargeActionReturnTo} />
                            <button type="submit" className="rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1.5 text-sm text-lime-100 transition hover:border-lime-300/45 hover:bg-lime-300/20">
                              {t(displayLocale, "补单", "補單", "Mark paid")}
                            </button>
                          </form>
                          <form action="/api/admin/users/recharge-workspace" method="post">
                            <input type="hidden" name="intent" value="mark-failed" />
                            <input type="hidden" name="orderId" value={item.id} />
                            <input type="hidden" name="orderNo" value={item.orderNo} />
                            <input type="hidden" name="amount" value={String(item.amount)} />
                            <input type="hidden" name="paymentReference" value={item.paymentReference ?? item.orderNo} />
                            <input type="hidden" name="reason" value={t(displayLocale, "用户工作台确认充值失败。", "用戶工作台確認充值失敗。", "Recharge payment failed from user workspace.")} />
                            <input type="hidden" name="returnTo" value={rechargeActionReturnTo} />
                            <button type="submit" className="rounded-full border border-rose-300/25 bg-rose-400/10 px-3 py-1.5 text-sm text-rose-100 transition hover:border-rose-300/45 hover:bg-rose-400/20">
                              {t(displayLocale, "标记失败", "標記失敗", "Mark failed")}
                            </button>
                          </form>
                          <form action="/api/admin/users/recharge-workspace" method="post">
                            <input type="hidden" name="intent" value="close" />
                            <input type="hidden" name="orderId" value={item.id} />
                            <input type="hidden" name="orderNo" value={item.orderNo} />
                            <input type="hidden" name="amount" value={String(item.amount)} />
                            <input type="hidden" name="returnTo" value={rechargeActionReturnTo} />
                            <button type="submit" className="rounded-full border border-white/12 px-3 py-1.5 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                              {t(displayLocale, "关闭", "關閉", "Close")}
                            </button>
                          </form>
                        </>
                      ) : null}
                      {item.status === "paid" ? (
                        <form action="/api/admin/users/recharge-workspace" method="post">
                          <input type="hidden" name="intent" value="refund" />
                          <input type="hidden" name="orderId" value={item.id} />
                          <input type="hidden" name="orderNo" value={item.orderNo} />
                          <input type="hidden" name="amount" value={String(item.amount)} />
                          <input type="hidden" name="reason" value={t(displayLocale, "用户工作台退款充值单。", "用戶工作台退款充值單。", "Recharge refund initiated from user workspace.")} />
                          <input type="hidden" name="returnTo" value={rechargeActionReturnTo} />
                          <button type="submit" className="rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1.5 text-sm text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-400/20">
                            {t(displayLocale, "退款", "退款", "Refund")}
                          </button>
                        </form>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.createdAt, intlLocale)}</p>
                  </div>
                ))}
                {filteredRechargeOrders.length === 0 ? <p className="text-sm text-slate-500">{t(displayLocale, "当前筛选下暂无充值订单。", "目前篩選下暫無充值訂單。", "No recharge orders for the current filter.")}</p> : null}
              </div>
            </div>

            <div id="payment-callbacks" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{t(displayLocale, "支付回调", "支付回調", "Payment callbacks")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Payment callbacks</h3>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={buildAdminFinanceHref({
                      financeIssueQueue: "active",
                      financeIssueQuery:
                        latestCallbackException?.paymentReference ??
                        latestCallbackException?.orderId ??
                        workspace.summary.id,
                    })}
                    className="text-xs text-slate-400 transition hover:text-white"
                  >
                    {t(displayLocale, "打开财务后台", "打開財務後台", "Open finance")}
                  </Link>
                  <span className="text-sm text-slate-500">{filteredPaymentCallbacks.length} / {workspace.paymentCallbacks.length}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {callbackViewOptions.map((item) => {
                  const active = item === callbackView;
                  return (
                    <Link
                      key={`callback-section-${item}`}
                      href={buildWorkspaceHref(workspacePath, resolvedSearchParams, { callbackView: item === "all" ? "" : item })}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        active
                          ? "border-cyan-300/35 bg-cyan-300/14 text-cyan-100"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {callbackViewLabel(item, displayLocale)}
                    </Link>
                  );
                })}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  [t(displayLocale, "冲突/失败", "衝突/失敗", "Conflicts / failed"), formatNumber(callbackConflictCount, intlLocale)],
                  [t(displayLocale, "重复命中", "重複命中", "Duplicate hits"), formatNumber(callbackDuplicateCount, intlLocale)],
                  [
                    t(displayLocale, "最近回调", "最近回調", "Latest callback"),
                    filteredPaymentCallbacks[0] ? formatDateTime(filteredPaymentCallbacks[0].lastSeenAt, intlLocale) : "--",
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1.05rem] border border-white/8 bg-slate-950/35 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
              <SectionLimitControls
                pathname={workspacePath}
                searchParams={resolvedSearchParams}
                paramName="callbackLimit"
                currentLimit={callbackLimit}
                total={filteredPaymentCallbacks.length}
                locale={displayLocale}
              />
              <div className="mt-5 grid gap-3">
                {visiblePaymentCallbacks.map((item) => {
                  const stateMeta = getPaymentCallbackStateMeta(item.state, displayLocale);
                  const processingMeta = getPaymentCallbackProcessingMeta(item.processingStatus, displayLocale);

                  return (
                    <div key={item.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">
                            {item.orderType === "membership"
                              ? t(displayLocale, "会员支付回调", "會員支付回調", "Membership callback")
                              : t(displayLocale, "内容支付回调", "內容支付回調", "Content callback")}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {t(displayLocale, "最近收到", "最近收到", "Last seen")} {formatDateTime(item.lastSeenAt, intlLocale)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs ${stateMeta.className}`}>{stateMeta.label}</span>
                          <span className={`rounded-full px-3 py-1 text-xs ${processingMeta.className}`}>{processingMeta.label}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
                        <span>{t(displayLocale, "订单 ID", "訂單 ID", "Order ID")}: {item.orderId ?? "--"}</span>
                        <span>{t(displayLocale, "支付流水", "支付流水", "Payment ref")}: {item.paymentReference ?? "--"}</span>
                        <span>{t(displayLocale, "通道单号", "通道單號", "Provider order")}: {item.providerOrderId ?? "--"}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                          {t(displayLocale, "事件键", "事件鍵", "Event key")} {item.eventKey.slice(0, 18)}...
                        </span>
                        {item.providerEventId ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                            {t(displayLocale, "事件 ID", "事件 ID", "Event ID")} {item.providerEventId}
                          </span>
                        ) : null}
                        {item.duplicateCount > 0 ? (
                          <span className={`rounded-full border px-3 py-1 text-xs ${getWarningChipTone("attention")}`}>
                            +{item.duplicateCount} {t(displayLocale, "次重复命中", "次重複命中", "duplicate hits")}
                          </span>
                        ) : null}
                      </div>
                      {item.processingMessage ? <p className="mt-3 text-sm text-slate-400">{item.processingMessage}</p> : null}
                    </div>
                  );
                })}
                {filteredPaymentCallbacks.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {t(
                      displayLocale,
                      "当前筛选下暂无支付回调记录。",
                      "目前篩選下暫無支付回調記錄。",
                      "No payment callback records for the current filter.",
                    )}
                  </p>
                ) : null}
              </div>
            </div>

            <div id="admin-audit" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{t(displayLocale, "后台操作审计", "後台操作審計", "Admin audit")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Recent admin actions</h3>
                </div>
                <span className="text-sm text-slate-500">{filteredAuditLogs.length} / {workspace.auditLogs.length}</span>
              </div>
              <SectionLimitControls
                pathname={workspacePath}
                searchParams={resolvedSearchParams}
                paramName="auditLimit"
                currentLimit={auditLimit}
                total={filteredAuditLogs.length}
                locale={displayLocale}
              />
              <div className="mt-5 grid gap-3">
                {visibleAuditLogs.map((item) => {
                  const parsedDetail = parseAuditDetail(item.detail);

                  return (
                    <div key={item.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{adminAuditActionLabel(item.action, displayLocale)}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {getAuditScopeLabel(item.scope, displayLocale)}
                            {item.targetLabel ? ` · ${item.targetLabel}` : item.targetId ? ` · ${item.targetId.slice(0, 8)}` : ""}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs ${adminAuditStatusTone(item.status)}`}>
                          {item.status === "failed" ? t(displayLocale, "失败", "失敗", "Failed") : t(displayLocale, "成功", "成功", "Success")}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
                        <span>{t(displayLocale, "操作人", "操作人", "Actor")}: {item.actorDisplayName} / {item.actorRole}</span>
                        <span>{formatDateTime(item.createdAt, intlLocale)}</span>
                      </div>
                      {parsedDetail.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {parsedDetail.map((entry) => (
                            <span
                              key={`${item.id}-${entry.key}-${entry.value}`}
                              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300"
                            >
                              <span className="text-slate-500">{getAuditDetailKeyLabel(entry.key, displayLocale)}:</span> {entry.value}
                            </span>
                          ))}
                        </div>
                      ) : item.detail ? (
                        <p className="mt-2 break-all text-sm text-slate-400">{item.detail}</p>
                      ) : null}
                    </div>
                  );
                })}
                {filteredAuditLogs.length === 0 ? <p className="text-sm text-slate-500">{t(displayLocale, "当前筛选下暂无后台操作记录。", "目前篩選下暫無後台操作記錄。", "No admin audit records for the current filter.")}</p> : null}
              </div>
            </div>

            <div id="membership-orders" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{t(displayLocale, "会员订单", "會員訂單", "Membership orders")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Membership orders</h3>
                </div>
                <span className="text-sm text-slate-500">{filteredMembershipOrders.length} / {workspace.membershipOrders.length}</span>
              </div>
              <SectionLimitControls
                pathname={workspacePath}
                searchParams={resolvedSearchParams}
                paramName="membershipOrderLimit"
                currentLimit={membershipOrderLimit}
                total={filteredMembershipOrders.length}
                locale={displayLocale}
              />
              <div className="mt-5 grid gap-3">
                {visibleMembershipOrders.map((item) => (
                  <OrderCard
                    key={item.id}
                    order={item}
                    locale={displayLocale}
                    intlLocale={intlLocale}
                    returnTo={returnTo}
                    warnings={membershipWarningsById.get(item.id) ?? []}
                  />
                ))}
                {filteredMembershipOrders.length === 0 ? <p className="text-sm text-slate-500">{t(displayLocale, "当前筛选下暂无会员订单。", "目前篩選下暫無會員訂單。", "No membership orders for the current filter.")}</p> : null}
              </div>
            </div>

            <div id="content-orders" className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">{t(displayLocale, "内容订单", "內容訂單", "Content orders")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Content orders</h3>
                </div>
                <span className="text-sm text-slate-500">{filteredContentOrders.length} / {workspace.contentOrders.length}</span>
              </div>
              <SectionLimitControls
                pathname={workspacePath}
                searchParams={resolvedSearchParams}
                paramName="contentOrderLimit"
                currentLimit={contentOrderLimit}
                total={filteredContentOrders.length}
                locale={displayLocale}
              />
              <div className="mt-5 grid gap-3">
                {visibleContentOrders.map((item) => (
                  <OrderCard key={item.id} order={item} locale={displayLocale} intlLocale={intlLocale} returnTo={returnTo} />
                ))}
                {filteredContentOrders.length === 0 ? <p className="text-sm text-slate-500">{t(displayLocale, "当前筛选下暂无内容订单。", "目前篩選下暫無內容訂單。", "No content orders for the current filter.")}</p> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
