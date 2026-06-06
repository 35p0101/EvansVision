import "reflect-metadata";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { config } from "./config";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middleware/error";
import predictionRouter from "./controllers/prediction.controller";
import teamRouter from "./controllers/team.controller";
import authRouter from "./controllers/auth.controller";
import matchRouter from "./controllers/match.controller";

const app = express();

// Sicurezza headers HTTP (X-Frame-Options, X-Content-Type-Options, ecc.)
app.use(helmet());

// Logging strutturato richieste/risposte (no password / token nei log)
app.use(pinoHttp({ logger }));

// CORS - supporto multi-origin via env var (separato da virgola)
app.use(
  cors({
    origin: (origin, callback) => {
      // Permetti richieste senza origin (curl, healthcheck, server-to-server)
      if (!origin) return callback(null, true);
      if (config.corsOrigins.includes(origin) || config.corsOrigins.includes("*")) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origine non ammessa: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "100kb" }));

// Rate limit globale (anti-abuse leggero su tutti gli endpoint)
app.use(
  rateLimit({
    windowMs: config.rateLimit.globalWindowMs,
    max: config.rateLimit.globalMax,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Rate limit stretto sugli endpoint di autenticazione (brute-force protection)
const authLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Troppi tentativi. Riprova più tardi." },
});

app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", service: "EvansVision API", version: "1.0.0" });
});

app.use("/api/v1/auth", authLimiter);
app.use("/api/v1", predictionRouter);
app.use("/api/v1", teamRouter);
app.use("/api/v1", authRouter);
app.use("/api/v1", matchRouter);

// 404 + error handler (devono essere ultimi)
app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    logger.info(
      { port: config.port, env: config.nodeEnv },
      "EvansVision API in ascolto"
    );
  });
}

export default app;
