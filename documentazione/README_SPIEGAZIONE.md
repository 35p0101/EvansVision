# EvansVision — Spiegazione Completa del Progetto

> Questo documento spiega l'intero progetto EvansVision dal punto di vista di un informatico che non conosce i linguaggi/framework specifici usati, ma ha solide basi di programmazione.

---

## 1. Cos'è EvansVision

EvansVision è una **piattaforma web di previsioni calcistiche basata su machine learning**. L'utente seleziona due squadre e il sistema, tramite una rete neurale, restituisce le probabilità di vittoria casa, pareggio e vittoria trasferta.

### Cosa fa concretamente:
1. **Predice risultati** delle partite di calcio (5 campionati: Premier League, Serie A, La Liga, Bundesliga, Ligue 1)
2. **Mostra statistiche** delle squadre (Elo rating, forma recente, punti fatti/subiti)
3. **Dashboard AI** con metriche del modello (accuratezza, matrice di confusione, ecc.)

---

## 2. Architettura Generale (3 Microservizi)

Il progetto segue un'architettura a **microservizi**: tre applicazioni indipendenti che comunicano tra loro tramite API HTTP, orchestrate da Docker.

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────┐               │
│  │   Frontend        │    │   Backend         │             │
│  │   Next.js (React) │───▶│   Express (TS)    │              │
│  │   Porta 3000      │    │   Porta 4000      │              │
│  └──────────────────┘    └──────┬───────────┘              │
│                                 │                          │
│                                 ▼                          │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │   PostgreSQL     │◀───│   AI Service     │              │
│  │   Database       │    │   FastAPI (Py)   │              │
│  │   Porta 5432     │    │   Porta 8000     │              │
│  └──────────────────┘    └──────────────────┘              │
│                                                             │
│  ┌──────────────────┐                                       │
│  │   Redis          │                                       │
│  │   (opzionale)    │                                       │
│  │   Porta 6379     │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

### Perché microservizi?
- **Separazione delle responsabilità**: ogni servizio fa una cosa sola
- **Scalabilità indipendente**: se l'AI è sotto carico, la si scala senza toccare il frontend
- **Linguaggi diversi**: il backend in TypeScript (tipizzato, buono per API), l'AI in Python (ecosistema ML maturo)

---

## 3. Stack Tecnologico Dettagliato

### 3.1 Frontend — `apps/frontend/`

**Tecnologia: Next.js 14 (framework React)**

Next.js è un **meta-framework per React** che aggiunge:
- **Rendering lato server** (SSR): le pagine vengono pre-renderizzate sul server, poi "idratate" nel browser
- **File-system routing**: ogni file `.tsx` in `app/` diventa automaticamente una route URL
- **App Router**: l'ultimo sistema di routing di Next.js (directory `app/`)

```
apps/frontend/app/
├── page.tsx            →  /          (homepage)
├── predict/page.tsx    →  /predict   (pagina previsioni)
├── dashboard/page.tsx  →  /dashboard (metriche AI)
├── teams/page.tsx      →  /teams     (elenco squadre)
├── teams/[id]/page.tsx →  /teams/:id (dettaglio squadra)
```

**Librerie usate nel frontend:**

| Libreria | Ruolo |
|----------|-------|
| **React** | Libreria UI a componenti |
| **Next.js** | Framework con routing, SSR, build |
| **TypeScript** | JavaScript con tipi statici |
| **Tailwind CSS** | Framework CSS utility-first (classi inline invece di file CSS separati) |
| **Framer Motion** | Animazioni dichiarative |
| **Recharts** | Grafici (line chart, bar chart) |
| **TanStack React Query** | Gestione chiamate API con caching automatico |
| **Axios** | Client HTTP per chiamare il backend |
| **clsx + tailwind-merge** | Utility per concatenare classi Tailwind |

### 3.2 Backend — `backend/`

**Tecnologia: Express.js + TypeScript + Prisma**

| Componente | Ruolo |
|------------|-------|
| **Express.js** | Framework web per Node.js (gestisce route, middleware, ecc.) |
| **TypeScript** | JavaScript con tipi statici (compilato in JS normale) |
| **Prisma** | ORM (Object-Relational Mapping) — traduce chiamate TypeScript in SQL |
| **PostgreSQL** | Database relazionale |

**Prisma ORM — spiegato da zero:**

Prisma è un **ORM** (Object-Relational Mapping). Un ORM è un software che ti permette di interagire con un database scrivendo codice nel tuo linguaggio di programmazione invece di scrivere SQL. In parole povere: invece di scrivere `SELECT * FROM teams WHERE name = 'Arsenal'`, scrivi `prisma.team.findMany({ where: { name: "Arsenal" } })`.

**Come funziona Prisma in 3 passi:**

1. **Definisci la struttura** in un file `schema.prisma` — dichiari le tabelle, le colonne, i tipi e le relazioni (es. "una squadra ha molte partite in casa"). Sembra un JSON strutturato.

2. **Generi il client** con `npx prisma generate` — Prisma legge lo schema e crea automaticamente centinaia di funzioni TypeScript pronte all'uso. Ogni tabella diventa un oggetto con metodi come `findMany()`, `create()`, `update()`. In più, Prisma **genera i tipi TypeScript** automaticamente: se cambi lo schema, il compilatore TypeScript ti segnalerà tutti i punti in cui il codice non è più allineato al DB.

3. **Usi il client** nel codice — importi l'oggetto `prisma` e chiami i suoi metodi. Il risultato è tipizzato: TypeScript sa che `team.eloRating` è un numero e `team.name` è una stringa.

**Esempio concreto nel progetto:**

```typescript
// backend/src/services/prediction.service.ts
const seasonMatches = await prisma.match.findMany({
  where: {
    OR: [
      { homeTeamId: teamId, season },   // partite in casa
      { awayTeamId: teamId, season },   // partite in trasferta
    ],
  },
  orderBy: { date: "asc" },
});
```

Questa funzione TypeScript viene tradotta da Prisma in una query SQL che:
- Cerca nella tabella `matches`
- Tutte le righe dove `home_team_id` = X o `away_team_id` = X
- E `season` = "2025/26"
- Ordinate per data crescente

Il risultato è un array di oggetti Match con tutti i campi (id, homeTeamId, awayTeamId, homeGoals, awayGoals, date, ecc.).

**Altro esempio — inserire una prediction:**

```typescript
await prisma.prediction.create({
  data: {
    matchId: "abc123",
    homeProbability: 0.45,
    drawProbability: 0.32,
    awayProbability: 0.23,
    confidence: 0.45,
    predictedResult: "H",
  },
});
```

Prisma genera: `INSERT INTO predictions (match_id, home_probability, draw_probability, away_probability, confidence, predicted_result) VALUES ('abc123', 0.45, 0.32, 0.23, 0.45, 'H')`.

**Schema del database (definito in `prisma/schema.prisma`):**

### 3.3 AI Service — `ai-service/`

**Tecnologia: FastAPI + TensorFlow + Pandas + scikit-learn**

Prima di spiegare i singoli pezzi, capiamo cosa fa l'AI Service: riceve le statistiche di due squadre, prepara i dati nella forma giusta, li passa a una rete neurale, e restituisce le probabilità di vittoria. Per farlo usa diverse librerie Python:

**1. Pandas (manipolazione dati)**

Pandas è la libreria standard per lavorare con dati tabellari in Python. Il suo cuore è il **DataFrame**: una struttura dati che puoi immaginare come un foglio Excel in memoria, con righe e colonne.

Esempio nel progetto (`feature_engineering.py`):
```python
import pandas as pd

df = pd.read_csv("matches.csv")   # Carica 45.459 righe in memoria
df["target"] = df.apply(
    lambda r: 0 if r["home_goals"] > r["away_goals"]
    else (1 if r["home_goals"] == r["away_goals"] else 2),
    axis=1
)  # Aggiunge colonna: 0=vittoria casa, 1=pareggio, 2=vittoria trasferta
```

Pandas trasforma un CSV in una tabella su cui puoi:
- **Filtrare**: `df[df["season"] == "2025/26"]` (solo stagione corrente)
- **Aggregare**: `df.groupby("home_team")["home_goals"].mean()` (media gol per squadra)
- **Ordinare**: `df.sort_values("date")`
- **Unire**: `pd.concat([df1, df2])` (unire più CSV)
- **Creare colonne**: come nell'esempio sopra

Pandas è scritto in Python puro ma usa NumPy sotto il cofano per le performance. Una sua caratteristica potente è che le operazioni si applicano a **tutte le righe in una volta** (vectorization), senza cicli for espliciti.

Esempio di raggruppamento nel progetto:
```python
# Per ogni squadra, calcola la media gol fatti nelle ultime 5 partite
df.sort_values("date").groupby("team").rolling(5)["goals"].mean()
```

**2. NumPy (calcolo numerico)**

NumPy è la libreria fondamentale per il calcolo numerico in Python. Introduce gli **array multidimensionali**: strutture dati simili a liste Python ma:
- **Tutti dello stesso tipo** (es. float32)
- **Operazioni vettoriali**: sommi due array e ottieni un array (senza cicli for)
- **Performance**: il core è scritto in C, velocissimo

Una matrice 45.459×22 (tutti i match × tutte le feature) è un array NumPy. TensorFlow stesso usa NumPy come formato di input.

Esempio mentale:
```python
import numpy as np
a = np.array([1, 2, 3])
b = np.array([4, 5, 6])
print(a + b)  # [5, 7, 9] — operazione su tutti gli elementi in una volta
```

Nel progetto non usiamo NumPy direttamente nel nostro codice, ma Pandas e TensorFlow lo usano internamente. Compare solo nel trainer:
```python
classes = np.array([0, 1, 2])  # Le 3 classi possibili
```

**3. TensorFlow / Keras (deep learning)**

TensorFlow è un **framework di deep learning** sviluppato da Google. Keras è l'API high-level di TensorFlow che permette di costruire reti neurali con poche righe di codice.

**Come funziona a livello concettuale:**

Una rete neurale è una sequenza di **layer** (strati). Ogni layer è composto da **neuroni** che:
1. Ricevono input (numeri)
2. Moltiplicano ogni input per un **peso** (un numero che viene imparato durante il training)
3. Sommano tutto
4. Applicano una **funzione di attivazione** (es. ReLU: se il risultato è negativo, diventa 0)
5. Passano il risultato al layer successivo

Durante il **training**, il modello:
1. Prende un batch di partite (es. 32 alla volta)
2. Per ogni partita, calcola la predizione (forward pass: input → layer1 → layer2 → ... → output)
3. Confronta la predizione con il risultato reale usando una **loss function** (funzione di errore)
4. Calcola quanto ogni peso ha contribuito all'errore (backpropagation)
5. Aggiusta i pesi nella direzione che riduce l'errore (gradient descent)
6. Ripete per migliaia di batch

**Nel progetto (`models/network.py`):**
```python
from tensorflow.keras import Sequential
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization

model = Sequential([
    Dense(128, activation="relu", input_dim=22),  # 22 input → 128 neuroni
    BatchNormalization(),                          # Normalizza per stabilità
    Dropout(0.3),                                  # Disattiva 30% dei neuroni (anti-overfitting)
    Dense(64, activation="relu"),                  # 128 → 64 neuroni
    BatchNormalization(),
    Dropout(0.3),
    Dense(32, activation="relu"),                  # 64 → 32
    Dense(3, activation="softmax"),                # 32 → 3 (output: H/D/A)
])
```

Questa è una **rete feed-forward** (i dati fluiscono in avanti, senza cicli). L'input sono 22 numeri (le feature), l'output sono 3 probabilità che sommano a 1.

**Cosa fa ogni layer:**
- **Dense(128, ReLU)**: 128 neuroni, ognuno connesso a tutti i 22 input. ReLU fa `max(0, x)` — rende non-lineare il modello.
- **BatchNormalization**: normalizza i valori tra i layer (media=0, varianza=1). Rende il training più stabile e veloce.
- **Dropout(0.3)**: durante il training, disattiva casualmente il 30% dei neuroni. Forza la rete a non dipendere da pochi neuroni (previene overfitting).
- **Dense(3, Softmax)**: 3 neuroni finali con Softmax. Softmax converte i 3 numeri in probabilità: `[2.1, 0.5, -0.3]` → `[0.72, 0.22, 0.06]` (somma = 1).

**4. scikit-learn (utility ML)**

scikit-learn fornisce strumenti per il machine learning "classico" (non deep learning). Nel progetto ne usiamo 3:

- **StandardScaler**: normalizza le feature. Ogni feature viene trasformata in: `(valore - media) / deviazione standard`. Dopo la trasformazione, ogni feature ha media=0 e varianza=1. È importante perché le feature hanno scale diverse (Elo: 1500-2000, pts_last_5: 0-3) e la rete funziona meglio quando tutti gli input sono sulla stessa scala.

```python
from sklearn.preprocessing import StandardScaler
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)  # Calcola media/std e trasforma
X_test_scaled = scaler.transform(X_test)        # Usa media/std del training
```

- **train_test_split**: divide il dataset in training e test (e validation). Il modello si allena sul training set e viene valutato sul test set (che non ha mai visto).

- **Metriche**: `precision_score`, `recall_score`, `f1_score`, `confusion_matrix` per valutare la qualità del modello.

**5. joblib (serializzazione)**

joblib serve a **salvare oggetti Python su disco** e ricaricarli dopo. Nel progetto salva:
- `scaler.pkl`: lo StandardScaler addestrato (serve per normalizzare le nuove feature allo stesso modo)
- `feature_cols.pkl`: l'elenco delle 22 feature nel giusto ordine
- `metrics.json`: le metriche del modello (accuracy, loss, ecc.)

Senza joblib, dovremmo ricalcolare media e deviazione standard ogni volta che riavviamo il servizio.

**6. FastAPI (server web)**

FastAPI è il framework web che espone il modello come API:
- Riceve richieste HTTP su `/api/v1/predict`
- Prende i dati dal body JSON
- Chiama PredictionService.predict()
- Restituisce le probabilità come JSON

FastAPI è scelto perché:
- **Veloce** (basato su Starlette/ASGI)
- **Validazione automatica** (Pydantic controlla che i dati in input siano corretti)
- **Documentazione automatica** (genera Swagger UI a `/docs`)
- **Async nativo** (può gestire molte richieste contemporaneamente)

**Struttura dell'AI service:**

```
ai-service/app/
├── main.py                        → Entry point FastAPI
├── config/settings.py             → Configurazione
├── controllers/predict_controller.py → Route API (/predict, /train, /model-info)
├── services/
│   ├── feature_engineering.py     → Calcolo delle feature (parte CRUCIALE)
│   └── prediction.py              → Esecuzione predizione
├── training/trainer.py            → Allenamento del modello
├── models/network.py              → Definizione architettura rete neurale
└── datasets/
    ├── download_data.py           → Scarica dati da football-data.co.uk
    └── matches.csv                → Dataset (45.459 partite)
```

### 3.4 Database — PostgreSQL

```
docker-compose.yml → postgres:16-alpine
Porta: 5432
Database: evansvision
Utente: evans
Password: evans_secret (sviluppo locale)
```

**Schema del database (definito in `prisma/schema.prisma`):**

| Tabella | Cosa contiene |
|---------|---------------|
| `teams` | Squadre (nome, lega, paese, Elo rating) |
| `matches` | Partite (squadra casa/trasferta, gol, data, stagione, competizione) |
| `team_statistics` | Statistiche per squadra (media punti ultime 5/10, gol fatti/subiti, Elo, ewma) |
| `predictions` | Previsioni salvate (probabilità casa/pareggio/trasferta, confidence) |
| `match_stats` | Statistiche aggiuntive della partita (xG, tiri, possesso) |
| `users` | Utenti registrati (email, password hash) |
| `elo_history` | Storico Elo rating nel tempo |

Prisma traduce le query TypeScript in SQL. Esempio:
```typescript
// TypeScript (Prisma)
prisma.team.findMany({ where: { league: "Premier League" } })

// SQL generato
SELECT * FROM teams WHERE league = 'Premier League';
```

---

## 4. La Rete Neurale — Come Funzionano le Previsioni

### 4.1 Concetti Fondamentali (da zero)

**Cos'è una rete neurale?**

Immagina di dover decidere se una partita finirà con vittoria casa (H), pareggio (D) o vittoria trasferta (A). Hai dei dati: punti nelle ultime 5 partite, Elo rating, gol fatti/subiti, ecc. Una rete neurale è un programma che **impara da sola** a combinare questi dati per fare la predizione migliore.

**Come impara?** Come un bambino che impara a riconoscere i cani: gli mostri tanti esempi ("questa è l'immagine di un cane", "questa no") e il suo cervello aggiusta le connessioni tra i neuroni. Una rete neurale artificiale funziona allo stesso modo, ma con la matematica.

**L'unità base: il neurone artificiale**

Un neurone riceve dei numeri in input, li moltiplica per dei **pesi** (numeri che rappresentano l'importanza di ogni input), somma tutto, e applica una **funzione di attivazione**.

Esempio: supponiamo che un neurone debba decidere se una squadra vincerà in casa. Riceve:
- `pts_last_5 = 2.4` × peso `0.8` = 1.92
- `elo = 1800` × peso `0.002` = 3.6
- `h2h_wins = 3` × peso `0.3` = 0.9

Somma: 1.92 + 3.6 + 0.9 + **bias** (un valore fisso imparato) = 7.42

Poi applica ReLU: `max(0, 7.42) = 7.42` (se fosse negativo, diventerebbe 0).

L'output `7.42` viene passato al layer successivo. Una rete ha migliaia di questi neuroni organizzati in **layer** (strati).

**Il gioco dei pesi:** all'inizio i pesi sono casuali (il modello predice a caso). Durante il training, il modello:
1. Prende una partita, calcola la predizione (forward pass)
2. Confronta con il risultato reale (es. ha detto "H" ma era "D")
3. **Backpropagation**: per ogni peso, calcola quanto ha contribuito all'errore
4. **Gradient descent**: aggiusta ogni peso nella direzione che riduce l'errore
5. Ripete 100.000+ volte

Alla fine, i pesi "imparano" quali combinazioni di feature portano a quali risultati.

**Metrica chiave — la Loss Function:**

La **loss** (perdita) misura quanto la predizione è lontana dal risultato reale. Più è bassa, meglio il modello sta imparando. Durante il training, la loss sul training set e sul validation set vengono monitorate:

- Se la **training loss** scende ma la **validation loss** sale → **overfitting** (il modello ha imparato a memoria i dati di training, ma non generalizza)
- Se entrambe scendono → il modello sta imparando bene
- Se nessuna scende → problemi (learning rate troppo alto, architettura sbagliata, dati insufficienti)

### 4.2 Architettura della Rete

La nostra rete è un **percettrone multistrato (MLP)** — il tipo più semplice di rete neurale, dove i dati fluiscono in avanti (feed-forward) attraverso 4 layer:

```
Input (22 numeri — le feature)
    ↓
Dense(128, ReLU)      ← 128 neuroni, attivazione ReLU
    ↓
BatchNormalization    ← Normalizza i valori (training più stabile)
    ↓
Dropout(30%)          ← Disattiva 30% dei neuroni (previene overfitting)
    ↓
Dense(64, ReLU)       ← 64 neuroni
    ↓
BatchNormalization
    ↓
Dropout(30%)
    ↓
Dense(32, ReLU)       ← 32 neuroni
    ↓
Dense(3, Softmax)     ← 3 neuroni, attivazione Softmax
    ↓
Output: [0.45, 0.32, 0.23]  ← Probabilità (somma = 1.0)
```

**Spiegazione di ogni componente:**

- **Dense(128, ReLU)**: Layer "densamente connesso" — ogni neurone riceve input da TUTTI i neuroni del layer precedente. 128 neuroni significa che il modello ha 128 "combinatori" diversi che cercano pattern nei dati. ReLU (`max(0, x)`) è l'attivazione che rende il modello non-lineare.

- **BatchNormalization**: Prima di passare i dati al layer successivo, li normalizza: `(valore - media) / deviazione standard`. Questo rende il training più stabile perché evita che i valori diventino troppo grandi o troppo piccoli man mano che si attraversano i layer.

- **Dropout(30%)**: Durante il training, per ogni batch, il 30% dei neuroni viene casualmente "spento" (output messo a 0). Questo forza la rete a non affidarsi a pochi neuroni e a distribuire l'apprendimento su tutti. Senza Dropout, la rete tenderebbe a memorizzare i dati di training (overfitting).

- **Dense(3, Softmax)**: Gli ultimi 3 neuroni producono 3 numeri grezzi. Softmax li trasforma in probabilità:
  ```
  Input grezzo:  [2.1, 0.5, -0.3]
  Softmax:       [0.72, 0.22, 0.06]  (72% casa, 22% pareggio, 6% trasferta)
  ```
  La formula di Softmax è `e^x / sum(e^x)` — rende ogni numero positivo e li normalizza a somma 1.

**Parametri totali del modello:**
- Layer 1: 22 input × 128 neuroni + 128 bias = 2.944 parametri
- Layer 2: 128 × 64 + 64 = 8.256 parametri  
- Layer 3: 64 × 32 + 32 = 2.080 parametri
- Layer 4: 32 × 3 + 3 = 99 parametri
- **Totale: ~13.379 parametri** (più BatchNorm params)

Tutti questi parametri vengono **imparati** durante il training. È un numero piccolo per una rete neurale (modelli moderni hanno miliardi di parametri), ma sufficiente per questo problema.

**Iperparametri del training:**
- **Ottimizzatore Adam**: versione avanzata della discesa del gradiente, che adatta automaticamente il learning rate per ogni parametro
- **Learning rate 0.001**: quanto ogni passo di training modifica i pesi (troppo alto: instabile, troppo basso: lentissimo)
- **Batch size 32**: quante partite il modello vede prima di aggiornare i pesi
- **Early stopping (patience=10)**: se la validation loss non migliora per 10 epoche, ferma il training (previene overfitting)
- **ReduceLROnPlateau**: se la loss si blocca, riduce il learning rate per fare passi più piccoli
- **Class weighting**: bilancia le classi (ci sono più vittorie casa che pareggi, quindi il modello darebbe più peso alle vittorie casa)

### 4.3 Le 22 Feature (Input del Modello)

Le feature si dividono in 3 categorie:

#### A. Stagione Corrente (14 feature) — RESET a ogni stagione
Calcolate solo sulle partite della stagione in corso:

| Feature | Descrizione |
|---------|-------------|
| `home_team_pts_last_5` | Media punti squadra casa ultime 5 partite |
| `home_team_gf_avg_5` | Media gol fatti ultime 5 partite |
| `home_team_ga_avg_5` | Media gol subiti ultime 5 partite |
| `home_team_pts_last_10` | Media punti ultime 10 partite |
| `home_team_gf_avg_10` | Media gol fatti ultime 10 |
| `home_team_ga_avg_10` | Media gol subiti ultime 10 |
| `home_team_ewma_pts` | Media ponderata (α=0.3) dei punti — più peso a partite recenti |
| `home_team_form_ppg` | Media punti dell'intera stagione (season PPG) |
| *(stesse 8 feature per la squadra in trasferta)* | |

#### B. Globali (3 feature) — su TUTTE le stagioni
| Feature | Descrizione |
|---------|-------------|
| `home_elo` | Rating Elo squadra casa (aggiornato partita per partita) |
| `away_elo` | Rating Elo squadra trasferta |
| `elo_diff` | Differenza Elo (casa - trasferta) |

#### C. Testa-a-Testa (3 feature) — ultimi 5 scontri diretti
| Feature | Descrizione |
|---------|-------------|
| `h2h_home_wins` | Quante volte la squadra di casa ha vinto negli ultimi 5 scontri |
| `h2h_draws` | Quanti pareggi |
| `h2h_away_wins` | Quante volte la squadra in trasferta ha vinto |

### 4.4 Elo Rating — Spiegazione

L'Elo è un sistema di rating usato negli scacchi, adattato al calcio:

```
Expected = 1 / (1 + 10^((rating_avversario - rating_proprio) / 400))
```

- Ogni squadra parte da 1500
- Dopo ogni partita, il rating viene aggiornato:
  - Vittoria: +32 * (1 - expected)
  - Pareggio: +32 * (0.5 - expected)
  - Sconfitta: +32 * (0 - expected)
- Se una squadra con rating 1800 batte una con 1500, prende pochi punti
- Se la 1500 batte la 1800, prende molti punti
- I rating sono "globali" (su tutte le stagioni), ma le feature recenti sono stagionali

### 4.5 Processo di Training

```
1. download_data.py
   → Scarica 45.459 partite da football-data.co.uk (2000-2026)
   → Filtra top-5 leghe
   → Salva matches.csv

2. trainer.py (POST /api/v1/train)
   → Carica matches.csv
   → FeatureEngineer.prepare_training_data()
      → Per ogni partita, calcola le 22 feature (con shift(1) per evitare leakage)
      → Output: X (matrice 45459×22), y (vettore target: 0=vittoria casa, 1=pareggio, 2=vittoria trasferta)
   → Divide in train/val/test (70/20/10)
   → StandardScaler (media=0, deviazione standard=1)
   → Allena la rete neurale per max 100 epoche
   → EarlyStopping: ferma se val_loss non migliora per 10 epoche
   → Salva: model.keras, scaler.pkl, feature_cols.pkl
```

### 4.6 Processo di Predizione

```
1. Frontend: utente seleziona 2 squadre → POST /api/v1/predict
2. Backend: prediction.service.ts
   → Query DB per statistiche stagione corrente di entrambe le squadre
   → Query DB per scontri diretti
   → Costruisce dict home_stats e away_stats con le 22 feature
   → Chiama AI Service: POST /api/v1/predict

3. AI Service: prediction.py
   → prepare_prediction_features(home_stats, away_stats)
      → Costruisce vettore di 22 feature (stesso ordine del training)
   → StandardScaler trasforma le feature
   → Model.predict() → [0.45, 0.32, 0.23] (probabilità casa/pareggio/trasferta)
   → Calcola confidence = max(probabilità)
   → Stima risultato esatto (es. "2-1") basato su xG e probabilità

4. Backend: restituisce risultato al frontend
5. Frontend: mostra PredictionCard con probabilità animate
```

### 4.7 Accuratezza del Modello

L'accuratezza attuale è circa **46.7%** (su 3 classi: baseline random = 33%).

La matrice di confusione mostra:
```
              Predetto
              Casa  Pareggio  Trasferta
Reale Casa    [1047    500       396]
     Pareggio [ 378    340       382]
     Trasferta[ 293    313       598]
```

- Il modello è più bravo a predire vittorie casalinghe (il calcio ha un forte home advantage)
- I pareggi sono la classe più difficile (come in tutti i modelli predittivi calcistici)

---

## 5. Data Pipeline — Da dove arrivano i dati

### 5.1 Download Dataset

```
download_data.py
  │
  ├── Fonte storica: GitHub (xgabora/Club-Football-Match-Data-2000-2025)
  │   Formato: CSV con colonne Division, MatchDate, HomeTeam, AwayTeam, FTHome, FTAway
  │   Filtro: solo Divisioni E0, I1, SP1, D1, F1 (top-5 leghe)
  │
  ├── Fonte attuale: football-data.co.uk (2025/26)
  │   Formato: CSV con colonne Div, Date, HomeTeam, AwayTeam, FTHG, FTAG
  │   URL pattern: https://www.football-data.co.uk/mmz4281/2526/{DIV}.csv
  │
  └── Output: matches.csv (45.459 partite, 7 colonne)
      league,date,home_team,away_team,home_goals,away_goals,season
```

### 5.2 Seed del Database

```
seed.ts
  │
  ├── Legge matches.csv
  ├── Calcola Elo cronologicamente partita per partita
  ├── Raggruppa per squadra
  ├── Per ogni squadra:
  │   ├── Stats rolling (ultime 5/10 partite)
  │   ├── EWMA (media ponderata)
  │   ├── Win rate, gol fatti/subiti
  │   └── Salva: Team + TeamStatistics (upsert)
  ├── Crea 45.459 record Match (createMany in batch da 1000)
  └── Output: database popolato con squadre, statistiche, partite
```

---

## 6. Docker — Come gira tutto

Docker è una piattaforma di containerizzazione. Ogni servizio gira in un **container** (ambiente isolato con tutto il necessario per eseguire l'applicazione).

Il file `docker-compose.yml` orchestra 4 container:

```yaml
services:
  postgres:    # Immagine: postgres:16-alpine (database)
  ai-service:  # Build: ./ai-service (Python FastAPI)
  backend:     # Build: ./backend (TypeScript Express)
  frontend:    # Build: ./apps/frontend (Next.js)
```

### Comandi principali:

```bash
# Avviare tutto
docker-compose up -d

# Fermare tutto
docker-compose down

# Riavviare un servizio specifico
docker-compose restart frontend

# Vedere i log
docker logs evansvision-backend-1

# Eseguire comandi dentro un container
docker exec evansvision-postgres-1 psql -U evans -d evansvision -c "SELECT COUNT(*) FROM matches;"

# Ricostruire un container dopo modifiche al codice
docker-compose build frontend
docker-compose up -d frontend
```

### Porte esposte:

| Servizio | Porta host | Porta container |
|----------|-----------|----------------|
| Frontend | 3000 | 3000 |
| Backend | 4000 | 4000 |
| AI Service | 8000 | 8000 |
| PostgreSQL | 5432 | 5432 |

---

## 7. API Endpoints

### Backend (Express, porta 4000)

```
GET  /api/v1/teams          → Elenco squadre con statistiche
GET  /api/v1/teams/:id      → Dettaglio squadra (match recenti, statistiche)
GET  /api/v1/dashboard/stats→ Statistiche dashboard (totali, top team)
POST /api/v1/predict        → Predici risultato (body: { homeTeamId, awayTeamId })
GET  /api/v1/predictions/:matchId → Previsione salvata
GET  /api/v1/model-info     → Info modello (feature count, accuratezza, metriche)
POST /api/v1/auth/register  → Registrazione utente
POST /api/v1/auth/login     → Login utente
```

### AI Service (FastAPI, porta 8000)

```
POST /api/v1/predict   → Esegui predizione (body: { home_team, away_team, home_stats, away_stats })
POST /api/v1/train     → Allena modello (body: { data_path })
GET  /api/v1/model-info→ Info modello
GET  /api/v1/health    → Health check
```

---

## 8. Flusso Completo (Esempio Pratico)

Ecco cosa succede quando un utente apre la pagina e fa una predizione:

### 8.1 Caricamento pagina /predict
```
1. Browser richiede GET http://localhost:3000/predict
2. Next.js server renderizza la pagina
3. Il frontend fa GET /api/v1/teams → ottiene 220 squadre
4. L'utente vede: "Select Home Team", "Select Away Team"
```

### 8.2 Selezione squadre e click "Generate Prediction"
```
1. Frontend: POST /api/v1/predict { homeTeamId, awayTeamId }
2. Backend:
   a. Trova Arsenal e Liverpool (con statistiche) dal DB
   b. Query matches DB per partite stagione corrente di Arsenal
   c. Calcola: pts_last_5=2.4, gf_avg_5=2.0, ewma_pts=2.1, form_ppg=2.1, ...
   d. Query matches DB per scontri diretti Arsenal-Liverpool
   e. Calcola: h2h_home_wins=2, h2h_draws=1, h2h_away_wins=2
   f. Stessa procedura per Liverpool
   g. Chiama: POST /api/v1/predict {
        home_team: "Arsenal",
        away_team: "Liverpool",
        home_stats: { ... 22 feature ... },
        away_stats: { ... 22 feature ... }
      }
3. AI Service:
   a. prepare_prediction_features(home_stats, away_stats)
      → vettore [2.4, 2.0, 0.8, 2.2, 1.8, 1.0, 2.1, 2.1, 1.8, 1.6, 1.2, 2.0, 1.7, 1.1, 1.9, 1.9, 1810, 1750, 60, 2, 1, 2]
   b. StandardScaler.transform() → normalizza
   c. Model.predict() → [0.4938, 0.3175, 0.1888]
   d. Calcola: confidence=0.4938, predicted_result="Home Win", predicted_score="2-1"
   e. Restituisce: { home_win: 0.4938, draw: 0.3175, away_win: 0.1888, ... }
4. Backend: restituisce risultato al frontend
5. Frontend: mostra PredictionCard con barre animate delle probabilità
```

---

## 9. Feature Engineering — Il Cuore del Progetto

Il file `feature_engineering.py` è il pezzo più importante. Prende il dataset grezzo (partite con risultato) e lo trasforma in feature numeriche per la rete neurale.

### Perché 22 feature e non di più?

La scelta delle feature è un compromesso tra:
- **Informatività**: più feature = più informazioni per il modello
- **Overfitting**: troppe feature = il modello impara il rumore invece del segnale
- **Computazione**: più feature = più tempo di training e predizione

### Feature per stagione (perché?)

All'inizio il modello usava tutte le 26 stagioni per le medie mobili (rolling features). Questo era irrealistico perché:
- Una squadra promossa 3 anni fa aveva medie basate su partite di 3 anni fa
- La forma recente era diluita da dati vecchi

Ora le rolling features si **resettano a ogni stagione**: le "ultime 5 partite" sono solo quelle della stagione corrente. Questo rende le previsioni più realistiche.

### Feature testa-a-testa (perché?)

Due squadre possono avere stili di gioco che si contrastano a vicenda. Un Manchester City-Liverpool è diverso da un Manchester City-Everton anche se le squadre hanno la stessa forma recente. Le feature h2h catturano questa dinamica specifica.

### Elo globale (perché non si resetta?)

L'Elo rating rappresenta la **forza assoluta** di una squadra. Una squadra come il Bayern Monaco ha un Elo alto perché è stata forte per anni. Resettarlo ogni stagione perderebbe questa informazione. L'Elo si aggiorna gradualmente: se una squadra forte inizia male la stagione, il suo Elo cala partita dopo partita.

---

## 10. TypeScript vs Python — Perché due linguaggi?

### Backend in TypeScript

TypeScript è **JavaScript con tipi**. Vantaggi:
- **Tipizzazione statica**: errori rilevati in compilazione (es. passare una stringa dove serve un numero)
- **Ecosistema npm**: milioni di pacchetti
- **Node.js**: runtime JavaScript lato server, event-driven, ottimo per API
- **Prisma**: ORM moderno con type safety — se lo schema del DB cambia, TypeScript si lamenta

### AI Service in Python

Python è il linguaggio standard per machine learning:
- **TensorFlow/Keras**: framework principale per deep learning
- **Pandas**: manipolazione dati tabellari (DataFrame come Excel in codice)
- **scikit-learn**: preprocessing (StandardScaler), metriche, split
- **joblib**: serializzazione di oggetti Python
- **FastAPI**: performance comparabili a Node.js per API semplici

Il backend chiama l'AI service via HTTP perché:
- Non vogliamo TensorFlow (1GB+) nel container backend
- Separiamo le responsabilità (API server vs ML server)
- Possiamo aggiornare il modello senza toccare il backend

---

## 11. Come Sviluppare Localmente

### Prerequisiti
- Docker Desktop (Windows/Mac) o Docker Engine (Linux)
- Git

### Setup
```bash
git clone <repo-url>
cd EvansVision
docker-compose up -d
```

I servizi si avviano automaticamente. Il database viene creato con lo schema Prisma.

### Seed del Database
Il seed è già eseguito al primo avvio? No, va eseguito manualmente:
```bash
# Dentro il container backend
docker exec evansvision-backend-1 sh -c "cd /app && npx ts-node prisma/seed.ts"
```

### Training del Modello
```bash
curl -X POST http://localhost:8000/api/v1/train \
  -H "Content-Type: application/json" \
  -d '{"data_path": "/app/datasets/matches.csv"}'
```

### Aggiornare i dati della stagione corrente
```bash
docker exec evansvision-ai-service-1 python3 /app/make_data.py
# Oppure per dati reali:
docker exec evansvision-ai-service-1 python3 /app/app/datasets/download_data.py
```

---

## 12. Possibili Miglioramenti Futuri

1. **Più feature**: infortuni, quote scommesse, valore rosa (Transfermarkt), possesso palla, xG
2. **Modello più complesso**: LSTM per sequence modeling (invece di medie mobili fisse)
3. **Predizioni live**: aggiornare le probabilità in tempo reale durante la partita
4. **Backtesting**: simulare scommesse su dati storici per validare il modello
5. **API pubblica**: esporre le predizioni ad altri servizi
6. **CI/CD**: pipeline automatica che ogni settimana scarica nuovi dati e riallena il modello

---

## 13. Glossario

| Termine | Significato |
|---------|-------------|
| **API** | Interfaccia di programmazione — un servizio web che accetta richieste HTTP |
| **Endpoint** | Una specifica URL/route di un'API (es. `/api/v1/predict`) |
| **ORM** | Object-Relational Mapping — software che traduce oggetti del linguaggio in query SQL |
| **Container** | Ambiente isolato con tutto il necessario per eseguire un'app (OS, librerie, codice) |
| **Microservizio** | Applicazione indipendente che fa una cosa sola, comunicando con altri via API |
| **Feature** | Variabile numerica che descrive un aspetto dei dati (es. "media gol ultime 5 partite") |
| **Feature Engineering** | Processo di trasformare dati grezzi (CSV) in numeri utili per il modello ML |
| **Neurone** | Unità base di una rete neurale: moltiplica input × pesi, somma, applica attivazione |
| **Peso (weight)** | Numero che rappresenta l'importanza di un input per un neurone. Viene "imparato" durante il training |
| **Bias** | Valore costante aggiunto all'output di un neurone (come l'intercetta in una regressione) |
| **Layer (strato)** | Gruppo di neuroni che processano gli input in parallelo |
| **Forward pass** | Quando i dati attraversano la rete dall'input all'output |
| **Backpropagation** | Algoritmo che calcola quanto ogni peso ha contribuito all'errore, per poterlo correggere |
| **Gradient descent** | Algoritmo che aggiusta i pesi nella direzione che riduce l'errore (scendendo il gradiente) |
| **Learning rate** | Quanto ogni passo di training modifica i pesi (troppo alto: instabile, troppo basso: lento) |
| **Batch** | Numero di esempi elaborati insieme prima di aggiornare i pesi (es. 32 partite) |
| **Epoch** | Un passaggio completo dell'intero dataset di training attraverso la rete |
| **Loss (perdita)** | Errore tra predizione e valore reale (più basso = meglio). Obiettivo: minimizzare |
| **Accuracy (accuratezza)** | Percentuale di predizioni corrette sul totale |
| **Overfitting** | Quando il modello memorizza i dati di training invece di imparare pattern generali (performa bene su training, male su test) |
| **Underfitting** | Quando il modello è troppo semplice per catturare i pattern nei dati (performa male sia su training che su test) |
| **Train/Validation/Test split** | Dividere i dati in 3 parti: training (il modello impara), validation (regola iperparametri), test (valutazione finale) |
| **ReLU** | Funzione di attivazione `max(0, x)` — lascia passare i valori positivi, blocca i negativi |
| **Softmax** | Funzione che converte numeri in probabilità (somma = 1). Es: `[2.1, 0.5, -0.3]` → `[0.72, 0.22, 0.06]` |
| **StandardScaler** | Normalizza i dati: `(valore - media) / deviazione standard`. Tutte le feature hanno media=0, varianza=1 |
| **Dropout** | Tecnica che spegne casualmente una percentuale di neuroni durante il training (previene overfitting) |
| **Batch Normalization** | Normalizza i valori tra i layer della rete (stabilizza e accelera il training) |
| **Early Stopping** | Ferma il training quando la validation loss smette di migliorare (previene overfitting) |
| **Matrice di confusione** | Tabella che confronta predizioni vs valori reali (mostra dove il modello sbaglia) |
| **Precision** | Quante delle predizioni positive erano corrette (evita falsi positivi) |
| **Recall** | Quanti dei veri positivi sono stati trovati (evita falsi negativi) |
| **F1-score** | Media armonica tra precision e recall (singolo numero per valutare) |
| **DataFrame (Pandas)** | Struttura dati tabellare simile a un foglio Excel con righe e colonne |
| **Array (NumPy)** | Griglia di numeri dello stesso tipo, su cui fare operazioni matematiche veloci |
| **Serializzazione** | Salvare oggetti Python su disco (es. modello addestrato, scaler) per riutilizzarli dopo |
| **SSR** | Server-Side Rendering — la pagina HTML viene generata dal server invece che dal browser |
| **Docker** | Piattaforma per creare/eseguire container |
| **Docker Compose** | Strumento per orchestrare più container con un file YAML |
| **Prisma** | ORM TypeScript per database relazionali (genera codice type-safe da uno schema) |
| **TensorFlow** | Framework Google per costruire e addestrare reti neurali |
| **Keras** | API high-level di TensorFlow (costruire reti neurali in poche righe) |
| **FastAPI** | Framework Python per API web (veloce, validazione automatica, documentazione automatica) |
| **Express** | Framework Node.js per API web (leggero, flessibile) |
| **Next.js** | Framework React con routing, server-side rendering, build ottimizzata |
| **React Query** | Libreria per gestire chiamate API e cache automatica nel frontend |
| **JWT** | JSON Web Token — standard per autenticazione API (token firmato digitalmente) |
| **Zod** | Libreria TypeScript per validare dati a runtime (controlla che i dati siano corretti) |
| **Pydantic** | Libreria Python per validare dati (usata da FastAPI per controllare i JSON in input) |
