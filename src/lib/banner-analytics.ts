import { prisma } from "@/lib/prisma";

export type HomepageBannerMetricType = "impression" | "click";
export type HomepageBannerPlacement = "primary" | "secondary";

function getMetricDateBucket(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function recordHomepageBannerMetric(
  bannerId: string,
  type: HomepageBannerMetricType,
  placement: HomepageBannerPlacement,
) {
  const now = new Date();
  const metricDate = getMetricDateBucket(now);
  const placementCounters =
    placement === "primary"
      ? {
          primaryImpressionCount: {
            increment: type === "impression" ? 1 : 0,
          },
          primaryClickCount: {
            increment: type === "click" ? 1 : 0,
          },
        }
      : {
          secondaryImpressionCount: {
            increment: type === "impression" ? 1 : 0,
          },
          secondaryClickCount: {
            increment: type === "click" ? 1 : 0,
          },
        };

  if (type === "click") {
    await prisma.$transaction([
      prisma.homepageBanner.update({
        where: { id: bannerId },
        data: {
          clickCount: {
            increment: 1,
          },
          ...placementCounters,
          lastClickAt: now,
        },
        select: { id: true },
      }),
      prisma.homepageBannerDailyStat.upsert({
        where: {
          bannerId_metricDate: {
            bannerId,
            metricDate,
          },
        },
        update: {
          clickCount: {
            increment: 1,
          },
        },
        create: {
          bannerId,
          metricDate,
          clickCount: 1,
        },
      }),
    ]);

    return;
  }

  await prisma.$transaction([
    prisma.homepageBanner.update({
      where: { id: bannerId },
      data: {
        impressionCount: {
          increment: 1,
        },
        ...placementCounters,
        lastImpressionAt: now,
      },
      select: { id: true },
    }),
    prisma.homepageBannerDailyStat.upsert({
      where: {
        bannerId_metricDate: {
          bannerId,
          metricDate,
        },
      },
      update: {
        impressionCount: {
          increment: 1,
        },
      },
      create: {
        bannerId,
        metricDate,
        impressionCount: 1,
      },
    }),
  ]);
}
