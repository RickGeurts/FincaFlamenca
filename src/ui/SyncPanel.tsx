import { useEffect, useState } from "react";
import { STRINGS } from "../content/strings.es";
import { formatCode, isValidCode } from "../state/pairing";
import {
  connectSync,
  createSync,
  getSyncEmail,
  getSyncState,
  stopSync,
  subscribeSync,
  type SyncState,
} from "../state/sync";

/**
 * Cloud sync, in her language and without a login: one code identifies the
 * farm, and everything after that happens by itself.
 */
export function SyncPanel() {
  const [sync, setSync] = useState<SyncState>(getSyncState);
  const [typed, setTyped] = useState("");
  const [email, setEmail] = useState(getSyncEmail);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => subscribeSync(setSync), []);

  const run = async (task: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setNote(null);
    try {
      await task();
      setNote(done);
    } catch {
      setNote(STRINGS.syncError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-extrabold text-farm-700">{STRINGS.syncTitle}</h2>

      {sync.code ? (
        <>
          <p className="text-sm text-farm-700/70">{STRINGS.syncOnBody}</p>
          <p
            className="select-all rounded-xl bg-farm-100 p-3 text-center text-lg font-extrabold tracking-widest text-farm-700"
            aria-label={STRINGS.syncCodeLabel}
          >
            {formatCode(sync.code)}
          </p>
          <p className="text-center text-xs font-bold text-farm-700/60">
            {sync.status === "syncing" && STRINGS.syncBusy}
            {sync.status === "saved" && STRINGS.syncSaved}
            {sync.status === "error" && STRINGS.syncOffline}
            {sync.status === "idle" && STRINGS.syncIdle}
          </p>
          <button
            onClick={() => {
              stopSync();
              setNote(STRINGS.syncStopped);
            }}
            className="min-h-11 rounded-xl bg-farm-100 py-3 font-bold text-farm-700 active:bg-farm-200"
          >
            {STRINGS.syncStop}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-farm-700/70">{STRINGS.syncOffBody}</p>
          <label className="text-sm font-bold text-farm-700/70">
            {STRINGS.syncEmailLabel}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={STRINGS.syncEmailPlaceholder}
              className="mt-1 min-h-11 w-full rounded-xl border-2 border-farm-200 bg-white px-3 font-bold focus:border-leaf-500 focus:outline-none"
            />
          </label>
          <button
            disabled={busy}
            onClick={() => void run(() => createSync(email), STRINGS.syncStarted)}
            className="min-h-11 rounded-xl bg-leaf-500 py-3 font-bold text-white disabled:opacity-40 active:bg-leaf-600"
          >
            {STRINGS.syncStart}
          </button>

          {connecting ? (
            <div className="flex flex-col gap-2 rounded-xl bg-farm-100 p-3">
              <label className="text-sm font-bold text-farm-700/70">
                {STRINGS.syncConnectLabel}
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="ABCD-EFGH-JKLM"
                  autoCapitalize="characters"
                  className="mt-1 min-h-11 w-full rounded-xl border-2 border-farm-200 bg-white px-3 text-center font-extrabold tracking-widest focus:border-leaf-500 focus:outline-none"
                />
              </label>
              <button
                disabled={busy || !isValidCode(typed)}
                onClick={() => void run(() => connectSync(typed), STRINGS.syncConnected)}
                className="min-h-11 rounded-xl bg-farm-600 py-3 font-bold text-white disabled:opacity-40 active:bg-farm-700"
              >
                {STRINGS.syncConnect}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConnecting(true)}
              className="min-h-11 rounded-xl bg-farm-100 py-3 font-bold text-farm-700 active:bg-farm-200"
            >
              {STRINGS.syncHaveCode}
            </button>
          )}
        </>
      )}

      {note && (
        <p className="rounded-xl bg-farm-100 p-3 text-sm font-bold text-farm-700">{note}</p>
      )}
    </section>
  );
}
