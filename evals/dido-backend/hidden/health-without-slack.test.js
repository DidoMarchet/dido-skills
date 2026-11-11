/**
 * Test nascosto di evals (dido-backend/servizio-opzionale): la sessione non lo vede.
 * Senza SLACK_ERRORS_WEBHOOK_URL l'app si costruisce e /health risponde 200.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import { listenOnLoopback } from "./setup.js";

// Prima di importare l'app: la config letta all'import non deve vedere la variabile.
delete process.env.SLACK_ERRORS_WEBHOOK_URL;
const { buildApp } = await import("../src/app.js");

describe("health", () => {
  it("senza la variabile del webhook l'app parte", async () => {
    const app = await listenOnLoopback(buildApp());
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
  });
});
