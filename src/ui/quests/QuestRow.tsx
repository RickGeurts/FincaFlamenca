import { STRINGS } from "../../content/strings.es";
import type { DialogueQuest } from "../../content/types";

/**
 * One conversation on offer. The same row on the school's list, at the town
 * hall and in the market, so a quest looks like itself wherever she meets it.
 */
export function QuestRow({
  quest,
  place,
  done,
  onStart,
}: {
  quest: DialogueQuest;
  /** Where she has to go for it, in Spanish. */
  place: string;
  done: boolean;
  onStart: () => void;
}) {
  return (
    <button
      onClick={onStart}
      className="flex items-center gap-3 rounded-[22px] border-2 border-farm-200 bg-white p-3.5 text-left transition-transform duration-75 active:scale-[0.99]"
    >
      <span className="text-[28px]">{quest.npc_emoji}</span>
      <span className="flex min-w-0 flex-1 flex-col leading-[1.3]">
        <span className="truncate text-[15px] font-black text-ink-900">{quest.title_es}</span>
        <span className="truncate text-xs font-bold text-ink-500">
          {STRINGS.questAt(place)} · {quest.summary_es}
        </span>
      </span>
      <span className="shrink-0 text-lg font-black text-farm-700">
        {done ? "↻" : "›"}
      </span>
    </button>
  );
}
