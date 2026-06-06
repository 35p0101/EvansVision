# Presentazione EvansVision — Discorso per il Professore

## 🎤 Discorso

---

### 1. Introduzione

> Buongiorno professore, oggi vi presento EvansVision, una piattaforma web di previsioni calcistiche basata su machine learning.

EvansVision nasce da un'idea semplice: prendere i dati storici del calcio europeo — oltre 45.000 partite dal 1999 a oggi — e usarli per addestrare una rete neurale in grado di prevedere il risultato di una partita (1, X o 2). Il progetto è completamente containerizzato con Docker Compose e si articola in tre microservizi: un frontend in Next.js, un backend in Express/TypeScript, e un AI service in Python con FastAPI e TensorFlow.

---

### 2. Architettura

A livello architetturale, abbiamo tre container principali più PostgreSQL.

Il frontend parla col backend tramite REST API su porta 4000. Il backend orchestra tutto: interroga il database, invia le features all'AI service su porta 8000, e salva i risultati. L'AI service è l'unico componente in Python: riceve un vettore di 22 features per squadra e restituisce le probabilità.

I container comunicano su una rete Docker interna, quindi l'AI service non è esposto all'esterno.

```
┌───────────────────────────────────────────────────────────┐
│                     Docker Compose                        │
│                                                           │
│  ┌──────────────────┐     ┌──────────────────┐            │
│  │   Frontend        │     │   Backend         │           │
│  │   Next.js 14      │────▶│   Express + TS    │           │
│  │   Port 3000       │     │   Port 4000       │           │
│  └──────────────────┘     └──────┬───────────┘            │
│                                  │                        │
│                                  ▼                        │
│  ┌──────────────────┐     ┌──────────────────┐            │
│  │   PostgreSQL 16   │◀───│   AI Service      │            │
│  │   Port 5432       │     │   FastAPI (Py)    │            │
│  └──────────────────┘     │   Port 8000       │            │
│                           └──────────────────┘            │
└───────────────────────────────────────────────────────────┘
```

---

### 3. Il Database

Il database è PostgreSQL 16, con sette tabelle gestite da Prisma ORM. Le tabelle principali sono:

- **Team** — 120 squadre con nome, lega, Elo rating
- **Match** — le 45.459 partite storiche con risultato, data, stagione
- **Prediction** — le previsioni salvate, con probabilità e confidenza
- **TeamStatistics** — statistiche calcolate per squadra: xG, possesso, forma recente

Una scelta importante: la tabella Prediction non ha una foreign key verso Match, perché le previsioni si fanno su partite future che non esistono ancora nel DB. Invece, Prediction ha `homeTeamId` e `awayTeamId` che puntano direttamente a Team.

---

### 4. Il Modello ML

Il cuore del progetto è la rete neurale. Il dataset di partenza contiene partite dal 1999 al 2026, coprendo tutte e 5 le big league europee: Premier League, Serie A, La Liga, Bundesliga e Ligue 1.

**Feature engineering** — Per ogni partita costruisco un vettore di 22 feature per squadra:

- **Feature rolling**: punti medi, gol fatti e subiti nelle ultime 5 e 10 partite — queste si azzerano a ogni stagione per non mescolare epoche diverse
- **Feature head-to-head**: vittorie in casa, pareggi, vittorie fuori casa negli ultimi 5 scontri diretti
- **Feature di forza**: Elo rating, punti a partita nella stagione, media xG
- **EWMA**: una media pesata esponenziale che dà più peso alle partite recenti

**Architettura della rete** — La rete neurale è costruita con Keras/TensorFlow. L'architettura è un MLP (Multi-Layer Perceptron) con due layer nascosti, attivazione ReLU, dropout per prevenire overfitting, e output softmax a 3 classi: vittoria casa, pareggio, vittoria fuori.

**Training** — Durante l'addestramento uso:
- **EarlyStopping** per fermarmi quando la validation loss smette di migliorare
- **ReduceLROnPlateau** per ridurre il learning rate quando si plateaus
- **Class weights** bilanciati per gestire classi squilibrate

Il risultato è un'accuratezza intorno al 46-47%. Sembra poco, ma considerate che il baseline casuale è 33% (3 classi equiprobabili) e che il calcio è intrinsecamente imprevedibile. Studi accademici su questo tipo di predizione si attestano tra il 45% e il 55%.

---

### 5. Il Flusso di Predizione

Quando un utente seleziona due squadre, il backend costruisce le feature per entrambe interrogando il database — calcola la forma recente, la media gol, lo storico scontri diretti. Poi invia tutto all'AI Service via HTTP.

L'AI Service scala le feature con lo `StandardScaler` salvato dal training, esegue `model.predict()`, e restituisce le probabilità. Il backend salva la prediction nel DB, e il frontend la mostra con un badge colorato in base alla confidenza.

```
User seleziona squadre → Frontend chiama Backend
  → Backend calcola features (forma, h2h, elo, xG)
    → Backend POSTa a AI Service /api/v1/predict
      → AI Service: StandardScaler → model.predict()
      → Restituisce [home%, draw%, away%]
    → Backend salva Prediction nel DB
  → Frontend mostra probabilità con barre animate
```

---

### 6. Il Frontend

Il frontend è in Next.js 14 con TypeScript e Tailwind CSS. Ha tre pagine principali:

- **Pagina di Predizione** (`/predict`): due select con ricerca testuale per scegliere le squadre, pulsante di predizione, e visualizzazione delle probabilità con barre animate
- **Dashboard** (`/dashboard`): mostra statistiche generali, la classifica Elo, il log delle ultime 20 prediction con auto-refetch ogni 30 secondi, e una sezione che spiega il processo di training in 4 passaggi
- **Pagine di dettaglio**: ogni squadra ha statistiche avanzate e storico

L'interfaccia è responsive e usa Framer Motion per le animazioni.

---

### 7. Problematiche Incontrate

1. **Foreign key sbagliata**: il modello Prediction originale aveva `matchId` con FK verso Match, ma le prediction sono su partite future che non esistono. Ho dovuto migrare lo schema per avere `homeTeamId` e `awayTeamId` con FK dirette verso Team.

2. **Feature rolling su 26 anni**: inizialmente le medie mobili erano calcolate su tutte le partite disponibili, ma questo mescolava stagioni diverse — una squadra forte negli anni 2000 e debole oggi veniva appiattita. Ho risolto raggruppando per stagione.

3. **Pipeline Python-Backend**: all'inizio l'AI service non persisteva le metriche di training, quindi la accuracy mostrava 0.0% finché non si faceva un retrain esplicito. Ho aggiunto il salvataggio su `metrics.json` con un fallback lato backend.

4. **Docker con pnpm su Windows**: i symlink di pnpm causavano errori durante la build Docker perché l'host aveva `node_modules` con reparse point che Docker non riusciva a gestire. Risolto con un `.dockerignore` specifico per il contesto di build.

---

### 8. Conclusioni

> In conclusione, EvansVision dimostra come si possa costruire un'applicazione completa di machine learning con un'architettura a microservizi, dal data engineering al deployment containerizzato. La qualità della predizione è in linea con lo stato dell'arte per questo dominio, e l'architettura è pensata per essere estendibile — per esempio aggiungendo più leghe, feature più sofisticate, o un modello ensemble.

**Grazie per l'attenzione, sono pronto per le domande.**

---

## ❓ Possibili Domande del Professore e Risposte

---

### D1: "46% di accuratezza non è poco?"

No, in realtà è in linea con la letteratura. Le previsioni calcistiche hanno un tetto teorico intorno al 55-60% per via dell'alta varianza del gioco. Il baseline casuale è 33%. Studi come quelli di Dixon-Coles (1997) o Rue-Salvesen (2000) si attestano sul 45-50%. Inoltre, se guardiamo la confusion matrix, il modello è molto più bravo a prevedere vittorie casa (dove azzarda meno) che pareggi, che sono intrinsecamente più rari.

---

### D2: "Perché tre microservizi e non un monolite?"

La scelta è didattica e tecnica. Didattica perché volevo mostrare di saper orchestrare servizi eterogenei — TypeScript e Python — che comunicano via rete. Tecnica perché isola le preoccupazioni: il training del modello richiede librerie Python (TensorFlow, Pandas) che sarebbero scomode in Node.js, mentre il backend in Express è più naturale per le API REST e l'ORM. In produzione, questa separazione permetterebbe di scalare l'AI service indipendentemente se il carico di predizioni aumentasse.

---

### D3: "Perché hai scelto PostgreSQL e non un database vettoriale o NoSQL?"

I dati sono fortemente relazionali: team, partite, statistiche, prediction. PostgreSQL con Prisma mi dà integrità referenziale, join efficienti, e un ORM type-safe. Un database NoSQL avrebbe complicato le query di aggregazione — per esempio, calcolare la media gol degli ultimi 5 match richiede join su date e ordinamenti.

---

### D4: "Come hai gestito il bilanciamento delle classi?"

La distribuzione delle partite non è uniforme: circa il 46% finisce con vittoria casa, 27% pareggio, 27% vittoria fuori. Uso `compute_class_weight('balanced')` di scikit-learn, che assegna pesi inversamente proporzionali alla frequenza. Quindi ai pareggi e vittorie fuori casa viene dato più peso nella loss function, costringendo il modello a impararli meglio.

---

### D5: "Hai fatto feature selection o hai usato tutte le feature?"

Ho fatto una selezione basata su domain knowledge. Inizialmente avevo 17 feature, poi sono passato a 22 aggiungendo head-to-head e metriche di forma più granulari. Ho evitato feature automatiche tipo PCA perché le feature hanno significato interpretabile — posso spiegare perché una predizione è uscita guardando i valori di Elo o di forma recente. Ho testato incrementalmente aggiungendo feature per vedere se l'accuratezza migliorava, e le feature head-to-head hanno dato un boost del 2-3%.

---

### D6: "Come hai validato il modello?"

Split stratificato 70-15-15 tra train, validation e test. Uso l'early stopping sulla validation loss con pazienza di 10 epoche per evitare overfitting. Le metriche finali — accuratezza, confusion matrix, precision, recall — sono calcolate sul test set che il modello non ha mai visto durante il training.

---

### D7: "Il progetto è deployabile in produzione?"

L'infrastruttura Docker compose è pronta per staging. Per produzione servirebbe: un reverse proxy (Nginx/Traefik), certificati HTTPS, un registry per le immagini, e un database gestito tipo RDS. L'AI service non ha autenticazione — in produzione metterei una API key. Il frontend Next.js potrebbe essere deployato su Vercel, il backend su un cluster Kubernetes.

---

### D8: "Che test hai fatto?"

Sul fronte backend, ho testato manualmente le API con curl. I test automatici non sono stati implementati per mancanza di tempo, ma è sicuramente un punto da migliorare — aggiungerei test unitari con Jest per i service e test di integrazione per le API.

---

### D9: "Perché Elo e non un altro sistema di rating?"

L'Elo è semplice, interpretabile, e ben documentato nel contesto sportivo. Ogni squadra parte da 1500 e dopo ogni partita si scambiano punti in base al risultato atteso vs reale. Avrei potuto usare rating più sofisticati (come Pi-rating o Glicko), ma Elo è sufficiente per questo scopo e si integra facilmente come feature nel modello.

---

### D10: "Come hai raccolto i dati?"

I dati provengono da football-data.co.uk, un dataset pubblico che contiene risultati e statistiche delle principali leghe europee dal 1993. Ho scritto uno script Python (`download_data.py`) che scarica i CSV, li merge, e li prepara per l'import. In totale ho 45.459 partite da 5 leghe (Premier League, Serie A, La Liga, Bundesliga, Ligue 1).

---

## 📋 Consigli Pratici

- Porta il progetto aperto su `localhost:3000` e **fai una predizione live** durante la presentazione
- Tieni pronta una slide con il **diagramma dell'architettura**
- Se ti chiede **cosa miglioreresti**, rispondi: aggiungere più leghe, un modello ensemble, test automatici, e un sistema di retraining periodico
- Sottolinea sempre il **perché** delle scelte tecniche (non solo il cosa)
