// She plays this alone on a phone, with no console to check. A render error
// must never leave her staring at a blank screen: show a kind Spanish message,
// an obvious way back, and the technical detail underneath for whoever fixes it.

import { Component, type ErrorInfo, type ReactNode } from "react";
import { STRINGS } from "../content/strings.es";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Finca Flamenca crashed:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-extrabold text-farm-700">{STRINGS.errorTitle}</h1>
        <p className="font-bold text-farm-700/80">{STRINGS.errorBody}</p>
        <button
          onClick={() => window.location.reload()}
          className="min-h-11 w-full rounded-xl bg-leaf-500 py-3 font-bold text-white active:bg-leaf-600"
        >
          {STRINGS.errorReload}
        </button>
        <pre className="max-h-40 w-full overflow-auto rounded-xl bg-farm-100 p-3 text-left text-[10px] text-farm-700/70">
          {error.message}
        </pre>
      </div>
    );
  }
}
