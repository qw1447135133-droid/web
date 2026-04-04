import { prisma } from "@/lib/prisma";
import { getIntlLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n-config";
import { buildAdminOrdersCsv, getAdminOrdersExportRows } from "@/lib/admin-users";
import { getAgentPerformanceSnapshot } from "@/lib/admin-agents";

type ReportTone = "good" | "warn" | "neutral";

export type AdminReportMetric = {
  label: string;
  value: string;
  description: string;
};

export type AdminReportRow = {
  title: string;
  subtitle?: string;
  status?: string;
  tone?: ReportTone;
  meta?: string[];
};

export type AdminReportExportCard = {
  scope: AdminReportExportScope;
  title: string;
  description: string;
  badge: string;
};

export type AdminReportsDashboard = {
  metrics: AdminReportMetric[];
  agentBiMetrics: AdminReportMetric[];
  revenueRows: AdminReportRow[];
  growthRows: AdminReportRow[];
  agentBiRows: AdminReportRow[];
  operationsRows: AdminReportRow[];
  stabilityRows: AdminReportRow[];
  exportCards: AdminReportExportCard[];
};

export type AdminReportExportScope =
  | "orders"
  | "finance-reconciliation"
  | "coin-recharges"
  | "coin-ledgers"
  | "agent-applications"
  | "agents"
  | "agent-commissions"
  | "agent-performance"
  | "leads"
  | "withdrawals";

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

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(value);
}

function formatCurrency(value: number, locale: Locale) {
  return `CNY ${formatNumber(value, locale)}`;
}

function getAgentLevelSummary(value: string, locale: Locale) {
  if (value === "level3") {
    return localizeText({ zhCn: "三级代理", zhTw: "三級代理", en: "Level 3" }, locale);
  }

  if (value === "level2") {
    return localizeText({ zhCn: "二级代理", zhTw: "二級代理", en: "Level 2" }, locale);
  }

  return localizeText({ zhCn: "一级代理", zhTw: "一級代理", en: "Level 1" }, locale);
}

export function normalizeAdminReportExportScope(value?: string | null): AdminReportExportScope {
  switch (value) {
    case "finance-reconciliation":
    case "coin-recharges":
    case "coin-ledgers":
    case "agent-applications":
    case "agents":
    case "agent-commissions":
    case "agent-performance":
    case "leads":
    case "withdrawals":
    case "orders":
      return value;
    default:
      return "orders";
  }
}

type CsvRow = Record<string, string | number | null | undefined>;

type AgentCommissionExportRow = {
  createdAt: Date;
  agent: {
    displayName: string;
  };
  kind?: string | null;
  sourceAgentId?: string | null;
  sourceAgentName?: string | null;
  user: {
    displayName: string;
    email: string;
  };
  rechargeOrder: {
    orderNo: string;
  };
  rechargeAmount: number;
  commissionRate: number;
  commissionAmount: number;
  settledAmount: number;
  reversedAmount: number;
  status: string;
  settledAt?: Date | null;
  reversedAt?: Date | null;
  note?: string | null;
};

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = value == null ? "" : String(value);

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replaceAll("\"", "\"\"")}"`;
  }

  return normalized;
}

function buildCsv(rows: CsvRow[]) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ];

  return `\uFEFF${lines.join("\n")}`;
}

export async function getAdminReportsDashboard(locale: Locale): Promise<AdminReportsDashboard> {
  const now = new Date();

  const [
    membershipPaid,
    contentPaid,
    rechargePaid,
    activeMembershipCount,
    publishedPlanCount,
    hotPlanCount,
    totalPredictionCount,
    pendingPredictionCount,
    activeBannerCount,
    activeAnnouncementCount,
    activeKnowledgeCount,
    pendingHandoffCount,
    pendingApplications,
    activeAgents,
    newLeads,
    followingLeads,
    pendingWithdrawals,
    settledWithdrawals,
    totalSyncRuns,
    failedSyncRuns,
    recentSyncRuns,
    callbackConflicts,
    callbackFailed,
    pendingRechargeOrders,
    agentPerformanceSnapshot,
  ] = await Promise.all([
    prisma.membershipOrder.aggregate({
      _count: { id: true },
      _sum: { amount: true },
      where: { status: "paid" },
    }),
    prisma.contentOrder.aggregate({
      _count: { id: true },
      _sum: { amount: true },
      where: { status: "paid" },
    }),
    prisma.coinRechargeOrder.aggregate({
      _count: { id: true },
      _sum: { amount: true },
      where: { status: "paid" },
    }),
    prisma.user.count({
      where: {
        membershipExpiresAt: {
          gt: now,
        },
      },
    }),
    prisma.articlePlan.count({
      where: {
        status: "published",
      },
    }),
    prisma.articlePlan.count({
      where: {
        status: "published",
        isHot: true,
      },
    }),
    prisma.predictionRecord.count(),
    prisma.predictionRecord.count({
      where: {
        result: "pending",
      },
    }),
    prisma.homepageBanner.count({
      where: {
        status: "active",
      },
    }),
    prisma.siteAnnouncement.count({
      where: {
        status: "active",
      },
    }),
    prisma.supportKnowledgeItem.count({
      where: {
        status: "active",
      },
    }),
    prisma.assistantHandoffRequest.count({
      where: {
        status: "pending",
      },
    }),
    prisma.agentApplication.count({
      where: {
        status: "pending",
      },
    }),
    prisma.agentProfile.count({
      where: {
        status: "active",
      },
    }),
    prisma.recruitmentLead.count({
      where: {
        status: "new",
      },
    }),
    prisma.recruitmentLead.count({
      where: {
        status: "following",
      },
    }),
    prisma.agentWithdrawal.count({
      where: {
        status: {
          in: ["pending", "reviewing", "paying"],
        },
      },
    }),
    prisma.agentWithdrawal.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: "settled",
      },
    }),
    prisma.syncRun.count(),
    prisma.syncRun.count({
      where: {
        status: "failed",
      },
    }),
    prisma.syncRun.findMany({
      take: 8,
      orderBy: {
        startedAt: "desc",
      },
      select: {
        status: true,
      },
    }),
    prisma.paymentCallbackEvent.count({
      where: {
        processingStatus: "conflict",
      },
    }),
    prisma.paymentCallbackEvent.count({
      where: {
        processingStatus: "failed",
      },
    }),
    prisma.coinRechargeOrder.count({
      where: {
        status: "pending",
      },
    }),
    getAgentPerformanceSnapshot(),
  ]);

  const membershipRevenue = membershipPaid._sum.amount ?? 0;
  const contentRevenue = contentPaid._sum.amount ?? 0;
  const rechargeRevenue = rechargePaid._sum.amount ?? 0;
  const totalRevenue = membershipRevenue + contentRevenue + rechargeRevenue;
  const totalPaidOrders = (membershipPaid._count.id ?? 0) + (contentPaid._count.id ?? 0) + (rechargePaid._count.id ?? 0);
  const recentSuccessCount = recentSyncRuns.filter((item) => item.status === "success").length;
  const agentBiRows = agentPerformanceSnapshot.slice(0, 6);
  const totalAttributedRecharge = agentPerformanceSnapshot.reduce((total, item) => total + item.directRechargeAmount, 0);
  const totalDirectCommission = agentPerformanceSnapshot.reduce((total, item) => total + item.directCommissionNet, 0);
  const totalDownstreamCommission = agentPerformanceSnapshot.reduce((total, item) => total + item.downstreamCommissionNet, 0);
  const totalPendingPayout = agentPerformanceSnapshot.reduce((total, item) => total + item.pendingWithdrawalAmount, 0);
  const totalSettledWithdrawal = agentPerformanceSnapshot.reduce((total, item) => total + item.settledWithdrawalAmount, 0);
  const totalReferredUsers = agentPerformanceSnapshot.reduce((total, item) => total + item.referredUsers, 0);
  const totalChildAgents = agentPerformanceSnapshot.reduce((total, item) => total + item.childAgents, 0);

  return {
    metrics: [
      {
        label: localizeText(
          { zhCn: "累计已实现营收", zhTw: "累計已實現營收", en: "Realized revenue" },
          locale,
        ),
        value: formatCurrency(totalRevenue, locale),
        description: localizeText(
          {
            zhCn: `会员、内容和球币充值合计 ${formatNumber(totalPaidOrders, locale)} 笔已支付订单。`,
            zhTw: `會員、內容和球幣充值合計 ${formatNumber(totalPaidOrders, locale)} 筆已支付訂單。`,
            en: `${formatNumber(totalPaidOrders, locale)} paid orders across membership, content, and coin recharge.`,
          },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "有效会员数", zhTw: "有效會員數", en: "Active members" },
          locale,
        ),
        value: formatNumber(activeMembershipCount, locale),
        description: localizeText(
          {
            zhCn: `会员实收 ${formatCurrency(membershipRevenue, locale)}。`,
            zhTw: `會員實收 ${formatCurrency(membershipRevenue, locale)}。`,
            en: `Membership revenue ${formatCurrency(membershipRevenue, locale)}.`,
          },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "已发布内容", zhTw: "已發布內容", en: "Published content" },
          locale,
        ),
        value: formatNumber(publishedPlanCount, locale),
        description: localizeText(
          {
            zhCn: `热门计划 ${formatNumber(hotPlanCount, locale)} 条，AI 预测 ${formatNumber(totalPredictionCount, locale)} 条。`,
            zhTw: `熱門計劃 ${formatNumber(hotPlanCount, locale)} 條，AI 預測 ${formatNumber(totalPredictionCount, locale)} 條。`,
            en: `${formatNumber(hotPlanCount, locale)} hot plans and ${formatNumber(totalPredictionCount, locale)} prediction records.`,
          },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "活跃代理网络", zhTw: "活躍代理網路", en: "Active agent network" },
          locale,
        ),
        value: formatNumber(activeAgents, locale),
        description: localizeText(
          {
            zhCn: `待审申请 ${formatNumber(pendingApplications, locale)} 条，线索池 ${formatNumber(newLeads + followingLeads, locale)} 条。`,
            zhTw: `待審申請 ${formatNumber(pendingApplications, locale)} 條，線索池 ${formatNumber(newLeads + followingLeads, locale)} 條。`,
            en: `${formatNumber(pendingApplications, locale)} pending applications and ${formatNumber(newLeads + followingLeads, locale)} leads in pipeline.`,
          },
          locale,
        ),
      },
    ],
    agentBiMetrics: [
      {
        label: localizeText(
          { zhCn: "归因充值额", zhTw: "歸因充值額", en: "Attributed recharge" },
          locale,
        ),
        value: formatCurrency(totalAttributedRecharge, locale),
        description: localizeText(
          {
            zhCn: `当前代理网络累计直推用户 ${formatNumber(totalReferredUsers, locale)} 人。`,
            zhTw: `當前代理網路累計直推用戶 ${formatNumber(totalReferredUsers, locale)} 人。`,
            en: `${formatNumber(totalReferredUsers, locale)} directly attributed users in the agent network.`,
          },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "直推净佣金", zhTw: "直推淨佣金", en: "Direct net commission" },
          locale,
        ),
        value: formatCurrency(totalDirectCommission, locale),
        description: localizeText(
          {
            zhCn: `下级分佣累计 ${formatCurrency(totalDownstreamCommission, locale)}。`,
            zhTw: `下級分佣累計 ${formatCurrency(totalDownstreamCommission, locale)}。`,
            en: `Downstream commission totals ${formatCurrency(totalDownstreamCommission, locale)}.`,
          },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "代理层级扩展", zhTw: "代理層級擴展", en: "Downstream expansion" },
          locale,
        ),
        value: formatNumber(totalChildAgents, locale),
        description: localizeText(
          {
            zhCn: "统计所有代理已挂接的下级代理数量。",
            zhTw: "統計所有代理已掛接的下級代理數量。",
            en: "Total number of downstream agents attached to the network.",
          },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "待打款压力", zhTw: "待打款壓力", en: "Pending payout" },
          locale,
        ),
        value: formatCurrency(totalPendingPayout, locale),
        description: localizeText(
          {
            zhCn: `已完成提现 ${formatCurrency(totalSettledWithdrawal, locale)}。`,
            zhTw: `已完成提現 ${formatCurrency(totalSettledWithdrawal, locale)}。`,
            en: `Settled withdrawals total ${formatCurrency(totalSettledWithdrawal, locale)}.`,
          },
          locale,
        ),
      },
    ],
    revenueRows: [
      {
        title: localizeText({ zhCn: "会员订单营收", zhTw: "會員訂單營收", en: "Membership revenue" }, locale),
        subtitle: localizeText(
          {
            zhCn: `${formatNumber(membershipPaid._count.id ?? 0, locale)} 笔已支付会员订单`,
            zhTw: `${formatNumber(membershipPaid._count.id ?? 0, locale)} 筆已支付會員訂單`,
            en: `${formatNumber(membershipPaid._count.id ?? 0, locale)} paid membership orders`,
          },
          locale,
        ),
        status: formatCurrency(membershipRevenue, locale),
        tone: "good",
      },
      {
        title: localizeText({ zhCn: "内容解锁营收", zhTw: "內容解鎖營收", en: "Content unlock revenue" }, locale),
        subtitle: localizeText(
          {
            zhCn: `${formatNumber(contentPaid._count.id ?? 0, locale)} 笔已支付内容订单`,
            zhTw: `${formatNumber(contentPaid._count.id ?? 0, locale)} 筆已支付內容訂單`,
            en: `${formatNumber(contentPaid._count.id ?? 0, locale)} paid content orders`,
          },
          locale,
        ),
        status: formatCurrency(contentRevenue, locale),
        tone: "good",
      },
      {
        title: localizeText({ zhCn: "球币充值实收", zhTw: "球幣充值實收", en: "Coin recharge revenue" }, locale),
        subtitle: localizeText(
          {
            zhCn: `${formatNumber(rechargePaid._count.id ?? 0, locale)} 笔已支付充值单`,
            zhTw: `${formatNumber(rechargePaid._count.id ?? 0, locale)} 筆已支付充值單`,
            en: `${formatNumber(rechargePaid._count.id ?? 0, locale)} paid recharge orders`,
          },
          locale,
        ),
        status: formatCurrency(rechargeRevenue, locale),
        tone: "good",
      },
      {
        title: localizeText({ zhCn: "充值待处理", zhTw: "充值待處理", en: "Recharge pending" }, locale),
        subtitle: localizeText(
          {
            zhCn: "用于对账、手动补单和异常关闭。",
            zhTw: "用於對帳、手動補單和異常關閉。",
            en: "Used for reconciliation, manual repair, and abnormal close.",
          },
          locale,
        ),
        status: formatNumber(pendingRechargeOrders, locale),
        tone: pendingRechargeOrders > 0 ? "warn" : "neutral",
      },
    ],
    growthRows: [
      {
        title: localizeText({ zhCn: "代理申请审批池", zhTw: "代理申請審批池", en: "Agent application queue" }, locale),
        subtitle: localizeText(
          {
            zhCn: "待审申请可直接转正式代理。",
            zhTw: "待審申請可直接轉正式代理。",
            en: "Pending applications can be approved into active agents.",
          },
          locale,
        ),
        status: formatNumber(pendingApplications, locale),
        tone: pendingApplications > 0 ? "warn" : "neutral",
      },
      {
        title: localizeText({ zhCn: "活跃代理名册", zhTw: "活躍代理名冊", en: "Active agent roster" }, locale),
        subtitle: localizeText(
          {
            zhCn: "已生成邀请码并保持归因能力。",
            zhTw: "已生成邀請碼並保持歸因能力。",
            en: "Invite codes are ready for attribution.",
          },
          locale,
        ),
        status: formatNumber(activeAgents, locale),
        tone: "good",
      },
      {
        title: localizeText({ zhCn: "招商线索池", zhTw: "招商線索池", en: "Recruitment leads" }, locale),
        subtitle: localizeText(
          {
            zhCn: `新线索 ${formatNumber(newLeads, locale)} / 跟进中 ${formatNumber(followingLeads, locale)}`,
            zhTw: `新線索 ${formatNumber(newLeads, locale)} / 跟進中 ${formatNumber(followingLeads, locale)}`,
            en: `${formatNumber(newLeads, locale)} new and ${formatNumber(followingLeads, locale)} following`,
          },
          locale,
        ),
        status: formatNumber(newLeads + followingLeads, locale),
        tone: followingLeads > 0 ? "warn" : "neutral",
      },
      {
        title: localizeText({ zhCn: "佣金提现审核", zhTw: "佣金提現審核", en: "Commission withdrawals" }, locale),
        subtitle: localizeText(
          {
            zhCn: `已结算 ${formatCurrency(settledWithdrawals._sum.amount ?? 0, locale)}`,
            zhTw: `已結算 ${formatCurrency(settledWithdrawals._sum.amount ?? 0, locale)}`,
            en: `Settled ${formatCurrency(settledWithdrawals._sum.amount ?? 0, locale)}`,
          },
          locale,
        ),
        status: formatNumber(pendingWithdrawals, locale),
        tone: pendingWithdrawals > 0 ? "warn" : "neutral",
      },
    ],
    agentBiRows: agentBiRows.map((item) => ({
      title: `${item.agentName} / ${item.inviteCode}`,
      subtitle: localizeText(
        {
          zhCn: `${getAgentLevelSummary(item.level, locale)} / 直推 ${formatNumber(item.referredUsers, locale)} / 下级 ${formatNumber(item.childAgents, locale)}`,
          zhTw: `${getAgentLevelSummary(item.level, locale)} / 直推 ${formatNumber(item.referredUsers, locale)} / 下級 ${formatNumber(item.childAgents, locale)}`,
          en: `${getAgentLevelSummary(item.level, locale)} / ${formatNumber(item.referredUsers, locale)} direct / ${formatNumber(item.childAgents, locale)} downstream`,
        },
        locale,
      ),
      status: formatCurrency(item.totalCommissionNet, locale),
      tone: item.totalCommissionNet > 0 ? "good" : "neutral",
      meta: [
        localizeText(
          {
            zhCn: `直推充值 ${formatCurrency(item.directRechargeAmount, locale)}`,
            zhTw: `直推充值 ${formatCurrency(item.directRechargeAmount, locale)}`,
            en: `Direct recharge ${formatCurrency(item.directRechargeAmount, locale)}`,
          },
          locale,
        ),
        localizeText(
          {
            zhCn: `直推佣金 ${formatCurrency(item.directCommissionNet, locale)}`,
            zhTw: `直推佣金 ${formatCurrency(item.directCommissionNet, locale)}`,
            en: `Direct commission ${formatCurrency(item.directCommissionNet, locale)}`,
          },
          locale,
        ),
        localizeText(
          {
            zhCn: `下级分佣 ${formatCurrency(item.downstreamCommissionNet, locale)}`,
            zhTw: `下級分佣 ${formatCurrency(item.downstreamCommissionNet, locale)}`,
            en: `Downstream commission ${formatCurrency(item.downstreamCommissionNet, locale)}`,
          },
          locale,
        ),
        localizeText(
          {
            zhCn: `待结算 ${formatCurrency(item.unsettledCommission, locale)}`,
            zhTw: `待結算 ${formatCurrency(item.unsettledCommission, locale)}`,
            en: `Unsettled ${formatCurrency(item.unsettledCommission, locale)}`,
          },
          locale,
        ),
        localizeText(
          {
            zhCn: `已提现 ${formatCurrency(item.settledWithdrawalAmount, locale)}`,
            zhTw: `已提現 ${formatCurrency(item.settledWithdrawalAmount, locale)}`,
            en: `Settled withdrawal ${formatCurrency(item.settledWithdrawalAmount, locale)}`,
          },
          locale,
        ),
        localizeText(
          {
            zhCn: `待打款 ${formatCurrency(item.pendingWithdrawalAmount, locale)}`,
            zhTw: `待打款 ${formatCurrency(item.pendingWithdrawalAmount, locale)}`,
            en: `Pending payout ${formatCurrency(item.pendingWithdrawalAmount, locale)}`,
          },
          locale,
        ),
      ],
    })),
    operationsRows: [
      {
        title: localizeText({ zhCn: "计划单发布面", zhTw: "計劃單發布面", en: "Plan publishing" }, locale),
        subtitle: localizeText(
          {
            zhCn: `已发布 ${formatNumber(publishedPlanCount, locale)} 条，热门 ${formatNumber(hotPlanCount, locale)} 条。`,
            zhTw: `已發布 ${formatNumber(publishedPlanCount, locale)} 條，熱門 ${formatNumber(hotPlanCount, locale)} 條。`,
            en: `${formatNumber(publishedPlanCount, locale)} published and ${formatNumber(hotPlanCount, locale)} hot.`,
          },
          locale,
        ),
        status: localizeText({ zhCn: "运行中", zhTw: "運行中", en: "Live" }, locale),
        tone: "good",
      },
      {
        title: localizeText({ zhCn: "AI 预测池", zhTw: "AI 預測池", en: "AI prediction pool" }, locale),
        subtitle: localizeText(
          {
            zhCn: `待结算 ${formatNumber(pendingPredictionCount, locale)} 条。`,
            zhTw: `待結算 ${formatNumber(pendingPredictionCount, locale)} 條。`,
            en: `${formatNumber(pendingPredictionCount, locale)} pending results.`,
          },
          locale,
        ),
        status: formatNumber(totalPredictionCount, locale),
        tone: "neutral",
      },
      {
        title: localizeText({ zhCn: "首页运营位", zhTw: "首頁運營位", en: "Homepage operations" }, locale),
        subtitle: localizeText(
          {
            zhCn: `Banner ${formatNumber(activeBannerCount, locale)} / 公告 ${formatNumber(activeAnnouncementCount, locale)}`,
            zhTw: `Banner ${formatNumber(activeBannerCount, locale)} / 公告 ${formatNumber(activeAnnouncementCount, locale)}`,
            en: `${formatNumber(activeBannerCount, locale)} banners and ${formatNumber(activeAnnouncementCount, locale)} announcements`,
          },
          locale,
        ),
        status: localizeText({ zhCn: "已上线", zhTw: "已上線", en: "Configured" }, locale),
        tone: "good",
      },
      {
        title: localizeText({ zhCn: "AI 客服知识库", zhTw: "AI 客服知識庫", en: "Assistant knowledge base" }, locale),
        subtitle: localizeText(
          {
            zhCn: `启用条目 ${formatNumber(activeKnowledgeCount, locale)} / 待人工转接 ${formatNumber(pendingHandoffCount, locale)}`,
            zhTw: `啟用條目 ${formatNumber(activeKnowledgeCount, locale)} / 待人工轉接 ${formatNumber(pendingHandoffCount, locale)}`,
            en: `${formatNumber(activeKnowledgeCount, locale)} active items and ${formatNumber(pendingHandoffCount, locale)} pending handoffs`,
          },
          locale,
        ),
        status: pendingHandoffCount > 0
          ? localizeText({ zhCn: "需跟进", zhTw: "需跟進", en: "Needs follow-up" }, locale)
          : localizeText({ zhCn: "稳定", zhTw: "穩定", en: "Stable" }, locale),
        tone: pendingHandoffCount > 0 ? "warn" : "good",
      },
    ],
    stabilityRows: [
      {
        title: localizeText({ zhCn: "同步任务总量", zhTw: "同步任務總量", en: "Sync run volume" }, locale),
        subtitle: localizeText(
          {
            zhCn: `最近 8 次成功 ${formatNumber(recentSuccessCount, locale)} 次。`,
            zhTw: `最近 8 次成功 ${formatNumber(recentSuccessCount, locale)} 次。`,
            en: `${formatNumber(recentSuccessCount, locale)} successful runs in the latest 8.`,
          },
          locale,
        ),
        status: formatNumber(totalSyncRuns, locale),
        tone: "neutral",
      },
      {
        title: localizeText({ zhCn: "同步失败监控", zhTw: "同步失敗監控", en: "Sync failures" }, locale),
        subtitle: localizeText(
          {
            zhCn: "基于 SyncRun 实时统计失败运行次数。",
            zhTw: "基於 SyncRun 即時統計失敗運行次數。",
            en: "Real-time failed run count from SyncRun.",
          },
          locale,
        ),
        status: formatNumber(failedSyncRuns, locale),
        tone: failedSyncRuns > 0 ? "warn" : "good",
      },
      {
        title: localizeText({ zhCn: "支付回调冲突", zhTw: "支付回調衝突", en: "Callback conflicts" }, locale),
        subtitle: localizeText(
          {
            zhCn: `失败回调 ${formatNumber(callbackFailed, locale)} 次。`,
            zhTw: `失敗回調 ${formatNumber(callbackFailed, locale)} 次。`,
            en: `${formatNumber(callbackFailed, locale)} failed callback events.`,
          },
          locale,
        ),
        status: formatNumber(callbackConflicts, locale),
        tone: callbackConflicts > 0 ? "warn" : "good",
      },
      {
        title: localizeText({ zhCn: "导出中心", zhTw: "匯出中心", en: "Export center" }, locale),
        subtitle: localizeText(
          {
            zhCn: "订单、球币、代理链路 CSV 可直接下载。",
            zhTw: "訂單、球幣、代理鏈路 CSV 可直接下載。",
            en: "Orders, coin, and agent CSVs are ready to download.",
          },
          locale,
        ),
        status: localizeText({ zhCn: "已开放", zhTw: "已開放", en: "Available" }, locale),
        tone: "good",
      },
    ],
    exportCards: [
      {
        scope: "orders",
        title: localizeText({ zhCn: "订单总表", zhTw: "訂單總表", en: "Orders CSV" }, locale),
        description: localizeText(
          {
            zhCn: "会员订单与内容订单统一导出。",
            zhTw: "會員訂單與內容訂單統一導出。",
            en: "Membership and content orders in one export.",
          },
          locale,
        ),
        badge: "CSV",
      },
      {
        scope: "finance-reconciliation",
        title: localizeText({ zhCn: "财务对账表", zhTw: "財務對帳表", en: "Finance reconciliation" }, locale),
        description: localizeText(
          {
            zhCn: "统一导出会员、内容、球币充值和退款状态，方便财务核对。",
            zhTw: "統一導出會員、內容、球幣充值與退款狀態，方便財務核對。",
            en: "Unified export of membership, content, coin recharge, and refund status.",
          },
          locale,
        ),
        badge: "Finance",
      },
      {
        scope: "coin-recharges",
        title: localizeText({ zhCn: "球币充值单", zhTw: "球幣充值單", en: "Coin recharges" }, locale),
        description: localizeText(
          {
            zhCn: "导出充值订单、支付状态和到账信息。",
            zhTw: "導出充值訂單、支付狀態和到帳資訊。",
            en: "Recharge orders with payment and credit status.",
          },
          locale,
        ),
        badge: "Finance",
      },
      {
        scope: "coin-ledgers",
        title: localizeText({ zhCn: "球币流水", zhTw: "球幣流水", en: "Coin ledger" }, locale),
        description: localizeText(
          {
            zhCn: "导出球币加减流水、前后余额和引用单据。",
            zhTw: "導出球幣加減流水、前後餘額和引用單據。",
            en: "Ledger entries with before and after balances.",
          },
          locale,
        ),
        badge: "Finance",
      },
      {
        scope: "agents",
        title: localizeText({ zhCn: "代理名册", zhTw: "代理名冊", en: "Agent roster" }, locale),
        description: localizeText(
          {
            zhCn: "导出代理层级、邀请码和佣金配置。",
            zhTw: "導出代理層級、邀請碼和佣金配置。",
            en: "Hierarchy, invite codes, and commission settings.",
          },
          locale,
        ),
        badge: "Agents",
      },
      {
        scope: "agent-commissions",
        title: localizeText({ zhCn: "代理佣金流水", zhTw: "代理佣金流水", en: "Agent commissions" }, locale),
        description: localizeText(
          {
            zhCn: "导出归因充值、佣金金额、已结算/已冲回与可结算余额。",
            zhTw: "導出歸因充值、佣金金額、已結算/已沖回與可結算餘額。",
            en: "Commission ledger with settled, reversed, and available amounts.",
          },
          locale,
        ),
        badge: "Agents",
      },
      {
        scope: "agent-performance",
        title: localizeText({ zhCn: "代理业绩看板", zhTw: "代理業績看板", en: "Agent performance" }, locale),
        description: localizeText(
          {
            zhCn: "导出代理层级、归因用户、累计佣金与提现表现。",
            zhTw: "導出代理層級、歸因用戶、累計佣金與提現表現。",
            en: "Agent hierarchy, attributed users, commission totals, and withdrawals.",
          },
          locale,
        ),
        badge: "BI",
      },
      {
        scope: "leads",
        title: localizeText({ zhCn: "招商线索", zhTw: "招商線索", en: "Recruitment leads" }, locale),
        description: localizeText(
          {
            zhCn: "导出招商活动、线索归属和跟进状态。",
            zhTw: "導出招商活動、線索歸屬和跟進狀態。",
            en: "Campaign, ownership, and follow-up status in one CSV.",
          },
          locale,
        ),
        badge: "Agents",
      },
      {
        scope: "withdrawals",
        title: localizeText({ zhCn: "提现审核", zhTw: "提現審核", en: "Withdrawal review" }, locale),
        description: localizeText(
          {
            zhCn: "导出代理提现状态、金额和备注。",
            zhTw: "導出代理提現狀態、金額和備註。",
            en: "Withdrawals with status, amount, and notes.",
          },
          locale,
        ),
        badge: "Agents",
      },
    ],
  };
}

export async function buildAdminReportExport(scope: AdminReportExportScope) {
  if (scope === "orders") {
    const rows = await getAdminOrdersExportRows();
    return {
      filename: "admin-orders",
      csv: buildAdminOrdersCsv(rows),
    };
  }

  if (scope === "finance-reconciliation") {
    const [orderRows, rechargeOrders] = await Promise.all([
      getAdminOrdersExportRows(),
      prisma.coinRechargeOrder.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          user: {
            select: {
              displayName: true,
              email: true,
            },
          },
          package: {
            select: {
              titleZhCn: true,
              titleEn: true,
            },
          },
        },
      }),
    ]);

    return {
      filename: "admin-finance-reconciliation",
      csv: buildCsv([
        ...orderRows.map((item) => ({
          channel: item.orderType,
          orderNo: item.orderId,
          status: item.status,
          reconciliationStatus:
            item.status === "paid"
              ? "entitled"
              : item.status === "refunded"
                ? "reversed"
                : item.status,
          provider: item.provider,
          providerOrderId: item.providerOrderId ?? "",
          paymentReference: item.paymentReference ?? "",
          userDisplayName: item.userDisplayName,
          userEmail: item.userEmail,
          subjectTitle: item.subjectTitle,
          amount: item.amount,
          coinAmount: "",
          bonusAmount: "",
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          paidAt: item.paidAt ?? "",
          refundedAt: item.refundedAt ?? "",
          creditedAt: "",
          failureReason: item.failureReason ?? "",
          refundReason: item.refundReason ?? "",
        })),
        ...rechargeOrders.map((item) => ({
          channel: "coin-recharge",
          orderNo: item.orderNo,
          status: item.status,
          reconciliationStatus:
            item.status === "paid"
              ? item.creditedAt
                ? "credited"
                : "paid-not-credited"
              : item.status === "refunded"
                ? "refunded"
                : item.status,
          provider: item.provider,
          providerOrderId: item.providerOrderId ?? "",
          paymentReference: item.paymentReference ?? "",
          userDisplayName: item.user.displayName,
          userEmail: item.user.email,
          subjectTitle: item.package.titleZhCn || item.package.titleEn,
          amount: item.amount,
          coinAmount: item.coinAmount,
          bonusAmount: item.bonusAmount,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          paidAt: item.paidAt?.toISOString() ?? "",
          refundedAt: item.refundedAt?.toISOString() ?? "",
          creditedAt: item.creditedAt?.toISOString() ?? "",
          failureReason: item.failureReason ?? "",
          refundReason: item.refundReason ?? "",
        })),
      ]),
    };
  }

  if (scope === "coin-recharges") {
    const records = await prisma.coinRechargeOrder.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        user: {
          select: {
            displayName: true,
            email: true,
          },
        },
        package: {
          select: {
            titleZhCn: true,
            titleEn: true,
          },
        },
      },
    });

    return {
      filename: "admin-coin-recharges",
      csv: buildCsv(
        records.map((item) => ({
          orderNo: item.orderNo,
          userDisplayName: item.user.displayName,
          userEmail: item.user.email,
          packageTitle: item.package.titleZhCn || item.package.titleEn,
          amount: item.amount,
          coinAmount: item.coinAmount,
          bonusAmount: item.bonusAmount,
          status: item.status,
          provider: item.provider,
          paymentReference: item.paymentReference ?? "",
          providerOrderId: item.providerOrderId ?? "",
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          paidAt: item.paidAt?.toISOString() ?? "",
          refundedAt: item.refundedAt?.toISOString() ?? "",
        })),
      ),
    };
  }

  if (scope === "coin-ledgers") {
    const records = await prisma.coinLedger.findMany({
      orderBy: { createdAt: "desc" },
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
    });

    return {
      filename: "admin-coin-ledgers",
      csv: buildCsv(
        records.map((item) => ({
          createdAt: item.createdAt.toISOString(),
          userDisplayName: item.account.user.displayName,
          userEmail: item.account.user.email,
          direction: item.direction,
          reason: item.reason,
          amount: item.amount,
          balanceBefore: item.balanceBefore,
          balanceAfter: item.balanceAfter,
          referenceType: item.referenceType ?? "",
          referenceId: item.referenceId ?? "",
          note: item.note ?? "",
        })),
      ),
    };
  }

  if (scope === "agent-applications") {
    const records = await prisma.agentApplication.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return {
      filename: "admin-agent-applications",
      csv: buildCsv(
        records.map((item) => ({
          applicantName: item.applicantName,
          phone: item.phone,
          contact: item.contact ?? "",
          channelSummary: item.channelSummary,
          expectedMonthlyUsers: item.expectedMonthlyUsers ?? "",
          desiredLevel: item.desiredLevel,
          status: item.status,
          reviewerNote: item.reviewerNote ?? "",
          createdAt: item.createdAt.toISOString(),
          reviewedAt: item.reviewedAt?.toISOString() ?? "",
        })),
      ),
    };
  }

  if (scope === "agents") {
    const records = await prisma.agentProfile.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        parentAgent: {
          select: {
            displayName: true,
          },
        },
      },
    });

    return {
      filename: "admin-agents",
      csv: buildCsv(
        records.map((item) => ({
          displayName: item.displayName,
          level: item.level,
          status: item.status,
          inviteCode: item.inviteCode,
          parentAgentName: item.parentAgent?.displayName ?? "",
          commissionRate: item.commissionRate,
          downstreamRate: item.downstreamRate,
          totalReferredUsers: item.totalReferredUsers,
          monthlyRechargeAmount: item.monthlyRechargeAmount,
          totalCommission: item.totalCommission,
          unsettledCommission: item.unsettledCommission,
          payoutAccount: item.payoutAccount ?? "",
          updatedAt: item.updatedAt.toISOString(),
        })),
      ),
    };
  }

  if (scope === "leads") {
    const records = await prisma.recruitmentLead.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        campaign: {
          select: {
            name: true,
          },
        },
        agent: {
          select: {
            displayName: true,
          },
        },
      },
    });

    return {
      filename: "admin-recruitment-leads",
      csv: buildCsv(
        records.map((item) => ({
          name: item.name,
          phone: item.phone,
          sourceChannel: item.sourceChannel,
          desiredLevel: item.desiredLevel,
          status: item.status,
          ownerName: item.ownerName ?? "",
          campaignName: item.campaign?.name ?? "",
          agentName: item.agent?.displayName ?? "",
          note: item.note ?? "",
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
      ),
    };
  }

  if (scope === "agent-commissions") {
    const recordsUntyped = await prisma.agentCommissionLedger.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        agent: {
          select: {
            displayName: true,
          },
        },
        user: {
          select: {
            displayName: true,
            email: true,
          },
        },
        rechargeOrder: {
          select: {
            orderNo: true,
          },
        },
      },
    });
    const records = recordsUntyped as AgentCommissionExportRow[];

    return {
      filename: "admin-agent-commissions",
      csv: buildCsv(
        records.map((item) => {
          const availableAmount = Math.max(0, item.commissionAmount - item.settledAmount - item.reversedAmount);
          return {
            createdAt: item.createdAt.toISOString(),
            agentName: item.agent.displayName,
            kind: item.kind,
            sourceAgentId: item.sourceAgentId ?? "",
            sourceAgentName: item.sourceAgentName ?? "",
            userDisplayName: item.user.displayName,
            userEmail: item.user.email,
            rechargeOrderNo: item.rechargeOrder.orderNo,
            rechargeAmount: item.rechargeAmount,
            commissionRate: item.commissionRate,
            commissionAmount: item.commissionAmount,
            settledAmount: item.settledAmount,
            reversedAmount: item.reversedAmount,
            availableAmount,
            status: item.status,
            settledAt: item.settledAt?.toISOString() ?? "",
            reversedAt: item.reversedAt?.toISOString() ?? "",
            note: item.note ?? "",
          };
        }),
      ),
    };
  }

  if (scope === "agent-performance") {
    const [agents, withdrawals] = await Promise.all([
      prisma.agentProfile.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          parentAgent: {
            select: {
              displayName: true,
            },
          },
        },
      }),
      prisma.agentWithdrawal.groupBy({
        by: ["agentId", "status"],
        _count: {
          _all: true,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const withdrawalStats = withdrawals.reduce<Record<string, {
      pendingCount: number;
      pendingAmount: number;
      settledCount: number;
      settledAmount: number;
      rejectedCount: number;
      rejectedAmount: number;
    }>>((accumulator, item) => {
      const entry = accumulator[item.agentId] ?? {
        pendingCount: 0,
        pendingAmount: 0,
        settledCount: 0,
        settledAmount: 0,
        rejectedCount: 0,
        rejectedAmount: 0,
      };

      const amount = item._sum.amount ?? 0;
      if (item.status === "settled") {
        entry.settledCount += item._count._all;
        entry.settledAmount += amount;
      } else if (item.status === "rejected") {
        entry.rejectedCount += item._count._all;
        entry.rejectedAmount += amount;
      } else {
        entry.pendingCount += item._count._all;
        entry.pendingAmount += amount;
      }

      accumulator[item.agentId] = entry;
      return accumulator;
    }, {});

    return {
      filename: "admin-agent-performance",
      csv: buildCsv(
        agents.map((item) => {
          const stats = withdrawalStats[item.id] ?? {
            pendingCount: 0,
            pendingAmount: 0,
            settledCount: 0,
            settledAmount: 0,
            rejectedCount: 0,
            rejectedAmount: 0,
          };

          return {
            displayName: item.displayName,
            level: item.level,
            status: item.status,
            inviteCode: item.inviteCode,
            parentAgentName: item.parentAgent?.displayName ?? "",
            totalReferredUsers: item.totalReferredUsers,
            monthlyRechargeAmount: item.monthlyRechargeAmount,
            totalCommission: item.totalCommission,
            unsettledCommission: item.unsettledCommission,
            payoutAccount: item.payoutAccount ?? "",
            pendingWithdrawalCount: stats.pendingCount,
            pendingWithdrawalAmount: stats.pendingAmount,
            settledWithdrawalCount: stats.settledCount,
            settledWithdrawalAmount: stats.settledAmount,
            rejectedWithdrawalCount: stats.rejectedCount,
            rejectedWithdrawalAmount: stats.rejectedAmount,
            updatedAt: item.updatedAt.toISOString(),
          };
        }),
      ),
    };
  }

  const records = await prisma.agentWithdrawal.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      amount: true,
      status: true,
      payoutAccount: true,
      payoutChannel: true,
      payoutReference: true,
      payoutOperator: true,
      note: true,
      proofUrl: true,
      rejectionReason: true,
      requestedAt: true,
      reviewedAt: true,
      settledAt: true,
      agent: {
        select: {
          displayName: true,
        },
      },
      allocations: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: {
          commissionLedger: {
            select: {
              rechargeOrder: {
                select: {
                  orderNo: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return {
    filename: "admin-agent-withdrawals",
    csv: buildCsv(
      records.map((item) => ({
        agentName: item.agent.displayName,
        amount: item.amount,
        status: item.status,
        payoutAccount: item.payoutAccount ?? "",
        payoutChannel: item.payoutChannel ?? "",
        payoutReference: item.payoutReference ?? "",
        payoutOperator: item.payoutOperator ?? "",
        note: item.note ?? "",
        proofUrl: item.proofUrl ?? "",
        allocationCount: item.allocations.length,
        allocatedAmount: item.allocations.reduce((total, allocation) => total + allocation.amount, 0),
        allocationRefs: item.allocations.map((allocation) => allocation.commissionLedger.rechargeOrder.orderNo).join(" | "),
        rejectionReason: item.rejectionReason ?? "",
        requestedAt: item.requestedAt.toISOString(),
        reviewedAt: item.reviewedAt?.toISOString() ?? "",
        settledAt: item.settledAt?.toISOString() ?? "",
      })),
    ),
  };
}
