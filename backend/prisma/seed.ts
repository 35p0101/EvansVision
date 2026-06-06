import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();

const COUNTRY_MAP: Record<string, string> = {
  premier_league: "England", serie_a: "Italy", la_liga: "Spain",
  bundesliga: "Germany", ligue_1: "France",
};
const LEAGUE_MAP: Record<string, string> = {
  premier_league: "Premier League", serie_a: "Serie A", la_liga: "La Liga",
  bundesliga: "Bundesliga", ligue_1: "Ligue 1",
};

interface TeamMatch {
  gf: number;
  ga: number;
  points: number;
  date: string;
  season: string;
  isHome: boolean;
}

interface TeamData {
  league: string;
  matches: TeamMatch[];
}

async function main() {
  const csvContent = fs.readFileSync(__dirname + "/matches.csv", "utf-8");
  const allLines = csvContent.split("\n").filter(l => l.trim().length > 0);
  console.log(`Loaded ${allLines.length - 1} matches`);

  const teams = new Map<string, TeamData>();

  // Parse all matches chronologically
  const rawMatches: { league: string; date: string; home: string; away: string; hg: number; ag: number; season: string }[] = [];

  for (let i = 1; i < allLines.length; i++) {
    const parts = allLines[i].split(",");
    if (parts.length < 7) continue;
    const league = parts[0].trim();
    const date = parts[1].trim();
    const home = parts[2].trim();
    const away = parts[3].trim();
    const hg = parseInt(parts[4]);
    const ag = parseInt(parts[5]);
    const season = parts[6].trim();
    if (isNaN(hg) || isNaN(ag)) continue;
    rawMatches.push({ league, date, home, away, hg, ag, season });
  }

  // Sort all matches chronologically
  rawMatches.sort((a, b) => a.date.localeCompare(b.date) || a.season.localeCompare(b.season));
  console.log(`Sorted ${rawMatches.length} matches chronologically`);

  // Compute Elo chronologically like the training code
  const eloMap = new Map<string, number>();
  const K = 32;
  const INITIAL = 1500;

  // Also collect matches per team for rolling stats
  for (const m of rawMatches) {
    // Initialize Elo
    if (!eloMap.has(m.home)) eloMap.set(m.home, INITIAL);
    if (!eloMap.has(m.away)) eloMap.set(m.away, INITIAL);

    const homeElo = eloMap.get(m.home)!;
    const awayElo = eloMap.get(m.away)!;
    const homeExpected = 1 / (1 + Math.pow(10, (awayElo - homeElo) / 400));
    const awayExpected = 1 - homeExpected;

    // Match result: home=0, draw=1, away=2 (same as training target)
    let homeScore: number, awayScore: number;
    if (m.hg > m.ag) { homeScore = 1; awayScore = 0; }
    else if (m.hg === m.ag) { homeScore = 0.5; awayScore = 0.5; }
    else { homeScore = 0; awayScore = 1; }

    eloMap.set(m.home, homeElo + K * (homeScore - homeExpected));
    eloMap.set(m.away, awayElo + K * (awayScore - awayExpected));

    // Store match for rolling stats
    if (!teams.has(m.home)) teams.set(m.home, { league: m.league, matches: [] });
    if (!teams.has(m.away)) teams.set(m.away, { league: m.league, matches: [] });
    teams.get(m.home)!.matches.push({
      gf: m.hg, ga: m.ag, points: m.hg > m.ag ? 3 : m.hg === m.ag ? 1 : 0,
      date: m.date, season: m.season, isHome: true,
    });
    teams.get(m.away)!.matches.push({
      gf: m.ag, ga: m.hg, points: m.ag > m.hg ? 3 : m.hg === m.ag ? 1 : 0,
      date: m.date, season: m.season, isHome: false,
    });
  }

  console.log(`Found ${teams.size} unique teams`);

  // Now seed each team with its final Elo and rolling stats
  let created = 0;
  for (const [name, td] of teams) {
    const sorted = td.matches.sort((a, b) => a.date.localeCompare(b.date) || a.season.localeCompare(b.season));
    const last5 = sorted.slice(-5);
    const last10 = sorted.slice(-10);

    const avg = (arr: number[]): number => arr.reduce((s, v) => s + v, 0) / Math.max(1, arr.length);
    const sum = (arr: number[]): number => arr.reduce((s, v) => s + v, 0);

    // Rolling stats from last 5/10
    const stats = {
      ptsLast5: avg(last5.map(m => m.points)),
      gfLast5: avg(last5.map(m => m.gf)),
      gaLast5: avg(last5.map(m => m.ga)),
      ptsLast10: avg(last10.map(m => m.points)),
      gfLast10: avg(last10.map(m => m.gf)),
      gaLast10: avg(last10.map(m => m.ga)),
      goalsScored: sum(sorted.map(m => m.gf)),
      goalsConceded: sum(sorted.map(m => m.ga)),
      wins: sorted.filter(m => m.points === 3).length,
      draws: sorted.filter(m => m.points === 1).length,
      losses: sorted.filter(m => m.points === 0).length,
    };

    // EWMA
    let ewma = sorted.length > 0 ? sorted[0].points : 0;
    for (let i = 1; i < sorted.length; i++) ewma = 0.3 * sorted[i].points + 0.7 * ewma;

    const total = stats.wins + stats.draws + stats.losses;
    const winRate = total > 0 ? stats.wins / total : 0;
    const avgGF = total > 0 ? stats.goalsScored / total : 0;
    const avgGA = total > 0 ? stats.goalsConceded / total : 0;
    const gd = avgGF - avgGA;

    // Use Elo computed chronologically from matches
    const eloRating = Math.round(Math.min(1950, Math.max(1100, eloMap.get(name) || INITIAL)));

    const displayLeague = LEAGUE_MAP[td.league] || td.league;
    const country = COUNTRY_MAP[td.league] || "England";
    const formPoints = Math.min(3, Math.max(0, stats.ptsLast5 * 10 / 3));

    try {
      const team = await prisma.team.upsert({
        where: { name },
        update: { eloRating, league: displayLeague, country },
        create: { name, league: displayLeague, country, eloRating },
      });

      await prisma.teamStatistics.upsert({
        where: { teamId: team.id },
        update: {
          ptsLast5: +stats.ptsLast5.toFixed(2),
          ptsLast10: +stats.ptsLast10.toFixed(2),
          gfLast5: +stats.gfLast5.toFixed(2),
          gfLast10: +stats.gfLast10.toFixed(2),
          gaLast5: +stats.gaLast5.toFixed(2),
          gaLast10: +stats.gaLast10.toFixed(2),
          ewma: +ewma.toFixed(2),
          xg: +avgGF.toFixed(2),
          xga: +avgGA.toFixed(2),
          shots: Math.round(10 + avgGF * 4),
          possession: Math.round(Math.min(60, Math.max(38, 45 + gd * 3))),
          formPoints: +formPoints.toFixed(2),
          winRate: +winRate.toFixed(3),
        },
        create: {
          teamId: team.id,
          ptsLast5: +stats.ptsLast5.toFixed(2),
          ptsLast10: +stats.ptsLast10.toFixed(2),
          gfLast5: +stats.gfLast5.toFixed(2),
          gfLast10: +stats.gfLast10.toFixed(2),
          gaLast5: +stats.gaLast5.toFixed(2),
          gaLast10: +stats.gaLast10.toFixed(2),
          ewma: +ewma.toFixed(2),
          xg: +avgGF.toFixed(2),
          xga: +avgGA.toFixed(2),
          shots: Math.round(10 + avgGF * 4),
          possession: Math.round(Math.min(60, Math.max(38, 45 + gd * 3))),
          formPoints: +formPoints.toFixed(2),
          winRate: +winRate.toFixed(3),
        },
      });

      created++;
      if (created % 50 === 0) console.log(`Seeded ${created} teams...`);
    } catch (err) {
      console.error(`Error on ${name}:`, (err as Error).message);
    }
  }

  console.log(`\nSeeded ${created} teams`);

  // --- Create Match records ---
  console.log("Creating Match records...");

  // Clear existing match-related data for idempotency
  await prisma.prediction.deleteMany();
  await prisma.matchStats.deleteMany();
  await prisma.match.deleteMany();

  const allTeams = await prisma.team.findMany({ select: { id: true, name: true } });
  const teamIdMap = new Map<string, string>(allTeams.map(t => [t.name, t.id]));
  console.log(`  Team name→id map built: ${teamIdMap.size} teams`);

  let matchCount = 0;
  const BATCH = 1000;
  for (let i = 0; i < rawMatches.length; i += BATCH) {
    const batch = rawMatches.slice(i, i + BATCH);
    const records = [];
    for (const m of batch) {
      const homeId = teamIdMap.get(m.home);
      const awayId = teamIdMap.get(m.away);
      if (!homeId || !awayId) continue;
      records.push({
        homeTeamId: homeId,
        awayTeamId: awayId,
        homeGoals: m.hg,
        awayGoals: m.ag,
        date: new Date(m.date),
        competition: LEAGUE_MAP[m.league] || m.league,
        season: m.season,
      });
    }
    if (records.length === 0) continue;
    await prisma.match.createMany({ data: records });
    matchCount += records.length;
    if (matchCount % 5000 === 0) console.log(`  Created ${matchCount} matches...`);
  }
  console.log(`Created ${matchCount} match records`);

  const top = await prisma.team.findMany({
    orderBy: { eloRating: "desc" }, include: { statistics: true }, take: 5,
  });
  console.log("\nTop 5 by Elo:");
  for (const t of top) {
    const s = t.statistics!;
    console.log(`${t.name.padEnd(25)} Elo:${t.eloRating}  pts5:${s.ptsLast5?.toFixed(2)} ewma:${s.ewma?.toFixed(2)}`);
  }

  const bottom = await prisma.team.findMany({
    orderBy: { eloRating: "asc" }, include: { statistics: true }, take: 3,
  });
  console.log("\nBottom 3 by Elo:");
  for (const t of bottom) {
    const s = t.statistics!;
    console.log(`${t.name.padEnd(25)} Elo:${t.eloRating}  pts5:${s.ptsLast5?.toFixed(2)} ewma:${s.ewma?.toFixed(2)}`);
  }

  // Compare Man City vs Man United
  const mci = await prisma.team.findUnique({ where: { name: "Man City" }, include: { statistics: true } });
  const mun = await prisma.team.findUnique({ where: { name: "Man United" }, include: { statistics: true } });
  if (mci?.statistics && mun?.statistics) {
    console.log(`\nComparison:`);
    console.log(`Man City:    Elo=${mci.eloRating} pts5=${mci.statistics.ptsLast5} ga5=${mci.statistics.gaLast5}`);
    console.log(`Man United:  Elo=${mun.eloRating} pts5=${mun.statistics.ptsLast5} ga5=${mun.statistics.gaLast5}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
