import { Suspense, lazy, useRef, useState } from "react";
import { STRINGS } from "../../content/strings.es";
import { VOCAB, unreviewedContent } from "../../content";
import type { ChoiceExercise } from "../../content/types";
import { getCropDef, getDecorDef, getSpeciesDef } from "../../game/economy";
import * as crops from "../../game/crops";
import * as animals from "../../game/animals";
import type { Tile } from "../../game/farm";
import type { Animal } from "../../game/animals";
import {
  buildWordChoice,
  pickChoreWordId,
  shouldTriggerChoreQuestion,
} from "../../learning/lesson";
import { randomRng } from "../../utils/rng";
import { formatDuration } from "../../utils/time";
import { useGameStore } from "../../state/store";
import { useNow } from "../useNow";
import { Modal } from "../Modal";
import type { FloatingCoin } from "./three/FarmScene";

// three.js is heavy; load the 3D scene as its own chunk so the app shell,
// lessons and dialogs stay instant.
const FarmScene = lazy(() =>
  import("./three/FarmScene").then((m) => ({ default: m.FarmScene })),
);
import { WordCardModal } from "./WordCardModal";
import { ChoreQuestionModal } from "./ChoreQuestionModal";
import { SeedSheet } from "./SeedSheet";
import { DecorShop } from "./DecorShop";
import { AnimalShop } from "./AnimalShop";

type Sheet =
  | { kind: "none" }
  | { kind: "seeds"; tileId: string }
  | { kind: "cropCard"; tileId: string }
  | { kind: "animalCard"; animalId: string }
  | { kind: "decorCard"; decorKind: string }
  | { kind: "shop" }
  | { kind: "animalShop" }
  | { kind: "revive" }
  | { kind: "chore"; exercise: ChoiceExercise };

interface Props {
  onStartRevive: () => void;
}

export function FarmView({ onStartRevive }: Props) {
  const now = useNow();
  const farm = useGameStore((s) => s.farm);
  const words = useGameStore((s) => s.words);
  const devFast = useGameStore((s) => s.devFast);
  const setDevFast = useGameStore((s) => s.setDevFast);
  const devAddMunten = useGameStore((s) => s.devAddMunten);
  const till = useGameStore((s) => s.tillTile);
  const untill = useGameStore((s) => s.untillTile);
  const waterCrop = useGameStore((s) => s.waterCrop);
  const harvestCrop = useGameStore((s) => s.harvestCrop);
  const feedAnimal = useGameStore((s) => s.feedAnimal);
  const collectProduce = useGameStore((s) => s.collectProduce);
  const renameAnimal = useGameStore((s) => s.renameAnimal);
  const logExposure = useGameStore((s) => s.logExposure);
  const answerChoreQuestion = useGameStore((s) => s.answerChoreQuestion);

  const moveObject = useGameStore((s) => s.moveObject);
  const setObjectRotation = useGameStore((s) => s.setObjectRotation);
  const removeObject = useGameStore((s) => s.removeObject);

  const [tilling, setTilling] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>({ kind: "none" });
  const [coinsFlying, setCoinsFlying] = useState<FloatingCoin[]>([]);
  const coinKey = useRef(0);

  /** After a chore, maybe ask a one-tap review question (roughly 1 in 3). */
  const maybeChore = (objectWordId: string) => {
    const rng = randomRng();
    if (!shouldTriggerChoreQuestion(rng)) return;
    const wordId = pickChoreWordId(objectWordId, Object.values(words), Date.now(), rng);
    const exercise = buildWordChoice(wordId, VOCAB, rng);
    if (exercise) setSheet({ kind: "chore", exercise });
  };

  const spawnCoin = (tileId: string, amount: number) => {
    const key = ++coinKey.current;
    setCoinsFlying((c) => [...c, { key, tileId, amount }]);
    setTimeout(() => setCoinsFlying((c) => c.filter((f) => f.key !== key)), 1000);
  };

  /**
   * Dropped on the bin. Decorations go straight away with their refund; an
   * animal she has named gets a confirmation first.
   */
  const onDeleteObject = (objectId: string) => {
    if (objectId.startsWith("animal:")) setConfirmRemove(objectId);
    else removeObject(objectId);
  };

  const onTileTap = (tile: Tile) => {
    // Ploughing is its own mode now, so a stray tap never reshapes the land.
    if (tilling) {
      if (tile.kind === "grass") till(tile.id);
      else if (!tile.crop) untill(tile.id);
      return;
    }
    if (tile.kind === "grass") return;
    if (!tile.crop) {
      setSheet({ kind: "seeds", tileId: tile.id });
      return;
    }
    const def = getCropDef(tile.crop.cropId);
    const state = crops.cropState(tile.crop, def, now);
    if (state === "growing") {
      setSheet({ kind: "cropCard", tileId: tile.id });
    } else if (state === "ready") {
      const earned = harvestCrop(tile.id);
      if (earned > 0) {
        spawnCoin(tile.id, earned);
        logExposure(def.word);
        maybeChore(def.word);
      }
    } else {
      setSheet({ kind: "revive" });
    }
  };

  const hasWilted = farm.tiles.some(
    (t) => t.crop && crops.cropState(t.crop, getCropDef(t.crop.cropId), now) === "wilted",
  );
  const hasField = farm.tiles.some((t) => t.kind === "field");

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {import.meta.env.DEV && (
        <div className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-farm-200 p-2 text-xs font-bold text-farm-700/80">
          <span>DEV</span>
          <button
            onClick={() => setDevFast(!devFast)}
            className={`rounded-lg px-2 py-1 ${devFast ? "bg-leaf-500 text-white" : "bg-farm-100"}`}
          >
            {STRINGS.devFastTimers}
          </button>
          <button onClick={() => devAddMunten(100)} className="rounded-lg bg-farm-100 px-2 py-1">
            {STRINGS.devAddMunten}
          </button>
          {unreviewedContent().length > 0 && (
            <span className="text-amber-700">
              ⚠ Nederlands nog na te kijken: {unreviewedContent().join(", ")}
            </span>
          )}
        </div>
      )}

      {!hasField && (
        <p className="rounded-2xl bg-farm-100 p-3 text-center text-sm font-bold text-farm-700">
          {STRINGS.tillHint}
        </p>
      )}

      {hasWilted && (
        <button
          onClick={() => setSheet({ kind: "revive" })}
          className="rounded-2xl bg-amber-100 p-3 text-left font-bold text-amber-800 shadow-sm"
        >
          {STRINGS.reviveTitle}
        </button>
      )}

      <Suspense
        fallback={<div className="h-[420px] animate-pulse rounded-3xl bg-farm-100" />}
      >
        <FarmScene
          farm={farm}
          now={now}
          coins={coinsFlying}
          tilling={tilling}
          onMoveObject={moveObject}
          onRotateObject={setObjectRotation}
          onDeleteObject={onDeleteObject}
          onTileTap={onTileTap}
          onAnimalTap={(animal) => setSheet({ kind: "animalCard", animalId: animal.id })}
          onDecorTap={(item) => setSheet({ kind: "decorCard", decorKind: item.kind })}
        />
      </Suspense>

      {tilling ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-farm-100 p-3">
          <p className="text-center text-sm font-bold text-farm-700/80">{STRINGS.tillModeHint}</p>
          <button
            onClick={() => setTilling(false)}
            className="min-h-11 w-full rounded-xl bg-leaf-500 py-3 font-bold text-white active:bg-leaf-600"
          >
            {STRINGS.tillModeDone}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setTilling(true)}
              className="min-h-11 rounded-xl bg-white px-4 py-3 font-bold text-farm-700 shadow-sm active:bg-farm-100"
            >
              🌾 {STRINGS.tillMode}
            </button>
            <button
              onClick={() => setSheet({ kind: "animalShop" })}
              className="min-h-11 rounded-xl bg-white px-4 py-3 font-bold text-farm-700 shadow-sm active:bg-farm-100"
            >
              🐮 {STRINGS.animalShop}
            </button>
            <button
              onClick={() => setSheet({ kind: "shop" })}
              className="min-h-11 rounded-xl bg-white px-4 py-3 font-bold text-farm-700 shadow-sm active:bg-farm-100"
            >
              🎀 {STRINGS.decorShop}
            </button>
          </div>
          <p className="text-center text-xs font-bold text-farm-700/60">{STRINGS.moveHint}</p>
        </div>
      )}

      <section className="flex flex-col gap-3">
        {farm.animals.map((animal) => (
          <AnimalRow
            key={animal.id}
            animal={animal}
            now={now}
            onTap={() => setSheet({ kind: "animalCard", animalId: animal.id })}
          />
        ))}
      </section>

      {sheet.kind === "seeds" && (
        <SeedSheet plotId={sheet.tileId} onClose={() => setSheet({ kind: "none" })} />
      )}

      {sheet.kind === "cropCard" &&
        (() => {
          const tile = farm.tiles.find((t) => t.id === sheet.tileId);
          if (!tile?.crop) return null;
          const def = getCropDef(tile.crop.cropId);
          const remaining = crops.readyAt(tile.crop, def) - now;
          return (
            <WordCardModal
              wordId={def.word}
              emoji={def.emoji}
              onClose={() => setSheet({ kind: "none" })}
            >
              <p className="text-sm font-bold text-farm-700/70">
                {STRINGS.readyIn(formatDuration(remaining))}
              </p>
              <button
                disabled={tile.crop.watered}
                onClick={() => {
                  waterCrop(tile.id);
                  setSheet({ kind: "none" });
                  maybeChore(def.word);
                }}
                className="min-h-11 w-full rounded-xl bg-leaf-500 py-3 font-bold text-white disabled:opacity-40 active:bg-leaf-600"
              >
                {tile.crop.watered ? STRINGS.watered : STRINGS.water}
              </button>
            </WordCardModal>
          );
        })()}

      {sheet.kind === "animalCard" &&
        (() => {
          const animal = farm.animals.find((a) => a.id === sheet.animalId);
          if (!animal) return null;
          const def = getSpeciesDef(animal.speciesId);
          const hungry = animals.isHungry(animal, def, now);
          const produce = animals.hasProduce(animal, def, now);
          return (
            <WordCardModal
              wordId={def.word}
              emoji={def.emoji}
              onClose={() => setSheet({ kind: "none" })}
            >
              <input
                defaultValue={animal.name ?? ""}
                placeholder={STRINGS.namePlaceholder}
                onBlur={(e) => renameAnimal(animal.id, e.target.value)}
                className="min-h-11 w-full rounded-xl border-2 border-farm-200 bg-white px-3 text-center font-bold focus:border-leaf-500 focus:outline-none"
              />
              <p className="text-sm font-bold text-farm-700/70">
                {STRINGS.happinessLabel}: {"❤️".repeat(Math.max(1, Math.round(animal.happiness / 25)))}
              </p>
              {hungry && (
                <p className="text-sm font-bold text-amber-700">
                  {STRINGS.hungryNl(animals.displayName(animal, def))}
                </p>
              )}
              {produce && (
                <button
                  onClick={() => {
                    const earned = collectProduce(animal.id);
                    setSheet({ kind: "none" });
                    if (earned > 0) {
                      logExposure(def.produceWord);
                      maybeChore(def.produceWord);
                    }
                  }}
                  className="min-h-11 w-full rounded-xl bg-farm-600 py-3 font-bold text-white active:bg-farm-700"
                >
                  {STRINGS.collect} {def.produceEmoji}
                </button>
              )}
              {hungry && (
                <button
                  onClick={() => {
                    feedAnimal(animal.id);
                    setSheet({ kind: "none" });
                    maybeChore(def.word);
                  }}
                  className="min-h-11 w-full rounded-xl bg-leaf-500 py-3 font-bold text-white active:bg-leaf-600"
                >
                  {STRINGS.feed}
                </button>
              )}
            </WordCardModal>
          );
        })()}

      {sheet.kind === "shop" && (
        <DecorShop
          onBought={() => {
            // It lands on the first free cell; a press and hold moves it.
            setSheet({ kind: "none" });
          }}
          onClose={() => setSheet({ kind: "none" })}
        />
      )}

      {sheet.kind === "animalShop" && (
        <AnimalShop
          onBought={() => {
            setSheet({ kind: "none" });
          }}
          onClose={() => setSheet({ kind: "none" })}
        />
      )}

      {sheet.kind === "decorCard" &&
        (() => {
          const def = getDecorDef(sheet.decorKind);
          return (
            <WordCardModal
              wordId={def.word}
              emoji={def.emoji}
              onClose={() => setSheet({ kind: "none" })}
            />
          );
        })()}

      {confirmRemove !== null &&
        (() => {
          const isAnimal = confirmRemove.startsWith("animal:");
          const animal = isAnimal
            ? farm.animals.find((a) => `animal:${a.id}` === confirmRemove)
            : undefined;
          const decorItem = !isAnimal
            ? farm.decor.find((d) => `decor:${d.id}` === confirmRemove)
            : undefined;
          const refund = animal
            ? Math.floor(getSpeciesDef(animal.speciesId).cost / 2)
            : decorItem
              ? Math.floor(getDecorDef(decorItem.kind).price / 2)
              : 0;
          return (
            <Modal onClose={() => setConfirmRemove(null)}>
              <div className="flex flex-col gap-3 text-center">
                <h2 className="text-lg font-extrabold text-farm-700">
                  {STRINGS.removeConfirmTitle}
                </h2>
                {animal && (
                  <p className="font-bold text-farm-700/80">
                    {STRINGS.removeAnimalBody(
                      animals.displayName(animal, getSpeciesDef(animal.speciesId)),
                    )}
                  </p>
                )}
                <p className="text-farm-700/80">{STRINGS.removeConfirmBody(refund)}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmRemove(null)}
                    className="min-h-11 flex-1 rounded-xl bg-farm-100 py-3 font-bold text-farm-700 active:bg-farm-200"
                  >
                    {STRINGS.removeNo}
                  </button>
                  <button
                    onClick={() => {
                      removeObject(confirmRemove);
                      setConfirmRemove(null);
                    }}
                    className="min-h-11 flex-1 rounded-xl bg-rose-500 py-3 font-bold text-white active:bg-rose-600"
                  >
                    {STRINGS.removeYes}
                  </button>
                </div>
              </div>
            </Modal>
          );
        })()}

      {sheet.kind === "revive" && (
        <Modal onClose={() => setSheet({ kind: "none" })}>
          <div className="flex flex-col gap-3 text-center">
            <h2 className="text-lg font-extrabold text-farm-700">{STRINGS.reviveTitle}</h2>
            <p className="text-farm-700/80">{STRINGS.reviveBody}</p>
            <button
              onClick={() => {
                setSheet({ kind: "none" });
                onStartRevive();
              }}
              className="min-h-11 w-full rounded-xl bg-leaf-500 py-3 font-bold text-white active:bg-leaf-600"
            >
              {STRINGS.reviveButton}
            </button>
          </div>
        </Modal>
      )}

      {sheet.kind === "chore" && (
        <ChoreQuestionModal
          exercise={sheet.exercise}
          onAnswer={(correct) => answerChoreQuestion(sheet.exercise.word ?? "", correct)}
          onClose={() => setSheet({ kind: "none" })}
        />
      )}
    </div>
  );
}

function AnimalRow({
  animal,
  now,
  onTap,
}: {
  animal: Animal;
  now: number;
  onTap: () => void;
}) {
  const def = getSpeciesDef(animal.speciesId);
  const hungry = animals.isHungry(animal, def, now);
  const produce = animals.hasProduce(animal, def, now);

  return (
    <button
      onClick={onTap}
      className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm active:scale-[0.98]"
    >
      <span className="flex items-center gap-3">
        <span className="text-3xl">{def.emoji}</span>
        <span className="text-left">
          <span className="block font-bold">{animals.displayName(animal, def)}</span>
          <span className="block text-xs text-farm-700/60">
            {hungry
              ? STRINGS.hungry(animals.displayName(animal, def))
              : produce
                ? STRINGS.produceReady
                : STRINGS.fedAndWorking}
          </span>
        </span>
      </span>
      <span className="text-xl">{produce ? def.produceEmoji : hungry ? "🌾" : "💤"}</span>
    </button>
  );
}
