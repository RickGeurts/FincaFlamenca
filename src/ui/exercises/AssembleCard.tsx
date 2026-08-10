import { useMemo, useState } from "react";
import { STRINGS } from "../../content/strings.es";
import type { AssembleExercise } from "../../content/types";
import type { GradeResult } from "../../learning/grader";
import { gradeExercise, shuffle } from "../../learning/lesson";
import { randomRng } from "../../utils/rng";
import { CheckButton } from "./CheckButton";

interface Props {
  exercise: AssembleExercise;
  locked: boolean;
  onResult: (r: GradeResult) => void;
}

export function AssembleCard({ exercise, locked, onResult }: Props) {
  // Tiles can repeat, so track them by index, not by text.
  const tiles = useMemo(
    () => shuffle(exercise.tiles_nl.map((text, i) => ({ text, id: i })), randomRng()),
    [exercise],
  );
  const [picked, setPicked] = useState<number[]>([]);

  const pickedTiles = picked.map((id) => tiles.find((t) => t.id === id)!);
  const sentence = pickedTiles.map((t) => t.text).join(" ");

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h2 className="font-bold text-farm-700/80">{STRINGS.assemblePrompt}</h2>
      <p className="rounded-2xl bg-white px-5 py-4 text-xl font-extrabold shadow-sm">
        {exercise.prompt_es}
      </p>

      <div className="min-h-16 rounded-2xl border-2 border-dashed border-farm-200 p-3">
        <div className="flex flex-wrap gap-2">
          {pickedTiles.map((tile) => (
            <button
              key={tile.id}
              disabled={locked}
              onClick={() => setPicked((p) => p.filter((id) => id !== tile.id))}
              className="min-h-11 rounded-xl bg-leaf-500 px-4 py-2 font-bold text-white"
            >
              {tile.text}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tiles.map((tile) => {
          const used = picked.includes(tile.id);
          return (
            <button
              key={tile.id}
              disabled={locked || used}
              onClick={() => setPicked((p) => [...p, tile.id])}
              className={`min-h-11 rounded-xl border-2 px-4 py-2 font-bold ${
                used ? "border-farm-100 bg-farm-100 text-transparent" : "border-farm-200 bg-white"
              }`}
            >
              {tile.text}
            </button>
          );
        })}
      </div>

      <CheckButton
        disabled={locked || picked.length === 0}
        onClick={() => onResult(gradeExercise(exercise, sentence))}
      />
    </div>
  );
}
