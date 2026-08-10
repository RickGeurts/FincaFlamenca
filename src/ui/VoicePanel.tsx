import { useEffect, useState } from "react";
import { STRINGS } from "../content/strings.es";
import {
  canSpeak,
  dutchVoices,
  getPreferredVoice,
  setPreferredVoice,
  speak,
} from "../utils/speak";

/**
 * Which voice reads the Dutch. The game picks the most natural one it can
 * find, but "most natural" is a guess about a device it cannot hear — so the
 * final say is hers, and every option can be tried on the spot.
 */
export function VoicePanel() {
  const [voices, setVoices] = useState(() => dutchVoices());
  const [chosen, setChosen] = useState<string | undefined>(() => getPreferredVoice());

  // Voices arrive asynchronously in every browser, and often only after the
  // first speech attempt. Listening for the event avoids an empty list.
  useEffect(() => {
    if (!canSpeak()) return;
    const refresh = () => setVoices(dutchVoices());
    refresh();
    speechSynthesis.addEventListener?.("voiceschanged", refresh);
    return () => speechSynthesis.removeEventListener?.("voiceschanged", refresh);
  }, []);

  const pick = (voiceURI: string | null) => {
    setPreferredVoice(voiceURI);
    setChosen(voiceURI ?? undefined);
    speak(STRINGS.voiceSample);
  };

  return (
    <section className="flex flex-col gap-2.5 rounded-[22px] bg-farm-100 p-4">
      <h3 className="font-black text-ink-900">{STRINGS.voiceTitle} 🗣️</h3>

      {voices.length === 0 ? (
        <p className="text-sm font-bold text-ink-500 [text-wrap:pretty]">{STRINGS.voiceNone}</p>
      ) : (
        <>
          <p className="text-sm font-bold text-ink-500 [text-wrap:pretty]">{STRINGS.voiceBody}</p>

          <Row
            label={STRINGS.voiceAuto}
            active={chosen === undefined}
            onPick={() => pick(null)}
          />
          {voices.map((voice) => (
            <Row
              key={voice.voiceURI}
              label={voice.name}
              // She lives in Belgium, so it is worth saying which voice is the
              // one that sounds like her neighbours.
              tag={voice.lang.toLowerCase().startsWith("nl-be") ? STRINGS.voiceFlemish : undefined}
              active={chosen === voice.voiceURI}
              onPick={() => pick(voice.voiceURI)}
            />
          ))}
        </>
      )}
    </section>
  );
}

function Row({
  label,
  tag,
  active,
  onPick,
}: {
  label: string;
  tag?: string;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      aria-pressed={active}
      className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 px-3.5 py-2.5 text-left ${
        active ? "border-leaf-500 bg-white" : "border-farm-200 bg-white"
      }`}
    >
      <span className="flex min-w-0 flex-col leading-[1.25]">
        <span className="truncate text-sm font-black text-ink-900">{label}</span>
        {tag && <span className="text-xs font-bold text-ink-500">{tag}</span>}
      </span>
      <span className="shrink-0 text-xs font-black text-farm-700">{STRINGS.voiceTry}</span>
    </button>
  );
}
