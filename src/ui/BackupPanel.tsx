import { useRef, useState } from "react";
import { STRINGS } from "../content/strings.es";
import { exportSave, parseSave, useGameStore } from "../state/store";

type Note = { kind: "ok" | "error"; text: string } | null;

/**
 * Save a copy of the farm to a file, and put one back.
 *
 * The game lives in IndexedDB, which the browser is free to clear when it
 * wants storage back — without an export, a cleared browser means a lost
 * farm, streak and all.
 */
export function BackupPanel() {
  const restoreSave = useGameStore((s) => s.restoreSave);
  const fileInput = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<Note>(null);

  const download = () => {
    const save = exportSave(useGameStore.getState());
    const blob = new Blob([JSON.stringify(save, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finca-flamenca-${save.savedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNote({ kind: "ok", text: STRINGS.backupSaved });
  };

  const upload = async (file: File) => {
    const restored = parseSave(await file.text());
    if (!restored) {
      setNote({ kind: "error", text: STRINGS.backupBadFile });
      return;
    }
    restoreSave(restored);
    setNote({ kind: "ok", text: STRINGS.backupRestored });
  };

  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-extrabold text-farm-700">{STRINGS.backupTitle}</h2>
      <p className="text-sm text-farm-700/70">{STRINGS.backupBody}</p>
      <div className="flex gap-2">
        <button
          onClick={download}
          className="min-h-11 flex-1 rounded-xl bg-farm-600 py-3 font-bold text-white active:bg-farm-700"
        >
          {STRINGS.backupExport}
        </button>
        <button
          onClick={() => fileInput.current?.click()}
          className="min-h-11 flex-1 rounded-xl bg-farm-100 py-3 font-bold text-farm-700 active:bg-farm-200"
        >
          {STRINGS.backupImport}
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Clear it, or picking the same file twice does nothing the second time.
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      {note && (
        <p
          className={`rounded-xl p-3 text-sm font-bold ${
            note.kind === "ok" ? "bg-leaf-100 text-leaf-700" : "bg-amber-100 text-amber-800"
          }`}
        >
          {note.text}
        </p>
      )}
    </section>
  );
}
