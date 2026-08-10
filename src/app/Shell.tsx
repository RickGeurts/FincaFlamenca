import { useMemo, useState } from "react";
import { STRINGS } from "../content/strings.es";
import { getQuest, getUnit, VOCAB } from "../content";
import type { Exercise } from "../content/types";
import {
  buildLessonSession,
  buildReviewSession,
  buildReviveSession,
} from "../learning/lesson";
import { dueWords } from "../learning/srs";
import { randomRng } from "../utils/rng";
import { useGameStore, type Place, type SessionSummary } from "../state/store";
import { ECONOMY, type SessionKind } from "../game/economy";
import { School } from "../ui/School";
import { Market } from "../ui/market/Market";
import { FarmView } from "../ui/farm/FarmView";
import { LessonPlayer, type LessonResults } from "../ui/LessonPlayer";
import { SessionEnd } from "../ui/SessionEnd";
import { SettingsSheet } from "../ui/SettingsSheet";
import { PlaceRail, type PlaceDef } from "../ui/village/PlaceRail";
import { QuestScreen } from "../ui/quests/QuestScreen";
import { QuestPlace } from "../ui/quests/QuestPlace";

type View =
  | { name: "village" }
  | { name: "session"; kind: SessionKind; unit?: number; exercises: Exercise[] }
  | { name: "done"; summary: SessionSummary };

/** The town hall opens with the quests, which are unit 5 material. */
const ALCALDIA_UNIT = 5;

export function Shell() {
  const [view, setView] = useState<View>({ name: "village" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [questId, setQuestId] = useState<string | null>(null);
  const hydrated = useGameStore((s) => s.hydrated);
  const player = useGameStore((s) => s.player);
  const words = useGameStore((s) => s.words);
  const place = useGameStore((s) => s.place);
  const setPlace = useGameStore((s) => s.setPlace);
  const setMarketCategory = useGameStore((s) => s.setMarketCategory);
  const finishSession = useGameStore((s) => s.finishSession);
  const reviveWiltedCrops = useGameStore((s) => s.reviveWiltedCrops);

  const dueCount = useMemo(
    () => dueWords(Object.values(words), Date.now()).length,
    [words],
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center font-black text-farm-700">
        {STRINGS.loading}
      </div>
    );
  }

  const startLesson = (unitNumber: number) => {
    const unit = getUnit(unitNumber);
    if (!unit) return;
    setView({
      name: "session",
      kind: "lesson",
      unit: unitNumber,
      exercises: buildLessonSession(unit, randomRng()),
    });
  };

  const startReview = () => {
    const due = dueWords(Object.values(words), Date.now());
    const exercises = buildReviewSession(due, VOCAB, randomRng());
    if (exercises.length === 0) return;
    setView({ name: "session", kind: "review", exercises });
  };

  const startRevive = () => {
    const exercises = buildReviveSession(
      Object.values(words),
      VOCAB,
      Date.now(),
      randomRng(),
    );
    if (exercises.length === 0) return;
    setView({ name: "session", kind: "revive", exercises });
  };

  const onSessionFinish = (results: LessonResults) => {
    if (view.name !== "session") return;
    const unit = view.unit !== undefined ? getUnit(view.unit) : undefined;
    const summary = finishSession({
      kind: view.kind,
      unitWords: unit?.words,
      answers: results.answers,
    });
    if (view.kind === "revive") reviveWiltedCrops();
    setView({ name: "done", summary });
  };

  if (view.name === "session") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        <LessonPlayer
          exercises={view.exercises}
          title={
            view.kind === "lesson" && view.unit !== undefined
              ? STRINGS.pathTitle(view.unit)
              : view.kind === "review"
                ? STRINGS.pathReview
                : STRINGS.pathRevive
          }
          reward={
            view.kind === "lesson"
              ? ECONOMY.LESSON_MUNTEN
              : view.kind === "review"
                ? ECONOMY.REVIEW_MUNTEN
                : 0
          }
          onFinish={onSessionFinish}
          onExit={() => setView({ name: "village" })}
        />
      </div>
    );
  }

  if (view.name === "done") {
    const lastUnit = view.summary.kind === "lesson" ? view.summary : null;
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        <SessionEnd
          summary={view.summary}
          onDone={() => {
            setView({ name: "village" });
            setPlace("finca");
          }}
          onAgain={
            // A revive session sends her straight back to her crops; there is
            // nothing to repeat and the farm is the reward.
            lastUnit === null
              ? undefined
              : () => {
                  setView({ name: "village" });
                  setPlace("escuela");
                }
          }
        />
      </div>
    );
  }

  const places: PlaceDef[] = [
    { id: "finca", icon: "🏡" },
    { id: "escuela", icon: "🏫", badge: dueCount },
    { id: "mercado", icon: "🏪" },
    { id: "criadero", icon: "🐮" },
    {
      id: "alcaldia",
      icon: "🏛️",
      // The town hall is the formal-register unit's own place; there is
      // nothing to do there until she has the words for it.
      lockedReason: player.unlockedUnits.includes(ALCALDIA_UNIT)
        ? undefined
        : STRINGS.placeLocked(ALCALDIA_UNIT),
    },
  ];

  const travel = (next: Place) => {
    if (next === "criadero") setMarketCategory("animals");
    if (next === "mercado") setMarketCategory("seeds");
    setPlace(next);
  };

  /** Walk into a conversation, travelling to whoever is holding it. */
  const startQuest = (id: string) => {
    const quest = getQuest(id);
    if (!quest) return;
    setPlace(quest.location === "finca" ? "finca" : quest.location);
    setQuestId(id);
  };

  const quest = questId === null ? undefined : getQuest(questId);
  if (quest) {
    return (
      <div className="relative mx-auto min-h-dvh w-full max-w-md overflow-hidden bg-farm-50">
        <QuestScreen quest={quest} onLeave={() => setQuestId(null)} />
      </div>
    );
  }

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-md overflow-hidden bg-farm-50">
      {place === "finca" && (
        <>
          <FarmView
            onStartRevive={startRevive}
            onSettings={() => setSettingsOpen(true)}
            onStartQuest={startQuest}
          />
          <PlaceRail places={places} current={place} onTravel={travel} />
        </>
      )}

      {place === "escuela" && (
        <School
          player={player}
          words={words}
          dueCount={dueCount}
          onBack={() => setPlace("finca")}
          onStartLesson={startLesson}
          onStartReview={startReview}
          onStartQuest={startQuest}
        />
      )}

      {(place === "mercado" || place === "criadero") && (
        <Market
          breeder={place === "criadero"}
          onBack={() => setPlace("finca")}
          onStartQuest={startQuest}
        />
      )}

      {place === "alcaldia" && (
        <QuestPlace onBack={() => setPlace("finca")} onStartQuest={startQuest} />
      )}

      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
