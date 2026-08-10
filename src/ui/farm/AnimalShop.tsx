import { useMemo, useState } from "react";
import { STRINGS } from "../../content/strings.es";
import { VOCAB, WORDS_BY_ID } from "../../content";
import { ANIMAL_SPECIES, type AnimalSpeciesDef } from "../../game/economy";
import { buildWordChoice, shuffle } from "../../learning/lesson";
import { randomRng } from "../../utils/rng";
import { canSpeak, speak } from "../../utils/speak";
import { formatDuration } from "../../utils/time";
import { useGameStore } from "../../state/store";
import { Modal } from "../Modal";
import { PropThumb } from "./PropThumb";

interface Props {
  /** Called with the new animal's id so the farm can jump to placing it. */
  onBought: (animalId: string) => void;
  onClose: () => void;
}

/** De fokker: buying an animal is a micro-lesson, and she names it herself. */
export function AnimalShop({ onBought, onClose }: Props) {
  const munten = useGameStore((s) => s.player.munten);
  const owned = useGameStore((s) => s.farm.animals);
  const purchasedAnimals = useGameStore((s) => s.purchasedAnimals);
  const buyAnimal = useGameStore((s) => s.buyAnimal);
  const markAnimalPurchased = useGameStore((s) => s.markAnimalPurchased);

  const [selected, setSelected] = useState<AnimalSpeciesDef | null>(null);
  const [full, setFull] = useState(false);

  if (selected) {
    return (
      <AnimalConfirm
        species={selected}
        isFirstPurchase={!purchasedAnimals.includes(selected.id)}
        onConfirm={(name) => {
          const id = buyAnimal(selected.id, name);
          if (!id) {
            setFull(true);
            setSelected(null);
            return;
          }
          markAnimalPurchased(selected.id);
          onBought(id);
        }}
        onClose={() => setSelected(null)}
      />
    );
  }

  const nothingAffordable = ANIMAL_SPECIES.every((s) => munten < s.cost);

  return (
    <Modal onClose={onClose}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span>
          <h2 className="text-lg font-extrabold text-farm-700">{STRINGS.animalShopTitle} 🐮</h2>
          <span className="text-xs font-bold text-farm-700/60">
            {STRINGS.animalShopSubtitle}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-farm-100 px-3 py-1 font-extrabold text-farm-700">
          {munten} 🪙
        </span>
      </div>

      {full && (
        <p className="mb-3 rounded-xl bg-amber-100 p-3 text-sm font-bold text-amber-800">
          {STRINGS.animalFarmFull}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {ANIMAL_SPECIES.map((species) => {
          const word = WORDS_BY_ID.get(species.word);
          const produce = WORDS_BY_ID.get(species.produceWord);
          const have = owned.filter((a) => a.speciesId === species.id).length;
          const affordable = munten >= species.cost;
          return (
            <button
              key={species.id}
              disabled={!affordable}
              onClick={() => setSelected(species)}
              className="flex items-center justify-between gap-2 rounded-xl border-2 border-farm-200 bg-white px-3 py-2 text-left disabled:opacity-40"
            >
              <span className="flex min-w-0 items-center gap-3">
                <PropThumb kind="animal" id={species.id} emoji={species.emoji} />
                <span className="min-w-0">
                  <span className="block truncate font-bold">
                    {word?.article} {word?.nl}
                  </span>
                  <span className="block truncate text-xs text-farm-700/60">{word?.es}</span>
                  <span className="block truncate text-xs text-farm-700/60">
                    {STRINGS.animalProduceLabel} {species.produceEmoji} {produce?.nl} ·{" "}
                    {STRINGS.animalEveryLabel} {formatDuration(species.produceMs)}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-extrabold">{species.cost} 🪙</span>
                {have > 0 && (
                  <span className="block text-xs text-farm-700/60">{STRINGS.animalOwned(have)}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {nothingAffordable && (
        <p className="mt-3 rounded-xl bg-amber-100 p-3 text-sm font-bold text-amber-800">
          {STRINGS.animalCannotAfford}
        </p>
      )}
    </Modal>
  );
}

function AnimalConfirm({
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
      <div className="flex flex-col items-center gap-2 text-center">
        <PropThumb kind="animal" id={species.id} emoji={species.emoji} size={128} />
        <button
          onClick={() => speak(nl)}
          className="flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-2xl font-extrabold shadow-sm active:bg-farm-100"
        >
          {canSpeak() && <span>🔊</span>}
          <span>{nl}</span>
        </button>
        <p className="text-lg font-bold text-farm-700/80">{word?.es}</p>

        {question && !answeredCorrectly && (
          <div className="mt-2 w-full">
            <p className="mb-2 text-sm font-bold text-farm-700/70">{STRINGS.firstPurchaseIntro}</p>
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
                  className={`min-h-11 rounded-xl border-2 px-4 py-2 font-bold ${
                    wrongPick === option ? "border-rose-300 bg-rose-50" : "border-farm-200 bg-white"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {wrongPick && <p className="mt-2 text-sm font-bold text-amber-700">{STRINGS.tryAgain}</p>}
          </div>
        )}

        {answeredCorrectly && (
          <label className="mt-2 w-full text-left">
            <span className="mb-1 block text-sm font-bold text-farm-700/70">
              {STRINGS.animalNameLabel}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={STRINGS.namePlaceholder}
              maxLength={20}
              className="min-h-11 w-full rounded-xl border-2 border-farm-200 bg-white px-3 text-center font-bold focus:border-leaf-500 focus:outline-none"
            />
          </label>
        )}

        <button
          disabled={!answeredCorrectly}
          onClick={() => onConfirm(name)}
          className="mt-2 min-h-11 w-full rounded-xl bg-leaf-500 py-3 font-bold text-white disabled:opacity-40 active:bg-leaf-600"
        >
          {STRINGS.animalBuy} · {species.cost} 🪙
        </button>
      </div>
    </Modal>
  );
}
