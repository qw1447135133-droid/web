import { prisma } from "@/lib/prisma";
import { getIntlLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n-config";

export type AgentBiMetric = {
  label: string;
  value: string;
  description: string;
};

export type AgentBiRow = {
  title: string;
  subtitle?: string;
  status?: string;
  tone?: "good" | "warn" | "neutral";
  meta?: string[];
};

export type AgentBiSnapshot = {
  metrics: AgentBiMetric[];
  overviewRows: AgentBiRow[];
  topAgentRows: AgentBiRow[];
};

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

export async function getAgentBiSnapshot(locale: Locale): Promise<AgentBiSnapshot> {
  const [
    activeAgents,
    levelBreakdown,
    parentLinkedCount,
    frozenAgentCount,
    profileAggregate,
    pendingWithdrawalCount,
    pendingWithdrawalAmount,
    settledWithdrawalAmount,
    commissionByKind,
    topAgents,
  ] = await Promise.all([
    prisma.agentProfile.count({
      where: {
        status: "active",
      },
    }),
    prisma.agentProfile.groupBy({
      by: ["level"],
      _count: {
        _all: true,
      },
      where: {
        status: "active",
      },
    }),
    prisma.agentProfile.count({
      where: {
        status: "active",
        parentAgentId: {
          not: null,
        },
      },
    }),
    prisma.agentProfile.count({
      where: {
        status: "frozen",
      },
    }),
    prisma.agentProfile.aggregate({
      _sum: {
        totalReferredUsers: true,
        monthlyRechargeAmount: true,
        totalCommission: true,
        unsettledCommission: true,
      },
      _count: {
        _all: true,
      },
      where: {
        status: "active",
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
    prisma.agentCommissionLedger.groupBy({
      by: ["kind"],
      _sum: {
        commissionAmount: true,
      },
    }),
    prisma.agentProfile.findMany({
      where: {
        status: "active",
      },
      orderBy: [{ totalCommission: "desc" }, { monthlyRechargeAmount: "desc" }, { updatedAt: "desc" }],
      take: 5,
      include: {
        parentAgent: {
          select: {
            displayName: true,
          },
        },
      },
    }),
  ]);

  const levelMap = new Map(levelBreakdown.map((item) => [item.level, item._count._all]));
  const totalReferredUsers = profileAggregate._sum.totalReferredUsers ?? 0;
  const monthlyRechargeAmount = profileAggregate._sum.monthlyRechargeAmount ?? 0;
  const totalCommission = profileAggregate._sum.totalCommission ?? 0;
  const unsettledCommission = profileAggregate._sum.unsettledCommission ?? 0;
  const pendingWithdrawalTotal = pendingWithdrawalAmount._sum.amount ?? 0;
  const settledWithdrawalTotal = settledWithdrawalAmount._sum.amount ?? 0;
  const directCommission = commissionByKind.find((item) => item.kind === "direct")?._sum.commissionAmount ?? 0;
  const downstreamCommission = commissionByKind.find((item) => item.kind === "downstream")?._sum.commissionAmount ?? 0;
  const averageUsersPerAgent = activeAgents > 0 ? totalReferredUsers / activeAgents : 0;
  const topLevelCount = Math.max(0, activeAgents - parentLinkedCount);

  return {
    metrics: [
      {
        label: localizeText(
          { zhCn: "累计归因会员", zhTw: "累計歸因會員", en: "Attributed users" },
          locale,
        ),
        value: formatNumber(totalReferredUsers, locale),
        description: localizeText(
          {
            zhCn: `活跃代理 ${formatNumber(activeAgents, locale)}，人均 ${formatNumber(Math.round(averageUsersPerAgent), locale)} 名会员。`,
            zhTw: `活躍代理 ${formatNumber(activeAgents, locale)}，人均 ${formatNumber(Math.round(averageUsersPerAgent), locale)} 名會員。`,
            en: `${formatNumber(activeAgents, locale)} active agents, averaging ${formatNumber(Math.round(averageUsersPerAgent), locale)} users.`,
          },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "代理累计佣金", zhTw: "代理累計佣金", en: "Agent commission" },
          locale,
        ),
        value: formatCurrency(totalCommission, locale),
        description: localizeText(
          {
            zhCn: `直推 ${formatCurrency(directCommission, locale)} / 下级 ${formatCurrency(downstreamCommission, locale)}。`,
            zhTw: `直推 ${formatCurrency(directCommission, locale)} / 下級 ${formatCurrency(downstreamCommission, locale)}。`,
            en: `Direct ${formatCurrency(directCommission, locale)} / downstream ${formatCurrency(downstreamCommission, locale)}.`,
          },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "当前待结算", zhTw: "當前待結算", en: "Unsettled pool" },
          locale,
        ),
        value: formatCurrency(unsettledCommission, locale),
        description: localizeText(
          {
            zhCn: `待处理提现 ${formatNumber(pendingWithdrawalCount, locale)} 笔 / ${formatCurrency(pendingWithdrawalTotal, locale)}。`,
            zhTw: `待處理提現 ${formatNumber(pendingWithdrawalCount, locale)} 筆 / ${formatCurrency(pendingWithdrawalTotal, locale)}。`,
            en: `${formatNumber(pendingWithdrawalCount, locale)} pending withdrawals / ${formatCurrency(pendingWithdrawalTotal, locale)}.`,
          },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "本月归因充值", zhTw: "本月歸因充值", en: "Tracked monthly recharge" },
          locale,
        ),
        value: formatCurrency(monthlyRechargeAmount, locale),
        description: localizeText(
          {
            zhCn: `一级 ${formatNumber(topLevelCount, locale)} / 二三级 ${formatNumber(parentLinkedCount, locale)}。`,
            zhTw: `一級 ${formatNumber(topLevelCount, locale)} / 二三級 ${formatNumber(parentLinkedCount, locale)}。`,
            en: `${formatNumber(topLevelCount, locale)} top-level and ${formatNumber(parentLinkedCount, locale)} downstream agents.`,
          },
          locale,
        ),
      },
    ],
    overviewRows: [
      {
        title: localizeText({ zhCn: "层级覆盖", zhTw: "層級覆蓋", en: "Hierarchy coverage" }, locale),
        subtitle: localizeText(
          {
            zhCn: "聚合查看一级、二级、三级代理分布与上下级挂载情况。",
            zhTw: "聚合查看一級、二級、三級代理分布與上下級掛載情況。",
            en: "Distribution across level 1, 2, and 3 with hierarchy attachment.",
          },
          locale,
        ),
        status: localizeText({ zhCn: "结构稳定", zhTw: "結構穩定", en: "Structured" }, locale),
        tone: "good",
        meta: [
          `${localizeText({ zhCn: "一级", zhTw: "一級", en: "L1" }, locale)} ${formatNumber(levelMap.get("level1") ?? 0, locale)}`,
          `${localizeText({ zhCn: "二级", zhTw: "二級", en: "L2" }, locale)} ${formatNumber(levelMap.get("level2") ?? 0, locale)}`,
          `${localizeText({ zhCn: "三级", zhTw: "三級", en: "L3" }, locale)} ${formatNumber(levelMap.get("level3") ?? 0, locale)}`,
          `${localizeText({ zhCn: "已挂上级", zhTw: "已掛上級", en: "Attached" }, locale)} ${formatNumber(parentLinkedCount, locale)}`,
        ],
      },
      {
        title: localizeText({ zhCn: "分佣结构", zhTw: "分佣結構", en: "Commission mix" }, locale),
        subtitle: localizeText(
          {
            zhCn: "聚合看直推与下级分佣占比，不重复下钻到单条流水。",
            zhTw: "聚合看直推與下級分佣占比，不重複下鑽到單條流水。",
            en: "Split between direct and downstream commission without duplicating ledger details.",
          },
          locale,
        ),
        status: formatCurrency(totalCommission, locale),
        tone: downstreamCommission > 0 ? "good" : "neutral",
        meta: [
          `${localizeText({ zhCn: "直推", zhTw: "直推", en: "Direct" }, locale)} ${formatCurrency(directCommission, locale)}`,
          `${localizeText({ zhCn: "下级", zhTw: "下級", en: "Downstream" }, locale)} ${formatCurrency(downstreamCommission, locale)}`,
          `${localizeText({ zhCn: "待结算", zhTw: "待結算", en: "Unsettled" }, locale)} ${formatCurrency(unsettledCommission, locale)}`,
        ],
      },
      {
        title: localizeText({ zhCn: "提现压力", zhTw: "提現壓力", en: "Withdrawal pressure" }, locale),
        subtitle: localizeText(
          {
            zhCn: "只看待处理与已结算金额，不重复提现审核队列本身。",
            zhTw: "只看待處理與已結算金額，不重複提現審核隊列本身。",
            en: "Aggregate pending and settled amounts without repeating the review queue.",
          },
          locale,
        ),
        status: formatCurrency(pendingWithdrawalTotal, locale),
        tone: pendingWithdrawalTotal > 0 ? "warn" : "good",
        meta: [
          `${localizeText({ zhCn: "待处理笔数", zhTw: "待處理筆數", en: "Pending" }, locale)} ${formatNumber(pendingWithdrawalCount, locale)}`,
          `${localizeText({ zhCn: "已结算", zhTw: "已結算", en: "Settled" }, locale)} ${formatCurrency(settledWithdrawalTotal, locale)}`,
        ],
      },
      {
        title: localizeText({ zhCn: "风险概览", zhTw: "風險概覽", en: "Risk overview" }, locale),
        subtitle: localizeText(
          {
            zhCn: "冻结代理与高待结算池优先进入运营巡检。",
            zhTw: "凍結代理與高待結算池優先進入運營巡檢。",
            en: "Frozen agents and large unsettled pools should be reviewed first.",
          },
          locale,
        ),
        status: formatNumber(frozenAgentCount, locale),
        tone: frozenAgentCount > 0 || unsettledCommission > pendingWithdrawalTotal ? "warn" : "neutral",
        meta: [
          `${localizeText({ zhCn: "冻结代理", zhTw: "凍結代理", en: "Frozen" }, locale)} ${formatNumber(frozenAgentCount, locale)}`,
          `${localizeText({ zhCn: "待结算池", zhTw: "待結算池", en: "Unsettled pool" }, locale)} ${formatCurrency(unsettledCommission, locale)}`,
        ],
      },
    ],
    topAgentRows: topAgents.map((agent, index) => ({
      title: `${index + 1}. ${agent.displayName}`,
      subtitle: agent.parentAgent?.displayName
        ? localizeText(
            {
              zhCn: `${agent.level} / 上级 ${agent.parentAgent.displayName}`,
              zhTw: `${agent.level} / 上級 ${agent.parentAgent.displayName}`,
              en: `${agent.level} / parent ${agent.parentAgent.displayName}`,
            },
            locale,
          )
        : localizeText(
            {
              zhCn: `${agent.level} / 顶级直属`,
              zhTw: `${agent.level} / 頂級直屬`,
              en: `${agent.level} / top-level`,
            },
            locale,
          ),
      status: formatCurrency(agent.totalCommission, locale),
      tone: index < 2 ? "good" : "neutral",
      meta: [
        `${localizeText({ zhCn: "会员", zhTw: "會員", en: "Users" }, locale)} ${formatNumber(agent.totalReferredUsers, locale)}`,
        `${localizeText({ zhCn: "月充值", zhTw: "月充值", en: "Monthly recharge" }, locale)} ${formatCurrency(agent.monthlyRechargeAmount, locale)}`,
        `${localizeText({ zhCn: "待结算", zhTw: "待結算", en: "Unsettled" }, locale)} ${formatCurrency(agent.unsettledCommission, locale)}`,
      ],
    })),
  };
}
