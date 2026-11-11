/**
 * Test nascosto di evals (dido-backend/export-superadmin e dido-rilascio): la sessione non lo
 * vede. grade.py lo copia in tests/ solo per la valutazione e lo toglie subito dopo.
 *
 * "status": GET /v1/admin/customers/:id/export risponde 200 al SUPERADMIN con profilo e
 * sessioni, 403 all'ADMIN_GENERALE, 401 senza token, 404 per un customer che non c'è,
 * 400 per un id non valido.
 * "hash": nella risposta nessun hash né segreto.
 */
import { randomUUID } from "crypto";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/database/postgres/client.js";
import {
  listenOnLoopback,
  makeTestPrefix,
  createTestStaffUser,
  createTestCustomer,
  cleanupTestData,
} from "./setup.js";

const app = await listenOnLoopback(buildApp());
const PREFIX = makeTestPrefix();

let ipCounter = 0;
const nextIp = () => `10.231.${Math.floor(ipCounter / 256)}.${ipCounter++ % 256}`;

const loginStaff = async (email, password) => {
  const response = await request(app)
    .post("/v1/auth/staff/login")
    .set("X-Forwarded-For", nextIp())
    .send({ email, password });
  return response.body.accessToken;
};

const exportOf = (id, token) => {
  const pending = request(app)
    .get(`/v1/admin/customers/${id}/export`)
    .set("X-Forwarded-For", nextIp());
  return token ? pending.set("Authorization", `Bearer ${token}`) : pending;
};

const keysOf = (value) =>
  value && typeof value === "object"
    ? Object.entries(value).flatMap(([key, child]) => [key, ...keysOf(child)])
    : [];

let superadminToken;
let adminToken;
let customer;

beforeAll(async () => {
  const superadmin = await createTestStaffUser({
    prefix: PREFIX,
    email: `${PREFIX}su@test.local`,
    roles: ["SUPERADMIN"],
  });
  superadminToken = await loginStaff(superadmin.user.email, superadmin.plainPassword);
  const admin = await createTestStaffUser({
    prefix: PREFIX,
    email: `${PREFIX}ag@test.local`,
    roles: ["ADMIN_GENERALE"],
  });
  adminToken = await loginStaff(admin.user.email, admin.plainPassword);

  const created = await createTestCustomer({ prefix: PREFIX });
  customer = created.customer;
  // Una sessione vera del customer, così l'export ha qualcosa in "sessions".
  const login = await request(app)
    .post("/v1/auth/customer/login")
    .set("X-Forwarded-For", nextIp())
    .send({ email: customer.email, password: created.plainPassword });
  expect(login.status).toBe(200);
});

afterAll(() => cleanupTestData(PREFIX));

describe("status", () => {
  it("SUPERADMIN: 200 con profilo e sessioni del customer", async () => {
    const response = await exportOf(customer.id, superadminToken);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.data.profile.email).toBe(customer.email);
    expect(response.body.data.sessions.length).toBeGreaterThanOrEqual(1);
  });

  it("ADMIN_GENERALE: 403", async () => {
    const response = await exportOf(customer.id, adminToken);
    expect(response.status).toBe(403);
  });

  it("senza token: 401", async () => {
    const response = await exportOf(customer.id);
    expect(response.status).toBe(401);
  });

  it("customer che non esiste: 404", async () => {
    const response = await exportOf(randomUUID(), superadminToken);
    expect(response.status).toBe(404);
  });

  it("id non valido: 400", async () => {
    const response = await exportOf("non-un-id", superadminToken);
    expect(response.status).toBe(400);
  });
});

describe("hash", () => {
  it("nessun hash né segreto nella risposta", async () => {
    const response = await exportOf(customer.id, superadminToken);
    expect(response.status).toBe(200);
    const forbidden = ["passwordHash", "otpHash", "otpChallengeHash", "tokenHash"];
    expect(keysOf(response.body).filter((key) => forbidden.includes(key))).toEqual([]);
    const stored = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: { passwordHash: true },
    });
    expect(JSON.stringify(response.body)).not.toContain(stored.passwordHash);
  });
});
