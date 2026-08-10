import { useMemo, useState } from "react";
import { STRINGS } from "../../content/strings.es";
import { VOCAB, WORDS_BY_ID } from "../../content";
import type { AnimalSpeciesDef } from "../../game/economy";
import { buildWordChoice, shuffle } from "../../learning/lesson";
import { randomRng } from "../../utils/rng";
import { canSpeak, speak } from "../../utils/speak";
import { Modal } from "../Modal";
import { play } from "../../utils/sfx";
import { PropThumb } from "../farm/PropThumb";

/**
 * Buying an animal is a micro-lesson: the word with its article and audio,
 * one always-passable question the first time, and then she names it.
 */
export function AnimalConfirm({
  species,
  isFirstPurchase,
  onConfirm,
  onClose,
}: {
  species: AnimalSpeciesDef;
  isFirstPurchase: boolean;
  onConfirm: (name: string) => void;
  onClose: () => void;
}) {
  const word = WORDS_BY_ID.get(species.word);
  const question = useMemo(
    () => (isFirstPurchase ? buildWordChoice(species.word, VOCAB, randomRng()) : null),
    [species, isFirstPurchase],
  );
  const options = useMemo(
    () => (question ? shuffle([question.answer_es, ...question.distractors_es], randomRng()) : []),
    [question],
  );
  const [answeredCorrectly, setAnsweredCorrectly] = useState(question === null);
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [name, setName] = useState("");

  const nl = word ? (word.article ? `${word.article} ${word.nl}` : word.nl) : species.id;

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center gap-2.5 text-center">
        <PropThumb kind="animal" id={species.id} emoji={species.emoji} size={128} />
        <button
          onClick={() => speak(nl)}
          className="flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-2xl font-black text-ink-900 shadow-sm active:bg-farm-100"
        >
          {canSpeak() && <span>🔊</span>}
          <span>{nl}</span>
        </button>
        <p className="text-lg font-extrabold text-ink-500">{word?.es}</p>

        {question && !answeredCorrectly && (
          <div className="mt-1 w-full">
            <p className="mb-2 text-sm font-bold text-ink-500">{STRINGS.firstPurchaseIntro}</p>
            <div className="flex flex-col gap-2">
              {options.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    if (option === question.answer_es) {
                      setAnsweredCorrectly(true);
                      setWrongPick(null);
                    } else {
                      setWrongPick(option);
                    }
                  }}
                  className={`min-h-14 rounded-2xl border-2 border-b-[5px] px-4 py-3 font-black text-[17px] ${
                    wrongPick === option
                      ? "border-bad-border bg-bad-bg text-bad-text"
                      : "border-farm-200 bg-white text-ink-900"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {wrongPick && (
              <p className="mt-2 text-sm font-bold text-warn-text-2">{STRINGS.tryAgain}</p>
            )}
          </div>
        )}

        {answeredCorrectly && (
          <label className="w-full text-left">
            <span className="mb-1 block text-sm font-bold text-ink-500">
              {STRINGS.animalNameLabel}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={STRINGS.namePlaceholder}
              maxLength={20}
              className="h-12 w-full rounded-2xl border-2 border-farm-200 bg-white px-3 text-center font-black text-ink-900 placeholder:text-ink-300 focus:border-leaf-500 focus:outline-none"
            />
          </label>
        )}

        <button
          disabled={!answeredCorrectly}
          onClick={() => {
            play("buy");
            onConfirm(name);
          }}
          className="h-14 w-full rounded-2xl border-b-[5px] border-leaf-600 bg-leaf-500 font-black text-[17px] text-white disabled:opacity-40 active:translate-y-0.5 active:border-b-0"
        >
          {STRINGS.animalBuy} · {species.cost} 🪙
        </button>
      </div>
    </Modal>
  );
}
