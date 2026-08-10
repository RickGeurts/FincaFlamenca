import { useEffect } from "react";
import { STRINGS } from "../content/strings.es";
import { play } from "../utils/sfx";

/** Enough paper to feel like a party, few enough to stay smooth on a phone. */
const CONFETTI = 14;
const COLORS = ["#65a30d", "#d97706", "#e11d48", "#3d6ea8", "#d4a017"];

/**
 * A classroom just opened. This is the one moment in the game that interrupts
 * her on purpose: crossing into a new unit is the thing all the farming was
 * for, and it should feel like arriving somewhere.
 */
export function Celebration({
  unit,
  title,
  onClose,
}: {
  unit: number;
  title: string;
  onClose: () => void;
}) {
  useEffect(() => {
    play("celebrate");
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-ink-950/55 p-6"
      onClick={onClose}
    >
      {Array.from({ length: CONFETTI }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="animate-confetti absolute top-0 h-3 w-2 rounded-[2px]"
          style={{
            left: `${(i * 100) / CONFETTI + 3}%`,
            background: COLORS[i % COLORS.length],
            animationDelay: `${(i % 5) * 0.12}s`,
          }}
        />
      ))}

      <div
        className="animate-pop-in relative flex w-full max-w-xs flex-col items-center gap-3 rounded-[30px] bg-farm-50 p-7 text-center shadow-[0_24px_60px_rgba(0,0,0,.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-6xl">🎓</span>
        <span className="text-2xl font-black text-farm-700 [text-wrap:pretty]">
          {STRINGS.unitOpened(unit)}
        </span>
        <span className="text-base font-extrabold text-ink-500">{title}</span>
        <button
          onClick={onClose}
          className="mt-1 h-14 w-full rounded-2xl border-b-[5px] border-leaf-600 bg-leaf-500 font-black text-[17px] text-white active:translate-y-0.5 active:border-b-0"
        >
          {STRINGS.celebrateOn}
        </button>
      </div>
    </div>
  );
}
