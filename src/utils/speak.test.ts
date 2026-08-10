// Which Dutch voice the game picks.
//
// This is the difference between the game sounding like a person and sounding
// like a 1990s answering machine, and it cannot be checked by listening from a
// test — so the ranking itself is pinned here, using the real voice names and
// flags the browsers on her devices report.

import { describe, expect, it } from "vitest";
import { chooseVoice, voiceScore, type VoiceLike } from "./speak";

const voice = (
  name: string,
  lang: string,
  localService = true,
): VoiceLike => ({ name, lang, voiceURI: name, localService });

/** What Chrome, Edge and Android actually list, in the order they list it. */
const WINDOWS = [
  voice("Microsoft Frank - Dutch (Netherlands)", "nl-NL"),
  voice("Microsoft Fenna Online (Natural) - Dutch (Netherlands)", "nl-NL", false),
  voice("Microsoft Bart - Dutch (Belgium)", "nl-BE"),
  voice("Google Nederlands", "nl-NL", false),
];

const ANDROID = [
  voice("Nederlands Nederland eSpeak", "nl-NL"),
  voice("Google Nederlands", "nl-NL", false),
];

describe("choosing a voice", () => {
  it("ignores voices that are not Dutch", () => {
    expect(voiceScore(voice("Microsoft Zira - English (United States)", "en-US"))).toBeLessThan(0);
    expect(voiceScore(voice("Mónica", "es-ES"))).toBeLessThan(0);
  });

  it("does not simply take the first one on the list", () => {
    // The bug this replaces: the first Dutch voice was whatever the system
    // happened to list first, which is the oldest one on every platform.
    const picked = chooseVoice(WINDOWS);
    expect(picked?.name).not.toBe(WINDOWS[0].name);
  });

  it("takes Google Nederlands wherever it exists", () => {
    // Settled by the owner: this is the voice the game speaks with.
    expect(chooseVoice(WINDOWS)?.name).toBe("Google Nederlands");
    expect(chooseVoice(ANDROID)?.name).toBe("Google Nederlands");
  });

  it("takes Google even over a neural Flemish voice", () => {
    const flemishNeural = voice("Microsoft Bart Online (Natural) - Dutch (Belgium)", "nl-BE", false);
    const google = voice("Google Nederlands", "nl-NL", false);
    expect(chooseVoice([flemishNeural, google])?.name).toBe("Google Nederlands");
  });

  it("falls back to the most natural voice where Google is absent", () => {
    // Safari has no Google voices at all, and neither does Chrome offline.
    const withoutGoogle = WINDOWS.filter((v) => !v.name.includes("Google"));
    expect(chooseVoice(withoutGoogle)?.name).toContain("Natural");
  });

  it("prefers a server-side voice over a local one", () => {
    const online = voice("Microsoft Fenna Online - Dutch (Netherlands)", "nl-NL", false);
    const local = voice("Microsoft Frank - Dutch (Netherlands)", "nl-NL");
    expect(chooseVoice([local, online])?.name).toContain("Online");
  });

  it("puts the old robot last", () => {
    const robot = voice("Nederlands Nederland eSpeak", "nl-NL");
    const plain = voice("Microsoft Frank - Dutch (Netherlands)", "nl-NL");
    expect(voiceScore(robot)).toBeLessThan(voiceScore(plain));
  });

  it("prefers Flemish when the voices are otherwise equal", () => {
    const belgium = voice("Microsoft Bart - Dutch (Belgium)", "nl-BE");
    const netherlands = voice("Microsoft Frank - Dutch (Netherlands)", "nl-NL");
    expect(chooseVoice([netherlands, belgium])?.lang).toBe("nl-BE");
  });

  it("does not let region beat quality", () => {
    // She lives in Belgium, but a robotic Flemish voice teaches her less than
    // a natural Dutch one. Region is a tiebreaker, not the rule.
    const flatFlemish = voice("Microsoft Bart - Dutch (Belgium)", "nl-BE");
    const naturalDutch = voice("Microsoft Fenna Online (Natural) - Dutch (Netherlands)", "nl-NL", false);
    expect(chooseVoice([flatFlemish, naturalDutch])?.name).toContain("Natural");
  });

  it("honours her own choice over its opinion", () => {
    const picked = chooseVoice(WINDOWS, "Microsoft Bart - Dutch (Belgium)");
    expect(picked?.name).toBe("Microsoft Bart - Dutch (Belgium)");
  });

  it("falls back to the best guess when her choice is gone", () => {
    // Voices disappear between devices and browser updates; a stale preference
    // must not leave the game silent.
    expect(chooseVoice(WINDOWS, "some-voice-from-her-old-phone")?.name).toBe("Google Nederlands");
  });

  it("says so when the device has no Dutch at all", () => {
    expect(chooseVoice([voice("Microsoft Zira", "en-US")])).toBeNull();
    expect(chooseVoice([])).toBeNull();
  });

  it("copes with underscored language tags", () => {
    // Some Android builds report nl_BE rather than nl-BE.
    expect(voiceScore(voice("Nederlands België", "nl_BE"))).toBeGreaterThanOrEqual(0);
  });
});
