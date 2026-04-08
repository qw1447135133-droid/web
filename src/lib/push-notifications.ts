import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createUserNotification } from "@/lib/user-notifications";
import type { DisplayLocale, Locale } from "@/lib/i18n-config";
import {
  getWebPushRuntimeConfig,
  isValidWebPushSubscription,
  sendWebPushNotification,
  type WebPushSubscriptionRecord,
} from "@/lib/web-push";

export type AdminPushCampaignRecord = {
  id: string;
  key: string;
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
  audience: string;
  locale?: string;
  status: string;
  targetCount: number;
  deliveredCount: number;
  scheduledForAt?: string;
  sentAt?: string;
  createdAt: string;
  createdByDisplayName?: string;
};

export type AdminPushDashboard = {
  totalDevices: number;
  grantedDevices: number;
  activeUsers: number;
  campaigns: AdminPushCampaignRecord[];
};

type UpsertPushDeviceInput = {
  deviceKey: string;
  permission: string;
  locale?: string;
  platform?: string;
  userAgent?: string;
  subscription?: WebPushSubscriptionRecord | null;
};

const revalidateTargets = ["/admin", "/member", "/account/notifications"];

function safeRevalidate() {
  for (const path of revalidateTargets) {
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

function parseText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseOptionalText(value: FormDataEntryValue | null) {
  const raw = parseText(value);
  return raw || undefined;
}

function parseOptionalDateTime(value: FormDataEntryValue | null) {
  const raw = parseOptionalText(value);

  if (!raw) {
    return undefined;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseStoredSubscription(record: {
  pushSubscriptionJson: string | null;
  pushEndpoint: string | null;
  pushP256dhKey: string | null;
  pushAuthKey: string | null;
}) {
  if (record.pushSubscriptionJson?.trim()) {
    try {
      const parsed = JSON.parse(record.pushSubscriptionJson) as unknown;
      if (isValidWebPushSubscription(parsed)) {
        return parsed;
      }
    } catch {
      // Fall back to endpoint + keys below.
    }
  }

  if (
    record.pushEndpoint?.trim() &&
    record.pushP256dhKey?.trim() &&
    record.pushAuthKey?.trim()
  ) {
    return {
      endpoint: record.pushEndpoint,
      keys: {
        p256dh: record.pushP256dhKey,
        auth: record.pushAuthKey,
      },
    } satisfies WebPushSubscriptionRecord;
  }

  return null;
}

export function getBrowserPushClientConfig() {
  const runtime = getWebPushRuntimeConfig();

  return {
    enabled: runtime.enabled,
    configured: runtime.configured,
    publicKey: runtime.publicKey,
  };
}

async function ensureUniqueCampaignKey(baseValue: string, ignoreId?: string) {
  const base =
    baseValue
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || randomUUID().slice(0, 8);
  let candidate = base;
  let index = 2;

  while (true) {
    const existing = await prisma.pushCampaign.findFirst({
      where: {
        key: candidate,
        ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${base}-${index}`;
    index += 1;
  }
}

function normalizeAudience(value: string) {
  return value === "members" || value === "locale" || value === "verified" ? value : "all";
}

function mapCampaignRecord(record: {
  id: string;
  key: string;
  title: string;
  message: string;
  actionHref: string | null;
  actionLabel: string | null;
  audience: string;
  locale: string | null;
  status: string;
  targetCount: number;
  deliveredCount: number;
  scheduledForAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  createdByDisplayName: string | null;
}): AdminPushCampaignRecord {
  return {
    id: record.id,
    key: record.key,
    title: record.title,
    message: record.message,
    actionHref: record.actionHref ?? undefined,
    actionLabel: record.actionLabel ?? undefined,
    audience: record.audience,
    locale: record.locale ?? undefined,
    status: record.status,
    targetCount: record.targetCount,
    deliveredCount: record.deliveredCount,
    scheduledForAt: record.scheduledForAt?.toISOString(),
    sentAt: record.sentAt?.toISOString(),
    createdAt: record.createdAt.toISOString(),
    createdByDisplayName: record.createdByDisplayName ?? undefined,
  };
}

export async function upsertUserPushDevice(userId: string, input: UpsertPushDeviceInput) {
  const deviceKey = input.deviceKey.trim();

  if (!deviceKey) {
    throw new Error("PUSH_DEVICE_INVALID");
  }

  const permission = input.permission.trim() || "default";
  const now = new Date();
  const subscription = input.subscription && isValidWebPushSubscription(input.subscription)
    ? input.subscription
    : null;

  await prisma.userPushDevice.upsert({
    where: { deviceKey },
    update: {
      userId,
      permission,
      status:
        permission === "denied"
          ? "inactive"
          : permission === "granted" && subscription
            ? "subscribed"
            : "active",
      locale: input.locale?.trim() || null,
      platform: input.platform?.trim() || null,
      userAgent: input.userAgent?.trim() || null,
      pushEndpoint: subscription?.endpoint ?? null,
      pushP256dhKey: subscription?.keys.p256dh ?? null,
      pushAuthKey: subscription?.keys.auth ?? null,
      pushSubscriptionJson: subscription ? JSON.stringify(subscription) : null,
      lastSeenAt: now,
      lastPermissionAt: now,
    },
    create: {
      userId,
      deviceKey,
      permission,
      status:
        permission === "denied"
          ? "inactive"
          : permission === "granted" && subscription
            ? "subscribed"
            : "active",
      locale: input.locale?.trim() || null,
      platform: input.platform?.trim() || null,
      userAgent: input.userAgent?.trim() || null,
      pushEndpoint: subscription?.endpoint ?? null,
      pushP256dhKey: subscription?.keys.p256dh ?? null,
      pushAuthKey: subscription?.keys.auth ?? null,
      pushSubscriptionJson: subscription ? JSON.stringify(subscription) : null,
      lastSeenAt: now,
      lastPermissionAt: now,
    },
  });
}

export async function getAdminPushDashboard(_locale: Locale | DisplayLocale): Promise<AdminPushDashboard> {
  const [totalDevices, grantedDevices, activeUsers, campaigns] = await Promise.all([
    prisma.userPushDevice.count(),
    prisma.userPushDevice.count({
      where: {
        permission: "granted",
        status: {
          in: ["active", "subscribed"],
        },
      },
    }),
    prisma.userPushDevice.findMany({
      where: {
        permission: "granted",
        status: {
          in: ["active", "subscribed"],
        },
        userId: {
          not: null,
        },
      },
      distinct: ["userId"],
      select: {
        userId: true,
      },
    }),
    prisma.pushCampaign.findMany({
      orderBy: [{ scheduledForAt: "asc" }, { createdAt: "desc" }],
      take: 12,
    }),
  ]);

  return {
    totalDevices,
    grantedDevices,
    activeUsers: activeUsers.length,
    campaigns: campaigns.map(mapCampaignRecord),
  };
}

export async function savePushCampaign(
  formData: FormData,
  actor?: { userId?: string; displayName?: string },
) {
  const id = parseOptionalText(formData.get("id"));
  const title = parseText(formData.get("title"));
  const message = parseText(formData.get("message"));

  if (!title || !message) {
    throw new Error("PUSH_CAMPAIGN_INVALID");
  }

  const key = await ensureUniqueCampaignKey(parseText(formData.get("key")) || title, id);
  const status = parseText(formData.get("status")) || "draft";
  const scheduledForAt = status === "scheduled" ? parseOptionalDateTime(formData.get("scheduledForAt")) ?? new Date() : null;
  const payload = {
    key,
    title,
    message,
    actionHref: parseOptionalText(formData.get("actionHref")) ?? null,
    actionLabel: parseOptionalText(formData.get("actionLabel")) ?? null,
    audience: normalizeAudience(parseText(formData.get("audience"))),
    locale: parseOptionalText(formData.get("locale")) ?? null,
    status,
    scheduledForAt,
    payloadJson: null,
    createdByDisplayName: actor?.displayName?.trim() || null,
    createdByUserId: actor?.userId?.trim() || null,
  };

  if (id) {
    await prisma.pushCampaign.update({
      where: { id },
      data: payload,
    });
  } else {
    await prisma.pushCampaign.create({
      data: payload,
    });
  }

  safeRevalidate();
}

export async function cancelPushCampaign(id: string) {
  if (!id.trim()) {
    throw new Error("PUSH_CAMPAIGN_INVALID");
  }

  await prisma.pushCampaign.update({
    where: { id },
    data: {
      status: "cancelled",
    },
  });

  safeRevalidate();
}

async function resolveCampaignUsers(record: {
  audience: string;
  locale: string | null;
}) {
  if (record.audience === "members") {
    return prisma.user.findMany({
      where: {
        membershipExpiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
    });
  }

  if (record.audience === "verified") {
    return prisma.user.findMany({
      where: {
        emailVerifiedAt: {
          not: null,
        },
      },
      select: {
        id: true,
      },
    });
  }

  if (record.audience === "locale" && record.locale?.trim()) {
    return prisma.user.findMany({
      where: {
        OR: [
          {
            preferredLocale: record.locale,
          },
          {
            pushDevices: {
              some: {
                locale: record.locale,
                permission: "granted",
                status: {
                  in: ["active", "subscribed"],
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });
  }

  return prisma.user.findMany({
    select: {
      id: true,
    },
  });
}

export async function sendPushCampaign(id: string) {
  const campaign = await prisma.pushCampaign.findUnique({
    where: { id },
  });

  if (!campaign) {
    throw new Error("PUSH_CAMPAIGN_NOT_FOUND");
  }

  if (campaign.status === "cancelled") {
    throw new Error("PUSH_CAMPAIGN_CANCELLED");
  }

  const users = await resolveCampaignUsers(campaign);
  const userIds = [...new Set(users.map((item) => item.id))];
  const now = new Date();
  const runtime = getWebPushRuntimeConfig();
  const subscribedDevices = runtime.configured
    ? await prisma.userPushDevice.findMany({
        where: {
          userId: {
            in: userIds,
          },
          permission: "granted",
          status: {
            in: ["active", "subscribed"],
          },
        },
        select: {
          id: true,
          userId: true,
          pushSubscriptionJson: true,
          pushEndpoint: true,
          pushP256dhKey: true,
          pushAuthKey: true,
        },
      })
    : [];

  if (userIds.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const userId of userIds) {
        await createUserNotification(tx, {
          userId,
          category: "system",
          type: "push_campaign",
          level: "info",
          title: campaign.title,
          message: campaign.message,
          actionHref: campaign.actionHref ?? undefined,
          actionLabel: campaign.actionLabel ?? undefined,
          payload: {
            campaignId: campaign.id,
            campaignKey: campaign.key,
            audience: campaign.audience,
            locale: campaign.locale,
          },
        });
      }

      await tx.pushCampaign.update({
        where: { id: campaign.id },
        data: {
          status: runtime.configured ? "sending" : "sent",
          targetCount: userIds.length,
          deliveredCount: runtime.configured ? 0 : userIds.length,
          sentAt: runtime.configured ? null : now,
        },
      });

      if (!runtime.configured) {
        await tx.userPushDevice.updateMany({
          where: {
            userId: {
              in: userIds,
            },
            permission: "granted",
            status: {
              in: ["active", "subscribed"],
            },
          },
          data: {
            lastNotifiedAt: now,
          },
        });
      }
    });
  } else {
    await prisma.pushCampaign.update({
      where: { id: campaign.id },
      data: {
        status: "sent",
        targetCount: 0,
        deliveredCount: 0,
        sentAt: now,
      },
    });
  }

  if (runtime.configured && subscribedDevices.length > 0) {
    let deliveredCount = 0;
    const deliveredUsers = new Set<string>();

    for (const device of subscribedDevices) {
      const subscription = parseStoredSubscription(device);
      if (!subscription) {
        await prisma.userPushDevice.update({
          where: { id: device.id },
          data: {
            status: "inactive",
            lastPushAttemptAt: now,
            lastPushError: "MISSING_SUBSCRIPTION",
          },
        });
        continue;
      }

      try {
        await sendWebPushNotification({
          subscription,
          payload: {
            title: campaign.title,
            body: campaign.message,
            tag: `push-campaign-${campaign.id}`,
            url: campaign.actionHref ?? "/account/notifications",
          },
        });

        deliveredCount += 1;
        deliveredUsers.add(device.userId ?? device.id);

        await prisma.userPushDevice.update({
          where: { id: device.id },
          data: {
            status: "subscribed",
            lastNotifiedAt: now,
            lastPushAttemptAt: now,
            lastPushSuccessAt: now,
            lastPushError: null,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "WEB_PUSH_FAILED";
        const deactivated =
          message.includes("410") ||
          message.includes("404") ||
          message.includes("subscription") ||
          message.includes("expired");

        await prisma.userPushDevice.update({
          where: { id: device.id },
          data: {
            status: deactivated ? "inactive" : "active",
            lastPushAttemptAt: now,
            lastPushError: message.slice(0, 280),
          },
        });
      }
    }

    await prisma.pushCampaign.update({
      where: { id: campaign.id },
      data: {
        status: "sent",
        deliveredCount: deliveredUsers.size,
        sentAt: now,
      },
    });
  } else if (runtime.configured) {
    await prisma.pushCampaign.update({
      where: { id: campaign.id },
      data: {
        status: "sent",
        deliveredCount: 0,
        sentAt: now,
      },
    });
  }

  safeRevalidate();
}

export async function dispatchScheduledPushCampaigns(limit = 20) {
  const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.trunc(limit))) : 20;
  const now = new Date();
  const campaigns = await prisma.pushCampaign.findMany({
    where: {
      status: "scheduled",
      OR: [
        {
          scheduledForAt: {
            lte: now,
          },
        },
        {
          scheduledForAt: null,
        },
      ],
    },
    orderBy: [{ scheduledForAt: "asc" }, { createdAt: "asc" }],
    take: normalizedLimit,
    select: {
      id: true,
      key: true,
      title: true,
    },
  });

  const dispatched: Array<{ id: string; key: string; title: string }> = [];
  const failed: Array<{ id: string; key: string; title: string; message: string }> = [];

  for (const campaign of campaigns) {
    try {
      await sendPushCampaign(campaign.id);
      dispatched.push(campaign);
    } catch (error) {
      failed.push({
        ...campaign,
        message: error instanceof Error ? error.message : "PUSH_CAMPAIGN_DISPATCH_FAILED",
      });
    }
  }

  return {
    scannedCount: campaigns.length,
    dispatchedCount: dispatched.length,
    failedCount: failed.length,
    dispatched,
    failed,
    generatedAt: now.toISOString(),
  };
}
