import { useEffect, useRef, useState } from "react";
import { STRINGS } from "../../content/strings.es";
import type { DialogueQuest } from "../../content/types";
import {
  answer,
  choose,
  currentNode,
  questSteps,
  startDialogue,
  type DialogueState,
  type Turn,
} from "../../quests/dialogue";
import { canSpeak, speak } from "../../utils/speak";
import { useGameStore, type QuestOutcome } from "../../state/store";
import { play } from "../../utils/sfx";

/** Stand-in for the player's own character art, which is M4 work. */
const PLAYER_FACE = "👩🏽‍🌾";

interface Props {
  quest: DialogueQuest;
  onLeave: () => void;
}

/**
 * A conversation with somebody in the village.
 *
 * Dutch is always first and the Spanish is always one tap away, free. She
 * either picks a line or writes one; writing is graded with the same tolerant
 * rules as the exercises, and getting it wrong still moves the conversation
 * along — being held at a counter until you spell it right is not what this
 * game does to anyone.
 */
export function QuestScreen({ quest, onLeave }: Props) {
  const completed = useGameStore((s) => s.player.completedQuests.includes(quest.id));
  const completeQuest = useGameStore((s) => s.completeQuest);

  const [state, setState] = useState<DialogueState>(() => startDialogue(quest));
  const [text, setText] = useState("");
  const [correction, setCorrection] = useState<string | null>(null);
  const [hinting, setHinting] = useState(false);
  const [outcome, setOutcome] = useState<QuestOutcome | null>(null);
  // Whether it had been done before has to be read before paying out, or the
  // "you have done this one already" note would always be true.
  const replay = useRef(completed);
  const tail = useRef<HTMLDivElement>(null);

  const node = currentNode(quest, state);
  const total = questSteps(quest);

  useEffect(() => {
    tail.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state.turns.length, correction]);

  // The reward lands the moment the conversation ends, once.
  useEffect(() => {
    if (!state.done || outcome) return;
    play("celebrate");
    setOutcome(completeQuest(quest.id));
  }, [state.done, outcome, completeQuest, quest.id]);

  const send = () => {
    if (!text.trim()) return;
    const result = answer(quest, state, text);
    setState(result.state);
    setCorrection(result.result.correct ? null : (node?.answer_nl ?? null));
    setText("");
    setHinting(false);
  };

  return (
    <div className="animate-fade-up absolute inset-0 flex flex-col bg-gradient-to-b from-room-top to-room-low">
      <header className="flex items-center gap-3 bg-farm-50/92 px-[18px] py-4">
        <button
          onClick={onLeave}
          aria-label={STRINGS.close}
          className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-farm-100 text-[17px] font-black text-farm-700"
        >
          ✕
        </button>
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="text-[13px] font-black text-ink-900">
            {quest.title_es} · {STRINGS.questStep(Math.min(state.step + 1, total), total)}
          </span>
          <div className="h-2 overflow-hidden rounded-full bg-farm-100">
            <div
              className="h-full rounded-full bg-leaf-500 transition-all duration-300"
              style={{ width: `${Math.round((state.step / total) * 100)}%` }}
            />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-[18px]">
        {state.turns.map((turn, i) => (
          <Bubble
            key={i}
            turn={turn}
            face={turn.who === "npc" ? quest.npc_emoji : PLAYER_FACE}
            latest={i === state.turns.length - 1}
          />
        ))}
        {correction && (
          <p className="self-end rounded-[18px] border-2 border-warn-border bg-warn-bg px-4 py-2.5 text-sm font-black text-warn-text">
            {STRINGS.questCorrection} {correction}
          </p>
        )}
        <div ref={tail} />
      </div>

      {outcome ? (
        <div className="flex flex-col gap-2.5 bg-farm-50/96 p-4 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-[0_-6px_24px_rgba(120,70,20,.14)]">
          <span className="text-center text-lg font-black text-ink-900">
            {STRINGS.questDoneTitle} 🎉
          </span>
          <span className="text-center text-2xl font-black text-farm-700">
            🪙 +{outcome.munten}
          </span>
          {outcome.landLevel !== undefined && (
            <span className="text-center text-sm font-black text-leaf-600">
              {STRINGS.questLandGrew}
            </span>
          )}
          {outcome.gift && (
            <span className="text-center text-sm font-black text-leaf-600">
              {STRINGS.questGift}
            </span>
          )}
          {replay.current && (
            <span className="text-center text-xs font-bold text-ink-500">{STRINGS.questAgain}</span>
          )}
          <button
            onClick={onLeave}
            className="h-14 w-full rounded-2xl border-b-[5px] border-leaf-600 bg-leaf-500 font-black text-[17px] text-white active:translate-y-0.5 active:border-b-0"
          >
            {STRINGS.questBack}
          </button>
        </div>
      ) : node?.choices ? (
        <div className="flex flex-col gap-2.5 bg-farm-50/96 p-4 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-[0_-6px_24px_rgba(120,70,20,.14)]">
          <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-ink-400">
            {STRINGS.questChoose}
          </span>
          {node.choices.map((option, i) => (
            <button
              key={i}
              onClick={() => {
                setCorrection(null);
                setState(choose(quest, state, i));
              }}
              className="rounded-2xl border-2 border-b-[5px] border-farm-200 bg-white px-4 py-3.5 text-left font-black text-[17px] text-ink-900 active:translate-y-0.5 active:border-b-2"
            >
              {option.nl}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 bg-farm-50/96 p-4 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-[0_-6px_24px_rgba(120,70,20,.14)]">
          <span className="text-xs font-extrabold uppercase tracking-[0.1em] text-ink-400">
            {node?.ask_es ?? STRINGS.questWriteAnswer}
          </span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={STRINGS.typePlaceholder}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="rounded-2xl border-2 border-farm-200 bg-white px-4 py-3.5 font-black text-[17px] text-ink-900 placeholder:text-ink-300 focus:border-leaf-500 focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setHinting(true)}
              className="rounded-xl bg-farm-100 px-3.5 py-2 text-[13px] font-extrabold text-ink-700"
            >
              {STRINGS.questHint}
            </button>
            {hinting &&
              (node?.hint_nl ?? []).map((word) => (
                <button
                  key={word}
                  onClick={() => setText((t) => `${t} ${word}`.trim())}
                  className="rounded-xl bg-farm-100 px-3.5 py-2 text-[13px] font-extrabold text-ink-700"
                >
                  {word}
                </button>
              ))}
          </div>
          <button
            disabled={!text.trim()}
            onClick={send}
            className="h-14 w-full rounded-2xl border-b-[5px] border-leaf-600 bg-leaf-500 font-black text-[17px] text-white disabled:opacity-40 active:translate-y-0.5 active:border-b-0"
          >
            {STRINGS.questSend}
          </button>
        </div>
      )}
    </div>
  );
}

/** One line of the conversation. Spanish is revealed on request, never charged. */
function Bubble({ turn, face, latest }: { turn: Turn; face: string; latest: boolean }) {
  const [revealed, setRevealed] = useState(false);

  if (turn.who === "player") {
    return (
      <div className="flex flex-row-reverse items-start gap-3">
        <span className="text-[52px] leading-none">{face}</span>
        <div className="max-w-[230px] rounded-[20px] rounded-tr-md bg-leaf-500 px-4 py-3.5">
          <p className="text-base font-black leading-[1.35] text-white">{turn.nl}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <span className="text-[52px] leading-none">{face}</span>
      <div className="flex-1 rounded-[20px] rounded-tl-md bg-white px-4 py-3.5 shadow-[0_6px_16px_rgba(120,70,20,.12)]">
        <p className="text-[17px] font-black leading-[1.35] text-ink-900">{turn.nl}</p>
        {revealed ? (
          <p className="mt-2 text-[13px] font-bold text-ink-500">{turn.es}</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => setRevealed(true)}
              className="rounded-xl bg-farm-100 px-3 py-1.5 text-xs font-extrabold text-ink-500"
            >
              {STRINGS.revealSpanish}
            </button>
            {latest && canSpeak() && (
              <button
                onClick={() => speak(turn.nl)}
                aria-label={STRINGS.listen}
                className="rounded-xl bg-farm-100 px-3 py-1.5 text-xs font-extrabold text-ink-500"
              >
                🔊
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
