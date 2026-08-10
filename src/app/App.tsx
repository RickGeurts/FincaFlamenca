import { useMemo, useState } from "react";
import { STRINGS } from "../content/strings.es";
import { getUnit, VOCAB } from "../content";
import type { Exercise } from "../content/types";
import {
  buildLessonSession,
  buildReviewSession,
  buildReviveSession,
} from "../learning/lesson";
import { dueWords } from "../learning/srs";
import { randomRng } from "../utils/rng";
import { useGameStore, type SessionSummary } from "../state/store";
import type { SessionKind } from "../game/economy";
import { Home } from "../ui/Home";
import { FarmView } from "../ui/farm/FarmView";
import { LessonPlayer, type LessonResults } from "../ui/LessonPlayer";
import { SessionEnd } from "../ui/SessionEnd";

type Tab = "farm" | "lessons";

type View =
  | { name: "tabs" }
  | { name: "session"; kind: SessionKind; unit?: number; exercises: Exercise[] }
  | { name: "done"; summary: SessionSummary };

export function App() {
  const [view, setView] = useState<View>({ name: "tabs" });
  const [tab, setTab] = useState<Tab>("farm");
  const hydrated = useGameStore((s) => s.hydrated);
  const player = useGameStore((s) => s.player);
  const words = useGameStore((s) => s.words);
  const finishSession = useGameStore((s) => s.finishSession);
  const reviveWiltedCrops = useGameStore((s) => s.reviveWiltedCrops);

  const dueCount = useMemo(
    () => dueWords(Object.values(words), Date.now()).length,
    [words],
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-farm-700">
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
          onFinish={onSessionFinish}
          onExit={() => setView({ name: "tabs" })}
        />
      </div>
    );
  }

  if (view.name === "done") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        <SessionEnd summary={view.summary} onDone={() => setView({ name: "tabs" })} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="flex items-center justify-between p-4 pb-0">
        <h1 className="text-lg font-extrabold text-farm-700">{STRINGS.appName}</h1>
        <div className="flex gap-3 text-sm font-bold">
          <span title="munten">🪙 {player.munten}</span>
          <span title="XP">⭐ {player.xp}</span>
          <span title="racha">🔥 {player.streak.days}</span>
        </div>
      </header>

      <main className="flex flex-1 flex-col pb-20">
        {tab === "farm" ? (
          <FarmView onStartRevive={startRevive} />
        ) : (
          <Home
            player={player}
            dueCount={dueCount}
            onStartLesson={startLesson}
            onStartReview={startReview}
          />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-farm-200 bg-farm-50">
        <div className="mx-auto flex max-w-md">
          <TabButton
            active={tab === "farm"}
            label={`🌾 ${STRINGS.farmTab}`}
            onClick={() => setTab("farm")}
          />
          <TabButton
            active={tab === "lessons"}
            label={`📚 ${STRINGS.lessonsTab}`}
            onClick={() => setTab("lessons")}
          />
        </div>
      </nav>
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`min-h-14 flex-1 font-bold ${
        active ? "text-farm-700" : "text-farm-700/50"
      }`}
    >
      {label}
    </button>
  );
}
