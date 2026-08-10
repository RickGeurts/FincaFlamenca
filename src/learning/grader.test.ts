import { describe, expect, it } from "vitest";
import { grade, levenshtein, normalize } from "./grader";

describe("normalize", () => {
  it("lowercases and trims", () => {
    expect(normalize("  De Koe  ")).toBe("de koe");
  });

  it("strips accents", () => {
    expect(normalize("qué")).toBe("que");
    expect(normalize("één")).toBe("een");
  });

  it("removes punctuation anywhere", () => {
    expect(normalize("Ja, dank je wel.")).toBe("ja dank je wel");
    expect(normalize("¡Hola!")).toBe("hola");
  });

  it("collapses whitespace", () => {
    expect(normalize("de   koe  eet")).toBe("de koe eet");
  });
});

describe("levenshtein", () => {
  it("returns 0 for equal strings", () => {
    expect(levenshtein("koe", "koe")).toBe(0);
  });
  it("counts single edits", () => {
    expect(levenshtein("gras", "gres")).toBe(1);
    expect(levenshtein("gras", "grass")).toBe(1);
    expect(levenshtein("gras", "ras")).toBe(1);
  });
  it("counts multiple edits", () => {
    expect(levenshtein("koe", "paard")).toBe(5);
  });
});

describe("grade", () => {
  it("accepts an exact match", () => {
    const r = grade("De koe eet gras.", ["De koe eet gras."]);
    expect(r).toMatchObject({ correct: true, typo: false });
  });

  it("is case and punctuation tolerant", () => {
    const r = grade("de koe eet gras", ["De koe eet gras."]);
    expect(r).toMatchObject({ correct: true, typo: false });
  });

  it("accepts alternative answers", () => {
    const r = grade("ja dankjewel", ["Ja, dank je wel.", "ja dankjewel"]);
    expect(r).toMatchObject({ correct: true, typo: false });
  });

  it("allows one typo with a nudge", () => {
    const r = grade("De koe eet gres", ["De koe eet gras."]);
    expect(r).toMatchObject({ correct: true, typo: true });
  });

  it("rejects two typos", () => {
    const r = grade("De koe iet gres", ["De koe eet gras."]);
    expect(r.correct).toBe(false);
    expect(r.expected).toBe("De koe eet gras.");
  });

  it("gives no typo tolerance to very short answers", () => {
    expect(grade("na", ["ja"]).correct).toBe(false);
    expect(grade("nee", ["nee"]).correct).toBe(true);
  });

  it("is accent tolerant", () => {
    const r = grade("Que", ["qué"]);
    expect(r).toMatchObject({ correct: true, typo: false });
  });
});
