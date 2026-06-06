import numpy as np
import pandas as pd
import joblib
from sklearn.utils.class_weight import compute_class_weight
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

from app.models.network import build_model
from app.services.feature_engineering import FeatureEngineer
from app.config.settings import MODEL_PATH, MODEL_FILE, SCALER_FILE, ENCODER_FILE, FEATURE_COLS_FILE, METRICS_FILE, TRAINING_CONFIG, FEATURE_CONFIG


class Trainer:
    def __init__(self):
        self.feature_engineer = FeatureEngineer(FEATURE_CONFIG)
        self.model = None
        self.scaler = StandardScaler()
        self.history = None
        self.metrics = {}

    def load_data(self, csv_path: str) -> pd.DataFrame:
        df = pd.read_csv(csv_path)
        required = ["home_team", "away_team", "home_goals", "away_goals", "date", "season"]
        for col in required:
            if col not in df.columns:
                raise ValueError(f"Missing required column: {col}")
        df["target"] = df.apply(
            lambda r: 0 if r["home_goals"] > r["away_goals"]
            else (1 if r["home_goals"] == r["away_goals"] else 2),
            axis=1
        )
        df["date"] = pd.to_datetime(df["date"])
        return df

    def train(self, csv_path: str) -> dict:
        df = self.load_data(csv_path)
        X, y = self.feature_engineer.prepare_training_data(df)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=TRAINING_CONFIG["test_split"],
            random_state=42, stratify=y
        )
        X_train, X_val, y_train, y_val = train_test_split(
            X_train, y_train, test_size=TRAINING_CONFIG["validation_split"],
            random_state=42, stratify=y_train
        )

        X_train_scaled = self.scaler.fit_transform(X_train)
        X_val_scaled = self.scaler.transform(X_val)
        X_test_scaled = self.scaler.transform(X_test)

        input_dim = X_train_scaled.shape[1]
        self.model = build_model(input_dim)

        callbacks = [
            EarlyStopping(
                monitor="val_loss",
                patience=TRAINING_CONFIG["early_stopping_patience"],
                restore_best_weights=True,
            ),
            ReduceLROnPlateau(
                monitor="val_loss",
                factor=TRAINING_CONFIG["reduce_lr_factor"],
                patience=TRAINING_CONFIG["reduce_lr_patience"],
                min_lr=1e-6,
            ),
        ]

        classes = np.array([0, 1, 2])
        weights = compute_class_weight("balanced", classes=classes, y=y_train)
        class_weight = dict(zip(classes, weights))

        self.history = self.model.fit(
            X_train_scaled, y_train,
            validation_data=(X_val_scaled, y_val),
            epochs=TRAINING_CONFIG["epochs"],
            batch_size=TRAINING_CONFIG["batch_size"],
            callbacks=callbacks,
            class_weight=class_weight,
            verbose=1,
        )

        test_loss, test_acc = self.model.evaluate(X_test_scaled, y_test, verbose=0)
        y_pred = np.argmax(self.model.predict(X_test_scaled, verbose=0), axis=1)

        from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix
        precision = precision_score(y_test, y_pred, average="weighted", zero_division=0)
        recall = recall_score(y_test, y_pred, average="weighted", zero_division=0)
        f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)
        cm = confusion_matrix(y_test, y_pred).tolist()

        self.metrics = {
            "accuracy": float(test_acc),
            "loss": float(test_loss),
            "precision": float(precision),
            "recall": float(recall),
            "f1_score": float(f1),
            "confusion_matrix": cm,
            "test_samples": int(len(y_test)),
        }

        self.save()

        return {
            **self.metrics,
            "feature_count": input_dim,
            "training_samples": int(len(X_train)),
        }

    def save(self):
        import os, json
        os.makedirs(MODEL_PATH, exist_ok=True)
        self.model.save(MODEL_FILE)
        joblib.dump(self.scaler, SCALER_FILE)
        joblib.dump(self.feature_engineer.feature_cols, FEATURE_COLS_FILE)
        with open(METRICS_FILE, "w") as f:
            json.dump(self.metrics, f)

    def load(self):
        import os, json
        if not os.path.exists(MODEL_FILE):
            raise FileNotFoundError("No trained model found. Train first.")
        from tensorflow.keras.models import load_model
        self.model = load_model(MODEL_FILE)
        self.scaler = joblib.load(SCALER_FILE)
        self.feature_engineer.feature_cols = joblib.load(FEATURE_COLS_FILE)
        if os.path.exists(METRICS_FILE):
            with open(METRICS_FILE) as f:
                self.metrics = json.load(f)
