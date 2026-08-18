import type { ReactNode } from "react";
import { STRINGS } from "../content/strings.es";

interface Props {
  onClose: () => void;
  children: ReactNode;
}

/** Bottom-sheet style modal, thumb-friendly on a phone. */
export function Modal({ onClose, children }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-full w-full overflow-y-auto rounded-t-3xl bg-farm-50 p-5 pb-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        <button
          onClick={onClose}
          className="mt-4 min-h-11 w-full rounded-xl bg-farm-100 py-2 font-bold text-farm-700"
        >
          {STRINGS.close}
        </button>
      </div>
    </div>
  );
}
