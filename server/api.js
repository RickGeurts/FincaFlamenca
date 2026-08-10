// The sync rules, independent of HTTP and of the database driver.
//
// Everything here takes a `query` function and returns a plain
// `{ status, body }`, which is what makes the rules testable: server/api.test.js
// runs them against an in-memory Postgres.

import { randomBytes } from "node:crypto";

// Same rules as the browser (src/state/pairing.ts). The two are kept in step
// by src/state/pairing.contract.test.ts, which reads this file.
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTVWXYZ23456789";
export const CODE_LENGTH = 12;

export const normalizeCode = (input) =>
  String(input ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export const isValidCode = (input) => {
  const clean = normalizeCode(input);
  return clean.length === CODE_LENGTH && [...clean].every((c) => CODE_ALPHABET.includes(c));
};

/** Rejection sampling, so every symbol stays equally likely. */
export function generateCode(source = randomBytes) {
  const out = [];
  const limit = 256 - (256 % CODE_ALPHABET.length);
  while (out.length < CODE_LENGTH) {
    for (const byte of source(CODE_LENGTH)) {
      if (byte >= limit) continue;
      out.push(CODE_ALPHABET[byte % CODE_ALPHABET.length]);
      if (out.length === CODE_LENGTH) break;
    }
  }
  return out.join("");
}

export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS farms (
    code       TEXT PRIMARY KEY,
    email      TEXT,
    save       JSONB NOT NULL,
    saved_at   TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    synced_at  TIMESTAMPTZ NOT NULL
  )
`;

const toFarm = (row) => ({
  code: row.code,
  email: row.email ?? null,
  save: row.save,
  savedAt: new Date(row.saved_at).toISOString(),
  createdAt: new Date(row.created_at).toISOString(),
});

/**
 * One request against the farm store.
 *
 * @param query  (text, params) => Promise<{ rows, rowCount }>
 * @param method HTTP method
 * @param code   pairing code from the path, or null when creating
 * @param body   parsed JSON body
 */
export async function handleFarmRequest({
  query,
  method,
  code,
  body = {},
  now = () => new Date().toISOString(),
  makeCode = generateCode,
}) {
  if (!code && method === "POST") {
    if (!body.save) return { status: 400, body: { error: "missing-save" } };
    const savedAt = typeof body.savedAt === "string" ? body.savedAt : now();
    const email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;

    // A collision is vanishingly unlikely, but retrying beats a 500.
    for (let attempt = 0; attempt < 5; attempt++) {
      const inserted = await query(
        `INSERT INTO farms (code, email, save, saved_at, created_at, synced_at)
         VALUES ($1, $2, $3, $4, $5, $5)
         ON CONFLICT (code) DO NOTHING
         RETURNING *`,
        [makeCode(), email, JSON.stringify(body.save), savedAt, now()],
      );
      if (inserted.rowCount === 1) return { status: 201, body: toFarm(inserted.rows[0]) };
    }
    return { status: 500, body: { error: "code-collision" } };
  }

  const clean = normalizeCode(code);
  if (!isValidCode(clean)) return { status: 400, body: { error: "bad-code" } };

  if (method === "GET") {
    const found = await query("SELECT * FROM farms WHERE code = $1", [clean]);
    if (found.rowCount === 0) return { status: 404, body: { error: "unknown-code" } };
    return { status: 200, body: toFarm(found.rows[0]) };
  }

  if (method === "PUT") {
    if (!body.save) return { status: 400, body: { error: "missing-save" } };
    const savedAt = typeof body.savedAt === "string" ? body.savedAt : now();

    // Only accept a copy at least as new as the stored one. An older push is
    // a stale device waking up, and must never flatten newer progress.
    const updated = await query(
      `UPDATE farms
          SET save = $2, saved_at = $3, synced_at = $4,
              email = COALESCE($5, email)
        WHERE code = $1 AND saved_at <= $3
        RETURNING *`,
      [
        clean,
        JSON.stringify(body.save),
        savedAt,
        now(),
        typeof body.email === "string" && body.email.trim() ? body.email.trim() : null,
      ],
    );
    if (updated.rowCount === 1) return { status: 200, body: toFarm(updated.rows[0]) };

    const current = await query("SELECT * FROM farms WHERE code = $1", [clean]);
    if (current.rowCount === 0) return { status: 404, body: { error: "unknown-code" } };
    // The server is ahead; hand its copy back so the client can take it.
    return { status: 409, body: toFarm(current.rows[0]) };
  }

  return { status: 405, body: { error: "method-not-allowed" } };
}
