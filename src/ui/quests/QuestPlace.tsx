import { STRINGS } from "../../content/strings.es";
import { QUESTS } from "../../content";
import { questsAt } from "../../quests/quests";
import { useGameStore } from "../../state/store";
import { QuestRow } from "./QuestRow";

/**
 * A place whose whole purpose is the person standing in it — the town hall,
 * for now. Once she has done the conversation it stays on the list with a
 * repeat arrow: replaying is how the language sticks, and it pays a little.
 */
export function QuestPlace({
  onBack,
  onStartQuest,
}: {
  onBack: () => void;
  onStartQuest: (questId: string) => void;
}) {
  const munten = useGameStore((s) => s.player.munten);
  const unlockedUnits = useGameStore((s) => s.player.unlockedUnits);
  const completedQuests = useGameStore((s) => s.player.completedQuests);

  const here = questsAt(QUESTS, "alcaldia", unlockedUnits);

  return (
    <div className="animate-fade-up absolute inset-0 flex flex-col bg-farm-50">
      <header className="flex items-center justify-between gap-2 bg-farm-100 p-[18px]">
        <button
          onClick={onBack}
          aria-label={STRINGS.back}
          className="flex h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-white text-lg font-black text-farm-700 active:bg-farm-200"
        >
          ←
        </button>
        <span className="flex flex-col items-center leading-[1.15]">
          <span className="text-[17px] font-black text-ink-900">{STRINGS.alcaldiaTitle}</span>
          <span className="text-xs font-extrabold text-ink-500">{STRINGS.alcaldiaSubtitle}</span>
        </span>
        <span className="text-[15px] font-black text-farm-700">🪙 {munten}</span>
      </header>

      <div className="flex flex-1 flex-col gap-3 p-[18px]">
        {here.length === 0 ? (
          <p className="rounded-[20px] bg-farm-100 p-4 text-sm font-bold text-ink-500 [text-wrap:pretty]">
            {STRINGS.questNoneHere}
          </p>
        ) : (
          here.map((quest) => (
            <QuestRow
              key={quest.id}
              quest={quest}
              place={STRINGS.places.alcaldia}
              done={completedQuests.includes(quest.id)}
              onStart={() => onStartQuest(quest.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
