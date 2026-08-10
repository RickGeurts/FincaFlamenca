import { useState } from "react";
import { STRINGS } from "../content/strings.es";
import type { Exercise } from "../content/types";
import type { GradeResult } from "../learning/grader";
import { exerciseWordIds } from "../learning/lesson";
import type { AnswerRecord } from "../state/store";
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
  onFinish: (results: LessonResults) => void;
  onExit: () => void;
}

export function LessonPlayer({ exercises, onFinish, onExit }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [feedback, setFeedback] = useState<GradeResult | null>(null);

  const exercise = exercises[index];
  const progress = exercises.length === 0 ? 0 : index / exercises.length;

  const handleResult = (result: GradeResult) => {
    setFeedback(result);
    setAnswers((prev) => [
      ...prev,
      { wordIds: exerciseWordIds(exercise), correct: result.correct },
    ]);
  };

  const handleContinue = () => {
    setFeedback(null);
    if (index + 1 >= exercises.length) {
      onFinish({ answers });
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <div className="flex flex-1 flex-col p-4">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={onExit}
          aria-label={STRINGS.exitLesson}
          className="min-h-11 min-w-11 rounded-xl bg-farm-100 font-bold text-farm-700"
        >
          ✕
        </button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-farm-200">
          <div
            className="h-full rounded-full bg-leaf-500 transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <ExerciseCard
          key={index}
          exercise={exercise}
          locked={feedback !== null}
          onResult={handleResult}
        />
      </div>

      {feedback && (
        <div
          className={`mt-4 rounded-2xl p-4 font-bold shadow-sm ${
            feedback.correct
              ? feedback.typo
                ? "bg-amber-100 text-amber-800"
                : "bg-lime-100 text-lime-800"
              : "bg-rose-100 text-rose-800"
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
            <p className="mt-1 text-sm font-semibold opacity-80">{feedback.expected}</p>
          )}
          <button
            onClick={handleContinue}
            className="mt-3 min-h-11 w-full rounded-xl bg-leaf-500 py-3 font-bold text-white active:bg-leaf-600"
          >
            {STRINGS.continue}
          </button>
        </div>
      )}
    </div>
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
