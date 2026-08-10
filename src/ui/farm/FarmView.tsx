import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { STRINGS } from "../../content/strings.es";
import { VOCAB, unreviewedContent } from "../../content";
import type { ChoiceExercise } from "../../content/types";
import { getCropDef, getDecorDef, getSpeciesDef } from "../../game/economy";
import * as crops from "../../game/crops";
import * as animals from "../../game/animals";
import type { Tile } from "../../game/farm";
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
import { FarmHud } from "./FarmHud";
import { ToolDock } from "./ToolDock";
import { AlertStack, type FarmAlert } from "./AlertStack";

type Sheet =
  | { kind: "none" }
  | { kind: "seeds"; tileId: string }
  | { kind: "cropCard"; tileId: string }
  | { kind: "animalCard"; animalId: string }
  | { kind: "decorCard"; decorKind: string }
  | { kind: "revive" }
  | { kind: "chore"; exercise: ChoiceExercise };

/** How long a tool's instructions stay on screen before getting out of the way. */
const TOAST_MS = 4000;

interface Props {
  onStartRevive: () => void;
  onSettings: () => void;
}

export function FarmView({ onStartRevive, onSettings }: Props) {
  const now = useNow();
  const farm = useGameStore((s) => s.farm);
  const player = useGameStore((s) => s.player);
  const words = useGameStore((s) => s.words);
  const tool = useGameStore((s) => s.farmTool);
  const setTool = useGameStore((s) => s.setFarmTool);
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

  const [zoomOpen, setZoomOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>({ kind: "none" });
  const [coinsFlying, setCoinsFlying] = useState<FloatingCoin[]>([]);
  const coinKey = useRef(0);

  // The instructions that used to live in a panel under the farm. As a toast
  // they say their piece and then give the scene back.
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    const hint =
      tool === "till"
        ? STRINGS.tillModeHint
        : tool === "seed"
          ? STRINGS.toolSeedHint
          : tool === "arrange"
            ? STRINGS.moveHint
            : null;
    setToast(hint);
    if (!hint) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [tool]);

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
    // Ploughing is its own tool, so a stray tap never reshapes the land.
    if (tool === "till") {
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

  // What the farm is asking for, most urgent first: withering crops, then
  // hungry animals, then anything waiting to be collected.
  const alerts: FarmAlert[] = [];
  if (hasWilted) {
    alerts.push({
      id: "wilted",
      emoji: "🥀",
      title: STRINGS.alertWiltedTitle,
      detail: STRINGS.alertWilted,
      tone: "warn",
      onTap: () => setSheet({ kind: "revive" }),
    });
  }
  for (const animal of farm.animals) {
    const def = getSpeciesDef(animal.speciesId);
    const name = animals.displayName(animal, def);
    if (animals.isHungry(animal, def, now)) {
      alerts.push({
        id: `hungry:${animal.id}`,
        emoji: def.emoji,
        title: name,
        detail: STRINGS.alertHungerNl,
        tone: "warn",
        onTap: () => setSheet({ kind: "animalCard", animalId: animal.id }),
      });
    } else if (animals.hasProduce(animal, def, now)) {
      alerts.push({
        id: `produce:${animal.id}`,
        emoji: def.produceEmoji,
        title: name,
        detail: STRINGS.alertProduce,
        tone: "neutral",
        onTap: () => setSheet({ kind: "animalCard", animalId: animal.id }),
      });
    }
  }
  if (!hasField) {
    alerts.push({
      id: "no-field",
      emoji: "🌱",
      title: STRINGS.toolTill,
      detail: STRINGS.tillHint,
      tone: "neutral",
      onTap: () => setTool("till"),
    });
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      <Suspense fallback={<div className="absolute inset-0 animate-pulse bg-farm-100" />}>
        <FarmScene
          farm={farm}
          now={now}
          coins={coinsFlying}
          tilling={tool === "till"}
          showControls={zoomOpen}
          onMoveObject={moveObject}
          onRotateObject={setObjectRotation}
          onDeleteObject={onDeleteObject}
          onTileTap={onTileTap}
          onAnimalTap={(animal) => setSheet({ kind: "animalCard", animalId: animal.id })}
          onDecorTap={(item) => setSheet({ kind: "decorCard", decorKind: item.kind })}
        />
      </Suspense>

      <FarmHud player={player} onSettings={onSettings} />
      <ToolDock
        tool={tool}
        onSelect={setTool}
        zoomOpen={zoomOpen}
        onToggleZoom={() => setZoomOpen((open) => !open)}
      />
      <AlertStack alerts={alerts} />

      {toast && (
        <p className="animate-toast-in pointer-events-none absolute inset-x-14 top-20 z-30 rounded-2xl bg-farm-50/95 px-4 py-2.5 text-center text-xs font-black text-ink-700 shadow-[0_5px_16px_rgba(90,50,10,.16)]">
          {toast}
        </p>
      )}

      {import.meta.env.DEV && (
        <div className="absolute inset-x-3 bottom-[150px] z-20 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-farm-200 bg-farm-50/92 p-2 text-[11px] font-black text-ink-700">
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
            <span className="text-warn-text">⚠ {unreviewedContent().length}</span>
          )}
        </div>
      )}

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
              thumb={{ kind: "crop", id: def.id, emoji: def.emoji }}
              context={{ label: STRINGS.readyIn(""), value: formatDuration(remaining) }}
              onClose={() => setSheet({ kind: "none" })}
            >
              <button
                disabled={tile.crop.watered}
                onClick={() => {
                  waterCrop(tile.id);
                  setSheet({ kind: "none" });
                  maybeChore(def.word);
                }}
                className="h-14 w-full rounded-2xl border-b-[5px] border-farm-700 bg-farm-600 font-black text-[17px] text-white disabled:opacity-40 active:translate-y-0.5 active:border-b-0"
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
          const hearts = "❤️".repeat(Math.max(1, Math.round(animal.happiness / 25)));
          return (
            <WordCardModal
              wordId={def.word}
              thumb={{ kind: "animal", id: def.id, emoji: def.emoji }}
              context={{ label: STRINGS.happinessLabel, value: hearts }}
              onClose={() => setSheet({ kind: "none" })}
            >
              <input
                defaultValue={animal.name ?? ""}
                placeholder={STRINGS.namePlaceholder}
                onBlur={(e) => renameAnimal(animal.id, e.target.value)}
                className="h-12 w-full rounded-2xl border-2 border-farm-200 bg-white px-3 text-center font-black text-ink-900 placeholder:text-ink-300 focus:border-leaf-500 focus:outline-none"
              />
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
                  className="h-14 w-full rounded-2xl border-b-[5px] border-farm-700 bg-farm-600 font-black text-[17px] text-white active:translate-y-0.5 active:border-b-0"
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
                  className="h-14 w-full rounded-2xl border-b-[5px] border-leaf-600 bg-leaf-500 font-black text-[17px] text-white active:translate-y-0.5 active:border-b-0"
                >
                  {STRINGS.feed}
                </button>
              )}
            </WordCardModal>
          );
        })()}

      {sheet.kind === "decorCard" &&
        (() => {
          const def = getDecorDef(sheet.decorKind);
          return (
            <WordCardModal
              wordId={def.word}
              thumb={{ kind: "decor", id: def.id, emoji: def.emoji }}
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
                <h2 className="text-lg font-black text-ink-900">{STRINGS.removeConfirmTitle}</h2>
                {animal && (
                  <p className="font-bold text-ink-700">
                    {STRINGS.removeAnimalBody(
                      animals.displayName(animal, getSpeciesDef(animal.speciesId)),
                    )}
                  </p>
                )}
                <p className="font-bold text-ink-500">{STRINGS.removeConfirmBody(refund)}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmRemove(null)}
                    className="h-14 flex-1 rounded-2xl bg-farm-100 font-black text-[17px] text-farm-700 active:bg-farm-200"
                  >
                    {STRINGS.removeNo}
                  </button>
                  <button
                    onClick={() => {
                      removeObject(confirmRemove);
                      setConfirmRemove(null);
                    }}
                    className="h-14 flex-1 rounded-2xl bg-rose-500 font-black text-[17px] text-white active:bg-rose-600"
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
            <h2 className="text-lg font-black text-ink-900">{STRINGS.reviveTitle}</h2>
            <p className="font-bold text-ink-700">{STRINGS.reviveBody}</p>
            <button
              onClick={() => {
                setSheet({ kind: "none" });
                onStartRevive();
              }}
              className="h-14 w-full rounded-2xl border-b-[5px] border-leaf-600 bg-leaf-500 font-black text-[17px] text-white active:translate-y-0.5 active:border-b-0"
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
