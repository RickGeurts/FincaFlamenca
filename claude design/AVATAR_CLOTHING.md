# Avatar & clothing — asset spec and catalog

Companion to `SCREENS.md` screen 8. Covers the avatar personalisation system: how the character is composed, what art must be produced, and the full item catalog with its Dutch vocabulary.

Design reference: turn **2a** in `Finca Flamenca Options.dc.html` (five screens: constructor, colores, conjuntos, prenda, armario).

## The learning idea
Personalisation is not a cosmetic side-pocket — it is the delivery vehicle for **unit 6 «Ropa y colores»** and part of unit 7 «het weer»:

- Every wearable carries `article + nl + es` and enters the SRS the first time it is owned.
- Every **colour** is a vocabulary item too (`rood`, `blauw`, `geel`, `groen`, `bruin`, `zwart`, `wit`, `roze`, `oranje`, `grijs`). Choosing a colour plays the word and grants a small one-time reward (+2 munten), then the word joins the review queue.
- **Conjuntos (outfit sets)** teach a themed phrase (`de boerin`, `het feest`, `de regen`), so the wardrobe scaffolds sentences, not just nouns.
- **Wardrobe challenges** are free-form production practice: `Vístete de azul: ponte iets blauw.` Passing = the avatar actually wears something blue; reward 25 munten + 15 XP.
- Trying on is always free. Only buying costs munten. Nothing is ever taken away.

## Composition model
The avatar is a **layer stack**, not a set of finished portraits. Ten slots, rendered back-to-front:

| # | Slot | Key | Required | Notes |
| --- | --- | --- | --- | --- |
| 1 | Body / skin | `skin` | yes | 5 tones, not purchasable, no vocabulary gate |
| 2 | Hair back | `hair` | yes | style + colour (5 styles × 5 colours) |
| 3 | Legs | `bottom` | yes | broek / rok / pollera / overall (long form covers legs) |
| 4 | Feet | `shoes` | yes | laars / schoen / sandaal / klomp |
| 5 | Torso | `top` | yes | hemd / trui / jas / jurk (dress fills 3+5) |
| 6 | Face | `face` | yes | eyes + mouth; 3 variants, free |
| 7 | Hair front | `hairFront` | — | fringe/strands, follows `hair` colour |
| 8 | Head | `hat` | — | hoed / pet / strohoed / muts / bloem |
| 9 | Accessory | `accessory` | — | sjaal / bril / zonnebril / ketting / handschoen |
| 10 | Carry | `carry` | — | rugzak / mochila / paraplu / mand |

Rules the implementation must enforce:
- `top: "de jurk"` (dress) and `top: "de pollera"` suppress the `bottom` slot.
- `hat: "de muts"` swaps `hairFront` for a shorter variant so hair doesn't poke through.
- `accessory` and `carry` are independent (both can be worn).
- Every slot stores `{ itemId, colorId }`; colour is per-item, so the same `de sjaal` can be owned once and worn in any unlocked colour.

```ts
type AvatarConfig = {
  skin: SkinId;                       // "skin1".."skin5"
  face: FaceId;                       // "face1".."face3"
  hair: { itemId: HairId; colorId: ColorId };
  top?: { itemId: string; colorId: ColorId };
  bottom?: { itemId: string; colorId: ColorId };
  shoes?: { itemId: string; colorId: ColorId };
  hat?: { itemId: string; colorId: ColorId };
  accessory?: { itemId: string; colorId: ColorId };
  carry?: { itemId: string; colorId: ColorId };
};
type Outfit = { id: string; nl: string; es: string; slots: Partial<AvatarConfig>; unlock?: { unit: number } };
```
Store `AvatarConfig` + up to six saved `Outfit`s in the existing persisted player state. Wearing is local and free; only `ownedItems: string[]` and `unlockedColors: ColorId[]` gate what can be worn.

## Art production list
The mockups use the same **large expressive emoji stand-ins** as the quest scenes (🧑🏻‍💼, 👩🏽‍🌾, 🧔🏼‍♂️) — the owner explicitly prefers that register. Final character art must match it: chunky, rounded, warm, big readable faces — **not** simplified flat geometry. Equipped items that emoji can't show (hair colour, specific garments) surface as badges/chips beside the figure in the mocks; in production they render on the character. The real art has to be produced; the app already renders three.js, so either pipeline works — pick one before building:

**Option A — 2D layered sprites (recommended, cheapest).** One PNG or SVG per item per slot, drawn on a fixed 512 × 768 canvas with a shared skeleton, so layers always align. Colourable items ship as a **white/greyscale mask** tinted at runtime (CSS `filter` on 2D, or `tint` in canvas), so one drawing serves ten colours. Deliverables: `public/avatar/<slot>/<itemId>.png` + a `manifest.json` with each item's anchor box.

**Option B — 3D attachments on the existing prop pipeline.** Extend `farm-props.glb` with a rigged character and named attachment nodes (`slot_head`, `slot_torso`, `slot_legs`, `slot_feet`, `slot_hand`), each item a separate mesh whose material colour is set at runtime. Reuses `three/thumbnail.ts` for shop thumbnails and lets the avatar stand in the farm scene. More work; better payoff if the avatar should ever appear on the farm.

Either way, produce for each item:
1. the worn layer (aligned to the skeleton),
2. a 96 × 96 shop/wardrobe thumbnail on transparent background,
3. the colour mask if the item is colourable.

**Count for the catalog below: 32 items + 5 skin tones + 5 hair styles + 3 faces = 45 drawings, 22 of them colourable.** The 🔒 emoji thumbnails in the mockups are placeholders for #2.

## Catalog
Prices in munten. `unit` = the unit that must be finished (or XP gate) before the item appears; `⭐` = prestige item. Dutch is **draft pending human review** (`"reviewed": false` per `REVIEW.md`) — the Colombian items keep their Spanish names on purpose and teach the Dutch generic word alongside.

### Cabello · het haar (free, unlocked by unit 6)
| id | nl | es | price |
| --- | --- | --- | --- |
| `hair_short` | het korte haar | el pelo corto | 0 |
| `hair_tail` | de staart | la cola | 0 |
| `hair_curls` | de krullen | los rizos | 20 |
| `hair_braid` | de vlecht | la trenza | 20 |
| `hair_bun` | de knot | el moño | 30 |

### Ropa · de kleding
| id | nl | es | price | unit | colourable |
| --- | --- | --- | --- | --- | --- |
| `top_hemd` | het hemd | la blusa | 0 (start) | — | yes |
| `top_trui` | de trui | el suéter | 45 | 6 | yes |
| `top_jas` | de jas | la chaqueta | 80 | 6 | yes |
| `top_jurk` | de jurk | el vestido | 70 | 6 | yes |
| `top_regenjas` | de regenjas | el impermeable | 90 | 7 | yes |
| `top_pollera` ⭐ | de rok (pollera) | la pollera | 120 | 6 | yes |
| `bottom_broek` | de broek | el pantalón | 0 (start) | — | yes |
| `bottom_rok` | de rok | la falda | 40 | 6 | yes |
| `bottom_short` | de korte broek | el short | 30 | 6 | yes |
| `bottom_overall` | de overall | el peto | 65 | 6 | yes |

### Sombreros · de hoeden
| id | nl | es | price | unit |
| --- | --- | --- | --- | --- |
| `hat_vueltiao` ⭐ | de hoed (vueltiao) | el sombrero vueltiao | 0 (gift, day 1) | — |
| `hat_pet` | de pet | la gorra | 40 | 6 |
| `hat_strohoed` | de strohoed | el sombrero de paja | 55 | 6 |
| `hat_muts` | de muts | el gorro | 45 | 7 |
| `hat_bloem` | de bloem | la flor | 35 | 6 |
| `hat_kroon` ⭐ | de kroon | la corona | 150 | 8 |

### Calzado · de schoenen
| id | nl | es | price | unit |
| --- | --- | --- | --- | --- |
| `shoes_laars` | de laars | la bota | 0 (start) | — |
| `shoes_schoen` | de schoen | el zapato | 35 | 6 |
| `shoes_sandaal` | de sandaal | la sandalia | 30 | 6 |
| `shoes_klomp` ⭐ | de klomp | el zueco | 90 | 6 |

### Extras · de accessoires
| id | nl | es | price | unit |
| --- | --- | --- | --- | --- |
| `acc_sjaal` | de sjaal | la bufanda | 50 | 6 |
| `acc_bril` | de bril | las gafas | 45 | 6 |
| `acc_zonnebril` | de zonnebril | las gafas de sol | 60 | 6 |
| `acc_ketting` | de ketting | el collar | 55 | 6 |
| `acc_handschoen` | de handschoen | el guante | 40 | 7 |
| `carry_rugzak` | de rugzak | la mochila | 80 | 6 |
| `carry_mochila` ⭐ | de tas (mochila) | la mochila arhuaca | 130 | 6 |
| `carry_paraplu` | de paraplu | el paraguas | 70 | 7 |
| `carry_mand` | de mand | la cesta | 45 | 6 |

### Conjuntos · de outfits
| id | nl | es | slots | unlock |
| --- | --- | --- | --- | --- |
| `set_boerin` | de boerin | la granjera | hemd · broek · laars · vueltiao | start |
| `set_feest` | het feest | la feria | pollera · bloem · sandaal | unit 6 |
| `set_regen` | de regen | la lluvia | regenjas · laars · paraplu | unit 7 |
| `set_zondag` | de zondag | el domingo | jurk · schoen · ketting | unit 6 |
| `set_winter` | de winter | el invierno | jas · muts · sjaal · handschoen | unit 7 |

### Colores · de kleuren
`rood #b91c1c` · `blauw #3d6ea8` · `geel #d4a017` · `groen #65a30d` · `oranje #d97706` · `bruin #6b4423` · `zwart #2a1c10` · `wit #fefaf3` · `roze #c04a6e` · `grijs #8a8378`

First four unlocked at unit 6 start; the rest unlock one at a time as unit 6 lessons complete. +2 munten the first time each is used.

### Tonos de piel · de huid
`skin1 #f0c9a4` · `skin2 #dda877` · `skin3 #b57c4f` · `skin4 #8a5a34` · `skin5 #6b4423` — free, always available, no vocabulary attached (deliberately: skin tone is identity, not a lesson).

## Screens to build (turn 2a)
1. **Constructor** — 76px slot rail (Piel · Pelo · Ropa · Sombrero · Calzado · Extras) + 2-column item grid + live preview with 🔄 (rotate) and 🎲 (random). Primary: `Guardar mi look`.
2. **Colores** — skin swatches (46px circles), hair colours, then item colours as labelled chips showing the Dutch word. Reward strip at the bottom.
3. **Conjuntos** — up to six saved outfits as wide cards with a small figure, the set's Dutch phrase + 🔊, its item list, and `Ponérmelo` / `En uso ✓` / lock reason.
4. **Prenda** — try-on sheet over the figure: word 30px/900 + 🔊, example sentence panel, colour row, `Probar` (free) + `Comprar · N 🪙`.
5. **Armario** — collection progress (`14 de 32 prendas`, ring), 3-column grid where each card shows the item's SRS strength as three bars, plus the wardrobe challenge card.

All values, colours and copy follow `DESIGN_SYSTEM.md`. New strings go in `src/content/strings.es.ts`; new vocabulary in `src/content/vocab/` flagged `"reviewed": false`.

## New strings
```
myLook: "Mi look"            myLookNl: "mijn outfit"
wardrobe: "Mi armario"       wardrobeNl: "de kledingkast"
outfits: "Conjuntos"         outfitsNl: "de outfits"
colors: "Colores"            colorsNl: "de kleuren"
slotSkin: "Piel" · slotHair: "Pelo" · slotTop: "Ropa" · slotHat: "Sombrero" · slotShoes: "Calzado" · slotExtras: "Extras"
skinTone: "Tono de piel · de huid"
hairColor: "Color del pelo · het haar"
itemColor: "Color · de kleur"
tryOn: "Probar"              wear: "Ponérmelo"
saveLook: "Guardar mi look"  inUse: "En uso"
owned: "Tuya"                moreInShop: (n) => `${n} más en la tienda`
ownedOf: (n, total) => `${n} de ${total} prendas`
ownedHint: "Cada prenda que tienes es una palabra que sabes"
outfitTeaches: "Un conjunto = una frase que aprendes"
outfitLimit: "Guarda hasta seis conjuntos. Cambiarte no cuesta munten — comprar la prenda sí."
colorReward: "+2 🪙 por cada color nuevo"
colorRewardHint: "Al elegirlo escuchas la palabra y entra en tu repaso"
buyAddsToReview: "Al comprarla entra en tu repaso con su artículo y su color."
wardrobeChallenge: "Reto del armario"
challengeBlue: "Vístete de azul: ponte iets blauw."
challengeReward: (c, xp) => `Recompensa · ${c} 🪙 + ${xp} XP`
lockedUnit: (n, theme) => `🔒 Unidad ${n} · ${theme}`
photoHint: "Manda una foto de tu look a la abuela — se guarda sólo en tu teléfono."
```
