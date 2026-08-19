import { useEffect } from "react";
import { STRINGS } from "../content/strings.es";
import { play } from "../utils/sfx";
import { canSpeak, speak } from "../utils/speak";

/** Enough paper to feel like a party, few enough to stay smooth on a phone. */
const CONFETTI = 18;
const COLORS = ["#65a30d", "#d97706", "#e11d48", "#3d6ea8", "#d4a017"];

/**
 * The first thing she ever sees: the farm is a birthday present, so the game
 * says so before it explains itself.
 *
 * Shown once and only on the day (see content/player.ts), ahead of the
 * welcome cards — the gift comes first, the instructions after. The Dutch line
 * is the greeting itself, which makes her first word of the language a
 * congratulation rather than a vocabulary item.
 */
export function Birthday({ name, onDone }: { name: string; onDone: () => void }) {
  useEffect(() => {
    play("celebrate");
  }, []);

  return (
    <div className="absolute inset-0 z-[80] flex flex-col overflow-hidden bg-gradient-to-b from-farm-100 to-farm-200">
      {Array.from({ length: CONFETTI }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="animate-confetti absolute top-0 h-3 w-2 rounded-[2px]"
          style={{
            left: `${(i * 100) / CONFETTI + 2}%`,
            background: COLORS[i % COLORS.length],
            animationDelay: `${(i % 6) * 0.16}s`,
          }}
        />
      ))}

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-7 text-center">
        <span className="animate-pop-in text-[84px] leading-none">🎂</span>

        <h1 className="animate-pop-in text-[26px] font-black text-farm-700 [text-wrap:balance]">
          {STRINGS.birthdayTitle(name)}
        </h1>

        <div className="flex w-full flex-col items-center gap-2 rounded-[22px] bg-white/75 px-4 py-4">
          <button
            onClick={() => {
              play("tap");
              speak(STRINGS.birthdayNl);
            }}
            className="text-[19px] font-black leading-snug text-ink-900 [text-wrap:balance]"
          >
            {STRINGS.birthdayNl}
          </button>
          <span className="text-[13px] font-bold text-ink-500 [text-wrap:pretty]">
            {STRINGS.birthdayNlHint}
          </span>
          {canSpeak() && (
            <button
              onClick={() => {
                play("tap");
                speak(STRINGS.birthdayNl);
              }}
              className="mt-0.5 min-h-11 rounded-2xl bg-leaf-500 px-5 py-2.5 font-black text-[15px] text-white active:bg-leaf-600"
            >
              {STRINGS.listen}
            </button>
          )}
        </div>

        <p className="text-[15px] font-bold leading-relaxed text-ink-700 [text-wrap:pretty]">
          {STRINGS.birthdayBody}
        </p>
        <p className="text-[15px] font-bold leading-relaxed text-ink-700 [text-wrap:pretty]">
          {STRINGS.birthdayBody2}
        </p>
        <p className="text-base font-black text-farm-700">{STRINGS.birthdaySigned}</p>
      </div>

      <div className="relative px-6 pb-[calc(28px+env(safe-area-inset-bottom))]">
        <button
          onClick={() => {
            play("tap");
            onDone();
          }}
          className="h-14 w-full rounded-2xl border-b-[5px] border-leaf-600 bg-leaf-500 font-black text-[17px] text-white active:translate-y-0.5 active:border-b-0"
        >
          {STRINGS.birthdayStart}
        </button>
      </div>
    </div>
  );
}
