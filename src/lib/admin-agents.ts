import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n-config";

type AgentLevel = "level1" | "level2" | "level3";
type AgentStatus = "active" | "frozen" | "inactive";
type AgentApplicationStatus = "pending" | "approved" | "rejected" | "needs-material";
type CampaignStatus = "draft" | "active" | "archived";
type LeadStatus = "new" | "following" | "won" | "invalid";
type WithdrawalStatus = "pending" | "reviewing" | "paying" | "settled" | "rejected" | "frozen";

export type AdminAgentMetric = {
  label: string;
  value: string;
  description: string;
};

export type AdminAgentApplicationRecord = {
  id: string;
  applicantName: string;
  phone: string;
  contact?: string;
  channelSummary: string;
  expectedMonthlyUsers?: number;
  desiredLevel: AgentLevel;
  status: AgentApplicationStatus;
  reviewerNote?: string;
  reviewedAt?: string;
  createdAt: string;
  approvedAgentId?: string;
};

export type AdminAgentProfileRecord = {
  id: string;
  displayName: string;
  level: AgentLevel;
  status: AgentStatus;
  inviteCode: string;
  inviteUrl?: string;
  parentAgentId?: string;
  parentAgentName?: string;
  commissionRate: number;
  downstreamRate: number;
  contactName?: string;
  contactPhone?: string;
  channelSummary?: string;
  payoutAccount?: string;
  totalReferredUsers: number;
  monthlyRechargeAmount: number;
  totalCommission: number;
  unsettledCommission: number;
  notes?: string;
  updatedAt: string;
};

export type AdminAgentCampaignRecord = {
  id: string;
  name: string;
  description?: string;
  incentivePolicy?: string;
  targetAgentCount: number;
  startsAt?: string;
  endsAt?: string;
  isPublic: boolean;
  status: CampaignStatus;
  createdAt: string;
  leadCount: number;
};

export type AdminRecruitmentLeadRecord = {
  id: string;
  name: string;
  phone: string;
  sourceChannel: string;
  desiredLevel: AgentLevel;
  status: LeadStatus;
  note?: string;
  ownerName?: string;
  campaignId?: string;
  campaignName?: string;
  agentId?: string;
  agentName?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminAgentWithdrawalRecord = {
  id: string;
  agentId: string;
  agentName: string;
  amount: number;
  status: WithdrawalStatus;
  payoutAccount?: string;
  note?: string;
  proofUrl?: string;
  requestedAt: string;
  reviewedAt?: string;
  settledAt?: string;
  rejectionReason?: string;
};

export type AdminAgentCommissionLedgerRecord = {
  id: string;
  agentId: string;
  agentName: string;
  userDisplayName: string;
  userEmail: string;
  rechargeOrderNo: string;
  rechargeAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: "pending" | "settled" | "reversed";
  createdAt: string;
  settledAt?: string;
  reversedAt?: string;
  note?: string;
};

export type AdminAgentOption = {
  id: string;
  label: string;
};

export type AdminAgentsDashboard = {
  metrics: AdminAgentMetric[];
  applications: AdminAgentApplicationRecord[];
  agents: AdminAgentProfileRecord[];
  campaigns: AdminAgentCampaignRecord[];
  leads: AdminRecruitmentLeadRecord[];
  withdrawals: AdminAgentWithdrawalRecord[];
  commissionLedgers: AdminAgentCommissionLedgerRecord[];
  agentOptions: AdminAgentOption[];
  campaignOptions: AdminAgentOption[];
};

const adminPaths = ["/admin"];

function safeRevalidate(paths: string[]) {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("static generation store missing")) {
        throw error;
      }
    }
  }
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
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

function parseIntValue(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFloatValue(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseOptionalText(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw || undefined;
}

function normalizeAgentLevel(value: string): AgentLevel {
  if (value === "level2" || value === "level3") {
    return value;
  }

  return "level1";
}

function normalizeAgentStatus(value: string): AgentStatus {
  if (value === "frozen" || value === "inactive") {
    return value;
  }

  return "active";
}

function normalizeApplicationStatus(value: string): AgentApplicationStatus {
  if (value === "approved" || value === "rejected" || value === "needs-material") {
    return value;
  }

  return "pending";
}

function normalizeCampaignStatus(value: string): CampaignStatus {
  if (value === "active" || value === "archived") {
    return value;
  }

  return "draft";
}

function normalizeLeadStatus(value: string): LeadStatus {
  if (value === "following" || value === "won" || value === "invalid") {
    return value;
  }

  return "new";
}

function normalizeWithdrawalStatus(value: string): WithdrawalStatus {
  if (value === "reviewing" || value === "paying" || value === "settled" || value === "rejected" || value === "frozen") {
    return value;
  }

  return "pending";
}

async function generateUniqueInviteCode() {
  while (true) {
    const code = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
    const existing = await prisma.agentProfile.findUnique({
      where: { inviteCode: code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }
}

function buildInviteUrl(code: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    "";

  if (!baseUrl) {
    return `/register?invite=${code}`;
  }

  return `${baseUrl.replace(/\/+$/, "")}/register?invite=${code}`;
}

export async function getAdminAgentsDashboard(locale: Locale): Promise<AdminAgentsDashboard> {
  const [
    applicationsRaw,
    agentsRaw,
    campaignsRaw,
    leadsRaw,
    withdrawalsRaw,
    commissionLedgersRaw,
  ] = await Promise.all([
    prisma.agentApplication.findMany({
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 12,
    }),
    prisma.agentProfile.findMany({
      orderBy: [{ level: "asc" }, { updatedAt: "desc" }],
      include: {
        parentAgent: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      take: 16,
    }),
    prisma.agentCampaign.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: {
            leads: true,
          },
        },
      },
      take: 12,
    }),
    prisma.recruitmentLead.findMany({
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
        agent: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      take: 12,
    }),
    prisma.agentWithdrawal.findMany({
      orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
      include: {
        agent: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      take: 12,
    }),
    prisma.agentCommissionLedger.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        agent: {
          select: {
            id: true,
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
      take: 12,
    }),
  ]);

  const pendingApplications = await prisma.agentApplication.count({
    where: {
      status: "pending",
    },
  });

  const activeAgents = await prisma.agentProfile.count({
    where: {
      status: "active",
    },
  });

  const leadStats = await prisma.recruitmentLead.groupBy({
    by: ["status"],
    _count: {
      _all: true,
    },
  });

  const unsettledWithdrawalAggregate = await prisma.agentWithdrawal.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      status: {
        in: ["pending", "reviewing", "paying"],
      },
    },
  });

  const unsettledCommissionAggregate = await prisma.agentProfile.aggregate({
    _sum: {
      unsettledCommission: true,
    },
  });

  const leadsByStatus = new Map(leadStats.map((item) => [item.status, item._count._all]));

  return {
    metrics: [
      {
        label: localizeText(
          { zhCn: "待审代理申请", zhTw: "待審代理申請", en: "Pending applications" },
          locale,
        ),
        value: formatCompactNumber(pendingApplications),
        description: localizeText(
          { zhCn: "进入审批流、可直接转正式代理。", zhTw: "進入審批流、可直接轉正式代理。", en: "Ready for review and approval." },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "有效代理数", zhTw: "有效代理數", en: "Active agents" },
          locale,
        ),
        value: formatCompactNumber(activeAgents),
        description: localizeText(
          { zhCn: "已生成邀请码并可持续归因。", zhTw: "已生成邀請碼並可持續歸因。", en: "Invite codes are active and attributable." },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "招商线索池", zhTw: "招商線索池", en: "Lead pipeline" },
          locale,
        ),
        value: formatCompactNumber(leadsByStatus.get("new") ?? 0),
        description: localizeText(
          { zhCn: `跟进中 ${formatCompactNumber(leadsByStatus.get("following") ?? 0)} 条`, zhTw: `跟進中 ${formatCompactNumber(leadsByStatus.get("following") ?? 0)} 條`, en: `Following ${formatCompactNumber(leadsByStatus.get("following") ?? 0)}` },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "待结算佣金", zhTw: "待結算佣金", en: "Unsettled commission" },
          locale,
        ),
        value: `CNY ${formatCompactNumber(unsettledCommissionAggregate._sum.unsettledCommission ?? 0)}`,
        description: localizeText(
          { zhCn: `提现审核中 ${formatCompactNumber(unsettledWithdrawalAggregate._sum.amount ?? 0)} 元`, zhTw: `提現審核中 ${formatCompactNumber(unsettledWithdrawalAggregate._sum.amount ?? 0)} 元`, en: `Withdrawals pending CNY ${formatCompactNumber(unsettledWithdrawalAggregate._sum.amount ?? 0)}` },
          locale,
        ),
      },
    ],
    applications: applicationsRaw.map((item) => ({
      id: item.id,
      applicantName: item.applicantName,
      phone: item.phone,
      contact: item.contact ?? undefined,
      channelSummary: item.channelSummary,
      expectedMonthlyUsers: item.expectedMonthlyUsers ?? undefined,
      desiredLevel: normalizeAgentLevel(item.desiredLevel),
      status: normalizeApplicationStatus(item.status),
      reviewerNote: item.reviewerNote ?? undefined,
      reviewedAt: item.reviewedAt?.toISOString(),
      createdAt: item.createdAt.toISOString(),
      approvedAgentId: item.approvedAgentId ?? undefined,
    })),
    agents: agentsRaw.map((item) => ({
      id: item.id,
      displayName: item.displayName,
      level: normalizeAgentLevel(item.level),
      status: normalizeAgentStatus(item.status),
      inviteCode: item.inviteCode,
      inviteUrl: item.inviteUrl ?? undefined,
      parentAgentId: item.parentAgentId ?? undefined,
      parentAgentName: item.parentAgent?.displayName ?? undefined,
      commissionRate: item.commissionRate,
      downstreamRate: item.downstreamRate,
      contactName: item.contactName ?? undefined,
      contactPhone: item.contactPhone ?? undefined,
      channelSummary: item.channelSummary ?? undefined,
      payoutAccount: item.payoutAccount ?? undefined,
      totalReferredUsers: item.totalReferredUsers,
      monthlyRechargeAmount: item.monthlyRechargeAmount,
      totalCommission: item.totalCommission,
      unsettledCommission: item.unsettledCommission,
      notes: item.notes ?? undefined,
      updatedAt: item.updatedAt.toISOString(),
    })),
    campaigns: campaignsRaw.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description ?? undefined,
      incentivePolicy: item.incentivePolicy ?? undefined,
      targetAgentCount: item.targetAgentCount,
      startsAt: item.startsAt?.toISOString(),
      endsAt: item.endsAt?.toISOString(),
      isPublic: item.isPublic,
      status: normalizeCampaignStatus(item.status),
      createdAt: item.createdAt.toISOString(),
      leadCount: item._count.leads,
    })),
    leads: leadsRaw.map((item) => ({
      id: item.id,
      name: item.name,
      phone: item.phone,
      sourceChannel: item.sourceChannel,
      desiredLevel: normalizeAgentLevel(item.desiredLevel),
      status: normalizeLeadStatus(item.status),
      note: item.note ?? undefined,
      ownerName: item.ownerName ?? undefined,
      campaignId: item.campaignId ?? undefined,
      campaignName: item.campaign?.name ?? undefined,
      agentId: item.agentId ?? undefined,
      agentName: item.agent?.displayName ?? undefined,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    withdrawals: withdrawalsRaw.map((item) => ({
      id: item.id,
      agentId: item.agentId,
      agentName: item.agent.displayName,
      amount: item.amount,
      status: normalizeWithdrawalStatus(item.status),
      payoutAccount: item.payoutAccount ?? undefined,
      note: item.note ?? undefined,
      proofUrl: item.proofUrl ?? undefined,
      requestedAt: item.requestedAt.toISOString(),
      reviewedAt: item.reviewedAt?.toISOString(),
      settledAt: item.settledAt?.toISOString(),
      rejectionReason: item.rejectionReason ?? undefined,
    })),
    commissionLedgers: commissionLedgersRaw.map((item) => ({
      id: item.id,
      agentId: item.agentId,
      agentName: item.agent.displayName,
      userDisplayName: item.user.displayName,
      userEmail: item.user.email,
      rechargeOrderNo: item.rechargeOrder.orderNo,
      rechargeAmount: item.rechargeAmount,
      commissionRate: item.commissionRate,
      commissionAmount: item.commissionAmount,
      status:
        item.status === "settled" || item.status === "reversed"
          ? item.status
          : "pending",
      createdAt: item.createdAt.toISOString(),
      settledAt: item.settledAt?.toISOString(),
      reversedAt: item.reversedAt?.toISOString(),
      note: item.note ?? undefined,
    })),
    agentOptions: agentsRaw.map((item) => ({
      id: item.id,
      label: `${item.displayName} / ${item.inviteCode}`,
    })),
    campaignOptions: campaignsRaw.map((item) => ({
      id: item.id,
      label: item.name,
    })),
  };
}

export async function saveAgentApplication(formData: FormData) {
  const id = parseOptionalText(formData.get("id"));

  const payload = {
    applicantName: String(formData.get("applicantName") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    contact: parseOptionalText(formData.get("contact")) ?? null,
    channelSummary: String(formData.get("channelSummary") || "").trim(),
    expectedMonthlyUsers: parseIntValue(formData.get("expectedMonthlyUsers")) || null,
    desiredLevel: normalizeAgentLevel(String(formData.get("desiredLevel") || "level1")),
  };

  if (!payload.applicantName || !payload.phone || !payload.channelSummary) {
    throw new Error("AGENT_APPLICATION_INVALID");
  }

  if (id) {
    await prisma.agentApplication.update({
      where: { id },
      data: payload,
    });
  } else {
    await prisma.agentApplication.create({
      data: payload,
    });
  }

  safeRevalidate(adminPaths);
}

export async function reviewAgentApplication(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const action = String(formData.get("reviewAction") || "approve").trim();
  const reviewerNote = parseOptionalText(formData.get("reviewerNote"));
  const parentAgentId = parseOptionalText(formData.get("parentAgentId")) ?? null;

  const application = await prisma.agentApplication.findUnique({
    where: { id },
  });

  if (!application) {
    throw new Error("AGENT_APPLICATION_NOT_FOUND");
  }

  if (action === "approve") {
    await prisma.$transaction(async (tx) => {
      const inviteCode = await generateUniqueInviteCode();
      const agent = await tx.agentProfile.create({
        data: {
          displayName: application.applicantName,
          level: normalizeAgentLevel(application.desiredLevel),
          status: "active",
          inviteCode,
          inviteUrl: buildInviteUrl(inviteCode),
          contactName: application.applicantName,
          contactPhone: application.phone,
          channelSummary: application.channelSummary,
          parentAgentId,
        },
      });

      await tx.agentApplication.update({
        where: { id: application.id },
        data: {
          status: "approved",
          reviewerNote: reviewerNote ?? null,
          reviewedAt: new Date(),
          approvedAgentId: agent.id,
        },
      });
    });
  } else {
    await prisma.agentApplication.update({
      where: { id: application.id },
      data: {
        status: action === "needs-material" ? "needs-material" : "rejected",
        reviewerNote: reviewerNote ?? null,
        reviewedAt: new Date(),
      },
    });
  }

  safeRevalidate(adminPaths);
}

export async function saveAgentProfile(formData: FormData) {
  const id = parseOptionalText(formData.get("id"));
  const inviteCodeInput = parseOptionalText(formData.get("inviteCode"));
  const inviteCode = inviteCodeInput || (await generateUniqueInviteCode());

  const payload = {
    displayName: String(formData.get("displayName") || "").trim(),
    level: normalizeAgentLevel(String(formData.get("level") || "level1")),
    status: normalizeAgentStatus(String(formData.get("status") || "active")),
    inviteCode,
    inviteUrl: buildInviteUrl(inviteCode),
    parentAgentId: parseOptionalText(formData.get("parentAgentId")) ?? null,
    commissionRate: parseFloatValue(formData.get("commissionRate")),
    downstreamRate: parseFloatValue(formData.get("downstreamRate")),
    contactName: parseOptionalText(formData.get("contactName")) ?? null,
    contactPhone: parseOptionalText(formData.get("contactPhone")) ?? null,
    channelSummary: parseOptionalText(formData.get("channelSummary")) ?? null,
    payoutAccount: parseOptionalText(formData.get("payoutAccount")) ?? null,
    totalReferredUsers: parseIntValue(formData.get("totalReferredUsers")),
    monthlyRechargeAmount: parseIntValue(formData.get("monthlyRechargeAmount")),
    totalCommission: parseIntValue(formData.get("totalCommission")),
    unsettledCommission: parseIntValue(formData.get("unsettledCommission")),
    notes: parseOptionalText(formData.get("notes")) ?? null,
  };

  if (!payload.displayName) {
    throw new Error("AGENT_PROFILE_INVALID");
  }

  if (id) {
    await prisma.agentProfile.update({
      where: { id },
      data: payload,
    });
  } else {
    await prisma.agentProfile.create({
      data: payload,
    });
  }

  safeRevalidate(adminPaths);
}

export async function toggleAgentProfileStatus(id: string) {
  const record = await prisma.agentProfile.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
    },
  });

  if (!record) {
    throw new Error("AGENT_PROFILE_NOT_FOUND");
  }

  await prisma.agentProfile.update({
    where: { id },
    data: {
      status: record.status === "active" ? "frozen" : "active",
    },
  });

  safeRevalidate(adminPaths);
}

export async function saveAgentCampaign(formData: FormData) {
  const id = parseOptionalText(formData.get("id"));
  const payload = {
    name: String(formData.get("name") || "").trim(),
    description: parseOptionalText(formData.get("description")) ?? null,
    incentivePolicy: parseOptionalText(formData.get("incentivePolicy")) ?? null,
    targetAgentCount: parseIntValue(formData.get("targetAgentCount")),
    startsAt: parseOptionalDate(formData.get("startsAt")),
    endsAt: parseOptionalDate(formData.get("endsAt")),
    isPublic: String(formData.get("isPublic") || "") === "on",
    status: normalizeCampaignStatus(String(formData.get("status") || "draft")),
  };

  if (!payload.name) {
    throw new Error("AGENT_CAMPAIGN_INVALID");
  }

  if (id) {
    await prisma.agentCampaign.update({
      where: { id },
      data: payload,
    });
  } else {
    await prisma.agentCampaign.create({
      data: payload,
    });
  }

  safeRevalidate(adminPaths);
}

export async function saveRecruitmentLead(formData: FormData) {
  const id = parseOptionalText(formData.get("id"));
  const payload = {
    name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    sourceChannel: String(formData.get("sourceChannel") || "").trim(),
    desiredLevel: normalizeAgentLevel(String(formData.get("desiredLevel") || "level1")),
    status: normalizeLeadStatus(String(formData.get("status") || "new")),
    note: parseOptionalText(formData.get("note")) ?? null,
    ownerName: parseOptionalText(formData.get("ownerName")) ?? null,
    campaignId: parseOptionalText(formData.get("campaignId")) ?? null,
    agentId: parseOptionalText(formData.get("agentId")) ?? null,
  };

  if (!payload.name || !payload.phone || !payload.sourceChannel) {
    throw new Error("RECRUITMENT_LEAD_INVALID");
  }

  if (id) {
    await prisma.recruitmentLead.update({
      where: { id },
      data: payload,
    });
  } else {
    await prisma.recruitmentLead.create({
      data: payload,
    });
  }

  safeRevalidate(adminPaths);
}

export async function saveAgentWithdrawal(formData: FormData) {
  const id = parseOptionalText(formData.get("id"));
  const payload = {
    agentId: String(formData.get("agentId") || "").trim(),
    amount: parseIntValue(formData.get("amount")),
    status: normalizeWithdrawalStatus(String(formData.get("status") || "pending")),
    payoutAccount: parseOptionalText(formData.get("payoutAccount")) ?? null,
    note: parseOptionalText(formData.get("note")) ?? null,
    proofUrl: parseOptionalText(formData.get("proofUrl")) ?? null,
    rejectionReason: parseOptionalText(formData.get("rejectionReason")) ?? null,
    reviewedAt: ["reviewing", "paying", "settled", "rejected", "frozen"].includes(String(formData.get("status") || "pending"))
      ? new Date()
      : null,
    settledAt: String(formData.get("status") || "pending") === "settled" ? new Date() : null,
  };

  if (!payload.agentId || payload.amount <= 0) {
    throw new Error("AGENT_WITHDRAWAL_INVALID");
  }

  if (id) {
    await prisma.agentWithdrawal.update({
      where: { id },
      data: payload,
    });
  } else {
    await prisma.agentWithdrawal.create({
      data: {
        ...payload,
        requestedAt: new Date(),
      },
    });
  }

  safeRevalidate(adminPaths);
}
