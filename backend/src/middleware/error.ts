import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger";
import { config } from "../config";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = "HttpError";
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", details: err.errors });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  const error = err as { message?: string; status?: number };
  const status = typeof error.status === "number" ? error.status : 500;
  const message = error.message || "Internal server error";

  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");

  res.status(status).json({
    error: message,
    ...(config.isProduction ? {} : { stack: (err as Error).stack }),
  });
}
