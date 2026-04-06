import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { settleAgentWithdrawalCommission } from "@/lib/agent-attribution";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n-config";

type AgentLevel = "level1" | "level2" | "level3";
type AgentStatus = "active" | "frozen" | "inactive";
type AgentApplicationStatus = "pending" | "approved" | "rejected" | "needs-material";
type CampaignStatus = "draft" | "active" | "archived";
type LeadStatus = "new" | "following" | "won" | "invalid";
type WithdrawalStatus = "pending" | "reviewing" | "paying" | "settled" | "rejected" | "frozen";
type AgentTransactionClient = Prisma.TransactionClient;
type AgentWithdrawalPayload = {
  agentId: string;
  amount: number;
  status: WithdrawalStatus;
  payoutAccount: string | null;
  payoutChannel: string | null;
  payoutBatchNo: string | null;
  payoutReference: string | null;
  payoutOperator: string | null;
  payoutRequestedAt: Date | null;
  callbackStatus: string | null;
  callbackPayload: string | null;
  callbackReceivedAt: Date | null;
  note: string | null;
  proofUrl: string | null;
  rejectionReason: string | null;
  reviewedAt: Date | null;
  settledAt: Date | null;
};

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
  payoutChannel?: string;
  payoutBatchNo?: string;
  payoutReference?: string;
  payoutOperator?: string;
  payoutRequestedAt?: string;
  callbackStatus?: string;
  callbackPayload?: string;
  callbackReceivedAt?: string;
  note?: string;
  proofUrl?: string;
  requestedAt: string;
  reviewedAt?: string;
  settledAt?: string;
  rejectionReason?: string;
  allocationCount: number;
  allocatedAmount: number;
  allocationSummary: string[];
};

export type AdminAgentWithdrawalExceptionRecord = {
  id: string;
  agentName: string;
  amount: number;
  status: WithdrawalStatus;
  exceptionType: "missing-batch" | "missing-proof" | "callback-abnormal" | "batch-without-request";
  exceptionLabel: string;
  payoutBatchNo?: string;
  callbackStatus?: string;
  proofUrl?: string;
  updatedAt: string;
};

export type AdminAgentCommissionLedgerRecord = {
  id: string;
  agentId: string;
  agentName: string;
  kind: "direct" | "downstream";
  sourceAgentId?: string;
  sourceAgentName?: string;
  userDisplayName: string;
  userEmail: string;
  rechargeOrderNo: string;
  rechargeAmount: number;
  commissionRate: number;
  commissionAmount: number;
  settledAmount: number;
  reversedAmount: number;
  availableAmount: number;
  status: "pending" | "partial" | "settled" | "reversed";
  createdAt: string;
  settledAt?: string;
  reversedAt?: string;
  note?: string;
};

export type AdminAgentOption = {
  id: string;
  label: string;
};

export type AgentWithdrawalBatchResult = {
  totalCount: number;
  processedCount: number;
  skippedCount: number;
  failedCount: number;
};

export type AgentWithdrawalCallbackResult = {
  withdrawalId: string;
  previousStatus: WithdrawalStatus;
  status: WithdrawalStatus;
  callbackReceivedAt: string;
  lockedToSettled: boolean;
};

export type AgentPerformanceSnapshotRecord = {
  agentId: string;
  agentName: string;
  inviteCode: string;
  level: AgentLevel;
  status: AgentStatus;
  parentAgentName?: string;
  referredUsers: number;
  childAgents: number;
  directOrderCount: number;
  directRechargeAmount: number;
  directCommissionNet: number;
  downstreamCommissionNet: number;
  totalCommissionNet: number;
  unsettledCommission: number;
  settledWithdrawalAmount: number;
  pendingWithdrawalAmount: number;
  rejectionWithdrawalAmount: number;
};

type AdminAgentCommissionLedgerRow = {
  id: string;
  agentId: string;
  kind?: string | null;
  sourceAgentId?: string | null;
  sourceAgentName?: string | null;
  rechargeAmount: number;
  commissionRate: number;
  commissionAmount: number;
  settledAmount: number;
  reversedAmount: number;
  status: string;
  note?: string | null;
  createdAt: Date;
  settledAt?: Date | null;
  reversedAt?: Date | null;
  agent: {
    id: string;
    displayName: string;
  };
  user: {
    displayName: string;
    email: string;
  };
  rechargeOrder: {
    orderNo: string;
  };
};

export type AdminAgentsDashboard = {
  metrics: AdminAgentMetric[];
  performanceMetrics: AdminAgentMetric[];
  applications: AdminAgentApplicationRecord[];
  agents: AdminAgentProfileRecord[];
  performanceRecords: AgentPerformanceSnapshotRecord[];
  campaigns: AdminAgentCampaignRecord[];
  leads: AdminRecruitmentLeadRecord[];
  withdrawals: AdminAgentWithdrawalRecord[];
  withdrawalExceptions: AdminAgentWithdrawalExceptionRecord[];
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

function normalizeUniqueValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
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

function parseMultiLineRefs(value: string) {
  return value
    .split(/[\r\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildMergedNote(currentNote?: string | null, nextNote?: string | null) {
  const incoming = nextNote?.trim();

  if (!incoming) {
    return currentNote ?? null;
  }

  if (!currentNote?.trim()) {
    return incoming;
  }

  if (currentNote.includes(incoming)) {
    return currentNote;
  }

  return `${currentNote}\n${incoming}`;
}

function getWithdrawalPayloadFromFormData(formData: FormData): AgentWithdrawalPayload {
  const requestedStatus = normalizeWithdrawalStatus(String(formData.get("status") || "pending"));

  return {
    agentId: String(formData.get("agentId") || "").trim(),
    amount: parseIntValue(formData.get("amount")),
    status: requestedStatus,
    payoutAccount: parseOptionalText(formData.get("payoutAccount")) ?? null,
    payoutChannel: parseOptionalText(formData.get("payoutChannel")) ?? null,
    payoutBatchNo: parseOptionalText(formData.get("payoutBatchNo")) ?? null,
    payoutReference: parseOptionalText(formData.get("payoutReference")) ?? null,
    payoutOperator: parseOptionalText(formData.get("payoutOperator")) ?? null,
    payoutRequestedAt:
      requestedStatus === "paying" || requestedStatus === "settled"
        ? new Date()
        : null,
    callbackStatus: parseOptionalText(formData.get("callbackStatus")) ?? null,
    callbackPayload: parseOptionalText(formData.get("callbackPayload")) ?? null,
    callbackReceivedAt: parseOptionalDate(formData.get("callbackReceivedAt")),
    note: parseOptionalText(formData.get("note")) ?? null,
    proofUrl: parseOptionalText(formData.get("proofUrl")) ?? null,
    rejectionReason: parseOptionalText(formData.get("rejectionReason")) ?? null,
    reviewedAt: ["reviewing", "paying", "settled", "rejected", "frozen"].includes(requestedStatus)
      ? new Date()
      : null,
    settledAt: requestedStatus === "settled" ? new Date() : null,
  };
}

async function updateExistingAgentWithdrawal(
  tx: AgentTransactionClient,
  input: {
    id: string;
    payload: AgentWithdrawalPayload;
  },
) {
  const existing = await tx.agentWithdrawal.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      status: true,
      settledAt: true,
    },
  });

  if (!existing) {
    throw new Error("AGENT_WITHDRAWAL_NOT_FOUND");
  }

  if (existing.status === "settled" && input.payload.status !== "settled") {
    throw new Error("AGENT_WITHDRAWAL_LOCKED");
  }

  if (input.payload.status === "settled") {
    await tx.agentWithdrawal.update({
      where: { id: input.id },
      data: {
        ...input.payload,
        status: existing.status === "settled" ? "settled" : "paying",
        settledAt: existing.status === "settled" ? existing.settledAt ?? input.payload.settledAt : null,
      },
    });

    if (existing.status !== "settled") {
      await settleAgentWithdrawalCommission(tx, {
        withdrawalId: input.id,
      });
    }

    return;
  }

  await tx.agentWithdrawal.update({
    where: { id: input.id },
    data: input.payload,
  });
}

type AgentWithdrawalMutationInput = {
  id?: string;
  agentId: string;
  amount: number;
  status: WithdrawalStatus;
  payoutAccount?: string;
  payoutChannel?: string;
  payoutBatchNo?: string;
  payoutReference?: string;
  payoutOperator?: string;
  payoutRequestedAt?: Date;
  callbackStatus?: string;
  callbackPayload?: string;
  callbackReceivedAt?: Date;
  note?: string;
  proofUrl?: string;
  rejectionReason?: string;
  preserveExistingFields?: boolean;
};

export type AgentWithdrawalCallbackInput = {
  withdrawalId: string;
  status?: string | null;
  payoutAccount?: string | null;
  payoutChannel?: string | null;
  payoutBatchNo?: string | null;
  payoutReference?: string | null;
  payoutOperator?: string | null;
  payoutRequestedAt?: string | Date | null;
  callbackStatus?: string | null;
  callbackPayload?: unknown;
  callbackReceivedAt?: string | Date | null;
  note?: string | null;
  proofUrl?: string | null;
  rejectionReason?: string | null;
};

async function upsertAgentWithdrawalByAdmin(input: AgentWithdrawalMutationInput) {
  const requestedStatus = normalizeWithdrawalStatus(input.status);
  const payload: AgentWithdrawalPayload = {
    agentId: input.agentId,
    amount: input.amount,
    status: requestedStatus,
    payoutAccount: input.payoutAccount ?? null,
    payoutChannel: input.payoutChannel ?? null,
    payoutBatchNo: input.payoutBatchNo ?? null,
    payoutReference: input.payoutReference ?? null,
    payoutOperator: input.payoutOperator ?? null,
    payoutRequestedAt:
      input.payoutRequestedAt ??
      (requestedStatus === "paying" || requestedStatus === "settled" ? new Date() : null),
    callbackStatus: input.callbackStatus ?? null,
    callbackPayload: input.callbackPayload ?? null,
    callbackReceivedAt: input.callbackReceivedAt ?? null,
    note: input.note ?? null,
    proofUrl: input.proofUrl ?? null,
    rejectionReason: input.rejectionReason ?? null,
    reviewedAt: ["reviewing", "paying", "settled", "rejected", "frozen"].includes(requestedStatus)
      ? new Date()
      : null,
    settledAt: requestedStatus === "settled" ? new Date() : null,
  };

  if (!payload.agentId || payload.amount <= 0) {
    throw new Error("AGENT_WITHDRAWAL_INVALID");
  }

  if (input.id) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.agentWithdrawal.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          agentId: true,
          amount: true,
          status: true,
          payoutAccount: true,
          payoutChannel: true,
          payoutBatchNo: true,
          payoutReference: true,
          payoutOperator: true,
          payoutRequestedAt: true,
          callbackStatus: true,
          callbackPayload: true,
          callbackReceivedAt: true,
          note: true,
          proofUrl: true,
          rejectionReason: true,
          reviewedAt: true,
          settledAt: true,
        },
      });

      if (!existing) {
        throw new Error("AGENT_WITHDRAWAL_NOT_FOUND");
      }

      if (existing.status === "settled" && requestedStatus !== "settled") {
        throw new Error("AGENT_WITHDRAWAL_LOCKED");
      }

      const nextPayload: AgentWithdrawalPayload = input.preserveExistingFields
        ? {
            agentId: existing.agentId,
            amount: existing.amount,
            status: requestedStatus,
            payoutAccount: input.payoutAccount ?? existing.payoutAccount ?? null,
            payoutChannel: input.payoutChannel ?? existing.payoutChannel ?? null,
            payoutBatchNo: input.payoutBatchNo ?? existing.payoutBatchNo ?? null,
            payoutReference: input.payoutReference ?? existing.payoutReference ?? null,
            payoutOperator: input.payoutOperator ?? existing.payoutOperator ?? null,
            payoutRequestedAt:
              input.payoutRequestedAt ??
              existing.payoutRequestedAt ??
              (requestedStatus === "paying" || requestedStatus === "settled" ? new Date() : null),
            callbackStatus: input.callbackStatus ?? existing.callbackStatus ?? null,
            callbackPayload: input.callbackPayload ?? existing.callbackPayload ?? null,
            callbackReceivedAt: input.callbackReceivedAt ?? existing.callbackReceivedAt ?? null,
            note: buildMergedNote(existing.note, input.note),
            proofUrl: input.proofUrl ?? existing.proofUrl ?? null,
            rejectionReason:
              requestedStatus === "rejected"
                ? input.rejectionReason ?? existing.rejectionReason ?? null
                : null,
            reviewedAt: ["reviewing", "paying", "settled", "rejected", "frozen"].includes(requestedStatus)
              ? new Date()
              : null,
            settledAt: requestedStatus === "settled" ? existing.settledAt ?? new Date() : null,
          }
        : payload;

      await updateExistingAgentWithdrawal(tx, {
        id: input.id!,
        payload: nextPayload,
      });
    });

    return;
  }

  await prisma.$transaction(async (tx) => {
    const created = await tx.agentWithdrawal.create({
      data: {
        ...payload,
        status: requestedStatus === "settled" ? "paying" : requestedStatus,
        settledAt: null,
        requestedAt: new Date(),
      },
      select: {
        id: true,
      },
    });

    if (requestedStatus === "settled") {
      await settleAgentWithdrawalCommission(tx, {
        withdrawalId: created.id,
      });
    }
  });
}

function parseFlexibleDateValue(value?: string | Date | null) {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  const parsed = new Date(String(value).trim());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function serializeCallbackPayload(payload: unknown) {
  if (payload === undefined || payload === null) {
    return undefined;
  }

  if (typeof payload === "string") {
    const trimmed = payload.trim();
    return trimmed || undefined;
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

export async function applyAgentWithdrawalPayoutCallback(
  input: AgentWithdrawalCallbackInput,
): Promise<AgentWithdrawalCallbackResult> {
  const withdrawalId = String(input.withdrawalId || "").trim();

  if (!withdrawalId) {
    throw new Error("AGENT_WITHDRAWAL_INVALID");
  }

  const existing = await prisma.agentWithdrawal.findUnique({
    where: { id: withdrawalId },
    select: {
      id: true,
      agentId: true,
      amount: true,
      status: true,
    },
  });

  if (!existing) {
    throw new Error("AGENT_WITHDRAWAL_NOT_FOUND");
  }

  const requestedStatus = input.status ? normalizeWithdrawalStatus(String(input.status)) : normalizeWithdrawalStatus(existing.status);
  const lockedToSettled = existing.status === "settled" && requestedStatus !== "settled";
  const appliedStatus = lockedToSettled ? "settled" : requestedStatus;
  const callbackReceivedAt = parseFlexibleDateValue(input.callbackReceivedAt) ?? new Date();

  await upsertAgentWithdrawalByAdmin({
    id: withdrawalId,
    agentId: existing.agentId,
    amount: existing.amount,
    status: appliedStatus,
    payoutAccount: input.payoutAccount ?? undefined,
    payoutChannel: input.payoutChannel ?? undefined,
    payoutBatchNo: input.payoutBatchNo ?? undefined,
    payoutReference: input.payoutReference ?? undefined,
    payoutOperator: input.payoutOperator ?? undefined,
    payoutRequestedAt: parseFlexibleDateValue(input.payoutRequestedAt),
    callbackStatus: input.callbackStatus?.trim() || undefined,
    callbackPayload: serializeCallbackPayload(input.callbackPayload),
    callbackReceivedAt,
    note: input.note?.trim() || undefined,
    proofUrl: input.proofUrl?.trim() || undefined,
    rejectionReason: input.rejectionReason?.trim() || undefined,
    preserveExistingFields: true,
  });

  safeRevalidate(adminPaths);

  return {
    withdrawalId,
    previousStatus: normalizeWithdrawalStatus(existing.status),
    status: appliedStatus,
    lockedToSettled,
    callbackReceivedAt: callbackReceivedAt.toISOString(),
  };
}

export async function getAgentPerformanceSnapshot(limit?: number): Promise<AgentPerformanceSnapshotRecord[]> {
  const [agents, commissionGroups, withdrawalGroups] = await Promise.all([
    prisma.agentProfile.findMany({
      include: {
        parentAgent: {
          select: {
            displayName: true,
          },
        },
        _count: {
          select: {
            childAgents: true,
          },
        },
      },
    }),
    prisma.agentCommissionLedger.groupBy({
      by: ["agentId", "kind"],
      _count: {
        _all: true,
      },
      _sum: {
        rechargeAmount: true,
        commissionAmount: true,
        reversedAmount: true,
      },
    }),
    prisma.agentWithdrawal.groupBy({
      by: ["agentId", "status"],
      _sum: {
        amount: true,
      },
    }),
  ]);

  const commissionByAgent = new Map<string, {
    directOrderCount: number;
    directRechargeAmount: number;
    directCommissionNet: number;
    downstreamCommissionNet: number;
  }>();

  for (const group of commissionGroups) {
    const current = commissionByAgent.get(group.agentId) ?? {
      directOrderCount: 0,
      directRechargeAmount: 0,
      directCommissionNet: 0,
      downstreamCommissionNet: 0,
    };
    const netCommission = Math.max(0, (group._sum.commissionAmount ?? 0) - (group._sum.reversedAmount ?? 0));

    if (group.kind === "downstream") {
      current.downstreamCommissionNet += netCommission;
    } else {
      current.directOrderCount += group._count._all;
      current.directRechargeAmount += group._sum.rechargeAmount ?? 0;
      current.directCommissionNet += netCommission;
    }

    commissionByAgent.set(group.agentId, current);
  }

  const withdrawalsByAgent = new Map<string, {
    settledWithdrawalAmount: number;
    pendingWithdrawalAmount: number;
    rejectionWithdrawalAmount: number;
  }>();

  for (const group of withdrawalGroups) {
    const current = withdrawalsByAgent.get(group.agentId) ?? {
      settledWithdrawalAmount: 0,
      pendingWithdrawalAmount: 0,
      rejectionWithdrawalAmount: 0,
    };
    const amount = group._sum.amount ?? 0;

    if (group.status === "settled") {
      current.settledWithdrawalAmount += amount;
    } else if (group.status === "rejected") {
      current.rejectionWithdrawalAmount += amount;
    } else {
      current.pendingWithdrawalAmount += amount;
    }

    withdrawalsByAgent.set(group.agentId, current);
  }

  const records = agents
    .map((agent) => {
      const commission = commissionByAgent.get(agent.id) ?? {
        directOrderCount: 0,
        directRechargeAmount: 0,
        directCommissionNet: 0,
        downstreamCommissionNet: 0,
      };
      const withdrawals = withdrawalsByAgent.get(agent.id) ?? {
        settledWithdrawalAmount: 0,
        pendingWithdrawalAmount: 0,
        rejectionWithdrawalAmount: 0,
      };

      return {
        agentId: agent.id,
        agentName: agent.displayName,
        inviteCode: agent.inviteCode,
        level: normalizeAgentLevel(agent.level),
        status: normalizeAgentStatus(agent.status),
        parentAgentName: agent.parentAgent?.displayName ?? undefined,
        referredUsers: agent.totalReferredUsers,
        childAgents: agent._count.childAgents,
        directOrderCount: commission.directOrderCount,
        directRechargeAmount: commission.directRechargeAmount,
        directCommissionNet: commission.directCommissionNet,
        downstreamCommissionNet: commission.downstreamCommissionNet,
        totalCommissionNet: commission.directCommissionNet + commission.downstreamCommissionNet,
        unsettledCommission: agent.unsettledCommission,
        settledWithdrawalAmount: withdrawals.settledWithdrawalAmount,
        pendingWithdrawalAmount: withdrawals.pendingWithdrawalAmount,
        rejectionWithdrawalAmount: withdrawals.rejectionWithdrawalAmount,
      };
    })
    .sort((left, right) => {
      if (right.totalCommissionNet !== left.totalCommissionNet) {
        return right.totalCommissionNet - left.totalCommissionNet;
      }

      if (right.directRechargeAmount !== left.directRechargeAmount) {
        return right.directRechargeAmount - left.directRechargeAmount;
      }

      return right.referredUsers - left.referredUsers;
    });

  if (typeof limit === "number") {
    return records.slice(0, limit);
  }

  return records;
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
    allPerformanceRecords,
    campaignsRaw,
    leadsRaw,
    withdrawalsRaw,
    commissionLedgersRawUntyped,
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
    getAgentPerformanceSnapshot(),
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
      select: {
        id: true,
        agentId: true,
        amount: true,
        status: true,
        payoutAccount: true,
        payoutChannel: true,
        payoutBatchNo: true,
        payoutReference: true,
        payoutOperator: true,
        payoutRequestedAt: true,
        callbackStatus: true,
        callbackPayload: true,
        callbackReceivedAt: true,
        note: true,
        proofUrl: true,
        requestedAt: true,
        updatedAt: true,
        reviewedAt: true,
        settledAt: true,
        rejectionReason: true,
        agent: {
          select: {
            id: true,
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
                user: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
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
  const commissionLedgersRaw = commissionLedgersRawUntyped as AdminAgentCommissionLedgerRow[];

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
  const performanceRecords = allPerformanceRecords.slice(0, 8);
  const totalAttributedRecharge = allPerformanceRecords.reduce((total, item) => total + item.directRechargeAmount, 0);
  const totalDirectCommission = allPerformanceRecords.reduce((total, item) => total + item.directCommissionNet, 0);
  const totalDownstreamCommission = allPerformanceRecords.reduce((total, item) => total + item.downstreamCommissionNet, 0);
  const totalPendingPayout = allPerformanceRecords.reduce((total, item) => total + item.pendingWithdrawalAmount, 0);
  const totalSettledWithdrawal = allPerformanceRecords.reduce((total, item) => total + item.settledWithdrawalAmount, 0);
  const totalReferredUsers = allPerformanceRecords.reduce((total, item) => total + item.referredUsers, 0);
  const totalChildAgents = allPerformanceRecords.reduce((total, item) => total + item.childAgents, 0);
  const withdrawalExceptions: AdminAgentWithdrawalExceptionRecord[] = withdrawalsRaw.flatMap((item) => {
    const exceptions: AdminAgentWithdrawalExceptionRecord[] = [];
    const status = normalizeWithdrawalStatus(item.status);
    const callbackStatus = item.callbackStatus?.trim().toLowerCase();

    const pushException = (
      exceptionType: AdminAgentWithdrawalExceptionRecord["exceptionType"],
      exceptionLabel: string,
    ) => {
      exceptions.push({
        id: item.id,
        agentName: item.agent.displayName,
        amount: item.amount,
        status,
        exceptionType,
        exceptionLabel,
        payoutBatchNo: item.payoutBatchNo ?? undefined,
        callbackStatus: item.callbackStatus ?? undefined,
        proofUrl: item.proofUrl ?? undefined,
        updatedAt: item.updatedAt.toISOString(),
      });
    };

    if ((status === "reviewing" || status === "paying") && !item.payoutBatchNo?.trim()) {
      pushException(
        "missing-batch",
        localizeText(
          { zhCn: "进入打款流程但缺少批次号", zhTw: "進入打款流程但缺少批次號", en: "In payout flow without batch number" },
          locale,
        ),
      );
    }

    if ((status === "paying" || status === "settled") && !item.proofUrl?.trim()) {
      pushException(
        "missing-proof",
        localizeText(
          { zhCn: "已送打款但未上传凭证", zhTw: "已送打款但未上傳憑證", en: "Payout sent without proof" },
          locale,
        ),
      );
    }

    if (callbackStatus && /failed|conflict|error|mismatch|rejected/.test(callbackStatus)) {
      pushException(
        "callback-abnormal",
        localizeText(
          { zhCn: "回单状态异常待复核", zhTw: "回單狀態異常待複核", en: "Callback abnormal, review required" },
          locale,
        ),
      );
    }

    if (item.payoutBatchNo?.trim() && !item.payoutRequestedAt && status !== "pending") {
      pushException(
        "batch-without-request",
        localizeText(
          { zhCn: "已有批次号但缺少送打款时间", zhTw: "已有批次號但缺少送打款時間", en: "Batch number exists without payout request time" },
          locale,
        ),
      );
    }

    return exceptions;
  });

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
    performanceMetrics: [
      {
        label: localizeText(
          { zhCn: "归因充值额", zhTw: "歸因充值額", en: "Attributed recharge" },
          locale,
        ),
        value: `CNY ${formatCompactNumber(totalAttributedRecharge)}`,
        description: localizeText(
          {
            zhCn: `当前代理网络累计直推用户 ${formatCompactNumber(totalReferredUsers)} 人。`,
            zhTw: `當前代理網路累計直推用戶 ${formatCompactNumber(totalReferredUsers)} 人。`,
            en: `${formatCompactNumber(totalReferredUsers)} directly attributed users in the agent network.`,
          },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "直推净佣金", zhTw: "直推淨佣金", en: "Direct net commission" },
          locale,
        ),
        value: `CNY ${formatCompactNumber(totalDirectCommission)}`,
        description: localizeText(
          {
            zhCn: `下级分佣累计 ${formatCompactNumber(totalDownstreamCommission)} 元。`,
            zhTw: `下級分佣累計 ${formatCompactNumber(totalDownstreamCommission)} 元。`,
            en: `Downstream commission totals CNY ${formatCompactNumber(totalDownstreamCommission)}.`,
          },
          locale,
        ),
      },
      {
        label: localizeText(
          { zhCn: "代理层级扩展", zhTw: "代理層級擴展", en: "Downstream expansion" },
          locale,
        ),
        value: formatCompactNumber(totalChildAgents),
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
        value: `CNY ${formatCompactNumber(totalPendingPayout)}`,
        description: localizeText(
          {
            zhCn: `已完成提现 ${formatCompactNumber(totalSettledWithdrawal)} 元。`,
            zhTw: `已完成提現 ${formatCompactNumber(totalSettledWithdrawal)} 元。`,
            en: `Settled withdrawals total CNY ${formatCompactNumber(totalSettledWithdrawal)}.`,
          },
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
    performanceRecords,
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
      payoutChannel: item.payoutChannel ?? undefined,
      payoutBatchNo: item.payoutBatchNo ?? undefined,
      payoutReference: item.payoutReference ?? undefined,
      payoutOperator: item.payoutOperator ?? undefined,
      payoutRequestedAt: item.payoutRequestedAt?.toISOString(),
      callbackStatus: item.callbackStatus ?? undefined,
      callbackPayload: item.callbackPayload ?? undefined,
      callbackReceivedAt: item.callbackReceivedAt?.toISOString(),
      note: item.note ?? undefined,
      proofUrl: item.proofUrl ?? undefined,
      requestedAt: item.requestedAt.toISOString(),
      reviewedAt: item.reviewedAt?.toISOString(),
      settledAt: item.settledAt?.toISOString(),
      rejectionReason: item.rejectionReason ?? undefined,
      allocationCount: item.allocations.length,
      allocatedAmount: item.allocations.reduce((total, allocation) => total + allocation.amount, 0),
      allocationSummary: item.allocations.map((allocation) => {
        const orderNo = allocation.commissionLedger.rechargeOrder.orderNo;
        const userName = allocation.commissionLedger.user.displayName;
        return `${orderNo} / ${userName} / CNY ${formatCompactNumber(allocation.amount)}`;
      }),
    })),
    withdrawalExceptions,
    commissionLedgers: commissionLedgersRaw.map((item) => ({
      id: item.id,
      agentId: item.agentId,
      agentName: item.agent.displayName,
      kind: item.kind === "downstream" ? "downstream" : "direct",
      sourceAgentId: item.sourceAgentId ?? undefined,
      sourceAgentName: item.sourceAgentName ?? undefined,
      userDisplayName: item.user.displayName,
      userEmail: item.user.email,
      rechargeOrderNo: item.rechargeOrder.orderNo,
      rechargeAmount: item.rechargeAmount,
      commissionRate: item.commissionRate,
      commissionAmount: item.commissionAmount,
      settledAmount: item.settledAmount,
      reversedAmount: item.reversedAmount,
      availableAmount: Math.max(0, item.commissionAmount - item.settledAmount - item.reversedAmount),
      status:
        item.status === "settled" || item.status === "reversed" || item.status === "partial"
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
  const payload = getWithdrawalPayloadFromFormData(formData);

  await upsertAgentWithdrawalByAdmin({
    id: parseOptionalText(formData.get("id")),
    agentId: payload.agentId,
    amount: payload.amount,
    status: payload.status,
    payoutAccount: payload.payoutAccount ?? undefined,
    payoutChannel: payload.payoutChannel ?? undefined,
    payoutBatchNo: payload.payoutBatchNo ?? undefined,
    payoutReference: payload.payoutReference ?? undefined,
    payoutOperator: payload.payoutOperator ?? undefined,
    payoutRequestedAt: payload.payoutRequestedAt ?? undefined,
    callbackStatus: payload.callbackStatus ?? undefined,
    callbackPayload: payload.callbackPayload ?? undefined,
    callbackReceivedAt: payload.callbackReceivedAt ?? undefined,
    note: payload.note ?? undefined,
    proofUrl: payload.proofUrl ?? undefined,
    rejectionReason: payload.rejectionReason ?? undefined,
  });

  safeRevalidate(adminPaths);
}

export async function batchUpdateAgentWithdrawals(formData: FormData) {
  const requestedStatus = normalizeWithdrawalStatus(String(formData.get("status") || "pending"));
  const withdrawalRefs = normalizeUniqueValues([
    ...formData.getAll("withdrawalIds").map((value) => String(value || "").trim()),
    ...parseMultiLineRefs(String(formData.get("batchRefs") || "")),
  ]);

  if (withdrawalRefs.length === 0) {
    throw new Error("AGENT_WITHDRAWAL_BATCH_EMPTY");
  }

  const withdrawals = await prisma.agentWithdrawal.findMany({
    where: {
      id: {
        in: withdrawalRefs,
      },
    },
    select: {
      id: true,
      agentId: true,
      amount: true,
      status: true,
    },
  });

  const withdrawalMap = new Map(withdrawals.map((item) => [item.id, item]));
  let processedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const ref of withdrawalRefs) {
    const withdrawal = withdrawalMap.get(ref);

    if (!withdrawal) {
      failedCount += 1;
      continue;
    }

    if (withdrawal.status === "settled" && requestedStatus !== "settled") {
      skippedCount += 1;
      continue;
    }

    try {
      await upsertAgentWithdrawalByAdmin({
        id: withdrawal.id,
        agentId: withdrawal.agentId,
        amount: withdrawal.amount,
        status: requestedStatus,
        payoutAccount: parseOptionalText(formData.get("payoutAccount")),
        payoutChannel: parseOptionalText(formData.get("payoutChannel")),
        payoutBatchNo: parseOptionalText(formData.get("payoutBatchNo")),
        payoutReference: parseOptionalText(formData.get("payoutReference")),
        payoutOperator: parseOptionalText(formData.get("payoutOperator")),
        callbackStatus: parseOptionalText(formData.get("callbackStatus")),
        callbackPayload: parseOptionalText(formData.get("callbackPayload")),
        callbackReceivedAt: parseOptionalDate(formData.get("callbackReceivedAt")) ?? undefined,
        note: parseOptionalText(formData.get("note")),
        proofUrl: parseOptionalText(formData.get("proofUrl")),
        rejectionReason: parseOptionalText(formData.get("rejectionReason")),
        preserveExistingFields: true,
      });
      processedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  safeRevalidate(adminPaths);

  return {
    totalCount: withdrawalRefs.length,
    processedCount,
    skippedCount,
    failedCount,
  };
}
