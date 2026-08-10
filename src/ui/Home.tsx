import { STRINGS } from "../content/strings.es";
import { BackupPanel } from "./BackupPanel";
import { SyncPanel } from "./SyncPanel";
import { UNITS } from "../content";
import type { Player } from "../game/types";

interface Props {
  player: Player;
  dueCount: number;
  onStartLesson: (unit: number) => void;
  onStartReview: () => void;
}

export function Home({ player, dueCount, onStartLesson, onStartReview }: Props) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <section className="rounded-2xl bg-farm-100 p-4 shadow-sm">
        <h2 className="mb-2 font-extrabold text-farm-700">{STRINGS.review}</h2>
        {dueCount > 0 ? (
          <button
            onClick={onStartReview}
            className="min-h-11 w-full rounded-xl bg-leaf-500 px-4 py-3 font-bold text-white active:bg-leaf-600"
          >
            {STRINGS.reviewButton} · {STRINGS.wordsToReview(dueCount)}
          </button>
        ) : (
          <p className="text-sm text-farm-700/70">{STRINGS.noWordsToReview}</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-extrabold text-farm-700">{STRINGS.lessons}</h2>
        {UNITS.map((unit) => {
          const unlocked = player.unlockedUnits.includes(unit.unit);
          return (
            <div
              key={unit.unit}
              className={`rounded-2xl p-4 shadow-sm ${unlocked ? "bg-white" : "bg-farm-100 opacity-60"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold">
                    {unit.unit}. {unit.title_es}
                  </p>
                  <p className="text-sm text-farm-700/70">{unit.title_nl}</p>
                </div>
                {unlocked ? (
                  <button
                    onClick={() => onStartLesson(unit.unit)}
                    className="min-h-11 rounded-xl bg-farm-600 px-5 py-2 font-bold text-white active:bg-farm-700"
                  >
                    {STRINGS.startLesson}
                  </button>
                ) : (
                  <span className="text-xs text-farm-700/60">🔒 {STRINGS.unitLocked}</span>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <SyncPanel />
      <BackupPanel />
    </div>
  );
}
