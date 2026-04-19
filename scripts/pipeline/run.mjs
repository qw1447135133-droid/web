#!/usr/bin/env node
/**
 * Content pipeline: fetch football data → generate AI articles → publish
 * Runs via GitHub Actions cron every 2 hours.
 * Uses tuzi deepseek-v3.2 (OpenAI-compatible) for multilingual content generation.
 */

const FOOTBALL_API_BASE = "https://api.football-data.org/v4";
const SITE_API_BASE = process.env.SITE_URL ?? "http://localhost:3000";
const PIPELINE_SECRET = process.env.PIPELINE_API_SECRET ?? "";
const TUZI_API_KEY = process.env.TUZI_API_KEY ?? "";
const TUZI_BASE = "https://api.tu-zi.com/v1";
const AI_MODEL = "deepseek-v3";

async function callAI(prompt) {
  const res = await fetch(`${TUZI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TUZI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`tuzi API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function fetchUpcomingMatches() {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const res = await fetch(
    `${FOOTBALL_API_BASE}/matches?dateFrom=${today}&dateTo=${tomorrow}&competitions=PL,PD,BL1,SA,FL1,CL`,
    { headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY ?? "" } }
  );

  if (!res.ok) throw new Error(`football-data.org API error: ${res.status}`);
  const data = await res.json();
  return data.matches ?? [];
}

async function generateArticle(match) {
  const isFinished = match.status === "FINISHED";
  const score = isFinished && match.score?.fullTime
    ? `${match.score.fullTime.home ?? 0} - ${match.score.fullTime.away ?? 0}`
    : null;

  const prompt = isFinished
    ? `Write a brief football match report for ${match.homeTeam.name} vs ${match.awayTeam.name} in ${match.competition.name}. Final score: ${score}. Write 2-3 paragraphs covering key moments and result significance. Be factual and concise.`
    : `Write a brief football match preview for ${match.homeTeam.name} vs ${match.awayTeam.name} in ${match.competition.name} on ${match.utcDate}. Write 2-3 paragraphs covering team form, key players, and prediction. Be factual and concise.`;

  const localePrompts: Record<string, string> = {
    "zh-CN": `${prompt}\n\nRespond in Simplified Chinese (简体中文).`,
    "zh-TW": `${prompt}\n\nRespond in Traditional Chinese (繁體中文).`,
    en: `${prompt}\n\nRespond in English.`,
    th: `${prompt}\n\nRespond in Thai (ภาษาไทย).`,
    vi: `${prompt}\n\nRespond in Vietnamese (Tiếng Việt).`,
  };

  const results: Record<string, string> = {};

  for (const [locale, localePrompt] of Object.entries(localePrompts)) {
    try {
      results[locale] = await callAI(localePrompt);
    } catch (err) {
      console.error(`Failed to generate ${locale} content:`, err);
      results[locale] = "";
    }
  }

  return results;
}

function buildSlug(match: { homeTeam: { name: string }; awayTeam: { name: string }; utcDate: string }) {
  const date = match.utcDate.split("T")[0];
  const home = match.homeTeam.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const away = match.awayTeam.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return `${date}-${home}-vs-${away}`;
}

async function publishArticle(article: {
  slug: string;
  sport: string;
  title: string;
  leagueLabel: string;
  kickoff: string;
  teaser: string;
  marketSummary: string;
  fullAnalysisText: string;
  titleZhCn: string;
  titleZhTw: string;
  titleEn: string;
  titleTh: string;
  titleVi: string;
  contentZhCn: string;
  contentZhTw: string;
  contentEn: string;
  contentTh: string;
  contentVi: string;
  seoDescription: string;
  aiGenerated: boolean;
  status: string;
  publishedAt: string;
  price: number;
  performance: string;
  tagsText: string;
}) {
  const res = await fetch(`${SITE_API_BASE}/api/internal/pipeline/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Pipeline-Secret": PIPELINE_SECRET,
    },
    body: JSON.stringify(article),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Publish failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  console.log("Starting content pipeline...");

  const matches = await fetchUpcomingMatches();
  console.log(`Found ${matches.length} matches`);

  let published = 0;
  let skipped = 0;
  let failed = 0;

  for (const match of matches.slice(0, 10)) { // limit to 10 per run to control costs
    const slug = buildSlug(match);

    try {
      const content = await generateArticle(match);

      // Quality check: minimum length
      const enContent = content.en ?? "";
      if (enContent.length < 200) {
        console.log(`Skipping ${slug}: content too short (${enContent.length} chars)`);
        skipped++;
        continue;
      }

      const isFinished = match.status === "FINISHED";
      const title = `${match.homeTeam.name} vs ${match.awayTeam.name}`;

      await publishArticle({
        slug,
        sport: "football",
        title,
        leagueLabel: match.competition.name,
        kickoff: match.utcDate,
        teaser: enContent.split("\n")[0]?.slice(0, 200) ?? title,
        marketSummary: "",
        fullAnalysisText: enContent,
        titleZhCn: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        titleZhTw: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        titleEn: title,
        titleTh: title,
        titleVi: title,
        contentZhCn: content["zh-CN"] ?? "",
        contentZhTw: content["zh-TW"] ?? "",
        contentEn: enContent,
        contentTh: content.th ?? "",
        contentVi: content.vi ?? "",
        seoDescription: enContent.slice(0, 160),
        aiGenerated: true,
        status: "published",
        publishedAt: new Date().toISOString(),
        price: 0,
        performance: isFinished ? "result" : "preview",
        tagsText: `football,${match.competition.name.toLowerCase()}`,
      });

      // Trigger Google Indexing API for all locales
      await fetch(`${SITE_API_BASE}/api/internal/seo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Pipeline-Secret": PIPELINE_SECRET },
        body: JSON.stringify({ slug }),
      }).catch((err) => console.warn("SEO indexing trigger failed:", err));

      console.log(`Published: ${slug}`);
      published++;
    } catch (err) {
      console.error(`Failed to process ${slug}:`, err);
      failed++;
    }
  }

  console.log(`Pipeline complete: ${published} published, ${skipped} skipped, ${failed} failed`);
}

main().catch((err) => {
  console.error("Pipeline error:", err);
  process.exit(1);
});
