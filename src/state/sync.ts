// Cloud sync: keeps a copy of the farm on the server so a cleared browser or
// a new phone doesn't cost her the game.
//
// Local-first by design. The game never waits for the network: IndexedDB stays
// the source of truth, and syncing is a background copy that catches up when
// it can. With the server unreachable, everything still works.

import { exportSave, parseSave, useGameStore, type SaveFile } from "./store";
import { normalizeCode, resolve } from "./pairing";

const CODE_KEY = "finca-flamenca-sync-code";
const EMAIL_KEY = "finca-flamenca-sync-email";
/** Wait this long after the last change before pushing. */
const PUSH_DEBOUNCE_MS = 4000;

export type SyncStatus = "off" | "idle" | "syncing" | "saved" | "error";

export interface SyncState {
  code: string | null;
  status: SyncStatus;
  lastSyncedAt: string | null;
}

type Listener = (state: SyncState) => void;

let state: SyncState = { code: readCode(), status: readCode() ? "idle" : "off", lastSyncedAt: null };
const listeners = new Set<Listener>();
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let unsubscribeStore: (() => void) | undefined;

function readCode(): string | null {
  try {
    return localStorage.getItem(CODE_KEY);
  } catch {
    return null;
  }
}

function writeCode(code: string | null) {
  try {
    if (code) localStorage.setItem(CODE_KEY, code);
    else localStorage.removeItem(CODE_KEY);
  } catch {
    // Private mode with storage blocked: syncing simply stays off.
  }
}

export function getSyncEmail(): string {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setSyncEmail(email: string) {
  try {
    localStorage.setItem(EMAIL_KEY, email.trim());
  } catch {
    /* ignore */
  }
}

function update(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener(state);
}

export function subscribeSync(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export const getSyncState = (): SyncState => state;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const error = new Error(`sync ${response.status}`) as Error & { status?: number; body?: unknown };
    error.status = response.status;
    error.body = await response.json().catch(() => null);
    throw error;
  }
  return (await response.json()) as T;
}

interface FarmRecord {
  code: string;
  email: string | null;
  save: SaveFile;
  savedAt: string;
  createdAt: string;
}

/** Start syncing this farm and return the code she needs for other devices. */
export async function createSync(email?: string): Promise<string> {
  update({ status: "syncing" });
  try {
    const save = exportSave(useGameStore.getState());
    const record = await api<FarmRecord>("/api/farms", {
      method: "POST",
      body: JSON.stringify({ save, savedAt: save.savedAt, email: email ?? getSyncEmail() }),
    });
    if (email) setSyncEmail(email);
    writeCode(record.code);
    update({ code: record.code, status: "saved", lastSyncedAt: record.savedAt });
    watchStore();
    return record.code;
  } catch (error) {
    update({ status: "error" });
    throw error;
  }
}

/**
 * Attach this device to an existing farm. Whichever copy was saved last wins,
 * so pairing a fresh phone pulls the farm down rather than wiping it.
 */
export async function connectSync(typedCode: string): Promise<"pulled" | "pushed"> {
  const code = normalizeCode(typedCode);
  update({ status: "syncing" });
  try {
    const record = await api<FarmRecord>(`/api/farms/${code}`);
    const local = exportSave(useGameStore.getState());
    const winner = resolve(local, record.save);

    if (winner === "remote") {
      const restored = parseSave(JSON.stringify(record.save));
      if (!restored) throw new Error("unreadable remote save");
      useGameStore.getState().restoreSave(restored);
      writeCode(code);
      update({ code, status: "saved", lastSyncedAt: record.savedAt });
      watchStore();
      return "pulled";
    }

    writeCode(code);
    update({ code, status: "idle" });
    watchStore();
    await pushNow();
    return "pushed";
  } catch (error) {
    update({ status: "error" });
    throw error;
  }
}

export function stopSync() {
  writeCode(null);
  unsubscribeStore?.();
  unsubscribeStore = undefined;
  if (pushTimer) clearTimeout(pushTimer);
  update({ code: null, status: "off", lastSyncedAt: null });
}

/** Send the current farm up now. Silent on failure — it retries on the next change. */
export async function pushNow(): Promise<void> {
  const code = state.code;
  if (!code) return;
  update({ status: "syncing" });
  const save = exportSave(useGameStore.getState());
  try {
    const record = await api<FarmRecord>(`/api/farms/${code}`, {
      method: "PUT",
      body: JSON.stringify({ save, savedAt: save.savedAt, email: getSyncEmail() || undefined }),
    });
    update({ status: "saved", lastSyncedAt: record.savedAt });
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 409) {
      // The server holds a newer farm — another device got there first.
      const remote = (error as { body?: FarmRecord }).body;
      const restored = remote?.save ? parseSave(JSON.stringify(remote.save)) : null;
      if (restored) {
        useGameStore.getState().restoreSave(restored);
        update({ status: "saved", lastSyncedAt: remote!.savedAt });
        return;
      }
    }
    update({ status: "error" });
  }
}

function schedulePush() {
  if (!state.code) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushNow(), PUSH_DEBOUNCE_MS);
}

function watchStore() {
  if (unsubscribeStore || !state.code) return;
  // Every change to the game nudges a push; the debounce keeps a lesson's
  // worth of answers down to one request.
  unsubscribeStore = useGameStore.subscribe(schedulePush);
  if (typeof document !== "undefined") {
    // Leaving the app is the moment most likely to lose an un-pushed change.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void pushNow();
    });
  }
}

/**
 * Called once at startup: pull anything newer from the server, then keep the
 * copy up to date. Failures are quiet — she should never see a network error
 * for a farm she can already play.
 */
export async function startSync(): Promise<void> {
  const code = state.code;
  if (!code) return;
  try {
    const record = await api<FarmRecord>(`/api/farms/${code}`);
    const local = exportSave(useGameStore.getState());
    if (resolve(local, record.save) === "remote") {
      const restored = parseSave(JSON.stringify(record.save));
      if (restored) useGameStore.getState().restoreSave(restored);
    }
    update({ status: "saved", lastSyncedAt: record.savedAt });
  } catch {
    update({ status: "error" });
  }
  watchStore();
}
