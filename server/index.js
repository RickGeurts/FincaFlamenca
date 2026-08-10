// The sync server: serves the built app and a small API that keeps one saved
// farm per pairing code.
//
// Deliberately dependency-free apart from the Postgres driver — no framework,
// no session middleware, nothing extra to keep patched. The game still works
// with this server switched off; syncing is a safety net, not a requirement.
//
// The rules live in ./api.js so they can be tested without a network or a
// real database. This file is only the plumbing.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { SCHEMA, handleFarmRequest, normalizeCode } from "./api.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const DIST = resolve(HERE, "../dist");
const PORT = Number(process.env.PORT ?? 8080);

// ---------------------------------------------------------------------------
// Storage

const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      // Railway's managed Postgres presents a certificate the container has no
      // root for; the connection runs inside their private network. Set
      // PGSSL=off to talk to a plain local Postgres instead.
      ssl: process.env.PGSSL === "off" ? undefined : { rejectUnauthorized: false },
      max: 4,
    })
  : null;

async function migrate() {
  if (!pool) return;
  await pool.query(SCHEMA);
}

// ---------------------------------------------------------------------------
// HTTP helpers

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
  });
  res.end(payload);
}

async function readJsonBody(req, limitBytes = 4_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    // A farm is a few kilobytes; anything this big is a mistake or an abuse.
    if (size > limitBytes) throw new Error("payload too large");
    chunks.push(chunk);
  }
  if (size === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary",
  ".woff2": "font/woff2",
};

async function serveStatic(res, pathname) {
  // normalize() collapses any ../ before it can climb out of dist; the
  // startsWith check is the belt to that braces.
  const rel = normalize(decodeURIComponent(pathname)).replace(/^[./\\]+/, "");
  let file = join(DIST, rel);
  if (!file.startsWith(DIST)) return json(res, 403, { error: "forbidden" });

  let info = await stat(file).catch(() => null);
  if (info && info.isDirectory()) {
    file = join(file, "index.html");
    info = await stat(file).catch(() => null);
  }
  // Unknown path: hand back the app shell, so client-side routes still work.
  if (!info) {
    file = join(DIST, "index.html");
    info = await stat(file).catch(() => null);
    if (!info) return json(res, 404, { error: "not-built" });
  }

  const immutable = rel.startsWith("assets/");
  res.writeHead(200, {
    "content-type": MIME[extname(file)] ?? "application/octet-stream",
    "content-length": info.size,
    // Hashed assets can be kept forever; the shell and the worker never.
    "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
  });
  res.end(await readFile(file));
}

// ---------------------------------------------------------------------------
// API — the rules live in ./api.js, tested against an in-memory Postgres.

async function handleApi(req, res, url) {
  if (!pool) return json(res, 503, { error: "sync-unavailable" });

  const parts = url.pathname.split("/").filter(Boolean); // ["api", "farms", code?]
  if (parts[1] !== "farms") return json(res, 404, { error: "not-found" });

  const body = req.method === "POST" || req.method === "PUT" ? await readJsonBody(req) : {};

  const result = await handleFarmRequest({
    query: (text, params) => pool.query(text, params),
    method: req.method,
    code: parts[2] ? normalizeCode(parts[2]) : null,
    body,
  });
  return json(res, result.status, result.body);
}

// ---------------------------------------------------------------------------

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  try {
    if (url.pathname === "/api/health") {
      return json(res, 200, { ok: true, sync: Boolean(pool) });
    }
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    if (req.method !== "GET" && req.method !== "HEAD") {
      return json(res, 405, { error: "method-not-allowed" });
    }
    return await serveStatic(res, url.pathname);
  } catch (error) {
    console.error("request failed", url.pathname, error);
    if (!res.headersSent) json(res, 500, { error: "server-error" });
  }
});

migrate()
  .catch((error) => {
    // Start anyway: without a database the app still serves and plays, it
    // just cannot sync. Better a playable farm than a blank page.
    console.error("database not ready, syncing disabled:", error.message);
  })
  .finally(() => {
    server.listen(PORT, () => {
      console.log(`Finca Flamenca on :${PORT} (sync ${pool ? "on" : "off"})`);
    });
  });
