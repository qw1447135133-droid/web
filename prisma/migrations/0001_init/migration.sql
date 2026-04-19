-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "pendingEmail" TEXT,
    "contactMethod" TEXT,
    "contactValue" TEXT,
    "preferredLocale" TEXT,
    "countryCode" TEXT,
    "membershipPlanId" TEXT,
    "membershipExpiresAt" TIMESTAMP(3),
    "referredAt" TIMESTAMP(3),
    "referredByAgentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'verify_email',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserNotification" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT,
    "message" TEXT,
    "actionHref" TEXT,
    "actionLabel" TEXT,
    "payloadJson" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserPushDevice" (
    "id" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'default',
    "status" TEXT NOT NULL DEFAULT 'active',
    "locale" TEXT,
    "platform" TEXT,
    "userAgent" TEXT,
    "pushEndpoint" TEXT,
    "pushP256dhKey" TEXT,
    "pushAuthKey" TEXT,
    "pushSubscriptionJson" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastPermissionAt" TIMESTAMP(3),
    "lastNotifiedAt" TIMESTAMP(3),
    "lastPushAttemptAt" TIMESTAMP(3),
    "lastPushSuccessAt" TIMESTAMP(3),
    "lastPushError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "UserPushDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PushCampaign" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionHref" TEXT,
    "actionLabel" TEXT,
    "audience" TEXT NOT NULL DEFAULT 'all',
    "locale" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "payloadJson" TEXT,
    "scheduledForAt" TIMESTAMP(3),
    "targetCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByDisplayName" TEXT,
    "createdByUserId" TEXT,

    CONSTRAINT "PushCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserLoginActivity" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'passwordless-demo',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserLoginActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserMembershipEvent" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "planId" TEXT,
    "previousPlanId" TEXT,
    "previousExpiresAt" TIMESTAMP(3),
    "nextExpiresAt" TIMESTAMP(3),
    "note" TEXT,
    "createdByDisplayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserMembershipEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MembershipOrder" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerOrderId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "callbackPayload" TEXT,
    "paymentReference" TEXT,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "closedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MembershipOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContentOrder" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerOrderId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "callbackPayload" TEXT,
    "paymentReference" TEXT,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "closedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ContentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CoinAccount" (
    "id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeCredited" INTEGER NOT NULL DEFAULT 0,
    "lifetimeDebited" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CoinAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CoinLedger" (
    "id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accountId" TEXT NOT NULL,

    CONSTRAINT "CoinLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CoinPackage" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoinPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CoinRechargeOrder" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "coinAmount" INTEGER NOT NULL,
    "bonusAmount" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "providerOrderId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "callbackPayload" TEXT,
    "paymentReference" TEXT,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "closedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundReason" TEXT,
    "creditedAt" TIMESTAMP(3),
    "memberNote" TEXT,
    "proofUrl" TEXT,
    "proofUploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "packageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CoinRechargeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentCallbackEvent" (
    "id" TEXT NOT NULL,
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
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentCallbackEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AgentApplication" (
    "id" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "contact" TEXT,
    "channelSummary" TEXT NOT NULL,
    "expectedMonthlyUsers" INTEGER,
    "desiredLevel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewerNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "approvedAgentId" TEXT,

    CONSTRAINT "AgentApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AgentProfile" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "inviteCode" TEXT NOT NULL,
    "inviteUrl" TEXT,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "downstreamRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "channelSummary" TEXT,
    "payoutAccount" TEXT,
    "totalReferredUsers" INTEGER NOT NULL DEFAULT 0,
    "monthlyRechargeAmount" INTEGER NOT NULL DEFAULT 0,
    "totalCommission" INTEGER NOT NULL DEFAULT 0,
    "unsettledCommission" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "parentAgentId" TEXT,

    CONSTRAINT "AgentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AgentCommissionLedger" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'direct',
    "rechargeAmount" INTEGER NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionAmount" INTEGER NOT NULL,
    "settledAmount" INTEGER NOT NULL DEFAULT 0,
    "reversedAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "agentId" TEXT NOT NULL,
    "sourceAgentId" TEXT,
    "sourceAgentName" TEXT,
    "userId" TEXT NOT NULL,
    "rechargeOrderId" TEXT NOT NULL,

    CONSTRAINT "AgentCommissionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AgentCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "incentivePolicy" TEXT,
    "targetAgentCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecruitmentLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "sourceChannel" TEXT NOT NULL,
    "desiredLevel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "note" TEXT,
    "ownerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT,
    "agentId" TEXT,

    CONSTRAINT "RecruitmentLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AgentWithdrawal" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payoutAccount" TEXT,
    "payoutChannel" TEXT,
    "payoutBatchNo" TEXT,
    "payoutReference" TEXT,
    "payoutOperator" TEXT,
    "payoutRequestedAt" TIMESTAMP(3),
    "callbackStatus" TEXT,
    "callbackPayload" TEXT,
    "callbackReceivedAt" TIMESTAMP(3),
    "note" TEXT,
    "proofUrl" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT NOT NULL,

    CONSTRAINT "AgentWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AgentWithdrawalAllocation" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawalId" TEXT NOT NULL,
    "commissionLedgerId" TEXT NOT NULL,

    CONSTRAINT "AgentWithdrawalAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminRolePolicy" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT,
    "canAccessAdminConsole" BOOLEAN NOT NULL DEFAULT false,
    "canManageContent" BOOLEAN NOT NULL DEFAULT false,
    "canManageFinance" BOOLEAN NOT NULL DEFAULT false,
    "canManageAgents" BOOLEAN NOT NULL DEFAULT false,
    "canManageSystem" BOOLEAN NOT NULL DEFAULT false,
    "canViewReports" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminRolePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorDisplayName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "detail" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemAlertChannel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "severityFilter" TEXT NOT NULL DEFAULT 'warn,error',
    "status" TEXT NOT NULL DEFAULT 'active',
    "note" TEXT,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemAlertChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemAlertEvent" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warn',
    "status" TEXT NOT NULL DEFAULT 'open',
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "channelId" TEXT,

    CONSTRAINT "SystemAlertEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemParameter" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminExportTask" (
    "id" TEXT NOT NULL,
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
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestedByUserId" TEXT,

    CONSTRAINT "AdminExportTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminReportDailyFact" (
    "id" TEXT NOT NULL,
    "metricDate" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'overview',
    "metricKey" TEXT NOT NULL,
    "dimensionKey" TEXT NOT NULL DEFAULT '',
    "countValue" INTEGER NOT NULL DEFAULT 0,
    "amountValue" INTEGER NOT NULL DEFAULT 0,
    "extraJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminReportDailyFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FinanceReconciliationIssue" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'coin-recharge',
    "issueType" TEXT NOT NULL DEFAULT 'manual_review',
    "status" TEXT NOT NULL DEFAULT 'open',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "workflowStage" TEXT NOT NULL DEFAULT 'triage',
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "reasonCode" TEXT,
    "paymentReference" TEXT,
    "amount" INTEGER,
    "sourceStatus" TEXT,
    "resolutionNote" TEXT,
    "assignedToDisplayName" TEXT,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastRemindedAt" TIMESTAMP(3),
    "lastReminderNote" TEXT,
    "createdByDisplayName" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rechargeOrderId" TEXT,
    "membershipOrderId" TEXT,
    "contentOrderId" TEXT,
    "createdByUserId" TEXT,

    CONSTRAINT "FinanceReconciliationIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."League" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'nowscore',
    "sourceKey" TEXT,
    "sourcePayload" TEXT,
    "sport" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "region" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "adminLockedFields" TEXT,
    "adminOverrideJson" TEXT,
    "adminNote" TEXT,
    "adminEditedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Team" (
    "id" TEXT NOT NULL,
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
    "lastSyncedAt" TIMESTAMP(3),
    "leagueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Match" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'nowscore',
    "sourceKey" TEXT,
    "sourcePayload" TEXT,
    "sport" TEXT NOT NULL,
    "slug" TEXT,
    "status" TEXT NOT NULL,
    "kickoff" TIMESTAMP(3) NOT NULL,
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
    "adminVisible" BOOLEAN NOT NULL DEFAULT true,
    "adminLockedFields" TEXT,
    "adminOverrideJson" TEXT,
    "adminNote" TEXT,
    "adminEditedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OddsSnapshot" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'nowscore',
    "sourceKey" TEXT,
    "sourcePayload" TEXT,
    "bookmaker" TEXT,
    "market" TEXT NOT NULL DEFAULT 'main',
    "home" DOUBLE PRECISION,
    "draw" DOUBLE PRECISION,
    "away" DOUBLE PRECISION,
    "spread" TEXT,
    "total" TEXT,
    "movement" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchId" TEXT NOT NULL,

    CONSTRAINT "OddsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StandingSnapshot" (
    "id" TEXT NOT NULL,
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
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT,

    CONSTRAINT "StandingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScheduleSnapshot" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'nowscore',
    "sourcePayload" TEXT,
    "labelDate" TEXT NOT NULL,
    "fixture" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "sortDate" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leagueId" TEXT NOT NULL,
    "matchId" TEXT,

    CONSTRAINT "ScheduleSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HeadToHeadSnapshot" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'nowscore',
    "sourcePayload" TEXT,
    "season" TEXT NOT NULL,
    "fixture" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leagueId" TEXT NOT NULL,

    CONSTRAINT "HeadToHeadSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuthorTeam" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuthorApplication" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'web',
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contactMethod" TEXT,
    "contactValue" TEXT,
    "focus" TEXT NOT NULL,
    "badge" TEXT,
    "bio" TEXT NOT NULL,
    "sampleLinks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByDisplayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "approvedAuthorId" TEXT,

    CONSTRAINT "AuthorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PredictionRecord" (
    "id" TEXT NOT NULL,
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
    "publishedAt" TIMESTAMP(3),
    "sourcePayload" TEXT,
    "matchId" TEXT,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ArticlePlan" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sourceKey" TEXT,
    "slug" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "matchId" TEXT,
    "title" TEXT NOT NULL,
    "leagueLabel" TEXT NOT NULL,
    "kickoff" TIMESTAMP(3) NOT NULL,
    "teaser" TEXT NOT NULL,
    "marketSummary" TEXT NOT NULL,
    "previewText" TEXT,
    "fullAnalysisText" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "isHot" BOOLEAN NOT NULL DEFAULT false,
    "performance" TEXT NOT NULL,
    "tagsText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "leagueId" TEXT,
    "authorId" TEXT NOT NULL,
    "titleZhCn" TEXT,
    "titleZhTw" TEXT,
    "titleEn" TEXT,
    "titleTh" TEXT,
    "titleVi" TEXT,
    "contentZhCn" TEXT,
    "contentZhTw" TEXT,
    "contentEn" TEXT,
    "contentTh" TEXT,
    "contentVi" TEXT,
    "seoDescription" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticlePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HomepageFeaturedMatchSlot" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "matchRef" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "matchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageFeaturedMatchSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HomepageModule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "eyebrow" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "leagueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HomepageBanner" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'sunrise',
    "titleZhCn" TEXT NOT NULL,
    "titleZhTw" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleTh" TEXT NOT NULL,
    "titleVi" TEXT NOT NULL,
    "titleHi" TEXT NOT NULL,
    "subtitleZhCn" TEXT NOT NULL,
    "subtitleZhTw" TEXT NOT NULL,
    "subtitleEn" TEXT NOT NULL,
    "subtitleTh" TEXT NOT NULL,
    "subtitleVi" TEXT NOT NULL,
    "subtitleHi" TEXT NOT NULL,
    "descriptionZhCn" TEXT NOT NULL,
    "descriptionZhTw" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionTh" TEXT NOT NULL,
    "descriptionVi" TEXT NOT NULL,
    "descriptionHi" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "ctaLabelZhCn" TEXT NOT NULL,
    "ctaLabelZhTw" TEXT NOT NULL,
    "ctaLabelEn" TEXT NOT NULL,
    "ctaLabelTh" TEXT NOT NULL,
    "ctaLabelVi" TEXT NOT NULL,
    "ctaLabelHi" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "impressionCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "primaryImpressionCount" INTEGER NOT NULL DEFAULT 0,
    "primaryClickCount" INTEGER NOT NULL DEFAULT 0,
    "secondaryImpressionCount" INTEGER NOT NULL DEFAULT 0,
    "secondaryClickCount" INTEGER NOT NULL DEFAULT 0,
    "lastImpressionAt" TIMESTAMP(3),
    "lastClickAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HomepageBannerDailyStat" (
    "id" TEXT NOT NULL,
    "metricDate" TIMESTAMP(3) NOT NULL,
    "impressionCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bannerId" TEXT NOT NULL,

    CONSTRAINT "HomepageBannerDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteAnnouncement" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'info',
    "titleZhCn" TEXT NOT NULL,
    "titleZhTw" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleTh" TEXT NOT NULL,
    "titleVi" TEXT NOT NULL,
    "titleHi" TEXT NOT NULL,
    "messageZhCn" TEXT NOT NULL,
    "messageZhTw" TEXT NOT NULL,
    "messageEn" TEXT NOT NULL,
    "messageTh" TEXT NOT NULL,
    "messageVi" TEXT NOT NULL,
    "messageHi" TEXT NOT NULL,
    "href" TEXT,
    "ctaLabelZhCn" TEXT,
    "ctaLabelZhTw" TEXT,
    "ctaLabelEn" TEXT,
    "ctaLabelTh" TEXT,
    "ctaLabelVi" TEXT,
    "ctaLabelHi" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteAd" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'image',
    "theme" TEXT NOT NULL DEFAULT 'neutral',
    "titleZhCn" TEXT NOT NULL,
    "titleZhTw" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleTh" TEXT NOT NULL,
    "titleVi" TEXT NOT NULL,
    "titleHi" TEXT NOT NULL,
    "descriptionZhCn" TEXT NOT NULL,
    "descriptionZhTw" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionTh" TEXT NOT NULL,
    "descriptionVi" TEXT NOT NULL,
    "descriptionHi" TEXT NOT NULL,
    "ctaLabelZhCn" TEXT NOT NULL,
    "ctaLabelZhTw" TEXT NOT NULL,
    "ctaLabelEn" TEXT NOT NULL,
    "ctaLabelTh" TEXT NOT NULL,
    "ctaLabelVi" TEXT NOT NULL,
    "ctaLabelHi" TEXT NOT NULL,
    "href" TEXT,
    "imageUrl" TEXT,
    "htmlSnippet" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "impressionCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "lastImpressionAt" TIMESTAMP(3),
    "lastClickAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteAd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteAdDailyStat" (
    "id" TEXT NOT NULL,
    "metricDate" TIMESTAMP(3) NOT NULL,
    "impressionCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adId" TEXT NOT NULL,

    CONSTRAINT "SiteAdDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SyncRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'nowscore',
    "scope" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "triggerSource" TEXT NOT NULL DEFAULT 'manual-admin',
    "requestedByUserId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "summaryJson" TEXT,
    "errorText" TEXT,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SyncLock" (
    "key" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "owner" TEXT,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncLock_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."AssistantConversation" (
    "id" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'zh-CN',
    "title" TEXT,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "handoffRequestedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "AssistantConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssistantMessage" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "linksJson" TEXT,
    "provider" TEXT,
    "model" TEXT,
    "finishReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversationId" TEXT NOT NULL,

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupportKnowledgeItem" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportKnowledgeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssistantHandoffRequest" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'zh-CN',
    "contactName" TEXT,
    "contactMethod" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "AssistantHandoffRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_referredByAgentId_createdAt_idx" ON "public"."User"("referredByAgentId", "createdAt");

-- CreateIndex
CREATE INDEX "User_preferredLocale_createdAt_idx" ON "public"."User"("preferredLocale", "createdAt");

-- CreateIndex
CREATE INDEX "User_countryCode_createdAt_idx" ON "public"."User"("countryCode", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "public"."Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "public"."EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx" ON "public"."EmailVerificationToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_purpose_expiresAt_idx" ON "public"."EmailVerificationToken"("purpose", "expiresAt");

-- CreateIndex
CREATE INDEX "UserNotification_userId_createdAt_idx" ON "public"."UserNotification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserNotification_userId_readAt_createdAt_idx" ON "public"."UserNotification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "UserNotification_category_createdAt_idx" ON "public"."UserNotification"("category", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserPushDevice_deviceKey_key" ON "public"."UserPushDevice"("deviceKey");

-- CreateIndex
CREATE INDEX "UserPushDevice_userId_status_updatedAt_idx" ON "public"."UserPushDevice"("userId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "UserPushDevice_permission_status_updatedAt_idx" ON "public"."UserPushDevice"("permission", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "UserPushDevice_locale_updatedAt_idx" ON "public"."UserPushDevice"("locale", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushCampaign_key_key" ON "public"."PushCampaign"("key");

-- CreateIndex
CREATE INDEX "PushCampaign_status_createdAt_idx" ON "public"."PushCampaign"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PushCampaign_status_scheduledForAt_idx" ON "public"."PushCampaign"("status", "scheduledForAt");

-- CreateIndex
CREATE INDEX "PushCampaign_audience_createdAt_idx" ON "public"."PushCampaign"("audience", "createdAt");

-- CreateIndex
CREATE INDEX "PushCampaign_createdByUserId_createdAt_idx" ON "public"."PushCampaign"("createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "UserLoginActivity_userId_createdAt_idx" ON "public"."UserLoginActivity"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserLoginActivity_source_createdAt_idx" ON "public"."UserLoginActivity"("source", "createdAt");

-- CreateIndex
CREATE INDEX "UserMembershipEvent_userId_createdAt_idx" ON "public"."UserMembershipEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserMembershipEvent_action_createdAt_idx" ON "public"."UserMembershipEvent"("action", "createdAt");

-- CreateIndex
CREATE INDEX "MembershipOrder_status_updatedAt_idx" ON "public"."MembershipOrder"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipOrder_provider_providerOrderId_key" ON "public"."MembershipOrder"("provider", "providerOrderId");

-- CreateIndex
CREATE INDEX "ContentOrder_status_updatedAt_idx" ON "public"."ContentOrder"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentOrder_provider_providerOrderId_key" ON "public"."ContentOrder"("provider", "providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "CoinAccount_userId_key" ON "public"."CoinAccount"("userId");

-- CreateIndex
CREATE INDEX "CoinAccount_balance_updatedAt_idx" ON "public"."CoinAccount"("balance", "updatedAt");

-- CreateIndex
CREATE INDEX "CoinLedger_accountId_createdAt_idx" ON "public"."CoinLedger"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "CoinLedger_referenceType_referenceId_idx" ON "public"."CoinLedger"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "CoinLedger_reason_createdAt_idx" ON "public"."CoinLedger"("reason", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CoinPackage_key_key" ON "public"."CoinPackage"("key");

-- CreateIndex
CREATE INDEX "CoinPackage_status_sortOrder_idx" ON "public"."CoinPackage"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CoinRechargeOrder_orderNo_key" ON "public"."CoinRechargeOrder"("orderNo");

-- CreateIndex
CREATE INDEX "CoinRechargeOrder_status_updatedAt_idx" ON "public"."CoinRechargeOrder"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "CoinRechargeOrder_userId_updatedAt_idx" ON "public"."CoinRechargeOrder"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "CoinRechargeOrder_packageId_updatedAt_idx" ON "public"."CoinRechargeOrder"("packageId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CoinRechargeOrder_provider_providerOrderId_key" ON "public"."CoinRechargeOrder"("provider", "providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCallbackEvent_eventKey_key" ON "public"."PaymentCallbackEvent"("eventKey");

-- CreateIndex
CREATE INDEX "PaymentCallbackEvent_provider_createdAt_idx" ON "public"."PaymentCallbackEvent"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentCallbackEvent_processingStatus_lastSeenAt_idx" ON "public"."PaymentCallbackEvent"("processingStatus", "lastSeenAt");

-- CreateIndex
CREATE INDEX "PaymentCallbackEvent_orderType_orderId_idx" ON "public"."PaymentCallbackEvent"("orderType", "orderId");

-- CreateIndex
CREATE INDEX "AgentApplication_status_updatedAt_idx" ON "public"."AgentApplication"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentApplication_userId_updatedAt_idx" ON "public"."AgentApplication"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentProfile_inviteCode_key" ON "public"."AgentProfile"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "AgentProfile_userId_key" ON "public"."AgentProfile"("userId");

-- CreateIndex
CREATE INDEX "AgentProfile_status_level_updatedAt_idx" ON "public"."AgentProfile"("status", "level", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentProfile_parentAgentId_updatedAt_idx" ON "public"."AgentProfile"("parentAgentId", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentCommissionLedger_agentId_status_createdAt_idx" ON "public"."AgentCommissionLedger"("agentId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AgentCommissionLedger_rechargeOrderId_kind_createdAt_idx" ON "public"."AgentCommissionLedger"("rechargeOrderId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "AgentCommissionLedger_userId_createdAt_idx" ON "public"."AgentCommissionLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentCommissionLedger_status_createdAt_idx" ON "public"."AgentCommissionLedger"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentCommissionLedger_rechargeOrderId_agentId_kind_key" ON "public"."AgentCommissionLedger"("rechargeOrderId", "agentId", "kind");

-- CreateIndex
CREATE INDEX "AgentCampaign_status_updatedAt_idx" ON "public"."AgentCampaign"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "RecruitmentLead_status_updatedAt_idx" ON "public"."RecruitmentLead"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "RecruitmentLead_campaignId_updatedAt_idx" ON "public"."RecruitmentLead"("campaignId", "updatedAt");

-- CreateIndex
CREATE INDEX "RecruitmentLead_agentId_updatedAt_idx" ON "public"."RecruitmentLead"("agentId", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentWithdrawal_status_updatedAt_idx" ON "public"."AgentWithdrawal"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentWithdrawal_agentId_updatedAt_idx" ON "public"."AgentWithdrawal"("agentId", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentWithdrawal_payoutBatchNo_updatedAt_idx" ON "public"."AgentWithdrawal"("payoutBatchNo", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentWithdrawalAllocation_withdrawalId_createdAt_idx" ON "public"."AgentWithdrawalAllocation"("withdrawalId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentWithdrawalAllocation_commissionLedgerId_createdAt_idx" ON "public"."AgentWithdrawalAllocation"("commissionLedgerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminRolePolicy_role_key" ON "public"."AdminRolePolicy"("role");

-- CreateIndex
CREATE INDEX "AdminAuditLog_scope_createdAt_idx" ON "public"."AdminAuditLog"("scope", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_status_createdAt_idx" ON "public"."AdminAuditLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorUserId_createdAt_idx" ON "public"."AdminAuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SystemAlertChannel_status_updatedAt_idx" ON "public"."SystemAlertChannel"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemAlertEvent_eventKey_key" ON "public"."SystemAlertEvent"("eventKey");

-- CreateIndex
CREATE INDEX "SystemAlertEvent_status_createdAt_idx" ON "public"."SystemAlertEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SystemAlertEvent_severity_createdAt_idx" ON "public"."SystemAlertEvent"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "SystemAlertEvent_channelId_createdAt_idx" ON "public"."SystemAlertEvent"("channelId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemParameter_key_key" ON "public"."SystemParameter"("key");

-- CreateIndex
CREATE INDEX "SystemParameter_category_updatedAt_idx" ON "public"."SystemParameter"("category", "updatedAt");

-- CreateIndex
CREATE INDEX "AdminExportTask_status_createdAt_idx" ON "public"."AdminExportTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AdminExportTask_requestedByUserId_createdAt_idx" ON "public"."AdminExportTask"("requestedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminExportTask_scope_createdAt_idx" ON "public"."AdminExportTask"("scope", "createdAt");

-- CreateIndex
CREATE INDEX "AdminReportDailyFact_metricDate_idx" ON "public"."AdminReportDailyFact"("metricDate");

-- CreateIndex
CREATE INDEX "AdminReportDailyFact_scope_metricKey_metricDate_idx" ON "public"."AdminReportDailyFact"("scope", "metricKey", "metricDate");

-- CreateIndex
CREATE UNIQUE INDEX "AdminReportDailyFact_metricDate_scope_metricKey_dimensionKe_key" ON "public"."AdminReportDailyFact"("metricDate", "scope", "metricKey", "dimensionKey");

-- CreateIndex
CREATE INDEX "FinanceReconciliationIssue_status_updatedAt_idx" ON "public"."FinanceReconciliationIssue"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "FinanceReconciliationIssue_severity_updatedAt_idx" ON "public"."FinanceReconciliationIssue"("severity", "updatedAt");

-- CreateIndex
CREATE INDEX "FinanceReconciliationIssue_scope_updatedAt_idx" ON "public"."FinanceReconciliationIssue"("scope", "updatedAt");

-- CreateIndex
CREATE INDEX "FinanceReconciliationIssue_rechargeOrderId_updatedAt_idx" ON "public"."FinanceReconciliationIssue"("rechargeOrderId", "updatedAt");

-- CreateIndex
CREATE INDEX "FinanceReconciliationIssue_membershipOrderId_updatedAt_idx" ON "public"."FinanceReconciliationIssue"("membershipOrderId", "updatedAt");

-- CreateIndex
CREATE INDEX "FinanceReconciliationIssue_contentOrderId_updatedAt_idx" ON "public"."FinanceReconciliationIssue"("contentOrderId", "updatedAt");

-- CreateIndex
CREATE INDEX "FinanceReconciliationIssue_createdByUserId_updatedAt_idx" ON "public"."FinanceReconciliationIssue"("createdByUserId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "League_slug_key" ON "public"."League"("slug");

-- CreateIndex
CREATE INDEX "League_sport_featured_sortOrder_idx" ON "public"."League"("sport", "featured", "sortOrder");

-- CreateIndex
CREATE INDEX "League_sport_status_sortOrder_idx" ON "public"."League"("sport", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "League_updatedAt_adminEditedAt_idx" ON "public"."League"("updatedAt", "adminEditedAt");

-- CreateIndex
CREATE UNIQUE INDEX "League_source_sourceKey_key" ON "public"."League"("source", "sourceKey");

-- CreateIndex
CREATE INDEX "Team_leagueId_ranking_idx" ON "public"."Team"("leagueId", "ranking");

-- CreateIndex
CREATE UNIQUE INDEX "Team_leagueId_slug_key" ON "public"."Team"("leagueId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Team_source_sourceKey_key" ON "public"."Team"("source", "sourceKey");

-- CreateIndex
CREATE INDEX "Match_sport_kickoff_idx" ON "public"."Match"("sport", "kickoff");

-- CreateIndex
CREATE INDEX "Match_leagueId_kickoff_idx" ON "public"."Match"("leagueId", "kickoff");

-- CreateIndex
CREATE INDEX "Match_status_kickoff_idx" ON "public"."Match"("status", "kickoff");

-- CreateIndex
CREATE INDEX "Match_adminVisible_kickoff_idx" ON "public"."Match"("adminVisible", "kickoff");

-- CreateIndex
CREATE INDEX "Match_updatedAt_adminEditedAt_idx" ON "public"."Match"("updatedAt", "adminEditedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Match_source_sourceKey_key" ON "public"."Match"("source", "sourceKey");

-- CreateIndex
CREATE INDEX "OddsSnapshot_matchId_capturedAt_idx" ON "public"."OddsSnapshot"("matchId", "capturedAt");

-- CreateIndex
CREATE INDEX "StandingSnapshot_leagueId_capturedAt_rank_idx" ON "public"."StandingSnapshot"("leagueId", "capturedAt", "rank");

-- CreateIndex
CREATE INDEX "StandingSnapshot_teamId_capturedAt_idx" ON "public"."StandingSnapshot"("teamId", "capturedAt");

-- CreateIndex
CREATE INDEX "ScheduleSnapshot_leagueId_capturedAt_idx" ON "public"."ScheduleSnapshot"("leagueId", "capturedAt");

-- CreateIndex
CREATE INDEX "ScheduleSnapshot_matchId_idx" ON "public"."ScheduleSnapshot"("matchId");

-- CreateIndex
CREATE INDEX "HeadToHeadSnapshot_leagueId_capturedAt_sortOrder_idx" ON "public"."HeadToHeadSnapshot"("leagueId", "capturedAt", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorTeam_slug_key" ON "public"."AuthorTeam"("slug");

-- CreateIndex
CREATE INDEX "AuthorTeam_status_updatedAt_idx" ON "public"."AuthorTeam"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorTeam_source_sourceKey_key" ON "public"."AuthorTeam"("source", "sourceKey");

-- CreateIndex
CREATE INDEX "AuthorApplication_status_updatedAt_idx" ON "public"."AuthorApplication"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "AuthorApplication_email_createdAt_idx" ON "public"."AuthorApplication"("email", "createdAt");

-- CreateIndex
CREATE INDEX "AuthorApplication_userId_createdAt_idx" ON "public"."AuthorApplication"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuthorApplication_approvedAuthorId_createdAt_idx" ON "public"."AuthorApplication"("approvedAuthorId", "createdAt");

-- CreateIndex
CREATE INDEX "PredictionRecord_sport_createdAt_idx" ON "public"."PredictionRecord"("sport", "createdAt");

-- CreateIndex
CREATE INDEX "PredictionRecord_matchId_idx" ON "public"."PredictionRecord"("matchId");

-- CreateIndex
CREATE INDEX "PredictionRecord_authorId_idx" ON "public"."PredictionRecord"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionRecord_source_sourceKey_key" ON "public"."PredictionRecord"("source", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "ArticlePlan_slug_key" ON "public"."ArticlePlan"("slug");

-- CreateIndex
CREATE INDEX "ArticlePlan_sport_status_kickoff_idx" ON "public"."ArticlePlan"("sport", "status", "kickoff");

-- CreateIndex
CREATE INDEX "ArticlePlan_authorId_status_idx" ON "public"."ArticlePlan"("authorId", "status");

-- CreateIndex
CREATE INDEX "ArticlePlan_matchId_idx" ON "public"."ArticlePlan"("matchId");

-- CreateIndex
CREATE INDEX "ArticlePlan_status_publishedAt_idx" ON "public"."ArticlePlan"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArticlePlan_source_sourceKey_key" ON "public"."ArticlePlan"("source", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "HomepageFeaturedMatchSlot_key_key" ON "public"."HomepageFeaturedMatchSlot"("key");

-- CreateIndex
CREATE INDEX "HomepageFeaturedMatchSlot_status_sortOrder_idx" ON "public"."HomepageFeaturedMatchSlot"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "HomepageFeaturedMatchSlot_matchId_idx" ON "public"."HomepageFeaturedMatchSlot"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "HomepageModule_key_key" ON "public"."HomepageModule"("key");

-- CreateIndex
CREATE INDEX "HomepageModule_status_sortOrder_idx" ON "public"."HomepageModule"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "HomepageBanner_key_key" ON "public"."HomepageBanner"("key");

-- CreateIndex
CREATE INDEX "HomepageBanner_status_sortOrder_idx" ON "public"."HomepageBanner"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "HomepageBanner_startsAt_endsAt_idx" ON "public"."HomepageBanner"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "HomepageBannerDailyStat_metricDate_idx" ON "public"."HomepageBannerDailyStat"("metricDate");

-- CreateIndex
CREATE UNIQUE INDEX "HomepageBannerDailyStat_bannerId_metricDate_key" ON "public"."HomepageBannerDailyStat"("bannerId", "metricDate");

-- CreateIndex
CREATE UNIQUE INDEX "SiteAnnouncement_key_key" ON "public"."SiteAnnouncement"("key");

-- CreateIndex
CREATE INDEX "SiteAnnouncement_status_sortOrder_idx" ON "public"."SiteAnnouncement"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "SiteAnnouncement_startsAt_endsAt_idx" ON "public"."SiteAnnouncement"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "SiteAd_key_key" ON "public"."SiteAd"("key");

-- CreateIndex
CREATE INDEX "SiteAd_placement_status_sortOrder_idx" ON "public"."SiteAd"("placement", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "SiteAd_startsAt_endsAt_idx" ON "public"."SiteAd"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "SiteAdDailyStat_metricDate_idx" ON "public"."SiteAdDailyStat"("metricDate");

-- CreateIndex
CREATE UNIQUE INDEX "SiteAdDailyStat_adId_metricDate_key" ON "public"."SiteAdDailyStat"("adId", "metricDate");

-- CreateIndex
CREATE INDEX "SyncRun_source_startedAt_idx" ON "public"."SyncRun"("source", "startedAt");

-- CreateIndex
CREATE INDEX "SyncRun_status_startedAt_idx" ON "public"."SyncRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "SyncLock_expiresAt_idx" ON "public"."SyncLock"("expiresAt");

-- CreateIndex
CREATE INDEX "AssistantConversation_sessionKey_updatedAt_idx" ON "public"."AssistantConversation"("sessionKey", "updatedAt");

-- CreateIndex
CREATE INDEX "AssistantConversation_status_updatedAt_idx" ON "public"."AssistantConversation"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "AssistantConversation_userId_updatedAt_idx" ON "public"."AssistantConversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "AssistantMessage_conversationId_createdAt_idx" ON "public"."AssistantMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportKnowledgeItem_key_key" ON "public"."SupportKnowledgeItem"("key");

-- CreateIndex
CREATE INDEX "SupportKnowledgeItem_status_sortOrder_idx" ON "public"."SupportKnowledgeItem"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "AssistantHandoffRequest_status_updatedAt_idx" ON "public"."AssistantHandoffRequest"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "AssistantHandoffRequest_conversationId_updatedAt_idx" ON "public"."AssistantHandoffRequest"("conversationId", "updatedAt");

-- CreateIndex
CREATE INDEX "AssistantHandoffRequest_userId_updatedAt_idx" ON "public"."AssistantHandoffRequest"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_referredByAgentId_fkey" FOREIGN KEY ("referredByAgentId") REFERENCES "public"."AgentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPushDevice" ADD CONSTRAINT "UserPushDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PushCampaign" ADD CONSTRAINT "PushCampaign_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserLoginActivity" ADD CONSTRAINT "UserLoginActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserMembershipEvent" ADD CONSTRAINT "UserMembershipEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MembershipOrder" ADD CONSTRAINT "MembershipOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContentOrder" ADD CONSTRAINT "ContentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoinAccount" ADD CONSTRAINT "CoinAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoinLedger" ADD CONSTRAINT "CoinLedger_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."CoinAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoinRechargeOrder" ADD CONSTRAINT "CoinRechargeOrder_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."CoinPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoinRechargeOrder" ADD CONSTRAINT "CoinRechargeOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgentApplication" ADD CONSTRAINT "AgentApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgentApplication" ADD CONSTRAINT "AgentApplication_approvedAgentId_fkey" FOREIGN KEY ("approvedAgentId") REFERENCES "public"."AgentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgentProfile" ADD CONSTRAINT "AgentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgentProfile" ADD CONSTRAINT "AgentProfile_parentAgentId_fkey" FOREIGN KEY ("parentAgentId") REFERENCES "public"."AgentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgentCommissionLedger" ADD CONSTRAINT "AgentCommissionLedger_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgentCommissionLedger" ADD CONSTRAINT "AgentCommissionLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgentCommissionLedger" ADD CONSTRAINT "AgentCommissionLedger_rechargeOrderId_fkey" FOREIGN KEY ("rechargeOrderId") REFERENCES "public"."CoinRechargeOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecruitmentLead" ADD CONSTRAINT "RecruitmentLead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."AgentCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecruitmentLead" ADD CONSTRAINT "RecruitmentLead_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."AgentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgentWithdrawal" ADD CONSTRAINT "AgentWithdrawal_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgentWithdrawalAllocation" ADD CONSTRAINT "AgentWithdrawalAllocation_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "public"."AgentWithdrawal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgentWithdrawalAllocation" ADD CONSTRAINT "AgentWithdrawalAllocation_commissionLedgerId_fkey" FOREIGN KEY ("commissionLedgerId") REFERENCES "public"."AgentCommissionLedger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SystemAlertEvent" ADD CONSTRAINT "SystemAlertEvent_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "public"."SystemAlertChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminExportTask" ADD CONSTRAINT "AdminExportTask_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinanceReconciliationIssue" ADD CONSTRAINT "FinanceReconciliationIssue_rechargeOrderId_fkey" FOREIGN KEY ("rechargeOrderId") REFERENCES "public"."CoinRechargeOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinanceReconciliationIssue" ADD CONSTRAINT "FinanceReconciliationIssue_membershipOrderId_fkey" FOREIGN KEY ("membershipOrderId") REFERENCES "public"."MembershipOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinanceReconciliationIssue" ADD CONSTRAINT "FinanceReconciliationIssue_contentOrderId_fkey" FOREIGN KEY ("contentOrderId") REFERENCES "public"."ContentOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinanceReconciliationIssue" ADD CONSTRAINT "FinanceReconciliationIssue_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Team" ADD CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "public"."Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "public"."Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OddsSnapshot" ADD CONSTRAINT "OddsSnapshot_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StandingSnapshot" ADD CONSTRAINT "StandingSnapshot_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StandingSnapshot" ADD CONSTRAINT "StandingSnapshot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScheduleSnapshot" ADD CONSTRAINT "ScheduleSnapshot_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScheduleSnapshot" ADD CONSTRAINT "ScheduleSnapshot_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HeadToHeadSnapshot" ADD CONSTRAINT "HeadToHeadSnapshot_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuthorApplication" ADD CONSTRAINT "AuthorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuthorApplication" ADD CONSTRAINT "AuthorApplication_approvedAuthorId_fkey" FOREIGN KEY ("approvedAuthorId") REFERENCES "public"."AuthorTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PredictionRecord" ADD CONSTRAINT "PredictionRecord_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PredictionRecord" ADD CONSTRAINT "PredictionRecord_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."AuthorTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticlePlan" ADD CONSTRAINT "ArticlePlan_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArticlePlan" ADD CONSTRAINT "ArticlePlan_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."AuthorTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HomepageFeaturedMatchSlot" ADD CONSTRAINT "HomepageFeaturedMatchSlot_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HomepageModule" ADD CONSTRAINT "HomepageModule_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HomepageBannerDailyStat" ADD CONSTRAINT "HomepageBannerDailyStat_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "public"."HomepageBanner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SiteAdDailyStat" ADD CONSTRAINT "SiteAdDailyStat_adId_fkey" FOREIGN KEY ("adId") REFERENCES "public"."SiteAd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantConversation" ADD CONSTRAINT "AssistantConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantMessage" ADD CONSTRAINT "AssistantMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantHandoffRequest" ADD CONSTRAINT "AssistantHandoffRequest_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssistantHandoffRequest" ADD CONSTRAINT "AssistantHandoffRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

