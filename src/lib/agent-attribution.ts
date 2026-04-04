import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AgentAttributionClient = Prisma.TransactionClient | typeof prisma;

function normalizeInviteCode(value?: string | null) {
  return value?.trim().toUpperCase() ?? "";
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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
  const [referredUsersCount, totalCommissionAggregate, unsettledCommissionAggregate, monthlyRechargeAggregate] =
    await Promise.all([
      client.user.count({
        where: {
          referredByAgentId: agentId,
        },
      }),
      client.agentCommissionLedger.aggregate({
        _sum: {
          commissionAmount: true,
        },
        where: {
          agentId,
          status: {
            in: ["pending", "settled"],
          },
        },
      }),
      client.agentCommissionLedger.aggregate({
        _sum: {
          commissionAmount: true,
        },
        where: {
          agentId,
          status: "pending",
        },
      }),
      client.agentCommissionLedger.aggregate({
        _sum: {
          rechargeAmount: true,
        },
        where: {
          agentId,
          status: {
            in: ["pending", "settled"],
          },
          createdAt: {
            gte: monthStart,
          },
        },
      }),
    ]);

  await client.agentProfile.update({
    where: { id: agentId },
    data: {
      totalReferredUsers: referredUsersCount,
      monthlyRechargeAmount: monthlyRechargeAggregate._sum.rechargeAmount ?? 0,
      totalCommission: totalCommissionAggregate._sum.commissionAmount ?? 0,
      unsettledCommission: unsettledCommissionAggregate._sum.commissionAmount ?? 0,
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
  const order = await client.coinRechargeOrder.findUnique({
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
      agentCommissionLedger: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error("COIN_RECHARGE_ORDER_NOT_FOUND");
  }

  if (order.agentCommissionLedger) {
    return {
      created: false as const,
      ledgerId: order.agentCommissionLedger.id,
      status: order.agentCommissionLedger.status,
    };
  }

  const agentId = order.user.referredByAgentId;

  if (!agentId) {
    return { created: false as const, reason: "no-agent" as const };
  }

  const agent = await client.agentProfile.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      commissionRate: true,
    },
  });

  if (!agent || agent.commissionRate <= 0 || order.amount <= 0) {
    return { created: false as const, reason: "commission-disabled" as const };
  }

  const commissionAmount = Math.max(0, Math.round((order.amount * agent.commissionRate) / 100));

  if (commissionAmount <= 0) {
    return { created: false as const, reason: "zero-commission" as const };
  }

  const ledger = await client.agentCommissionLedger.create({
    data: {
      agentId: agent.id,
      userId: order.userId,
      rechargeOrderId: order.id,
      rechargeAmount: order.amount,
      commissionRate: agent.commissionRate,
      commissionAmount,
      status: "pending",
      note: input.note?.trim() || order.orderNo,
    },
    select: {
      id: true,
      agentId: true,
    },
  });

  await syncAgentRollups(client, ledger.agentId);

  return {
    created: true as const,
    ledgerId: ledger.id,
    agentId: ledger.agentId,
    commissionAmount,
  };
}

export async function reverseAgentCommissionForRechargeOrder(
  client: AgentAttributionClient,
  input: {
    orderId: string;
    note?: string;
  },
) {
  const ledger = await client.agentCommissionLedger.findUnique({
    where: { rechargeOrderId: input.orderId },
    select: {
      id: true,
      agentId: true,
      note: true,
      status: true,
    },
  });

  if (!ledger) {
    return { reversed: false as const, reason: "missing-ledger" as const };
  }

  if (ledger.status === "reversed") {
    return { reversed: false as const, reason: "already-reversed" as const, agentId: ledger.agentId };
  }

  await client.agentCommissionLedger.update({
    where: { id: ledger.id },
    data: {
      status: "reversed",
      reversedAt: new Date(),
      note: input.note?.trim() || ledger.note,
    },
  });

  await syncAgentRollups(client, ledger.agentId);

  return {
    reversed: true as const,
    agentId: ledger.agentId,
  };
}
