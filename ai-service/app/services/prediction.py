import math
import numpy as np
import joblib
from tensorflow.keras.models import load_model

from app.services.feature_engineering import FeatureEngineer
from app.config.settings import MODEL_FILE, SCALER_FILE, FEATURE_COLS_FILE, FEATURE_CONFIG


class PredictionService:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.feature_engineer = FeatureEngineer(FEATURE_CONFIG)
        self.loaded = False

    def load(self):
        if not self.loaded:
            self.model = load_model(MODEL_FILE)
            self.scaler = joblib.load(SCALER_FILE)
            self.feature_engineer.feature_cols = joblib.load(FEATURE_COLS_FILE)
            self.loaded = True

    def predict(self, home_stats: dict, away_stats: dict) -> dict:
        self.load()
        features = self.feature_engineer.prepare_prediction_features(home_stats, away_stats)
        features_scaled = self.scaler.transform(features)
        probs = self.model.predict(features_scaled, verbose=0)[0]
        home_prob = float(probs[0])
        draw_prob = float(probs[1])
        away_prob = float(probs[2])
        confidence = float(np.max(probs))
        predicted = ["Home Win", "Draw", "Away Win"][int(np.argmax(probs))]

        return {
            "home_win": round(home_prob, 4),
            "draw": round(draw_prob, 4),
            "away_win": round(away_prob, 4),
            "confidence": round(confidence, 4),
            "predicted_result": predicted,
            "predicted_score": self._estimate_score(home_prob, away_prob, home_stats, away_stats, predicted),
        }

    def _estimate_score(self, home_prob: float, away_prob: float, home_stats: dict, away_stats: dict, predicted_result: str) -> str:
        home_xg = home_stats.get("xg_avg", 1.5)
        away_xg = away_stats.get("xg_avg", 1.5)

        avg_xg = (home_xg + away_xg) / 2
        prob_ratio = max(home_prob, away_prob) / max(0.01, min(home_prob, away_prob))
        total_goals = max(1.5, avg_xg * math.sqrt(prob_ratio))

        if predicted_result == "Home Win":
            home_raw = total_goals * home_prob / (home_prob + away_prob)
            away_raw = total_goals - home_raw
            home_score, away_score = round(home_raw), round(away_raw)
            if home_score <= away_score:
                home_score = away_score + 1
        elif predicted_result == "Away Win":
            away_raw = total_goals * away_prob / (home_prob + away_prob)
            home_raw = total_goals - away_raw
            home_score, away_score = round(home_raw), round(away_raw)
            if away_score <= home_score:
                away_score = home_score + 1
        else:
            g = max(1, round(avg_xg))
            home_score = away_score = g

        return f"{home_score}-{away_score}"
