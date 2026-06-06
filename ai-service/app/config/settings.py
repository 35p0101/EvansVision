import os
from dotenv import load_dotenv

load_dotenv()

MODEL_PATH = os.getenv("MODEL_PATH", "saved_models")
MODEL_FILE = os.path.join(MODEL_PATH, "model.keras")
SCALER_FILE = os.path.join(MODEL_PATH, "scaler.pkl")
ENCODER_FILE = os.path.join(MODEL_PATH, "encoder.pkl")
FEATURE_COLS_FILE = os.path.join(MODEL_PATH, "feature_cols.pkl")
METRICS_FILE = os.path.join(MODEL_PATH, "metrics.json")

TRAINING_CONFIG = {
    "epochs": 100,
    "batch_size": 32,
    "validation_split": 0.2,
    "test_split": 0.1,
    "learning_rate": 0.001,
    "early_stopping_patience": 10,
    "reduce_lr_patience": 5,
    "reduce_lr_factor": 0.5,
}

FEATURE_CONFIG = {
    "rolling_windows": [5, 10],
    "use_ewma": True,
    "ewma_alpha": 0.3,
    "use_elo": True,
    "elo_k": 32,
    "elo_initial": 1500,
}
