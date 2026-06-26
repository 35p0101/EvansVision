# Deploy EvansVision

Piattaforme usate:
- **Database**: Supabase (PostgreSQL gratis)
- **Backend + AI Service**: Railway (Node.js + Python, gratis con $5 di credito)
- **Frontend**: Vercel (Next.js, gratis)

---

## Passo 1 — Supabase (Database)

1. Vai su [supabase.com](https://supabase.com) → **Start your project**
2. Fai login con GitHub
3. **New project**:
   - Name: `evansvision`
   - Database Password: genera una password forte (**salvala**)
   - Region: scegli quella più vicina (es. `EU West`)
   - Pricing Plan: **Free**
4. Clicca **Create new project** (ci mette ~2 min)
5. Vai a **Project Settings** → **Database** → scrolla a **Connection string**
6. Trovi la stringa tipo:
   ```
   postgresql://postgres:YOUR_PASSWORD@db.XXXXXXXXXXXXXX.supabase.co:5432/postgres
   ```
7. Copiala — servirà per Railway (Passo 2c)

> **Importante**: sostituisci `[YOUR-PASSWORD]` con la password che hai scelto, e **fai URL encode** di eventuali caratteri speciali (es. `@` → `%40`, `!` → `%21`, `#` → `%23`).

---

## Passo 2 — Railway (Backend + AI Service)

### 2a — AI Service

1. Vai su [railway.app](https://railway.app) → **Login with GitHub**
2. **New Project** → **Deploy from GitHub repo**
3. Seleziona il repo `EvansVision`
4. Nella schermata **Configure**:
   - **Root Directory**: clicca e scrivi `ai-service`
5. Railway rileva Python e fa il build usando il `railway.json` configurato
6. Finito il deploy, apri il progetto → vedi un URL tipo `https://ai-service-production-xxxx.up.railway.app`
7. **Variables** → aggiungi:
   ```
   MODEL_PATH = /app/saved_models
   ```
8. Copia l'URL del servizio (es. `https://ai-service-production-xxxx.up.railway.app`)

### 2b — Aggiornare il backend con l'URL dell'AI Service

Prima di deployare il backend, devi aggiornare il riferimento all'AI Service:

1. Apri `backend/.env` (locale)
2. Trova la riga `AI_SERVICE_URL="http://localhost:8000"`
3. Sostituisci con l'URL reale di Railway:
   ```
   AI_SERVICE_URL="https://ai-service-production-xxxx.up.railway.app"
   ```
4. Salva il file e **committa** questa modifica

> **Nota**: anche se `.env` è in `.gitignore`, questa modifica serve per riferimento. In Railway imposterai la variabile d'ambiente direttamente nel dashboard.

### 2c — Backend

1. Sempre su Railway, **New Project** → **Deploy from GitHub repo** (stesso repo)
2. **Root Directory**: scrivi `backend`
3. Railway rileva Node.js e usa il Dockerfile + `railway.json` configurato
4. Finito il deploy, apri il progetto → **Variables** → aggiungi TUTTE queste:

   ```
   DATABASE_URL = postgresql://postgres:YOUR_PASSWORD@db.XXXXXXXXXXXXXX.supabase.co:5432/postgres
   JWT_SECRET = (genera una stringa a caso, es. "a7f3c9e1b2d84f6a")
   AI_SERVICE_URL = https://ai-service-production-xxxx.up.railway.app
   CORS_ORIGIN = https://evansvision.vercel.app
   PORT = 4000
   ```

   > **Attenzione**: Se la password di Supabase contiene caratteri speciali, devi **URL-encodarli**: es. `@` → `%40`, `!` → `%21`

5. Railway fa il build col Dockerfile e fa partire il backend
6. Railway assegna un URL tipo `https://backend-production-xxxx.up.railway.app`
7. **Verifica che funzioni** cliccando su **Deploy Logs** → cerca errori
8. Se tutto OK, copia l'URL (es. `https://backend-production-xxxx.up.railway.app`)

### 2d — Seed del database

Nel terminale di Railway per il backend:
```
railway run npx prisma db seed
```
Oppure dalla dashboard di Railway, vai su **Shell** ed esegui:
```
npx prisma db seed
```

> Se il seed fallisce con errori di relazione, probabilmente la tabella `_prisma_migrations` non esiste ancora. Prima esegui:
> ```
> npx prisma migrate deploy
> ```

---

## Passo 3 — Vercel (Frontend)

1. Vai su [vercel.com](https://vercel.com) → **Login with GitHub**
2. **Add New Project** → seleziona `EvansVision`
3. **Configure Project**:
   - **Root Directory**: clicca **Edit** e scegli `apps/frontend`
   - **Framework Preset**: dovrebbe auto-rilevare **Next.js**
   - **Build and Output Settings**: lascia tutto automatico
4. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL = https://backend-production-xxxx.up.railway.app/api/v1
   ```
5. Clicca **Deploy** (~2 minuti)
6. Vercel assegna un URL tipo `https://evansvision.vercel.app`

---

## Passo 4 — Retrain del modello

Il modello parte con pesi randomici (accuracy ~33%). Per addestrarlo:

```
curl -X POST https://backend-production-xxxx.up.railway.app/api/v1/train
```

Oppure, se vuoi farlo da locale contro il backend in produzione:
```bash
# Da locale (Windows PowerShell)
curl.exe -X POST https://backend-production-xxxx.up.railway.app/api/v1/train
```

Il training dura ~30-60 secondi. L'AI Service ha bisogno dei dati match nel DB (dal seed del passo 2d).

---

## Debug comune

| Problema | Soluzione |
|---|---|
| `prisma migrate deploy` fallisce | Controlla che `DATABASE_URL` sia corretta, che la tabella `_prisma_migrations` sia stata creata |
| Backend non parte per SSL | Aggiungi `?sslmode=require` alla fine di `DATABASE_URL` |
| AI Service crasha su TensorFlow | Aumenta i limiti di memoria in Railway (Settings → Resources → Memory) |
| Frontend mostra "No predictions" | Fai una prediction da `/predict` o chiama l'API direttamente |
| CORS errors | Controlla che `CORS_ORIGIN` del backend sia l'URL esatto di Vercel |
| Il seed non trova i CSV | Il seed usa `matches.csv` da `../data/`. Su Railway il contesto potrebbe essere diverso. In tal caso, carica manualmente il file o usa `prisma db push` per creare le tabelle e fai l'import con uno script separato. |

---

## Ordine consigliato

```
1. Supabase (database) → ottieni la connection string
2. AI Service (Railway) → ottieni l'URL
3. Backend (Railway) con DB + AI URL → ottieni l'URL
4. Frontend (Vercel) con URL backend
5. Seed del database
6. Retrain del modello
```
