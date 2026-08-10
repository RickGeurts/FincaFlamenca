// Build tool: gathers every Dutch string in the game into one document, so the
// human review CLAUDE.md asks for can be done in a single pass instead of by
// reading ten JSON files.
//
//   node scripts/review-sheet.mjs
//
// Writes REVIEW.md. Re-run it after adding content; it is generated, so edits
// belong in the JSON, never here.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const content = resolve(here, "../src/content");
const read = (file) => JSON.parse(readFileSync(file, "utf8"));

const vocab = read(join(content, "vocab/words.json"));
const unitFiles = readdirSync(join(content, "course")).filter((f) => f.endsWith(".json")).sort();
const units = unitFiles.map((f) => read(join(content, "course", f)));
const questFiles = readdirSync(join(content, "dialogues")).filter((f) => f.endsWith(".json")).sort();
const quests = questFiles
  .map((f) => ({ file: f, ...read(join(content, "dialogues", f)) }))
  .sort((a, b) => a.requires.unit - b.requires.unit);

const byId = new Map(vocab.words.map((w) => [w.id, w]));
const withArticle = (w) => (w.article ? `${w.article} ${w.nl}` : w.nl);

const out = [];
const line = (s = "") => out.push(s);

line("# Nakijkblad Nederlands — Finca Flamenca");
line();
line("Gegenereerd met `node scripts/review-sheet.mjs`. **Niet hier corrigeren** —");
line("pas de JSON in `src/content/` aan en genereer opnieuw.");
line();
line("Zet per regel een kruisje als het klopt. Waar het niet klopt: noteer de");
line("correctie ernaast, dan verwerk ik ze in de bronbestanden.");
line();

// ---------------------------------------------------------------------------
// The risky part first: articles.

const nouns = vocab.words.filter((w) => w.article);
const het = nouns.filter((w) => w.article === "het");
const de = nouns.filter((w) => w.article === "de");

line("## 1. Lidwoorden — begin hier");
line();
line(`De/het is de kern van A1 en het makkelijkst mis te hebben. ${nouns.length} zelfstandige`);
line(`naamwoorden: ${de.length}× **de**, ${het.length}× **het**.`);
line();
line(`### De ${het.length} het-woorden (het hoogste risico)`);
line();
line("| ✓ | Nederlands | Spaans | Unit |");
line("| - | ---------- | ------ | ---- |");
for (const w of het) line(`| ☐ | **het ${w.nl}** | ${w.es} | ${w.unit} |`);
line();
line(`### De ${de.length} de-woorden`);
line();
line("| ✓ | Nederlands | Spaans | Unit |");
line("| - | ---------- | ------ | ---- |");
for (const w of de) line(`| ☐ | de ${w.nl} | ${w.es} | ${w.unit} |`);
line();

// ---------------------------------------------------------------------------

const noArticle = vocab.words.filter((w) => !w.article);
line("## 2. Overige woorden");
line();
line("Werkwoorden, bijvoeglijke naamwoorden, getallen en uitdrukkingen.");
line();
line("| ✓ | Nederlands | Spaans | Unit |");
line("| - | ---------- | ------ | ---- |");
for (const w of noArticle) line(`| ☐ | ${w.nl} | ${w.es} | ${w.unit} |`);
line();

// ---------------------------------------------------------------------------
// Whole sentences, where word order and register live.

line("## 3. Zinnen per unit");
line();
line("Hier zitten de woordvolgorde en de u/je-vorm. Let bij unit 5 en 9 vooral");
line("op het formele register.");
line();

for (const unit of units) {
  line(`### Unit ${unit.unit} — ${unit.title_nl} (${unit.title_es})`);
  line();
  line(`Nagekeken: ${unit.reviewed ? "**ja**" : "**nog niet**"}`);
  line();

  const rows = [];
  for (const ex of unit.exercises) {
    if (ex.type === "translate") {
      rows.push([ex.answer_nl, ex.prompt_es, `ook goed: ${(ex.accept ?? []).join(" · ") || "—"}`]);
    } else if (ex.type === "listen") {
      rows.push([ex.audio_nl, "(luisteren)", `getypt antwoord: ${ex.answer_nl}`]);
    } else if (ex.type === "assemble") {
      rows.push([ex.answer_nl, ex.prompt_es, `tegels: ${ex.tiles_nl.join(" · ")}`]);
    }
  }
  if (rows.length === 0) {
    line("_Geen hele zinnen in deze unit._");
    line();
    continue;
  }
  line("| ✓ | Nederlands | Spaans | Let op |");
  line("| - | ---------- | ------ | ------ |");
  for (const [nl, es, note] of rows) line(`| ☐ | ${nl} | ${es} | ${note} |`);
  line();

  // Words this unit teaches but that are not defined anywhere: a content bug,
  // not a language one, so it is worth surfacing while someone is looking.
  const missing = unit.words.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    line(`> ⚠ Onbekende woord-ids in deze unit: ${missing.join(", ")}`);
    line();
  }
}

// ---------------------------------------------------------------------------

line("## 4. Gesprekken — hier zit de u/je-vorm");
line();
line("Elk gesprek staat in één register: **u** bij de ambtenaar, de veehandelaar,");
line("de markt en de winkel; **je** bij Anke de buurvrouw. Eén verschuiving");
line("binnen een gesprek valt meteen op, dus dit is de belangrijkste kolom.");
line();

for (const quest of quests) {
  const informal = quest.nodes.some((n) => / je | jij | jouw |^Je |^Jij /i.test(` ${n.npc_nl} `));
  const formal = quest.nodes.some((n) => / u | uw |^U /i.test(` ${n.npc_nl} `));
  const register = formal && informal ? "**gemengd — nakijken!**" : formal ? "u" : informal ? "je" : "—";

  line(`### ${quest.title_nl} — unit ${quest.requires.unit} (${quest.title_es})`);
  line();
  line(`Plek: ${quest.location} · register: ${register} · nagekeken: ${quest.reviewed ? "**ja**" : "**nog niet**"}`);
  line();
  line("| ✓ | Wie | Nederlands | Spaans |");
  line("| - | --- | ---------- | ------ |");
  for (const node of quest.nodes) {
    line(`| ☐ | NPC | ${node.npc_nl} | ${node.npc_es_hint} |`);
    for (const choice of node.choices ?? []) {
      line(`| ☐ | zij | ${choice.nl} | _(keuze)_ |`);
    }
    if (node.answer_nl) {
      const also = (node.accept ?? []).join(" · ") || "—";
      line(`| ☐ | zij | **${node.answer_nl}** | ${node.ask_es} — ook goed: ${also} |`);
    }
  }
  line();
}

line("## 5. Woordkaarten op de boerderij");
line();
line("Deze woorden verschijnen als je een object op de boerderij aantikt, dus ze");
line("worden gehoord én gelezen zonder dat er een les aan te pas komt.");
line();
line("| ✓ | Nederlands | Spaans |");
line("| - | ---------- | ------ |");
for (const w of vocab.words.filter((w) => w.category === "decor" || w.category === "animals")) {
  line(`| ☐ | ${withArticle(w)} | ${w.es} |`);
}
line();

const pending = [
  ...(vocab.reviewed ? [] : ["vocab/words.json"]),
  ...units.filter((u) => !u.reviewed).map((u) => `course/a1-unit-${String(u.unit).padStart(2, "0")}.json`),
  ...quests.filter((q) => !q.reviewed).map((q) => `dialogues/${q.file}`),
];
line("## Status");
line();
line(
  `${vocab.words.length} woorden · ${units.length} units · ` +
    `${units.reduce((n, u) => n + u.exercises.length, 0)} oefeningen · ${quests.length} gesprekken`,
);
line();
if (pending.length === 0) {
  line("Alles is nagekeken. 🎉");
} else {
  line(`Nog niet nagekeken (${pending.length}):`);
  line();
  for (const file of pending) line(`- \`src/content/${file}\``);
  line();
  line('Zet `"reviewed": true` bovenin een bestand zodra het klopt.');
}
line();

const target = resolve(here, "../REVIEW.md");
writeFileSync(target, out.join("\n"));
console.log(`wrote ${target}`);
console.log(
  `${vocab.words.length} woorden, ${units.length} units, ` +
    `${units.reduce((n, u) => n + u.exercises.length, 0)} oefeningen, ` +
    `${quests.length} gesprekken, ${pending.length} bestanden open`,
);
