import { useState } from "react";
import { STRINGS } from "../../content/strings.es";
import { WORDS_BY_ID } from "../../content";
import {
  COLORS,
  HAIR_COLORS,
  OUTFITS,
  SKINS,
  WEARABLES,
  availableColors,
  getWearable,
  isUnlocked,
  isWearingOutfit,
  wearOutfit,
  wearablesForSlot,
  type AvatarConfig,
  type ColorId,
  type Slot,
  type WearableDef,
} from "../../game/avatar";
import { canSpeak, speak } from "../../utils/speak";
import { useGameStore } from "../../state/store";
import { AvatarFigure } from "./AvatarFigure";
import { ItemSheet } from "./ItemSheet";

type Tab = "build" | "colors" | "outfits" | "wardrobe";

/** The slots she dresses, in the order the rail shows them. */
const SLOT_RAIL: { slot: Exclude<Slot, "skin" | "face">; icon: string }[] = [
  { slot: "hair", icon: "💇" },
  { slot: "top", icon: "👕" },
  { slot: "bottom", icon: "👖" },
  { slot: "shoes", icon: "🥾" },
  { slot: "hat", icon: "👒" },
  { slot: "accessory", icon: "🧣" },
  { slot: "carry", icon: "🎒" },
];

/**
 * Mi look — the wardrobe.
 *
 * The design lays this out as four sister screens; on a phone they are four
 * tabs under one live figure, so she can see what a choice does while she is
 * making it. Trying anything on is free and instant; the only button that
 * costs munten is the one in the garment's own sheet.
 */
export function LookScreen({ onBack }: { onBack: () => void }) {
  const munten = useGameStore((s) => s.player.munten);
  const avatar = useGameStore((s) => s.player.avatar);
  const owned = useGameStore((s) => s.player.ownedItems);
  const unlockedUnits = useGameStore((s) => s.player.unlockedUnits);
  const wearAvatar = useGameStore((s) => s.wearAvatar);
  const useColor = useGameStore((s) => s.useColor);

  const [tab, setTab] = useState<Tab>("build");
  const [slot, setSlot] = useState<Exclude<Slot, "skin" | "face">>("top");
  const [sheet, setSheet] = useState<WearableDef | null>(null);
  const [reward, setReward] = useState<number>(0);

  /** Put something on. Free, immediate, and never refused. */
  const tryOn = (item: WearableDef) => {
    if (item.slot === "hair") {
      wearAvatar({ ...avatar, hair: { ...avatar.hair, itemId: item.id } });
      return;
    }
    const current = avatar[item.slot];
    wearAvatar({
      ...avatar,
      [item.slot]: { itemId: item.id, colorId: current?.colorId ?? "wit" },
    });
  };

  const takeOff = (which: Exclude<Slot, "skin" | "face" | "hair">) => {
    wearAvatar({ ...avatar, [which]: undefined });
  };

  const paint = (which: Exclude<Slot, "skin" | "face" | "hair">, colorId: ColorId) => {
    const current = avatar[which];
    if (!current) return;
    wearAvatar({ ...avatar, [which]: { ...current, colorId } });
    const paid = useColor(colorId);
    if (paid > 0) setReward(paid);
    const colour = COLORS.find((c) => c.id === colorId);
    if (colour) speak(WORDS_BY_ID.get(colour.word)?.nl ?? colorId);
  };

  const wornSet = OUTFITS.find((o) => isWearingOutfit(avatar, o));
  const wornWord = wornSet ? WORDS_BY_ID.get(wornSet.word) : undefined;

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
          <span className="text-[17px] font-black text-ink-900">{STRINGS.myLook}</span>
          <span className="text-xs font-extrabold text-ink-500">{STRINGS.myLookNl}</span>
        </span>
        <span className="text-[15px] font-black text-farm-700">🪙 {munten}</span>
      </header>

      {/* The figure stays put while the tabs change underneath it. */}
      <div className="relative mx-4 mt-4 flex h-[240px] items-end justify-center overflow-hidden rounded-[26px] bg-gradient-to-b from-farm-50 to-farm-200">
        <AvatarFigure config={avatar} size={168} className="-mb-4" />
        {wornSet && wornWord && (
          <button
            onClick={() => speak(wornWord.article ? `${wornWord.article} ${wornWord.nl}` : wornWord.nl)}
            className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-farm-50/94 px-3 py-1.5"
          >
            {canSpeak() && <span className="text-[15px]">🔊</span>}
            <span className="text-[13px] font-black text-ink-900">
              {wornWord.article} {wornWord.nl}
            </span>
            <span className="text-xs font-extrabold text-ink-500">{wornSet.es}</span>
          </button>
        )}
        <button
          onClick={() => wearAvatar(shuffleLook(avatar, owned))}
          aria-label={STRINGS.randomLook}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-farm-50/94 text-base"
        >
          🎲
        </button>
        {reward > 0 && (
          <span
            className="animate-coin-float absolute bottom-8 right-6 text-sm font-black text-farm-700"
            onAnimationEnd={() => setReward(0)}
          >
            +{reward} 🪙
          </span>
        )}
      </div>

      <nav className="mx-4 mt-3 flex gap-1.5">
        {(Object.keys(STRINGS.lookTabs) as Tab[]).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`min-h-11 flex-1 rounded-xl text-xs font-black ${
              tab === id ? "bg-ink-900 text-farm-50" : "bg-farm-100 text-ink-500"
            }`}
          >
            {STRINGS.lookTabs[id]}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3">
        {tab === "build" && (
          <div className="flex gap-3">
            <div className="flex w-[76px] shrink-0 flex-col gap-2">
              {SLOT_RAIL.map((entry) => (
                <button
                  key={entry.slot}
                  onClick={() => setSlot(entry.slot)}
                  aria-pressed={slot === entry.slot}
                  className={`flex flex-col items-center gap-0.5 rounded-[15px] py-2.5 ${
                    slot === entry.slot ? "bg-leaf-500" : "bg-farm-100"
                  }`}
                >
                  <span className="text-[19px]">{entry.icon}</span>
                  <span
                    className={`text-[10px] font-black ${
                      slot === entry.slot ? "text-white" : "text-ink-700"
                    }`}
                  >
                    {STRINGS.slots[entry.slot]}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid flex-1 grid-cols-2 content-start gap-2.5">
              {slot !== "hair" && (
                <button
                  onClick={() => takeOff(slot)}
                  className="flex h-[98px] flex-col items-center justify-center gap-1 rounded-[18px] border-2 border-dashed border-farm-200 bg-white"
                >
                  <span className="text-[26px]">🚫</span>
                  <span className="text-[11px] font-black text-ink-500">
                    {STRINGS.wardrobeEmptySlot}
                  </span>
                </button>
              )}
              {wearablesForSlot(slot).map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  owned={owned.includes(item.id)}
                  worn={
                    item.slot === "hair"
                      ? avatar.hair.itemId === item.id
                      : avatar[item.slot]?.itemId === item.id
                  }
                  locked={!isUnlocked(item, unlockedUnits)}
                  onTap={() => {
                    tryOn(item);
                    setSheet(item);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {tab === "colors" && (
          <div className="flex flex-col gap-4">
            <Swatches
              label={STRINGS.skinTone}
              colors={[...SKINS]}
              active={avatar.skin}
              onPick={(i) => wearAvatar({ ...avatar, skin: i as AvatarConfig["skin"] })}
            />
            <Swatches
              label={STRINGS.hairColor}
              colors={[...HAIR_COLORS]}
              active={avatar.hair.colorId}
              onPick={(i) =>
                wearAvatar({
                  ...avatar,
                  hair: { ...avatar.hair, colorId: i as AvatarConfig["hair"]["colorId"] },
                })
              }
            />

            <div className="flex flex-col gap-2">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-ink-400">
                {STRINGS.itemColor}
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {COLORS.map((colour) => {
                  const open = availableColors(unlockedUnits).some((c) => c.id === colour.id);
                  const word = WORDS_BY_ID.get(colour.word);
                  return (
                    <button
                      key={colour.id}
                      disabled={!open}
                      onClick={() => paint("top", colour.id)}
                      className={`flex items-center gap-2 rounded-2xl border-2 bg-white px-2.5 py-2 disabled:opacity-40 ${
                        avatar.top?.colorId === colour.id ? "border-leaf-500" : "border-farm-200"
                      }`}
                    >
                      <span
                        className="h-7 w-7 shrink-0 rounded-full border-2 border-farm-200"
                        style={{ background: colour.hex }}
                      />
                      <span className="truncate text-xs font-black text-ink-900">
                        {open ? word?.nl : STRINGS.lockedUnit(colour.unit)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-extrabold text-leaf-600">
                {STRINGS.colorReward(2)}
              </p>
              <p className="text-xs font-bold text-ink-500">{STRINGS.colorRewardHint}</p>
            </div>
          </div>
        )}

        {tab === "outfits" && (
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-bold text-ink-500">{STRINGS.outfitTeaches}</p>
            {OUTFITS.map((outfit) => {
              const word = WORDS_BY_ID.get(outfit.word);
              const nl = word ? `${word.article ?? ""} ${word.nl}`.trim() : outfit.word;
              const open = isUnlocked(outfit, unlockedUnits);
              const wearing = isWearingOutfit(avatar, outfit);
              return (
                <div
                  key={outfit.id}
                  className={`flex items-center gap-3 rounded-[22px] border-2 border-farm-200 bg-white p-3 ${
                    open ? "" : "opacity-50"
                  }`}
                >
                  <AvatarFigure
                    config={wearOutfit(avatar, outfit, outfit.items)}
                    size={44}
                  />
                  <span className="flex min-w-0 flex-1 flex-col leading-[1.25]">
                    <button
                      onClick={() => speak(nl)}
                      className="truncate text-left text-[15px] font-black text-ink-900"
                    >
                      {canSpeak() && "🔊 "}
                      {nl}
                    </button>
                    <span className="truncate text-xs font-bold text-ink-500">
                      {outfit.es} ·{" "}
                      {outfit.items
                        .map((id) => WORDS_BY_ID.get(getWearable(id).word)?.nl)
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {wearing ? (
                    <span className="shrink-0 rounded-[14px] bg-ok-bg px-3 py-2 text-xs font-black text-ok-text">
                      {STRINGS.inUse} ✓
                    </span>
                  ) : (
                    <button
                      disabled={!open}
                      onClick={() => wearAvatar(wearOutfit(avatar, outfit, owned))}
                      className="shrink-0 rounded-[14px] bg-leaf-500 px-3 py-2 text-xs font-black text-white disabled:bg-farm-100 disabled:text-ink-500"
                    >
                      {open ? STRINGS.wearIt : STRINGS.lockedUnit(outfit.unit ?? 6)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "wardrobe" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-[22px] bg-farm-100 p-4">
              <span className="text-3xl">👚</span>
              <span className="flex flex-col">
                <span className="text-base font-black text-ink-900">
                  {STRINGS.ownedOf(owned.length, WEARABLES.length)}
                </span>
                <span className="text-xs font-bold text-ink-500">{STRINGS.ownedHint}</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {WEARABLES.filter((w) => owned.includes(w.id)).map((item) => {
                const word = WORDS_BY_ID.get(item.word);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      tryOn(item);
                      setSheet(item);
                    }}
                    className="flex flex-col items-center gap-1 rounded-[18px] border-2 border-farm-200 bg-white p-2.5"
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="truncate text-[11px] font-black text-ink-900">
                      {word?.article} {word?.nl}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <button
          onClick={onBack}
          className="h-14 w-full rounded-[18px] border-b-[5px] border-farm-700 bg-farm-600 font-black text-[17px] text-white active:translate-y-0.5 active:border-b-0"
        >
          {STRINGS.saveLook}
        </button>
      </div>

      {sheet && (
        <ItemSheet
          item={sheet}
          colorId={
            sheet.slot === "hair" ? "wit" : (avatar[sheet.slot]?.colorId ?? "wit")
          }
          onColor={(colorId) =>
            sheet.slot !== "hair" &&
            paint(sheet.slot as Exclude<Slot, "skin" | "face" | "hair">, colorId)
          }
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

function ItemCard({
  item,
  owned,
  worn,
  locked,
  onTap,
}: {
  item: WearableDef;
  owned: boolean;
  worn: boolean;
  locked: boolean;
  onTap: () => void;
}) {
  const word = WORDS_BY_ID.get(item.word);
  return (
    <button
      onClick={onTap}
      disabled={locked}
      className={`flex h-[98px] flex-col items-center justify-center gap-0.5 rounded-[18px] border-2 bg-white disabled:opacity-50 ${
        worn
          ? "border-[3px] border-leaf-500"
          : item.prestige
            ? "border-warn-border bg-warn-bg/40"
            : "border-farm-200"
      }`}
    >
      <span className="text-[28px]">{item.emoji}</span>
      <span className="px-1 text-center text-[11px] font-black leading-tight text-ink-900">
        {word?.article} {word?.nl}
        {item.prestige && " ⭐"}
      </span>
      <span
        className={`text-[10px] font-black ${
          worn ? "text-leaf-600" : owned ? "text-leaf-600" : "text-farm-700"
        }`}
      >
        {locked
          ? STRINGS.lockedUnit(item.unit ?? 6)
          : worn
            ? `${STRINGS.inUse} ✓`
            : owned
              ? STRINGS.ownedLabel
              : `${item.price} 🪙`}
      </span>
    </button>
  );
}

function Swatches({
  label,
  colors,
  active,
  onPick,
}: {
  label: string;
  colors: string[];
  active: number;
  onPick: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-ink-400">{label}</span>
      <div className="flex gap-2.5">
        {colors.map((hex, i) => (
          <button
            key={hex}
            onClick={() => onPick(i)}
            aria-pressed={active === i}
            className={`h-11 w-11 rounded-full ${
              active === i ? "border-4 border-leaf-500" : "border-2 border-farm-200"
            }`}
            style={{ background: hex }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * A look picked at random out of what she owns. It only ever uses her own
 * wardrobe, so the dice can never dress her in something she has not bought.
 */
function shuffleLook(current: AvatarConfig, owned: string[]): AvatarConfig {
  const pick = <T,>(list: T[]): T | undefined =>
    list.length === 0 ? undefined : list[Math.floor(Math.random() * list.length)];

  const mine = owned.map((id) => getWearable(id));
  const next: AvatarConfig = { ...current };
  const hair = pick(mine.filter((w) => w.slot === "hair"));
  if (hair) next.hair = { ...current.hair, itemId: hair.id };
  for (const slot of ["top", "bottom", "shoes", "hat", "accessory", "carry"] as const) {
    const item = pick(mine.filter((w) => w.slot === slot));
    next[slot] = item ? { itemId: item.id, colorId: current[slot]?.colorId ?? "wit" } : undefined;
  }
  return next;
}
