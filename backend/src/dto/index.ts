export interface PredictionResult {
  homeWin: number;
  draw: number;
  awayWin: number;
  confidence: number;
  predictedResult: string;
  predictedScore?: string;
}

export interface PredictionResponse {
  id: string;
  matchId: string;
  homeProbability: number;
  drawProbability: number;
  awayProbability: number;
  confidence: number;
  predictedResult: string;
  predictedScore?: string;
  createdAt: string;
}

export interface TeamStatsResponse {
  id: string;
  teamId: string;
  xg: number;
  xga: number;
  shots: number;
  formPoints: number;
  winRate: number;
}

export interface MatchWithTeams {
  id: string;
  homeTeam: { id: string; name: string; logo?: string };
  awayTeam: { id: string; name: string; logo?: string };
  date: string;
  competition?: string;
  prediction?: PredictionResponse;
}

export interface ModelInfo {
  trained: boolean;
  featureCount: number;
  metrics: Record<string, unknown>;
}
