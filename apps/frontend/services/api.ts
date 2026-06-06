import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1",
  headers: { "Content-Type": "application/json" },
});

export const getDashboardStats = () => api.get("/dashboard/stats").then((r) => r.data);

export const getTeams = () => api.get("/teams").then((r) => r.data);

export const getTeam = (id: string) => api.get(`/teams/${id}`).then((r) => r.data);

export const getMatches = () => api.get("/matches").then((r) => r.data);

export const getMatch = (id: string) => api.get(`/matches/${id}`).then((r) => r.data);

export const getPrediction = (matchId: string) =>
  api.get(`/predictions/${matchId}`).then((r) => r.data);

export const requestPrediction = (homeTeamId: string, awayTeamId: string) =>
  api.post("/predict", { homeTeamId, awayTeamId }).then((r) => r.data);

export const getPredictionsHistory = () => api.get("/predictions").then((r) => r.data);

export const getModelInfo = () => api.get("/model-info").then((r) => r.data);

export const login = (email: string, password: string) =>
  api.post("/auth/login", { email, password }).then((r) => r.data);

export const register = (email: string, password: string, name?: string) =>
  api.post("/auth/register", { email, password, name }).then((r) => r.data);
