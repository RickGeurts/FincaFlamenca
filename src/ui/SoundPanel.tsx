import { useState } from "react";
import { STRINGS } from "../content/strings.es";
import { isMuted, play, setMuted } from "../utils/sfx";

/**
 * The sound switch. Turning it on plays the sound it is describing, so she can
 * hear what she is choosing rather than take the label's word for it.
 */
export function SoundPanel() {
  const [muted, setMutedState] = useState(() => isMuted());

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) play("correct");
  };

  return (
    <section className="flex flex-col gap-2.5 rounded-[22px] bg-farm-100 p-4">
      <h3 className="font-black text-ink-900">{STRINGS.soundLabel} 🔔</h3>
      <button
        onClick={toggle}
        aria-pressed={!muted}
        className={`flex min-h-14 items-center justify-between rounded-2xl border-2 border-farm-200 bg-white px-4 py-3 text-left font-black ${
          muted ? "text-ink-500" : "text-ink-900"
        }`}
      >
        <span>{muted ? STRINGS.soundOff : STRINGS.soundOn}</span>
        <span
          className={`flex h-7 w-12 items-center rounded-full px-1 transition-colors ${
            muted ? "bg-farm-200" : "bg-leaf-500"
          }`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-white transition-transform ${
              muted ? "" : "translate-x-5"
            }`}
          />
        </span>
      </button>
      <p className="text-sm font-bold text-ink-500 [text-wrap:pretty]">{STRINGS.soundHint}</p>
    </section>
  );
}
