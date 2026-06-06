DATA_DIR = "/app/datasets"
HISTORICAL_CSV_URL = "https://raw.githubusercontent.com/xgabora/Club-Football-Match-Data-2000-2025/main/data/Matches.csv"
FB_DATA_URLS = {
    "E0": "https://www.football-data.co.uk/mmz4281/2526/E0.csv",
    "I1": "https://www.football-data.co.uk/mmz4281/2526/I1.csv",
    "SP1": "https://www.football-data.co.uk/mmz4281/2526/SP1.csv",
    "D1": "https://www.football-data.co.uk/mmz4281/2526/D1.csv",
    "F1": "https://www.football-data.co.uk/mmz4281/2526/F1.csv",
}
DIVISIONS = {"E0": "premier_league", "I1": "serie_a", "SP1": "la_liga", "D1": "bundesliga", "F1": "ligue_1"}

import os, pandas as pd, requests
from io import StringIO
from datetime import datetime

os.makedirs(DATA_DIR, exist_ok=True)

def resolve_season(date):
    y = date.year
    if date.month >= 8:
        return f"{y}/{y+1}"
    return f"{y-1}/{y}"

def download_historical():
    print("Downloading historical dataset (2000-2025)...", flush=True)
    resp = requests.get(HISTORICAL_CSV_URL, timeout=120)
    resp.raise_for_status()
    raw = pd.read_csv(StringIO(resp.content.decode("utf-8")))
    print(f"  Total: {len(raw)} matches", flush=True)
    mask = raw["Division"].isin(DIVISIONS.keys())
    df = raw[mask].copy()
    print(f"  Filtered to top-5 leagues: {len(df)} matches", flush=True)
    df["league"] = df["Division"].map(DIVISIONS)
    df["date"] = pd.to_datetime(df["MatchDate"], errors="coerce")
    df["home_team"] = df["HomeTeam"]
    df["away_team"] = df["AwayTeam"]
    df["home_goals"] = pd.to_numeric(df["FTHome"], errors="coerce").fillna(0)
    df["away_goals"] = pd.to_numeric(df["FTAway"], errors="coerce").fillna(0)
    df["season"] = df["date"].apply(resolve_season)
    out = df[["league", "date", "home_team", "away_team", "home_goals", "away_goals", "season"]]
    out = out.dropna(subset=["date"]).sort_values("date").reset_index(drop=True)
    return out

def download_new_season():
    print("\nDownloading 2025/26 season from football-data.co.uk...", flush=True)
    frames = []
    for div, url in FB_DATA_URLS.items():
        print(f"  Fetching {div}...", flush=True)
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
        raw = pd.read_csv(StringIO(resp.content.decode("utf-8")))
        print(f"    {len(raw)} matches", flush=True)
        df = pd.DataFrame({
            "league": DIVISIONS[div],
            "date": pd.to_datetime(raw["Date"], format="%d/%m/%Y", errors="coerce"),
            "home_team": raw["HomeTeam"].str.strip(),
            "away_team": raw["AwayTeam"].str.strip(),
            "home_goals": pd.to_numeric(raw["FTHG"], errors="coerce").fillna(0),
            "away_goals": pd.to_numeric(raw["FTAG"], errors="coerce").fillna(0),
            "season": "2025/2026",
        })
        frames.append(df)
    combined = pd.concat(frames, ignore_index=True)
    combined = combined.dropna(subset=["date"]).sort_values("date").reset_index(drop=True)
    print(f"  Total 2025/26: {len(combined)} matches across {combined['league'].nunique()} leagues", flush=True)
    return combined

def main():
    historical = download_historical()
    new = download_new_season()

    all_matches = pd.concat([historical, new], ignore_index=True)
    all_matches = all_matches.drop_duplicates(subset=["date", "home_team", "away_team"]).sort_values("date").reset_index(drop=True)

    out_path = os.path.join(DATA_DIR, "matches.csv")
    all_matches.to_csv(out_path, index=False)
    print(f"\nSaved {len(all_matches)} matches across {all_matches['league'].nunique()} leagues"
          f" and {all_matches['season'].nunique()} seasons"
          f" ({all_matches['season'].min()} - {all_matches['season'].max()})"
          f" to {out_path}", flush=True)

if __name__ == "__main__":
    main()
