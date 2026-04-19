import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { displayLocales } from "@/lib/i18n-config";

const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "localhost";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await prisma.articlePlan.findMany({
    where: { status: "published" },
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: "desc" },
    take: 1000,
  });

  const articleUrls = articles.flatMap((a) =>
    displayLocales.map((locale) => ({
      url: `https://${domain}/${locale}/news/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  );

  const staticUrls = displayLocales.flatMap((locale) => [
    {
      url: `https://${domain}/${locale}/news`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 1.0,
    },
    {
      url: `https://${domain}/${locale}/matches`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.9,
    },
  ]);

  return [...staticUrls, ...articleUrls];
}
