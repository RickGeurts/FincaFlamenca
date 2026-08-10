# Design system — Finca Flamenca «El pueblo»

Everything here is already implied by `src/index.css`; this file makes the full set explicit. Colors are the exact values used in the reference mockups.

## Color tokens

Extend the Tailwind v4 `@theme` block in `src/index.css`. Existing tokens keep their names.

```css
@theme {
  /* existing */
  --color-farm-50:  #fefaf3;  /* app background, cards on dark */
  --color-farm-100: #fdf2e0;  /* secondary surface, inactive chips */
  --color-farm-200: #fae0b8;  /* borders, dividers, track fills */
  --color-farm-600: #d97706;  /* amber action (water, collect) */
  --color-farm-700: #b45309;  /* amber text / pressed */
  --color-leaf-500: #65a30d;  /* primary action */
  --color-leaf-600: #4d7c0f;  /* primary pressed + button underline */

  /* add */
  --color-ink-900:  #3d2a17;  /* headings, primary text, dark surface */
  --color-ink-700:  #6b4f31;  /* body text */
  --color-ink-500:  #8a6c4a;  /* secondary text, Spanish gloss */
  --color-ink-400:  #a58a68;  /* labels, eyebrow text */
  --color-ink-300:  #c9b393;  /* placeholder text, text on dark */
  --color-ink-950:  #2a1c10;  /* darkest surface (quest scene) */

  /* semantic (Tailwind palette values, used as-is) */
  --color-ok-bg:     #ecfccb; /* lime-100  */
  --color-ok-border: #a3e635; /* lime-400  */
  --color-ok-text:   #3f6212; /* lime-800  */
  --color-warn-bg:     #fef3c7; /* amber-100 */
  --color-warn-border: #fcd34d; /* amber-300 */
  --color-warn-text:   #92400e; /* amber-800 */
  --color-warn-text-2: #a16207; /* amber-700 */
  --color-bad-bg:     #fef2f2; /* rose-50   */
  --color-bad-border: #fca5a5; /* rose-300  */
  --color-bad-text:   #b91c1c; /* red-700   */
  --color-badge:      #e11d48; /* rose-600, due-count badge only */

  /* farm scene (three.js / sky gradient — reference only) */
  --color-sky-top:   #bfe3f5;
  --color-sky-mid:   #d9eec7;
  --color-sky-low:   #c3e09a;
}
```

**Usage rules**
- One primary action per screen, always `leaf-500` with a `leaf-600` underline. `farm-600` is the *second* action (regar, recoger) — never two greens competing.
- `farm-100` is the resting surface for anything inactive; white + `farm-200` border is the resting surface for anything *tappable in a list*.
- Locked / unaffordable = `opacity-50` on the same card, never a grey palette.
- Red (`--color-badge`) appears exactly once in the product: the due-count badge on the escuela icon. Never for errors — wrong answers use rose-50/300/700 which read as soft, not alarming.
- Dark surfaces (`ink-900`, `ink-950`) are reserved for celebration and quest scenes, so they feel like a different register from the daylight farm.

## Typography

Nunito, already `--font-sans`. Only three weights: 700 (body), 800 (semantic emphasis), 900 (everything structural). Nunito 900 at small sizes is the house voice — do not substitute 600.

| Role | Size / weight | Color | Notes |
| --- | --- | --- | --- |
| Display (celebration) | 26–28px / 900 | `farm-700` on light, `farm-50` on dark | `¡Lección completada!` |
| Word (Dutch, hero) | 30–34px / 900 | `ink-900` | always with article |
| Word gloss (Spanish) | 18–19px / 800 | `ink-500` | directly under the Dutch |
| Screen title | 17px / 900 | `ink-900` (or white on green header) | centered in headers |
| Place / subtitle (Dutch) | 12px / 800 | `ink-500` | `de markt`, `de fokker` |
| Card title | 15–16px / 900 | `ink-900` | |
| Card meta | 12–13px / 700 | `ink-500` | `30 min · vende 10 🪙` |
| Eyebrow label | 11–12px / 900, `tracking .12em`, uppercase | `ink-400` | `Aulas · nivel A1` |
| Button | 16–18px / 900 | white on color | |
| Numbers in HUD | 14px / 900 | `ink-900`, streak in `farm-700` | tabular feel; use `tabular-nums` |
| Exercise prompt (NL) | 20–21px / 900 | `ink-900` | never below 20px |
| Body min | 12px | — | nothing smaller than 12px anywhere |

Line-height: 1.2–1.35 for anything 15px+, 1.35–1.5 for paragraphs. Use `text-wrap: pretty` on multi-line Spanish copy.

## Spacing & layout

- Base unit 2px; the used scale is **4 / 6 / 8 / 10 / 12 / 14 / 16 / 18 / 22 / 26**.
- Screen padding: 16–18px horizontal. Header block 18px top.
- Gap between stacked cards: 10–12px. Between sections: 14–16px.
- Card padding: 12px (row cards), 14–18px (panels), 18–22px (dialogs).
- **Grouped siblings always use flex/grid + `gap`**, never margins on children.
- Safe area: bottom-anchored elements sit 24px from the bottom edge (plus `env(safe-area-inset-bottom)`).

## Radii

| Element | Radius |
| --- | --- |
| Pills, badges, progress tracks, avatars | `999px` |
| Dialog / bottom sheet / big panel | 26–30px |
| Cards, list rows | 18–22px |
| Buttons, inputs, chips | 14–18px |
| Small icon tiles (36–56px squares) | 12–16px |
| Farm tiles (reference only) | 5–6px |

## Shadows

```
dock / floating over scene   0 10px 26px rgba(90,50,10,.24)
HUD capsule                  0 5px 16px rgba(90,50,10,.16)
resting card                 0 6px 16px rgba(120,70,20,.08)
raised panel                 0 12px 30px rgba(120,70,20,.14)
dialog over scrim             0 24px 60px rgba(0,0,0,.35)
scene scrim (behind dialog)   rgba(43,28,14,.45)
```
Anything sitting *on* the 3D scene gets a shadow **and** a 92–95% opaque `farm-50` background, so it reads over any tile color.

## Component recipes

### Primary button
`h-14 (56px) rounded-2xl bg-leaf-500 border-b-[5px] border-leaf-600 text-white font-black text-[17px]`, active: `bg-leaf-600 border-b-0 translate-y-[2px]`. Full width unless paired.
Secondary: `bg-farm-100 text-farm-700`, no underline. Destructive: `bg-rose-500`. Disabled: `opacity-40`, no color change.

### Answer / tile button (exercise)
`bg-white border-2 border-farm-200 border-b-[5px] rounded-2xl px-4 py-4 font-black text-[17px] text-ink-900`. Selected: border `leaf-500`. Wrong: `bg-bad-bg border-bad-border text-bad-text`. Word tiles are the same at `px-4 py-3 text-[17px]`.

### List row (shop, aula, misión)
48–56px leading square (`rounded-2xl bg-farm-100`, 3D thumb or emoji at 26–28px) · title 15–16px/900 · meta 12px/700 `ink-500` · trailing price pill or `›`. Row: `bg-white border-2 border-farm-200 rounded-[20px] p-3`, `gap-3`. Min height 72px (tap target).

### Price pill
`px-3.5 py-2.5 rounded-[14px] bg-leaf-500 text-white font-black text-[13-14px]`. Unaffordable: `bg-farm-100 text-ink-500` + row at `opacity-50`.

### Progress ring (aula)
56px, `conic-gradient(leaf-500 0 <pct>turn, farm-100 <pct>turn 1turn)` with a 42px white inner circle holding the unit emoji/3D thumb. Locked aulas: no ring, `bg-farm-100` circle + 🔒.

### Progress bar
Track `h-2.5 rounded-full bg-farm-100`; fill `bg-leaf-500` (learning) or `bg-farm-600` (crop timer). Segmented variant: N equal `flex-1 h-2 rounded-full` segments, `gap-1.5`, done = leaf-500, current = farm-600, future = farm-200.

### Tool dock (farm, left edge)
Container: `rounded-[22px] bg-farm-50/92 p-2.5 flex flex-col gap-2.5` + dock shadow, pinned `left-3.5 top-24`. Item: 56px wide, `py-2 rounded-2xl flex flex-col items-center gap-0.5`, icon 22px, label 10px/900. Active item `bg-leaf-500` with white label. Four items: Arar · Sembrar · Ordenar · Zoom.

### Place rail (farm, bottom)
Sits on a `to-top` scrim `rgba(43,28,14,0) → rgba(43,28,14,.5)`. Eyebrow `El pueblo` 11px/900 white, `tracking .14em`, centered. Five items in a `flex gap-2.5 justify-center`: 60px `rounded-[20px]` tile (`farm-50/92`, icon 26px) + 11px/900 white label. Current place: solid `farm-50` tile with a 4px `leaf-500` ring. Locked place: `opacity-60`. Badge: 24px `rounded-full bg-[--color-badge]` with a 3px `farm-50` ring, top-right, `-6px/-4px` offset, hidden at 0.

### HUD capsule (farm, top)
`rounded-full bg-farm-50/95 px-4 py-2 flex items-center gap-2.5 font-black text-sm` — `🪙 munten | ⭐ xp | 🔥 streak`, dividers are `farm-200` pipes, streak in `farm-700`. Right of it, a 44px `rounded-2xl` ⚙️ button (settings sheet: sync, backup, sound, idioma de voz).

### Alert card (farm, right)
150px wide, `rounded-[18px] p-2.5 flex items-center gap-2`, emoji 22px + two lines (11–12px). Hunger: `warn-bg` + 2px `warn-border`, Dutch line first (`Manchas heeft honger`), Spanish under it. Neutral (produce ready): `farm-50/94`. Max two stacked, `gap-2.5`; a third becomes `+N` .

### Sendero (lesson path)
58px-wide column, left edge 18px, from below the header to 120px above the bottom. A 4px `farm-100` vertical track behind evenly distributed stops (`justify-between`). Done: 40px `leaf-500` circle, white ✓. Current: 52px `farm-600` circle with a 4px `warn-bg` ring and the exercise-type icon. Future: 40px `farm-100` circle, `ink-400` icon. Final: 44px `warn-bg` circle with a 3px dashed `warn-border` and 🎁.
Type icons: choice ❓ · translate ✍️ · listen 🎧 · assemble 🧩 · match 🔗.

### Speech bubbles (quest)
NPC: white, `rounded-[20px]` with `rounded-tl-md`, `p-4`, Dutch 17px/900 then Spanish 13px/700 `ink-500` (revealed on tap). Player: `bg-leaf-500`, `rounded-tr-md`, white 16px/900, max-width 230px, right-aligned with the avatar on the right. Avatars 52px emoji (placeholder for real character art).

### Word card (dialog)
Centered over a `rgba(43,28,14,.45)` scrim, `rounded-[30px] bg-farm-50 p-[22px]`, dialog shadow, ✕ top-right in `ink-400`. Order: 70px object image → Dutch 34px/900 → Spanish 18px/800 → 🔊 Escuchar (`leaf-500`) + 🎤 Decirlo (`farm-100`, only if `SpeechRecognition`) → example sentence panel (`bg-farm-100 rounded-[18px] p-4`: NL 16px/900, ES 13px/700) → context row (timer / happiness) → primary action.

### Category rail (market, left)
92px column, `bg-farm-100`, items `py-2.5 rounded-2xl flex flex-col items-center gap-1`, icon 22px + 11px label. Active: white + resting-card shadow. Categories: Semillas · Animales · Natura · Casa · Prados (+ Ropa in the clothes shop).

### Place header (non-farm places)
`bg-farm-100 p-[18px] flex items-center justify-between`: 42px `rounded-[14px] bg-white` ← button · centered two-line title (Spanish 17px/900 + Dutch 12px/800 `ink-500`) · munten 15px/900 `farm-700`. The school uses a `leaf-600 → leaf-500` gradient header 190px tall with white text instead.

## Motion

Reuse the keyframes already in `src/index.css` (`pop-in`, `drop-in`, `sway`, `ready-bob`, `coin-float`) and add nothing heavier than a CSS transition.

| Transition | Duration / easing |
| --- | --- |
| Place change (cross-fade + 12px slide-up) | 140ms ease-out |
| Dock / rail item press | 80ms, `scale(.96)` |
| Sheet or dialog in | 200ms `cubic-bezier(.34,1.56,.64,1)` (the app's existing overshoot) |
| Progress bar / ring fill | 300ms ease-out |
| Sendero stop advance | `pop-in` 450ms on the new current stop |
| Reward counters | count up over 600ms, coins use `coin-float` |
| Feedback banner | 160ms ease-out slide-up |

Respect `prefers-reduced-motion`: drop the overshoot and the sway/bob loops, keep opacity fades.

## Accessibility
- Tap targets ≥ 44px (dock items are 56px, rail tiles 60px, buttons 56px).
- Every audio affordance has visible text; the game is fully playable muted.
- Dutch text is never conveyed by color alone; the article is always spelled out.
- Contrast: `ink-500` on `farm-50` = 4.6:1 (ok for 12px/700 and above); never put `ink-400` on `farm-100` for anything but decorative eyebrows at 900 weight.
