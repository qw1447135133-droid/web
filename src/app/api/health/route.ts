import { prisma } from "@/lib/prisma";

const DEFAULT_SYNC_MAX_AGE_MINUTES = 180;
const DEFAULT_RUNNING_SYNC_MAX_AGE_MINUTES = 30;

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  const now = new Date();
  const requireFreshSync = process.env.HEALTH_REQUIRE_SYNC === "true";
  const syncMaxAgeMinutes = parsePositiveInt(
    process.env.HEALTH_SYNC_MAX_AGE_MINUTES,
    DEFAULT_SYNC_MAX_AGE_MINUTES,
  );
  const runningSyncMaxAgeMinutes = parsePositiveInt(
    process.env.HEALTH_RUNNING_SYNC_MAX_AGE_MINUTES,
    DEFAULT_RUNNING_SYNC_MAX_AGE_MINUTES,
  );
  const syncMaxAgeMs = syncMaxAgeMinutes * 60_000;
  const runningSyncMaxAgeMs = runningSyncMaxAgeMinutes * 60_000;

  try {
    const [
      latestSyncRun,
      runningSyncRun,
      syncLock,
      recentFailedCallbackCount,
      recentConflictCallbackCount,
    ] = await Promise.all([
      prisma.syncRun.findFirst({
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          source: true,
          scope: true,
          status: true,
          startedAt: true,
          finishedAt: true,
          errorText: true,
        },
      }),
      prisma.syncRun.findFirst({
        where: { status: "running" },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          startedAt: true,
        },
      }),
      prisma.syncLock.findUnique({
        where: { key: "api-sports-free:tracked-sports" },
        select: {
          key: true,
          runId: true,
          acquiredAt: true,
          expiresAt: true,
        },
      }),
      prisma.paymentCallbackEvent.count({
        where: {
          processingStatus: "failed",
          lastSeenAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.paymentCallbackEvent.count({
        where: {
          processingStatus: "conflict",
          lastSeenAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const latestSyncTimestamp = latestSyncRun?.finishedAt ?? latestSyncRun?.startedAt;
    const latestSyncAgeMs = latestSyncTimestamp ? now.getTime() - latestSyncTimestamp.getTime() : null;
    const staleLatestSync = latestSyncAgeMs !== null && latestSyncAgeMs > syncMaxAgeMs;
    const staleRunningSync =
      runningSyncRun !== null &&
      now.getTime() - runningSyncRun.startedAt.getTime() > runningSyncMaxAgeMs;
    const staleSyncLock =
      syncLock !== null && syncLock.expiresAt.getTime() < now.getTime();

    const warnings: string[] = [];
    const criticalAlerts: string[] = [];

    if (!latestSyncRun) {
      warnings.push("No sync run recorded yet.");
      if (requireFreshSync) {
        criticalAlerts.push("No sync run recorded yet.");
      }
    } else {
      if (latestSyncRun.status === "failed") {
        warnings.push("Latest sync run failed.");
        if (requireFreshSync) {
          criticalAlerts.push("Latest sync run failed.");
        }
      }

      if (staleLatestSync) {
        warnings.push(`Latest sync is older than ${syncMaxAgeMinutes} minutes.`);
        if (requireFreshSync) {
          criticalAlerts.push(`Latest sync is older than ${syncMaxAgeMinutes} minutes.`);
        }
      }
    }

    if (staleRunningSync) {
      warnings.push(`A running sync exceeds ${runningSyncMaxAgeMinutes} minutes.`);
      if (requireFreshSync) {
        criticalAlerts.push(`A running sync exceeds ${runningSyncMaxAgeMinutes} minutes.`);
      }
    }

    if (staleSyncLock) {
      warnings.push("Sync lock expired without being cleared.");
      if (requireFreshSync) {
        criticalAlerts.push("Sync lock expired without being cleared.");
      }
    }

    if (recentFailedCallbackCount > 0) {
      warnings.push(`${recentFailedCallbackCount} payment callbacks failed in the last 24h.`);
    }

    if (recentConflictCallbackCount > 0) {
      warnings.push(`${recentConflictCallbackCount} payment callbacks were marked conflict in the last 24h.`);
    }

    const status =
      criticalAlerts.length > 0 ? "degraded" : warnings.length > 0 ? "degraded" : "ok";
    const ok = criticalAlerts.length === 0;

    return Response.json(
      {
        ok,
        status,
        service: "signal-nine-web",
        environment: process.env.NODE_ENV ?? "development",
        timestamp: now.toISOString(),
        responseTimeMs: Date.now() - startedAt,
        checks: {
          database: {
            ok: true,
          },
          sync: {
            requireFreshSync,
            latestRun: latestSyncRun
              ? {
                  id: latestSyncRun.id,
                  source: latestSyncRun.source,
                  scope: latestSyncRun.scope,
                  status: latestSyncRun.status,
                  startedAt: latestSyncRun.startedAt.toISOString(),
                  finishedAt: latestSyncRun.finishedAt?.toISOString(),
                  ageSeconds:
                    latestSyncAgeMs === null ? null : Math.max(0, Math.round(latestSyncAgeMs / 1000)),
                  stale: staleLatestSync,
                  errorText: latestSyncRun.errorText ?? undefined,
                }
              : null,
            running: runningSyncRun
              ? {
                  id: runningSyncRun.id,
                  startedAt: runningSyncRun.startedAt.toISOString(),
                  stale: staleRunningSync,
                }
              : null,
            lock: syncLock
              ? {
                  key: syncLock.key,
                  runId: syncLock.runId,
                  acquiredAt: syncLock.acquiredAt.toISOString(),
                  expiresAt: syncLock.expiresAt.toISOString(),
                  stale: staleSyncLock,
                }
              : null,
            thresholds: {
              syncMaxAgeMinutes,
              runningSyncMaxAgeMinutes,
            },
          },
          callbacks: {
            failedLast24h: recentFailedCallbackCount,
            conflictLast24h: recentConflictCallbackCount,
          },
        },
        warnings,
      },
      { status: ok ? 200 : 503 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health check failed.";

    return Response.json(
      {
        ok: false,
        status: "error",
        service: "signal-nine-web",
        environment: process.env.NODE_ENV ?? "development",
        timestamp: now.toISOString(),
        responseTimeMs: Date.now() - startedAt,
        checks: {
          database: {
            ok: false,
          },
        },
        warnings: [message],
      },
      { status: 503 },
    );
  }
}
