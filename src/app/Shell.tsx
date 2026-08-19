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
import { canSpeak } from "../utils/speak";
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
import { LookScreen } from "../ui/avatar/LookScreen";
import { Celebration } from "../ui/Celebration";
import { Onboarding } from "../ui/Onboarding";
import { Birthday } from "../ui/Birthday";
import { isBirthday } from "../content/player";
import { Stage } from "./Stage";

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
  const [wardrobe, setWardrobe] = useState(false);
  // A classroom opening is cheered once, not every time the screen redraws.
  const [cheered, setCheered] = useState(false);
  const hydrated = useGameStore((s) => s.hydrated);
  const player = useGameStore((s) => s.player);
  const words = useGameStore((s) => s.words);
  const place = useGameStore((s) => s.place);
  const setPlace = useGameStore((s) => s.setPlace);
  const setMarketCategory = useGameStore((s) => s.setMarketCategory);
  const finishSession = useGameStore((s) => s.finishSession);
  const reviveWiltedCrops = useGameStore((s) => s.reviveWiltedCrops);
  const onboarded = useGameStore((s) => s.onboarded);
  const finishOnboarding = useGameStore((s) => s.finishOnboarding);
  const birthdayGreeted = useGameStore((s) => s.birthdayGreeted);
  const finishBirthday = useGameStore((s) => s.finishBirthday);

  const dueCount = useMemo(
    () => dueWords(Object.values(words), Date.now()).length,
    [words],
  );

  // The gift comes before the instructions: on the day, and once ever.
  if (hydrated && !birthdayGreeted && isBirthday(Date.now())) {
    return (
      <Stage>
        <Birthday name={player.name} onDone={finishBirthday} />
      </Stage>
    );
  }

  if (hydrated && !onboarded) {
    return (
      <Stage>
        <Onboarding onDone={finishOnboarding} />
      </Stage>
    );
  }

  if (!hydrated) {
    return (
      <Stage>
        <div className="flex h-full items-center justify-center font-black text-farm-700">
          {STRINGS.loading}
        </div>
      </Stage>
    );
  }

  const startLesson = (unitNumber: number) => {
    const unit = getUnit(unitNumber);
    if (!unit) return;
    setCheered(false);
    setView({
      name: "session",
      kind: "lesson",
      unit: unitNumber,
      exercises: buildLessonSession(unit, randomRng()),
    });
  };

  const startReview = () => {
    const due = dueWords(Object.values(words), Date.now());
    // Without a voice there is nothing to listen to, so the review never asks
    // her to; the other three ways of asking carry it on their own.
    const exercises = buildReviewSession(due, VOCAB, randomRng(), {
      canListen: canSpeak(),
    });
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
      <Stage>
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
      </Stage>
    );
  }

  if (view.name === "done") {
    const lastUnit = view.summary.kind === "lesson" ? view.summary : null;
    const opened = view.summary.unlockedUnit;
    return (
      <Stage>
        {opened !== undefined && !cheered && (
          <Celebration
            unit={opened}
            title={getUnit(opened)?.title_es ?? ""}
            onClose={() => setCheered(true)}
          />
        )}
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
      </Stage>
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
      <Stage>
        <QuestScreen quest={quest} onLeave={() => setQuestId(null)} />
      </Stage>
    );
  }

  return (
    <Stage>
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
          onOpenWardrobe={() => setWardrobe(true)}
        />
      )}

      {wardrobe && <LookScreen onBack={() => setWardrobe(false)} />}

      {place === "alcaldia" && (
        <QuestPlace onBack={() => setPlace("finca")} onStartQuest={startQuest} />
      )}

      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </Stage>
  );
}
