import { Router, Request, Response, NextFunction } from "express";
import { TeamService } from "../services/team.service";

const router = Router();
const teamService = new TeamService();

router.get("/teams", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = await teamService.getAll();
    res.json(teams);
  } catch (error) {
    next(error);
  }
});

router.get("/teams/stats/summary", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = await teamService.getWithStats();
    res.json(teams);
  } catch (error) {
    next(error);
  }
});

router.get("/teams/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const team = await teamService.getById(req.params.id);
    if (!team) {
      res.status(404).json({ error: "Team not found" });
      return;
    }
    res.json(team);
  } catch (error) {
    next(error);
  }
});

export default router;
