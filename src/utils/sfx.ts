// Little sounds, made rather than downloaded.
//
// The game must stay playable in silence and the bundle small, so there are no
// audio files: each effect is a couple of notes shaped by the Web Audio API.
// That keeps them warm and short — a chime, not a fanfare — and costs nothing
// to ship.
//
// Nothing here is ever required. Every sound accompanies something that is
// already visible on screen, and the whole lot can be switched off.

/** Muted or not, remembered across sessions. localStorage is for tiny prefs. */
const MUTE_KEY = "finca-muted";

export type Sfx =
  | "tap"
  | "correct"
  | "wrong"
  | "coin"
  | "plant"
  | "harvest"
  | "buy"
  | "celebrate";

interface Note {
  /** Hertz. */
  hz: number;
  /** When it starts, in seconds from the beginning of the effect. */
  at: number;
  /** How long it rings. */
  hold: number;
  /** 0-1, before the shared master level. */
  gain?: number;
  type?: OscillatorType;
}

/**
 * The effects, as notes.
 *
 * They are deliberately consonant with each other: rising thirds for anything
 * good, one soft low note for a miss. A wrong answer must never sound like a
 * buzzer — the game does not scold.
 */
export const SOUNDS: Record<Sfx, Note[]> = {
  tap: [{ hz: 523, at: 0, hold: 0.07, gain: 0.3 }],
  correct: [
    { hz: 659, at: 0, hold: 0.12 },
    { hz: 880, at: 0.09, hold: 0.18 },
  ],
  // Lower, softer, and over quickly: information, not an alarm.
  wrong: [{ hz: 311, at: 0, hold: 0.22, gain: 0.35, type: "sine" }],
  coin: [
    { hz: 988, at: 0, hold: 0.08 },
    { hz: 1319, at: 0.06, hold: 0.14 },
  ],
  plant: [{ hz: 392, at: 0, hold: 0.12, gain: 0.4, type: "triangle" }],
  harvest: [
    { hz: 523, at: 0, hold: 0.1 },
    { hz: 659, at: 0.07, hold: 0.1 },
    { hz: 784, at: 0.14, hold: 0.2 },
  ],
  buy: [
    { hz: 587, at: 0, hold: 0.1 },
    { hz: 784, at: 0.08, hold: 0.16 },
  ],
  celebrate: [
    { hz: 523, at: 0, hold: 0.12 },
    { hz: 659, at: 0.1, hold: 0.12 },
    { hz: 784, at: 0.2, hold: 0.12 },
    { hz: 1047, at: 0.3, hold: 0.3 },
  ],
};

/** Master level. Quiet on purpose: this plays next to a sleeping baby. */
const MASTER = 0.16;

let context: AudioContext | null = null;
let broken = false;

function audio(): AudioContext | null {
  if (broken) return null;
  if (context) return context;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      broken = true;
      return null;
    }
    context = new Ctor();
    return context;
  } catch {
    broken = true;
    return null;
  }
}

/**
 * The switch itself lives in memory; storage is only how it survives a
 * reload. A browser that refuses storage still honours the setting for as
 * long as the game is open, which is the part she would notice.
 */
let muted: boolean | null = null;

export function isMuted(): boolean {
  if (muted === null) {
    try {
      muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      muted = false;
    }
  }
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  try {
    if (next) localStorage.setItem(MUTE_KEY, "1");
    else localStorage.removeItem(MUTE_KEY);
  } catch {
    // Nothing to do: the setting still holds for this session.
  }
}

/**
 * Play an effect. Returns false when nothing was played, which is never worth
 * reporting to her — the thing the sound accompanies happened anyway.
 */
export function play(name: Sfx): boolean {
  if (isMuted()) return false;
  const ctx = audio();
  if (!ctx) return false;
  // Browsers start the context suspended until she has touched the page.
  if (ctx.state === "suspended") void ctx.resume();

  const now = ctx.currentTime;
  for (const note of SOUNDS[name]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.type ?? "triangle";
    osc.frequency.value = note.hz;
    // A quick rise and a soft tail; a square-edged note clicks.
    const level = MASTER * (note.gain ?? 0.5);
    gain.gain.setValueAtTime(0, now + note.at);
    gain.gain.linearRampToValueAtTime(level, now + note.at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.at + note.hold);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + note.at);
    osc.stop(now + note.at + note.hold + 0.02);
  }
  return true;
}
