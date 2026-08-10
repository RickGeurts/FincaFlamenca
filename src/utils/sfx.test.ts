// The sounds themselves can only be judged by ear. What can be checked is that
// they stay short, quiet and kind — and that muting really means silence.

import { beforeEach, describe, expect, it } from "vitest";
import { SOUNDS, isMuted, play, setMuted, type Sfx } from "./sfx";

const NAMES = Object.keys(SOUNDS) as Sfx[];

describe("the sound set", () => {
  it("keeps every effect short enough to sit under a tap", () => {
    for (const name of NAMES) {
      const end = Math.max(...SOUNDS[name].map((n) => n.at + n.hold));
      expect(end, `${name} runs on for ${end}s`).toBeLessThanOrEqual(0.7);
    }
  });

  it("gives every effect at least one note", () => {
    for (const name of NAMES) {
      expect(SOUNDS[name].length, `${name} is silent`).toBeGreaterThan(0);
    }
  });

  it("plays the notes of an effect in order", () => {
    for (const name of NAMES) {
      const starts = SOUNDS[name].map((n) => n.at);
      expect(starts, `${name} is out of order`).toEqual([...starts].sort((a, b) => a - b));
    }
  });

  it("never scolds: a miss is lower and softer than a hit", () => {
    // A buzzer for a wrong answer would undo the kindness the whole game is
    // built on, so the shape of that sound is pinned here.
    const wrong = SOUNDS.wrong[0];
    const correct = SOUNDS.correct[0];
    expect(wrong.hz).toBeLessThan(correct.hz);
    expect(wrong.gain ?? 0.5).toBeLessThan(correct.gain ?? 0.5);
    expect(SOUNDS.wrong).toHaveLength(1);
  });

  it("rises for anything good", () => {
    for (const name of ["correct", "coin", "harvest", "buy", "celebrate"] as Sfx[]) {
      const notes = SOUNDS[name];
      const pitches = notes.map((n) => n.hz);
      expect(pitches, `${name} does not rise`).toEqual([...pitches].sort((a, b) => a - b));
    }
  });
});

describe("muting", () => {
  beforeEach(() => setMuted(false));

  it("remembers being switched off", () => {
    expect(isMuted()).toBe(false);
    setMuted(true);
    expect(isMuted()).toBe(true);
  });

  it("plays nothing at all while muted", () => {
    setMuted(true);
    for (const name of NAMES) {
      expect(play(name), `${name} played while muted`).toBe(false);
    }
  });

  it("says so rather than throwing where there is no audio at all", () => {
    // Node has no Web Audio, and neither do some locked-down browsers. The
    // game has to carry on regardless.
    setMuted(false);
    expect(() => play("coin")).not.toThrow();
    expect(play("coin")).toBe(false);
  });
});
