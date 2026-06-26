# EvansVision

> Piattaforma di previsioni calcistiche basata su Machine Learning, addestrata su 45.000+ partite reali delle top 5 leghe europee (Serie A, Premier League, La Liga, Bundesliga, Ligue 1) dal 1999 al 2026.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.16-FF6F00?logo=tensorflow&logoColor=white)](https://www.tensorflow.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/license-Educational-blue)](#-licenza)

### [Prova l'app live](https://frontend-35p0101s-projects.vercel.app)

---

## Cos'e

EvansVision e un'applicazione full-stack che combina un frontend moderno, un backend API e un servizio di Machine Learning per predire l'esito di partite di calcio. Non e un semplice generatore di numeri casuali: usa una rete neurale addestrata su decine di migliaia di partite reali, con feature ingegnerizzate a partire da statistiche di gioco, ratings Elo, forme recenti e scontri diretti.

### Cosa puoi fare

- **Predire un match** — seleziona due squadre e ricevi probabilita di vittoria/pareggio/sconfitta, risultato predetto e score
- **Esplorare le squadre** — visualizza 220 squadre con rating Elo, xG, tiro di vittoria, forma recente (ultime 5/10 partite)
- **Dashboard AI** — metriche del modello (accuracy, precision, recall, F1, matrice di confusione)
- **Storico predizioni** — tutte le predizioni effettuate, con dettaglio squadre e probabilita

---

## Architettura

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│    Frontend     │────▶│   Backend    │────▶│   AI Service    │
│   (Next.js)     │     │  (Express)   │     │   (FastAPI)     │
│  Vercel         │     │  Railway     │     │   Railway       │
└─────────────────┘     └──────┬───────┘     └─────────────────┘
                               │
                          ┌────▼──────┐
                          │ PostgreSQL │
                          │  Railway   │
                          └───────────┘
```

Tre microservizi che comunicano via REST. Il flusso di una predizione:

1. L'utente seleziona due squadre dal **Frontend** (React, client-side).
2. Il **Backend** recupera statistiche dal DB, calcola feature aggiuntive (H2H, EWMA, forma) e chiama l'**AI Service**.
3. L'**AI Service** costruisce le 22 feature numeriche, le normalizza con `StandardScaler` e le passa alla rete neurale TensorFlow.
4. La rete restituisce le probabilita `[Home Win, Draw, Away Win]` con confidence e score predetto.
5. La predizione viene salvata nel database e mostrata all'utente.

---

## Live Deployment

| Servizio | URL | Piattaforma |
|----------|-----|-------------|
| **Frontend** | [frontend-35p0101s-projects.vercel.app](https://frontend-35p0101s-projects.vercel.app) | Vercel |
| **Backend API** | [backend-production-0a15.up.railway.app](https://backend-production-0a15.up.railway.app) | Railway |
| **AI Service** | [evansvision-production.up.railway.app](https://evansvision-production.up.railway.app) | Railway |
| **Database** | PostgreSQL su Railway (privato) | Railway |

---

## Stack tecnologico

| Servizio | Tecnologie |
|----------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, Recharts, TanStack Query |
| **Backend** | Express 4, TypeScript, Prisma 5, Zod, JWT, helmet, express-rate-limit, pino |
| **AI Service** | Python 3.12, FastAPI, TensorFlow 2.16, scikit-learn, pandas, NumPy |
| **Database** | PostgreSQL 16 |
| **Test** | Jest, supertest, ts-jest |
| **Infra** | Docker, Docker Compose |

---

## Quick Start (locale con Docker)

### Prerequisiti

- [Docker](https://www.docker.com/get-started) & Docker Compose
- Git

### 1. Clona e configura

```bash
git clone https://github.com/35p0101/EvansVision.git
cd EvansVision
cp .env.example .env
# Genera un JWT_SECRET sicuro:
openssl rand -hex 32
# Incolla il valore nel .env
```

### 2. Avvia i container

```bash
docker compose up -d --build
```

| Container  | Tempo di avvio          | Health check                                   |
|------------|------------------------|------------------------------------------------|
| postgres   | ~5s                    | `pg_isready`                                   |
| ai-service | ~30-60s (load TF)      | `GET /api/v1/health`                           |
| backend    | ~20-30s                | `GET /api/v1/health`                           |
| frontend   | ~30-60s (build Next)   | http://localhost:3000                          |

### 3. Inizializza il database e allena il modello

```bash
# Migrazioni Prisma (eseguite automaticamente da start.sh)
docker compose exec backend npx prisma db push

# Seed con 220 squadre + statistiche + 45.000+ partite
docker compose exec backend npm run prisma:seed

# Scarica dataset reale (~2.6MB)
docker compose exec ai-service python3 /app/app/datasets/download_data.py

# Allena la rete neurale (~2-5 min)
curl -X POST http://localhost:8000/api/v1/train \
  -H "Content-Type: application/json" \
  -d '{"data_path": "/app/datasets/matches.csv"}'
```

### 4. Apri l'app

[http://localhost:3000](http://localhost:3000)

---

## Performance del modello

Con il dataset reale di 45.459 partite (1999-2026, 5 leghe):

| Metrica           | Valore      |
|-------------------|-------------|
| Accuracy          | ~48%        |
| Precision         | ~48%        |
| Recall            | ~48%        |
| F1 Score          | ~48%        |
| Test samples      | 4.417       |
| Training samples  | 31.802      |
| Feature count     | 22          |
| Baseline casuale  | 33%         |
| Bookmaker pro     | ~50-55%     |

Il modello supera la baseline casuale del 35% (da 33% a 48%), performing vicino ai livelli dei bookmaker professionali. La complessita del calcio rende difficile superare il 55%.

---

## Come funziona il Machine Learning

### Le 22 feature

Ogni partita viene convertita in un vettore di 22 numeri:

| Categoria | Feature | Descrizione |
|-----------|---------|-------------|
| **Forma** | `pts_last_5`, `pts_last_10` | Punti medi ultime 5/10 partite |
| **Attacco** | `gf_avg_5`, `gf_avg_10` | Gol fatti medi (ultime 5/10) |
| **Difesa** | `ga_avg_5`, `ga_avg_10` | Gol subiti medi (ultime 5/10) |
| **Momentum** | `ewma_pts` | Exponential Weighted Moving Average dei punti (alpha=0.3) |
| **Efficienza** | `form_ppg` | Punti per partita nella stagione |
| **Expected** | `xg_avg` | xG medio (expected goals) |
| **Rating** | `elo` | Elo rating (K=32, baseline 1500) |
| **H2H** | `h2h_home_wins`, `h2h_draws`, `h2h_away_wins` | Bilancio scontri diretti (ultime 5) |

Ogni feature e calcolata sia per la squadra di casa che per quella ospite = 22 feature totali.

### Architettura della rete

```
Input (22) → Dense(128) → BatchNorm → ReLU → Dropout(0.3)
          → Dense(64)  → BatchNorm → ReLU → Dropout(0.3)
          → Dense(32)  → BatchNorm → ReLU → Dropout(0.3)
          → Dense(3)   → Softmax
```

- **Loss**: Sparse Categorical Crossentropy
- **Optimizer**: Adam (lr=0.001, ridotto automaticamente)
- **Class weights**: bilanciamento automatico per compensare la distribuzione sbilanciata (home wins ~46%, draws ~26%, away wins ~28%)
- **Early stopping**: patience=10 epochs
- **Riduzione LR**: factor=0.5, patience=5

---

## Struttura del progetto

```
EvansVision/
├── ai-service/                  # Python + TensorFlow
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── controllers/         # Endpoint REST (predict, train, model-info)
│   │   ├── models/              # Rete neurale Keras
│   │   ├── services/            # Feature engineering, inferenza
│   │   ├── training/            # Trainer (train, save, load)
│   │   ├── config/              # Settings, path dei modelli
│   │   └── datasets/            # Download dataset reale
│   ├── saved_models/            # Modelli addestrati (.keras, .pkl)
│   ├── Dockerfile
│   └── requirements.txt
│
├── backend/                     # Node.js + Express + Prisma
│   ├── src/
│   │   ├── app.ts               # Express (helmet, rate-limit, CORS, logger)
│   │   ├── config/              # Config con validazione in produzione
│   │   ├── controllers/         # Route handlers (teams, matches, predictions, auth)
│   │   ├── services/            # Business logic (prediction.service, team.service)
│   │   ├── middleware/          # Auth JWT, error handler
│   │   ├── lib/logger.ts        # Pino con redact su secrets
│   │   └── validators/          # Schemi Zod
│   ├── prisma/
│   │   ├── schema.prisma        # Modelli DB (Team, Match, Prediction, TeamStatistics)
│   │   └── seed.ts              # Seed con 220 squadre + 45.000+ partite
│   ├── tests/                   # Jest + supertest
│   ├── start.sh                 # Entry script (migrate + start)
│   ├── Dockerfile
│   └── package.json
│
├── apps/
│   └── frontend/                # Next.js 14 App Router
│       ├── app/
│       │   ├── page.tsx         # Home (stats, top teams)
│       │   ├── predict/page.tsx # Predizione match
│       │   ├── teams/page.tsx   # Lista squadre
│       │   └── dashboard/page.tsx # Dashboard AI
│       ├── components/          # UI components
│       ├── services/api.ts      # Axios client
│       ├── vercel.json          # Config Vercel
│       └── Dockerfile
│
├── documentazione/              # Docs dettagliate
│   ├── README.md                # Documentazione tecnica completa
│   ├── DEPLOY.md                # Guida deploy step-by-step
│   ├── PRESENTAZIONE.md         # Pitch del progetto
│   └── README_SPIEGAZIONE.md    # Spiegazione discorsiva
│
├── docker-compose.yml           # Prod
├── docker-compose.override.yml  # Dev (hot reload, mount sorgenti)
├── .env.example                 # Template variabili d'ambiente
└── README.md                    # Questo file
```

---

## Variabili d'ambiente

Vedi [`.env.example`](.env.example) per la lista completa. Le principali:

| Variabile             | Default                                                     | Note                                          |
|-----------------------|-------------------------------------------------------------|-----------------------------------------------|
| `JWT_SECRET`          | _(obbligatoria in prod)_                                    | Genera con `openssl rand -hex 32`             |
| `DATABASE_URL`        | `postgresql://evans:evans_secret@postgres:5432/evansvision` | URL Postgres                                  |
| `CORS_ORIGIN`         | `http://localhost:3000`                                     | Origini ammesse (separate da virgola)         |
| `AI_SERVICE_URL`      | `http://localhost:8000`                                     | URL del servizio AI                           |
| `AI_ALLOWED_ORIGINS`  | `http://localhost:4000,http://backend:4000`                 | CORS lockdown sull'AI service                 |
| `NODE_ENV`            | `production`                                                | `production` attiva validazioni di sicurezza  |
| `BCRYPT_ROUNDS`       | `12`                                                        | Cost factor per hashing password              |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000`                                     | URL API per il frontend (esposto al browser)  |

---

## API Endpoints

### Backend

| Metodo | Endpoint                       | Descrizione                 | Auth |
|--------|--------------------------------|-----------------------------|------|
| GET    | `/api/v1/health`               | Health check                | No   |
| GET    | `/api/v1/teams`                | Lista tutte le squadre      | No   |
| GET    | `/api/v1/teams/:id`            | Dettaglio squadra + stats   | No   |
| GET    | `/api/v1/matches`              | Ultime 50 partite           | No   |
| GET    | `/api/v1/dashboard/stats`      | Stats dashboard (count)     | No   |
| POST   | `/api/v1/predict`              | Predici un match            | No   |
| GET    | `/api/v1/predictions`          | Storico predizioni          | No   |
| GET    | `/api/v1/predictions/:matchId` | Predizione specifica        | No   |
| GET    | `/api/v1/model-info`           | Metriche modello AI         | No   |
| POST   | `/api/v1/auth/register`        | Registrazione utente        | No   |
| POST   | `/api/v1/auth/login`           | Login + JWT token           | No   |

### AI Service

| Metodo | Endpoint               | Descrizione                  |
|--------|------------------------|------------------------------|
| GET    | `/`                    | Info servizio                |
| GET    | `/api/v1/health`       | Health check                 |
| POST   | `/api/v1/predict`      | Predizione (feature raw)     |
| POST   | `/api/v1/train`        | Addestramento modello        |
| GET    | `/api/v1/model-info`   | Metriche modello             |

### Esempio predizione

```bash
curl -X POST https://backend-production-0a15.up.railway.app/api/v1/predict \
  -H "Content-Type: application/json" \
  -d '{"homeTeamId": "<uuid>", "awayTeamId": "<uuid>"}'
```

Risposta:
```json
{
  "homeWin": 0.52,
  "draw": 0.26,
  "awayWin": 0.22,
  "confidence": 0.52,
  "predictedResult": "H",
  "predictedScore": "2-1"
}
```

---

## Database

Il schema Prisma definisce 4 entita principali:

- **Team** — 220 squadre con nome, lega, paese, Elo rating
- **TeamStatistics** — xG, xG Against, tiri, possesso, win rate, EWMA, forma
- **Match** — 45.459 partite con data, stagione, risultato, goals
- **Prediction** — storico predizioni con probabilita e risultato predetto

Relazioni:
- Team 1:1 TeamStatistics
- Team 1:N Match (come home/away)
- Team 1:N Prediction (come home/away)

---

## Deploy in produzione

L'app e attualmente deployata su:

| Servizio | Piattaforma | Note |
|----------|-------------|------|
| Frontend | **Vercel** | Auto-deploy da GitHub, edge network globale |
| Backend + AI + DB | **Railway** | Deploy da GitHub, PostgreSQL managed |
| Modelli ML | **Railway** | Salvati nel filesystem del container AI |

### Deploy locale con Docker

```bash
docker compose up -d --build
```

### Deploy manuale

Vedi [`documentazione/DEPLOY.md`](documentazione/DEPLOY.md) per la guida completa.

---

## Sviluppo

```bash
# Modalita dev con hot reload
docker compose up

# Backend in locale (richiede Postgres su :5432)
cd backend
npm install
npm run dev

# Type check
npm run typecheck

# Test
npm test

# Prisma Studio (GUI per il DB)
npm run prisma:studio

# Frontend in locale
cd apps/frontend
npm install
npm run dev
```

---

## Sicurezza

Misure attive:

- `helmet` per security headers HTTP
- `express-rate-limit`: 5 tentativi/15min su `/auth/*`, 120 req/min globali
- CORS con allowlist per backend e AI service
- bcrypt con cost factor 12
- JWT_SECRET validato a runtime in `NODE_ENV=production` (lancia eccezione se debole o assente)
- Pino logger con redact su `authorization`, `cookie`, `password`, `token`
- Container backend con utente non-root
- Body JSON limitato a 100KB

> **Non** usare i default in `.env.example` per produzione. Genera `JWT_SECRET` con `openssl rand -hex 32`.

---

## Testing

```bash
cd backend
npm test                  # Esegue tutti i test
npm run test:watch        # Watch mode
npm run typecheck         # Solo type check, senza emit
```

I test usano Jest + ts-jest + supertest per test end-to-end HTTP.

---

## Fonti dei dati

- **[Football-Data.co.uk](https://www.football-data.co.uk)** — Risultati e statistiche storiche (Joseph Buchdahl)
- **[ClubElo.com](http://clubelo.com)** — Elo ratings storici
- **[xgabora/Club-Football-Match-Data-2000-2025](https://github.com/xgabora/Club-Football-Match-Data-2000-2025)** — Mirror cache unificato (475.000+ partite, 42 leghe)

---

## Documentazione approfondita

| Documento                                                          | Contenuto                                  |
|--------------------------------------------------------------------|--------------------------------------------|
| [documentazione/README.md](documentazione/README.md)               | Architettura, ML, feature, training, API   |
| [documentazione/DEPLOY.md](documentazione/DEPLOY.md)               | Deploy step-by-step su Railway + Vercel    |
| [documentazione/PRESENTAZIONE.md](documentazione/PRESENTAZIONE.md) | Pitch del progetto                         |
| [documentazione/README_SPIEGAZIONE.md](documentazione/README_SPIEGAZIONE.md) | Spiegazione discorsiva                     |

---

## Licenza

Progetto educativo. I dati appartengono ai rispettivi creatori (football-data.co.uk, ClubElo).

---

<sub>Made by [@35p0101](https://github.com/35p0101)</sub>
