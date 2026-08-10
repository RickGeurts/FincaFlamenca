# Screens — «El pueblo» (dirección 1b)

Reference: `1b-el-pueblo-reference.html`, eight screens left-to-right, two per row, each 390 × 780 (iPhone-ish, the owner's target is ~380px wide). All copy below is **final Spanish/Dutch** and should land in `src/content/strings.es.ts` / `src/content/`.

Token names (`farm-100`, `ink-500`, …) are defined in `DESIGN_SYSTEM.md`.

---

## 1 · Finca
**Purpose:** the home screen. Tend the farm; travel from here.
**Replaces:** `FarmView`'s button rows + the `TabButton` bar in `App.tsx`.

**Layout** — four floating layers over a full-bleed scene:
1. `FarmScene` → `absolute inset-0` (no card, no 420px box, no page padding). Everything below floats on top with `pointer-events` limited to itself.
2. **Top:** 14px inset. HUD capsule left (`🪙 340 | ⭐ 1 250 | 🔥 7`), 44px ⚙️ right. A `to-bottom` scrim `rgba(43,28,14,.42) → transparent` behind them for legibility over bright tiles.
3. **Left:** tool dock at `left:14px; top:96px` — Arar · Sembrar · Ordenar · Zoom (56px items, active = `leaf-500`).
4. **Right:** alert stack at `right:14px; top:96px`, 150px wide, max two cards.
5. **Bottom:** place rail on a `to-top` scrim, 16px/12px padding, 18px from the bottom.

**Alert cards (exact copy)**
- Hunger: `Manchas` / `heeft honger` — `warn-bg` + `warn-border`. Name comes from `animals.displayName`; the Dutch line uses `STRINGS.hungryNl(name)`.
- Produce: `Pip` / `algo para recoger` — neutral `farm-50/94`.
Tapping a card opens that animal's word card (same as tapping it in the scene).

**Place rail (exact)** — 🏡 Finca (current, `leaf-500` ring) · 🏫 Escuela (badge `12`) · 🏪 Mercado · 🐮 Criadero · 🏛️ Alcaldía (`opacity-60` until unit 5). Eyebrow above: `El pueblo`.

**Behavior**
- Tool selection is single-select and mutually exclusive with dragging: `Ordenar` is the drag/rotate mode that exists today; `Arar` keeps the current "tap grass to till, tap empty field to undo" rule; `Sembrar` opens the seed sheet on the next tapped empty field; `Zoom` reveals the existing zoom/rotate controls (`STRINGS.zoomIn` etc.) as a small cluster above the dock.
- The `moveHint` / `tillModeHint` copy that used to sit under the farm becomes a **one-line toast** at the top of the scene while that tool is active, auto-hiding after 4s.
- The wilted-crops banner becomes a third alert card (`warn` style) with `¡Oh no! Tus cultivos se marchitaron 🥀`, tapping it opens the revive dialog unchanged.

---

## 2 · La escuela
**Purpose:** pick what to practise. **Replaces:** `Home.tsx`.

**Layout**
- Header 190px, gradient `leaf-600 → leaf-500`: ← (42px, `white/20`), centered `La escuela` 17px/900 white, `🔥 7` right.
- Overlapping the header at `top:76px`: repaso panel, `white/16`, `rounded-[22px] p-4`: `Repaso del día` 16px/900 white + `12 palabras para repasar · +10 🪙` 13px/700 `lime-100`, and a `farm-50` button with `leaf-600` text: `Repasar`. Hidden (replaced by `No hay palabras para repasar. ¡Vuelve más tarde!` in a muted panel) when `dueCount === 0`.
- Body from `top:206px`, 18px padding, `gap-3`.

**Body**
1. Eyebrow `Aulas · nivel A1`.
2. Aula rows (one per unit from `UNITS`), 72px+ tall: progress ring (56px, `pct = lessonsDone/total`) + title `4 · La comida` + meta `Eten & drinken · 3 de 5 lecciones` + action pill. Current unit: `Seguir` in `leaf-500`. Started/available: `Entrar` in `farm-100`/`farm-700`. Locked: dashed `farm-200` border, `bg-farm-100`, 🔒 and meta `Se desbloquea con 60 XP más` (compute the real delta from `economy.ts` gates).
3. Eyebrow `Misiones abiertas` + quest rows: emoji/thumb 28px, title `Comprar terreno`, meta `En la alcaldía · 150 🪙 + más tierra`, trailing `›`. Tapping travels to that place and starts the dialogue.

**Note:** `SyncPanel` and `BackupPanel` move **out** of this screen into the ⚙️ settings sheet — the school is only about learning.

---

## 3 · Ejercicio (sendero)
**Purpose:** work through one session. **Replaces:** `LessonPlayer` chrome; exercise cards keep their logic.

**Layout**
- Header 18px: ✕ (42px `farm-100`) · centered `Aula 4 · sendero` 14px/900 `ink-500` · `🪙 +12` (running session earnings) 14px/900 `farm-700`.
- **Sendero** column: `left:18px; top:74px; bottom:120px`, 58px wide, stops `justify-between` on a 4px `farm-100` track. 8 stops + 🎁.
- **Card area:** `left:94px; right:18px; top:74px; bottom:120px`, `flex-col gap-4`.
  - Prompt chip: `farm-100` pill, 12px/900 `ink-500`, with the type icon: `🎧 Escucha y escribe lo que oyes`.
  - Card: `flex-1 bg-white border-2 border-farm-200 rounded-[26px] p-5`, centered content, resting-card shadow.
- Footer: `Parada 4 de 8` + `Saltar` (12px/800 `ink-500`, `justify-between`), then the primary `Comprobar`.

**Listen card content (shown)** — 110px `leaf-500` circle with 🔊 (48px) → `Escuchar otra vez · 🐢 lento` 14px/800 `ink-500` → typed answer on a 3px `farm-200` underline, 20px/900, placeholder text in `ink-300` → suggestion chips (`heeft`, `honger`, `dorst`) 14px/800 in `farm-100`.

**The other four types keep their current components**, restyled to this card: choice = 4 answer buttons; translate = prompt + input; assemble = answer tray (dashed `farm-200`) + tile bank; match = two columns of pairs. Feedback banner and `Continuar` behave exactly as today (see `LessonPlayer.tsx`), sitting between the card and the button.

---

## 4 · Fin de sesión
**Purpose:** pay out and show what moved. **Replaces:** `SessionEnd.tsx`.

**Layout**
- Top 300px `leaf-600 → leaf-500`: 🎉 (72px, or 🌟 when perfect, 🌱 when revive) → `¡Repaso completado!` 26px/900 white → `11 / 12 correctas` 15px/800 `lime-100`.
- Overlapping at `top:262px`: white panel `rounded-[26px] p-[18px]`, raised shadow: `Ganaste` 15px/900 `ink-700` + `🪙 +15` 26px/900; 2px `farm-100` divider; then one line per component — `Repaso diario +10 🪙`, `🔥 Bonus de racha ×1,5 +5 🪙` (`warn-text-2`), `⭐ Experiencia +30 XP` (`leaf-600`). Only render the lines that apply (perfect bonus, streak multiplier).
- `top:470px`: eyebrow `Palabras que subieron de caja` + word chips: up = `ok-bg`/`ok-border`/`ok-text` `de koe ↑`; down = `warn-bg`/`warn-border`/`warn-text` `het paard ↓`. Cap at ~8 chips, then `+N`.
- Bottom: primary `Volver a la finca 🏡` + secondary `Otra lección` (`farm-100`, `farm-700`).

Needs `boxChanges` on `SessionSummary` (see README § State). A revive session shows `¡Tus cultivos revivieron!` and returns straight to the farm.

---

## 5 · Ficha de palabra
**Purpose:** free tap-to-learn card for any farm object. **Replaces:** `WordCardModal.tsx`.

**Layout** — dialog at `top:150px`, `left/right:20px`, over a `rgba(43,28,14,.45)` scrim, `rounded-[30px] bg-farm-50 p-[22px]`, `gap-3.5`, dialog shadow, ✕ top-right.
Order: 70px object image (3D thumb) → `de tulp` 34px/900 → `el tulipán` 18px/800 `ink-500` → button pair `🔊 Escuchar` (`leaf-500`) / `🎤 Decirlo` (`farm-100`, conditional) → example panel `bg-farm-100 rounded-[18px] p-4`: eyebrow `En una frase`, `De tulp is rood.` 16px/900, `El tulipán es rojo.` 13px/700 → context row (white, `farm-200` border): `Listo en` / `1 h 12 min` → primary `Regar 💧` (or `Alimentar 🌾` / `Recoger 🥛`, disabled → `Regado ✓`).

**Content source:** `WORDS_BY_ID` gives `article + nl + es`. The example sentence is **new content**: add an optional `example_nl` / `example_es` to the `Word` schema in `src/content/vocab/`, and fall back to hiding the panel when absent (flag new Dutch as `"reviewed": false`).

For animals the context row is `Felicidad ❤️❤️❤️❤️` plus the rename input (`Ponle un nombre...`) exactly as today.

---

## 6 · El mercado
**Purpose:** buy seeds, animals, decor. Every purchase is a micro-lesson.
**Replaces:** the list bodies of `SeedSheet`, `AnimalShop`, `DecorShop` — the purchase-confirm micro-lesson component is reused unchanged.

**Layout**
- Place header (`farm-100`): ← · `El mercado` / `de markt` · `🪙 340`.
- Left category rail 92px from `top:96px` to the bottom: 🌱 Semillas (active) · 🐮 Animales · 🌳 Natura · 🏠 Casa · 🐑 Prados.
- Right pane `left:92px`, 14px padding, `gap-3`: rows of `de wortel` / `30 min · vende 10 🪙` / `5 🪙`; prestige items (`de koffie ⭐`) get `warn-bg` surface + `warn-border`; unaffordable rows `opacity-50` with meta `Practica un poco más 🌱`.
- Bottom of the pane, `mt-auto`: hint panel `farm-100 rounded-[20px] p-3.5` — 💡 + `Al comprar algo nuevo aprendes su palabra: te la muestro con su artículo y su audio.`

**Behavior:** tapping a row opens the existing purchase confirm (3D thumb, word + article + 🔊, first-time comprehension question, then `Plantar · 5 🪙` / `Comprar · 280 🪙`). Seeds bought from the market go to the next free tilled plot; seeds bought via the farm's `Sembrar` tool plant into the tapped plot. `El criadero` is the same screen with the Animales category preselected and the header reading `El criadero` / `de fokker`; pens/prados enforce the existing capacity rules (`STRINGS.penFullHint`).

---

## 7 · Misión (diálogo)
**Purpose:** story conversation that unlocks farm progress. **New** (needs `src/quests/` from `CLAUDE.md`).

**Layout**
- Background `#e8dcc6 → #d9c39c` (interior daylight; the criadero variant uses the dark `ink-950` scene — see option 1c screen 7 for that register).
- Header `farm-50/92`: ✕ 40px + a two-line block: `Comprar terreno · paso 2 de 5` 13px/900 and an 8px progress bar (`leaf-500` fill).
- Transcript from `top:88px`, `gap-3.5`: alternating bubbles with 52px avatars — NPC left, player right (`row-reverse`).
  - NPC: `Goedemiddag! Waarmee kan ik u helpen?` 17px/900 + revealed Spanish `¡Buenas tardes! ¿En qué puedo ayudarle?` 13px/700.
  - Player: `Ik wil graag land kopen.` on `leaf-500`.
  - Latest NPC line carries the affordance chip `👁 Ver en español · 🔊`.
- Bottom composer, `farm-50/96 rounded-[24px] p-4`, shadow `0 -6px 24px rgba(120,70,20,.14)`: eyebrow `Escribe tu respuesta en neerlandés` → input (17px/900, placeholder `ink-300`) → chips `💡 Pista` + 2–3 word hints → primary `Enviar`.

**Behavior:** choice nodes render 2–3 tappable Dutch options instead of the composer (see the 1c variant for the numbered treatment); typed nodes grade with the existing `grader.ts` (tolerant, 1 typo). Revealing Spanish is always free. Formal *u* with officials, informal *je* with the buurvrouw. Quest replay pays the small reward; first completion pays the big one + unlock.

---

## 8 · La tienda de ropa
**Purpose:** cosmetic sink — avatar + farm decor. **New** (M4).

**Layout**
- Place header: ← · `La tienda de ropa` / `de kledingwinkel` · `🪙 340`.
- Preview 280px tall (`farm-50 → farm-100`), avatar centered at 150px with 44px `‹` / `›` circles either side to flip through owned looks.
- From `top:392px`: category pills (`Sombreros` active in `farm-700`, `Ropa`, `Decoración`) then item rows: 54px thumb + `sombrero vueltiao` + meta `de hoed · un pedacito de casa` + trailing state — `En uso` (`ok-bg`/`ok-text`), price (`leaf-500`), or 🔒 with `Termina la unidad 6` at `opacity-55`.
- Bottom: primary `Guardar mi look` in `farm-600`/`farm-700`.

**Content note:** Colombian items (sombrero vueltiao, mochila, banderines) sit alongside Flemish ones and each carries its Dutch word — cosmetics teach too. The personal photo frame decor is local-only.

---

## Cross-screen rules
- Every object anywhere (crop, animal, decor, clothing) is tappable and opens its word card; every open logs an exposure.
- Prices always show the coin glyph after the number: `280 🪙`.
- Dutch always carries its article, and Dutch is always visually above/before its Spanish gloss.
- Never block progress: locked = explained (`Faltan 60 XP`, `Termina la unidad 6`), wrong = shown kindly, empty = invited (`Pulsa «Arar» para preparar tu primer campo de cultivo 🌱`).
- One primary green button per screen.
