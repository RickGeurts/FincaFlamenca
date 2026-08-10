import { useState } from "react";
import { STRINGS } from "../../content/strings.es";
import { WORDS_BY_ID } from "../../content";
import {
  ANIMAL_SPECIES,
  CROPS,
  DECOR_CATEGORIES,
  decorByCategory,
  penCapacity,
  type AnimalSpeciesDef,
  type CropDef,
  type DecorCategory,
  type DecorDef,
} from "../../game/economy";
import { formatDuration } from "../../utils/time";
import { useGameStore } from "../../state/store";
import { PropThumb } from "../farm/PropThumb";
import type { ThumbKind } from "../farm/three/thumbnail";
import { PurchaseConfirm } from "../farm/SeedSheet";
import { AnimalConfirm } from "./AnimalConfirm";
import { DecorConfirm } from "./DecorConfirm";

type Category = "seeds" | "animals" | DecorCategory;

const CATEGORY_ICON: Record<Category, string> = {
  seeds: "🌱",
  animals: "🐮",
  nature: "🌳",
  water: "💧",
  farm: "🚜",
  home: "🏠",
  pasture: "🐑",
};

const CATEGORIES: Category[] = ["seeds", "animals", ...DECOR_CATEGORIES];

/** One line in the shop, whatever kind of thing it is. */
interface Row {
  key: string;
  thumb: { kind: ThumbKind; id: string; emoji: string };
  /** Dutch with its article — always above the Spanish, always spelled out. */
  nl: string;
  meta: string;
  price: number;
  prestige?: boolean;
  onPick: () => void;
}

type Picked =
  | { kind: "none" }
  | { kind: "crop"; def: CropDef }
  | { kind: "animal"; def: AnimalSpeciesDef }
  | { kind: "decor"; def: DecorDef };

/**
 * El mercado — and, with the breeder's sign on the door, el criadero. Buying
 * is a place she travels to rather than a dialog over the farm, so shopping
 * has room to teach a word properly.
 */
export function Market({ breeder, onBack }: { breeder: boolean; onBack: () => void }) {
  const munten = useGameStore((s) => s.player.munten);
  const farm = useGameStore((s) => s.farm);
  const category = useGameStore((s) => s.marketCategory) as Category;
  const setCategory = useGameStore((s) => s.setMarketCategory);
  const purchasedCrops = useGameStore((s) => s.purchasedCrops);
  const purchasedAnimals = useGameStore((s) => s.purchasedAnimals);
  const purchasedDecor = useGameStore((s) => s.purchasedDecor);
  const plantCrop = useGameStore((s) => s.plantCrop);
  const buyAnimal = useGameStore((s) => s.buyAnimal);
  const buyDecor = useGameStore((s) => s.buyDecor);
  const markCropPurchased = useGameStore((s) => s.markCropPurchased);
  const markAnimalPurchased = useGameStore((s) => s.markAnimalPurchased);
  const markDecorPurchased = useGameStore((s) => s.markDecorPurchased);

  const [picked, setPicked] = useState<Picked>({ kind: "none" });
  const [problem, setProblem] = useState<string | null>(null);

  /** A seed bought here goes into the first field standing empty. */
  const freeField = farm.tiles.find((t) => t.kind === "field" && !t.crop);

  const rows: Row[] = [];
  if (category === "seeds") {
    for (const crop of CROPS) {
      const word = WORDS_BY_ID.get(crop.word);
      rows.push({
        key: crop.id,
        thumb: { kind: "crop", id: crop.id, emoji: crop.emoji },
        nl: `${word?.article ?? ""} ${word?.nl ?? crop.id}`.trim() + (crop.prestige ? " ⭐" : ""),
        meta: `${formatDuration(crop.growMs)} · ${STRINGS.sellsForLabel} ${crop.sellPrice} 🪙`,
        price: crop.seedCost,
        prestige: crop.prestige,
        onPick: () => setPicked({ kind: "crop", def: crop }),
      });
    }
  } else if (category === "animals") {
    for (const species of ANIMAL_SPECIES) {
      const word = WORDS_BY_ID.get(species.word);
      const produce = WORDS_BY_ID.get(species.produceWord);
      rows.push({
        key: species.id,
        thumb: { kind: "animal", id: species.id, emoji: species.emoji },
        nl: `${word?.article ?? ""} ${word?.nl ?? species.id}`.trim(),
        meta: `${STRINGS.animalProduceLabel} ${species.produceEmoji} ${produce?.nl ?? ""} · ${STRINGS.animalEveryLabel} ${formatDuration(species.produceMs)}`,
        price: species.cost,
        onPick: () => setPicked({ kind: "animal", def: species }),
      });
    }
  } else {
    for (const item of decorByCategory(category)) {
      const word = WORDS_BY_ID.get(item.word);
      const meta =
        item.pen && item.size
          ? `${STRINGS.penSizeLabel(item.size)} · ${STRINGS.penCapacityLabel} ${ANIMAL_SPECIES.map(
              (s) => `${penCapacity(item.size!, s.id)} ${s.emoji}`,
            ).join(" · ")}`
          : (word?.es ?? "");
      rows.push({
        key: item.id,
        thumb: { kind: "decor", id: item.id, emoji: item.emoji },
        nl: `${word?.article ?? ""} ${word?.nl ?? item.id}`.trim(),
        meta,
        price: item.price,
        onPick: () => setPicked({ kind: "decor", def: item }),
      });
    }
  }

  if (picked.kind === "crop") {
    return (
      <PurchaseConfirm
        crop={picked.def}
        isFirstPurchase={!purchasedCrops.includes(picked.def.id)}
        onConfirm={() => {
          markCropPurchased(picked.def.id);
          if (!freeField) setProblem(STRINGS.noFieldForSeed);
          else plantCrop(freeField.id, picked.def.id);
          setPicked({ kind: "none" });
        }}
        onClose={() => setPicked({ kind: "none" })}
      />
    );
  }

  if (picked.kind === "animal") {
    return (
      <AnimalConfirm
        species={picked.def}
        isFirstPurchase={!purchasedAnimals.includes(picked.def.id)}
        onConfirm={(name) => {
          const id = buyAnimal(picked.def.id, name);
          if (!id) setProblem(STRINGS.animalFarmFull);
          else markAnimalPurchased(picked.def.id);
          setPicked({ kind: "none" });
        }}
        onClose={() => setPicked({ kind: "none" })}
      />
    );
  }

  if (picked.kind === "decor") {
    return (
      <DecorConfirm
        decor={picked.def}
        isFirstPurchase={!purchasedDecor.includes(picked.def.id)}
        onConfirm={() => {
          const id = buyDecor(picked.def.id);
          if (!id) setProblem(STRINGS.decorFarmFull);
          else markDecorPurchased(picked.def.id);
          setPicked({ kind: "none" });
        }}
        onClose={() => setPicked({ kind: "none" })}
      />
    );
  }

  return (
    <div className="animate-fade-up absolute inset-0 flex flex-col bg-farm-50">
      <header className="flex items-center justify-between gap-2 bg-farm-100 p-[18px]">
        <button
          onClick={onBack}
          aria-label={STRINGS.back}
          className="flex h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-white text-lg font-black text-farm-700 active:bg-farm-200"
        >
          ←
        </button>
        <span className="flex flex-col items-center leading-[1.15]">
          <span className="text-[17px] font-black text-ink-900">
            {breeder ? STRINGS.animalShopTitle : STRINGS.marketTitle}
          </span>
          <span className="text-xs font-extrabold text-ink-500">
            {breeder ? STRINGS.animalShopSubtitle : STRINGS.marketTitleNl}
          </span>
        </span>
        <span className="text-[15px] font-black text-farm-700">🪙 {munten}</span>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="flex w-[92px] shrink-0 flex-col gap-2 overflow-y-auto bg-farm-100 p-2 py-3">
          {CATEGORIES.map((id) => {
            const active = id === category;
            return (
              <button
                key={id}
                onClick={() => setCategory(id)}
                aria-pressed={active}
                className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 ${
                  active ? "bg-white shadow-[0_6px_16px_rgba(120,70,20,.08)]" : ""
                }`}
              >
                <span className="text-[22px]">{CATEGORY_ICON[id]}</span>
                <span
                  className={`text-[11px] font-black ${active ? "text-ink-900" : "text-ink-500"}`}
                >
                  {STRINGS.marketCategories[id]}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3.5">
          {problem && (
            <p className="rounded-[20px] border-2 border-warn-border bg-warn-bg p-3 text-sm font-black text-warn-text">
              {problem}
            </p>
          )}

          {rows.map((row) => {
            const affordable = munten >= row.price;
            return (
              <button
                key={row.key}
                disabled={!affordable}
                onClick={row.onPick}
                className={`flex items-center gap-3 rounded-[20px] border-2 p-3 text-left transition-transform duration-75 active:scale-[0.99] disabled:opacity-50 ${
                  row.prestige
                    ? "border-warn-border bg-warn-bg/40"
                    : "border-farm-200 bg-white"
                }`}
              >
                <PropThumb kind={row.thumb.kind} id={row.thumb.id} emoji={row.thumb.emoji} />
                <span className="flex min-w-0 flex-1 flex-col leading-[1.25]">
                  <span className="truncate text-base font-black text-ink-900">{row.nl}</span>
                  <span
                    className={`truncate text-xs font-bold ${
                      row.prestige ? "text-warn-text-2" : "text-ink-500"
                    }`}
                  >
                    {affordable ? row.meta : STRINGS.cannotAffordMeta}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-[14px] px-3.5 py-2.5 text-sm font-black ${
                    affordable ? "bg-leaf-500 text-white" : "bg-farm-100 text-ink-500"
                  }`}
                >
                  {row.price} 🪙
                </span>
              </button>
            );
          })}

          <div className="mt-auto flex items-center gap-2.5 rounded-[20px] bg-farm-100 p-3.5">
            <span className="text-2xl">💡</span>
            <span className="text-xs font-extrabold leading-[1.35] text-ink-500 [text-wrap:pretty]">
              {STRINGS.marketHint}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
