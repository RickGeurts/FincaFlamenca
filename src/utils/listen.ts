// Optional pronunciation practice via the Web Speech API's recogniser.
//
// Strictly progressive enhancement: where the browser has no recogniser the
// button that uses this is never drawn, and nothing here ever earns or costs
// anything. Saying a word out loud is for her own satisfaction, not a gate.

interface RecognitionResultLike {
  0: { transcript: string };
}

interface RecognitionEventLike {
  results: ArrayLike<RecognitionResultLike>;
}

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  abort(): void;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => RecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canListen(): boolean {
  return recognitionCtor() !== null;
}

/**
 * Listen for one short Dutch utterance. Resolves with what was heard, or null
 * if nothing was — a refusal to grant the microphone is not an error worth
 * showing her.
 */
export function listenOnce(lang = "nl-BE"): Promise<string | null> {
  const Ctor = recognitionCtor();
  if (!Ctor) return Promise.resolve(null);

  return new Promise((resolve) => {
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let heard: string | null = null;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(heard);
    };

    recognition.onresult = (event) => {
      heard = event.results[0]?.[0]?.transcript ?? null;
    };
    recognition.onerror = finish;
    recognition.onend = finish;

    try {
      recognition.start();
    } catch {
      finish();
    }
    // A recogniser that never fires anything would leave the button spinning.
    setTimeout(() => {
      recognition.abort();
      finish();
    }, 6000);
  });
}
