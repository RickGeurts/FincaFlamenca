// Sanity checks on the authored content itself: every exercise must grade its
// own answers as correct, and known alternative translations must pass.

import { describe, expect, it } from "vitest";
import { UNITS, VOCAB, WORDS_BY_ID } from "./index";
import { STRINGS } from "./strings.es";
import { gradeExercise } from "../learning/lesson";
import { ANIMAL_SPECIES, CROPS, DECOR, DECOR_CATEGORIES, decorByCategory } from "../game/economy";
import { COLORS, OUTFITS, WEARABLES } from "../game/avatar";

describe("content integrity", () => {
  it("every unit word exists in the vocab", () => {
    for (const unit of UNITS) {
      for (const id of unit.words) {
        expect(WORDS_BY_ID.has(id), `unknown word id "${id}" in unit ${unit.unit}`).toBe(true);
      }
    }
  });

  it("every exercise word reference exists in the vocab", () => {
    for (const unit of UNITS) {
      for (const ex of unit.exercises) {
        const ids =
          ex.type === "match"
            ? ex.pairs.flatMap((p) => (p.word ? [p.word] : []))
            : ex.word
              ? [ex.word]
              : [];
        for (const id of ids) {
          expect(WORDS_BY_ID.has(id), `unknown word id "${id}" in unit ${unit.unit}`).toBe(true);
        }
      }
    }
  });

  it("every farm entity carries a Dutch word that exists in the vocab", () => {
    for (const crop of CROPS) {
      expect(WORDS_BY_ID.has(crop.word), `crop ${crop.id}`).toBe(true);
      expect(WORDS_BY_ID.get(crop.word)?.article, `crop ${crop.id} needs an article`).toBeDefined();
    }
    for (const species of ANIMAL_SPECIES) {
      expect(WORDS_BY_ID.has(species.word), `species ${species.id}`).toBe(true);
      expect(WORDS_BY_ID.has(species.produceWord), `produce of ${species.id}`).toBe(true);
    }
    for (const item of DECOR) {
      expect(WORDS_BY_ID.has(item.word), `decor ${item.id}`).toBe(true);
      expect(WORDS_BY_ID.get(item.word)?.article, `decor ${item.id} needs an article`).toBeDefined();
    }
  });

  it("every shop category is labelled in Spanish and has something in it", () => {
    for (const category of DECOR_CATEGORIES) {
      const label = STRINGS.decorCategories[category as keyof typeof STRINGS.decorCategories];
      expect(label, `category ${category} has no label`).toBeTruthy();
      expect(decorByCategory(category).length, `category ${category} is empty`).toBeGreaterThan(0);
    }
  });

  it("every decoration sits in a known category", () => {
    for (const item of DECOR) {
      expect(DECOR_CATEGORIES, `decor ${item.id}`).toContain(item.category);
    }
  });

  it("lists each category cheapest first, so the affordable things come first", () => {
    for (const category of DECOR_CATEGORIES) {
      const prices = decorByCategory(category).map((d) => d.price);
      expect(prices, `category ${category} is out of order`).toEqual([...prices].sort((a, b) => a - b));
    }
  });

  it("every word in the vocabulary is one she can actually meet", () => {
    // A word she never encounters is dead weight: it inflates the review sheet
    // and asks a human to check Dutch that never reaches the player.
    const taught = new Set<string>();
    for (const unit of UNITS) {
      unit.words.forEach((id) => taught.add(id));
      for (const ex of unit.exercises) {
        if (ex.type === "match") ex.pairs.forEach((p) => p.word && taught.add(p.word));
        else if (ex.word) taught.add(ex.word);
      }
    }
    // Farm entities teach their word through tap-to-learn, without a lesson.
    for (const crop of CROPS) taught.add(crop.word);
    for (const species of ANIMAL_SPECIES) {
      taught.add(species.word);
      taught.add(species.produceWord);
    }
    for (const item of DECOR) taught.add(item.word);
    // ...and so does the wardrobe: a garment, a colour and an outfit each
    // carry a word she meets by wearing it.
    for (const item of WEARABLES) taught.add(item.word);
    for (const colour of COLORS) taught.add(colour.word);
    for (const outfit of OUTFITS) taught.add(outfit.word);

    const unreachable = VOCAB.filter((w) => !taught.has(w.id)).map((w) => w.id);
    expect(unreachable, "unreachable vocabulary").toEqual([]);
  });

  it("vocab ids are unique", () => {
    const ids = VOCAB.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every graded exercise accepts its own canonical answer and alternatives", () => {
    for (const unit of UNITS) {
      for (const ex of unit.exercises) {
        if (ex.type === "choice") {
          expect(gradeExercise(ex, ex.answer_es).correct).toBe(true);
        } else if (ex.type === "translate" || ex.type === "listen") {
          const answers = [ex.answer_nl, ...(ex.accept ?? [])];
          for (const answer of answers) {
            const r = gradeExercise(ex, answer);
            expect(r.correct, `"${answer}" should be accepted`).toBe(true);
            expect(r.typo, `"${answer}" should match without a typo nudge`).toBe(false);
          }
        } else if (ex.type === "assemble") {
          expect(gradeExercise(ex, ex.answer_nl).correct).toBe(true);
          for (const tile of ex.answer_nl.replace(/[.,!?]/g, "").split(" ")) {
            expect(ex.tiles_nl, `tile "${tile}" missing for "${ex.answer_nl}"`).toContain(tile);
          }
        }
      }
    }
  });

  it("gives every object on the farm a sentence for its word card", () => {
    // The card shows the word doing something. A crop or animal she can tap
    // and get no sentence for is a card with a hole in it.
    const shown = new Set<string>([
      ...CROPS.map((c) => c.word),
      ...ANIMAL_SPECIES.flatMap((s) => [s.word, s.produceWord]),
      ...DECOR.map((d) => d.word),
    ]);
    for (const id of shown) {
      const word = WORDS_BY_ID.get(id);
      expect(word?.example_nl, `"${id}" has no example sentence`).toBeTruthy();
      expect(word?.example_es, `"${id}" has no Spanish for its example`).toBeTruthy();
    }
  });

  it("writes example sentences as sentences", () => {
    for (const word of VOCAB) {
      if (!word.example_nl) continue;
      // A full stop, or a question or exclamation mark — an example may ask
      // something ("Welke kleur vind jij mooi?") as long as it is a sentence.
      expect(/[.!?]$/.test(word.example_nl), `${word.id}: "${word.example_nl}"`).toBe(true);
      // The word itself has to actually appear in its own example.
      expect(
        word.example_nl.toLowerCase().includes(word.nl.toLowerCase()),
        `${word.id} is missing from its own example`,
      ).toBe(true);
      expect(word.example_es, `${word.id} has Dutch but no Spanish`).toBeTruthy();
    }
  });

  it("accepts common alternative translations for gracias", () => {
    const ex = UNITS[0].exercises.find(
      (e) => e.type === "translate" && e.prompt_es === "Sí, gracias.",
    );
    expect(ex).toBeDefined();
    expect(gradeExercise(ex!, "Ja, bedankt").correct).toBe(true);
    expect(gradeExercise(ex!, "ja dankjewel").correct).toBe(true);
    expect(gradeExercise(ex!, "Ja, merci!").correct).toBe(true);
  });

  it("accepts 'ik ben' and 'mijn naam is' for me llamo", () => {
    const ex = UNITS[0].exercises.find(
      (e) => e.type === "translate" && e.prompt_es === "Me llamo Ana.",
    );
    expect(ex).toBeDefined();
    expect(gradeExercise(ex!, "Ik ben Ana").correct).toBe(true);
    expect(gradeExercise(ex!, "Mijn naam is Ana").correct).toBe(true);
  });
});
