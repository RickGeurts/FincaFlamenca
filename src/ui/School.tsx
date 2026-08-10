import { STRINGS } from "../content/strings.es";
import { UNITS } from "../content";
import { ECONOMY, xpRequiredForUnit } from "../game/economy";
import type { Player } from "../game/types";
import type { WordProgress } from "../learning/srs";

interface Props {
  player: Player;
  words: Record<string, WordProgress>;
  dueCount: number;
  onBack: () => void;
  onStartLesson: (unit: number) => void;
  onStartReview: () => void;
}

/**
 * One face per classroom. Units are not objects on the farm, so there is no
 * model to show — an emoji is the symbol here, the way 🪙 and 🔥 are.
 */
const UNIT_ICON: Record<number, string> = {
  1: "👋",
  2: "🔢",
  3: "🐄",
  4: "🍞",
  5: "🏛️",
  6: "👗",
  7: "🏠",
  8: "🌦️",
  9: "🧭",
  10: "🎉",
};

/**
 * La escuela: where she chooses what to practise. Only learning lives here —
 * cloud sync and backups moved to the settings sheet, because a school full of
 * admin panels looks like paperwork.
 */
export function School({
  player,
  words,
  dueCount,
  onBack,
  onStartLesson,
  onStartReview,
}: Props) {
  const current = Math.max(...player.unlockedUnits);

  return (
    <div className="animate-fade-up absolute inset-0 overflow-y-auto bg-farm-50">
      <div className="h-[190px] bg-gradient-to-b from-leaf-600 to-leaf-500" />

      <div className="absolute inset-x-[18px] top-5 flex items-center justify-between">
        <button
          onClick={onBack}
          aria-label={STRINGS.back}
          className="flex h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-white/20 text-lg font-black text-white active:bg-white/30"
        >
          ←
        </button>
        <span className="text-[17px] font-black text-white">{STRINGS.schoolTitle}</span>
        <span className="text-sm font-black text-white">🔥 {player.streak.days}</span>
      </div>

      <div className="absolute inset-x-[18px] top-[76px] flex items-center justify-between gap-3 rounded-[22px] bg-white/16 p-4">
        <div className="flex min-w-0 flex-col leading-[1.3]">
          <span className="text-base font-black text-white">{STRINGS.dailyReview}</span>
          <span className="truncate text-[13px] font-bold text-ok-bg">
            {dueCount > 0
              ? STRINGS.reviewReward(dueCount, ECONOMY.REVIEW_MUNTEN)
              : STRINGS.noWordsToReview}
          </span>
        </div>
        {dueCount > 0 && (
          <button
            onClick={onStartReview}
            className="shrink-0 rounded-[14px] bg-farm-50 px-[18px] py-3 text-sm font-black text-leaf-600 active:bg-farm-100"
          >
            {STRINGS.reviewNow}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 p-[18px] pb-8 pt-4">
        <span className="text-xs font-black uppercase tracking-[0.12em] text-ink-400">
          {STRINGS.schoolClassrooms}
        </span>

        {UNITS.map((unit) => {
          const unlocked = player.unlockedUnits.includes(unit.unit);
          // Progress is the share of the unit's words she has actually got
          // into her head — the only measure of a unit the game really keeps.
          const known = unit.words.filter((id) => (words[id]?.box ?? 0) >= 1).length;
          const share = unit.words.length === 0 ? 0 : known / unit.words.length;
          const missingXp = Math.max(0, xpRequiredForUnit(unit.unit) - player.xp);

          if (!unlocked) {
            return (
              <div
                key={unit.unit}
                className="flex items-center gap-3.5 rounded-[22px] border-2 border-dashed border-farm-200 bg-farm-100 p-3.5 opacity-75"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[22px]">
                  {UNIT_ICON[unit.unit] ?? "📗"}
                </span>
                <span className="flex min-w-0 flex-1 flex-col leading-[1.3]">
                  <span className="truncate text-base font-black text-ink-900">
                    {unit.unit} · {unit.title_es}
                  </span>
                  <span className="truncate text-[13px] font-bold text-ink-500">
                    {STRINGS.unitLockedXp(missingXp)}
                  </span>
                </span>
                <span className="text-xl">🔒</span>
              </div>
            );
          }

          const isCurrent = unit.unit === current;
          return (
            <button
              key={unit.unit}
              onClick={() => onStartLesson(unit.unit)}
              className="flex items-center gap-3.5 rounded-[22px] border-2 border-farm-200 bg-white p-3.5 text-left transition-transform duration-75 active:scale-[0.99]"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300"
                style={{
                  background: `conic-gradient(var(--color-leaf-500) 0turn ${share}turn, var(--color-farm-100) ${share}turn 1turn)`,
                }}
              >
                <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white text-xl">
                  {UNIT_ICON[unit.unit] ?? "📗"}
                </span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col leading-[1.3]">
                <span className="truncate text-base font-black text-ink-900">
                  {unit.unit} · {unit.title_es}
                </span>
                <span className="truncate text-[13px] font-bold text-ink-500">
                  {unit.title_nl} · {STRINGS.wordsOfUnit(known, unit.words.length)}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-[14px] px-4 py-2.5 text-sm font-black ${
                  isCurrent ? "bg-leaf-500 text-white" : "bg-farm-100 text-farm-700"
                }`}
              >
                {isCurrent ? STRINGS.continueUnit : STRINGS.enterUnit}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
