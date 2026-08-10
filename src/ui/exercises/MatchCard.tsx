import { useMemo, useState } from "react";
import type { MatchExercise } from "../../content/types";
import type { GradeResult } from "../../learning/grader";
import { shuffle } from "../../learning/lesson";
import { randomRng } from "../../utils/rng";
import { speak } from "../../utils/speak";

interface Props {
  exercise: MatchExercise;
  locked: boolean;
  onResult: (r: GradeResult) => void;
}

export function MatchCard({ exercise, locked, onResult }: Props) {
  const left = useMemo(() => shuffle(exercise.pairs.map((p) => p.nl), randomRng()), [exercise]);
  const right = useMemo(() => shuffle(exercise.pairs.map((p) => p.es), randomRng()), [exercise]);

  const [selectedNl, setSelectedNl] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set()); // nl values
  const [mistakes, setMistakes] = useState(0);
  const [shakeEs, setShakeEs] = useState<string | null>(null);

  const esFor = (nl: string) => exercise.pairs.find((p) => p.nl === nl)?.es;
  const matchedEs = new Set([...matched].map((nl) => esFor(nl)));

  const pickNl = (nl: string) => {
    if (locked || matched.has(nl)) return;
    speak(nl);
    setSelectedNl(nl);
  };

  const pickEs = (es: string) => {
    if (locked || selectedNl === null || matchedEs.has(es)) return;
    if (esFor(selectedNl) === es) {
      const next = new Set(matched).add(selectedNl);
      setMatched(next);
      setSelectedNl(null);
      if (next.size === exercise.pairs.length) {
        const perfect = mistakes === 0;
        onResult({ correct: perfect, typo: false, expected: "" });
      }
    } else {
      setMistakes((m) => m + 1);
      setShakeEs(es);
      setSelectedNl(null);
      setTimeout(() => setShakeEs(null), 400);
    }
  };

  const buttonBase =
    "min-h-14 rounded-2xl border-2 border-b-[5px] px-3 py-3 font-black text-[15px] transition-colors";

  return (
    <div className="flex flex-1 flex-col justify-center gap-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          {left.map((nl) => (
            <button
              key={nl}
              disabled={locked || matched.has(nl)}
              onClick={() => pickNl(nl)}
              className={`${buttonBase} ${
                matched.has(nl)
                  ? "border-ok-border bg-ok-bg text-ok-text"
                  : selectedNl === nl
                    ? "border-leaf-500 bg-ok-bg"
                    : "border-farm-200 bg-white text-ink-900"
              }`}
            >
              {nl}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {right.map((es) => (
            <button
              key={es}
              disabled={locked || matchedEs.has(es)}
              onClick={() => pickEs(es)}
              className={`${buttonBase} ${
                matchedEs.has(es)
                  ? "border-ok-border bg-ok-bg text-ok-text"
                  : shakeEs === es
                    ? "border-bad-border bg-bad-bg"
                    : "border-farm-200 bg-white text-ink-900"
              }`}
            >
              {es}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
