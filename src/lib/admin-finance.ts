import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  createAgentCommissionForRechargeOrder,
  reverseAgentCommissionForRechargeOrder,
} from "@/lib/agent-attribution";
import { getPaymentProviderReferencePrefix, normalizePaymentProvider, type PaymentProvider } from "@/lib/payment-provider";
import { notifyRechargeStateChanged } from "@/lib/user-notifications";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n-config";

type FinanceClient = Prisma.TransactionClient | typeof prisma;
type CoinOrderStatus = "pending" | "paid" | "failed" | "closed" | "refunded";
type CoinOrderProvider = PaymentProvider;
type CoinPackageStatus = "active" | "inactive";
type CoinLedgerDirection = "credit" | "debit";
type FinanceTone = "good" | "warn" | "neutral";
export type FinanceReconciliationIssueScope = "coin-recharge" | "membership" | "content";
export type FinanceReconciliationScanScope = FinanceReconciliationIssueScope | "all";
export type FinanceReconciliationIssueStatus = "open" | "reviewing" | "resolved" | "ignored";
export type FinanceReconciliationIssueSeverity = "low" | "medium" | "high";
export type FinanceReconciliationWorkflowStage =
  | "triage"
  | "investigating"
  | "awaiting-callback"
  | "awaiting-finance"
  | "closed";

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
  memberNote?: string;
  proofUrl?: string;
  proofUploadedAt?: string;
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

export type AdminCoinLedgerRecord = {
  id: string;
  userDisplayName: string;
  userEmail: string;
  direction: CoinLedgerDirection;
  reason: string;
  reasonLabel: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  note?: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
};

export type AdminCoinAccountRecord = {
  userId: string;
  userDisplayName: string;
  userEmail: string;
  balance: number;
  lifetimeCredited: number;
  lifetimeDebited: number;
  lastActivityAt?: string;
};

export type AdminFinanceRowCard = {
  title: string;
  subtitle?: string;
  status?: string;
  tone?: FinanceTone;
  meta?: string[];
};

export type AdminFinanceReconciliationIssueRecord = {
  id: string;
  scope: FinanceReconciliationIssueScope;
  issueType: string;
  status: FinanceReconciliationIssueStatus;
  severity: FinanceReconciliationIssueSeverity;
  workflowStage: FinanceReconciliationWorkflowStage;
  summary: string;
  detail?: string;
  reasonCode?: string;
  paymentReference?: string;
  amount?: number;
  sourceStatus?: string;
  resolutionNote?: string;
  assignedToDisplayName?: string;
  reminderCount: number;
  lastRemindedAt?: string;
  lastReminderNote?: string;
  createdByDisplayName: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  rechargeOrderId?: string;
  membershipOrderId?: string;
  contentOrderId?: string;
  rechargeOrderNo?: string;
  orderRefLabel?: string;
  subjectTitle?: string;
  userDisplayName?: string;
  userEmail?: string;
  ageHours: number;
  isOverdue: boolean;
  isUnassigned: boolean;
};

export type AdminFinanceReconciliationSummary = {
  openCount: number;
  reviewingCount: number;
  resolvedCount: number;
  ignoredCount: number;
  highSeverityOpenCount: number;
  overdueCount: number;
  unassignedActiveCount: number;
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
  coinAccounts: AdminCoinAccountRecord[];
  recentLedgers: AdminCoinLedgerRecord[];
  reconciliationRows: AdminFinanceRowCard[];
  reconciliationIssues: AdminFinanceReconciliationIssueRecord[];
  reconciliationSummary: AdminFinanceReconciliationSummary;
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
      if (
        !(error instanceof Error) ||
        (!error.message.includes("static generation store missing") &&
          !error.message.includes("during render which is unsupported"))
      ) {
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

function getCoinLedgerReasonLabel(locale: Locale, reason: string) {
  if (reason === "manual_recharge" || reason === "recharge") {
    return localizeText(
      {
        zhCn: "人工充值",
        zhTw: "人工充值",
        en: "Manual recharge",
      },
      locale,
    );
  }

  if (reason === "content_unlock") {
    return localizeText(
      {
        zhCn: "球币解锁内容",
        zhTw: "球幣解鎖內容",
        en: "Content unlock",
      },
      locale,
    );
  }

  if (reason === "membership_unlock") {
    return localizeText(
      {
        zhCn: "球币开通会员",
        zhTw: "球幣開通會員",
        en: "Membership activation",
      },
      locale,
    );
  }

  if (reason === "refund") {
    return localizeText(
      {
        zhCn: "退款回退",
        zhTw: "退款回退",
        en: "Refund reversal",
      },
      locale,
    );
  }

  if (reason === "admin_adjustment") {
    return localizeText(
      {
        zhCn: "后台调整",
        zhTw: "後台調整",
        en: "Admin adjustment",
      },
      locale,
    );
  }

  return localizeText(
    {
      zhCn: "钱包流水",
      zhTw: "錢包流水",
      en: "Wallet movement",
    },
    locale,
  );
}

function normalizeFinanceReconciliationIssueStatus(value?: string | null): FinanceReconciliationIssueStatus {
  if (value === "reviewing" || value === "resolved" || value === "ignored") {
    return value;
  }

  return "open";
}

function normalizeFinanceReconciliationIssueSeverity(value?: string | null): FinanceReconciliationIssueSeverity {
  if (value === "low" || value === "high") {
    return value;
  }

  return "medium";
}

function normalizeFinanceReconciliationIssueScope(value?: string | null): FinanceReconciliationIssueScope {
  if (value === "membership" || value === "content") {
    return value;
  }

  return "coin-recharge";
}

export function normalizeFinanceReconciliationScanScope(value?: string | null): FinanceReconciliationScanScope {
  if (value === "all" || value === "membership" || value === "content") {
    return value;
  }

  return "coin-recharge";
}

function normalizeFinanceReconciliationWorkflowStage(value?: string | null): FinanceReconciliationWorkflowStage {
  if (
    value === "investigating" ||
    value === "awaiting-callback" ||
    value === "awaiting-finance" ||
    value === "closed"
  ) {
    return value;
  }

  return "triage";
}

function inferWorkflowStageFromStatus(
  status: FinanceReconciliationIssueStatus,
  fallback?: string | null,
): FinanceReconciliationWorkflowStage {
  if (status === "resolved" || status === "ignored") {
    return "closed";
  }

  if (status === "reviewing") {
    const normalized = normalizeFinanceReconciliationWorkflowStage(fallback);
    return normalized === "triage" || normalized === "closed" ? "investigating" : normalized;
  }

  const normalized = normalizeFinanceReconciliationWorkflowStage(fallback);
  return normalized === "closed" ? "triage" : normalized;
}

function getFinanceReconciliationIssueSlaThresholdHours(severity: FinanceReconciliationIssueSeverity) {
  if (severity === "high") {
    return 4;
  }

  if (severity === "low") {
    return 72;
  }

  return 24;
}

export function getFinanceReconciliationIssueTypeLabel(locale: Locale, issueType: string) {
  if (issueType === "payment_failed") {
    return localizeText(
      {
        zhCn: "支付失败复核",
        zhTw: "支付失敗複核",
        en: "Failed payment review",
      },
      locale,
    );
  }

  if (issueType === "missing_payment") {
    return localizeText(
      {
        zhCn: "到账核验",
        zhTw: "到帳核驗",
        en: "Payment verification",
      },
      locale,
    );
  }

  if (issueType === "refund_review") {
    return localizeText(
      {
        zhCn: "退款复核",
        zhTw: "退款複核",
        en: "Refund review",
      },
      locale,
    );
  }

  if (issueType === "entitlement_missing") {
    return localizeText(
      {
        zhCn: "已支付未生效",
        zhTw: "已支付未生效",
        en: "Paid but entitlement inactive",
      },
      locale,
    );
  }

  if (issueType === "refund_reversal_missing") {
    return localizeText(
      {
        zhCn: "退款后仍有效",
        zhTw: "退款後仍有效",
        en: "Active after refund",
      },
      locale,
    );
  }

  if (issueType === "stale_pending") {
    return localizeText(
      {
        zhCn: "超时待核",
        zhTw: "超時待核",
        en: "Stale pending",
      },
      locale,
    );
  }

  if (issueType === "credit_missing") {
    return localizeText(
      {
        zhCn: "到账未入账",
        zhTw: "到帳未入帳",
        en: "Credit missing",
      },
      locale,
    );
  }

  if (issueType === "duplicate_payment_reference") {
    return localizeText(
      {
        zhCn: "重复支付流水",
        zhTw: "重複支付流水",
        en: "Duplicate payment reference",
      },
      locale,
    );
  }

  if (issueType === "callback_pending_state") {
    return localizeText(
      {
        zhCn: "回调已收但订单未推进",
        zhTw: "回調已收但訂單未推進",
        en: "Callback received but order not advanced",
      },
      locale,
    );
  }

  if (issueType === "order_status_conflict") {
    return localizeText(
      {
        zhCn: "订单状态冲突",
        zhTw: "訂單狀態衝突",
        en: "Order status conflict",
      },
      locale,
    );
  }

  return localizeText(
    {
      zhCn: "人工复核",
      zhTw: "人工複核",
      en: "Manual review",
    },
    locale,
  );
}

export function getFinanceReconciliationScopeLabel(
  locale: Locale,
  scope: FinanceReconciliationIssueScope | FinanceReconciliationScanScope | string,
) {
  if (scope === "membership") {
    return localizeText(
      {
        zhCn: "会员订单",
        zhTw: "會員訂單",
        en: "Membership",
      },
      locale,
    );
  }

  if (scope === "content") {
    return localizeText(
      {
        zhCn: "内容订单",
        zhTw: "內容訂單",
        en: "Content",
      },
      locale,
    );
  }

  if (scope === "all") {
    return localizeText(
      {
        zhCn: "全部范围",
        zhTw: "全部範圍",
        en: "All scopes",
      },
      locale,
    );
  }

  return localizeText(
    {
      zhCn: "充值订单",
      zhTw: "充值訂單",
      en: "Coin recharge",
    },
    locale,
  );
}

export function getFinanceReconciliationWorkflowStageMeta(
  stage: FinanceReconciliationWorkflowStage,
  locale: Locale,
) {
  if (stage === "investigating") {
    return {
      label: localizeText(
        {
          zhCn: "调查中",
          zhTw: "調查中",
          en: "Investigating",
        },
        locale,
      ),
      tone: "warn" as const,
    };
  }

  if (stage === "awaiting-callback") {
    return {
      label: localizeText(
        {
          zhCn: "等回调",
          zhTw: "等回調",
          en: "Awaiting callback",
        },
        locale,
      ),
      tone: "neutral" as const,
    };
  }

  if (stage === "awaiting-finance") {
    return {
      label: localizeText(
        {
          zhCn: "等财务确认",
          zhTw: "等財務確認",
          en: "Awaiting finance",
        },
        locale,
      ),
      tone: "neutral" as const,
    };
  }

  if (stage === "closed") {
    return {
      label: localizeText(
        {
          zhCn: "已收口",
          zhTw: "已收口",
          en: "Closed",
        },
        locale,
      ),
      tone: "good" as const,
    };
  }

  return {
    label: localizeText(
      {
        zhCn: "待分诊",
        zhTw: "待分診",
        en: "Triage",
      },
      locale,
    ),
    tone: "neutral" as const,
  };
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

export function getFinanceReconciliationIssueStatusMeta(
  status: FinanceReconciliationIssueStatus,
  locale: Locale,
) {
  if (status === "resolved") {
    return {
      label: localizeText(
        {
          zhCn: "已解决",
          zhTw: "已解決",
          en: "Resolved",
        },
        locale,
      ),
      tone: "good" as const,
    };
  }

  if (status === "ignored") {
    return {
      label: localizeText(
        {
          zhCn: "已忽略",
          zhTw: "已忽略",
          en: "Ignored",
        },
        locale,
      ),
      tone: "neutral" as const,
    };
  }

  if (status === "reviewing") {
    return {
      label: localizeText(
        {
          zhCn: "处理中",
          zhTw: "處理中",
          en: "Reviewing",
        },
        locale,
      ),
      tone: "warn" as const,
    };
  }

  return {
    label: localizeText(
      {
        zhCn: "待处理",
        zhTw: "待處理",
        en: "Open",
      },
      locale,
    ),
    tone: "warn" as const,
  };
}

export function getFinanceReconciliationIssueSeverityMeta(
  severity: FinanceReconciliationIssueSeverity,
  locale: Locale,
) {
  if (severity === "high") {
    return {
      label: localizeText(
        {
          zhCn: "高优先级",
          zhTw: "高優先級",
          en: "High",
        },
        locale,
      ),
      tone: "warn" as const,
    };
  }

  if (severity === "low") {
    return {
      label: localizeText(
        {
          zhCn: "低优先级",
          zhTw: "低優先級",
          en: "Low",
        },
        locale,
      ),
      tone: "neutral" as const,
    };
  }

  return {
    label: localizeText(
      {
        zhCn: "中优先级",
        zhTw: "中優先級",
        en: "Medium",
      },
      locale,
    ),
    tone: "good" as const,
  };
}

export function getFinanceReconciliationIssueSlaMeta(
  issue: Pick<AdminFinanceReconciliationIssueRecord, "status" | "severity" | "ageHours" | "isOverdue">,
  locale: Locale,
) {
  if (issue.status === "resolved" || issue.status === "ignored") {
    return {
      label: localizeText(
        {
          zhCn: "已收口",
          zhTw: "已收口",
          en: "Closed loop",
        },
        locale,
      ),
      tone: "good" as const,
    };
  }

  if (issue.isOverdue) {
    return {
      label: localizeText(
        {
          zhCn: `已逾时 ${formatCompactNumber(issue.ageHours)}h`,
          zhTw: `已逾時 ${formatCompactNumber(issue.ageHours)}h`,
          en: `Overdue ${formatCompactNumber(issue.ageHours)}h`,
        },
        locale,
      ),
      tone: "warn" as const,
    };
  }

  return {
    label: localizeText(
      {
        zhCn: `SLA ${formatCompactNumber(getFinanceReconciliationIssueSlaThresholdHours(issue.severity))}h 内`,
        zhTw: `SLA ${formatCompactNumber(getFinanceReconciliationIssueSlaThresholdHours(issue.severity))}h 內`,
        en: `Within ${formatCompactNumber(getFinanceReconciliationIssueSlaThresholdHours(issue.severity))}h SLA`,
      },
      locale,
    ),
    tone: "neutral" as const,
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
  const prefix = getPaymentProviderReferencePrefix(provider);
  return `${prefix}-COIN-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function createCoinProviderOrderId(provider: CoinOrderProvider) {
  const prefix = getPaymentProviderReferencePrefix(provider);
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

export async function ensureDefaultCoinPackages(options?: { revalidate?: boolean }) {
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

  if (options?.revalidate) {
    safeRevalidate(siteSurfacePaths);
  }
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
  note?: string;
  allowRecoverFromTerminal?: boolean;
  operatorUserId?: string | null;
  operatorDisplayName?: string;
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
  const paymentReference =
    input.paymentReference?.trim() || order.paymentReference || createCoinPaymentReference("manual");

  await prisma.$transaction(async (tx) => {
    await applyCoinAccountAdjustment(tx, {
      userId: order.userId,
      direction: "credit",
      reason: "manual_recharge",
      amount: totalCoins,
      referenceType: "coin-recharge-order",
      referenceId: order.id,
      note: input.note?.trim() || order.orderNo,
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
        paymentReference,
      },
    });

    await createAgentCommissionForRechargeOrder(tx, {
      orderId: order.id,
      note: `Recharge paid ${order.orderNo}`,
    });

    await notifyRechargeStateChanged(tx, {
      userId: order.userId,
      orderId: order.id,
      orderNo: order.orderNo,
      state: "paid",
      paymentReference,
    });
  });

  await syncRechargeOrderReconciliationIssues({
    orderId: order.id,
    createdByUserId: input.operatorUserId ?? null,
    createdByDisplayName: input.operatorDisplayName,
  });
  safeRevalidate(siteSurfacePaths);
}

export async function markCoinRechargeOrderFailedByAdmin(input: {
  orderId: string;
  reason?: string;
  paymentReference?: string;
  operatorUserId?: string | null;
  operatorDisplayName?: string;
}) {
  const order = await prisma.coinRechargeOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      orderNo: true,
      status: true,
      userId: true,
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

  const paymentReference =
    input.paymentReference?.trim() || order.paymentReference || createCoinPaymentReference("manual");

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
      paymentReference,
    },
  });

  await notifyRechargeStateChanged(prisma, {
    userId: order.userId,
    orderId: order.id,
    orderNo: order.orderNo,
    state: "failed",
    paymentReference,
  });

  await syncRechargeOrderReconciliationIssues({
    orderId: order.id,
    createdByUserId: input.operatorUserId ?? null,
    createdByDisplayName: input.operatorDisplayName,
  });
  safeRevalidate(siteSurfacePaths);
}

export async function closePendingCoinRechargeOrder(input: {
  orderId: string;
  operatorUserId?: string | null;
  operatorDisplayName?: string;
}) {
  const order = await prisma.coinRechargeOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      orderNo: true,
      status: true,
      userId: true,
      paymentReference: true,
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

  await notifyRechargeStateChanged(prisma, {
    userId: order.userId,
    orderId: order.id,
    orderNo: order.orderNo,
    state: "closed",
    paymentReference: order.paymentReference,
  });

  await syncRechargeOrderReconciliationIssues({
    orderId: order.id,
    createdByUserId: input.operatorUserId ?? null,
    createdByDisplayName: input.operatorDisplayName,
  });
  safeRevalidate(siteSurfacePaths);
}

export async function refundCoinRechargeOrderByAdmin(input: {
  orderId: string;
  reason?: string;
  operatorUserId?: string | null;
  operatorDisplayName?: string;
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

    await reverseAgentCommissionForRechargeOrder(tx, {
      orderId: order.id,
      note: input.reason?.trim() || `Recharge refunded ${order.orderNo}`,
    });

    await notifyRechargeStateChanged(tx, {
      userId: order.userId,
      orderId: order.id,
      orderNo: order.orderNo,
      state: "refunded",
      paymentReference: order.paymentReference,
    });
  });

  await syncRechargeOrderReconciliationIssues({
    orderId: order.id,
    createdByUserId: input.operatorUserId ?? null,
    createdByDisplayName: input.operatorDisplayName,
  });
  safeRevalidate(siteSurfacePaths);
}

export async function adjustCoinAccountByAdmin(input: {
  userId: string;
  direction: CoinLedgerDirection;
  amount: number;
  note?: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true },
  });

  if (!user) {
    throw new Error("COIN_RECHARGE_USER_NOT_FOUND");
  }

  await prisma.$transaction(async (tx) => {
    await applyCoinAccountAdjustment(tx, {
      userId: input.userId,
      direction: input.direction,
      reason: "admin_adjustment",
      amount: input.amount,
      referenceType: "admin-finance",
      referenceId: randomUUID(),
      note: input.note?.trim() || undefined,
      allowNegative: false,
    });
  });

  safeRevalidate(siteSurfacePaths);
}

type BatchCoinRechargeAction = "mark-paid" | "mark-failed" | "close" | "refund";

function normalizeUniqueValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export async function batchUpdateCoinRechargeOrdersByAdmin(input: {
  orderRefs: string[];
  action: BatchCoinRechargeAction;
  reason?: string;
  paymentReference?: string;
  operatorUserId?: string | null;
  operatorDisplayName?: string;
}) {
  const orderRefs = normalizeUniqueValues(input.orderRefs);

  if (orderRefs.length === 0) {
    throw new Error("COIN_RECHARGE_BATCH_EMPTY");
  }

  const orders = await prisma.coinRechargeOrder.findMany({
    where: {
      OR: orderRefs.flatMap((value) => [{ id: value }, { orderNo: value }]),
    },
    select: {
      id: true,
      orderNo: true,
      status: true,
    },
  });

  const orderMap = new Map<string, { id: string; orderNo: string; status: string }>();

  for (const order of orders) {
    orderMap.set(order.id, order);
    orderMap.set(order.orderNo, order);
  }

  const processedOrderIds = new Set<string>();
  let processedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const ref of orderRefs) {
    const order = orderMap.get(ref);

    if (!order || processedOrderIds.has(order.id)) {
      failedCount += 1;
      continue;
    }

    const status = order.status as CoinOrderStatus;

    if (input.action === "mark-paid" && status !== "pending" && status !== "failed" && status !== "closed") {
      skippedCount += 1;
      continue;
    }

    if (input.action === "mark-failed" && status !== "pending") {
      skippedCount += 1;
      continue;
    }

    if (input.action === "refund" && status !== "paid") {
      skippedCount += 1;
      continue;
    }

    if (input.action === "close" && status !== "pending") {
      skippedCount += 1;
      continue;
    }

    try {
      if (input.action === "mark-paid") {
        await markCoinRechargeOrderPaidByAdmin({
          orderId: order.id,
          paymentReference: input.paymentReference,
          note: input.reason,
          allowRecoverFromTerminal: true,
          operatorUserId: input.operatorUserId ?? null,
          operatorDisplayName: input.operatorDisplayName,
        });
      } else if (input.action === "mark-failed") {
        await markCoinRechargeOrderFailedByAdmin({
          orderId: order.id,
          paymentReference: input.paymentReference,
          reason: input.reason,
          operatorUserId: input.operatorUserId ?? null,
          operatorDisplayName: input.operatorDisplayName,
        });
      } else if (input.action === "refund") {
        await refundCoinRechargeOrderByAdmin({
          orderId: order.id,
          reason: input.reason,
          operatorUserId: input.operatorUserId ?? null,
          operatorDisplayName: input.operatorDisplayName,
        });
      } else {
        await closePendingCoinRechargeOrder({
          orderId: order.id,
          operatorUserId: input.operatorUserId ?? null,
          operatorDisplayName: input.operatorDisplayName,
        });
      }

      processedOrderIds.add(order.id);
      processedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  return {
    totalCount: orderRefs.length,
    processedCount,
    skippedCount,
    failedCount,
  };
}

export async function batchAdjustCoinAccountsByAdmin(input: {
  userRefs: string[];
  direction: CoinLedgerDirection;
  amount: number;
  note?: string;
}) {
  const userRefs = normalizeUniqueValues(input.userRefs);

  if (userRefs.length === 0) {
    throw new Error("COIN_ADJUSTMENT_BATCH_EMPTY");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("COIN_AMOUNT_INVALID");
  }

  const users = await prisma.user.findMany({
    where: {
      OR: userRefs.flatMap((value) => [{ id: value }, { email: value }]),
    },
    select: {
      id: true,
      email: true,
    },
  });

  const userMap = new Map<string, { id: string; email: string }>();

  for (const user of users) {
    userMap.set(user.id, user);
    userMap.set(user.email, user);
  }

  const resolvedUsers = userRefs
    .map((value) => userMap.get(value))
    .filter((item): item is { id: string; email: string } => Boolean(item));
  const userIds = [...new Set(resolvedUsers.map((item) => item.id))];
  const accounts = input.direction === "debit"
    ? await prisma.coinAccount.findMany({
        where: {
          userId: {
            in: userIds,
          },
        },
        select: {
          userId: true,
          balance: true,
        },
      })
    : [];
  const balanceMap = new Map(accounts.map((account) => [account.userId, account.balance]));
  const processedUserIds = new Set<string>();
  let processedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const ref of userRefs) {
    const user = userMap.get(ref);

    if (!user || processedUserIds.has(user.id)) {
      failedCount += 1;
      continue;
    }

    if (input.direction === "debit" && (balanceMap.get(user.id) ?? 0) < input.amount) {
      skippedCount += 1;
      continue;
    }

    try {
      await adjustCoinAccountByAdmin({
        userId: user.id,
        direction: input.direction,
        amount: input.amount,
        note: input.note,
      });

      processedUserIds.add(user.id);
      processedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  return {
    totalCount: userRefs.length,
    processedCount,
    skippedCount,
    failedCount,
  };
}

function toAdminFinanceReconciliationIssueRecord(issue: {
  id: string;
  scope: string;
  issueType: string;
  status: string;
  severity: string;
  workflowStage: string;
  summary: string;
  detail: string | null;
  reasonCode: string | null;
  paymentReference: string | null;
  amount: number | null;
  sourceStatus: string | null;
  resolutionNote: string | null;
  assignedToDisplayName: string | null;
  reminderCount: number;
  lastRemindedAt: Date | null;
  lastReminderNote: string | null;
  createdByDisplayName: string;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  rechargeOrderId?: string | null;
  membershipOrderId?: string | null;
  contentOrderId?: string | null;
  rechargeOrder?: {
    orderNo: string;
    user?: {
      displayName: string;
      email: string;
    } | null;
  } | null;
  membershipOrder?: {
    id: string;
    planId: string;
    user: {
      displayName: string;
      email: string;
    };
  } | null;
  contentOrder?: {
    id: string;
    contentId: string;
    user: {
      displayName: string;
      email: string;
    };
  } | null;
}): AdminFinanceReconciliationIssueRecord {
  const status = normalizeFinanceReconciliationIssueStatus(issue.status);
  const severity = normalizeFinanceReconciliationIssueSeverity(issue.severity);
  const scope = normalizeFinanceReconciliationIssueScope(issue.scope);
  const workflowStage = inferWorkflowStageFromStatus(status, issue.workflowStage);
  const ageHours = Math.max(0, Math.floor((Date.now() - issue.updatedAt.getTime()) / (60 * 60 * 1000)));
  const isActive = status === "open" || status === "reviewing";
  const isOverdue = isActive && ageHours >= getFinanceReconciliationIssueSlaThresholdHours(severity);
  const isUnassigned = isActive && !(issue.assignedToDisplayName ?? "").trim();
  const membershipOrderRef = issue.membershipOrder ? `MEM-${issue.membershipOrder.id.slice(-8).toUpperCase()}` : undefined;
  const contentOrderRef = issue.contentOrder ? `CNT-${issue.contentOrder.id.slice(-8).toUpperCase()}` : undefined;
  const orderRefLabel =
    scope === "membership"
      ? membershipOrderRef
      : scope === "content"
        ? contentOrderRef
        : issue.rechargeOrder?.orderNo;
  const subjectTitle =
    scope === "membership"
      ? issue.membershipOrder?.planId
      : scope === "content"
        ? issue.contentOrder?.contentId
        : undefined;
  const userDisplayName =
    issue.rechargeOrder?.user?.displayName ??
    issue.membershipOrder?.user.displayName ??
    issue.contentOrder?.user.displayName ??
    undefined;
  const userEmail =
    issue.rechargeOrder?.user?.email ??
    issue.membershipOrder?.user.email ??
    issue.contentOrder?.user.email ??
    undefined;

  return {
    id: issue.id,
    scope,
    issueType: issue.issueType,
    status,
    severity,
    workflowStage,
    summary: issue.summary,
    detail: issue.detail ?? undefined,
    reasonCode: issue.reasonCode ?? undefined,
    paymentReference: issue.paymentReference ?? undefined,
    amount: issue.amount ?? undefined,
    sourceStatus: issue.sourceStatus ?? undefined,
    resolutionNote: issue.resolutionNote ?? undefined,
    assignedToDisplayName: issue.assignedToDisplayName ?? undefined,
    reminderCount: issue.reminderCount,
    lastRemindedAt: issue.lastRemindedAt?.toISOString(),
    lastReminderNote: issue.lastReminderNote ?? undefined,
    createdByDisplayName: issue.createdByDisplayName,
    resolvedAt: issue.resolvedAt?.toISOString(),
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    rechargeOrderId: issue.rechargeOrderId ?? undefined,
    membershipOrderId: issue.membershipOrderId ?? undefined,
    contentOrderId: issue.contentOrderId ?? undefined,
    rechargeOrderNo: issue.rechargeOrder?.orderNo ?? undefined,
    orderRefLabel,
    subjectTitle,
    userDisplayName,
    userEmail,
    ageHours,
    isOverdue,
    isUnassigned,
  };
}

async function findCoinRechargeOrderByRef(orderRef?: string) {
  const normalizedRef = orderRef?.trim();

  if (!normalizedRef) {
    return null;
  }

  return prisma.coinRechargeOrder.findFirst({
    where: {
      OR: [{ id: normalizedRef }, { orderNo: normalizedRef }],
    },
    select: {
      id: true,
      orderNo: true,
      amount: true,
      status: true,
      paymentReference: true,
      user: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
  });
}

async function findMembershipOrderByRef(orderRef?: string, paymentReference?: string) {
  const normalizedRef = orderRef?.trim();
  const normalizedPaymentReference = paymentReference?.trim();

  if (!normalizedRef && !normalizedPaymentReference) {
    return null;
  }

  return prisma.membershipOrder.findFirst({
    where: {
      OR: [
        ...(normalizedRef
          ? [{ id: normalizedRef }, { providerOrderId: normalizedRef }, { paymentReference: normalizedRef }]
          : []),
        ...(normalizedPaymentReference ? [{ paymentReference: normalizedPaymentReference }] : []),
      ],
    },
    select: {
      id: true,
      planId: true,
      amount: true,
      status: true,
      paymentReference: true,
      user: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

async function findContentOrderByRef(orderRef?: string, paymentReference?: string) {
  const normalizedRef = orderRef?.trim();
  const normalizedPaymentReference = paymentReference?.trim();

  if (!normalizedRef && !normalizedPaymentReference) {
    return null;
  }

  return prisma.contentOrder.findFirst({
    where: {
      OR: [
        ...(normalizedRef
          ? [{ id: normalizedRef }, { providerOrderId: normalizedRef }, { paymentReference: normalizedRef }]
          : []),
        ...(normalizedPaymentReference ? [{ paymentReference: normalizedPaymentReference }] : []),
      ],
    },
    select: {
      id: true,
      contentId: true,
      amount: true,
      status: true,
      paymentReference: true,
      user: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

type FinanceIssueTarget =
  | {
      scope: "coin-recharge";
      rechargeOrder: Awaited<ReturnType<typeof findCoinRechargeOrderByRef>>;
      membershipOrder: null;
      contentOrder: null;
    }
  | {
      scope: "membership";
      rechargeOrder: null;
      membershipOrder: Awaited<ReturnType<typeof findMembershipOrderByRef>>;
      contentOrder: null;
    }
  | {
      scope: "content";
      rechargeOrder: null;
      membershipOrder: null;
      contentOrder: Awaited<ReturnType<typeof findContentOrderByRef>>;
    }
  | {
      scope: FinanceReconciliationIssueScope;
      rechargeOrder: null;
      membershipOrder: null;
      contentOrder: null;
    };

async function resolveFinanceIssueTarget(input: {
  scope?: string;
  orderRef?: string;
  paymentReference?: string;
}): Promise<FinanceIssueTarget> {
  const scope = normalizeFinanceReconciliationIssueScope(input.scope);

  if (scope === "membership") {
    return {
      scope,
      rechargeOrder: null,
      membershipOrder: await findMembershipOrderByRef(input.orderRef, input.paymentReference),
      contentOrder: null,
    };
  }

  if (scope === "content") {
    return {
      scope,
      rechargeOrder: null,
      membershipOrder: null,
      contentOrder: await findContentOrderByRef(input.orderRef, input.paymentReference),
    };
  }

  return {
    scope,
    rechargeOrder: await findCoinRechargeOrderByRef(input.orderRef),
    membershipOrder: null,
    contentOrder: null,
  };
}

type ManagedFinanceIssueType =
  | "stale_pending"
  | "payment_failed"
  | "refund_review"
  | "credit_missing"
  | "duplicate_payment_reference"
  | "callback_pending_state"
  | "order_status_conflict";

type RechargeOrderSignalSnapshot = {
  id: string;
  orderNo: string;
  amount: number;
  status: string;
  paymentReference: string | null;
  failureReason?: string | null;
  refundReason?: string | null;
  creditedAt?: Date | null;
  createdAt?: Date;
  paidAt?: Date | null;
};

type RechargeOrderIssueSignal = {
  issueType: ManagedFinanceIssueType;
  severity: FinanceReconciliationIssueSeverity;
  summary: string;
  detail: string;
  reasonCode: string;
};

const managedRechargeIssueTypes: ManagedFinanceIssueType[] = [
  "stale_pending",
  "payment_failed",
  "refund_review",
  "credit_missing",
  "duplicate_payment_reference",
  "callback_pending_state",
  "order_status_conflict",
];

function buildRechargeOrderIssueSignals(
  order: RechargeOrderSignalSnapshot,
  stalePendingHours = 24,
) {
  const signals: RechargeOrderIssueSignal[] = [];
  const now = Date.now();

  if (
    order.status === "pending" &&
    order.createdAt &&
    order.createdAt.getTime() < now - stalePendingHours * 60 * 60 * 1000
  ) {
    signals.push({
      issueType: "stale_pending",
      severity: "high",
      summary: `充值单 ${order.orderNo} 超过 ${stalePendingHours} 小时未完成支付`,
      detail: `订单创建于 ${order.createdAt.toISOString()}，仍处于待支付状态，请核对支付通道与补单情况。`,
      reasonCode: "stale_pending",
    });
  }

  if (order.status === "failed") {
    signals.push({
      issueType: "payment_failed",
      severity: "high",
      summary: `充值单 ${order.orderNo} 已标记支付失败`,
      detail: order.failureReason ?? "支付失败订单需要财务确认是否补单、重建订单或通知用户。",
      reasonCode: "payment_failed",
    });
  }

  if (order.status === "refunded") {
    signals.push({
      issueType: "refund_review",
      severity: "medium",
      summary: `充值单 ${order.orderNo} 已退款，待复核回退链路`,
      detail: order.refundReason ?? "请确认球币回退、佣金冲回和财务记录是否一致。",
      reasonCode: "refund_review",
    });
  }

  if (order.status === "paid" && !order.creditedAt) {
    signals.push({
      issueType: "credit_missing",
      severity: "high",
      summary: `充值单 ${order.orderNo} 已支付但未完成入账`,
      detail: `支付时间 ${order.paidAt?.toISOString() ?? "--"}，请检查球币账户与回调处理链路。`,
      reasonCode: "credit_missing",
    });
  }

  return signals;
}

async function syncRechargeOrderReconciliationIssues(input: {
  orderId: string;
  createdByUserId?: string | null;
  createdByDisplayName?: string;
  stalePendingHours?: number;
}) {
  const order = await prisma.coinRechargeOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      orderNo: true,
      amount: true,
      status: true,
      paymentReference: true,
      failureReason: true,
      refundReason: true,
      creditedAt: true,
      createdAt: true,
      paidAt: true,
    },
  });

  if (!order) {
    return {
      createdCount: 0,
      resolvedCount: 0,
    };
  }

  const actorDisplayName = input.createdByDisplayName?.trim() || "System";
  const activeSignals = buildRechargeOrderIssueSignals(order, input.stalePendingHours ?? 24);
  const activeIssueTypeSet = new Set(activeSignals.map((signal) => signal.issueType));
  const existingIssues = await prisma.financeReconciliationIssue.findMany({
    where: {
      rechargeOrderId: order.id,
      issueType: {
        in: managedRechargeIssueTypes,
      },
      status: {
        in: ["open", "reviewing"],
      },
    },
    select: {
      id: true,
      issueType: true,
      status: true,
    },
  });

  let createdCount = 0;

  for (const signal of activeSignals) {
    const result = await createFinanceReconciliationIssue({
      orderRef: order.id,
      paymentReference: order.paymentReference ?? undefined,
      issueType: signal.issueType,
      severity: signal.severity,
      summary: signal.summary,
      detail: signal.detail,
      reasonCode: signal.reasonCode,
      createdByUserId: input.createdByUserId ?? null,
      createdByDisplayName: actorDisplayName,
      assignedToDisplayName: actorDisplayName,
      dedupeMode: "active",
    });

    if (result.created) {
      createdCount += 1;
    }
  }

  const issueIdsToResolve = existingIssues
    .filter((issue) => !activeIssueTypeSet.has(issue.issueType as ManagedFinanceIssueType))
    .map((issue) => issue.id);

  let resolvedCount = 0;

  if (issueIdsToResolve.length > 0) {
    const result = await prisma.financeReconciliationIssue.updateMany({
      where: {
        id: {
          in: issueIdsToResolve,
        },
      },
      data: {
        status: "resolved",
        resolutionNote: `订单状态已更新，系统自动关闭当前对账问题。`,
        assignedToDisplayName: actorDisplayName,
        resolvedAt: new Date(),
      },
    });
    resolvedCount = result.count;
  }

  if (createdCount > 0 || resolvedCount > 0) {
    safeRevalidate(siteSurfacePaths);
  }

  return {
    createdCount,
    resolvedCount,
  };
}

export async function createFinanceReconciliationIssue(input: {
  scope?: FinanceReconciliationIssueScope | string;
  orderRef?: string;
  paymentReference?: string;
  issueType?: string;
  severity?: string;
  summary?: string;
  detail?: string;
  reasonCode?: string;
  createdByUserId?: string | null;
  createdByDisplayName: string;
  assignedToDisplayName?: string;
  workflowStage?: FinanceReconciliationWorkflowStage | string;
  dedupeMode?: "active" | "all";
}) {
  const target = await resolveFinanceIssueTarget({
    scope: input.scope,
    orderRef: input.orderRef,
    paymentReference: input.paymentReference,
  });
  const scope = target.scope;
  const rechargeOrder = target.rechargeOrder;
  const membershipOrder = target.membershipOrder;
  const contentOrder = target.contentOrder;
  const issueType = input.issueType?.trim() || "manual_review";
  const severity = normalizeFinanceReconciliationIssueSeverity(input.severity);
  const dedupeMode = input.dedupeMode ?? "active";
  const resolvedOrderRef =
    rechargeOrder?.orderNo ??
    (membershipOrder ? `MEM-${membershipOrder.id.slice(-8).toUpperCase()}` : undefined) ??
    (contentOrder ? `CNT-${contentOrder.id.slice(-8).toUpperCase()}` : undefined);
  const summary =
    input.summary?.trim() ||
    (resolvedOrderRef ? `${resolvedOrderRef} 待人工复核` : "财务对账问题待复核");

  const detail = input.detail?.trim() || undefined;
  const paymentReference =
    input.paymentReference?.trim() ||
    rechargeOrder?.paymentReference ||
    membershipOrder?.paymentReference ||
    contentOrder?.paymentReference ||
    undefined;

  if (!summary) {
    throw new Error("FINANCE_RECONCILIATION_SUMMARY_REQUIRED");
  }

  if (rechargeOrder || membershipOrder || contentOrder) {
    const existing = await prisma.financeReconciliationIssue.findFirst({
      where: ({
        rechargeOrderId: rechargeOrder?.id,
        membershipOrderId: membershipOrder?.id,
        contentOrderId: contentOrder?.id,
        issueType,
        ...(dedupeMode === "active"
          ? {
              status: {
                in: ["open", "reviewing"],
              },
            }
          : {}),
      }) as any,
      include: {
        rechargeOrder: {
          select: {
            orderNo: true,
            user: {
              select: {
                displayName: true,
                email: true,
              },
            },
          },
        },
        membershipOrder: {
          select: {
            id: true,
            planId: true,
            user: {
              select: {
                displayName: true,
                email: true,
              },
            },
          },
        },
        contentOrder: {
          select: {
            id: true,
            contentId: true,
            user: {
              select: {
                displayName: true,
                email: true,
              },
            },
          },
        },
      } as any,
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (existing) {
      return {
        issue: toAdminFinanceReconciliationIssueRecord(existing),
        created: false,
      };
    }
  }

  const created = await prisma.financeReconciliationIssue.create({
    data: ({
      scope,
      issueType,
      status: "open",
      severity,
      summary,
      detail: detail ?? null,
      reasonCode: input.reasonCode?.trim() || null,
      paymentReference: paymentReference ?? null,
      amount: rechargeOrder?.amount ?? membershipOrder?.amount ?? contentOrder?.amount ?? null,
      sourceStatus: rechargeOrder?.status ?? membershipOrder?.status ?? contentOrder?.status ?? null,
      workflowStage: inferWorkflowStageFromStatus(
        "open",
        input.workflowStage,
      ),
      assignedToDisplayName: input.assignedToDisplayName?.trim() || input.createdByDisplayName.trim() || null,
      createdByDisplayName: input.createdByDisplayName.trim() || "Admin",
      rechargeOrderId: rechargeOrder?.id ?? null,
      membershipOrderId: membershipOrder?.id ?? null,
      contentOrderId: contentOrder?.id ?? null,
      createdByUserId: input.createdByUserId ?? null,
    }) as any,
    include: ({
      rechargeOrder: {
        select: {
          orderNo: true,
          user: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      },
      membershipOrder: {
        select: {
          id: true,
          planId: true,
          user: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      },
      contentOrder: {
        select: {
          id: true,
          contentId: true,
          user: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      },
    }) as any,
  });

  safeRevalidate(siteSurfacePaths);
  return {
    issue: toAdminFinanceReconciliationIssueRecord(created),
    created: true,
  };
}

export async function updateFinanceReconciliationIssue(input: {
  issueId: string;
  status?: FinanceReconciliationIssueStatus | string;
  resolutionNote?: string;
  detail?: string;
  assignedToDisplayName?: string;
  workflowStage?: FinanceReconciliationWorkflowStage | string;
  remind?: boolean;
  reminderNote?: string;
}) {
  const existing = await prisma.financeReconciliationIssue.findUnique({
    where: { id: input.issueId },
    select: {
      id: true,
      status: true,
      workflowStage: true,
    },
  });

  if (!existing) {
    throw new Error("FINANCE_RECONCILIATION_ISSUE_NOT_FOUND");
  }

  const nextStatus = input.status ? normalizeFinanceReconciliationIssueStatus(input.status) : undefined;
  const nextWorkflowStage =
    input.workflowStage || nextStatus
      ? inferWorkflowStageFromStatus(
          nextStatus ?? normalizeFinanceReconciliationIssueStatus(existing.status),
          input.workflowStage ?? existing.workflowStage,
        )
      : undefined;
  const updated = await prisma.financeReconciliationIssue.update({
    where: { id: input.issueId },
    data: {
      status: nextStatus,
      workflowStage: nextWorkflowStage,
      resolutionNote:
        typeof input.resolutionNote === "string"
          ? input.resolutionNote.trim() || null
          : undefined,
      detail:
        typeof input.detail === "string"
          ? input.detail.trim() || null
          : undefined,
      assignedToDisplayName:
        typeof input.assignedToDisplayName === "string"
          ? input.assignedToDisplayName.trim() || null
          : undefined,
      reminderCount: input.remind ? { increment: 1 } : undefined,
      lastRemindedAt: input.remind ? new Date() : undefined,
      lastReminderNote:
        typeof input.reminderNote === "string"
          ? input.reminderNote.trim() || null
          : input.remind
            ? null
            : undefined,
      resolvedAt:
        nextStatus === "resolved" || nextStatus === "ignored"
          ? new Date()
          : nextStatus === "open" || nextStatus === "reviewing"
            ? null
            : undefined,
    },
    include: ({
      rechargeOrder: {
        select: {
          orderNo: true,
          user: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      },
      membershipOrder: {
        select: {
          id: true,
          planId: true,
          user: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      },
      contentOrder: {
        select: {
          id: true,
          contentId: true,
          user: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      },
    }) as any,
  });

  safeRevalidate(siteSurfacePaths);
  return toAdminFinanceReconciliationIssueRecord(updated);
}

type BatchFinanceReconciliationAction =
  | "review"
  | "resolve"
  | "ignore"
  | "reopen"
  | "remind"
  | "assign";

export async function batchUpdateFinanceReconciliationIssues(input: {
  issueIds: string[];
  action: BatchFinanceReconciliationAction;
  resolutionNote?: string;
  assignedToDisplayName?: string;
  workflowStage?: FinanceReconciliationWorkflowStage | string;
}) {
  const issueIds = normalizeUniqueValues(input.issueIds);

  if (issueIds.length === 0) {
    throw new Error("FINANCE_RECONCILIATION_BATCH_EMPTY");
  }

  const issues = await prisma.financeReconciliationIssue.findMany({
    where: {
      id: {
        in: issueIds,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  const issueMap = new Map(issues.map((issue) => [issue.id, issue]));
  let processedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const issueId of issueIds) {
    const existing = issueMap.get(issueId);

    if (!existing) {
      failedCount += 1;
      continue;
    }

    if (
      input.action === "review" &&
      existing.status !== "open"
    ) {
      skippedCount += 1;
      continue;
    }

    if (
      (input.action === "resolve" || input.action === "ignore") &&
      existing.status !== "open" &&
      existing.status !== "reviewing"
    ) {
      skippedCount += 1;
      continue;
    }

    if (input.action === "reopen" && existing.status !== "resolved" && existing.status !== "ignored") {
      skippedCount += 1;
      continue;
    }

    try {
      if (input.action === "review") {
        await updateFinanceReconciliationIssue({
          issueId,
          status: "reviewing",
          resolutionNote: input.resolutionNote,
          assignedToDisplayName: input.assignedToDisplayName,
          workflowStage: input.workflowStage ?? "investigating",
        });
      } else if (input.action === "resolve") {
        await updateFinanceReconciliationIssue({
          issueId,
          status: "resolved",
          resolutionNote: input.resolutionNote,
          assignedToDisplayName: input.assignedToDisplayName,
          workflowStage: "closed",
        });
      } else if (input.action === "ignore") {
        await updateFinanceReconciliationIssue({
          issueId,
          status: "ignored",
          resolutionNote: input.resolutionNote,
          assignedToDisplayName: input.assignedToDisplayName,
          workflowStage: "closed",
        });
      } else if (input.action === "reopen") {
        await updateFinanceReconciliationIssue({
          issueId,
          status: "open",
          resolutionNote: input.resolutionNote,
          assignedToDisplayName: input.assignedToDisplayName,
          workflowStage: input.workflowStage ?? "triage",
        });
      } else if (input.action === "assign") {
        await updateFinanceReconciliationIssue({
          issueId,
          assignedToDisplayName: input.assignedToDisplayName,
          resolutionNote: input.resolutionNote,
          workflowStage: input.workflowStage,
        });
      } else {
        await updateFinanceReconciliationIssue({
          issueId,
          assignedToDisplayName: input.assignedToDisplayName,
          workflowStage: input.workflowStage,
          remind: true,
          reminderNote: input.resolutionNote,
        });
      }

      processedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  return {
    totalCount: issueIds.length,
    processedCount,
    skippedCount,
    failedCount,
  };
}

export async function runFinanceReconciliationReminderScan(input?: {
  maxCount?: number;
  minIntervalHours?: number;
  assignedToDisplayName?: string;
  actorDisplayName?: string;
}) {
  const now = Date.now();
  const minIntervalHours = Math.max(1, input?.minIntervalHours ?? 6);
  const issues = await prisma.financeReconciliationIssue.findMany({
    where: {
      status: {
        in: ["open", "reviewing"],
      },
    },
    orderBy: [{ updatedAt: "asc" }],
    take: Math.max(1, input?.maxCount ?? 40),
    include: ({
      rechargeOrder: {
        select: {
          orderNo: true,
          user: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      },
      membershipOrder: {
        select: {
          id: true,
          planId: true,
          user: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      },
      contentOrder: {
        select: {
          id: true,
          contentId: true,
          user: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      },
    }) as any,
  });

  let processedCount = 0;
  let skippedCount = 0;

  for (const issue of issues) {
    const record = toAdminFinanceReconciliationIssueRecord(issue);
    const recentlyReminded =
      issue.lastRemindedAt &&
      issue.lastRemindedAt.getTime() > now - minIntervalHours * 60 * 60 * 1000;

    if (!record.isOverdue || recentlyReminded) {
      skippedCount += 1;
      continue;
    }

    await updateFinanceReconciliationIssue({
      issueId: issue.id,
      assignedToDisplayName: input?.assignedToDisplayName,
      remind: true,
      reminderNote:
        input?.actorDisplayName?.trim()
          ? `System reminder by ${input.actorDisplayName.trim()}`
          : "System reminder for overdue finance issue.",
    });
    processedCount += 1;
  }

  return {
    totalCount: issues.length,
    processedCount,
    skippedCount,
    failedCount: Math.max(0, issues.length - processedCount - skippedCount),
  };
}

export async function scanFinanceReconciliationIssues(input?: {
  now?: Date;
  stalePendingHours?: number;
  createdByUserId?: string | null;
  createdByDisplayName?: string;
  scope?: FinanceReconciliationScanScope | string;
}) {
  const now = input?.now ?? new Date();
  const stalePendingHours = Math.max(1, input?.stalePendingHours ?? 24);
  const stalePendingThreshold = new Date(now.getTime() - stalePendingHours * 60 * 60 * 1000);
  const actorDisplayName = input?.createdByDisplayName?.trim() || "System";
  const actorUserId = input?.createdByUserId ?? null;
  const scanScope = normalizeFinanceReconciliationScanScope(input?.scope ?? "all");

  if (scanScope !== "all" && scanScope !== "coin-recharge") {
    return scanAdditionalFinanceReconciliationScopes({
      now,
      stalePendingHours,
      stalePendingThreshold,
      actorDisplayName,
      actorUserId,
      scope: scanScope,
    });
  }

  const [stalePendingOrders, failedOrders, refundedOrders, paidMissingCreditOrders, ordersWithPaymentRefs, callbackEvents] = await Promise.all([
    prisma.coinRechargeOrder.findMany({
      where: {
        status: "pending",
        createdAt: {
          lt: stalePendingThreshold,
        },
      },
      select: {
        id: true,
        orderNo: true,
        amount: true,
        status: true,
        paymentReference: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 120,
    }),
    prisma.coinRechargeOrder.findMany({
      where: {
        status: "failed",
      },
      select: {
        id: true,
        orderNo: true,
        amount: true,
        status: true,
        paymentReference: true,
        failureReason: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 120,
    }),
    prisma.coinRechargeOrder.findMany({
      where: {
        status: "refunded",
      },
      select: {
        id: true,
        orderNo: true,
        amount: true,
        status: true,
        paymentReference: true,
        refundReason: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 120,
    }),
    prisma.coinRechargeOrder.findMany({
      where: {
        status: "paid",
        creditedAt: null,
      },
      select: {
        id: true,
        orderNo: true,
        amount: true,
        status: true,
        paymentReference: true,
        paidAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 120,
    }),
    prisma.coinRechargeOrder.findMany({
      where: {
        paymentReference: {
          not: null,
        },
      },
      select: {
        id: true,
        orderNo: true,
        amount: true,
        status: true,
        paymentReference: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 300,
    }),
    prisma.paymentCallbackEvent.findMany({
      where: {
        orderType: "coin-recharge",
        processingStatus: {
          in: ["received", "conflict", "failed"],
        },
      },
      select: {
        id: true,
        orderId: true,
        state: true,
        processingStatus: true,
        processingMessage: true,
        paymentReference: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 200,
    }),
  ]);

  let createdCount = 0;
  let skippedCount = 0;

  for (const order of stalePendingOrders) {
    const result = await createFinanceReconciliationIssue({
      orderRef: order.id,
      paymentReference: order.paymentReference ?? undefined,
      issueType: "stale_pending",
      severity: "high",
      summary: `充值单 ${order.orderNo} 超过 ${stalePendingHours} 小时未完成支付`,
      detail: `订单创建于 ${order.createdAt.toISOString()}，仍处于待支付状态，请核对支付通道与补单情况。`,
      reasonCode: "stale_pending",
      createdByUserId: actorUserId,
      createdByDisplayName: actorDisplayName,
      assignedToDisplayName: actorDisplayName,
      dedupeMode: "all",
    });

    if (result.created) {
      createdCount += 1;
    } else {
      skippedCount += 1;
    }
  }

  for (const order of failedOrders) {
    const result = await createFinanceReconciliationIssue({
      orderRef: order.id,
      paymentReference: order.paymentReference ?? undefined,
      issueType: "payment_failed",
      severity: "high",
      summary: `充值单 ${order.orderNo} 已标记支付失败`,
      detail: order.failureReason ?? "支付失败订单需要财务确认是否补单、重建订单或通知用户。",
      reasonCode: "payment_failed",
      createdByUserId: actorUserId,
      createdByDisplayName: actorDisplayName,
      assignedToDisplayName: actorDisplayName,
      dedupeMode: "all",
    });

    if (result.created) {
      createdCount += 1;
    } else {
      skippedCount += 1;
    }
  }

  for (const order of refundedOrders) {
    const result = await createFinanceReconciliationIssue({
      orderRef: order.id,
      paymentReference: order.paymentReference ?? undefined,
      issueType: "refund_review",
      severity: "medium",
      summary: `充值单 ${order.orderNo} 已退款，待复核回退链路`,
      detail: order.refundReason ?? "请确认球币回退、佣金冲回和财务记录是否一致。",
      reasonCode: "refund_review",
      createdByUserId: actorUserId,
      createdByDisplayName: actorDisplayName,
      assignedToDisplayName: actorDisplayName,
      dedupeMode: "all",
    });

    if (result.created) {
      createdCount += 1;
    } else {
      skippedCount += 1;
    }
  }

  for (const order of paidMissingCreditOrders) {
    const result = await createFinanceReconciliationIssue({
      orderRef: order.id,
      paymentReference: order.paymentReference ?? undefined,
      issueType: "credit_missing",
      severity: "high",
      summary: `充值单 ${order.orderNo} 已支付但未完成入账`,
      detail: `支付时间 ${order.paidAt?.toISOString() ?? "--"}，请检查球币账户与回调处理链路。`,
      reasonCode: "credit_missing",
      createdByUserId: actorUserId,
      createdByDisplayName: actorDisplayName,
      assignedToDisplayName: actorDisplayName,
      dedupeMode: "all",
    });

    if (result.created) {
      createdCount += 1;
    } else {
      skippedCount += 1;
    }
  }

  const duplicatePaymentReferenceMap = new Map<string, RechargeOrderSignalSnapshot[]>();

  for (const order of ordersWithPaymentRefs) {
    const paymentReference = order.paymentReference?.trim();

    if (!paymentReference) {
      continue;
    }

    const existing = duplicatePaymentReferenceMap.get(paymentReference) ?? [];
    existing.push(order);
    duplicatePaymentReferenceMap.set(paymentReference, existing);
  }

  for (const [paymentReference, orders] of duplicatePaymentReferenceMap) {
    if (orders.length < 2) {
      continue;
    }

    for (const order of orders) {
      const result = await createFinanceReconciliationIssue({
        orderRef: order.id,
        paymentReference,
        issueType: "duplicate_payment_reference",
        severity: "high",
        summary: `充值单 ${order.orderNo} 命中重复支付流水`,
        detail: `支付流水 ${paymentReference} 在 ${orders.length} 笔订单中重复出现，请复核是否重复补单或回调串单。`,
        reasonCode: "duplicate_payment_reference",
        createdByUserId: actorUserId,
        createdByDisplayName: actorDisplayName,
        assignedToDisplayName: actorDisplayName,
        workflowStage: "awaiting-finance",
        dedupeMode: "all",
      });

      if (result.created) {
        createdCount += 1;
      } else {
        skippedCount += 1;
      }
    }
  }

  const callbackOrderIds = normalizeUniqueValues(
    callbackEvents.map((event) => event.orderId ?? "").filter(Boolean),
  );
  const callbackOrders = callbackOrderIds.length
    ? await prisma.coinRechargeOrder.findMany({
        where: {
          id: {
            in: callbackOrderIds,
          },
        },
        select: {
          id: true,
          orderNo: true,
          status: true,
          paymentReference: true,
        },
      })
    : [];
  const callbackOrderMap = new Map(callbackOrders.map((order) => [order.id, order]));

  for (const event of callbackEvents) {
    const order = event.orderId ? callbackOrderMap.get(event.orderId) : undefined;

    if (!order) {
      skippedCount += 1;
      continue;
    }

    if (
      event.processingStatus === "received" &&
      event.state === "paid" &&
      order.status !== "paid"
    ) {
      const result = await createFinanceReconciliationIssue({
        orderRef: order.id,
        paymentReference: event.paymentReference ?? order.paymentReference ?? undefined,
        issueType: "callback_pending_state",
        severity: "high",
        summary: `充值单 ${order.orderNo} 回调已收但订单未推进`,
        detail: `回调状态为 ${event.state}，当前订单状态仍为 ${order.status}。请检查回调重试、幂等与入账链路。`,
        reasonCode: "callback_pending_state",
        createdByUserId: actorUserId,
        createdByDisplayName: actorDisplayName,
        assignedToDisplayName: actorDisplayName,
        workflowStage: "awaiting-callback",
        dedupeMode: "all",
      });

      if (result.created) {
        createdCount += 1;
      } else {
        skippedCount += 1;
      }
      continue;
    }

    if (event.processingStatus === "conflict" || event.processingStatus === "failed") {
      const result = await createFinanceReconciliationIssue({
        orderRef: order.id,
        paymentReference: event.paymentReference ?? order.paymentReference ?? undefined,
        issueType: "order_status_conflict",
        severity: event.processingStatus === "conflict" ? "high" : "medium",
        summary: `充值单 ${order.orderNo} 存在回调状态冲突`,
        detail: event.processingMessage ?? `支付回调处理状态为 ${event.processingStatus}，请复核订单状态与支付流水。`,
        reasonCode: event.processingStatus,
        createdByUserId: actorUserId,
        createdByDisplayName: actorDisplayName,
        assignedToDisplayName: actorDisplayName,
        workflowStage: "awaiting-finance",
        dedupeMode: "all",
      });

      if (result.created) {
        createdCount += 1;
      } else {
        skippedCount += 1;
      }
    }
  }

  const baseSummary = {
    scope: scanScope,
    totalCount:
      stalePendingOrders.length +
      failedOrders.length +
      refundedOrders.length +
      paidMissingCreditOrders.length +
      ordersWithPaymentRefs.length +
      callbackEvents.length,
    createdCount,
    skippedCount,
  };

  if (scanScope !== "all") {
    return baseSummary;
  }

  const extraSummary = await scanAdditionalFinanceReconciliationScopes({
    now,
    stalePendingHours,
    stalePendingThreshold,
    actorDisplayName,
    actorUserId,
    scope: "all",
  });

  return {
    scope: "all" as const,
    totalCount: baseSummary.totalCount + extraSummary.totalCount,
    createdCount: baseSummary.createdCount + extraSummary.createdCount,
    skippedCount: baseSummary.skippedCount + extraSummary.skippedCount,
  };
}

async function scanAdditionalFinanceReconciliationScopes(input: {
  now: Date;
  stalePendingHours: number;
  stalePendingThreshold: Date;
  actorDisplayName: string;
  actorUserId: string | null;
  scope: "membership" | "content" | "all";
}) {
  let totalCount = 0;
  let createdCount = 0;
  let skippedCount = 0;

  if (input.scope === "all" || input.scope === "membership") {
    const summary = await scanMembershipFinanceReconciliationIssues(input);
    totalCount += summary.totalCount;
    createdCount += summary.createdCount;
    skippedCount += summary.skippedCount;
  }

  if (input.scope === "all" || input.scope === "content") {
    const summary = await scanContentFinanceReconciliationIssues(input);
    totalCount += summary.totalCount;
    createdCount += summary.createdCount;
    skippedCount += summary.skippedCount;
  }

  return {
    scope: input.scope,
    totalCount,
    createdCount,
    skippedCount,
  };
}

async function scanMembershipFinanceReconciliationIssues(input: {
  now: Date;
  stalePendingHours: number;
  stalePendingThreshold: Date;
  actorDisplayName: string;
  actorUserId: string | null;
}) {
  const [stalePendingOrders, failedOrders, refundedOrders, paidOrders, ordersWithPaymentRefs, callbackEvents] =
    await Promise.all([
      prisma.membershipOrder.findMany({
        where: {
          status: "pending",
          createdAt: {
            lt: input.stalePendingThreshold,
          },
        },
        select: {
          id: true,
          planId: true,
          paymentReference: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
        take: 120,
      }),
      prisma.membershipOrder.findMany({
        where: {
          status: "failed",
        },
        select: {
          id: true,
          planId: true,
          paymentReference: true,
          failureReason: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 120,
      }),
      prisma.membershipOrder.findMany({
        where: {
          status: "refunded",
        },
        select: {
          id: true,
          planId: true,
          paymentReference: true,
          refundReason: true,
          user: {
            select: {
              membershipExpiresAt: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 120,
      }),
      prisma.membershipOrder.findMany({
        where: {
          status: "paid",
        },
        select: {
          id: true,
          planId: true,
          paymentReference: true,
          paidAt: true,
          user: {
            select: {
              membershipExpiresAt: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 180,
      }),
      prisma.membershipOrder.findMany({
        where: {
          paymentReference: {
            not: null,
          },
        },
        select: {
          id: true,
          planId: true,
          paymentReference: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 300,
      }),
      prisma.paymentCallbackEvent.findMany({
        where: {
          orderType: "membership",
          processingStatus: {
            in: ["received", "conflict", "failed"],
          },
        },
        select: {
          orderId: true,
          state: true,
          processingStatus: true,
          processingMessage: true,
          paymentReference: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
    ]);

  let createdCount = 0;
  let skippedCount = 0;
  const track = (created: boolean) => {
    if (created) {
      createdCount += 1;
    } else {
      skippedCount += 1;
    }
  };

  for (const order of stalePendingOrders) {
    const result = await createFinanceReconciliationIssue({
      scope: "membership",
      orderRef: order.id,
      paymentReference: order.paymentReference ?? undefined,
      issueType: "stale_pending",
      severity: "high",
      summary: `会员订单 MEM-${order.id.slice(-8).toUpperCase()} 超过 ${input.stalePendingHours} 小时未完成支付`,
      detail: `订单创建于 ${order.createdAt.toISOString()}，方案 ${order.planId} 仍处于待支付状态。`,
      reasonCode: "stale_pending",
      createdByUserId: input.actorUserId,
      createdByDisplayName: input.actorDisplayName,
      assignedToDisplayName: input.actorDisplayName,
      dedupeMode: "all",
    });
    track(result.created);
  }

  for (const order of failedOrders) {
    const result = await createFinanceReconciliationIssue({
      scope: "membership",
      orderRef: order.id,
      paymentReference: order.paymentReference ?? undefined,
      issueType: "payment_failed",
      severity: "high",
      summary: `会员订单 MEM-${order.id.slice(-8).toUpperCase()} 已标记支付失败`,
      detail: order.failureReason ?? `会员方案 ${order.planId} 的支付失败订单需要复核补单或关闭。`,
      reasonCode: "payment_failed",
      createdByUserId: input.actorUserId,
      createdByDisplayName: input.actorDisplayName,
      assignedToDisplayName: input.actorDisplayName,
      dedupeMode: "all",
    });
    track(result.created);
  }

  for (const order of refundedOrders) {
    if (!(order.user.membershipExpiresAt && order.user.membershipExpiresAt > input.now)) {
      continue;
    }

    const result = await createFinanceReconciliationIssue({
      scope: "membership",
      orderRef: order.id,
      paymentReference: order.paymentReference ?? undefined,
      issueType: "refund_reversal_missing",
      severity: "medium",
      summary: `会员订单 MEM-${order.id.slice(-8).toUpperCase()} 已退款但权益仍有效`,
      detail:
        order.refundReason ??
        `订单已退款，但用户会员仍有效至 ${order.user.membershipExpiresAt.toISOString()}，请确认是否存在覆盖订单或回退遗漏。`,
      reasonCode: "refund_reversal_missing",
      createdByUserId: input.actorUserId,
      createdByDisplayName: input.actorDisplayName,
      assignedToDisplayName: input.actorDisplayName,
      dedupeMode: "all",
    });
    track(result.created);
  }

  for (const order of paidOrders) {
    if (order.user.membershipExpiresAt && order.user.membershipExpiresAt > input.now) {
      continue;
    }

    const result = await createFinanceReconciliationIssue({
      scope: "membership",
      orderRef: order.id,
      paymentReference: order.paymentReference ?? undefined,
      issueType: "entitlement_missing",
      severity: "high",
      summary: `会员订单 MEM-${order.id.slice(-8).toUpperCase()} 已支付但会员仍未生效`,
      detail: `支付时间 ${order.paidAt?.toISOString() ?? "--"}，当前到期 ${order.user.membershipExpiresAt?.toISOString() ?? "--"}，请核对会员生效链路。`,
      reasonCode: "entitlement_missing",
      createdByUserId: input.actorUserId,
      createdByDisplayName: input.actorDisplayName,
      assignedToDisplayName: input.actorDisplayName,
      dedupeMode: "all",
    });
    track(result.created);
  }

  const duplicatePaymentReferenceMap = new Map<string, typeof ordersWithPaymentRefs>();
  for (const order of ordersWithPaymentRefs) {
    const paymentReference = order.paymentReference?.trim();
    if (!paymentReference) {
      continue;
    }

    const existing = duplicatePaymentReferenceMap.get(paymentReference) ?? [];
    existing.push(order);
    duplicatePaymentReferenceMap.set(paymentReference, existing);
  }

  for (const [paymentReference, orders] of duplicatePaymentReferenceMap) {
    if (orders.length < 2) {
      continue;
    }

    for (const order of orders) {
      const result = await createFinanceReconciliationIssue({
        scope: "membership",
        orderRef: order.id,
        paymentReference,
        issueType: "duplicate_payment_reference",
        severity: "high",
        summary: `会员订单 MEM-${order.id.slice(-8).toUpperCase()} 命中重复支付流水`,
        detail: `支付流水 ${paymentReference} 在 ${orders.length} 笔会员订单中重复出现，请复核回调串单或补单逻辑。`,
        reasonCode: "duplicate_payment_reference",
        createdByUserId: input.actorUserId,
        createdByDisplayName: input.actorDisplayName,
        assignedToDisplayName: input.actorDisplayName,
        workflowStage: "awaiting-finance",
        dedupeMode: "all",
      });
      track(result.created);
    }
  }

  const callbackOrderIds = normalizeUniqueValues(callbackEvents.map((event) => event.orderId ?? "").filter(Boolean));
  const callbackOrders = callbackOrderIds.length
    ? await prisma.membershipOrder.findMany({
        where: {
          id: {
            in: callbackOrderIds,
          },
        },
        select: {
          id: true,
          status: true,
          paymentReference: true,
        },
      })
    : [];
  const callbackOrderMap = new Map(callbackOrders.map((order) => [order.id, order]));

  for (const event of callbackEvents) {
    const order = event.orderId ? callbackOrderMap.get(event.orderId) : undefined;
    if (!order) {
      skippedCount += 1;
      continue;
    }

    if (event.processingStatus === "received" && event.state === "paid" && order.status !== "paid") {
      const result = await createFinanceReconciliationIssue({
        scope: "membership",
        orderRef: order.id,
        paymentReference: event.paymentReference ?? order.paymentReference ?? undefined,
        issueType: "callback_pending_state",
        severity: "high",
        summary: `会员订单 MEM-${order.id.slice(-8).toUpperCase()} 回调已收但订单未推进`,
        detail: `回调状态为 ${event.state}，当前订单状态仍为 ${order.status}，请检查会员生效链路。`,
        reasonCode: "callback_pending_state",
        createdByUserId: input.actorUserId,
        createdByDisplayName: input.actorDisplayName,
        assignedToDisplayName: input.actorDisplayName,
        workflowStage: "awaiting-callback",
        dedupeMode: "all",
      });
      track(result.created);
      continue;
    }

    if (event.processingStatus === "conflict" || event.processingStatus === "failed") {
      const result = await createFinanceReconciliationIssue({
        scope: "membership",
        orderRef: order.id,
        paymentReference: event.paymentReference ?? order.paymentReference ?? undefined,
        issueType: "order_status_conflict",
        severity: event.processingStatus === "conflict" ? "high" : "medium",
        summary: `会员订单 MEM-${order.id.slice(-8).toUpperCase()} 存在回调状态冲突`,
        detail: event.processingMessage ?? `支付回调处理状态为 ${event.processingStatus}，请复核会员订单状态。`,
        reasonCode: event.processingStatus,
        createdByUserId: input.actorUserId,
        createdByDisplayName: input.actorDisplayName,
        assignedToDisplayName: input.actorDisplayName,
        workflowStage: "awaiting-finance",
        dedupeMode: "all",
      });
      track(result.created);
    }
  }

  return {
    totalCount:
      stalePendingOrders.length +
      failedOrders.length +
      refundedOrders.length +
      paidOrders.length +
      ordersWithPaymentRefs.length +
      callbackEvents.length,
    createdCount,
    skippedCount,
  };
}

async function scanContentFinanceReconciliationIssues(input: {
  now: Date;
  stalePendingHours: number;
  stalePendingThreshold: Date;
  actorDisplayName: string;
  actorUserId: string | null;
}) {
  const [stalePendingOrders, failedOrders, refundedOrders, ordersWithPaymentRefs, callbackEvents] = await Promise.all([
    prisma.contentOrder.findMany({
      where: {
        status: "pending",
        createdAt: {
          lt: input.stalePendingThreshold,
        },
      },
      select: {
        id: true,
        contentId: true,
        paymentReference: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
      take: 120,
    }),
    prisma.contentOrder.findMany({
      where: {
        status: "failed",
      },
      select: {
        id: true,
        contentId: true,
        paymentReference: true,
        failureReason: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 120,
    }),
    prisma.contentOrder.findMany({
      where: {
        status: "refunded",
      },
      select: {
        id: true,
        contentId: true,
        paymentReference: true,
        refundReason: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 120,
    }),
    prisma.contentOrder.findMany({
      where: {
        paymentReference: {
          not: null,
        },
      },
      select: {
        id: true,
        contentId: true,
        paymentReference: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 300,
    }),
    prisma.paymentCallbackEvent.findMany({
      where: {
        orderType: "content",
        processingStatus: {
          in: ["received", "conflict", "failed"],
        },
      },
      select: {
        orderId: true,
        state: true,
        processingStatus: true,
        processingMessage: true,
        paymentReference: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
  ]);

  let createdCount = 0;
  let skippedCount = 0;
  const track = (created: boolean) => {
    if (created) {
      createdCount += 1;
    } else {
      skippedCount += 1;
    }
  };

  for (const order of stalePendingOrders) {
    const result = await createFinanceReconciliationIssue({
      scope: "content",
      orderRef: order.id,
      paymentReference: order.paymentReference ?? undefined,
      issueType: "stale_pending",
      severity: "high",
      summary: `内容订单 CNT-${order.id.slice(-8).toUpperCase()} 超过 ${input.stalePendingHours} 小时未完成支付`,
      detail: `订单创建于 ${order.createdAt.toISOString()}，内容 ${order.contentId} 仍处于待支付状态。`,
      reasonCode: "stale_pending",
      createdByUserId: input.actorUserId,
      createdByDisplayName: input.actorDisplayName,
      assignedToDisplayName: input.actorDisplayName,
      dedupeMode: "all",
    });
    track(result.created);
  }

  for (const order of failedOrders) {
    const result = await createFinanceReconciliationIssue({
      scope: "content",
      orderRef: order.id,
      paymentReference: order.paymentReference ?? undefined,
      issueType: "payment_failed",
      severity: "high",
      summary: `内容订单 CNT-${order.id.slice(-8).toUpperCase()} 已标记支付失败`,
      detail: order.failureReason ?? `内容 ${order.contentId} 的支付失败订单需要复核补单或关闭。`,
      reasonCode: "payment_failed",
      createdByUserId: input.actorUserId,
      createdByDisplayName: input.actorDisplayName,
      assignedToDisplayName: input.actorDisplayName,
      dedupeMode: "all",
    });
    track(result.created);
  }

  for (const order of refundedOrders) {
    const result = await createFinanceReconciliationIssue({
      scope: "content",
      orderRef: order.id,
      paymentReference: order.paymentReference ?? undefined,
      issueType: "refund_review",
      severity: "medium",
      summary: `内容订单 CNT-${order.id.slice(-8).toUpperCase()} 已退款，待复核回退链路`,
      detail: order.refundReason ?? `请确认内容 ${order.contentId} 的退款、球币回退或人工补偿记录是否一致。`,
      reasonCode: "refund_review",
      createdByUserId: input.actorUserId,
      createdByDisplayName: input.actorDisplayName,
      assignedToDisplayName: input.actorDisplayName,
      dedupeMode: "all",
    });
    track(result.created);
  }

  const duplicatePaymentReferenceMap = new Map<string, typeof ordersWithPaymentRefs>();
  for (const order of ordersWithPaymentRefs) {
    const paymentReference = order.paymentReference?.trim();
    if (!paymentReference) {
      continue;
    }

    const existing = duplicatePaymentReferenceMap.get(paymentReference) ?? [];
    existing.push(order);
    duplicatePaymentReferenceMap.set(paymentReference, existing);
  }

  for (const [paymentReference, orders] of duplicatePaymentReferenceMap) {
    if (orders.length < 2) {
      continue;
    }

    for (const order of orders) {
      const result = await createFinanceReconciliationIssue({
        scope: "content",
        orderRef: order.id,
        paymentReference,
        issueType: "duplicate_payment_reference",
        severity: "high",
        summary: `内容订单 CNT-${order.id.slice(-8).toUpperCase()} 命中重复支付流水`,
        detail: `支付流水 ${paymentReference} 在 ${orders.length} 笔内容订单中重复出现，请复核回调串单或补单逻辑。`,
        reasonCode: "duplicate_payment_reference",
        createdByUserId: input.actorUserId,
        createdByDisplayName: input.actorDisplayName,
        assignedToDisplayName: input.actorDisplayName,
        workflowStage: "awaiting-finance",
        dedupeMode: "all",
      });
      track(result.created);
    }
  }

  const callbackOrderIds = normalizeUniqueValues(callbackEvents.map((event) => event.orderId ?? "").filter(Boolean));
  const callbackOrders = callbackOrderIds.length
    ? await prisma.contentOrder.findMany({
        where: {
          id: {
            in: callbackOrderIds,
          },
        },
        select: {
          id: true,
          status: true,
          paymentReference: true,
        },
      })
    : [];
  const callbackOrderMap = new Map(callbackOrders.map((order) => [order.id, order]));

  for (const event of callbackEvents) {
    const order = event.orderId ? callbackOrderMap.get(event.orderId) : undefined;
    if (!order) {
      skippedCount += 1;
      continue;
    }

    if (event.processingStatus === "received" && event.state === "paid" && order.status !== "paid") {
      const result = await createFinanceReconciliationIssue({
        scope: "content",
        orderRef: order.id,
        paymentReference: event.paymentReference ?? order.paymentReference ?? undefined,
        issueType: "callback_pending_state",
        severity: "high",
        summary: `内容订单 CNT-${order.id.slice(-8).toUpperCase()} 回调已收但订单未推进`,
        detail: `回调状态为 ${event.state}，当前订单状态仍为 ${order.status}，请检查内容解锁链路。`,
        reasonCode: "callback_pending_state",
        createdByUserId: input.actorUserId,
        createdByDisplayName: input.actorDisplayName,
        assignedToDisplayName: input.actorDisplayName,
        workflowStage: "awaiting-callback",
        dedupeMode: "all",
      });
      track(result.created);
      continue;
    }

    if (event.processingStatus === "conflict" || event.processingStatus === "failed") {
      const result = await createFinanceReconciliationIssue({
        scope: "content",
        orderRef: order.id,
        paymentReference: event.paymentReference ?? order.paymentReference ?? undefined,
        issueType: "order_status_conflict",
        severity: event.processingStatus === "conflict" ? "high" : "medium",
        summary: `内容订单 CNT-${order.id.slice(-8).toUpperCase()} 存在回调状态冲突`,
        detail: event.processingMessage ?? `支付回调处理状态为 ${event.processingStatus}，请复核内容订单状态。`,
        reasonCode: event.processingStatus,
        createdByUserId: input.actorUserId,
        createdByDisplayName: input.actorDisplayName,
        assignedToDisplayName: input.actorDisplayName,
        workflowStage: "awaiting-finance",
        dedupeMode: "all",
      });
      track(result.created);
    }
  }

  return {
    totalCount:
      stalePendingOrders.length +
      failedOrders.length +
      refundedOrders.length +
      ordersWithPaymentRefs.length +
      callbackEvents.length,
    createdCount,
    skippedCount,
  };
}

export async function closeExpiredCoinRechargeOrders(input?: {
  now?: Date;
}) {
  const now = input?.now ?? new Date();
  const expiredOrders = await prisma.coinRechargeOrder.findMany({
    where: {
      status: "pending",
      expiresAt: {
        not: null,
        lt: now,
      },
    },
    select: {
      id: true,
    },
  });

  if (expiredOrders.length === 0) {
    return {
      closedCount: 0,
    };
  }

  await prisma.coinRechargeOrder.updateMany({
    where: {
      id: {
        in: expiredOrders.map((item) => item.id),
      },
    },
    data: {
      status: "closed",
      closedAt: now,
      failureReason: null,
      failedAt: null,
      refundedAt: null,
      refundReason: null,
    },
  });

  for (const order of expiredOrders) {
    await syncRechargeOrderReconciliationIssues({
      orderId: order.id,
      createdByDisplayName: "System",
    });
  }

  safeRevalidate(siteSurfacePaths);

  return {
    closedCount: expiredOrders.length,
  };
}

export async function getAdminFinanceDashboard(locale: Locale): Promise<AdminFinanceDashboard> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const now = new Date();
  const stalePendingThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    packagesRaw,
    recentOrdersRaw,
    rechargeTodayCount,
    activePackageCount,
    pendingRechargeCount,
    paidRechargeAggregate,
    totalCoinBalanceAggregate,
    coinAccountsRaw,
    recentLedgersRaw,
    rechargePaidAggregate,
    rechargeRefundedAggregate,
    rechargePendingAggregate,
    expiredPendingCount,
    stalePendingCount,
    userOptionsRaw,
    paidContentOrders,
    reconciliationIssuesRaw,
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
    prisma.coinAccount.findMany({
      take: 8,
      orderBy: [{ balance: "desc" }, { updatedAt: "desc" }],
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    }),
    prisma.coinLedger.findMany({
      take: 12,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        account: {
          include: {
            user: {
              select: {
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
    }),
    prisma.coinRechargeOrder.aggregate({
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      where: {
        status: "paid",
      },
    }),
    prisma.coinRechargeOrder.aggregate({
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      where: {
        status: "refunded",
      },
    }),
    prisma.coinRechargeOrder.aggregate({
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      where: {
        status: "pending",
      },
    }),
    prisma.coinRechargeOrder.count({
      where: {
        status: "pending",
        expiresAt: {
          not: null,
          lt: now,
        },
      },
    }),
    prisma.coinRechargeOrder.count({
      where: {
        status: "pending",
        createdAt: {
          lt: stalePendingThreshold,
        },
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
    prisma.financeReconciliationIssue.findMany({
      take: 48,
      orderBy: [{ updatedAt: "desc" }],
      include: ({
        rechargeOrder: {
          select: {
            orderNo: true,
            user: {
              select: {
                displayName: true,
                email: true,
              },
            },
          },
        },
        membershipOrder: {
          select: {
            id: true,
            planId: true,
            user: {
              select: {
                displayName: true,
                email: true,
              },
            },
          },
        },
        contentOrder: {
          select: {
            id: true,
            contentId: true,
            user: {
              select: {
                displayName: true,
                email: true,
              },
            },
          },
        },
      }) as any,
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
    provider: normalizePaymentProvider(order.provider),
    providerOrderId: order.providerOrderId ?? undefined,
    paymentReference: order.paymentReference ?? undefined,
    memberNote: order.memberNote ?? undefined,
    proofUrl: order.proofUrl ?? undefined,
    proofUploadedAt: order.proofUploadedAt?.toISOString(),
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

  const coinAccounts: AdminCoinAccountRecord[] = coinAccountsRaw.map((account) => ({
    userId: account.user.id,
    userDisplayName: account.user.displayName,
    userEmail: account.user.email,
    balance: account.balance,
    lifetimeCredited: account.lifetimeCredited,
    lifetimeDebited: account.lifetimeDebited,
    lastActivityAt: account.lastActivityAt?.toISOString(),
  }));

  const recentLedgers: AdminCoinLedgerRecord[] = recentLedgersRaw.map((ledger) => ({
    id: ledger.id,
    userDisplayName: ledger.account.user.displayName,
    userEmail: ledger.account.user.email,
    direction: ledger.direction === "debit" ? "debit" : "credit",
    reason: ledger.reason,
    reasonLabel: getCoinLedgerReasonLabel(locale, ledger.reason),
    amount: ledger.amount,
    balanceBefore: ledger.balanceBefore,
    balanceAfter: ledger.balanceAfter,
    note: ledger.note ?? undefined,
    referenceType: ledger.referenceType ?? undefined,
    referenceId: ledger.referenceId ?? undefined,
    createdAt: ledger.createdAt.toISOString(),
  }));

  const reconciliationIssues = reconciliationIssuesRaw.map((issue) =>
    toAdminFinanceReconciliationIssueRecord(issue),
  );
  reconciliationIssues.sort((left, right) => {
    const statusPriority = (value: FinanceReconciliationIssueStatus) => {
      if (value === "open") {
        return 0;
      }

      if (value === "reviewing") {
        return 1;
      }

      if (value === "resolved") {
        return 2;
      }

      return 3;
    };
    const severityPriority = (value: FinanceReconciliationIssueSeverity) => {
      if (value === "high") {
        return 0;
      }

      if (value === "medium") {
        return 1;
      }

      return 2;
    };
    const statusDiff = statusPriority(left.status) - statusPriority(right.status);

    if (statusDiff !== 0) {
      return statusDiff;
    }

    if (left.isOverdue !== right.isOverdue) {
      return left.isOverdue ? -1 : 1;
    }

    if (left.isUnassigned !== right.isUnassigned) {
      return left.isUnassigned ? -1 : 1;
    }

    const severityDiff = severityPriority(left.severity) - severityPriority(right.severity);

    if (severityDiff !== 0) {
      return severityDiff;
    }

    if (left.status === "resolved" || left.status === "ignored") {
      return right.updatedAt.localeCompare(left.updatedAt);
    }

    return left.updatedAt.localeCompare(right.updatedAt);
  });
  const reconciliationSummary: AdminFinanceReconciliationSummary = {
    openCount: reconciliationIssues.filter((item) => item.status === "open").length,
    reviewingCount: reconciliationIssues.filter((item) => item.status === "reviewing").length,
    resolvedCount: reconciliationIssues.filter((item) => item.status === "resolved").length,
    ignoredCount: reconciliationIssues.filter((item) => item.status === "ignored").length,
    highSeverityOpenCount: reconciliationIssues.filter(
      (item) => item.severity === "high" && (item.status === "open" || item.status === "reviewing"),
    ).length,
    overdueCount: reconciliationIssues.filter(
      (item) => item.isOverdue && (item.status === "open" || item.status === "reviewing"),
    ).length,
    unassignedActiveCount: reconciliationIssues.filter(
      (item) => item.isUnassigned && (item.status === "open" || item.status === "reviewing"),
    ).length,
  };

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
    {
      label: localizeText(
        {
          zhCn: "对账问题队列",
          zhTw: "對帳問題隊列",
          en: "Reconciliation queue",
        },
        locale,
      ),
      value: formatCompactNumber(reconciliationSummary.openCount + reconciliationSummary.reviewingCount),
      description: localizeText(
        {
          zhCn: `高优先级 ${formatCompactNumber(reconciliationSummary.highSeverityOpenCount)} 条，逾时 ${formatCompactNumber(reconciliationSummary.overdueCount)} 条，未分配 ${formatCompactNumber(reconciliationSummary.unassignedActiveCount)} 条。`,
          zhTw: `高優先級 ${formatCompactNumber(reconciliationSummary.highSeverityOpenCount)} 條，逾時 ${formatCompactNumber(reconciliationSummary.overdueCount)} 條，未分配 ${formatCompactNumber(reconciliationSummary.unassignedActiveCount)} 條。`,
          en: `High severity ${formatCompactNumber(reconciliationSummary.highSeverityOpenCount)}, overdue ${formatCompactNumber(reconciliationSummary.overdueCount)}, unassigned ${formatCompactNumber(reconciliationSummary.unassignedActiveCount)}.`,
        },
        locale,
      ),
    },
  ];

  const reconciliationRows: AdminFinanceRowCard[] = [
    {
      title: localizeText(
        {
          zhCn: "充值实收",
          zhTw: "充值實收",
          en: "Recharge revenue",
        },
        locale,
      ),
      subtitle: localizeText(
        {
          zhCn: `${formatCompactNumber(rechargePaidAggregate._count.id ?? 0)} 笔已支付充值单`,
          zhTw: `${formatCompactNumber(rechargePaidAggregate._count.id ?? 0)} 筆已支付充值單`,
          en: `${formatCompactNumber(rechargePaidAggregate._count.id ?? 0)} paid recharge orders`,
        },
        locale,
      ),
      status: localizeText(
        {
          zhCn: "已对账",
          zhTw: "已對帳",
          en: "Settled",
        },
        locale,
      ),
      tone: "good",
      meta: [
        localizeText(
          {
            zhCn: `累计 ${formatCompactNumber(rechargePaidAggregate._sum.amount ?? 0)} 元`,
            zhTw: `累計 ${formatCompactNumber(rechargePaidAggregate._sum.amount ?? 0)} 元`,
            en: `CNY ${formatCompactNumber(rechargePaidAggregate._sum.amount ?? 0)}`,
          },
          locale,
        ),
      ],
    },
    {
      title: localizeText(
        {
          zhCn: "待处理充值单",
          zhTw: "待處理充值單",
          en: "Pending recharges",
        },
        locale,
      ),
      subtitle: localizeText(
        {
          zhCn: `${formatCompactNumber(rechargePendingAggregate._count.id ?? 0)} 笔待财务核对`,
          zhTw: `${formatCompactNumber(rechargePendingAggregate._count.id ?? 0)} 筆待財務核對`,
          en: `${formatCompactNumber(rechargePendingAggregate._count.id ?? 0)} waiting for finance review`,
        },
        locale,
      ),
      status: localizeText(
        {
          zhCn: stalePendingCount > 0 ? "需跟进" : "处理中",
          zhTw: stalePendingCount > 0 ? "需跟進" : "處理中",
          en: stalePendingCount > 0 ? "Needs follow-up" : "Processing",
        },
        locale,
      ),
      tone: stalePendingCount > 0 ? "warn" : "neutral",
      meta: [
        localizeText(
          {
            zhCn: `待核金额 ${formatCompactNumber(rechargePendingAggregate._sum.amount ?? 0)} 元`,
            zhTw: `待核金額 ${formatCompactNumber(rechargePendingAggregate._sum.amount ?? 0)} 元`,
            en: `Pending CNY ${formatCompactNumber(rechargePendingAggregate._sum.amount ?? 0)}`,
          },
          locale,
        ),
        localizeText(
          {
            zhCn: `超 24 小时 ${formatCompactNumber(stalePendingCount)} 笔`,
            zhTw: `超 24 小時 ${formatCompactNumber(stalePendingCount)} 筆`,
            en: `Over 24h: ${formatCompactNumber(stalePendingCount)}`,
          },
          locale,
        ),
      ],
    },
    {
      title: localizeText(
        {
          zhCn: "退款回退",
          zhTw: "退款回退",
          en: "Refunded recharge",
        },
        locale,
      ),
      subtitle: localizeText(
        {
          zhCn: `${formatCompactNumber(rechargeRefundedAggregate._count.id ?? 0)} 笔退款单`,
          zhTw: `${formatCompactNumber(rechargeRefundedAggregate._count.id ?? 0)} 筆退款單`,
          en: `${formatCompactNumber(rechargeRefundedAggregate._count.id ?? 0)} refunded orders`,
        },
        locale,
      ),
      status: localizeText(
        {
          zhCn: "已回退",
          zhTw: "已回退",
          en: "Reversed",
        },
        locale,
      ),
      tone: "neutral",
      meta: [
        localizeText(
          {
            zhCn: `累计 ${formatCompactNumber(rechargeRefundedAggregate._sum.amount ?? 0)} 元`,
            zhTw: `累計 ${formatCompactNumber(rechargeRefundedAggregate._sum.amount ?? 0)} 元`,
            en: `CNY ${formatCompactNumber(rechargeRefundedAggregate._sum.amount ?? 0)}`,
          },
          locale,
        ),
      ],
    },
    {
      title: localizeText(
        {
          zhCn: "已过期待关闭",
          zhTw: "已過期待關閉",
          en: "Expired pending orders",
        },
        locale,
      ),
      subtitle: localizeText(
        {
          zhCn: "服务器定时任务可自动清理超时充值单。",
          zhTw: "伺服器定時任務可自動清理超時充值單。",
          en: "Server cron can auto-close timed-out recharge orders.",
        },
        locale,
      ),
      status: localizeText(
        {
          zhCn: expiredPendingCount > 0 ? "待清理" : "已清空",
          zhTw: expiredPendingCount > 0 ? "待清理" : "已清空",
          en: expiredPendingCount > 0 ? "Pending cleanup" : "Clear",
        },
        locale,
      ),
      tone: expiredPendingCount > 0 ? "warn" : "good",
      meta: [
        localizeText(
          {
            zhCn: `${formatCompactNumber(expiredPendingCount)} 笔已超时`,
            zhTw: `${formatCompactNumber(expiredPendingCount)} 筆已超時`,
            en: `${formatCompactNumber(expiredPendingCount)} expired`,
          },
          locale,
        ),
      ],
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
    coinAccounts,
    recentLedgers,
    reconciliationRows,
    reconciliationIssues,
    reconciliationSummary,
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
