// Dutch text-to-speech via the Web Speech API, preferring a Flemish (nl-BE)
// voice. Degrades gracefully: returns false when no speech is available, and
// the app must stay fully playable without sound.

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickDutchVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice;
  if (typeof speechSynthesis === "undefined") return (cachedVoice = null);
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null; // not loaded yet — don't cache
  cachedVoice =
    voices.find((v) => v.lang.toLowerCase().startsWith("nl-be")) ??
    voices.find((v) => v.lang.toLowerCase().startsWith("nl")) ??
    null;
  return cachedVoice;
}

if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.addEventListener?.("voiceschanged", () => {
    cachedVoice = undefined;
    pickDutchVoice();
  });
}

export function canSpeak(): boolean {
  return typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";
}

/** Speak Dutch text aloud. Returns false if speech is unavailable. */
export function speak(text: string, opts: { rate?: number } = {}): boolean {
  if (!canSpeak()) return false;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickDutchVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? "nl-BE";
  utterance.rate = opts.rate ?? 0.9;
  speechSynthesis.speak(utterance);
  return true;
}
