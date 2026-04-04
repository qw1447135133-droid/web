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
    "referredAt" DATETIME,
    "referredByAgentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_referredByAgentId_fkey"
      FOREIGN KEY ("referredByAgentId") REFERENCES "AgentProfile" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
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

  CREATE TABLE IF NOT EXISTS "CoinAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeCredited" INTEGER NOT NULL DEFAULT 0,
    "lifetimeDebited" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "CoinAccount_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "CoinLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "direction" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "note" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountId" TEXT NOT NULL,
    CONSTRAINT "CoinLedger_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "CoinAccount" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "CoinPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "titleZhCn" TEXT NOT NULL,
    "titleZhTw" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionZhCn" TEXT,
    "descriptionZhTw" TEXT,
    "descriptionEn" TEXT,
    "coinAmount" INTEGER NOT NULL,
    "bonusAmount" INTEGER NOT NULL DEFAULT 0,
    "price" INTEGER NOT NULL,
    "validityDays" INTEGER,
    "badge" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "CoinRechargeOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNo" TEXT NOT NULL,
    "coinAmount" INTEGER NOT NULL,
    "bonusAmount" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'manual',
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
    "creditedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "packageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "CoinRechargeOrder_packageId_fkey"
      FOREIGN KEY ("packageId") REFERENCES "CoinPackage" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CoinRechargeOrder_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "PaymentCallbackEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerEventId" TEXT,
    "eventKey" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "orderId" TEXT,
    "providerOrderId" TEXT,
    "paymentReference" TEXT,
    "state" TEXT NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'received',
    "processingMessage" TEXT,
    "payload" TEXT,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "AgentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "inviteCode" TEXT NOT NULL,
    "inviteUrl" TEXT,
    "commissionRate" REAL NOT NULL DEFAULT 0,
    "downstreamRate" REAL NOT NULL DEFAULT 0,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "channelSummary" TEXT,
    "payoutAccount" TEXT,
    "totalReferredUsers" INTEGER NOT NULL DEFAULT 0,
    "monthlyRechargeAmount" INTEGER NOT NULL DEFAULT 0,
    "totalCommission" INTEGER NOT NULL DEFAULT 0,
    "unsettledCommission" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "parentAgentId" TEXT,
    CONSTRAINT "AgentProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentProfile_parentAgentId_fkey"
      FOREIGN KEY ("parentAgentId") REFERENCES "AgentProfile" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "AgentApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "contact" TEXT,
    "channelSummary" TEXT NOT NULL,
    "expectedMonthlyUsers" INTEGER,
    "desiredLevel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewerNote" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "approvedAgentId" TEXT,
    CONSTRAINT "AgentApplication_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentApplication_approvedAgentId_fkey"
      FOREIGN KEY ("approvedAgentId") REFERENCES "AgentProfile" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "AgentCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "incentivePolicy" TEXT,
    "targetAgentCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "RecruitmentLead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "sourceChannel" TEXT NOT NULL,
    "desiredLevel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "note" TEXT,
    "ownerName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaignId" TEXT,
    "agentId" TEXT,
    CONSTRAINT "RecruitmentLead_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "AgentCampaign" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecruitmentLead_agentId_fkey"
      FOREIGN KEY ("agentId") REFERENCES "AgentProfile" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "AgentWithdrawal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payoutAccount" TEXT,
    "payoutChannel" TEXT,
    "payoutBatchNo" TEXT,
    "payoutReference" TEXT,
    "payoutOperator" TEXT,
    "payoutRequestedAt" DATETIME,
    "callbackStatus" TEXT,
    "callbackPayload" TEXT,
    "callbackReceivedAt" DATETIME,
    "note" TEXT,
    "proofUrl" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "settledAt" DATETIME,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentId" TEXT NOT NULL,
    CONSTRAINT "AgentWithdrawal_agentId_fkey"
      FOREIGN KEY ("agentId") REFERENCES "AgentProfile" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "AgentCommissionLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'direct',
    "rechargeAmount" INTEGER NOT NULL,
    "commissionRate" REAL NOT NULL DEFAULT 0,
    "commissionAmount" INTEGER NOT NULL,
    "settledAmount" INTEGER NOT NULL DEFAULT 0,
    "reversedAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" DATETIME,
    "reversedAt" DATETIME,
    "agentId" TEXT NOT NULL,
    "sourceAgentId" TEXT,
    "sourceAgentName" TEXT,
    "userId" TEXT NOT NULL,
    "rechargeOrderId" TEXT NOT NULL,
    CONSTRAINT "AgentCommissionLedger_agentId_fkey"
      FOREIGN KEY ("agentId") REFERENCES "AgentProfile" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentCommissionLedger_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentCommissionLedger_rechargeOrderId_fkey"
      FOREIGN KEY ("rechargeOrderId") REFERENCES "CoinRechargeOrder" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "AgentWithdrawalAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawalId" TEXT NOT NULL,
    "commissionLedgerId" TEXT NOT NULL,
    CONSTRAINT "AgentWithdrawalAllocation_withdrawalId_fkey"
      FOREIGN KEY ("withdrawalId") REFERENCES "AgentWithdrawal" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentWithdrawalAllocation_commissionLedgerId_fkey"
      FOREIGN KEY ("commissionLedgerId") REFERENCES "AgentCommissionLedger" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "AdminRolePolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "description" TEXT,
    "canAccessAdminConsole" BOOLEAN NOT NULL DEFAULT false,
    "canManageContent" BOOLEAN NOT NULL DEFAULT false,
    "canManageFinance" BOOLEAN NOT NULL DEFAULT false,
    "canManageAgents" BOOLEAN NOT NULL DEFAULT false,
    "canManageSystem" BOOLEAN NOT NULL DEFAULT false,
    "canViewReports" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorDisplayName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "detail" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    CONSTRAINT "AdminAuditLog_actorUserId_fkey"
      FOREIGN KEY ("actorUserId") REFERENCES "User" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "SystemAlertChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "severityFilter" TEXT NOT NULL DEFAULT 'warn,error',
    "status" TEXT NOT NULL DEFAULT 'active',
    "note" TEXT,
    "lastTriggeredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "SystemAlertEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warn',
    "status" TEXT NOT NULL DEFAULT 'open',
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "channelId" TEXT,
    CONSTRAINT "SystemAlertEvent_channelId_fkey"
      FOREIGN KEY ("channelId") REFERENCES "SystemAlertChannel" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "SystemParameter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "AdminExportTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "requestedByDisplayName" TEXT NOT NULL,
    "filtersJson" TEXT,
    "filename" TEXT,
    "storageType" TEXT NOT NULL DEFAULT 'local',
    "storageKey" TEXT,
    "mimeType" TEXT NOT NULL DEFAULT 'text/csv',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "sizeBytes" INTEGER,
    "errorText" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedByUserId" TEXT,
    CONSTRAINT "AdminExportTask_requestedByUserId_fkey"
      FOREIGN KEY ("requestedByUserId") REFERENCES "User" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "FinanceReconciliationIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL DEFAULT 'coin-recharge',
    "issueType" TEXT NOT NULL DEFAULT 'manual_review',
    "status" TEXT NOT NULL DEFAULT 'open',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "reasonCode" TEXT,
    "paymentReference" TEXT,
    "amount" INTEGER,
    "sourceStatus" TEXT,
    "resolutionNote" TEXT,
    "assignedToDisplayName" TEXT,
    "createdByDisplayName" TEXT NOT NULL,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rechargeOrderId" TEXT,
    "createdByUserId" TEXT,
    CONSTRAINT "FinanceReconciliationIssue_rechargeOrderId_fkey"
      FOREIGN KEY ("rechargeOrderId") REFERENCES "CoinRechargeOrder" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinanceReconciliationIssue_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
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

  CREATE TABLE IF NOT EXISTS "HomepageFeaturedMatchSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "matchRef" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "matchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HomepageFeaturedMatchSlot_matchId_fkey"
      FOREIGN KEY ("matchId") REFERENCES "Match" ("id")
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
    "primaryImpressionCount" INTEGER NOT NULL DEFAULT 0,
    "primaryClickCount" INTEGER NOT NULL DEFAULT 0,
    "secondaryImpressionCount" INTEGER NOT NULL DEFAULT 0,
    "secondaryClickCount" INTEGER NOT NULL DEFAULT 0,
    "lastImpressionAt" DATETIME,
    "lastClickAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "HomepageBannerDailyStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "metricDate" DATETIME NOT NULL,
    "impressionCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bannerId" TEXT NOT NULL,
    CONSTRAINT "HomepageBannerDailyStat_bannerId_fkey"
      FOREIGN KEY ("bannerId") REFERENCES "HomepageBanner" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
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

  CREATE TABLE IF NOT EXISTS "AssistantConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionKey" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'zh-CN',
    "title" TEXT,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "handoffRequestedAt" DATETIME,
    "resolvedAt" DATETIME,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "AssistantConversation_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "AssistantMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "linksJson" TEXT,
    "provider" TEXT,
    "model" TEXT,
    "finishReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversationId" TEXT NOT NULL,
    CONSTRAINT "AssistantMessage_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "SupportKnowledgeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "questionZhCn" TEXT NOT NULL,
    "questionZhTw" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "answerZhCn" TEXT NOT NULL,
    "answerZhTw" TEXT NOT NULL,
    "answerEn" TEXT NOT NULL,
    "href" TEXT,
    "tagsText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "AssistantHandoffRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locale" TEXT NOT NULL DEFAULT 'zh-CN',
    "contactName" TEXT,
    "contactMethod" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT,
    CONSTRAINT "AssistantHandoffRequest_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssistantHandoffRequest_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
  CREATE UNIQUE INDEX IF NOT EXISTS "AgentCommissionLedger_rechargeOrderId_key" ON "AgentCommissionLedger"("rechargeOrderId");
  CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
  CREATE UNIQUE INDEX IF NOT EXISTS "CoinAccount_userId_key" ON "CoinAccount"("userId");
  CREATE UNIQUE INDEX IF NOT EXISTS "CoinPackage_key_key" ON "CoinPackage"("key");
  CREATE UNIQUE INDEX IF NOT EXISTS "CoinRechargeOrder_orderNo_key" ON "CoinRechargeOrder"("orderNo");
  CREATE UNIQUE INDEX IF NOT EXISTS "AgentProfile_inviteCode_key" ON "AgentProfile"("inviteCode");
  CREATE UNIQUE INDEX IF NOT EXISTS "AgentProfile_userId_key" ON "AgentProfile"("userId");
  CREATE UNIQUE INDEX IF NOT EXISTS "AdminRolePolicy_role_key" ON "AdminRolePolicy"("role");
  CREATE UNIQUE INDEX IF NOT EXISTS "SystemParameter_key_key" ON "SystemParameter"("key");
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
  CREATE UNIQUE INDEX IF NOT EXISTS "HomepageFeaturedMatchSlot_key_key" ON "HomepageFeaturedMatchSlot"("key");
  CREATE UNIQUE INDEX IF NOT EXISTS "HomepageBanner_key_key" ON "HomepageBanner"("key");
  CREATE UNIQUE INDEX IF NOT EXISTS "SiteAnnouncement_key_key" ON "SiteAnnouncement"("key");
  CREATE UNIQUE INDEX IF NOT EXISTS "SupportKnowledgeItem_key_key" ON "SupportKnowledgeItem"("key");
  CREATE UNIQUE INDEX IF NOT EXISTS "PaymentCallbackEvent_eventKey_key" ON "PaymentCallbackEvent"("eventKey");
  CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
  CREATE INDEX IF NOT EXISTS "MembershipOrder_userId_idx" ON "MembershipOrder"("userId");
  CREATE INDEX IF NOT EXISTS "ContentOrder_userId_idx" ON "ContentOrder"("userId");
  CREATE INDEX IF NOT EXISTS "CoinAccount_balance_updatedAt_idx" ON "CoinAccount"("balance", "updatedAt");
  CREATE INDEX IF NOT EXISTS "CoinLedger_accountId_createdAt_idx" ON "CoinLedger"("accountId", "createdAt");
  CREATE INDEX IF NOT EXISTS "CoinLedger_referenceType_referenceId_idx" ON "CoinLedger"("referenceType", "referenceId");
  CREATE INDEX IF NOT EXISTS "CoinLedger_reason_createdAt_idx" ON "CoinLedger"("reason", "createdAt");
  CREATE INDEX IF NOT EXISTS "CoinPackage_status_sortOrder_idx" ON "CoinPackage"("status", "sortOrder");
  CREATE INDEX IF NOT EXISTS "CoinRechargeOrder_status_updatedAt_idx" ON "CoinRechargeOrder"("status", "updatedAt");
  CREATE INDEX IF NOT EXISTS "CoinRechargeOrder_userId_updatedAt_idx" ON "CoinRechargeOrder"("userId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "CoinRechargeOrder_packageId_updatedAt_idx" ON "CoinRechargeOrder"("packageId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_status_updatedAt_idx" ON "FinanceReconciliationIssue"("status", "updatedAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_severity_updatedAt_idx" ON "FinanceReconciliationIssue"("severity", "updatedAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_scope_updatedAt_idx" ON "FinanceReconciliationIssue"("scope", "updatedAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_rechargeOrderId_updatedAt_idx" ON "FinanceReconciliationIssue"("rechargeOrderId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_createdByUserId_updatedAt_idx" ON "FinanceReconciliationIssue"("createdByUserId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "PaymentCallbackEvent_provider_createdAt_idx" ON "PaymentCallbackEvent"("provider", "createdAt");
  CREATE INDEX IF NOT EXISTS "PaymentCallbackEvent_processingStatus_lastSeenAt_idx" ON "PaymentCallbackEvent"("processingStatus", "lastSeenAt");
  CREATE INDEX IF NOT EXISTS "PaymentCallbackEvent_orderType_orderId_idx" ON "PaymentCallbackEvent"("orderType", "orderId");
  CREATE INDEX IF NOT EXISTS "AgentApplication_status_updatedAt_idx" ON "AgentApplication"("status", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AgentApplication_userId_updatedAt_idx" ON "AgentApplication"("userId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AgentProfile_status_level_updatedAt_idx" ON "AgentProfile"("status", "level", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AgentProfile_parentAgentId_updatedAt_idx" ON "AgentProfile"("parentAgentId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AgentCampaign_status_updatedAt_idx" ON "AgentCampaign"("status", "updatedAt");
  CREATE INDEX IF NOT EXISTS "RecruitmentLead_status_updatedAt_idx" ON "RecruitmentLead"("status", "updatedAt");
  CREATE INDEX IF NOT EXISTS "RecruitmentLead_campaignId_updatedAt_idx" ON "RecruitmentLead"("campaignId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "RecruitmentLead_agentId_updatedAt_idx" ON "RecruitmentLead"("agentId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AgentWithdrawal_status_updatedAt_idx" ON "AgentWithdrawal"("status", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AgentWithdrawal_agentId_updatedAt_idx" ON "AgentWithdrawal"("agentId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AdminAuditLog_scope_createdAt_idx" ON "AdminAuditLog"("scope", "createdAt");
  CREATE INDEX IF NOT EXISTS "AdminAuditLog_status_createdAt_idx" ON "AdminAuditLog"("status", "createdAt");
  CREATE INDEX IF NOT EXISTS "AdminAuditLog_actorUserId_createdAt_idx" ON "AdminAuditLog"("actorUserId", "createdAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_status_createdAt_idx" ON "FinanceReconciliationIssue"("status", "createdAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_severity_createdAt_idx" ON "FinanceReconciliationIssue"("severity", "createdAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_scope_createdAt_idx" ON "FinanceReconciliationIssue"("scope", "createdAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_rechargeOrderId_createdAt_idx" ON "FinanceReconciliationIssue"("rechargeOrderId", "createdAt");
  CREATE INDEX IF NOT EXISTS "SystemAlertChannel_status_updatedAt_idx" ON "SystemAlertChannel"("status", "updatedAt");
  CREATE INDEX IF NOT EXISTS "SystemAlertEvent_status_createdAt_idx" ON "SystemAlertEvent"("status", "createdAt");
  CREATE INDEX IF NOT EXISTS "SystemAlertEvent_severity_createdAt_idx" ON "SystemAlertEvent"("severity", "createdAt");
  CREATE INDEX IF NOT EXISTS "SystemAlertEvent_channelId_createdAt_idx" ON "SystemAlertEvent"("channelId", "createdAt");
  CREATE INDEX IF NOT EXISTS "SystemParameter_category_updatedAt_idx" ON "SystemParameter"("category", "updatedAt");
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
  CREATE INDEX IF NOT EXISTS "HomepageFeaturedMatchSlot_status_sortOrder_idx" ON "HomepageFeaturedMatchSlot"("status", "sortOrder");
  CREATE INDEX IF NOT EXISTS "HomepageFeaturedMatchSlot_matchId_idx" ON "HomepageFeaturedMatchSlot"("matchId");
  CREATE INDEX IF NOT EXISTS "HomepageBanner_status_sortOrder_idx" ON "HomepageBanner"("status", "sortOrder");
  CREATE INDEX IF NOT EXISTS "HomepageBanner_startsAt_endsAt_idx" ON "HomepageBanner"("startsAt", "endsAt");
  CREATE INDEX IF NOT EXISTS "HomepageBannerDailyStat_metricDate_idx" ON "HomepageBannerDailyStat"("metricDate");
  CREATE INDEX IF NOT EXISTS "SiteAnnouncement_status_sortOrder_idx" ON "SiteAnnouncement"("status", "sortOrder");
  CREATE INDEX IF NOT EXISTS "SiteAnnouncement_startsAt_endsAt_idx" ON "SiteAnnouncement"("startsAt", "endsAt");
  CREATE INDEX IF NOT EXISTS "SyncRun_source_startedAt_idx" ON "SyncRun"("source", "startedAt");
  CREATE INDEX IF NOT EXISTS "SyncRun_status_startedAt_idx" ON "SyncRun"("status", "startedAt");
  CREATE INDEX IF NOT EXISTS "SyncLock_expiresAt_idx" ON "SyncLock"("expiresAt");
  CREATE INDEX IF NOT EXISTS "AssistantConversation_sessionKey_updatedAt_idx" ON "AssistantConversation"("sessionKey", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AssistantConversation_status_updatedAt_idx" ON "AssistantConversation"("status", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AssistantConversation_userId_updatedAt_idx" ON "AssistantConversation"("userId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AssistantMessage_conversationId_createdAt_idx" ON "AssistantMessage"("conversationId", "createdAt");
  CREATE INDEX IF NOT EXISTS "SupportKnowledgeItem_status_sortOrder_idx" ON "SupportKnowledgeItem"("status", "sortOrder");
  CREATE INDEX IF NOT EXISTS "AssistantHandoffRequest_status_updatedAt_idx" ON "AssistantHandoffRequest"("status", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AssistantHandoffRequest_conversationId_updatedAt_idx" ON "AssistantHandoffRequest"("conversationId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AssistantHandoffRequest_userId_updatedAt_idx" ON "AssistantHandoffRequest"("userId", "updatedAt");
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
ensureColumn("CoinAccount", "balance", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("CoinAccount", "lifetimeCredited", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("CoinAccount", "lifetimeDebited", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("CoinAccount", "lastActivityAt", "DATETIME");
ensureColumn("CoinAccount", "createdAt", "DATETIME");
ensureColumn("CoinAccount", "updatedAt", "DATETIME");
ensureColumn("CoinLedger", "direction", "TEXT");
ensureColumn("CoinLedger", "reason", "TEXT");
ensureColumn("CoinLedger", "amount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("CoinLedger", "balanceBefore", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("CoinLedger", "balanceAfter", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("CoinLedger", "referenceType", "TEXT");
ensureColumn("CoinLedger", "referenceId", "TEXT");
ensureColumn("CoinLedger", "note", "TEXT");
ensureColumn("CoinLedger", "expiresAt", "DATETIME");
ensureColumn("CoinLedger", "createdAt", "DATETIME");
ensureColumn("CoinPackage", "key", "TEXT");
ensureColumn("CoinPackage", "titleZhCn", "TEXT");
ensureColumn("CoinPackage", "titleZhTw", "TEXT");
ensureColumn("CoinPackage", "titleEn", "TEXT");
ensureColumn("CoinPackage", "descriptionZhCn", "TEXT");
ensureColumn("CoinPackage", "descriptionZhTw", "TEXT");
ensureColumn("CoinPackage", "descriptionEn", "TEXT");
ensureColumn("CoinPackage", "coinAmount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("CoinPackage", "bonusAmount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("CoinPackage", "price", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("CoinPackage", "validityDays", "INTEGER");
ensureColumn("CoinPackage", "badge", "TEXT");
ensureColumn("CoinPackage", "status", "TEXT DEFAULT 'active'");
ensureColumn("CoinPackage", "sortOrder", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("CoinPackage", "createdAt", "DATETIME");
ensureColumn("CoinPackage", "updatedAt", "DATETIME");
ensureColumn("CoinRechargeOrder", "orderNo", "TEXT");
ensureColumn("CoinRechargeOrder", "coinAmount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("CoinRechargeOrder", "bonusAmount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("CoinRechargeOrder", "amount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("CoinRechargeOrder", "status", "TEXT DEFAULT 'pending'");
ensureColumn("CoinRechargeOrder", "provider", "TEXT DEFAULT 'manual'");
ensureColumn("CoinRechargeOrder", "providerOrderId", "TEXT");
ensureColumn("CoinRechargeOrder", "expiresAt", "DATETIME");
ensureColumn("CoinRechargeOrder", "callbackPayload", "TEXT");
ensureColumn("CoinRechargeOrder", "paymentReference", "TEXT");
ensureColumn("CoinRechargeOrder", "paidAt", "DATETIME");
ensureColumn("CoinRechargeOrder", "failedAt", "DATETIME");
ensureColumn("CoinRechargeOrder", "failureReason", "TEXT");
ensureColumn("CoinRechargeOrder", "closedAt", "DATETIME");
ensureColumn("CoinRechargeOrder", "refundedAt", "DATETIME");
ensureColumn("CoinRechargeOrder", "refundReason", "TEXT");
ensureColumn("CoinRechargeOrder", "creditedAt", "DATETIME");
ensureColumn("CoinRechargeOrder", "createdAt", "DATETIME");
ensureColumn("CoinRechargeOrder", "updatedAt", "DATETIME");
ensureColumn("FinanceReconciliationIssue", "scope", "TEXT DEFAULT 'coin-recharge'");
ensureColumn("FinanceReconciliationIssue", "issueType", "TEXT DEFAULT 'manual_review'");
ensureColumn("FinanceReconciliationIssue", "status", "TEXT DEFAULT 'open'");
ensureColumn("FinanceReconciliationIssue", "severity", "TEXT DEFAULT 'medium'");
ensureColumn("FinanceReconciliationIssue", "amount", "INTEGER");
ensureColumn("FinanceReconciliationIssue", "paymentReference", "TEXT");
ensureColumn("FinanceReconciliationIssue", "summary", "TEXT");
ensureColumn("FinanceReconciliationIssue", "detail", "TEXT");
ensureColumn("FinanceReconciliationIssue", "reasonCode", "TEXT");
ensureColumn("FinanceReconciliationIssue", "sourceStatus", "TEXT");
ensureColumn("FinanceReconciliationIssue", "resolutionNote", "TEXT");
ensureColumn("FinanceReconciliationIssue", "assignedToDisplayName", "TEXT");
ensureColumn("FinanceReconciliationIssue", "createdByDisplayName", "TEXT");
ensureColumn("FinanceReconciliationIssue", "resolvedAt", "DATETIME");
ensureColumn("FinanceReconciliationIssue", "createdAt", "DATETIME");
ensureColumn("FinanceReconciliationIssue", "updatedAt", "DATETIME");
ensureColumn("FinanceReconciliationIssue", "rechargeOrderId", "TEXT");
ensureColumn("FinanceReconciliationIssue", "createdByUserId", "TEXT");
ensureColumn("User", "referredAt", "DATETIME");
ensureColumn("User", "referredByAgentId", "TEXT");
ensureColumn("AgentCommissionLedger", "rechargeAmount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("AgentCommissionLedger", "kind", "TEXT NOT NULL DEFAULT 'direct'");
ensureColumn("AgentCommissionLedger", "commissionRate", "REAL NOT NULL DEFAULT 0");
ensureColumn("AgentCommissionLedger", "commissionAmount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("AgentCommissionLedger", "settledAmount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("AgentCommissionLedger", "reversedAmount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("AgentCommissionLedger", "status", "TEXT DEFAULT 'pending'");
ensureColumn("AgentCommissionLedger", "note", "TEXT");
ensureColumn("AgentCommissionLedger", "createdAt", "DATETIME");
ensureColumn("AgentCommissionLedger", "updatedAt", "DATETIME");
ensureColumn("AgentCommissionLedger", "settledAt", "DATETIME");
ensureColumn("AgentCommissionLedger", "reversedAt", "DATETIME");
ensureColumn("AgentCommissionLedger", "sourceAgentId", "TEXT");
ensureColumn("AgentCommissionLedger", "sourceAgentName", "TEXT");
ensureColumn("AgentWithdrawalAllocation", "amount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("AgentWithdrawalAllocation", "createdAt", "DATETIME");
ensureColumn("AgentWithdrawalAllocation", "withdrawalId", "TEXT");
ensureColumn("AgentWithdrawalAllocation", "commissionLedgerId", "TEXT");
ensureColumn("AgentWithdrawal", "payoutChannel", "TEXT");
ensureColumn("AgentWithdrawal", "payoutBatchNo", "TEXT");
ensureColumn("AgentWithdrawal", "payoutReference", "TEXT");
ensureColumn("AgentWithdrawal", "payoutOperator", "TEXT");
ensureColumn("AgentWithdrawal", "payoutRequestedAt", "DATETIME");
ensureColumn("AgentWithdrawal", "callbackStatus", "TEXT");
ensureColumn("AgentWithdrawal", "callbackPayload", "TEXT");
ensureColumn("AgentWithdrawal", "callbackReceivedAt", "DATETIME");
ensureColumn("PaymentCallbackEvent", "provider", "TEXT DEFAULT 'mock'");
ensureColumn("PaymentCallbackEvent", "providerEventId", "TEXT");
ensureColumn("PaymentCallbackEvent", "eventKey", "TEXT");
ensureColumn("PaymentCallbackEvent", "orderType", "TEXT");
ensureColumn("PaymentCallbackEvent", "orderId", "TEXT");
ensureColumn("PaymentCallbackEvent", "providerOrderId", "TEXT");
ensureColumn("PaymentCallbackEvent", "paymentReference", "TEXT");
ensureColumn("PaymentCallbackEvent", "state", "TEXT");
ensureColumn("PaymentCallbackEvent", "processingStatus", "TEXT DEFAULT 'received'");
ensureColumn("PaymentCallbackEvent", "processingMessage", "TEXT");
ensureColumn("PaymentCallbackEvent", "payload", "TEXT");
ensureColumn("PaymentCallbackEvent", "duplicateCount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("PaymentCallbackEvent", "lastSeenAt", "DATETIME");
ensureColumn("PaymentCallbackEvent", "createdAt", "DATETIME");
ensureColumn("PaymentCallbackEvent", "updatedAt", "DATETIME");
ensureColumn("ArticlePlan", "matchId", "TEXT");
ensureColumn("HomepageFeaturedMatchSlot", "matchRef", "TEXT");
ensureColumn("HomepageBanner", "impressionCount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("HomepageBanner", "clickCount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("HomepageBanner", "primaryImpressionCount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("HomepageBanner", "primaryClickCount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("HomepageBanner", "secondaryImpressionCount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("HomepageBanner", "secondaryClickCount", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("HomepageBanner", "lastImpressionAt", "DATETIME");
ensureColumn("HomepageBanner", "lastClickAt", "DATETIME");
ensureColumn("SyncRun", "triggerSource", "TEXT DEFAULT 'manual-admin'");
ensureColumn("SyncRun", "requestedByUserId", "TEXT");
ensureColumn("AssistantConversation", "locale", "TEXT DEFAULT 'zh-CN'");
ensureColumn("AssistantConversation", "title", "TEXT");
ensureColumn("AssistantConversation", "summary", "TEXT");
ensureColumn("AssistantConversation", "status", "TEXT DEFAULT 'open'");
ensureColumn("AssistantConversation", "handoffRequestedAt", "DATETIME");
ensureColumn("AssistantConversation", "resolvedAt", "DATETIME");
ensureColumn("AssistantConversation", "lastMessageAt", "DATETIME");
ensureColumn("AssistantConversation", "createdAt", "DATETIME");
ensureColumn("AssistantConversation", "updatedAt", "DATETIME");
ensureColumn("AssistantConversation", "userId", "TEXT");
ensureColumn("AssistantMessage", "linksJson", "TEXT");
ensureColumn("AssistantMessage", "provider", "TEXT");
ensureColumn("AssistantMessage", "model", "TEXT");
ensureColumn("AssistantMessage", "finishReason", "TEXT");
ensureColumn("SupportKnowledgeItem", "category", "TEXT DEFAULT 'general'");
ensureColumn("SupportKnowledgeItem", "href", "TEXT");
ensureColumn("SupportKnowledgeItem", "tagsText", "TEXT");
ensureColumn("SupportKnowledgeItem", "status", "TEXT DEFAULT 'active'");
ensureColumn("SupportKnowledgeItem", "sortOrder", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("SupportKnowledgeItem", "createdAt", "DATETIME");
ensureColumn("SupportKnowledgeItem", "updatedAt", "DATETIME");
ensureColumn("AssistantHandoffRequest", "locale", "TEXT DEFAULT 'zh-CN'");
ensureColumn("AssistantHandoffRequest", "contactName", "TEXT");
ensureColumn("AssistantHandoffRequest", "contactMethod", "TEXT");
ensureColumn("AssistantHandoffRequest", "note", "TEXT");
ensureColumn("AssistantHandoffRequest", "status", "TEXT DEFAULT 'pending'");
ensureColumn("AssistantHandoffRequest", "createdAt", "DATETIME");
ensureColumn("AssistantHandoffRequest", "updatedAt", "DATETIME");
ensureColumn("AssistantHandoffRequest", "userId", "TEXT");
db.exec(`CREATE INDEX IF NOT EXISTS "ArticlePlan_matchId_idx" ON "ArticlePlan"("matchId");`);
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS "HomepageFeaturedMatchSlot_key_key" ON "HomepageFeaturedMatchSlot"("key");`);
db.exec(`CREATE INDEX IF NOT EXISTS "HomepageFeaturedMatchSlot_status_sortOrder_idx" ON "HomepageFeaturedMatchSlot"("status", "sortOrder");`);
db.exec(`CREATE INDEX IF NOT EXISTS "HomepageFeaturedMatchSlot_matchId_idx" ON "HomepageFeaturedMatchSlot"("matchId");`);
db.exec(
  `CREATE UNIQUE INDEX IF NOT EXISTS "HomepageBannerDailyStat_bannerId_metricDate_key" ON "HomepageBannerDailyStat"("bannerId", "metricDate");`,
);
db.exec(`
  UPDATE "HomepageFeaturedMatchSlot"
  SET "matchRef" = COALESCE(
    NULLIF("matchRef", ''),
    (
      SELECT COALESCE("sourceKey", "id")
      FROM "Match"
      WHERE "Match"."id" = "HomepageFeaturedMatchSlot"."matchId"
    )
  )
  WHERE "matchRef" IS NULL OR "matchRef" = '';
  UPDATE "MembershipOrder"
  SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
  WHERE "updatedAt" IS NULL;
  UPDATE "ContentOrder"
  SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
  WHERE "updatedAt" IS NULL;
  UPDATE "CoinAccount"
  SET
    "balance" = COALESCE("balance", 0),
    "lifetimeCredited" = COALESCE("lifetimeCredited", 0),
    "lifetimeDebited" = COALESCE("lifetimeDebited", 0),
    "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
    "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
  WHERE
    "balance" IS NULL
    OR "lifetimeCredited" IS NULL
    OR "lifetimeDebited" IS NULL
    OR "createdAt" IS NULL
    OR "updatedAt" IS NULL;
  UPDATE "CoinLedger"
  SET
    "amount" = COALESCE("amount", 0),
    "balanceBefore" = COALESCE("balanceBefore", 0),
    "balanceAfter" = COALESCE("balanceAfter", 0),
    "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)
  WHERE
    "amount" IS NULL
    OR "balanceBefore" IS NULL
    OR "balanceAfter" IS NULL
    OR "createdAt" IS NULL;
  UPDATE "CoinPackage"
  SET
    "bonusAmount" = COALESCE("bonusAmount", 0),
    "price" = COALESCE("price", 0),
    "status" = COALESCE("status", 'active'),
    "sortOrder" = COALESCE("sortOrder", 0),
    "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
    "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
  WHERE
    "bonusAmount" IS NULL
    OR "price" IS NULL
    OR "status" IS NULL
    OR "sortOrder" IS NULL
    OR "createdAt" IS NULL
    OR "updatedAt" IS NULL;
  UPDATE "CoinRechargeOrder"
  SET
    "bonusAmount" = COALESCE("bonusAmount", 0),
    "amount" = COALESCE("amount", 0),
    "status" = COALESCE("status", 'pending'),
    "provider" = COALESCE("provider", 'manual'),
    "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
    "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
  WHERE
    "bonusAmount" IS NULL
    OR "amount" IS NULL
    OR "status" IS NULL
    OR "provider" IS NULL
    OR "createdAt" IS NULL
    OR "updatedAt" IS NULL;
  UPDATE "FinanceReconciliationIssue"
  SET
    "status" = COALESCE("status", 'open'),
    "severity" = COALESCE("severity", 'medium'),
    "scope" = COALESCE("scope", 'coin-recharge'),
    "issueType" = COALESCE("issueType", 'manual_review'),
    "summary" = COALESCE("summary", "detail", 'Finance reconciliation issue'),
    "createdByDisplayName" = COALESCE("createdByDisplayName", 'Admin'),
    "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
    "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
  WHERE
    "status" IS NULL
    OR "severity" IS NULL
    OR "scope" IS NULL
    OR "issueType" IS NULL
    OR "summary" IS NULL
    OR "createdByDisplayName" IS NULL
    OR "createdAt" IS NULL
    OR "updatedAt" IS NULL;
  UPDATE "PaymentCallbackEvent"
  SET
    "lastSeenAt" = COALESCE("lastSeenAt", "createdAt", CURRENT_TIMESTAMP),
    "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
    "updatedAt" = COALESCE("updatedAt", "lastSeenAt", "createdAt", CURRENT_TIMESTAMP),
    "duplicateCount" = COALESCE("duplicateCount", 0)
  WHERE
    "lastSeenAt" IS NULL
    OR "createdAt" IS NULL
    OR "updatedAt" IS NULL
    OR "duplicateCount" IS NULL;
  UPDATE "AssistantConversation"
  SET
    "locale" = COALESCE("locale", 'zh-CN'),
    "status" = COALESCE("status", 'open'),
    "lastMessageAt" = COALESCE("lastMessageAt", "updatedAt", "createdAt", CURRENT_TIMESTAMP),
    "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
    "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
  WHERE
    "locale" IS NULL
    OR "status" IS NULL
    OR "lastMessageAt" IS NULL
    OR "createdAt" IS NULL
    OR "updatedAt" IS NULL;
  UPDATE "SupportKnowledgeItem"
  SET
    "category" = COALESCE("category", 'general'),
    "status" = COALESCE("status", 'active'),
    "sortOrder" = COALESCE("sortOrder", 0),
    "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
    "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
  WHERE
    "category" IS NULL
    OR "status" IS NULL
    OR "sortOrder" IS NULL
    OR "createdAt" IS NULL
    OR "updatedAt" IS NULL;
  UPDATE "AssistantHandoffRequest"
  SET
    "locale" = COALESCE("locale", 'zh-CN'),
    "status" = COALESCE("status", 'pending'),
    "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
    "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
  WHERE
    "locale" IS NULL
    OR "status" IS NULL
    OR "createdAt" IS NULL
    OR "updatedAt" IS NULL;
`);
db.exec(`
  DROP INDEX IF EXISTS "AgentCommissionLedger_rechargeOrderId_key";
  CREATE INDEX IF NOT EXISTS "MembershipOrder_status_updatedAt_idx" ON "MembershipOrder"("status", "updatedAt");
  CREATE INDEX IF NOT EXISTS "ContentOrder_status_updatedAt_idx" ON "ContentOrder"("status", "updatedAt");
  CREATE INDEX IF NOT EXISTS "User_referredByAgentId_createdAt_idx" ON "User"("referredByAgentId", "createdAt");
  CREATE UNIQUE INDEX IF NOT EXISTS "MembershipOrder_provider_providerOrderId_key" ON "MembershipOrder"("provider", "providerOrderId");
  CREATE UNIQUE INDEX IF NOT EXISTS "ContentOrder_provider_providerOrderId_key" ON "ContentOrder"("provider", "providerOrderId");
  CREATE UNIQUE INDEX IF NOT EXISTS "CoinAccount_userId_key" ON "CoinAccount"("userId");
  CREATE UNIQUE INDEX IF NOT EXISTS "CoinPackage_key_key" ON "CoinPackage"("key");
  CREATE UNIQUE INDEX IF NOT EXISTS "CoinRechargeOrder_orderNo_key" ON "CoinRechargeOrder"("orderNo");
  CREATE UNIQUE INDEX IF NOT EXISTS "CoinRechargeOrder_provider_providerOrderId_key" ON "CoinRechargeOrder"("provider", "providerOrderId");
  CREATE UNIQUE INDEX IF NOT EXISTS "AgentCommissionLedger_rechargeOrderId_agentId_kind_key" ON "AgentCommissionLedger"("rechargeOrderId", "agentId", "kind");
  CREATE INDEX IF NOT EXISTS "CoinAccount_balance_updatedAt_idx" ON "CoinAccount"("balance", "updatedAt");
  CREATE INDEX IF NOT EXISTS "CoinLedger_accountId_createdAt_idx" ON "CoinLedger"("accountId", "createdAt");
  CREATE INDEX IF NOT EXISTS "CoinLedger_referenceType_referenceId_idx" ON "CoinLedger"("referenceType", "referenceId");
  CREATE INDEX IF NOT EXISTS "CoinLedger_reason_createdAt_idx" ON "CoinLedger"("reason", "createdAt");
  CREATE INDEX IF NOT EXISTS "CoinPackage_status_sortOrder_idx" ON "CoinPackage"("status", "sortOrder");
  CREATE INDEX IF NOT EXISTS "CoinRechargeOrder_status_updatedAt_idx" ON "CoinRechargeOrder"("status", "updatedAt");
  CREATE INDEX IF NOT EXISTS "CoinRechargeOrder_userId_updatedAt_idx" ON "CoinRechargeOrder"("userId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "CoinRechargeOrder_packageId_updatedAt_idx" ON "CoinRechargeOrder"("packageId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_status_updatedAt_idx" ON "FinanceReconciliationIssue"("status", "updatedAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_severity_updatedAt_idx" ON "FinanceReconciliationIssue"("severity", "updatedAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_scope_updatedAt_idx" ON "FinanceReconciliationIssue"("scope", "updatedAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_rechargeOrderId_updatedAt_idx" ON "FinanceReconciliationIssue"("rechargeOrderId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_createdByUserId_updatedAt_idx" ON "FinanceReconciliationIssue"("createdByUserId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AgentCommissionLedger_agentId_status_createdAt_idx" ON "AgentCommissionLedger"("agentId", "status", "createdAt");
  CREATE INDEX IF NOT EXISTS "AgentCommissionLedger_rechargeOrderId_kind_createdAt_idx" ON "AgentCommissionLedger"("rechargeOrderId", "kind", "createdAt");
  CREATE INDEX IF NOT EXISTS "AgentCommissionLedger_userId_createdAt_idx" ON "AgentCommissionLedger"("userId", "createdAt");
  CREATE INDEX IF NOT EXISTS "AgentCommissionLedger_status_createdAt_idx" ON "AgentCommissionLedger"("status", "createdAt");
  CREATE INDEX IF NOT EXISTS "AgentWithdrawalAllocation_withdrawalId_createdAt_idx" ON "AgentWithdrawalAllocation"("withdrawalId", "createdAt");
  CREATE INDEX IF NOT EXISTS "AgentWithdrawalAllocation_commissionLedgerId_createdAt_idx" ON "AgentWithdrawalAllocation"("commissionLedgerId", "createdAt");
  CREATE INDEX IF NOT EXISTS "AgentWithdrawal_payoutBatchNo_updatedAt_idx" ON "AgentWithdrawal"("payoutBatchNo", "updatedAt");
  CREATE UNIQUE INDEX IF NOT EXISTS "PaymentCallbackEvent_eventKey_key" ON "PaymentCallbackEvent"("eventKey");
  CREATE INDEX IF NOT EXISTS "PaymentCallbackEvent_provider_createdAt_idx" ON "PaymentCallbackEvent"("provider", "createdAt");
  CREATE INDEX IF NOT EXISTS "PaymentCallbackEvent_processingStatus_lastSeenAt_idx" ON "PaymentCallbackEvent"("processingStatus", "lastSeenAt");
  CREATE INDEX IF NOT EXISTS "PaymentCallbackEvent_orderType_orderId_idx" ON "PaymentCallbackEvent"("orderType", "orderId");
  CREATE INDEX IF NOT EXISTS "AdminExportTask_status_createdAt_idx" ON "AdminExportTask"("status", "createdAt");
  CREATE INDEX IF NOT EXISTS "AdminExportTask_requestedByUserId_createdAt_idx" ON "AdminExportTask"("requestedByUserId", "createdAt");
  CREATE INDEX IF NOT EXISTS "AdminExportTask_scope_createdAt_idx" ON "AdminExportTask"("scope", "createdAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_status_createdAt_idx" ON "FinanceReconciliationIssue"("status", "createdAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_severity_createdAt_idx" ON "FinanceReconciliationIssue"("severity", "createdAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_scope_createdAt_idx" ON "FinanceReconciliationIssue"("scope", "createdAt");
  CREATE INDEX IF NOT EXISTS "FinanceReconciliationIssue_rechargeOrderId_createdAt_idx" ON "FinanceReconciliationIssue"("rechargeOrderId", "createdAt");
  CREATE UNIQUE INDEX IF NOT EXISTS "SupportKnowledgeItem_key_key" ON "SupportKnowledgeItem"("key");
  CREATE INDEX IF NOT EXISTS "AssistantConversation_sessionKey_updatedAt_idx" ON "AssistantConversation"("sessionKey", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AssistantConversation_status_updatedAt_idx" ON "AssistantConversation"("status", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AssistantConversation_userId_updatedAt_idx" ON "AssistantConversation"("userId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AssistantMessage_conversationId_createdAt_idx" ON "AssistantMessage"("conversationId", "createdAt");
  CREATE INDEX IF NOT EXISTS "SupportKnowledgeItem_status_sortOrder_idx" ON "SupportKnowledgeItem"("status", "sortOrder");
  CREATE INDEX IF NOT EXISTS "AssistantHandoffRequest_status_updatedAt_idx" ON "AssistantHandoffRequest"("status", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AssistantHandoffRequest_conversationId_updatedAt_idx" ON "AssistantHandoffRequest"("conversationId", "updatedAt");
  CREATE INDEX IF NOT EXISTS "AssistantHandoffRequest_userId_updatedAt_idx" ON "AssistantHandoffRequest"("userId", "updatedAt");
`);

db.close();

console.log(`SQLite database initialized at ${databasePath}`);
