import { prisma } from "@/lib/prisma";
import { getIntlLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n-config";
import { buildAdminOrdersCsv, getAdminOrdersExportRows } from "@/lib/admin-users";

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
  title: string;
  description: string;
  href: string;
  badge: string;
};

export type AdminReportsDashboard = {
  metrics: AdminReportMetric[];
  revenueRows: AdminReportRow[];
  growthRows: AdminReportRow[];
  operationsRows: AdminReportRow[];
  stabilityRows: AdminReportRow[];
  exportCards: AdminReportExportCard[];
};

export type AdminReportExportScope =
  | "orders"
  | "coin-recharges"
  | "coin-ledgers"
  | "agent-applications"
  | "agents"
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

export function normalizeAdminReportExportScope(value?: string | null): AdminReportExportScope {
  switch (value) {
    case "coin-recharges":
    case "coin-ledgers":
    case "agent-applications":
    case "agents":
    case "leads":
    case "withdrawals":
    case "orders":
      return value;
    default:
      return "orders";
  }
}

type CsvRow = Record<string, string | number | null | undefined>;

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
  ]);

  const membershipRevenue = membershipPaid._sum.amount ?? 0;
  const contentRevenue = contentPaid._sum.amount ?? 0;
  const rechargeRevenue = rechargePaid._sum.amount ?? 0;
  const totalRevenue = membershipRevenue + contentRevenue + rechargeRevenue;
  const totalPaidOrders = (membershipPaid._count.id ?? 0) + (contentPaid._count.id ?? 0) + (rechargePaid._count.id ?? 0);
  const recentSuccessCount = recentSyncRuns.filter((item) => item.status === "success").length;

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
        title: localizeText({ zhCn: "订单总表", zhTw: "訂單總表", en: "Orders CSV" }, locale),
        description: localizeText(
          {
            zhCn: "会员订单与内容订单统一导出。",
            zhTw: "會員訂單與內容訂單統一導出。",
            en: "Membership and content orders in one export.",
          },
          locale,
        ),
        href: "/api/admin/reports/export?scope=orders",
        badge: "CSV",
      },
      {
        title: localizeText({ zhCn: "球币充值单", zhTw: "球幣充值單", en: "Coin recharges" }, locale),
        description: localizeText(
          {
            zhCn: "导出充值订单、支付状态和到账信息。",
            zhTw: "導出充值訂單、支付狀態和到帳資訊。",
            en: "Recharge orders with payment and credit status.",
          },
          locale,
        ),
        href: "/api/admin/reports/export?scope=coin-recharges",
        badge: "Finance",
      },
      {
        title: localizeText({ zhCn: "球币流水", zhTw: "球幣流水", en: "Coin ledger" }, locale),
        description: localizeText(
          {
            zhCn: "导出球币加减流水、前后余额和引用单据。",
            zhTw: "導出球幣加減流水、前後餘額和引用單據。",
            en: "Ledger entries with before and after balances.",
          },
          locale,
        ),
        href: "/api/admin/reports/export?scope=coin-ledgers",
        badge: "Finance",
      },
      {
        title: localizeText({ zhCn: "代理名册", zhTw: "代理名冊", en: "Agent roster" }, locale),
        description: localizeText(
          {
            zhCn: "导出代理层级、邀请码和佣金配置。",
            zhTw: "導出代理層級、邀請碼和佣金配置。",
            en: "Hierarchy, invite codes, and commission settings.",
          },
          locale,
        ),
        href: "/api/admin/reports/export?scope=agents",
        badge: "Agents",
      },
      {
        title: localizeText({ zhCn: "招商线索", zhTw: "招商線索", en: "Recruitment leads" }, locale),
        description: localizeText(
          {
            zhCn: "导出招商活动、线索归属和跟进状态。",
            zhTw: "導出招商活動、線索歸屬和跟進狀態。",
            en: "Campaign, ownership, and follow-up status in one CSV.",
          },
          locale,
        ),
        href: "/api/admin/reports/export?scope=leads",
        badge: "Agents",
      },
      {
        title: localizeText({ zhCn: "提现审核", zhTw: "提現審核", en: "Withdrawal review" }, locale),
        description: localizeText(
          {
            zhCn: "导出代理提现状态、金额和备注。",
            zhTw: "導出代理提現狀態、金額和備註。",
            en: "Withdrawals with status, amount, and notes.",
          },
          locale,
        ),
        href: "/api/admin/reports/export?scope=withdrawals",
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

  const records = await prisma.agentWithdrawal.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      agent: {
        select: {
          displayName: true,
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
        note: item.note ?? "",
        proofUrl: item.proofUrl ?? "",
        rejectionReason: item.rejectionReason ?? "",
        requestedAt: item.requestedAt.toISOString(),
        reviewedAt: item.reviewedAt?.toISOString() ?? "",
        settledAt: item.settledAt?.toISOString() ?? "",
      })),
    ),
  };
}
