import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const currentFile = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(currentFile);
const rootDir = path.resolve(scriptsDir, "..");
const prismaDir = path.join(rootDir, "prisma");

function parseEnvFile(filePath) {
  const values = {};
  const source = readFileSync(filePath, "utf8");

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const envPath = path.join(rootDir, ".env");
  const envValues = parseEnvFile(envPath);

  if (!envValues.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in the environment or .env");
  }

  return envValues.DATABASE_URL;
}

function resolveSqlitePath(databaseUrl) {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error(`Only sqlite file URLs are supported. Received: ${databaseUrl}`);
  }

  const sqlitePath = databaseUrl.slice("file:".length);

  if (!sqlitePath || sqlitePath === ":memory:") {
    throw new Error("An on-disk sqlite database is required for persistence");
  }

  if (path.isAbsolute(sqlitePath)) {
    return sqlitePath;
  }

  return path.resolve(prismaDir, sqlitePath);
}

const databaseUrl = getDatabaseUrl();
const databasePath = resolveSqlitePath(databaseUrl);

mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);

function hasColumn(tableName, columnName) {
  const result = db
    .prepare(`PRAGMA table_info("${tableName}")`)
    .all()
    .some((column) => column.name === columnName);

  return result;
}

function ensureColumn(tableName, columnName, definition) {
  if (hasColumn(tableName, columnName)) {
    return;
  }

  db.exec(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${definition}`);
}

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "membershipPlanId" TEXT,
    "membershipExpiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Session_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "MembershipOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerOrderId" TEXT,
    "expiresAt" DATETIME,
    "callbackPayload" TEXT,
    "paymentReference" TEXT,
    "paidAt" DATETIME,
    "failedAt" DATETIME,
    "failureReason" TEXT,
    "closedAt" DATETIME,
    "refundedAt" DATETIME,
    "refundReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "MembershipOrder_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "ContentOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerOrderId" TEXT,
    "expiresAt" DATETIME,
    "callbackPayload" TEXT,
    "paymentReference" TEXT,
    "paidAt" DATETIME,
    "failedAt" DATETIME,
    "failureReason" TEXT,
    "closedAt" DATETIME,
    "refundedAt" DATETIME,
    "refundReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ContentOrder_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "League" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'nowscore',
    "sourceKey" TEXT,
    "sourcePayload" TEXT,
    "sport" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "region" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'nowscore',
    "sourceKey" TEXT,
    "sourcePayload" TEXT,
    "sport" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "shortName" TEXT NOT NULL,
    "ranking" INTEGER,
    "form" TEXT,
    "homeRecord" TEXT,
    "awayRecord" TEXT,
    "lastSyncedAt" DATETIME,
    "leagueId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_leagueId_fkey"
      FOREIGN KEY ("leagueId") REFERENCES "League" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'nowscore',
    "sourceKey" TEXT,
    "sourcePayload" TEXT,
    "sport" TEXT NOT NULL,
    "slug" TEXT,
    "status" TEXT NOT NULL,
    "kickoff" DATETIME NOT NULL,
    "clock" TEXT,
    "venue" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "homeTeamId" TEXT,
    "awayTeamId" TEXT,
    "homeTeamName" TEXT NOT NULL,
    "awayTeamName" TEXT NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "scoreText" TEXT,
    "statLine" TEXT,
    "insight" TEXT,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Match_leagueId_fkey"
      FOREIGN KEY ("leagueId") REFERENCES "League" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Match_homeTeamId_fkey"
      FOREIGN KEY ("homeTeamId") REFERENCES "Team" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_awayTeamId_fkey"
      FOREIGN KEY ("awayTeamId") REFERENCES "Team" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "OddsSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'nowscore',
    "sourceKey" TEXT,
    "sourcePayload" TEXT,
    "bookmaker" TEXT,
    "market" TEXT NOT NULL DEFAULT 'main',
    "home" REAL,
    "draw" REAL,
    "away" REAL,
    "spread" TEXT,
    "total" TEXT,
    "movement" TEXT,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchId" TEXT NOT NULL,
    CONSTRAINT "OddsSnapshot_matchId_fkey"
      FOREIGN KEY ("matchId") REFERENCES "Match" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "StandingSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'nowscore',
    "sourcePayload" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'overall',
    "rank" INTEGER NOT NULL,
    "teamName" TEXT NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "win" INTEGER NOT NULL DEFAULT 0,
    "draw" INTEGER NOT NULL DEFAULT 0,
    "loss" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "form" TEXT,
    "homeRecord" TEXT,
    "awayRecord" TEXT,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT,
    CONSTRAINT "StandingSnapshot_leagueId_fkey"
      FOREIGN KEY ("leagueId") REFERENCES "League" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StandingSnapshot_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "Team" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "ScheduleSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'nowscore',
    "sourcePayload" TEXT,
    "labelDate" TEXT NOT NULL,
    "fixture" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "sortDate" DATETIME,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leagueId" TEXT NOT NULL,
    "matchId" TEXT,
    CONSTRAINT "ScheduleSnapshot_leagueId_fkey"
      FOREIGN KEY ("leagueId") REFERENCES "League" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduleSnapshot_matchId_fkey"
      FOREIGN KEY ("matchId") REFERENCES "Match" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "HeadToHeadSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'nowscore',
    "sourcePayload" TEXT,
    "season" TEXT NOT NULL,
    "fixture" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leagueId" TEXT NOT NULL,
    CONSTRAINT "HeadToHeadSnapshot_leagueId_fkey"
      FOREIGN KEY ("leagueId") REFERENCES "League" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "AuthorTeam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceKey" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "streak" TEXT NOT NULL,
    "winRate" TEXT NOT NULL,
    "monthlyRoi" TEXT NOT NULL,
    "followers" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "bio" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "PredictionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceKey" TEXT,
    "sport" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "pick" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "expectedEdge" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "factorsText" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "sourcePayload" TEXT,
    "matchId" TEXT,
    "authorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PredictionRecord_matchId_fkey"
      FOREIGN KEY ("matchId") REFERENCES "Match" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PredictionRecord_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "AuthorTeam" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "ArticlePlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceKey" TEXT,
    "slug" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "matchId" TEXT,
    "title" TEXT NOT NULL,
    "leagueLabel" TEXT NOT NULL,
    "kickoff" DATETIME NOT NULL,
    "teaser" TEXT NOT NULL,
    "marketSummary" TEXT NOT NULL,
    "previewText" TEXT,
    "fullAnalysisText" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "isHot" BOOLEAN NOT NULL DEFAULT false,
    "performance" TEXT NOT NULL,
    "tagsText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" DATETIME,
    "leagueId" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArticlePlan_leagueId_fkey"
      FOREIGN KEY ("leagueId") REFERENCES "League" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ArticlePlan_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "AuthorTeam" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "HomepageModule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "eyebrow" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "leagueId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HomepageModule_leagueId_fkey"
      FOREIGN KEY ("leagueId") REFERENCES "League" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "HomepageBanner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'sunrise',
    "titleZhCn" TEXT NOT NULL,
    "titleZhTw" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "subtitleZhCn" TEXT NOT NULL,
    "subtitleZhTw" TEXT NOT NULL,
    "subtitleEn" TEXT NOT NULL,
    "descriptionZhCn" TEXT NOT NULL,
    "descriptionZhTw" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "ctaLabelZhCn" TEXT NOT NULL,
    "ctaLabelZhTw" TEXT NOT NULL,
    "ctaLabelEn" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "impressionCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "lastImpressionAt" DATETIME,
    "lastClickAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "SiteAnnouncement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'info',
    "titleZhCn" TEXT NOT NULL,
    "titleZhTw" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "messageZhCn" TEXT NOT NULL,
    "messageZhTw" TEXT NOT NULL,
    "messageEn" TEXT NOT NULL,
    "href" TEXT,
    "ctaLabelZhCn" TEXT,
    "ctaLabelZhTw" TEXT,
    "ctaLabelEn" TEXT,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "SyncRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'nowscore',
    "scope" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "triggerSource" TEXT NOT NULL DEFAULT 'manual-admin',
    "requestedByUserId" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "summaryJson" TEXT,
    "errorText" TEXT
  );

  CREATE TABLE IF NOT EXISTS "SyncLock" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "owner" TEXT,
    "acquiredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
  CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
  CREATE UNIQUE INDEX IF NOT EXISTS "League_slug_key" ON "League"("slug");
  CREATE UNIQUE INDEX IF NOT EXISTS "League_source_sourceKey_key" ON "League"("source", "sourceKey");
  CREATE UNIQUE INDEX IF NOT EXISTS "Team_leagueId_slug_key" ON "Team"("leagueId", "slug");
  CREATE UNIQUE INDEX IF NOT EXISTS "Team_source_sourceKey_key" ON "Team"("source", "sourceKey");
  CREATE UNIQUE INDEX IF NOT EXISTS "Match_source_sourceKey_key" ON "Match"("source", "sourceKey");
  CREATE UNIQUE INDEX IF NOT EXISTS "AuthorTeam_slug_key" ON "AuthorTeam"("slug");
  CREATE UNIQUE INDEX IF NOT EXISTS "AuthorTeam_source_sourceKey_key" ON "AuthorTeam"("source", "sourceKey");
  CREATE UNIQUE INDEX IF NOT EXISTS "PredictionRecord_source_sourceKey_key" ON "PredictionRecord"("source", "sourceKey");
  CREATE UNIQUE INDEX IF NOT EXISTS "ArticlePlan_slug_key" ON "ArticlePlan"("slug");
  CREATE UNIQUE INDEX IF NOT EXISTS "ArticlePlan_source_sourceKey_key" ON "ArticlePlan"("source", "sourceKey");
  CREATE UNIQUE INDEX IF NOT EXISTS "HomepageModule_key_key" ON "HomepageModule"("key");
  CREATE UNIQUE INDEX IF NOT EXISTS "HomepageBanner_key_key" ON "HomepageBanner"("key");
  CREATE UNIQUE INDEX IF NOT EXISTS "SiteAnnouncement_key_key" ON "SiteAnnouncement"("key");
  CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
  CREATE INDEX IF NOT EXISTS "MembershipOrder_userId_idx" ON "MembershipOrder"("userId");
  CREATE INDEX IF NOT EXISTS "ContentOrder_userId_idx" ON "ContentOrder"("userId");
  CREATE INDEX IF NOT EXISTS "League_sport_featured_sortOrder_idx" ON "League"("sport", "featured", "sortOrder");
  CREATE INDEX IF NOT EXISTS "Team_leagueId_ranking_idx" ON "Team"("leagueId", "ranking");
  CREATE INDEX IF NOT EXISTS "Match_sport_kickoff_idx" ON "Match"("sport", "kickoff");
  CREATE INDEX IF NOT EXISTS "Match_leagueId_kickoff_idx" ON "Match"("leagueId", "kickoff");
  CREATE INDEX IF NOT EXISTS "Match_status_kickoff_idx" ON "Match"("status", "kickoff");
  CREATE INDEX IF NOT EXISTS "OddsSnapshot_matchId_capturedAt_idx" ON "OddsSnapshot"("matchId", "capturedAt");
  CREATE INDEX IF NOT EXISTS "StandingSnapshot_leagueId_capturedAt_rank_idx" ON "StandingSnapshot"("leagueId", "capturedAt", "rank");
  CREATE INDEX IF NOT EXISTS "StandingSnapshot_teamId_capturedAt_idx" ON "StandingSnapshot"("teamId", "capturedAt");
  CREATE INDEX IF NOT EXISTS "ScheduleSnapshot_leagueId_capturedAt_idx" ON "ScheduleSnapshot"("leagueId", "capturedAt");
  CREATE INDEX IF NOT EXISTS "ScheduleSnapshot_matchId_idx" ON "ScheduleSnapshot"("matchId");
  CREATE INDEX IF NOT EXISTS "HeadToHeadSnapshot_leagueId_capturedAt_sortOrder_idx" ON "HeadToHeadSnapshot"("leagueId", "capturedAt", "sortOrder");
  CREATE INDEX IF NOT EXISTS "AuthorTeam_status_updatedAt_idx" ON "AuthorTeam"("status", "updatedAt");
  CREATE INDEX IF NOT EXISTS "PredictionRecord_sport_createdAt_idx" ON "PredictionRecord"("sport", "createdAt");
  CREATE INDEX IF NOT EXISTS "PredictionRecord_matchId_idx" ON "PredictionRecord"("matchId");
  CREATE INDEX IF NOT EXISTS "PredictionRecord_authorId_idx" ON "PredictionRecord"("authorId");
  CREATE INDEX IF NOT EXISTS "ArticlePlan_sport_status_kickoff_idx" ON "ArticlePlan"("sport", "status", "kickoff");
  CREATE INDEX IF NOT EXISTS "ArticlePlan_authorId_status_idx" ON "ArticlePlan"("authorId", "status");
  CREATE INDEX IF NOT EXISTS "HomepageModule_status_sortOrder_idx" ON "HomepageModule"("status", "sortOrder");
  CREATE INDEX IF NOT EXISTS "HomepageBanner_status_sortOrder_idx" ON "HomepageBanner"("status", "sortOrder");
  CREATE INDEX IF NOT EXISTS "HomepageBanner_startsAt_endsAt_idx" ON "HomepageBanner"("startsAt", "endsAt");
  CREATE INDEX IF NOT EXISTS "SiteAnnouncement_status_sortOrder_idx" ON "SiteAnnouncement"("status", "sortOrder");
  CREATE INDEX IF NOT EXISTS "SiteAnnouncement_startsAt_endsAt_idx" ON "SiteAnnouncement"("startsAt", "endsAt");
  CREATE INDEX IF NOT EXISTS "SyncRun_source_startedAt_idx" ON "SyncRun"("source", "startedAt");
  CREATE INDEX IF NOT EXISTS "SyncRun_status_startedAt_idx" ON "SyncRun"("status", "startedAt");
  CREATE INDEX IF NOT EXISTS "SyncLock_expiresAt_idx" ON "SyncLock"("expiresAt");
`);

ensureColumn("MembershipOrder", "paymentReference", "TEXT");
ensureColumn("MembershipOrder", "provider", "TEXT DEFAULT 'mock'");
ensureColumn("MembershipOrder", "providerOrderId", "TEXT");
ensureColumn("MembershipOrder", "expiresAt", "DATETIME");
ensureColumn("MembershipOrder", "callbackPayload", "TEXT");
ensureColumn("MembershipOrder", "paidAt", "DATETIME");
ensureColumn("MembershipOrder", "failedAt", "DATETIME");
ensureColumn("MembershipOrder", "failureReason", "TEXT");
ensureColumn("MembershipOrder", "closedAt", "DATETIME");
ensureColumn("MembershipOrder", "refundedAt", "DATETIME");
ensureColumn("MembershipOrder", "refundReason", "TEXT");
ensureColumn("MembershipOrder", "updatedAt", "DATETIME");
ensureColumn("ContentOrder", "paymentReference", "TEXT");
ensureColumn("ContentOrder", "provider", "TEXT DEFAULT 'mock'");
ensureColumn("ContentOrder", "providerOrderId", "TEXT");
ensureColumn("ContentOrder", "expiresAt", "DATETIME");
ensureColumn("ContentOrder", "callbackPayload", "TEXT");
ensureColumn("ContentOrder", "paidAt", "DATETIME");
ensureColumn("ContentOrder", "failedAt", "DATETIME");
ensureColumn("ContentOrder", "failureReason", "TEXT");
ensureColumn("ContentOrder", "closedAt", "DATETIME");
ensureColumn("ContentOrder", "refundedAt", "DATETIME");
ensureColumn("ContentOrder", "refundReason", "TEXT");
ensureColumn("ContentOrder", "updatedAt", "DATETIME");
ensureColumn("ArticlePlan", "matchId", "TEXT");
ensureColumn("HomepageBanner", "impressionCount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("HomepageBanner", "clickCount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("HomepageBanner", "lastImpressionAt", "DATETIME");
ensureColumn("HomepageBanner", "lastClickAt", "DATETIME");
ensureColumn("SyncRun", "triggerSource", "TEXT DEFAULT 'manual-admin'");
ensureColumn("SyncRun", "requestedByUserId", "TEXT");
db.exec(`CREATE INDEX IF NOT EXISTS "ArticlePlan_matchId_idx" ON "ArticlePlan"("matchId");`);
db.exec(`
  UPDATE "MembershipOrder"
  SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
  WHERE "updatedAt" IS NULL;
  UPDATE "ContentOrder"
  SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
  WHERE "updatedAt" IS NULL;
`);
db.exec(`
  CREATE INDEX IF NOT EXISTS "MembershipOrder_status_updatedAt_idx" ON "MembershipOrder"("status", "updatedAt");
  CREATE INDEX IF NOT EXISTS "ContentOrder_status_updatedAt_idx" ON "ContentOrder"("status", "updatedAt");
  CREATE UNIQUE INDEX IF NOT EXISTS "MembershipOrder_provider_providerOrderId_key" ON "MembershipOrder"("provider", "providerOrderId");
  CREATE UNIQUE INDEX IF NOT EXISTS "ContentOrder_provider_providerOrderId_key" ON "ContentOrder"("provider", "providerOrderId");
`);

db.close();

console.log(`SQLite database initialized at ${databasePath}`);
