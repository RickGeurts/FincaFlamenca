# Handoff: Finca Flamenca — «El pueblo» UI (dirección 1b)

## Overview
This package specifies a **UI/navigation rework** of Finca Flamenca (repo `RickGeurts/FincaFlamenca`, branch `main`). The game logic, learning engine, economy, persistence and the 3D farm scene stay as they are. What changes is everything *around* the farm:

- Navigation becomes a **village** (`el pueblo`): la finca, la escuela, el mercado, el criadero, la alcaldía are *places* you travel to, replacing the two-tab `farm | lessons` bar in `src/app/App.tsx`.
- Farm tools (arar, sembrar, ordenar, zoom) move off the page flow into a **vertical dock** pinned to the left edge, so the 3D scene fills the viewport instead of sitting in a 420px box above a stack of buttons.
- The lesson session gains a **sendero**: a vertical rail of stops (one per exercise, typed by icon) so progress through a session is visible and feels progressive rather than "next card, next card".
- Shops become a *place* (el mercado / el criadero) with a category rail, instead of modals launched from buttons under the farm.

### Hard constraints from the product owner
1. **Do not touch the farm rendering.** `src/ui/farm/three/*`, the tile grid, placement, drag-to-move, rotate, and the bin drop all keep their current behaviour and API. `FarmScene`'s props do not change.
2. Spanish is the only interface language. Dutch is target-language content only. No English in player-facing strings.
3. All new player-facing copy goes in `src/content/strings.es.ts` — never inline in components (existing convention).
4. Kindness pillar stays: no loss, no punishment, retries free, streak pauses.
5. Mobile-first, ~390px wide viewport, tap targets ≥ 44px.

## About the design files
`1b-el-pueblo-reference.html` and `Finca Flamenca Options.dc.html` in this bundle are **design references written in HTML** — inline-styled static mockups of the intended look and layout. They are *not* production code and should not be copied into the app.

The task is to **recreate these designs inside the existing codebase**: React 18 + TypeScript + Vite + Tailwind CSS v4 (`@theme` tokens live in `src/index.css`), Zustand store in `src/state/store.ts`. Use Tailwind utility classes and the existing component conventions, not inline styles.

The reference file shows **eight phone screens** for direction 1b, at 390 × 780. `Finca Flamenca Options.dc.html` additionally contains directions 1a and 1c, which were **not** chosen — keep it only as context for why 1b won (1a = radial HUD, 1c = pause-menu drawer).

## Fidelity
**High fidelity.** Colors, type sizes, weights, radii, spacing and copy in the reference are final intent and are listed exactly in `DESIGN_SYSTEM.md` and `SCREENS.md`. Recreate them faithfully with Tailwind classes and the tokens already in `src/index.css` (extended per `DESIGN_SYSTEM.md`).

Two deliberate stand-ins in the mockups:
- **Emoji are placeholders for the 3D props.** The real app renders `public/models/farm-props.glb` through `three/thumbnail.ts` in shops and `FarmScene` on the farm. Keep using the real models wherever the mock shows an emoji of a crop/animal/decor item. Emoji stay only where the app already uses them as UI symbols (🪙 ⭐ 🔥 🔊 💧 🌾).
- **The isometric CSS grid** in the "Finca" screen stands in for the existing three.js scene. It is only there to show framing (scene edge-to-edge, HUD floating over it).

## Screens
Full per-screen spec in **`SCREENS.md`**. Summary:

| # | Screen | Place | Replaces |
| --- | --- | --- | --- |
| 1 | Finca | `finca` | `FarmView` chrome + tab bar |
| 2 | La escuela | `escuela` | `Home.tsx` |
| 3 | Ejercicio (sendero) | session | `LessonPlayer.tsx` chrome |
| 4 | Fin de sesión | session | `SessionEnd.tsx` |
| 5 | Ficha de palabra | overlay | `WordCardModal.tsx` |
| 6 | El mercado | `mercado` | `SeedSheet` / `DecorShop` list body |
| 7 | Misión (diálogo) | `alcaldia` / place-bound | new (quest engine per `CLAUDE.md`) |
| 8 | La tienda de ropa | `mercado` › ropa | new (avatar shop, M4) |

## Suggested build order
1. **Shell + router.** Add `place` to the store (or a tiny `useRouter` in `src/app/`), render `PlaceRail` + `FarmHud`, delete the `TabButton` bar. Farm and school reachable. Everything else still reachable through old modals.
2. **Finca chrome.** `FarmHud` (resource strip), `ToolDock`, `AlertStack` (hunger/produce cards). Move `tilling`, `arrange` state out of `FarmView`'s JSX into the dock. `FarmScene` becomes `absolute inset-0`.
3. **Escuela.** `School.tsx` replaces `Home.tsx`: repaso banner, aula rows with progress rings, misiones list. `SyncPanel`/`BackupPanel` move to a settings sheet behind ⚙️ in the HUD.
4. **Sendero.** `LessonPath` rail component inside `LessonPlayer`; exercise cards unchanged in logic, restyled per spec.
5. **Fin de sesión.** Add "palabras que subieron de caja" — needs the SRS box delta, see *State* below.
6. **Mercado / criadero.** Category rail + rows; reuse `PropThumb` and the existing purchase-confirm micro-lesson.
7. **Misiones + ropa.** Only after the quest engine (`src/quests/`) and avatar config exist.

## State management
Add to the Zustand store (`src/state/store.ts`) — all UI state, none of it persisted except `place`:

```ts
type Place = "finca" | "escuela" | "mercado" | "criadero" | "alcaldia";
type FarmTool = "none" | "till" | "seed" | "arrange";

place: Place;              // persisted, so reopening lands where she left
setPlace(p: Place): void;
farmTool: FarmTool;        // replaces FarmView's local `tilling`
setFarmTool(t: FarmTool): void;
marketCategory: string;    // "seeds" | "animals" | "nature" | "home" | "pasture" | "clothes"
```

Derived selectors the new UI needs (compute, don't store):
- `dueCount` — already computed in `App.tsx` via `dueWords`; move into a selector so both the school badge and the rail badge can read it.
- `alerts` — animals that are hungry or have produce, from `animals.isHungry` / `animals.hasProduce`; drives the alert stack on the farm (max 2 visible, then "+N").
- `openQuests` — from `content/dialogues` + `player.completedQuests`, gated by `requires.unit`.

For "palabras que subieron de caja" on the session-end screen: `finishSession` already updates SRS boxes. Return a `boxChanges: { wordId: string; from: number; to: number }[]` on `SessionSummary` (collected inside the same reducer where boxes are written) rather than diffing state in the component.

## Interactions & behavior
Exact values in `DESIGN_SYSTEM.md § Motion`. Key ones:

- **Place rail**: tapping a place cross-fades the view (140ms, ease-out) and slides the incoming content up 12px. The rail is fixed, always visible on `finca`; on other places the rail is replaced by that place's own back arrow (←) in its header. The school's rail icon carries a red badge with `dueCount` (hidden at 0).
- **Tool dock**: single-select. Active tool = leaf-500 chip. Tapping the active tool deselects it. `till` and `arrange` keep the current `FarmScene` semantics (tap grass to till, long-press to move). The dock never overlaps the alert stack (dock left, alerts right).
- **Sendero**: the current stop is a 52px circle, done stops 40px with ✓, future stops 40px muted, final stop is the 🎁 reward. Advancing animates the rail's fill; use the existing `pop-in` / `drop-in` keyframes in `src/index.css` for the new-stop pop.
- **Feedback**: keep `LessonPlayer`'s three states (correct / typo / wrong) and colors; wrong never blocks progress, `Continuar` always available.
- **Word card**: opens as a centered dialog on the farm (Modal), logs an exposure once per open (existing `WordCardModal` effect). Speaker button calls `speak(nl)`; the 🎤 "Decirlo" button is progressive enhancement — render it only when `SpeechRecognition` exists, and never gate rewards on it.
- **Purchases**: unchanged rule — first-ever purchase of a species shows the word + article + audio and asks one always-passable question before the buy button enables.

## New strings needed
Add to `STRINGS` in `src/content/strings.es.ts` (Spanish shown; wording is final unless the owner says otherwise):

```
places: { finca: "Finca", escuela: "Escuela", mercado: "Mercado", criadero: "Criadero", alcaldia: "Alcaldía" }
villageLabel: "El pueblo"
schoolTitle: "La escuela"
schoolClassrooms: "Aulas · nivel A1"
dailyReview: "Repaso del día"
reviewMinutes: "2 minutos"
lessonsOfUnit: (done, total) => `${done} de ${total} lecciones`
continueUnit: "Seguir"
enterUnit: "Entrar"
openQuests: "Misiones abiertas"
questAt: (place) => `En ${place}`
pathStop: (n, total) => `Parada ${n} de ${total}`
listenSlow: "🐢 lento"
boxUp: "Palabras que subieron de caja"
anotherLesson: "Otra lección"
marketTitle: "El mercado"
marketTitleNl: "de markt"
marketHint: "Al comprar algo nuevo aprendes su palabra: te la muestro con su artículo y su audio."
inASentence: "En una frase"
sayIt: "🎤 Decirlo"
listen: "🔊 Escuchar"
revealSpanish: "👁 Ver en español"
questStep: (n, total) => `Paso ${n} de ${total}`
questWriteAnswer: "Escribe tu respuesta en neerlandés"
questSend: "Enviar"
hint: "💡 Pista"
clothesShopTitle: "La tienda de ropa"
clothesShopSubtitle: "de kledingwinkel"
saveLook: "Guardar mi look"
inUse: "En uso"
lockedUntilUnit: (n) => `Termina la unidad ${n}`
toolTill: "Arar" · toolSeed: "Sembrar" · toolArrange: "Ordenar" · toolZoom: "Zoom"
```

Dutch strings in the mockups (`de tulp`, `het schaap`, `Manchas heeft honger!`, quest lines) belong in `src/content/`, and the `"reviewed": false` review flow in `REVIEW.md` still applies — the quest dialogue lines used in the mock are **drafts pending human review** (formal *u* with the ambtenaar and the veehandelaar, informal *je* with the buurvrouw).

## Assets
- 3D props: existing `public/models/farm-props.glb` via `src/ui/farm/three/thumbnail.ts`. No new models required.
- Coin art: existing `src/assets/cartoon-pack/coin.png` (`TEX.coin`).
- Icons: none new; the design uses emoji as UI symbols and 3D thumbnails for objects. If the owner later wants a proper icon set, the dock and rail are the two places that would need it.
- Font: **Nunito** (400/700/800/900), already the `--font-sans` in `src/index.css`. Self-host or keep the current loading approach; the mock loads it from Google Fonts for convenience only.

## Files in this bundle
- `README.md` — this file.
- `DESIGN_SYSTEM.md` — tokens, type scale, component recipes, motion.
- `SCREENS.md` — screen-by-screen spec with exact values and final copy.
- `1b-el-pueblo-reference.html` — the eight 1b screens, open in a browser.
- `Finca Flamenca Options.dc.html` — the full options board (1a, 1b, 1c) for context.

## Files in the app this touches
| Area | Files |
| --- | --- |
| Shell / routing | `src/app/App.tsx` (tab bar removed), new `src/app/Shell.tsx`, `src/state/store.ts` |
| Farm chrome | `src/ui/farm/FarmView.tsx` (chrome extracted), new `FarmHud.tsx`, `ToolDock.tsx`, `AlertStack.tsx` |
| Village nav | new `src/ui/PlaceRail.tsx` |
| School | `src/ui/Home.tsx` → `src/ui/School.tsx` |
| Session | `src/ui/LessonPlayer.tsx`, new `src/ui/LessonPath.tsx`, `src/ui/SessionEnd.tsx` |
| Shops | `src/ui/farm/SeedSheet.tsx`, `AnimalShop.tsx`, `DecorShop.tsx` → new `src/ui/market/Market.tsx` + rows |
| Settings | `SyncPanel.tsx`, `BackupPanel.tsx` move behind the ⚙️ sheet |
| Untouched | `src/ui/farm/three/*`, `src/game/*`, `src/learning/*`, `server/*` |
