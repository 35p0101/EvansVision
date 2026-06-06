from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.prediction import PredictionService
from app.training.trainer import Trainer

router = APIRouter()
predictor = PredictionService()
trainer = Trainer()


class PredictRequest(BaseModel):
    home_team: str
    away_team: str
    home_stats: dict
    away_stats: dict


class TrainRequest(BaseModel):
    data_path: str


@router.post("/predict")
def predict(req: PredictRequest):
    try:
        result = predictor.predict(req.home_stats, req.away_stats)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train")
def train(req: TrainRequest):
    try:
        result = trainer.train(req.data_path)
        return {"message": "Training completed", "metrics": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model-info")
def model_info():
    try:
        trainer.load()
        return {
            "trained": True,
            "feature_count": len(trainer.feature_engineer.feature_cols),
            "metrics": trainer.metrics,
        }
    except FileNotFoundError:
        return {"trained": False, "feature_count": 0, "metrics": {}}


@router.get("/health")
def health():
    return {"status": "ok"}
