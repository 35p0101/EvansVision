import prisma from "../models";
import { config } from "../config";
import { PredictionResult, ModelInfo } from "../dto";

function currentSeason(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

function avg(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / Math.max(1, arr.length);
}

interface TeamStats {
  pts_last_5: number;
  pts_last_10: number;
  gf_avg_5: number;
  gf_avg_10: number;
  ga_avg_5: number;
  ga_avg_10: number;
  ewma_pts: number;
  form_ppg: number;
  xg_avg: number;
  elo: number;
  h2h_home_wins?: number;
  h2h_draws?: number;
  h2h_away_wins?: number;
}

export class PredictionService {
  async predictMatch(homeTeamId: string, awayTeamId: string): Promise<PredictionResult> {
    const [homeTeam, awayTeam] = await Promise.all([
      prisma.team.findUnique({ where: { id: homeTeamId }, include: { statistics: true } }),
      prisma.team.findUnique({ where: { id: awayTeamId }, include: { statistics: true } }),
    ]);

    if (!homeTeam || !awayTeam) {
      throw new Error("Team not found");
    }

    const [homeStats, awayStats, h2hStats] = await Promise.all([
      this.buildTeamStats(homeTeam, homeTeamId),
      this.buildTeamStats(awayTeam, awayTeamId),
      this.buildH2HStats(homeTeamId, awayTeamId),
    ]);

    homeStats.h2h_home_wins = h2hStats.homeWins;
    homeStats.h2h_draws = h2hStats.draws;
    homeStats.h2h_away_wins = h2hStats.awayWins;
    awayStats.h2h_home_wins = h2hStats.homeWins;
    awayStats.h2h_draws = h2hStats.draws;
    awayStats.h2h_away_wins = h2hStats.awayWins;

    const response = await fetch(`${config.aiServiceUrl}/api/v1/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        home_team: homeTeam.name,
        away_team: awayTeam.name,
        home_stats: homeStats,
        away_stats: awayStats,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI service error: ${err}`);
    }

    const data = await response.json() as Record<string, unknown>;

    const rawResult = (data.predicted_result as string) || "Draw";
    const resultMap: Record<string, string> = {
      "Home Win": "H",
      "Draw": "D",
      "Away Win": "A",
    };

    return {
      homeWin: data.home_win as number,
      draw: data.draw as number,
      awayWin: data.away_win as number,
      confidence: data.confidence as number,
      predictedResult: resultMap[rawResult] || rawResult,
      predictedScore: data.predicted_score as string | undefined,
    };
  }

  async savePrediction(matchId: string, homeTeamId: string, awayTeamId: string, result: PredictionResult) {
    return prisma.prediction.create({
      data: {
        matchId,
        homeTeamId,
        awayTeamId,
        homeProbability: result.homeWin,
        drawProbability: result.draw,
        awayProbability: result.awayWin,
        confidence: result.confidence,
        predictedResult: result.predictedResult,
        predictedScore: result.predictedScore,
      },
    });
  }

  async getPredictions(limit = 50) {
    return prisma.prediction.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        homeTeam: { select: { id: true, name: true, logo: true } },
        awayTeam: { select: { id: true, name: true, logo: true } },
      },
    });
  }

  async getPrediction(matchId: string) {
    return prisma.prediction.findUnique({
      where: { matchId },
      include: {
        homeTeam: { select: { id: true, name: true, logo: true } },
        awayTeam: { select: { id: true, name: true, logo: true } },
      },
    });
  }

  async getModelInfo(): Promise<ModelInfo> {
    try {
      const response = await fetch(`${config.aiServiceUrl}/api/v1/model-info`);
      if (!response.ok) throw new Error("AI service unavailable");
      const info = await response.json() as Record<string, unknown>;
      const metrics = (info.metrics as Record<string, unknown>) || {};
      return {
        trained: Boolean(info.trained),
        featureCount: (info.feature_count as number) ?? 0,
        metrics,
      };
    } catch {
      // AI service non raggiungibile - ritorna stato non addestrato senza dati falsi
      return { trained: false, featureCount: 0, metrics: {} };
    }
  }

  private async buildH2HStats(teamId: string, opponentId: string) {
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { homeTeamId: teamId, awayTeamId: opponentId },
          { homeTeamId: opponentId, awayTeamId: teamId },
        ],
      },
      orderBy: { date: "desc" },
      take: 5,
    });

    let homeWins = 0;
    let draws = 0;
    let awayWins = 0;

    for (const m of matches) {
      if (m.homeGoals === null || m.awayGoals === null) continue;
      if (m.homeTeamId === teamId) {
        if (m.homeGoals > m.awayGoals) homeWins++;
        else if (m.homeGoals === m.awayGoals) draws++;
        else awayWins++;
      } else {
        if (m.awayGoals > m.homeGoals) homeWins++;
        else if (m.awayGoals === m.homeGoals) draws++;
        else awayWins++;
      }
    }

    return { homeWins, draws, awayWins };
  }

  private async buildTeamStats(team: any, teamId: string): Promise<TeamStats> {
    const season = currentSeason();
    const s = team.statistics;

    const seasonMatches = await prisma.match.findMany({
      where: {
        OR: [
          { homeTeamId: teamId, season },
          { awayTeamId: teamId, season },
        ],
      },
      orderBy: { date: "asc" },
    });

    const points: number[] = [];
    for (const m of seasonMatches) {
      if (m.homeGoals === null || m.awayGoals === null) continue;
      if (m.homeTeamId === teamId) {
        points.push(m.homeGoals > m.awayGoals ? 3 : m.homeGoals === m.awayGoals ? 1 : 0);
      } else {
        points.push(m.awayGoals > m.homeGoals ? 3 : m.awayGoals === m.homeGoals ? 1 : 0);
      }
    }

    const last5 = points.slice(-5);
    const last10 = points.slice(-10);

    let ewma = points.length > 0 ? points[0] : 1.5;
    for (let i = 1; i < points.length; i++) {
      ewma = 0.3 * points[i] + 0.7 * ewma;
    }

    const formPpg = points.length > 0 ? avg(points) : 1.5;

    // GF/GA from recent matches
    const recent = seasonMatches.slice(-10);
    const gfList: number[] = [];
    const gaList: number[] = [];
    for (const m of recent) {
      if (m.homeGoals === null || m.awayGoals === null) continue;
      if (m.homeTeamId === teamId) {
        gfList.push(m.homeGoals);
        gaList.push(m.awayGoals);
      } else {
        gfList.push(m.awayGoals);
        gaList.push(m.homeGoals);
      }
    }

    const gf5 = gfList.slice(0, 5);
    const ga5 = gaList.slice(0, 5);

    return {
      pts_last_5: avg(last5) || 1.5,
      pts_last_10: avg(last10) || 1.4,
      gf_avg_5: avg(gf5) || 1.5,
      gf_avg_10: avg(gfList) || 1.4,
      ga_avg_5: avg(ga5) || 1.2,
      ga_avg_10: avg(gaList) || 1.3,
      ewma_pts: +ewma.toFixed(4) || 1.5,
      form_ppg: +formPpg.toFixed(4),
      xg_avg: s?.xg ?? 1.5,
      elo: team.eloRating,
    };
  }
}
