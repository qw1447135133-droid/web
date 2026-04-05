import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type UserActivityClient = Prisma.TransactionClient | typeof prisma;

export async function recordUserLoginActivity(
  client: UserActivityClient,
  input: {
    userId: string;
    source?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
) {
  await client.$executeRaw`
    INSERT INTO "UserLoginActivity" ("id", "source", "ipAddress", "userAgent", "createdAt", "userId")
    VALUES (${randomUUID()}, ${input.source?.trim() || "passwordless-demo"}, ${input.ipAddress?.trim() || null}, ${input.userAgent?.trim() || null}, CURRENT_TIMESTAMP, ${input.userId})
  `;
}

export async function recordUserMembershipEvent(
  client: UserActivityClient,
  input: {
    userId: string;
    action: string;
    planId?: string | null;
    previousPlanId?: string | null;
    previousExpiresAt?: Date | null;
    nextExpiresAt?: Date | null;
    note?: string | null;
    createdByDisplayName?: string | null;
  },
) {
  await client.$executeRaw`
    INSERT INTO "UserMembershipEvent" (
      "id",
      "action",
      "planId",
      "previousPlanId",
      "previousExpiresAt",
      "nextExpiresAt",
      "note",
      "createdByDisplayName",
      "createdAt",
      "userId"
    )
    VALUES (
      ${randomUUID()},
      ${input.action},
      ${input.planId?.trim() || null},
      ${input.previousPlanId?.trim() || null},
      ${input.previousExpiresAt ?? null},
      ${input.nextExpiresAt ?? null},
      ${input.note?.trim() || null},
      ${input.createdByDisplayName?.trim() || null},
      CURRENT_TIMESTAMP,
      ${input.userId}
    )
  `;
}
