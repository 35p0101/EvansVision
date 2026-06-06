import dotenv from "dotenv";

dotenv.config();

const DEV_DEFAULTS = {
  JWT_SECRET: "evans_jwt_secret_change_in_prod",
  JWT_SECRET_DEV: "dev_only_change_me_generate_with_openssl_rand_hex_32",
};

const nodeEnv = (process.env.NODE_ENV || "development").toLowerCase();
const isProduction = nodeEnv === "production";

const jwtSecret = process.env.JWT_SECRET || DEV_DEFAULTS.JWT_SECRET;

// Validazioni di sicurezza in produzione
if (isProduction) {
  if (
    !process.env.JWT_SECRET ||
    jwtSecret === DEV_DEFAULTS.JWT_SECRET ||
    jwtSecret === DEV_DEFAULTS.JWT_SECRET_DEV ||
    jwtSecret.length < 32
  ) {
    throw new Error(
      "[config] JWT_SECRET non impostato o insicuro in produzione. " +
        "Generalo con: openssl rand -hex 32"
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("[config] DATABASE_URL obbligatoria in produzione");
  }
}

function parseOrigins(value: string | undefined, fallback: string): string[] {
  return (value || fallback)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  nodeEnv,
  isProduction,
  port: parseInt(process.env.PORT || "4000", 10),
  databaseUrl: process.env.DATABASE_URL || "postgresql://evans:evans_secret@localhost:5432/evansvision",
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:8000",
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN, "http://localhost:3000"),
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
  rateLimit: {
    authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10),
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || "5", 10),
    globalWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(60 * 1000), 10),
    globalMax: parseInt(process.env.RATE_LIMIT_MAX || "120", 10),
  },
  logLevel: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
};
