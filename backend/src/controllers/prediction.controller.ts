import { Router, Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { PredictionService } from "../services/prediction.service";
import { PredictMatchSchema } from "../validators";

const router = Router();
const predictionService = new PredictionService();

router.post("/predict", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = PredictMatchSchema.parse(req.body);
    const result = await predictionService.predictMatch(data.homeTeamId, data.awayTeamId);

    let saved = null;
    try {
      // matchId univoco per ogni predizione (storico) - non collegato a Match reale
      const matchId = randomUUID();
      saved = await predictionService.savePrediction(
        matchId,
        data.homeTeamId,
        data.awayTeamId,
        result
      );
    } catch (saveError) {
      // Non bloccare la response se il salvataggio fallisce, ma logga l'errore
      console.error("[prediction] Failed to save prediction:", saveError);
    }

    res.json({ ...result, id: saved?.id });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      res.status(400).json({ error: "Validation failed", details: error.errors });
      return;
    }
    next(error);
  }
});

router.get("/predictions", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const predictions = await predictionService.getPredictions();
    res.json(predictions);
  } catch (error) {
    next(error);
  }
});

router.get("/predictions/:matchId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prediction = await predictionService.getPrediction(req.params.matchId);
    if (!prediction) {
      res.status(404).json({ error: "Prediction not found" });
      return;
    }
    res.json(prediction);
  } catch (error) {
    next(error);
  }
});

router.get("/model-info", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const info = await predictionService.getModelInfo();
    res.json(info);
  } catch (error) {
    next(error);
  }
});

export default router;
