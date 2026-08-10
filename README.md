# Finca Flamenca

Een boerderijspel dat Nederlands leert, gemaakt als cadeau voor één speler: een
Colombiaanse die in België woont en Nederlands leert op A1-niveau.

De interface is volledig **Spaans**; Nederlands is uitsluitend de doeltaal. Je
verdient munten met Nederlandse lessen en verhaalgesprekken, en geeft die uit
aan je boerderij — gewassen, dieren, weides, decoratie. Beide vormen van
voortgang (munten en XP) komen alleen uit oefenen, dus elke boerderijambitie
loopt via de taal.

Geen echte betalingen, geen advertenties, geen accounts. Het spel draait
volledig in de browser, slaat op in IndexedDB en werkt offline als PWA.

## Draaien

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # Vitest: spellogica, leerlogica, sync-API
npm run build
```

De app heeft geen server nodig om te spelen.

## Optionele synchronisatie

Er is één server (`server/`, plain Node `http` + `pg`) die de savegame bewaart,
zodat een gewiste browser of een nieuwe telefoon de boerderij niet kost. Hij is
opt-in en heeft geen wachtwoorden: een koppelcode ís de identiteit. Staat hij
uit, dan werkt het spel gewoon door — IndexedDB blijft de bron van waarheid en
het spel wacht nooit op het netwerk.

Uitrollen op Railway: zie [DEPLOY.md](DEPLOY.md).

## Opbouw

```
src/
  game/       boerderijsimulatie — pure TypeScript, geen React
  learning/   SRS, lesopbouw, antwoordbeoordeling — pure TypeScript
  quests/     dialoogmotor
  content/    alle lesstof en woorden als JSON
  ui/         React-componenten (o.a. de 3D-boerderij)
  state/      Zustand-stores en opslag
server/       sync-API + statische hosting
```

Spel- en leerlogica staan los van React en hebben unittests; de UI gebruikt ze.
Zo blijven balans, timers en beoordeling toetsbaar. Tijd komt altijd via een
meegegeven `now()`, nooit via `Date.now()` in de logica zelf.

## Lesstof

Alle lesstof staat in `src/content/` als JSON en is zonder code aan te passen.
Elk bestand draagt een `"reviewed"`-vlag: **de Nederlandse teksten wachten nog
op menselijke controle** — vooral de/het-lidwoorden, woordvolgorde en formeel
*u* versus informeel *je*. `REVIEW.md` is de checklist en zet de *het*-woorden
vooraan.

## Beeldmateriaal

De 3D-modellen (`public/models/farm-props.glb`) zijn uitgesneden uit een
aangekochte assetpack met `scripts/extract-farm-props.mjs`; alleen de props die
het spel gebruikt zitten erin. Het platte muntje komt uit een pack dat vrij van
rechten te gebruiken is. Wie de repo kloont heeft de pack zelf nodig om het
uitsnijden opnieuw te draaien.
