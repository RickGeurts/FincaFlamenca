import { useMemo, useState } from "react";
import { STRINGS } from "../../content/strings.es";
import type { ChoiceExercise } from "../../content/types";
import { shuffle } from "../../learning/lesson";
import { randomRng } from "../../utils/rng";
import { speak } from "../../utils/speak";
import { Modal } from "../Modal";

interface Props {
  exercise: ChoiceExercise;
  /** Called once, on the first tap. Returns munten earned. */
  onAnswer: (correct: boolean) => number;
  onClose: () => void;
}

/** One-tap SRS question during a farm chore. Kind: wrong answers cost nothing. */
export function ChoreQuestionModal({ exercise, onAnswer, onClose }: Props) {
  const options = useMemo(
    () => shuffle([exercise.answer_es, ...exercise.distractors_es], randomRng()),
    [exercise],
  );
  const [result, setResult] = useState<{ correct: boolean; earned: number } | null>(null);

  const answer = (option: string) => {
    if (result) return;
    const correct = option === exercise.answer_es;
    const earned = onAnswer(correct);
    setResult({ correct, earned });
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col gap-3">
        <h2 className="font-bold text-farm-700/80">{STRINGS.choicePrompt}</h2>
        <button
          onClick={() => speak(exercise.prompt_nl)}
          className="self-start rounded-2xl bg-white px-5 py-3 text-2xl font-extrabold shadow-sm"
        >
          🔊 {exercise.prompt_nl}
        </button>
        <div className="flex flex-col gap-2">
          {options.map((option) => (
            <button
              key={option}
              disabled={result !== null}
              onClick={() => answer(option)}
              className={`min-h-11 rounded-xl border-2 px-4 py-3 text-left font-bold ${
                result && option === exercise.answer_es
                  ? "border-leaf-500 bg-lime-50"
                  : "border-farm-200 bg-white"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        {result && (
          <p
            className={`rounded-xl p-3 font-bold ${
              result.correct ? "bg-lime-100 text-lime-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {result.correct
              ? STRINGS.choreCorrect(result.earned)
              : `${STRINGS.choreWrong} ${exercise.answer_es}`}
          </p>
        )}
      </div>
    </Modal>
  );
}
