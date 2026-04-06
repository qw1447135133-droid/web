import { NextRequest, NextResponse } from "next/server";
import {
  clearAdminLeagueOverride,
  clearAdminMatchOverride,
  deleteAdminLeague,
  deleteAdminMatch,
  moveAdminLeague,
  saveAdminLeague,
  saveAdminMatch,
  toggleAdminLeagueFeatured,
  toggleAdminLeagueStatus,
  toggleAdminMatchVisibility,
} from "@/lib/admin-events";
import { prisma } from "@/lib/prisma";
import { recordAdminAuditLog } from "@/lib/admin-system";
import { getCurrentUserRecord, getSessionContext } from "@/lib/session";

function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }

  return request.headers.get("x-real-ip") ?? undefined;
}

function formatAuditDetail(
  entries: Array<[string, string | number | boolean | undefined | null]>,
) {
  return entries
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => `${key}=${String(value).trim()}`)
    .join(" | ");
}

function parseLockedFieldSummary(value?: string | null) {
  if (!value) {
    return "none";
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      const normalized = parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      return normalized.length > 0 ? normalized.join(",") : "none";
    }
  } catch {
    // Fall back to legacy parsing.
  }

  const normalized = String(value)
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized.join(",") : "none";
}

function redirectToEvents(
  request: NextRequest,
  key: "saved" | "error",
  value: string,
  extras?: Record<string, string>,
) {
  const url = new URL("/admin?tab=events", request.url);
  url.searchParams.set(key, value);

  if (extras) {
    for (const [extraKey, extraValue] of Object.entries(extras)) {
      if (extraValue) {
        url.searchParams.set(extraKey, extraValue);
      }
    }
  }

  return NextResponse.redirect(url);
}

function mapEventsErrorCode(error: unknown) {
  if (!(error instanceof Error)) {
    return undefined;
  }

  if (error.message === "LEAGUE_DELETE_FORBIDDEN") {
    return "event-league-delete-forbidden";
  }

  if (error.message === "MATCH_DELETE_FORBIDDEN") {
    return "event-match-delete-forbidden";
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  const { entitlements, session } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    return NextResponse.redirect(new URL("/login?next=%2Fadmin%3Ftab%3Devents", request.url));
  }

  if (!entitlements.canAccessAdminConsole || !entitlements.canManageContent) {
    return NextResponse.redirect(new URL("/member", request.url));
  }

  const currentUser = await getCurrentUserRecord();
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const ipAddress = getRequestIp(request);

  try {
    if (intent === "save-league") {
      const result = await saveAdminLeague(formData);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "save-admin-league",
        scope: "events.leagues",
        targetType: "league",
        targetId: result.id,
        detail: formatAuditDetail([
          ["op", "save-league"],
          ["sport", String(formData.get("sport") || "football").trim() || "football"],
          ["name", String(formData.get("name") || "").trim()],
          ["displayName", String(formData.get("displayName") || "").trim()],
          ["slug", String(formData.get("slug") || "").trim()],
          ["region", String(formData.get("region") || "").trim()],
          ["season", String(formData.get("season") || "").trim()],
          ["status", String(formData.get("status") || "active").trim() || "active"],
          ["featured", String(formData.get("featured") || "").trim() === "on"],
          ["sortOrder", String(formData.get("sortOrder") || "").trim()],
        ]),
        ipAddress,
      });
      return redirectToEvents(request, "saved", "event-league", { editLeague: result.id });
    }

    if (intent === "toggle-league-status") {
      const id = String(formData.get("id") || "").trim();
      const currentLeague = await prisma.league.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          displayName: true,
          status: true,
        },
      });
      await toggleAdminLeagueStatus(id);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "toggle-admin-league-status",
        scope: "events.leagues",
        targetType: "league",
        targetId: id,
        detail: formatAuditDetail([
          ["op", "toggle-league-status"],
          ["name", currentLeague?.displayName ?? currentLeague?.name ?? id],
          ["before", currentLeague?.status],
          ["after", currentLeague ? (currentLeague.status === "active" ? "inactive" : "active") : undefined],
        ]),
        ipAddress,
      });
      return redirectToEvents(request, "saved", "event-league-status");
    }

    if (intent === "toggle-league-featured") {
      const id = String(formData.get("id") || "").trim();
      const currentLeague = await prisma.league.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          displayName: true,
          featured: true,
        },
      });
      await toggleAdminLeagueFeatured(id);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "toggle-admin-league-featured",
        scope: "events.leagues",
        targetType: "league",
        targetId: id,
        detail: formatAuditDetail([
          ["op", "toggle-league-featured"],
          ["name", currentLeague?.displayName ?? currentLeague?.name ?? id],
          ["before", currentLeague?.featured],
          ["after", currentLeague ? !currentLeague.featured : undefined],
        ]),
        ipAddress,
      });
      return redirectToEvents(request, "saved", "event-league-featured");
    }

    if (intent === "move-league") {
      const id = String(formData.get("id") || "").trim();
      const direction = String(formData.get("direction") || "").trim() === "down" ? "down" : "up";
      const currentLeague = await prisma.league.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          displayName: true,
          sortOrder: true,
        },
      });
      await moveAdminLeague(id, direction);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: direction === "down" ? "move-admin-league-down" : "move-admin-league-up",
        scope: "events.leagues",
        targetType: "league",
        targetId: id,
        detail: formatAuditDetail([
          ["op", "move-league"],
          ["name", currentLeague?.displayName ?? currentLeague?.name ?? id],
          ["direction", direction],
          ["before", currentLeague?.sortOrder],
        ]),
        ipAddress,
      });
      return redirectToEvents(request, "saved", "event-league-sort");
    }

    if (intent === "clear-league-override") {
      const id = String(formData.get("id") || "").trim();
      const currentLeague = await prisma.league.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          displayName: true,
          source: true,
          adminLockedFields: true,
        },
      });
      await clearAdminLeagueOverride(id);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "clear-admin-league-override",
        scope: "events.leagues",
        targetType: "league",
        targetId: id,
        detail: formatAuditDetail([
          ["op", "clear-league-override"],
          ["name", currentLeague?.displayName ?? currentLeague?.name ?? id],
          [
            "cleared",
            currentLeague?.source === "manual"
              ? "manual-source"
              : parseLockedFieldSummary(currentLeague?.adminLockedFields),
          ],
        ]),
        ipAddress,
      });
      return redirectToEvents(request, "saved", "event-league-override");
    }

    if (intent === "delete-league") {
      const id = String(formData.get("id") || "").trim();
      const deleteConfirmation = String(formData.get("deleteConfirmation") || "").trim().toUpperCase();

      if (deleteConfirmation !== "DELETE") {
        return redirectToEvents(request, "error", "event-admin", {
          eventsCode: "event-delete-confirm",
          editLeague: id,
        });
      }

      const currentLeague = await prisma.league.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          displayName: true,
          source: true,
          _count: {
            select: {
              teams: true,
              matches: true,
            },
          },
        },
      });
      await deleteAdminLeague(id);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "delete-admin-league",
        scope: "events.leagues",
        targetType: "league",
        targetId: id,
        detail: formatAuditDetail([
          ["op", "delete-league"],
          ["name", currentLeague?.displayName ?? currentLeague?.name ?? id],
          ["source", currentLeague?.source],
          ["teams", currentLeague?._count.teams],
          ["matches", currentLeague?._count.matches],
        ]),
        ipAddress,
      });
      return redirectToEvents(request, "saved", "event-league-delete");
    }

    if (intent === "save-match") {
      const result = await saveAdminMatch(formData);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "save-admin-match",
        scope: "events.matches",
        targetType: "match",
        targetId: result.id,
        detail: formatAuditDetail([
          ["op", "save-match"],
          ["leagueId", String(formData.get("leagueId") || "").trim()],
          ["home", String(formData.get("homeTeamName") || "").trim()],
          ["away", String(formData.get("awayTeamName") || "").trim()],
          ["status", String(formData.get("status") || "upcoming").trim() || "upcoming"],
          ["kickoff", String(formData.get("kickoff") || "").trim()],
          ["visible", String(formData.get("adminVisible") || "").trim() === "on"],
          ["venue", String(formData.get("venue") || "").trim()],
          ["clock", String(formData.get("clock") || "").trim()],
        ]),
        ipAddress,
      });
      return redirectToEvents(request, "saved", "event-match", { editMatch: result.id });
    }

    if (intent === "toggle-match-visibility") {
      const id = String(formData.get("id") || "").trim();
      const currentMatch = await prisma.match.findUnique({
        where: { id },
        select: {
          id: true,
          homeTeamName: true,
          awayTeamName: true,
          adminVisible: true,
        },
      });
      await toggleAdminMatchVisibility(id);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "toggle-admin-match-visibility",
        scope: "events.matches",
        targetType: "match",
        targetId: id,
        detail: formatAuditDetail([
          ["op", "toggle-match-visibility"],
          ["home", currentMatch?.homeTeamName],
          ["away", currentMatch?.awayTeamName],
          ["before", currentMatch?.adminVisible],
          ["after", currentMatch ? !currentMatch.adminVisible : undefined],
        ]),
        ipAddress,
      });
      return redirectToEvents(request, "saved", "event-match-visibility");
    }

    if (intent === "clear-match-override") {
      const id = String(formData.get("id") || "").trim();
      const currentMatch = await prisma.match.findUnique({
        where: { id },
        select: {
          id: true,
          homeTeamName: true,
          awayTeamName: true,
          source: true,
          adminLockedFields: true,
        },
      });
      await clearAdminMatchOverride(id);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "clear-admin-match-override",
        scope: "events.matches",
        targetType: "match",
        targetId: id,
        detail: formatAuditDetail([
          ["op", "clear-match-override"],
          ["home", currentMatch?.homeTeamName],
          ["away", currentMatch?.awayTeamName],
          [
            "cleared",
            currentMatch?.source === "manual"
              ? "manual-source"
              : parseLockedFieldSummary(currentMatch?.adminLockedFields),
          ],
        ]),
        ipAddress,
      });
      return redirectToEvents(request, "saved", "event-match-override");
    }

    if (intent === "delete-match") {
      const id = String(formData.get("id") || "").trim();
      const deleteConfirmation = String(formData.get("deleteConfirmation") || "").trim().toUpperCase();

      if (deleteConfirmation !== "DELETE") {
        return redirectToEvents(request, "error", "event-admin", {
          eventsCode: "event-delete-confirm",
          editMatch: id,
        });
      }

      const currentMatch = await prisma.match.findUnique({
        where: { id },
        select: {
          id: true,
          source: true,
          homeTeamName: true,
          awayTeamName: true,
          league: {
            select: {
              displayName: true,
              name: true,
            },
          },
        },
      });
      await deleteAdminMatch(id);
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: "delete-admin-match",
        scope: "events.matches",
        targetType: "match",
        targetId: id,
        detail: formatAuditDetail([
          ["op", "delete-match"],
          ["home", currentMatch?.homeTeamName],
          ["away", currentMatch?.awayTeamName],
          ["league", currentMatch?.league.displayName ?? currentMatch?.league.name],
          ["source", currentMatch?.source],
        ]),
        ipAddress,
      });
      return redirectToEvents(request, "saved", "event-match-delete");
    }
  } catch (error) {
    try {
      await recordAdminAuditLog({
        actorUserId: currentUser?.id,
        actorDisplayName: session.displayName,
        actorRole: session.role,
        action: intent || "unknown-admin-event-action",
        scope: "events",
        targetType: "event-admin-action",
        targetId: String(formData.get("id") || "").trim() || "unknown-target",
        status: "failed",
        detail: formatAuditDetail([
          ["op", intent || "unknown-admin-event-action"],
          ["status", "failed"],
          ["error", error instanceof Error ? error.message : "unknown events error"],
        ]),
        ipAddress,
      });
    } catch {
      // Ignore secondary audit failures so the redirect still completes.
    }

    const errorExtras: Record<string, string> = {};
    const mappedError = mapEventsErrorCode(error);

    if (mappedError) {
      errorExtras.eventsCode = mappedError;
    }

    if (intent === "delete-league") {
      const id = String(formData.get("id") || "").trim();

      if (id) {
        errorExtras.editLeague = id;
      }
    }

    if (intent === "delete-match") {
      const id = String(formData.get("id") || "").trim();

      if (id) {
        errorExtras.editMatch = id;
      }
    }

    return redirectToEvents(
      request,
      "error",
      "event-admin",
      Object.keys(errorExtras).length > 0 ? errorExtras : undefined,
    );
  }

  return redirectToEvents(request, "error", "event-admin");
}
