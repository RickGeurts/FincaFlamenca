/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // `npm run dev` serves the app; the sync API lives in the Node server.
    // Run `npm start` alongside it (with DATABASE_URL set) to try syncing
    // locally. With nothing listening, calls fail cleanly and the game — which
    // never waits on the network — carries on.
    proxy: {
      "/api": { target: "http://localhost:8080", changeOrigin: true },
    },
  },
  test: {
    environment: "node",
    // The sync server is plain JS with no build step, so its tests live
    // beside it rather than under src.
    include: ["src/**/*.test.ts", "server/**/*.test.js"],
  },
});
