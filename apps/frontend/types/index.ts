export interface Team {
  id: string;
  name: string;
  league: string | null;
  country: string | null;
  logo: string | null;
  eloRating: number;
  statistics: TeamStatistics | null;
}

export interface TeamStatistics {
  xg: number;
  xga: number;
  shots: number;
  possession: number;
  formPoints: number;
  winRate: number;
}

export interface Match {
  id: string;
  homeTeam: { id: string; name: string; logo: string | null };
  awayTeam: { id: string; name: string; logo: string | null };
  homeGoals: number | null;
  awayGoals: number | null;
  date: string;
  competition: string | null;
  predictions: Prediction[];
}

export interface Prediction {
  id: string;
  matchId: string;
  homeProbability: number;
  drawProbability: number;
  awayProbability: number;
  confidence: number;
  predictedResult: string;
  predictedScore: string | null;
}

export interface DashboardStats {
  totalTeams: number;
  totalMatches: number;
  totalPredictions: number;
  topTeams: Team[];
}

export interface ModelInfo {
  trained: boolean;
  featureCount: number;
  metrics: Record<string, unknown>;
}
