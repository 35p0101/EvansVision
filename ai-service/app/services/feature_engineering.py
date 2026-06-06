import numpy as np
import pandas as pd
from typing import Tuple


class FeatureEngineer:
    def __init__(self, config: dict):
        self.rolling_windows = config.get("rolling_windows", [5, 10])
        self.use_ewma = config.get("use_ewma", True)
        self.ewma_alpha = config.get("ewma_alpha", 0.3)
        self.use_elo = config.get("use_elo", True)
        self.elo_k = config.get("elo_k", 32)
        self.elo_initial = config.get("elo_initial", 1500)
        self.feature_cols = None

    def compute_elo(self, matches: pd.DataFrame) -> pd.DataFrame:
        elo = {}
        home_elo = []
        away_elo = []

        for _, row in matches.iterrows():
            home = row["home_team"]
            away = row["away_team"]
            if home not in elo:
                elo[home] = self.elo_initial
            if away not in elo:
                elo[away] = self.elo_initial

            home_elo.append(elo[home])
            away_elo.append(elo[away])

            home_expected = 1 / (1 + 10 ** ((elo[away] - elo[home]) / 400))
            away_expected = 1 - home_expected

            if row["target"] == 0:
                home_score, away_score = 1, 0
            elif row["target"] == 1:
                home_score, away_score = 0.5, 0.5
            else:
                home_score, away_score = 0, 1

            elo[home] += self.elo_k * (home_score - home_expected)
            elo[away] += self.elo_k * (away_score - away_expected)

        matches["home_elo"] = home_elo
        matches["away_elo"] = away_elo
        matches["elo_diff"] = matches["home_elo"] - matches["away_elo"]
        return matches

    def compute_rolling_features(self, df: pd.DataFrame, team_col: str, group_col: str) -> pd.DataFrame:
        df = df.sort_values(["season", "date"])
        groups = [group_col, "season"]
        for w in self.rolling_windows:
            col_pts = f"{team_col}_pts_last_{w}"
            col_gf = f"{team_col}_gf_avg_{w}"
            col_ga = f"{team_col}_ga_avg_{w}"
            df[col_pts] = df.groupby(groups)["points"].transform(
                lambda x: x.shift(1).rolling(w, min_periods=1).mean()
            )
            df[col_gf] = df.groupby(groups)["gf"].transform(
                lambda x: x.shift(1).rolling(w, min_periods=1).mean()
            )
            df[col_ga] = df.groupby(groups)["ga"].transform(
                lambda x: x.shift(1).rolling(w, min_periods=1).mean()
            )

        if self.use_ewma:
            col_ewma = f"{team_col}_ewma_pts"
            df[col_ewma] = df.groupby(groups)["points"].transform(
                lambda x: x.shift(1).ewm(alpha=self.ewma_alpha, adjust=False).mean()
            )
        return df

    def compute_h2h_features(self, matches: pd.DataFrame) -> pd.DataFrame:
        h2h_home_wins = []
        h2h_draws = []
        h2h_away_wins = []

        meetings = {}
        H2H_WINDOW = 5

        for _, row in matches.iterrows():
            home = row["home_team"]
            away = row["away_team"]

            key = (home, away) if home < away else (away, home)
            history = meetings.get(key, [])
            recent = history[-H2H_WINDOW:]

            hw = dw = aw = 0
            for pm_home, pm_away, pm_hg, pm_ag in recent:
                if pm_home == home:
                    if pm_hg > pm_ag:
                        hw += 1
                    elif pm_hg == pm_ag:
                        dw += 1
                    else:
                        aw += 1
                else:
                    if pm_ag > pm_hg:
                        hw += 1
                    elif pm_ag == pm_hg:
                        dw += 1
                    else:
                        aw += 1

            h2h_home_wins.append(hw)
            h2h_draws.append(dw)
            h2h_away_wins.append(aw)

            history.append((home, away, row["home_goals"], row["away_goals"]))
            meetings[key] = history

        matches["h2h_home_wins"] = h2h_home_wins
        matches["h2h_draws"] = h2h_draws
        matches["h2h_away_wins"] = h2h_away_wins
        return matches

    def compute_team_form(self, df: pd.DataFrame, team_col: str, group_col: str) -> pd.DataFrame:
        df = df.sort_values(["season", "date"])
        groups = [group_col, "season"]
        col_form = f"{team_col}_form_ppg"
        df[col_form] = df.groupby(groups)["points"].transform(
            lambda x: x.shift(1).expanding().mean()
        )
        return df

    def create_match_features(self, matches: pd.DataFrame) -> pd.DataFrame:
        df = matches.copy()

        df["gf"] = df["home_goals"]
        df["ga"] = df["away_goals"]
        df["points"] = df["target"].apply(lambda x: 3 if x == 0 else (1 if x == 1 else 0))

        # Per-team game log (home + away games combined)
        df_home = df[["date", "season", "home_team", "gf", "ga", "points", "target"]].copy()
        df_home.columns = ["date", "season", "team", "gf", "ga", "points", "target"]
        df_away = df[["date", "season", "away_team", "ga", "gf", "points", "target"]].copy()
        df_away.columns = ["date", "season", "team", "gf", "ga", "points", "target"]

        team_games = pd.concat([df_home, df_away], ignore_index=True)
        team_games = team_games.sort_values(["season", "date"])

        # Per-season rolling features
        team_games = self.compute_rolling_features(team_games, "team", "team")
        # Per-season team form (cumulative PPG within season)
        team_games = self.compute_team_form(team_games, "team", "team")

        # Prefix columns for home
        home_features = team_games.copy()
        rename_map = {}
        for c in home_features.columns:
            if c not in ["date", "season", "target"]:
                rename_map[c] = f"home_{c}"
        home_features = home_features.rename(columns=rename_map)

        # Prefix columns for away
        away_features = team_games.copy()
        rename_map = {}
        for c in away_features.columns:
            if c not in ["date", "season", "target"]:
                rename_map[c] = f"away_{c}"
        away_features = away_features.rename(columns=rename_map)

        df = df.merge(
            home_features,
            left_on=["date", "season", "home_team", "target"],
            right_on=["date", "season", "home_team", "target"],
            how="left",
        )
        df = df.merge(
            away_features,
            left_on=["date", "season", "away_team", "target"],
            right_on=["date", "season", "away_team", "target"],
            how="left",
            suffixes=("", "_away_dup"),
        )

        # Elo (global, multi-season)
        if self.use_elo:
            df = self.compute_elo(df)

        # Head-to-head (multi-season, last 5 meetings)
        df = self.compute_h2h_features(df)

        suffix_patterns = (
            "_last_5", "_avg_5", "_last_10", "_avg_10",
            "ewma_pts", "form_ppg",
            "home_elo", "away_elo", "elo_diff",
            "h2h_home_wins", "h2h_draws", "h2h_away_wins",
        )
        feature_cols = [c for c in df.columns if any(c.endswith(p) for p in suffix_patterns)]
        self.feature_cols = feature_cols
        return df

    def prepare_training_data(self, matches: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        df = self.create_match_features(matches)
        df = df.dropna(subset=self.feature_cols).reset_index(drop=True)

        X = df[self.feature_cols].values
        y = df["target"].values
        return X, y

    def prepare_prediction_features(self, home_stats: dict, away_stats: dict) -> np.ndarray:
        features = []
        # ALL home features first (to match create_match_features column order)
        for w in self.rolling_windows:
            features.extend([
                home_stats.get(f"pts_last_{w}", 1.5),
                home_stats.get(f"gf_avg_{w}", 1.5),
                home_stats.get(f"ga_avg_{w}", 1.2),
            ])
        if self.use_ewma:
            features.append(home_stats.get("ewma_pts", 1.5))
        features.append(home_stats.get("form_ppg", 1.5))
        # ALL away features second
        for w in self.rolling_windows:
            features.extend([
                away_stats.get(f"pts_last_{w}", 1.2),
                away_stats.get(f"gf_avg_{w}", 1.2),
                away_stats.get(f"ga_avg_{w}", 1.5),
            ])
        if self.use_ewma:
            features.append(away_stats.get("ewma_pts", 1.2))
        features.append(away_stats.get("form_ppg", 1.2))
        # Elo
        if self.use_elo:
            features.extend([
                home_stats.get("elo", 1500),
                away_stats.get("elo", 1500),
                home_stats.get("elo", 1500) - away_stats.get("elo", 1500),
            ])
        # H2H features
        features.extend([
            home_stats.get("h2h_home_wins", 0),
            home_stats.get("h2h_draws", 0),
            home_stats.get("h2h_away_wins", 0),
        ])
        return np.array(features).reshape(1, -1)
