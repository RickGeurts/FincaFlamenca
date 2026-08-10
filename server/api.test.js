// The sync rules, run against an in-memory Postgres so the SQL is exercised
// rather than mocked. The rule that matters most is the stale-push guard: a
// phone waking up with an old copy must never overwrite newer progress.

import { beforeEach, describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import { SCHEMA, handleFarmRequest } from "./api.js";

let query;
let issued;

/**
 * Predictable codes — AAAA…, BBBB…, … — that never repeat within a test.
 *
 * They must not collide, because pg-mem reports `rowCount: 1` for an
 * `ON CONFLICT DO NOTHING` insert that real Postgres reports as 0 rows. The
 * production retry loop is right; the emulator is not, so the tests stay off
 * that path rather than encoding the wrong behaviour.
 */
const nextCode = () => "ABCDEFGHJKLM"[issued++ % 12].repeat(12);

beforeEach(async () => {
  const db = newDb();
  const pg = db.adapters.createPg();
  const pool = new pg.Pool();
  query = (text, params) => pool.query(text, params);
  issued = 0;
  await query(SCHEMA);
});

const save = (savedAt) => ({ app: "finca-flamenca", version: 5, savedAt, state: { munten: 1 } });

async function create(savedAt = "2026-08-10T10:00:00.000Z", extra = {}) {
  return handleFarmRequest({
    query,
    method: "POST",
    code: null,
    body: { save: save(savedAt), savedAt, ...extra },
    makeCode: nextCode,
  });
}

describe("creating a farm", () => {
  it("stores it and hands back a code", async () => {
    const result = await create();
    expect(result.status).toBe(201);
    expect(result.body.code).toHaveLength(12);
    expect(result.body.save.app).toBe("finca-flamenca");
    expect(result.body.createdAt).toBeTruthy();
  });

  it("keeps the optional email but does not require one", async () => {
    expect((await create("2026-08-10T10:00:00.000Z")).body.email).toBeNull();
    const withEmail = await create("2026-08-10T10:00:00.000Z", { email: " ana@example.com " });
    expect(withEmail.body.email).toBe("ana@example.com");
  });

  it("refuses a request with no farm in it", async () => {
    const result = await handleFarmRequest({ query, method: "POST", code: null, body: {} });
    expect(result.status).toBe(400);
  });
});

describe("fetching a farm", () => {
  it("returns the stored copy", async () => {
    const { body } = await create();
    const result = await handleFarmRequest({ query, method: "GET", code: body.code });
    expect(result.status).toBe(200);
    expect(result.body.savedAt).toBe("2026-08-10T10:00:00.000Z");
  });

  it("accepts the code however it was typed", async () => {
    const { body } = await create();
    const typed = `${body.code.slice(0, 4)}-${body.code.slice(4, 8)}-${body.code.slice(8)}`;
    const result = await handleFarmRequest({ query, method: "GET", code: typed.toLowerCase() });
    expect(result.status).toBe(200);
  });

  it("is a 404 for a code nobody owns", async () => {
    const result = await handleFarmRequest({ query, method: "GET", code: "ABCDEFGHJKLM" });
    expect(result.status).toBe(404);
  });

  it("is a 400 for something that isn't a code at all", async () => {
    for (const bad of ["", "hello", "ABCD-EFGH-JKL0"]) {
      expect((await handleFarmRequest({ query, method: "GET", code: bad })).status).toBe(400);
    }
  });
});

describe("pushing a farm up", () => {
  it("accepts a newer copy", async () => {
    const { body } = await create("2026-08-10T10:00:00.000Z");
    const later = "2026-08-10T11:00:00.000Z";
    const result = await handleFarmRequest({
      query,
      method: "PUT",
      code: body.code,
      body: { save: save(later), savedAt: later },
    });
    expect(result.status).toBe(200);
    expect(result.body.savedAt).toBe(later);
  });

  it("accepts a copy saved at the same moment", async () => {
    const at = "2026-08-10T10:00:00.000Z";
    const { body } = await create(at);
    const result = await handleFarmRequest({
      query,
      method: "PUT",
      code: body.code,
      body: { save: save(at), savedAt: at },
    });
    expect(result.status).toBe(200);
  });

  it("refuses an older copy and hands back the newer one", async () => {
    const { body } = await create("2026-08-10T12:00:00.000Z");
    const stale = "2026-08-10T09:00:00.000Z";

    const result = await handleFarmRequest({
      query,
      method: "PUT",
      code: body.code,
      body: { save: save(stale), savedAt: stale },
    });

    expect(result.status).toBe(409);
    // The response carries the server's copy so the client can adopt it.
    expect(result.body.savedAt).toBe("2026-08-10T12:00:00.000Z");

    const stored = await handleFarmRequest({ query, method: "GET", code: body.code });
    expect(stored.body.savedAt).toBe("2026-08-10T12:00:00.000Z");
  });

  it("leaves the email alone when a push doesn't carry one", async () => {
    const { body } = await create("2026-08-10T10:00:00.000Z", { email: "ana@example.com" });
    const later = "2026-08-10T11:00:00.000Z";
    const result = await handleFarmRequest({
      query,
      method: "PUT",
      code: body.code,
      body: { save: save(later), savedAt: later },
    });
    expect(result.body.email).toBe("ana@example.com");
  });

  it("is a 404 when the code was never created", async () => {
    const at = "2026-08-10T10:00:00.000Z";
    const result = await handleFarmRequest({
      query,
      method: "PUT",
      code: "ABCDEFGHJKLM",
      body: { save: save(at), savedAt: at },
    });
    expect(result.status).toBe(404);
  });
});

describe("anything else", () => {
  it("is refused", async () => {
    const result = await handleFarmRequest({ query, method: "DELETE", code: "ABCDEFGHJKLM" });
    expect(result.status).toBe(405);
  });
});
