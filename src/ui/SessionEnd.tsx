import { STRINGS } from "../content/strings.es";
import type { SessionSummary } from "../state/store";

interface Props {
  summary: SessionSummary;
  onDone: () => void;
}

export function SessionEnd({ summary, onDone }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-6xl">
        {summary.kind === "revive" ? "🌱" : summary.perfect ? "🌟" : "🎉"}
      </div>
      <h1 className="text-2xl font-extrabold text-farm-700">
        {summary.kind === "lesson"
          ? STRINGS.lessonComplete
          : summary.kind === "review"
            ? STRINGS.reviewComplete
            : STRINGS.reviveComplete}
      </h1>
      <p className="text-farm-700/80">
        {summary.correct} / {summary.total}
      </p>
      <div className="flex flex-col items-center gap-1 rounded-2xl bg-farm-100 px-8 py-4 shadow-sm">
        {summary.munten > 0 && (
          <span className="text-xl font-extrabold">🪙 {STRINGS.earnedMunten(summary.munten)}</span>
        )}
        <span className="font-bold text-farm-700/80">⭐ {STRINGS.earnedXp(summary.xp)}</span>
        {summary.perfect && (
          <span className="text-sm font-bold text-leaf-600">{STRINGS.perfectBonus}</span>
        )}
        {summary.multiplier > 1 && (
          <span className="text-sm font-bold text-farm-600">
            🔥 {STRINGS.streakBonus(summary.multiplier)}
          </span>
        )}
      </div>
      <button
        onClick={onDone}
        className="min-h-11 rounded-xl bg-leaf-500 px-8 py-3 font-bold text-white active:bg-leaf-600"
      >
        {STRINGS.backHome}
      </button>
    </div>
  );
}
