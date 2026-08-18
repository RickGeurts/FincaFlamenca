import { useEffect, useState } from "react";
import { STRINGS } from "../../content/strings.es";
import type { PickExercise } from "../../content/types";
import { canSpeak, speak } from "../../utils/speak";
import { Modal } from "../Modal";

interface Props {
  exercise: PickExercise;
  /** Called once, on the first tap. Returns munten earned. */
  onAnswer: (correct: boolean) => number;
  onClose: () => void;
}

/**
 * One-tap review question during a farm chore. Kind: wrong answers cost nothing.
 *
 * It asks whatever the word has earned — what it means, which article it takes,
 * how to say it, or what it sounds like — because this is the question she
 * meets most often of any in the game, several times in a session, and one that
 * is always the same shape stops being read after a week.
 */
export function ChoreQuestionModal({ exercise, onAnswer, onClose }: Props) {
  const [result, setResult] = useState<{ correct: boolean; earned: number } | null>(null);
  const listening = exercise.ask === "listen";
  const speakable = exercise.prompt_lang === "nl" && canSpeak();
  /** The Dutch, for the questions that kept it off the screen. */
  const spellOut = listening
    ? exercise.prompt
    : exercise.prompt_lang === "es"
      ? exercise.answer
      : null;

  useEffect(() => {
    if (listening) speak(exercise.prompt);
  }, [exercise, listening]);

  const answer = (option: string) => {
    if (result) return;
    const correct = option === exercise.answer;
    setResult({ correct, earned: onAnswer(correct) });
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col gap-3">
        <h2 className="font-bold text-farm-700/80">{STRINGS.pickPrompt[exercise.ask]}</h2>

        {listening && canSpeak() ? (
          <button
            onClick={() => speak(exercise.prompt)}
            aria-label={STRINGS.listenReplay}
            className="self-start rounded-2xl bg-white px-6 py-3 text-3xl shadow-sm"
          >
            🔊
          </button>
        ) : speakable ? (
          <button
            onClick={() => speak(exercise.prompt)}
            className="self-start rounded-2xl bg-white px-5 py-3 text-2xl font-extrabold shadow-sm"
          >
            🔊 {exercise.prompt}
          </button>
        ) : (
          <p className="self-start rounded-2xl bg-white px-5 py-3 text-2xl font-extrabold shadow-sm">
            {exercise.prompt}
          </p>
        )}

        <div
          className={
            exercise.options.length === 2 ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"
          }
        >
          {exercise.options.map((option) => (
            <button
              key={option}
              disabled={result !== null}
              onClick={() => answer(option)}
              className={`min-h-11 rounded-xl border-2 px-4 py-3 font-bold ${
                exercise.options.length === 2 ? "text-center" : "text-left"
              } ${
                result && option === exercise.answer
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
              : `${STRINGS.choreWrong} ${exercise.reveal ?? exercise.answer}`}
          </p>
        )}

        {/* A question she answered by ear, or answered in Dutch, ends with the
            Dutch written down — right or wrong. Getting a heard word right and
            never seeing how it is spelled is a chance gone by. */}
        {result && spellOut && (
          <button
            onClick={() => canSpeak() && speak(spellOut)}
            className="self-start rounded-xl bg-white px-4 py-2.5 text-lg font-black text-farm-700 shadow-sm"
          >
            {canSpeak() && <span className="mr-2">🔊</span>}
            {spellOut}
          </button>
        )}
      </div>
    </Modal>
  );
}
