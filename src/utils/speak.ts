// Dutch text-to-speech via the Web Speech API.
//
// Every device ships several Dutch voices and they are not remotely equal: the
// old rule of "take the first one" landed on whatever the system listed first,
// which on Windows and Android is usually the decades-old formant synthesiser
// that sounds like a robot. The modern neural voices (Edge's "Natural" set,
// Chrome's server-side "Google Nederlands") are on the same list, further down.
//
// So the voice is now chosen on merit, and she can override the choice herself
// from the settings sheet. Degrades gracefully throughout: no speech available
// means the game stays fully playable, and every audio button has visible text.

/** Remembered choice. A single string — localStorage is for tiny prefs only. */
const PREF_KEY = "finca-voice";

export interface VoiceLike {
  name: string;
  lang: string;
  voiceURI: string;
  /** False for server-side voices, which are the good ones. */
  localService: boolean;
}

/**
 * Google's Dutch voice wins outright wherever it exists — a settled decision,
 * not a guess to be outvoted by the weights below. It is Chrome-only and
 * synthesised on Google's servers, so the rest of the ranking still matters:
 * on Safari, or with no connection, it simply is not on the list.
 */
const GOOGLE_WINS = 1000;

/**
 * How good a Dutch voice is likely to sound, higher is better. Negative means
 * "not Dutch, do not use".
 *
 * Below the Google tier the rule is: naturalness first, region second. A
 * neural Netherlands voice is far kinder to a beginner's ear than a robotic
 * Flemish one, and she can still pick Flemish by hand from the settings.
 */
export function voiceScore(voice: VoiceLike): number {
  const lang = voice.lang.toLowerCase().replace("_", "-");
  if (!lang.startsWith("nl")) return -1;

  const name = voice.name.toLowerCase();
  let score = 0;

  if (name.includes("google")) score += GOOGLE_WINS;
  // Microsoft's neural voices announce themselves in their own name; they are
  // the best thing available once Google is off the table.
  if (name.includes("natural") || name.includes("neural")) score += 100;
  // Edge/Windows stream these; same family, same quality.
  if (name.includes("online")) score += 40;
  // Server-side voices beat the local ones as a rule.
  if (!voice.localService) score += 60;
  // Anything still calling itself eSpeak is the robot she complained about.
  if (name.includes("espeak")) score -= 80;

  // She lives in Belgium, so Flemish wins ties.
  if (lang.startsWith("nl-be")) score += 10;

  return score;
}

/** The best Dutch voice on offer, or her own pick when she has made one. */
export function chooseVoice<T extends VoiceLike>(voices: T[], preferredUri?: string): T | null {
  if (preferredUri) {
    const chosen = voices.find((v) => v.voiceURI === preferredUri);
    if (chosen) return chosen;
  }
  let best: T | null = null;
  let bestScore = -1;
  for (const voice of voices) {
    const score = voiceScore(voice);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return bestScore < 0 ? null : best;
}

function readPreference(): string | undefined {
  try {
    return localStorage.getItem(PREF_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Remember which voice she wants. Passing null goes back to the best guess. */
export function setPreferredVoice(voiceURI: string | null): void {
  try {
    if (voiceURI === null) localStorage.removeItem(PREF_KEY);
    else localStorage.setItem(PREF_KEY, voiceURI);
  } catch {
    // A browser refusing storage is not a reason to stop talking.
  }
}

export function getPreferredVoice(): string | undefined {
  return readPreference();
}

/** Every Dutch voice this device can offer, best first, for the picker. */
export function dutchVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === "undefined") return [];
  return speechSynthesis
    .getVoices()
    .filter((v) => voiceScore(v) >= 0)
    .sort((a, b) => voiceScore(b) - voiceScore(a));
}

export function canSpeak(): boolean {
  return typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";
}

/**
 * Speak Dutch text aloud. Returns false if speech is unavailable.
 *
 * Rate defaults to the voice's own natural pace. Stretching a voice out to
 * make it easier to follow is what makes it drawl; the slow replay button on
 * the listening exercise is the place for that, deliberately and only there.
 */
export function speak(text: string, opts: { rate?: number } = {}): boolean {
  if (!canSpeak()) return false;

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = chooseVoice(speechSynthesis.getVoices(), readPreference());
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? "nl-BE";
  utterance.rate = opts.rate ?? 1;
  utterance.pitch = 1;

  // Chrome swallows an utterance queued in the same tick as a cancel, which
  // shows up as a dead button or a clipped first syllable. Only wait when
  // there is actually something to interrupt.
  const interrupting = speechSynthesis.speaking || speechSynthesis.pending;
  speechSynthesis.cancel();
  if (interrupting) setTimeout(() => speechSynthesis.speak(utterance), 60);
  else speechSynthesis.speak(utterance);
  return true;
}
