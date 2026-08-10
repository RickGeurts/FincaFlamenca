import { useState } from "react";
import { STRINGS } from "../content/strings.es";
import { useGameStore } from "../state/store";

/**
 * Tools for building the game, not for playing it.
 *
 * Rendered only in a dev build — the published app never sees this file's
 * output, so a stray tap can never wipe her farm.
 */
export function DevPanel({ onClose }: { onClose: () => void }) {
  const devReplayOnboarding = useGameStore((s) => s.devReplayOnboarding);
  const devReset = useGameStore((s) => s.devReset);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!import.meta.env.DEV) return null;

  return (
    <section className="flex flex-col gap-2.5 rounded-[22px] border-2 border-dashed border-farm-200 bg-farm-100 p-4">
      <h3 className="font-black text-ink-900">{STRINGS.devTitle} 🛠️</h3>
      <p className="text-xs font-bold text-ink-500 [text-wrap:pretty]">{STRINGS.devOnlyHere}</p>

      <button
        onClick={() => {
          devReplayOnboarding();
          onClose();
        }}
        className="flex min-h-14 flex-col items-start justify-center rounded-2xl border-2 border-farm-200 bg-white px-4 py-2 text-left"
      >
        <span className="font-black text-ink-900">{STRINGS.devReplayWelcome}</span>
        <span className="text-xs font-bold text-ink-500">{STRINGS.devReplayWelcomeHint}</span>
      </button>

      {confirming ? (
        <div className="flex flex-col gap-2 rounded-2xl border-2 border-bad-border bg-bad-bg p-3">
          <p className="text-sm font-black text-bad-text [text-wrap:pretty]">
            {STRINGS.devResetConfirm}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="min-h-12 flex-1 rounded-xl bg-white font-black text-ink-700"
            >
              {STRINGS.removeNo}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void devReset();
              }}
              className="min-h-12 flex-1 rounded-xl bg-rose-500 font-black text-white disabled:opacity-60"
            >
              {busy ? STRINGS.devResetting : STRINGS.devResetYes}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="flex min-h-14 flex-col items-start justify-center rounded-2xl border-2 border-farm-200 bg-white px-4 py-2 text-left"
        >
          <span className="font-black text-ink-900">{STRINGS.devReset}</span>
          <span className="text-xs font-bold text-ink-500">{STRINGS.devResetHint}</span>
        </button>
      )}
    </section>
  );
}
