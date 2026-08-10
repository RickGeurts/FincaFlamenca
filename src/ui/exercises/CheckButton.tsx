import { STRINGS } from "../../content/strings.es";

export function CheckButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="mt-auto min-h-11 w-full rounded-xl bg-farm-600 py-3 font-bold text-white disabled:opacity-40 active:bg-farm-700"
    >
      {STRINGS.check}
    </button>
  );
}
