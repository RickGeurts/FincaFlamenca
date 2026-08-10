import { useMemo, useState } from "react";
import { STRINGS } from "../../content/strings.es";
import { VOCAB, WORDS_BY_ID } from "../../content";
import {
  ANIMAL_SPECIES,
  DECOR_CATEGORIES,
  decorByCategory,
  penCapacity,
  type DecorCategory,
  type DecorDef,
} from "../../game/economy";
import { buildWordChoice, shuffle } from "../../learning/lesson";
import { randomRng } from "../../utils/rng";
import { canSpeak, speak } from "../../utils/speak";
import { useGameStore } from "../../state/store";
import { Modal } from "../Modal";
import { PropThumb } from "./PropThumb";

interface Props {
  /** Called with the new object's id so the farm can jump straight to arranging it. */
  onBought: (objectId: string) => void;
  onClose: () => void;
}

/** Decoration shop: like the seed shop, every purchase is a micro-lesson. */
export function DecorShop({ onBought, onClose }: Props) {
  const munten = useGameStore((s) => s.player.munten);
  const decor = useGameStore((s) => s.farm.decor);
  const purchasedDecor = useGameStore((s) => s.purchasedDecor);
  const buyDecor = useGameStore((s) => s.buyDecor);
  const markDecorPurchased = useGameStore((s) => s.markDecorPurchased);

  const [selected, setSelected] = useState<DecorDef | null>(null);
  const [category, setCategory] = useState<DecorCategory>("nature");
  const [full, setFull] = useState(false);

  if (selected) {
    return (
      <DecorConfirm
        decor={selected}
        isFirstPurchase={!purchasedDecor.includes(selected.id)}
        onConfirm={() => {
          const id = buyDecor(selected.id);
          if (!id) {
            setFull(true);
            setSelected(null);
            return;
          }
          markDecorPurchased(selected.id);
          onBought(id);
        }}
        onClose={() => setSelected(null)}
      />
    );
  }

  const items = decorByCategory(category);
  const nothingAffordable = items.every((item) => munten < item.price);

  return (
    <Modal onClose={onClose}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold text-farm-700">{STRINGS.decorShopTitle} 🎀</h2>
        <span className="shrink-0 rounded-full bg-farm-100 px-3 py-1 font-extrabold text-farm-700">
          {munten} 🪙
        </span>
      </div>

      <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto px-1 pb-1">
        {DECOR_CATEGORIES.map((id) => {
          const active = id === category;
          // A quiet dot marks a section she can actually buy from right now.
          const canBuyHere = decorByCategory(id).some((item) => munten >= item.price);
          return (
            <button
              key={id}
              onClick={() => setCategory(id)}
              aria-pressed={active}
              className={`relative min-h-11 shrink-0 whitespace-nowrap rounded-xl px-3 text-sm font-bold ${
                active ? "bg-leaf-500 text-white" : "bg-farm-100 text-farm-700"
              }`}
            >
              {STRINGS.decorCategories[id]}
              {canBuyHere && !active && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-leaf-500" />
              )}
            </button>
          );
        })}
      </div>

      {full && (
        <p className="mb-3 rounded-xl bg-amber-100 p-3 text-sm font-bold text-amber-800">
          {STRINGS.decorFarmFull}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const word = WORDS_BY_ID.get(item.word);
          const owned = decor.filter((d) => d.kind === item.id).length;
          const affordable = munten >= item.price;
          return (
            <button
              key={item.id}
              disabled={!affordable}
              onClick={() => setSelected(item)}
              className="flex items-center justify-between gap-2 rounded-xl border-2 border-farm-200 bg-white px-3 py-2 text-left disabled:opacity-40"
            >
              <span className="flex min-w-0 items-center gap-3">
                <PropThumb kind="decor" id={item.id} emoji={item.emoji} />
                <span className="min-w-0">
                  <span className="block truncate font-bold">
                    {word?.article} {word?.nl}
                    {item.size && item.size > 1 && ` · ${STRINGS.penSizeLabel(item.size)}`}
                  </span>
                  <span className="block truncate text-xs text-farm-700/60">{word?.es}</span>
                  {item.pen && item.size && (
                    <span className="block truncate text-xs text-farm-700/60">
                      {STRINGS.penCapacityLabel}{" "}
                      {ANIMAL_SPECIES.map(
                        (s) => `${penCapacity(item.size!, s.id)} ${s.emoji}`,
                      ).join(" · ")}
                    </span>
                  )}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-extrabold">{item.price} 🪙</span>
                {owned > 0 && (
                  <span className="block text-xs text-farm-700/60">
                    {STRINGS.decorOwned(owned)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {nothingAffordable && (
        <p className="mt-3 rounded-xl bg-amber-100 p-3 text-sm font-bold text-amber-800">
          {STRINGS.decorCategoryEmpty}
        </p>
      )}
    </Modal>
  );
}

function DecorConfirm({
  decor,
  isFirstPurchase,
  onConfirm,
  onClose,
}: {
  decor: DecorDef;
  isFirstPurchase: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const word = WORDS_BY_ID.get(decor.word);
  // First time she buys this kind, one comprehension question — always
  // passable, retries are free.
  const question = useMemo(
    () => (isFirstPurchase ? buildWordChoice(decor.word, VOCAB, randomRng()) : null),
    [decor, isFirstPurchase],
  );
  const options = useMemo(
    () => (question ? shuffle([question.answer_es, ...question.distractors_es], randomRng()) : []),
    [question],
  );
  const [answeredCorrectly, setAnsweredCorrectly] = useState(question === null);
  const [wrongPick, setWrongPick] = useState<string | null>(null);

  const nl = word ? (word.article ? `${word.article} ${word.nl}` : word.nl) : decor.id;

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center gap-2 text-center">
        <PropThumb kind="decor" id={decor.id} emoji={decor.emoji} size={128} />
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

        <button
          disabled={!answeredCorrectly}
          onClick={onConfirm}
          className="mt-2 min-h-11 w-full rounded-xl bg-leaf-500 py-3 font-bold text-white disabled:opacity-40 active:bg-leaf-600"
        >
          {STRINGS.decorBuy} · {decor.price} 🪙
        </button>
      </div>
    </Modal>
  );
}
