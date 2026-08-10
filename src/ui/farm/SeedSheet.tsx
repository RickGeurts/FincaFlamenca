import { useMemo, useState } from "react";
import { STRINGS } from "../../content/strings.es";
import { VOCAB, WORDS_BY_ID } from "../../content";
import { CROPS, type CropDef } from "../../game/economy";
import { buildWordChoice, shuffle } from "../../learning/lesson";
import { randomRng } from "../../utils/rng";
import { canSpeak, speak } from "../../utils/speak";
import { formatDuration } from "../../utils/time";
import { useGameStore } from "../../state/store";
import { Modal } from "../Modal";
import { PropThumb } from "./PropThumb";

interface Props {
  plotId: string;
  onPlanted?: (tileId: string) => void;
  onClose: () => void;
}

/** Seed shop: every purchase is a micro-lesson (word + article + audio). */
export function SeedSheet({ plotId, onPlanted, onClose }: Props) {
  const munten = useGameStore((s) => s.player.munten);
  const purchasedCrops = useGameStore((s) => s.purchasedCrops);
  const plantCrop = useGameStore((s) => s.plantCrop);
  const markCropPurchased = useGameStore((s) => s.markCropPurchased);

  const [selected, setSelected] = useState<CropDef | null>(null);

  if (!selected) {
    return (
      <Modal onClose={onClose}>
        <h2 className="mb-3 text-lg font-black text-ink-900">{STRINGS.seedShopTitle} 🌱</h2>
        <div className="flex flex-col gap-2.5">
          {CROPS.map((crop) => {
            const affordable = munten >= crop.seedCost;
            const word = WORDS_BY_ID.get(crop.word);
            return (
              <button
                key={crop.id}
                disabled={!affordable}
                onClick={() => setSelected(crop)}
                className={`flex items-center gap-3 rounded-[20px] border-2 p-3 text-left disabled:opacity-50 ${
                  crop.prestige ? "border-warn-border bg-warn-bg/40" : "border-farm-200 bg-white"
                }`}
              >
                <PropThumb kind="crop" id={crop.id} emoji={crop.emoji} />
                <span className="flex min-w-0 flex-1 flex-col leading-[1.25]">
                  <span className="truncate text-base font-black text-ink-900">
                    {word?.article} {word?.nl}
                    {crop.prestige && " ⭐"}
                  </span>
                  <span className="truncate text-xs font-bold text-ink-500">
                    {affordable
                      ? `${formatDuration(crop.growMs)} · ${STRINGS.sellsForLabel} ${crop.sellPrice} 🪙`
                      : STRINGS.cannotAffordMeta}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-[14px] px-3.5 py-2.5 text-sm font-black ${
                    affordable ? "bg-leaf-500 text-white" : "bg-farm-100 text-ink-500"
                  }`}
                >
                  {crop.seedCost} 🪙
                </span>
              </button>
            );
          })}
        </div>
        {munten < Math.min(...CROPS.map((c) => c.seedCost)) && (
          <p className="mt-3 rounded-[20px] border-2 border-warn-border bg-warn-bg p-3 text-sm font-black text-warn-text">
            {STRINGS.notEnoughMunten}
          </p>
        )}
      </Modal>
    );
  }

  return (
    <PurchaseConfirm
      crop={selected}
      isFirstPurchase={!purchasedCrops.includes(selected.id)}
      onConfirm={() => {
        markCropPurchased(selected.id);
        if (plantCrop(plotId, selected.id)) onPlanted?.(plotId);
        onClose();
      }}
      onClose={() => setSelected(null)}
    />
  );
}

export function PurchaseConfirm({
  crop,
  isFirstPurchase,
  onConfirm,
  onClose,
}: {
  crop: CropDef;
  isFirstPurchase: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const word = WORDS_BY_ID.get(crop.word);
  // First-ever purchase of a species asks one comprehension question —
  // always passable, retries are free.
  const question = useMemo(
    () => (isFirstPurchase ? buildWordChoice(crop.word, VOCAB, randomRng()) : null),
    [crop, isFirstPurchase],
  );
  const options = useMemo(
    () => (question ? shuffle([question.answer_es, ...question.distractors_es], randomRng()) : []),
    [question],
  );
  const [answeredCorrectly, setAnsweredCorrectly] = useState(question === null);
  const [wrongPick, setWrongPick] = useState<string | null>(null);

  const nl = word ? (word.article ? `${word.article} ${word.nl}` : word.nl) : crop.id;

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center gap-2 text-center">
        <PropThumb kind="crop" id={crop.id} emoji={crop.emoji} size={128} />
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
            <p className="mb-2 text-sm font-bold text-farm-700/70">
              {STRINGS.firstPurchaseIntro}
            </p>
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
                    wrongPick === option
                      ? "border-rose-300 bg-rose-50"
                      : "border-farm-200 bg-white"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {wrongPick && (
              <p className="mt-2 text-sm font-bold text-amber-700">{STRINGS.tryAgain}</p>
            )}
          </div>
        )}

        <button
          disabled={!answeredCorrectly}
          onClick={onConfirm}
          className="mt-2 min-h-11 w-full rounded-xl bg-leaf-500 py-3 font-bold text-white disabled:opacity-40 active:bg-leaf-600"
        >
          {STRINGS.plant} · {crop.seedCost} 🪙
        </button>
      </div>
    </Modal>
  );
}
