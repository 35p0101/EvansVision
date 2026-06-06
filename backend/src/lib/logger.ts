import pino from "pino";
import { config } from "../config";

const transport = config.isProduction
  ? undefined
  : {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
      },
    };

export const logger = pino({
  level: config.logLevel,
  ...(transport ? { transport } : {}),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.jwtSecret",
    ],
    remove: true,
  },
});
