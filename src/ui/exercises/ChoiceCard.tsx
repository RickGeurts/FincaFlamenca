import { useMemo, useState } from "react";
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
    <div className="flex flex-1 flex-col justify-center gap-4">
      <button
        onClick={() => speak(exercise.prompt_nl)}
        className="self-center text-center text-[21px] font-black text-ink-900"
      >
        {canSpeak() && <span className="mr-2">🔊</span>}
        {exercise.prompt_nl}
      </button>
      <div className="flex flex-col gap-2.5">
        {options.map((option) => (
          <button
            key={option}
            disabled={locked}
            onClick={() => setSelected(option)}
            className={`rounded-2xl border-2 border-b-[5px] bg-white px-4 py-3.5 text-left font-black text-[17px] text-ink-900 ${
              selected === option ? "border-leaf-500" : "border-farm-200"
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
