import { useEffect } from "react";
import { STRINGS } from "../content/strings.es";
import { WORDS_BY_ID } from "../content";
import { play } from "../utils/sfx";
import { useCountUp } from "./useCountUp";
import type { SessionSummary } from "../state/store";

interface Props {
  summary: SessionSummary;
  onDone: () => void;
  /** Offered only when there is something to repeat. */
  onAgain?: () => void;
}

/** Never more chips than this; the rest are counted. */
const MAX_CHIPS = 8;

export function SessionEnd({ summary, onDone, onAgain }: Props) {
  const title =
    summary.kind === "lesson"
      ? STRINGS.lessonComplete
      : summary.kind === "review"
        ? STRINGS.reviewComplete
        : STRINGS.reviveComplete;

  // What the coins were made of. Only the lines that actually applied are
  // drawn, so the sum on the card always adds up to the number above it.
  const base = Math.round(summary.munten / summary.multiplier);
  const bonus = summary.munten - base;

  const moved = summary.boxChanges.slice(0, MAX_CHIPS);
  const extra = summary.boxChanges.length - moved.length;

  // Watching the number climb beats being handed it.
  const munten = useCountUp(summary.munten);
  const xp = useCountUp(summary.xp);

  useEffect(() => {
    play(summary.munten > 0 ? "coin" : "correct");
  }, [summary.munten]);

  return (
    <div className="absolute inset-0 overflow-y-auto bg-farm-50">
      <div className="h-[300px] bg-gradient-to-b from-leaf-600 to-leaf-500" />

      <div className="absolute inset-x-0 top-14 flex flex-col items-center gap-2.5 px-6 text-center">
        <span className="text-[72px] leading-none">
          {summary.kind === "revive" ? "🌱" : summary.perfect ? "🌟" : "🎉"}
        </span>
        <h1 className="text-[26px] font-black text-white [text-wrap:pretty]">{title}</h1>
        <span className="text-[15px] font-extrabold text-ok-bg">
          {summary.correct} / {summary.total}
        </span>
      </div>

      <div className="absolute inset-x-[18px] top-[262px] flex flex-col gap-3.5 rounded-[26px] border-2 border-farm-200 bg-white p-[18px] shadow-[0_12px_30px_rgba(120,70,20,.14)]">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-black text-ink-700">{STRINGS.earnedLabel}</span>
          <span className="text-[26px] font-black tabular-nums text-ink-900">🪙 +{munten}</span>
        </div>
        <div className="h-0.5 bg-farm-100" />
        {base > 0 && (
          <Line label={STRINGS.earnedBase[summary.kind]} value={`+${base} 🪙`} />
        )}
        {summary.perfect && (
          <Line label={STRINGS.earnedPerfect} value="" tone="leaf" />
        )}
        {bonus > 0 && (
          <Line
            label={STRINGS.earnedStreak(summary.multiplier)}
            value={`+${bonus} 🪙`}
            tone="warn"
          />
        )}
        <Line label={STRINGS.earnedXpLine} value={`+${xp} XP`} tone="leaf" />
      </div>

      <div className="px-[18px] pb-40 pt-[190px]">
        {moved.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-ink-400">
              {STRINGS.boxUp}
            </span>
            <div className="flex flex-wrap gap-2">
              {moved.map((change) => {
                const word = WORDS_BY_ID.get(change.wordId);
                if (!word) return null;
                const up = change.to > change.from;
                return (
                  <span
                    key={change.wordId}
                    className={`rounded-full border-2 px-3.5 py-2 text-sm font-black ${
                      up
                        ? "border-ok-border bg-ok-bg text-ok-text"
                        : "border-warn-border bg-warn-bg text-warn-text"
                    }`}
                  >
                    {word.article ? `${word.article} ${word.nl}` : word.nl} {up ? "↑" : "↓"}
                  </span>
                );
              })}
              {extra > 0 && (
                <span className="rounded-full bg-farm-100 px-3.5 py-2 text-sm font-black text-ink-500">
                  {STRINGS.alertsMore(extra)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 flex flex-col gap-2.5 bg-gradient-to-t from-farm-50 via-farm-50 to-transparent px-[18px] pb-[calc(24px+env(safe-area-inset-bottom))] pt-6">
        <button
          onClick={onDone}
          className="h-[60px] w-full rounded-[18px] border-b-[5px] border-leaf-600 bg-leaf-500 font-black text-[17px] text-white active:translate-y-0.5 active:border-b-0"
        >
          {STRINGS.backHome} 🏡
        </button>
        {onAgain && (
          <button
            onClick={onAgain}
            className="h-14 w-full rounded-[18px] bg-farm-100 font-black text-base text-farm-700 active:bg-farm-200"
          >
            {STRINGS.anotherLesson}
          </button>
        )}
      </div>
    </div>
  );
}

function Line({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "warn" | "leaf";
}) {
  const color =
    tone === "warn" ? "text-warn-text-2" : tone === "leaf" ? "text-leaf-600" : "text-ink-700";
  return (
    <div className={`flex items-center justify-between text-sm font-extrabold ${color}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
