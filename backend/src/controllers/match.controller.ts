import { Router, Request, Response, NextFunction } from "express";
import prisma from "../models";

const router = Router();

router.get("/matches", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const matches = await prisma.match.findMany({
      take: 50,
      orderBy: { date: "desc" },
      include: {
        homeTeam: { select: { id: true, name: true, logo: true } },
        awayTeam: { select: { id: true, name: true, logo: true } },
      },
    });
    res.json(matches);
  } catch (error) {
    next(error);
  }
});

router.get("/matches/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: {
        homeTeam: true,
        awayTeam: true,
        stats: true,
      },
    });
    if (!match) {
      res.status(404).json({ error: "Match not found" });
      return;
    }
    res.json(match);
  } catch (error) {
    next(error);
  }
});

router.get("/dashboard/stats", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalTeams, totalMatches, totalPredictions, topTeams] = await Promise.all([
      prisma.team.count(),
      prisma.match.count(),
      prisma.prediction.count(),
      prisma.team.findMany({
        orderBy: { eloRating: "desc" },
        take: 5,
        include: { statistics: true },
      }),
    ]);
    res.json({ totalTeams, totalMatches, totalPredictions, topTeams });
  } catch (error) {
    next(error);
  }
});

export default router;
