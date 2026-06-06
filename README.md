# EvansVision

> Piattaforma di previsioni calcistiche basata su Machine Learning, addestrata su 43.000+ partite reali delle top 5 leghe europee (Serie A, Premier League, La Liga, Bundesliga, Ligue 1) dal 2000 al 2025.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.16-FF6F00?logo=tensorflow&logoColor=white)](https://www.tensorflow.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/license-Educational-blue)](#-licenza)

---

## Architettura

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

Tre microservizi containerizzati che comunicano via REST. Il flusso tipico di una predizione:

1. L'utente seleziona due squadre dal **Frontend**.
2. Il **Backend** recupera dati e statistiche dal DB, calcola feature aggiuntive (head-to-head, EWMA, forma) e inoltra all'**AI Service**.
3. L'**AI Service** costruisce le 17 feature numeriche, le normalizza con `StandardScaler` e le passa alla rete neurale.
4. La rete restituisce `[Home Win, Draw, Away Win]` con confidence e score predetto.
5. La predizione viene salvata nel database e mostrata all'utente.

---

## Funzionalità

- **Predizioni** in tempo reale con 17 feature (medie mobili, EWMA, Elo rating, H2H)
- **Rete neurale profonda** TensorFlow/Keras con BatchNorm + Dropout + L2
- **Sistema Elo** implementato manualmente (K=32, baseline 1500)
- **Dashboard** con metriche del modello e statistiche delle squadre
- **Autenticazione** JWT con bcrypt
- **Rate limiting** anti-bruteforce sugli endpoint di auth
- **Logger strutturato** con redact automatico su token e password
- **Docker Compose** per orchestrazione completa con healthchecks

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

## Quick Start

### Prerequisiti

- [Docker](https://www.docker.com/get-started) & Docker Compose
- Git

### 1. Clona e configura

```bash
git clone https://github.com/35p0101/EvansVision.git
cd EvansVision
cp .env.example .env
# Modifica .env e imposta almeno JWT_SECRET (genera con: openssl rand -hex 32)
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
# Migrazioni Prisma (eseguite automaticamente da start.sh, ma puoi forzarle)
docker compose exec backend npx prisma db push

# Seed con 16 squadre top europee + statistiche + 30 partite fittizie
docker compose exec backend npm run prisma:seed

# Scarica dataset reale (~43.700 partite, ~3MB)
docker compose exec ai-service python3 /app/app/datasets/download_data.py

# Allena la rete neurale (~2-5 min)
docker compose exec ai-service curl -s -X POST http://localhost:8000/api/v1/train \
  -H "Content-Type: application/json" \
  -d '{"data_path": "/app/datasets/matches.csv"}'
```

### 4. Apri l'app

[http://localhost:3000](http://localhost:3000)

---

## Performance del modello

Con il dataset reale di 43.708 partite (2000-2025, 5 leghe):

| Metrica           | Valore   |
|-------------------|----------|
| Accuracy          | ~46-51%  |
| Test samples      | 4.355    |
| Training samples  | 31.348   |
| Feature count     | 17       |
| Baseline casuale  | 33%      |
| Bookmaker pro     | ~50-55%  |

---

## Struttura del progetto

```
EvansVision/
├── ai-service/              # Python + TensorFlow
│   ├── app/
│   │   ├── main.py          # FastAPI entry
│   │   ├── controllers/     # Endpoint REST
│   │   ├── models/          # Rete neurale Keras
│   │   ├── services/        # Feature engineering, inferenza
│   │   ├── training/        # Trainer
│   │   └── datasets/        # Download dataset reale
│   └── Dockerfile
│
├── backend/                 # Node.js + Express + Prisma
│   ├── src/
│   │   ├── app.ts           # Express app (helmet, rate-limit, CORS, logger)
│   │   ├── config/          # Config con validazione prod
│   │   ├── controllers/     # Route handlers
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth, error handler
│   │   ├── lib/logger.ts    # Pino con redact
│   │   └── validators/      # Schemi Zod
│   ├── prisma/
│   │   ├── schema.prisma    # Modelli DB
│   │   └── seed.ts          # Seed iniziale
│   ├── tests/               # Jest + supertest
│   └── Dockerfile
│
├── apps/
│   └── frontend/            # Next.js 14 App Router
│       ├── app/             # Pages (dashboard, predict, teams)
│       ├── components/      # UI components
│       └── Dockerfile
│
├── documentazione/          # Docs dettagliate
│   ├── README.md            # Documentazione tecnica completa
│   ├── DEPLOY.md            # Guida deploy (Vercel + Railway + Supabase)
│   ├── PRESENTAZIONE.md     # Pitch del progetto
│   └── README_SPIEGAZIONE.md
│
├── docker-compose.yml          # Prod
├── docker-compose.override.yml # Dev (--reload, mount sorgenti)
├── .env.example                # Template variabili
└── README.md                   # Questo file
```

---

## Variabili d'ambiente

Vedi [`.env.example`](.env.example) per la lista completa. Le principali:

| Variabile             | Default                                                     | Note                                          |
|-----------------------|-------------------------------------------------------------|-----------------------------------------------|
| `JWT_SECRET`          | _(obbligatoria in prod)_                                    | Genera con `openssl rand -hex 32`             |
| `DATABASE_URL`        | `postgresql://evans:evans_secret@postgres:5432/evansvision` | URL Postgres                                  |
| `CORS_ORIGIN`         | `http://localhost:3000`                                     | Origini ammesse (separate da virgola)         |
| `AI_ALLOWED_ORIGINS`  | `http://localhost:4000,http://backend:4000`                 | CORS lockdown sull'AI service                 |
| `NODE_ENV`            | `production`                                                | `production` attiva validazioni di sicurezza  |
| `BCRYPT_ROUNDS`       | `12`                                                        | Cost factor per hashing password              |

---

## Sviluppo

```bash
# Modalità dev con hot reload (usa docker-compose.override.yml automaticamente)
docker compose up

# Backend in locale (richiede Postgres su :5432)
cd backend
npm install
npm run dev

# Type check
npm run typecheck

# Test
npm test

# Prisma Studio (GUI DB)
npm run prisma:studio
```

---

## API Endpoints

### Backend (`:4000`)

| Metodo | Endpoint                      | Descrizione                |
|--------|-------------------------------|----------------------------|
| GET    | `/api/v1/health`              | Health check               |
| GET    | `/api/v1/teams`               | Lista squadre              |
| GET    | `/api/v1/teams/:id`           | Dettaglio squadra          |
| GET    | `/api/v1/teams/stats/summary` | Squadre con statistiche    |
| GET    | `/api/v1/matches`             | Ultime 50 partite          |
| GET    | `/api/v1/dashboard/stats`     | Statistiche dashboard      |
| POST   | `/api/v1/predict`             | Predici un match           |
| GET    | `/api/v1/predictions/:matchId`| Recupera predizione        |
| GET    | `/api/v1/model-info`          | Info modello dall'AI       |
| POST   | `/api/v1/auth/register`       | Registrazione              |
| POST   | `/api/v1/auth/login`          | Login                      |

### AI Service (`:8000`)

| Metodo | Endpoint               | Descrizione                  |
|--------|------------------------|------------------------------|
| GET    | `/api/v1/health`       | Health check                 |
| POST   | `/api/v1/predict`      | Predizione (stats raw)       |
| POST   | `/api/v1/train`        | Addestramento modello        |
| GET    | `/api/v1/model-info`   | Metriche modello             |

Per dettagli sui payload, vedi [`documentazione/README.md`](documentazione/README.md#-api-endpoints).

---

## Deploy in produzione

Vedi [`documentazione/DEPLOY.md`](documentazione/DEPLOY.md) per la guida completa con:

- **Supabase** per il database (free tier)
- **Railway** per backend + AI service
- **Vercel** per il frontend

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

> Per produzione, **non** usare i default in `.env.example`. Genera `JWT_SECRET` con `openssl rand -hex 32` e usa credenziali DB dedicate.

---

## Testing

```bash
cd backend
npm test                  # Esegue tutti i test
npm run test:watch        # Watch mode
npm run typecheck         # Solo type check, senza emit
```

I test sono organizzati in `backend/tests/` e usano:
- **Jest** + **ts-jest** per il runner TypeScript
- **supertest** per i test end-to-end HTTP

---

## Documentazione approfondita

| Documento                                                          | Contenuto                                  |
|--------------------------------------------------------------------|--------------------------------------------|
| [documentazione/README.md](documentazione/README.md)               | Architettura, ML, feature, training, API   |
| [documentazione/DEPLOY.md](documentazione/DEPLOY.md)               | Deploy step-by-step su Supabase + Railway + Vercel |
| [documentazione/PRESENTAZIONE.md](documentazione/PRESENTAZIONE.md) | Pitch del progetto                         |
| [documentazione/README_SPIEGAZIONE.md](documentazione/README_SPIEGAZIONE.md) | Spiegazione discorsiva                     |

---

## Fonti dei dati

- **[Football-Data.co.uk](https://www.football-data.co.uk)** — Risultati e statistiche storiche (Joseph Buchdahl)
- **[ClubElo.com](http://clubelo.com)** — Elo ratings storici
- **[xgabora/Club-Football-Match-Data-2000-2025](https://github.com/xgabora/Club-Football-Match-Data-2000-2025)** — Mirror cache unificato (475.000+ partite, 42 leghe)

---

## Licenza

Progetto educativo. I dati appartengono ai rispettivi creatori (football-data.co.uk, ClubElo).

---

<sub>Made by [@35p0101](https://github.com/35p0101)</sub>
