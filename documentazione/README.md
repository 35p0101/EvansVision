# EvansVision ⚽🧠

**EvansVision** è una piattaforma di previsioni calcistiche basata su **Machine Learning**. Utilizza una rete neurale profonda (TensorFlow/Keras) addestrata su oltre **43.000 partite reali** delle migliori 5 leghe europee (Serie A, Premier League, La Liga, Bundesliga, Ligue 1) dal **2000 al 2025**.

L'architettura è composta da tre microservizi containerizzati con Docker:

| Servizio | Ruolo | Porta |
|----------|-------|-------|
| **AI Service** | Modello ML, feature engineering, predizioni | `8000` |
| **Backend** | API REST, database PostgreSQL, autenticazione | `4000` |
| **Frontend** | UI React/Next.js con grafici e dashboard | `3000` |

---

## 📦 Architettura

```
┌─────────────┐     ┌──────────┐     ┌────────────┐
│   Frontend  │────▶│  Backend │────▶│ AI Service │
│  (Next.js)  │     │ (Express)│     │  (FastAPI) │
│    :3000    │     │   :4000  │     │   :8000    │
└─────────────┘     └────┬─────┘     └────────────┘
                         │
                    ┌────▼─────┐
                    │PostgreSQL│
                    │  :5432   │
                    └──────────┘
```

1. L'utente seleziona due squadre dal **Frontend**
2. Il **Backend** recupera i dati delle squadre dal database e li invia all'**AI Service**
3. L'**AI Service** costruisce le feature (medie mobili, EWMA, Elo), le normalizza e le passa alla rete neurale
4. La rete neurale restituisce le probabilità: `[Home Win, Draw, Away Win]`
5. Il risultato viene salvato nel database e mostrato all'utente

---

## 🧠 Il Sistema di Machine Learning

### Feature Engineering

Il cuore del sistema è la classe `FeatureEngineer` in `ai-service/app/services/feature_engineering.py`. Per ogni partita vengono calcolate **17 feature numeriche**:

| # | Feature | Descrizione |
|---|---------|-------------|
| 1 | `home_team_pts_last_5` | Media punti della squadra di casa nelle ultime 5 partite |
| 2 | `home_team_gf_avg_5` | Media gol fatti in casa nelle ultime 5 |
| 3 | `home_team_ga_avg_5` | Media gol subiti in casa nelle ultime 5 |
| 4 | `away_team_pts_last_5` | Media punti ospite ultime 5 |
| 5 | `away_team_gf_avg_5` | Media gol fatti ospite ultime 5 |
| 6 | `away_team_ga_avg_5` | Media gol subiti ospite ultime 5 |
| 7-12 | `*_last_10` | Stesse metriche su finestra di 10 partite |
| 13 | `home_team_ewma_pts` | Media ponderata esponenziale punti casa (α=0.3) |
| 14 | `away_team_ewma_pts` | Media ponderata esponenziale punti ospite |
| 15 | `home_elo` | Punteggio Elo della squadra di casa |
| 16 | `away_elo` | Punteggio Elo della squadra ospite |
| 17 | `elo_diff` | Differenza Elo (`home_elo - away_elo`) |

#### Elo Rating

Il sistema Elo è implementato manualmente:

- **Valore iniziale**: 1500 per ogni squadra
- **K-factor**: 32 (quanto velocemente si aggiorna il rating)
- **Formula**: `Nuovo Elo = Vecchio Elo + K × (Risultato Reale - Risultato Atteso)`
- **Risultato atteso**: `1 / (1 + 10^((Elosopponente - Elosquadra) / 400))`
- **Assegnazione punteggi**: Vittoria casa = 1 punto, Pareggio = 0.5, Vittoria fuori = 0

### Architettura della Rete Neurale (`network.py`)

```
Input (17 features)
    │
    ▼
┌─────────────────────┐
│  Dense(128, ReLU)   │  ← L2 regolarizzazione (1e-4)
│  BatchNormalization │
│     Dropout(30%)    │
├─────────────────────┤
│  Dense(64, ReLU)    │  ← L2 regolarizzazione (1e-4)
│  BatchNormalization │
│     Dropout(30%)    │
├─────────────────────┤
│  Dense(32, ReLU)    │  ← L2 regolarizzazione (1e-4)
├─────────────────────┤
│  Dense(3, Softmax)  │  ← Output: [Home, Draw, Away]
└─────────────────────┘
```

- **Loss**: `sparse_categorical_crossentropy`
- **Optimizer**: Adam (learning rate = 0.001)
- **Metrica**: Accuracy
- **Regolarizzazione**: L2 + Dropout(30%) + BatchNormalization
- **Class Weights**: Bilanciamento automatico con `compute_class_weight('balanced')`

### Addestramento (Training)

Il training viene eseguito dalla classe `Trainer` in `trainer.py`:

1. **Caricamento dati** da file CSV con colonne: `league, date, home_team, away_team, home_goals, away_goals, season`
2. **Calcolo target**: 0 = vittoria casa, 1 = pareggio, 2 = vittoria fuori
3. **Feature engineering**: 17 feature numeriche per ogni partita
4. **Split**:
   - 10% Test set
   - Del restante: 80% Training, 20% Validation
   - Stratificato per bilanciare le classi
5. **Normalizzazione**: `StandardScaler` (media 0, varianza 1)
6. **Allenamento**:
   - Max 100 epoche
   - EarlyStopping (pazienza 10 epoche su val_loss)
   - ReduceLROnPlateau (riduce LR del 50% dopo 5 epoche senza miglioramenti)
   - Class weights per bilanciare le classi
7. **Salvataggio**: modello (.keras), scaler (.pkl), feature_cols (.pkl)

---

## 🚀 Avvio Rapido

### Prerequisiti

- Docker & Docker Compose
- Git

### 1. Clona la repository

```bash
git clone <url-repo>
cd EvansVision
```

### 2. Avvia i container

```bash
docker compose up -d --build
```

Questo avvia 4 container:

| Container | Tempo di avvio | Verifica |
|-----------|---------------|----------|
| `postgres` | 5-10s | `docker logs evansvision-postgres-1` |
| `ai-service` | 30-60s (installa TF) | `curl http://localhost:8000/api/v1/health` |
| `backend` | 20-30s | `curl http://localhost:4000/api/v1/health` |
| `frontend` | 30-60s (build Next.js) | Apri `http://localhost:3000` |

### 3. Inizializza il database

```bash
# Esegui le migrazioni Prisma
docker exec evansvision-backend-1 npx prisma db push

# Popola il database con squadre, statistiche e partite di esempio
docker exec evansvision-backend-1 npm run prisma:seed
```

### 4. Scarica il dataset e allena il modello

```bash
# Scarica 43.000+ partite reali dal dataset su GitHub
docker exec evansvision-ai-service-1 python3 /app/app/datasets/download_data.py

# Allena la rete neurale
docker exec evansvision-ai-service-1 sh -c 'curl -s -X POST http://localhost:8000/api/v1/train -H "Content-Type: application/json" -d "{\"data_path\": \"/app/datasets/matches.csv\"}"'
```

### 5. Usa la piattaforma

Apri `http://localhost:3000` nel browser. Puoi:
- Visualizzare la dashboard con le squadre migliori
- Selezionare due squadre e ottenere una predizione
- Esplorare le statistiche delle squadre

---

## 🔬 Come Addestrare (Train) il Modello

> **Nota per Windows PowerShell**: i comandi `curl` usano apici singoli (`'`). PowerShell richiede apici doppi. Su Windows, sostituisci:
> ```powershell
> curl -X POST ... -d '{"data_path": "/app/datasets/matches.csv"}'
> ```
> con:
> ```powershell
> curl -X POST ... -d '{\"data_path\": \"/app/datasets/matches.csv\"}'
> ```
> Meglio: esegui i comandi dentro il container con `docker exec ... sh -c "..."` usando il file script.

### Addestramento di Base

```bash
curl -X POST http://localhost:8000/api/v1/train \
  -H "Content-Type: application/json" \
  -d '{"data_path": "/app/datasets/matches.csv"}'
```

**Risposta**:
```json
{
  "message": "Training completed",
  "metrics": {
    "accuracy": 0.462,
    "loss": 1.037,
    "precision": 0.474,
    "recall": 0.462,
    "f1_score": 0.467,
    "confusion_matrix": [
      [1061, 536, 392],
      [419, 355, 354],
      [286, 353, 599]
    ],
    "test_samples": 4355,
    "feature_count": 17,
    "training_samples": 31348
  }
}
```

### Scaricare un Dataset Fresco

Il dataset proviene da una copia cache su GitHub dei dati di `football-data.co.uk`. Per scaricare l'ultima versione disponibile:

```bash
docker exec evansvision-ai-service-1 python3 /app/app/datasets/download_data.py
```

Questo comando:
1. Scarica il file `Matches.csv` (~43MB, 230.000+ partite totali) dal repository `xgabora/Club-Football-Match-Data-2000-2025`
2. Filtra solo le 5 leghe principali: E0 (Premier), I1 (Serie A), SP1 (La Liga), D1 (Bundesliga), F1 (Ligue 1)
3. Estrae le colonne necessarie: `league, date, home_team, away_team, home_goals, away_goals, season`
4. Salva il risultato in `/app/datasets/matches.csv` (~43.700 partite)

### Dataset Sintetico di Fallback

Se il download fallisce, puoi generare un dataset sintetico:

```bash
docker exec evansvision-ai-service-1 python3 /app/make_data.py
```

Crea 200 partite fittizie tra le 16 squadre del database. Utile solo per test.

### Verificare lo Stato del Modello

```bash
curl http://localhost:8000/api/v1/model-info
```

**Risposta** (modello addestrato):
```json
{
  "trained": true,
  "feature_count": 17,
  "metrics": { ... }
}
```

**Risposta** (modello non addestrato):
```json
{
  "trained": false,
  "feature_count": 0,
  "metrics": {}
}
```

### Configurazione dell'Addestramento

I parametri di training sono in `ai-service/app/config/settings.py`:

```python
TRAINING_CONFIG = {
    "epochs": 100,           # Epoche massime
    "batch_size": 32,        # Dimensione del batch
    "validation_split": 0.2, # 20% del training set per validazione
    "test_split": 0.1,       # 10% del totale per test finale
    "learning_rate": 0.001,  # Learning rate iniziale
    "early_stopping_patience": 10,  # Ferma se val_loss non migliora per 10 epoche
    "reduce_lr_patience": 5,        # Riduci LR se non migliora per 5 epoche
    "reduce_lr_factor": 0.5,        # Fattore di riduzione LR
}
```

I parametri di feature engineering:

```python
FEATURE_CONFIG = {
    "rolling_windows": [5, 10],     # Finestre per medie mobili
    "use_ewma": True,               # Usa media ponderata esponenziale
    "ewma_alpha": 0.3,              # Fattore di smoothing EWMA
    "use_elo": True,                # Calcola Elo ratings
    "elo_k": 32,                    # K-factor per Elo
    "elo_initial": 1500,            # Elo iniziale per ogni squadra
}
```

### Interpretare i Risultati del Training

La matrice di confusione mostra come il modello classifica i 3 esiti:

```
         │  Predetto
         │  Casa  Pareggio  Fuori
─────────┼─────────────────────────
Reale    │
Casa     │  1061    536      392    ← 1061 vittorie casa corrette
Pareggio │   419    355      354    ← 355 pareggi corretti
Fuori    │   286    353      599    ← 599 vittorie fuori corrette
```

- **Accuracy**: percentuale di predizioni corrette sul totale
- **Precision/F1**: medie pesate per classe
- **Loss**: cross-entropy loss, più basso è meglio

> **Nota**: Un'accuracy del 46-51% è realistica per le previsioni calcistiche. Il baseline casuale è 33% (3 esiti equiprobabili). I bookmaker professionisti operano intorno al 50-55%.

---

## 📡 API Endpoints

### AI Service (`http://localhost:8000`)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/` | Info servizio |
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/predict` | Predici un match |
| `POST` | `/api/v1/train` | Addestra/riaddestra il modello |
| `GET` | `/api/v1/model-info` | Info e metriche del modello |

#### `POST /api/v1/predict`

```json
{
  "home_team": "Inter",
  "away_team": "Milan",
  "home_stats": {
    "pts_last_5": 2.4,
    "pts_last_10": 2.2,
    "gf_avg_5": 1.8,
    "gf_avg_10": 1.7,
    "ga_avg_5": 0.9,
    "ga_avg_10": 1.0,
    "ewma_pts": 2.3,
    "xg_avg": 1.8,
    "elo": 1650
  },
  "away_stats": {
    "pts_last_5": 1.8,
    "pts_last_10": 1.9,
    "gf_avg_5": 1.5,
    "gf_avg_10": 1.4,
    "ga_avg_5": 1.1,
    "ga_avg_10": 1.2,
    "ewma_pts": 1.7,
    "xg_avg": 1.5,
    "elo": 1580
  }
}
```

**Risposta**:
```json
{
  "home_win": 0.405,
  "draw": 0.33,
  "away_win": 0.265,
  "confidence": 0.405,
  "predicted_result": "Home Win",
  "predicted_score": "2-2"
}
```

### Backend API (`http://localhost:4000`)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/teams` | Elenco squadre |
| `GET` | `/api/v1/teams/:id` | Dettaglio squadra |
| `GET` | `/api/v1/teams/stats/summary` | Squadre con statistiche |
| `GET` | `/api/v1/matches` | Ultime 50 partite |
| `GET` | `/api/v1/matches/:id` | Dettaglio partita |
| `GET` | `/api/v1/dashboard/stats` | Statistiche dashboard |
| `POST` | `/api/v1/predict` | Predici (usa ID squadre) |
| `GET` | `/api/v1/predictions/:matchId` | Recupera predizione |
| `GET` | `/api/v1/model-info` | Info modello dall'AI |
| `POST` | `/api/v1/auth/register` | Registrazione |
| `POST` | `/api/v1/auth/login` | Login |

#### `POST /api/v1/predict` (Backend)

```json
{
  "homeTeamId": "uuid-home-team",
  "awayTeamId": "uuid-away-team"
}
```

Il backend recupera automaticamente le statistiche delle squadre dal database e le invia all'AI Service.

---

## 🗄️ Schema del Database

```
┌─────────────┐       ┌─────────────┐       ┌──────────────┐
│    Team     │       │    Match    │       │  Prediction  │
├─────────────┤       ├─────────────┤       ├──────────────┤
│ id (UUID)   │◄──────│ homeTeamId  │       │ id (UUID)    │
│ name (uniq) │       │ awayTeamId  │◄──────│ matchId (uq) │
│ league      │       │ homeGoals   │       │ homeProb     │
│ country     │       │ awayGoals   │       │ drawProb     │
│ logo        │       │ date        │       │ awayProb     │
│ eloRating   │       │ competition │       │ confidence   │
│ createdAt   │       │ season      │       │ result       │
└──────┬──────┘       └─────────────┘       │ score        │
       │                                    └──────────────┘
       │ 1:1
┌──────▼──────────┐    ┌──────────────┐
│ TeamStatistics  │    │  MatchStats  │
├─────────────────┤    ├──────────────┤
│ id (UUID)       │    │ id (UUID)    │
│ teamId (uniq)   │    │ matchId (uq) │
│ xg              │    │ homeXg       │
│ xga             │    │ awayXg       │
│ shots           │    │ homeShots    │
│ possession      │    │ awayShots    │
│ formPoints      │    │ homeShotsOT  │
│ winRate         │    │ awayShotsOT  │
│ updatedAt       │    │ homePoss     │
└─────────────────┘    │ awayPoss     │
                       └──────────────┘

┌──────────────┐    ┌──────────────┐
│  EloHistory  │    │     User     │
├──────────────┤    ├──────────────┤
│ id (UUID)    │    │ id (UUID)    │
│ teamId       │    │ email (uniq) │
│ rating       │    │ passwordHash │
│ date         │    │ name         │
│ createdAt    │    │ createdAt    │
└──────────────┘    └──────────────┘
```

### Squadre Pre-caricate (Seed)

Il seed `backend/prisma/seed.ts` inserisce 16 squadre:

| Squadra | Lega | Elo |
|---------|------|-----|
| Inter | Serie A | 1650 |
| Milan | Serie A | 1580 |
| Juventus | Serie A | 1600 |
| Napoli | Serie A | 1570 |
| Roma | Serie A | 1520 |
| Manchester City | Premier League | 1700 |
| Arsenal | Premier League | 1620 |
| Liverpool | Premier League | 1640 |
| Chelsea | Premier League | 1550 |
| Manchester United | Premier League | 1530 |
| Bayern Munich | Bundesliga | 1680 |
| Borussia Dortmund | Bundesliga | 1560 |
| Barcelona | La Liga | 1630 |
| Real Madrid | La Liga | 1690 |
| Atletico Madrid | La Liga | 1570 |
| Paris Saint-Germain | Ligue 1 | 1660 |

Per ogni squadra vengono create statistiche casuali (xg, xga, tiri, possesso, forma, win rate) e 30 partite fittizie con predizioni.

---

## 📁 Struttura del Progetto

```
EvansVision/
├── docker-compose.yml          # Orchestrazione container
├── .gitignore
├── .dockerignore
│
├── ai-service/                 # 🧠 AI / Machine Learning
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── make_data.py            # Generatore dataset sintetico
│   ├── app/
│   │   ├── main.py             # FastAPI entry point
│   │   ├── config/
│   │   │   └── settings.py     # Iperparametri e percorsi
│   │   ├── controllers/
│   │   │   └── predict_controller.py  # Endpoint REST
│   │   ├── datasets/
│   │   │   └── download_data.py       # Download dataset reale
│   │   ├── models/
│   │   │   └── network.py      # Architettura rete neurale
│   │   ├── services/
│   │   │   ├── feature_engineering.py  # 17 feature numeriche
│   │   │   └── prediction.py           # Inferenza
│   │   └── training/
│   │       └── trainer.py      # Addestramento modello
│   ├── datasets/               # Dataset CSV (generato)
│   └── saved_models/           # Modello addestrato
│       ├── model.keras
│       ├── scaler.pkl
│       └── feature_cols.pkl
│
├── backend/                    # 🌐 API REST
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   ├── prisma/
│   │   ├── schema.prisma       # Schema database
│   │   └── seed.ts             # Dati iniziali
│   └── src/
│       ├── app.ts              # Express entry point
│       ├── config/
│       │   └── index.ts        # Variabili d'ambiente
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── match.controller.ts
│       │   ├── prediction.controller.ts
│       │   └── team.controller.ts
│       ├── services/
│       │   ├── auth.service.ts
│       │   ├── prediction.service.ts  # Chiama AI Service
│       │   └── team.service.ts
│       ├── middleware/
│       │   └── auth.ts         # JWT middleware
│       ├── models/
│       │   └── index.ts        # Prisma client
│       ├── validators/
│       │   └── index.ts        # Zod schemas
│       └── dto/
│           └── index.ts        # TypeScript interfacce
│
└── apps/
    └── frontend/               # 🎨 UI
        ├── Dockerfile
        ├── package.json
        ├── next.config.js
        ├── tailwind.config.ts
        ├── app/
        │   ├── layout.tsx      # Root layout dark mode
        │   ├── page.tsx        # Homepage con stats
        │   ├── dashboard/page.tsx    # Dashboard AI
        │   ├── predict/page.tsx      # Pagina predizione
        │   └── teams/[id]/page.tsx   # Dettaglio squadra
        ├── components/
        │   ├── charts/FormChart.tsx
        │   ├── dashboard/AIConfidenceGauge.tsx
        │   ├── layout/Navbar.tsx
        │   ├── prediction/PredictionCard.tsx
        │   ├── prediction/ProbabilityBar.tsx
        │   └── teams/TeamComparison.tsx
        ├── services/
        │   └── api.ts          # Axios client
        ├── types/
        │   └── index.ts        # TypeScript types
        └── styles/
            └── globals.css     # Stili globali + variabili CSS
```

---

## ⚙️ Variabili d'Ambiente

### Backend (`.env`)

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `DATABASE_URL` | `postgresql://evans:evans_secret@localhost:5432/evansvision` | Connessione PostgreSQL |
| `JWT_SECRET` | `evans_jwt_secret_change_in_prod` | Segreto per JWT |
| `AI_SERVICE_URL` | `http://localhost:8000` | URL dell'AI service |
| `PORT` | `4000` | Porta del backend |
| `CORS_ORIGIN` | `http://localhost:3000` | Origine CORS |

### AI Service

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `MODEL_PATH` | `saved_models` | Percorso dove salvare/caricare il modello |

### Frontend

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | URL del backend (client-side) |

---

## 🐳 Comandi Docker Utili

```bash
# Avviare tutto
docker compose up -d

# Ricostruire un servizio specifico
docker compose up -d --build ai-service

# Log in tempo reale
docker logs -f evansvision-ai-service-1

# Eseguire comandi dentro un container
docker exec evansvision-ai-service-1 python3 /app/app/datasets/download_data.py

# Reset completo (perde i dati)
docker compose down -v
docker compose up -d --build

# Shell interattiva
docker exec -it evansvision-backend-1 sh

# Copiare file dentro/da un container
docker cp ./file.txt evansvision-ai-service-1:/app/file.txt
docker cp evansvision-ai-service-1:/app/file.txt ./file.txt
```

---

## 🔧 Troubleshooting

### L'AI Service non risponde

```bash
# Verifica salute
curl http://localhost:8000/api/v1/health

# Controlla log
docker logs evansvision-ai-service-1

# Se "generator already executing", riavvia
docker restart evansvision-ai-service-1
```

### Il Backend non si connette al database

```bash
# Verifica che postgres sia attivo
docker ps | grep postgres

# Controlla la connessione
docker exec evansvision-backend-1 sh -c "nc -zv postgres 5432"
```

### Errore "TLS handshake failed" durante download dati

Il dataset non viene più scaricato da `football-data.co.uk` (server con TLS non funzionante). Viene usato un mirror cache su GitHub: `xgabora/Club-Football-Match-Data-2000-2025`.

Se anche GitHub non fosse raggiungibile, usa il dataset sintetico:

```bash
docker exec evansvision-ai-service-1 python3 /app/make_data.py
docker exec evansvision-ai-service-1 sh -c 'curl ... -d "{\"data_path\": \"/app/datasets/matches.csv\"}"'
```

### Modello non addestrato

```bash
curl http://localhost:8000/api/v1/model-info
# → {"trained": false, ...}

# Addestra subito
docker exec evansvision-ai-service-1 python3 /app/app/datasets/download_data.py
docker exec evansvision-ai-service-1 sh -c 'curl -s -X POST http://localhost:8000/api/v1/train -H "Content-Type: application/json" -d "{\"data_path\": \"/app/datasets/matches.csv\"}"'
```

---

## 📈 Performance del Modello

Con il dataset reale di 43.708 partite (2000-2025, 5 leghe):

| Metrica | Valore |
|---------|--------|
| Accuracy | ~46-51% |
| Test samples | 4.355 |
| Training samples | 31.348 |
| Feature count | 17 |
| Baseline casuale | 33% |

La qualità delle predizioni dipende dalla quantità e qualità dei dati. Per migliorare il modello:
- Aggiungere più leghe (il dataset ne contiene 42 totali)
- Includere feature come quote dei bookmaker
- Aumentare le epoche o la complessità della rete
- Ingegnerizzare feature più sofisticate (xG, possession, etc.)

---

## 📚 Fonti dei Dati

- **Football-Data.co.uk** (Joseph Buchdahl) — Fonte originale dei risultati e statistiche
- **ClubElo.com** — Elo ratings storici
- **GitHub xgabora/Club-Football-Match-Data-2000-2025** — Mirror cache unificato con 475.000+ partite da 42 leghe

---

## 📄 Licenza

Progetto educativo. I dati appartengono ai rispettivi creatori (football-data.co.uk, ClubElo).
