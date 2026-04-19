import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// Cache match data for 5 minutes to stay within football-data.org free tier limits
export const revalidate = 300;

export async function GET() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const matches = await db.match.findMany({
    where: {
      sport: "football",
      kickoff: { gte: start, lte: end },
      adminVisible: true,
    },
    include: { league: true },
    orderBy: { kickoff: "asc" },
    take: 50,
  });

  const data = matches.map((m) => ({
    id: m.id,
    homeTeamName: m.homeTeamName,
    awayTeamName: m.awayTeamName,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
    kickoff: m.kickoff.toISOString(),
    leagueName: m.league.name ?? m.league.id,
    lastSyncedAt: m.lastSyncedAt?.toISOString() ?? null,
  }));

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
