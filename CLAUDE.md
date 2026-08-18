# CLAUDE.md — Finca Flamenca

## What this project is

A personal, single-player web game built for one user: a native Spanish speaker
(Colombian) learning Dutch at CEFR A1 level. The game combines a freemium-style
farm simulator (crops, animals, upgrades, decoration) with a Duolingo-style
language course. The player earns in-game currency ("munten") by completing
Dutch lessons and story-quest dialogues, and spends munten on developing her farm.

This is a gift, not a commercial product. There are **no real payments, no ads,
no logins**. The game is local-first: it runs client-side, saves to IndexedDB
and is fully playable offline.

**One exception, added deliberately:** an optional sync server keeps a copy of
the save so a cleared browser or a new phone doesn't cost her the farm. It is
opt-in, has no passwords (a pairing code is the whole identity), stores only
the savegame plus an optional recovery email, and the game must keep working
with it switched off. Anything beyond that — accounts, analytics, social
features — is still out of scope.

### Design pillars (consult these when making any decision)
1. **Spanish is the interface language.** All UI text, instructions, hints, and
   translations are in Spanish. Dutch is the target language only. Never use
   English anywhere in the player-facing app.
2. **The farm teaches.** Every farm entity carries its Dutch word (with article:
   de/het) and audio. Learning is embedded in play, not separated from it.
3. **Kind, never punishing.** Wilted crops are revivable via a short review
   session. Streaks pause instead of breaking. No energy walls, no dark patterns.
4. **Small daily sessions.** Target loop: 5–15 minutes/day. Real-time crop
   timers (hours) create the reason to return.
5. **Personal and hers.** The game is Colombian-Belgian: alongside tulips and
   Flemish farm staples, the farm grows koffie (coffee plants) and can host an
   arepakraam (arepa stand) as an unlockable building. Animals can be named by
   the player and keep their names everywhere (dialogues, chore prompts:
   "Manchas heeft honger!"). Avatar customization is a first-class feature.

## Embedded learning mechanics (the farm teaches)

- **Tap-to-learn word cards:** tapping ANY farm object (crop, animal, building,
  decor) opens a small card showing the Dutch word with its article, the
  Spanish translation, and a speaker button that plays the audio. Free, always
  available, no cost. Every tap logs a lightweight "exposure" for that word.
- **Chore review questions:** during feeding/watering/harvesting, roughly 1 in
  3 chores triggers a one-tap SRS question drawn from that object's word or a
  due word ("De koe heeft honger. Wat eet zij?" → gras / brood / vis). Correct
  answer: +2 munten and SRS credit. Wrong answer: show the right answer kindly,
  no penalty, word drops a box.
- **Purchases are micro-lessons:** buying an animal or seed shows the word,
  article, and audio in the confirm dialog; the first-ever purchase of a
  species asks one comprehension question before completing (always passable —
  retries are free).
- **Wilt revival:** wilted crops are revived by completing a 2-minute review
  session of due words, not by paying. Losing progress is never the answer;
  reviewing is.

## Tech stack

- **React 18 + Vite**, single-page app, installable **PWA** (manifest + service
  worker) so it works like a phone app and offline.
- **TypeScript** throughout.
- **Zustand** for game state, persisted to **IndexedDB** (via `idb-keyval`).
  localStorage only for tiny prefs. Autosave on every state mutation (debounced).
- **Tailwind CSS** for styling. Warm, cozy farm aesthetic — rounded, chunky,
  friendly. Mobile-first (she plays on a phone, ~380px wide).
- **Web Speech API** (`speechSynthesis`, lang `nl-NL` or `nl-BE`) for Dutch
  audio. Wrap in a `speak(text)` util with graceful fallback if no Dutch voice.
- Optional later: `SpeechRecognition` for pronunciation practice (progressive
  enhancement only — never required to progress).
- **Sync server** (`server/`): plain Node `http` plus `pg`, no framework. Serves
  the built app and a three-route API (`POST/GET/PUT /api/farms`). Rules live in
  `server/api.js` and are tested against an in-memory Postgres; `server/index.js`
  is only plumbing. Deployed on Railway with a managed Postgres.
- **The game never waits for the network.** IndexedDB stays the source of truth;
  syncing is a background copy that catches up. No analytics, no other APIs.
- Assets: simple SVG or emoji-based art is fine for v1; keep an `assets/`
  structure that allows swapping in real art later.

## Repository layout

```
src/
  app/            # routing, shell, PWA setup
  game/           # farm simulation logic (pure TS, no React)
    economy.ts    # prices, rewards, balancing constants (single source of truth)
    crops.ts      # crop lifecycle: planted -> growing -> ready -> wilted
    animals.ts    # hunger/happiness timers, produce (eggs, milk)
    farm.ts       # grid, placement, expansion
  learning/       # language engine (pure TS, no React)
    srs.ts        # spaced-repetition scheduler (Leitner boxes, 5 levels)
    lesson.ts     # lesson session builder: picks exercises from content + SRS
    grader.ts     # answer checking (accent/case tolerant, typo tolerance = 1 edit)
  quests/         # branching dialogue engine + quest state machine
  content/        # ALL learning content as JSON (see schemas below)
    course/       # a1-unit-01.json, a1-unit-02.json, ...
    dialogues/    # quest-gemeente.json, quest-veehandelaar.json, ...
    vocab/        # master word list with articles, audio hints, Spanish gloss
  ui/             # React components (Farm, Lesson, Dialogue, Shop, Avatar)
  state/          # Zustand stores + persistence
  utils/          # speak.ts, time.ts, rng.ts
```

**Rule: game logic and learning logic are pure TypeScript modules with unit
tests, independent of React.** UI components consume them. This keeps balancing
and grading testable.

## Core data models

```ts
// A vocabulary item — the atomic learning unit
interface Word {
  id: string;            // "koe"
  nl: string;            // "koe"
  article?: "de" | "het";
  es: string;            // "vaca"
  category: string;      // "animals", "food", "greetings", ...
  unit: number;          // course unit that introduces it
}

// SRS state per word
interface WordProgress {
  wordId: string;
  box: 0 | 1 | 2 | 3 | 4;   // Leitner box; 0 = new/lapsed
  dueAt: number;             // epoch ms
  seen: number; correct: number;
}

// Farm
interface Plot { id: string; crop?: PlantedCrop; }
interface PlantedCrop { cropId: string; plantedAt: number; state: "growing"|"ready"|"wilted"; }
interface Animal { id: string; speciesId: string; name?: string; lastFedAt: number; happiness: number; }

interface Player {
  munten: number;
  xp: number;
  streak: { days: number; lastActive: string };   // date string, streak pauses (freezes) after 1 missed day
  avatar: AvatarConfig;                            // outfits/items purchased
  unlockedUnits: number[];
  completedQuests: string[];
  landLevel: number;                               // expanded via quests
}
```

## Content schemas (JSON, author-editable without code changes)

### Lesson unit (`content/course/a1-unit-XX.json`)
```json
{
  "unit": 3,
  "title_es": "Los animales de la granja",
  "title_nl": "De boerderijdieren",
  "words": ["koe", "kip", "paard", "schaap", "varken", "eten", "honger"],
  "exercises": [
    { "type": "choice",    "prompt_nl": "de koe", "answer_es": "la vaca", "distractors_es": ["el caballo", "la gallina", "el cerdo"] },
    { "type": "translate", "prompt_es": "La vaca come hierba.", "answer_nl": "De koe eet gras.", "accept": ["de koe eet gras"] },
    { "type": "listen",    "audio_nl": "De kip heeft honger.", "answer_nl": "De kip heeft honger." },
    { "type": "assemble",  "prompt_es": "El caballo bebe agua.", "tiles_nl": ["Het", "paard", "drinkt", "water", "melk", "eet"], "answer_nl": "Het paard drinkt water." }
  ]
}
```
Exercise types for v1: `choice`, `translate` (typed), `listen` (audio → type),
`assemble` (word tiles), `match` (pairs). Grader is tolerant: ignore
capitalization, trailing punctuation, and allow 1 typo (Levenshtein ≤ 1) with a
"¡Cuidado con la ortografía!" nudge.

### Dialogue quest (`content/dialogues/quest-gemeente.json`)
```json
{
  "id": "gemeente-land-1",
  "title_es": "Comprar terreno en el ayuntamiento",
  "location": "gemeentehuis",
  "requires": { "unit": 4 },
  "reward": { "munten": 150, "unlock": "landLevel:2" },
  "nodes": [
    {
      "id": "start",
      "npc_nl": "Goedemiddag! Waarmee kan ik u helpen?",
      "npc_es_hint": "¡Buenas tardes! ¿En qué puedo ayudarle?",
      "choices": [
        { "nl": "Ik wil graag land kopen.", "goto": "price", "quality": "best" },
        { "nl": "Land. Kopen. Nu.",         "goto": "rude",  "quality": "ok" }
      ]
    }
  ]
}
```
Dialogue rules: NPC lines always show Dutch first with a tap-to-reveal Spanish
hint (revealing costs nothing — kindness pillar). Player choices are in Dutch;
some nodes require *typing* a response (graded like `translate`). Quests can be
replayed for small rewards; first completion pays the big reward + unlock.

## Game economy (all constants in `game/economy.ts` — never hardcode elsewhere)

Starting balance: 50 munten and a bare 7x8 island — no plots, no buildings,
no animals. Every cell is hers to plough from the first morning, and anything
standing on the farm is something she chose and paid for. (This replaced an
earlier start of 6 plots and a free chicken, and a centred 5x6 meadow that the
gemeente quest used to expand; that quest now pays coins instead.)

**Earning**
- Lesson session (8–12 exercises): 15 munten, +5 perfect bonus
- Daily review session (SRS due words): 10 munten
- Streak multiplier: day 3+ → ×1.25, day 7+ → ×1.5 (cap)
- Farm chore review question answered correctly: 2 munten
- Quest first completion: 100–250 munten + unlock; replay: 20
- Selling harvest/produce: crop-dependent (see crops table)

**Spending**
- Seeds: 5–30 munten; grow times 30 min – 8 h; sell for ~2× seed cost.
  Crop roster mixes both worlds: wortel, tulp, aardappel, tomaat + koffie,
  maïs, banaan (koffie is a prestige crop: expensive seed, long timer, big payout)
- Animals: 100 (kip) – 600 (koe); produce sellable goods on feed cycles.
  On purchase the player names the animal (optional, defaults to species name)
- Buildings/land: quest-gated, 300–1000 munten; includes the arepakraam
  (unlocked via a market quest, passively sells arepas made from maïs)
- Avatar & decor items: 20–200 munten (pure cosmetic sink; include a few
  Colombian decor items — sombrero vueltiao, Colombian flag bunting, mochila)

**Gates**: new course units unlock by XP; big farm upgrades unlock by quests.
Both currencies of progress (munten and XP) come only from Dutch practice, so
farm ambition always routes through learning.

## A1 course outline (units map to quests and farm unlocks)

1. Begroetingen (greetings) → tutorial quest: meet the buurvrouw
2. Getallen & prijzen (numbers, money) → market opens
3. De boerderijdieren (animals) → veehandelaar quest: buy first cow
4. Eten & drinken (food) → new crops unlock
5. Formeel spreken: het gemeentehuis → land expansion quest
6. Kleding & kleuren → kledingwinkel quest: avatar shop opens
7. Familie & wonen → farmhouse upgrade quest
8. Het weer & de seizoenen → weather affects crops (cosmetic v1)
9. De weg vragen (directions) → map/village view unlocks
10. Herhaling & feest (review) → farm festival quest

Use **Flemish-friendly** Dutch (the player lives in Belgium): prefer neutral
standard Dutch, avoid Netherlands-only slang; TTS voice `nl-BE` when available.

## Milestones (build in this order; each must run end-to-end)

1. **M1 — Learning core:** lesson player with all 5 exercise types, grader +
   tests, SRS engine + tests, munten/XP awarded, state persists.
2. **M2 — Farm core:** plot grid, plant/water/harvest with real timers, buy
   seeds, sell harvest, one animal with feed cycle, wilt+revive-by-review.
3. **M3 — Quests:** dialogue engine, gemeente + veehandelaar quests, unlocks.
4. **M4 — Polish:** avatar shop, decor, streaks, PWA install/offline, sound,
   celebration animations, onboarding in Spanish.

## Conventions & guardrails

- TypeScript strict mode; no `any`.
- Pure logic modules get Vitest unit tests (grader, SRS, economy, crop timers).
  Timer logic must be testable via injected `now()` — never call `Date.now()`
  directly inside game logic.
- All player-facing strings live in `content/` or a `strings.es.ts` file —
  never inline Spanish/Dutch text in components.
- Dutch content must include the article for every noun (de/het is a core A1
  difficulty) and be checked for correctness before merging.
- Keep bundle small; no heavy game engines. React + CSS animations suffice.
- Accessibility: all audio has visible text; tap targets ≥ 44px; playable
  entirely without sound.
- Never add: real-money purchases, ads, notifications spam, loss mechanics
  that destroy progress, or English UI text.

## Content authoring workflow

When generating lesson or dialogue content, Claude Code should **draft** the
JSON files and clearly flag them for human review before they are considered
done (e.g., a `"reviewed": false` field per file, surfaced in a dev checklist).
Dutch correctness — especially de/het articles, word order, and formal *u* vs
informal *je* register — must be verified by a human before content ships to
the player. Dialogue quests use formal *u* with officials and shopkeepers she
does not know (gemeente, markt, arepakraam, kledingwinkel, timmerman) and
informal *je* with the people she knows as neighbours — Anke the buurvrouw, and
the veehandelaar, a fellow villager she is on first-name terms with. Each quest
stays in **one** register the whole way through; a shift mid-conversation is the
easiest mistake to make and the easiest for her to pick up wrongly. *u* is
introduced in unit 5, so before then an NPC may *speak* it (she only has to
understand, and the Spanish hint is one tap away) but she is never asked to
*type* it — a quest gated below unit 5 must not require producing *u*.

## Nice-to-haves (only after M4, never blocking)

- Pronunciation practice via `SpeechRecognition`: optional "say it" button on
  word cards; forgiving matching; never required for progress or rewards.
- Simple weather system tied to unit 8 (rain speeds crops slightly).
- A photo frame decor item the player can set to a personal photo (local only).
- Seasonal events (Sinterklaas, Feria de las Flores) as replayable mini-quests.
