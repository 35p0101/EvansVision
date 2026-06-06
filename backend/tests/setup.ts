// Setup eseguito prima dei test - imposta env per evitare errori di config in produzione
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret_at_least_32_chars_long_aaaaaaaa";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://evans:evans_secret@localhost:5432/evansvision_test";
process.env.AI_SERVICE_URL = "http://localhost:8000";
process.env.LOG_LEVEL = "silent";
