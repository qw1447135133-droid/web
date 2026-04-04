import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AgentAttributionClient = Prisma.TransactionClient | typeof prisma;

type CommissionStatus = "pending" | "partial" | "settled" | "reversed";
type CommissionKind = "direct" | "downstream";

type RechargeOrderCommissionRecord = {
  id: string;
  orderNo: string;
  amount: number;
  userId: string;
  user: {
    referredByAgentId: string | null;
  };
  agentCommissionLedgers: Array<{
    id: string;
    agentId: string;
    kind: string;
    status: string;
  }>;
};

type CreatedCommissionLedgerRecord = {
  id: string;
  agentId: string;
  kind: string;
};

type ReversibleCommissionLedgerRecord = {
  id: string;
  agentId: string;
  note: string | null;
  status: string;
  kind?: string | null;
  commissionAmount: number;
  settledAmount: number;
  reversedAmount: number;
};

function normalizeInviteCode(value?: string | null) {
  return value?.trim().toUpperCase() ?? "";
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toNonNegativeInt(value: number) {
  return Math.max(0, Math.trunc(value));
}

function getLedgerAvailableAmount(input: {
  commissionAmount: number;
  settledAmount?: number | null;
  reversedAmount?: number | null;
}) {
  return Math.max(
    0,
    toNonNegativeInt(input.commissionAmount) -
      toNonNegativeInt(input.settledAmount ?? 0) -
      toNonNegativeInt(input.reversedAmount ?? 0),
  );
}

function deriveCommissionStatus(input: {
  commissionAmount: number;
  settledAmount?: number | null;
  reversedAmount?: number | null;
}): CommissionStatus {
  const settledAmount = toNonNegativeInt(input.settledAmount ?? 0);
  const reversedAmount = toNonNegativeInt(input.reversedAmount ?? 0);
  const availableAmount = getLedgerAvailableAmount(input);

  if (availableAmount === 0) {
    if (settledAmount === 0 && reversedAmount > 0) {
      return "reversed";
    }

    if (reversedAmount === 0 && settledAmount > 0) {
      return "settled";
    }

    return "partial";
  }

  if (settledAmount > 0 || reversedAmount > 0) {
    return "partial";
  }

  return "pending";
}

export async function findAgentByInviteCode(inviteCode?: string | null) {
  const normalizedCode = normalizeInviteCode(inviteCode);

  if (!normalizedCode) {
    return null;
  }

  return prisma.agentProfile.findUnique({
    where: { inviteCode: normalizedCode },
    select: {
      id: true,
      displayName: true,
      inviteCode: true,
    },
  });
}

export async function syncAgentRollups(client: AgentAttributionClient, agentId: string) {
  const monthStart = startOfMonth();
  const [referredUsersCount, ledgers] =
    await Promise.all([
      client.user.count({
        where: {
          referredByAgentId: agentId,
        },
      }),
      client.agentCommissionLedger.findMany({
        where: {
          agentId,
        },
        select: {
          rechargeAmount: true,
          commissionAmount: true,
          settledAmount: true,
          reversedAmount: true,
          createdAt: true,
        },
      }),
    ]);

  const totals = ledgers.reduce(
    (accumulator, ledger) => {
      const availableAmount = getLedgerAvailableAmount(ledger);
      const settledAmount = toNonNegativeInt(ledger.settledAmount);
      const reversedAmount = toNonNegativeInt(ledger.reversedAmount);
      const netCommission = Math.max(0, toNonNegativeInt(ledger.commissionAmount) - reversedAmount);

      accumulator.totalCommission += netCommission;
      accumulator.unsettledCommission += availableAmount;

      if (ledger.createdAt >= monthStart && netCommission > 0) {
        accumulator.monthlyRechargeAmount += toNonNegativeInt(ledger.rechargeAmount);
      }

      if (settledAmount > 0) {
        accumulator.settledCommission += settledAmount;
      }

      return accumulator;
    },
    {
      totalCommission: 0,
      unsettledCommission: 0,
      monthlyRechargeAmount: 0,
      settledCommission: 0,
    },
  );

  await client.agentProfile.update({
    where: { id: agentId },
    data: {
      totalReferredUsers: referredUsersCount,
      monthlyRechargeAmount: totals.monthlyRechargeAmount,
      totalCommission: totals.totalCommission,
      unsettledCommission: totals.unsettledCommission,
    },
  });
}

export async function applyUserAgentAttribution(
  client: AgentAttributionClient,
  input: {
    userId: string;
    inviteCode?: string | null;
  },
) {
  const normalizedCode = normalizeInviteCode(input.inviteCode);

  if (!normalizedCode) {
    return { applied: false as const, reason: "empty-code" as const };
  }

  const [user, agent] = await Promise.all([
    client.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        referredByAgentId: true,
      },
    }),
    client.agentProfile.findUnique({
      where: { inviteCode: normalizedCode },
      select: {
        id: true,
        displayName: true,
      },
    }),
  ]);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (!agent) {
    return { applied: false as const, reason: "agent-not-found" as const };
  }

  if (user.referredByAgentId) {
    return {
      applied: false as const,
      reason: user.referredByAgentId === agent.id ? ("already-bound" as const) : ("user-already-referred" as const),
      agentId: user.referredByAgentId,
    };
  }

  await client.user.update({
    where: { id: user.id },
    data: {
      referredByAgentId: agent.id,
      referredAt: new Date(),
    },
  });

  await syncAgentRollups(client, agent.id);

  return {
    applied: true as const,
    agentId: agent.id,
    agentName: agent.displayName,
  };
}

export async function createAgentCommissionForRechargeOrder(
  client: AgentAttributionClient,
  input: {
    orderId: string;
    note?: string;
  },
) {
  const order = (await client.coinRechargeOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      orderNo: true,
      amount: true,
      userId: true,
      user: {
        select: {
          referredByAgentId: true,
        },
      },
      agentCommissionLedgers: {
        select: {
          id: true,
          agentId: true,
          kind: true,
          status: true,
        },
      },
    },
  } as never)) as RechargeOrderCommissionRecord | null;

  if (!order) {
    throw new Error("COIN_RECHARGE_ORDER_NOT_FOUND");
  }

  const agentId = order.user.referredByAgentId;

  if (!agentId) {
    return { created: false as const, reason: "no-agent" as const };
  }

  const directAgent = await client.agentProfile.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      displayName: true,
      commissionRate: true,
      parentAgentId: true,
      parentAgent: {
        select: {
          id: true,
          displayName: true,
          downstreamRate: true,
        },
      },
    },
  });

  if (!directAgent || order.amount <= 0) {
    return { created: false as const, reason: "commission-disabled" as const };
  }

  const existingKeys = new Set(
    order.agentCommissionLedgers.map((ledger) => `${ledger.agentId}:${ledger.kind}`),
  );
  const affectedAgentIds = new Set<string>();
  const createdLedgers: Array<{ id: string; agentId: string; kind: CommissionKind; commissionAmount: number }> = [];

  const candidates: Array<{
    agentId: string;
    kind: CommissionKind;
    commissionRate: number;
    sourceAgentId?: string;
    sourceAgentName?: string;
    note: string;
  }> = [];

  if (directAgent.commissionRate > 0) {
    candidates.push({
      agentId: directAgent.id,
      kind: "direct",
      commissionRate: directAgent.commissionRate,
      note: input.note?.trim() || order.orderNo,
    });
  }

  if (
    directAgent.parentAgentId &&
    directAgent.parentAgent &&
    directAgent.parentAgent.downstreamRate > 0
  ) {
    candidates.push({
      agentId: directAgent.parentAgent.id,
      kind: "downstream",
      commissionRate: directAgent.parentAgent.downstreamRate,
      sourceAgentId: directAgent.id,
      sourceAgentName: directAgent.displayName,
      note: input.note?.trim() || `Downstream ${directAgent.displayName} / ${order.orderNo}`,
    });
  }

  for (const candidate of candidates) {
    const dedupeKey = `${candidate.agentId}:${candidate.kind}`;
    if (existingKeys.has(dedupeKey)) {
      continue;
    }

    const commissionAmount = Math.max(0, Math.round((order.amount * candidate.commissionRate) / 100));

    if (commissionAmount <= 0) {
      continue;
    }

    const ledger = (await client.agentCommissionLedger.create({
      data: {
        agentId: candidate.agentId,
        kind: candidate.kind,
        sourceAgentId: candidate.sourceAgentId ?? null,
        sourceAgentName: candidate.sourceAgentName ?? null,
        userId: order.userId,
        rechargeOrderId: order.id,
        rechargeAmount: order.amount,
        commissionRate: candidate.commissionRate,
        commissionAmount,
        settledAmount: 0,
        reversedAmount: 0,
        status: "pending",
        note: candidate.note,
      },
      select: {
        id: true,
        agentId: true,
        kind: true,
      },
    } as never)) as CreatedCommissionLedgerRecord;

    affectedAgentIds.add(ledger.agentId);
    createdLedgers.push({
      id: ledger.id,
      agentId: ledger.agentId,
      kind: ledger.kind === "downstream" ? "downstream" : "direct",
      commissionAmount,
    });
  }

  for (const affectedAgentId of affectedAgentIds) {
    await syncAgentRollups(client, affectedAgentId);
  }

  if (createdLedgers.length === 0) {
    return { created: false as const, reason: "zero-commission" as const };
  }

  return {
    created: true as const,
    ledgerId: createdLedgers[0]?.id,
    agentId: createdLedgers[0]?.agentId,
    commissionAmount: createdLedgers.reduce((total, ledger) => total + ledger.commissionAmount, 0),
    createdLedgers,
  };
}

export async function reverseAgentCommissionForRechargeOrder(
  client: AgentAttributionClient,
  input: {
    orderId: string;
    note?: string;
  },
) {
  const ledgers = (await client.agentCommissionLedger.findMany({
    where: { rechargeOrderId: input.orderId },
    select: {
      id: true,
      agentId: true,
      note: true,
      status: true,
      kind: true,
      commissionAmount: true,
      settledAmount: true,
      reversedAmount: true,
    },
  } as never)) as ReversibleCommissionLedgerRecord[];

  if (ledgers.length === 0) {
    return { reversed: false as const, reason: "missing-ledger" as const };
  }

  const affectedAgentIds = new Set<string>();
  let reversedAny = false;

  for (const ledger of ledgers) {
    if (ledger.status === "reversed") {
      continue;
    }

    const availableAmount = getLedgerAvailableAmount(ledger);

    if (availableAmount <= 0) {
      continue;
    }

    const reversedAmount = toNonNegativeInt(ledger.reversedAmount) + availableAmount;

    await client.agentCommissionLedger.update({
      where: { id: ledger.id },
      data: {
        reversedAmount,
        status: deriveCommissionStatus({
          commissionAmount: ledger.commissionAmount,
          settledAmount: ledger.settledAmount,
          reversedAmount,
        }),
        reversedAt: reversedAmount > 0 ? new Date() : null,
        note: input.note?.trim() || ledger.note,
      },
    });

    affectedAgentIds.add(ledger.agentId);
    reversedAny = true;
  }

  if (!reversedAny) {
    return {
      reversed: false as const,
      reason: "no-available-commission" as const,
      agentId: ledgers[0]?.agentId,
    };
  }

  for (const affectedAgentId of affectedAgentIds) {
    await syncAgentRollups(client, affectedAgentId);
  }

  return {
    reversed: true as const,
    agentId: ledgers[0]?.agentId,
  };
}

export async function settleAgentWithdrawalCommission(
  client: AgentAttributionClient,
  input: {
    withdrawalId: string;
  },
) {
  const withdrawal = await client.agentWithdrawal.findUnique({
    where: { id: input.withdrawalId },
    select: {
      id: true,
      agentId: true,
      amount: true,
      status: true,
      note: true,
    },
  });

  if (!withdrawal) {
    throw new Error("AGENT_WITHDRAWAL_NOT_FOUND");
  }

  if (withdrawal.status === "settled") {
    return { settled: false as const, reason: "already-settled" as const };
  }

  const ledgers = await client.agentCommissionLedger.findMany({
    where: {
      agentId: withdrawal.agentId,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      commissionAmount: true,
      settledAmount: true,
      reversedAmount: true,
    },
  });

  const availableTotal = ledgers.reduce(
    (total, ledger) => total + getLedgerAvailableAmount(ledger),
    0,
  );

  if (availableTotal < withdrawal.amount) {
    throw new Error("AGENT_WITHDRAWAL_INSUFFICIENT_COMMISSION");
  }

  let remaining = withdrawal.amount;
  const now = new Date();

  for (const ledger of ledgers) {
    if (remaining <= 0) {
      break;
    }

    const availableAmount = getLedgerAvailableAmount(ledger);

    if (availableAmount <= 0) {
      continue;
    }

    const allocationAmount = Math.min(availableAmount, remaining);
    const nextSettledAmount = toNonNegativeInt(ledger.settledAmount) + allocationAmount;

    await client.agentCommissionLedger.update({
      where: { id: ledger.id },
      data: {
        settledAmount: nextSettledAmount,
        status: deriveCommissionStatus({
          commissionAmount: ledger.commissionAmount,
          settledAmount: nextSettledAmount,
          reversedAmount: ledger.reversedAmount,
        }),
        settledAt: nextSettledAmount > 0 ? now : null,
      },
    });

    await client.agentWithdrawalAllocation.create({
      data: {
        withdrawalId: withdrawal.id,
        commissionLedgerId: ledger.id,
        amount: allocationAmount,
        createdAt: now,
      },
    });

    remaining -= allocationAmount;
  }

  await client.agentWithdrawal.update({
    where: { id: withdrawal.id },
    data: {
      status: "settled",
      reviewedAt: now,
      settledAt: now,
      rejectionReason: null,
    },
  });

  await syncAgentRollups(client, withdrawal.agentId);

  return {
    settled: true as const,
    agentId: withdrawal.agentId,
    amount: withdrawal.amount,
  };
}
