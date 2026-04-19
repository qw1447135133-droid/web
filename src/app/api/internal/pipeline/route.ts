import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAuthorized(request: NextRequest) {
  const secret = process.env.PIPELINE_API_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("x-pipeline-secret")?.trim() === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = String(body.slug ?? "");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  // Quality gate: minimum content length
  const enContent = String(body.contentEn ?? body.fullAnalysisText ?? "");
  if (enContent.length < 200) {
    return NextResponse.json({ error: "Content too short", length: enContent.length }, { status: 422 });
  }

  // Dedup check: cosine similarity approximation via exact slug match
  const existing = await prisma.articlePlan.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ skipped: true, reason: "duplicate_slug", id: existing.id });
  }

  // Find or create a system author
  let author = await prisma.authorTeam.findFirst({ where: { name: "AI Pipeline" } });
  if (!author) {
    author = await prisma.authorTeam.create({
      data: {
        name: "AI Pipeline",
        slug: "ai-pipeline",
        bio: "Automated content pipeline",
        focus: "football",
        streak: "0",
        winRate: "0%",
        monthlyRoi: "0%",
        followers: "0",
        badge: "ai",
      },
    });
  }

  const article = await prisma.articlePlan.create({
    data: {
      slug,
      source: "pipeline",
      sourceKey: slug,
      sourceUrl: String(body.sourceUrl ?? ""),
      sport: String(body.sport ?? "football"),
      title: String(body.title ?? ""),
      leagueLabel: String(body.leagueLabel ?? ""),
      kickoff: new Date(String(body.kickoff ?? new Date().toISOString())),
      teaser: String(body.teaser ?? "").slice(0, 500),
      marketSummary: String(body.marketSummary ?? ""),
      fullAnalysisText: enContent,
      titleZhCn: String(body.titleZhCn ?? body.title ?? ""),
      titleZhTw: String(body.titleZhTw ?? body.title ?? ""),
      titleEn: String(body.titleEn ?? body.title ?? ""),
      titleTh: String(body.titleTh ?? body.title ?? ""),
      titleVi: String(body.titleVi ?? body.title ?? ""),
      contentZhCn: String(body.contentZhCn ?? ""),
      contentZhTw: String(body.contentZhTw ?? ""),
      contentEn: enContent,
      contentTh: String(body.contentTh ?? ""),
      contentVi: String(body.contentVi ?? ""),
      seoDescription: String(body.seoDescription ?? "").slice(0, 160),
      aiGenerated: Boolean(body.aiGenerated ?? true),
      status: "published",
      publishedAt: body.publishedAt ? new Date(String(body.publishedAt)) : new Date(),
      price: 0,
      performance: String(body.performance ?? "preview"),
      tagsText: String(body.tagsText ?? "football"),
      authorId: author.id,
    },
  });

  return NextResponse.json({ published: true, id: article.id, slug: article.slug });
}
