import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { ErrorBoundary } from "./app/ErrorBoundary";
import "./index.css";
import { startSync } from "./state/sync";

// Offline support, production only — in dev a cached shell would mask edits.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // An unavailable service worker must never stop the game from opening.
    });
  });
}

// Pull anything newer from the server, then keep the copy up to date.
void startSync();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
