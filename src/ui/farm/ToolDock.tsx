import { STRINGS } from "../../content/strings.es";
import type { FarmTool } from "../../state/store";

interface ToolDef {
  id: Exclude<FarmTool, "none">;
  icon: string;
  label: string;
}

const TOOLS: ToolDef[] = [
  { id: "till", icon: "🌾", label: STRINGS.toolTill },
  { id: "seed", icon: "🌱", label: STRINGS.toolSeed },
  { id: "arrange", icon: "✋", label: STRINGS.toolArrange },
];

/**
 * The farm's tools, pinned to the left edge so the scene keeps the whole
 * screen. One tool at a time; tapping the active one puts it away.
 *
 * Note what is *not* here: moving things. Press and hold works whatever tool
 * is selected — «Ordenar» only silences the other tools and reminds her how,
 * because taking that gesture away to put it behind a button would be a step
 * backwards.
 */
export function ToolDock({
  tool,
  onSelect,
  zoomOpen,
  onToggleZoom,
}: {
  tool: FarmTool;
  onSelect: (tool: FarmTool) => void;
  zoomOpen: boolean;
  onToggleZoom: () => void;
}) {
  return (
    <div className="absolute left-3.5 top-24 z-20 flex flex-col gap-2.5 rounded-[22px] bg-farm-50/92 p-2.5 shadow-[0_10px_26px_rgba(90,50,10,.24)]">
      {TOOLS.map((item) => {
        const active = tool === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(active ? "none" : item.id)}
            aria-pressed={active}
            className={`flex w-14 flex-col items-center gap-0.5 rounded-2xl py-2 transition-transform duration-75 active:scale-95 ${
              active ? "bg-leaf-500" : ""
            }`}
          >
            <span className="text-[22px]">{item.icon}</span>
            <span
              className={`text-[10px] font-black ${active ? "text-white" : "text-ink-700"}`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
      <button
        onClick={onToggleZoom}
        aria-pressed={zoomOpen}
        className={`flex w-14 flex-col items-center gap-0.5 rounded-2xl py-2 transition-transform duration-75 active:scale-95 ${
          zoomOpen ? "bg-leaf-500" : ""
        }`}
      >
        <span className="text-[22px]">🔍</span>
        <span className={`text-[10px] font-black ${zoomOpen ? "text-white" : "text-ink-700"}`}>
          {STRINGS.toolZoom}
        </span>
      </button>
    </div>
  );
}
