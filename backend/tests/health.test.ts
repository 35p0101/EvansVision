import request from "supertest";

// Mock Prisma per evitare connessione DB durante i test
jest.mock("../src/models", () => ({
  __esModule: true,
  default: {
    team: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    match: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    prediction: { count: jest.fn(), create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn() },
  },
}));

import app from "../src/app";

describe("GET /api/v1/health", () => {
  it("ritorna 200 e status ok", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      service: "EvansVision API",
    });
  });
});

describe("404 handler", () => {
  it("ritorna 404 per rotta inesistente", async () => {
    const res = await request(app).get("/api/v1/rotta-inesistente");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });
});
