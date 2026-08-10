import { useMemo, useState } from "react";
import { STRINGS } from "../../content/strings.es";
import type { ChoiceExercise } from "../../content/types";
import type { GradeResult } from "../../learning/grader";
import { gradeExercise, shuffle } from "../../learning/lesson";
import { randomRng } from "../../utils/rng";
import { speak, canSpeak } from "../../utils/speak";
import { CheckButton } from "./CheckButton";

interface Props {
  exercise: ChoiceExercise;
  locked: boolean;
  onResult: (r: GradeResult) => void;
}

export function ChoiceCard({ exercise, locked, onResult }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = useMemo(
    () => shuffle([exercise.answer_es, ...exercise.distractors_es], randomRng()),
    [exercise],
  );

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="font-bold text-farm-700/80">{STRINGS.choicePrompt}</h2>
      <button
        onClick={() => speak(exercise.prompt_nl)}
        className="self-start rounded-2xl bg-white px-5 py-3 text-2xl font-extrabold shadow-sm"
      >
        {canSpeak() && <span className="mr-2">🔊</span>}
        {exercise.prompt_nl}
      </button>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <button
            key={option}
            disabled={locked}
            onClick={() => setSelected(option)}
            className={`min-h-11 rounded-xl border-2 px-4 py-3 text-left font-bold ${
              selected === option
                ? "border-leaf-500 bg-lime-50"
                : "border-farm-200 bg-white"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <CheckButton
        disabled={locked || selected === null}
        onClick={() => selected !== null && onResult(gradeExercise(exercise, selected))}
      />
    </div>
  );
}
