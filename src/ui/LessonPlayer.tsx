import { useCallback, useMemo, useRef, useState } from "react";
import { STRINGS } from "../content/strings.es";
import type { Exercise } from "../content/types";
import type { GradeResult } from "../learning/grader";
import { exerciseWordIds } from "../learning/lesson";
import { play } from "../utils/sfx";
import type { AnswerRecord } from "../state/store";
import { LessonPath, TYPE_ICON } from "./LessonPath";
import { CheckFooterProvider, type CheckAction } from "./exercises/CheckButton";
import { ChoiceCard } from "./exercises/ChoiceCard";
import { TranslateCard } from "./exercises/TranslateCard";
import { ListenCard } from "./exercises/ListenCard";
import { AssembleCard } from "./exercises/AssembleCard";
import { MatchCard } from "./exercises/MatchCard";

export interface LessonResults {
  answers: AnswerRecord[];
}

interface Props {
  exercises: Exercise[];
  /** Which classroom's path this is, shown in the header. */
  title: string;
  /** What finishing this session pays, before any streak bonus. */
  reward: number;
  onFinish: (results: LessonResults) => void;
  onExit: () => void;
}

const PROMPT: Record<Exercise["type"], string> = {
  choice: STRINGS.choicePrompt,
  translate: STRINGS.translatePrompt,
  listen: STRINGS.listenPrompt,
  assemble: STRINGS.assemblePrompt,
  match: STRINGS.matchPrompt,
};

export function LessonPlayer({ exercises, title, reward, onFinish, onExit }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [feedback, setFeedback] = useState<GradeResult | null>(null);

  // The card publishes its check button up here; see CheckButton for why.
  const action = useRef<CheckAction | null>(null);
  const [canCheck, setCanCheck] = useState(false);
  const publish = useCallback((next: CheckAction | null) => {
    action.current = next;
    const enabled = next !== null && !next.disabled;
    setCanCheck((was) => (was === enabled ? was : enabled));
  }, []);
  const footer = useMemo(() => ({ publish }), [publish]);

  const exercise = exercises[index];

  const handleResult = (result: GradeResult) => {
    setFeedback(result);
    play(result.correct ? "correct" : "wrong");
    setAnswers((prev) => [
      ...prev,
      { wordIds: exerciseWordIds(exercise), correct: result.correct },
    ]);
  };

  const advance = () => {
    setFeedback(null);
    publish(null);
    if (index + 1 >= exercises.length) onFinish({ answers });
    else setIndex(index + 1);
  };

  return (
    <CheckFooterProvider value={footer}>
      <div className="flex min-h-dvh flex-col bg-farm-50 p-[18px]">
        <header className="flex items-center justify-between gap-2 pb-3">
          <button
            onClick={onExit}
            aria-label={STRINGS.exitLesson}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-farm-100 text-lg font-black text-farm-700"
          >
            ✕
          </button>
          <span className="text-sm font-black text-ink-500">{title}</span>
          {/* What this session pays, not a running tally: a number that fell
              after a wrong answer would turn a mistake into a punishment. */}
          <span className="text-sm font-black text-farm-700">
            {reward > 0 ? STRINGS.sessionEarnings(reward) : "🌱"}
          </span>
        </header>

        <div className="flex min-h-0 flex-1 gap-4">
          <LessonPath exercises={exercises} index={index} />

          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <span className="self-start rounded-full bg-farm-100 px-3.5 py-1.5 text-xs font-black text-ink-500">
              {TYPE_ICON[exercise.type]} {PROMPT[exercise.type]}
            </span>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[26px] border-2 border-farm-200 bg-white p-5 shadow-[0_8px_22px_rgba(120,70,20,.08)]">
              <ExerciseCard
                key={index}
                exercise={exercise}
                locked={feedback !== null}
                onResult={handleResult}
              />
            </div>
          </div>
        </div>

        {feedback ? (
          <div
            className={`animate-toast-in mt-3 flex flex-col gap-3 rounded-[22px] border-2 p-4 font-black ${
              feedback.correct
                ? feedback.typo
                  ? "border-warn-border bg-warn-bg text-warn-text"
                  : "border-ok-border bg-ok-bg text-ok-text"
                : "border-bad-border bg-bad-bg text-bad-text"
            }`}
          >
            {feedback.correct ? (
              <p>{feedback.typo ? STRINGS.typoFeedback : STRINGS.correctFeedback}</p>
            ) : (
              <p>
                {STRINGS.wrongFeedback}{" "}
                <span className="underline decoration-2">{feedback.expected}</span>
              </p>
            )}
            {feedback.typo && feedback.expected && (
              <p className="text-sm font-extrabold opacity-80">{feedback.expected}</p>
            )}
            <button
              onClick={advance}
              className="h-14 w-full rounded-2xl border-b-[5px] border-leaf-600 bg-leaf-500 font-black text-[17px] text-white active:translate-y-0.5 active:border-b-0"
            >
              {STRINGS.continue}
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-extrabold text-ink-500">
              <span>{STRINGS.pathStop(index + 1, exercises.length)}</span>
              {/* Skipping records nothing at all: it is not a wrong answer. */}
              <button onClick={advance}>{STRINGS.skip}</button>
            </div>
            <button
              disabled={!canCheck}
              onClick={() => action.current?.onClick()}
              className="h-[60px] w-full rounded-[18px] border-b-[5px] border-leaf-600 bg-leaf-500 font-black text-[18px] text-white disabled:opacity-40 active:translate-y-0.5 active:border-b-0"
            >
              {STRINGS.check}
            </button>
          </div>
        )}
      </div>
    </CheckFooterProvider>
  );
}

function ExerciseCard({
  exercise,
  locked,
  onResult,
}: {
  exercise: Exercise;
  locked: boolean;
  onResult: (r: GradeResult) => void;
}) {
  switch (exercise.type) {
    case "choice":
      return <ChoiceCard exercise={exercise} locked={locked} onResult={onResult} />;
    case "translate":
      return <TranslateCard exercise={exercise} locked={locked} onResult={onResult} />;
    case "listen":
      return <ListenCard exercise={exercise} locked={locked} onResult={onResult} />;
    case "assemble":
      return <AssembleCard exercise={exercise} locked={locked} onResult={onResult} />;
    case "match":
      return <MatchCard exercise={exercise} locked={locked} onResult={onResult} />;
  }
}
