import { prisma } from "@/lib/prisma";

export type HomepageBannerMetricType = "impression" | "click";

export async function recordHomepageBannerMetric(bannerId: string, type: HomepageBannerMetricType) {
  const now = new Date();

  if (type === "click") {
    await prisma.homepageBanner.update({
      where: { id: bannerId },
      data: {
        clickCount: {
          increment: 1,
        },
        lastClickAt: now,
      },
      select: { id: true },
    });

    return;
  }

  await prisma.homepageBanner.update({
    where: { id: bannerId },
    data: {
      impressionCount: {
        increment: 1,
      },
      lastImpressionAt: now,
    },
    select: { id: true },
  });
}
