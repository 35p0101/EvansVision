# --- Stage 1: dipendenze (incluse dev per la build) ---
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# --- Stage 2: build (compila TypeScript, genera Prisma Client) ---
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- Stage 3: runtime (solo prod deps, immagine minimale) ---
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl wget

ENV NODE_ENV=production

# Installa solo dipendenze di produzione
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
    && npm cache clean --force

# Copia Prisma Client generato e schema
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Copia build output e script di avvio
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/start.sh ./
RUN chmod +x start.sh

# Utente non-root per sicurezza
RUN addgroup -S app && adduser -S app -G app \
    && chown -R app:app /app
USER app

EXPOSE 4000

CMD ["sh", "start.sh"]
