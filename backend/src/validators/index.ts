import { z } from "zod";

export const PredictMatchSchema = z.object({
  homeTeamId: z.string().uuid(),
  awayTeamId: z.string().uuid(),
}).refine(data => data.homeTeamId !== data.awayTeamId, {
  message: "Home team and away team must be different",
  path: ["awayTeamId"],
});

export const CreateMatchSchema = z.object({
  homeTeamId: z.string().uuid(),
  awayTeamId: z.string().uuid(),
  homeGoals: z.number().int().min(0).optional(),
  awayGoals: z.number().int().min(0).optional(),
  date: z.string().datetime(),
  competition: z.string().optional(),
  season: z.string().optional(),
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
