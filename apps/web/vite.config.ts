// Dev: Vite on :5173 proxies /api to the server (pnpm server, :3000), so cookies stay same-origin.
// Build: dist/ is served by the server itself (WEB_DIR) in production.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import landingTracks from "./scripts/landing-tracks";

const api = process.env.API_URL ?? "http://127.0.0.1:3000";
const problemsDir = fileURLToPath(new URL("../../problems", import.meta.url));

export default defineConfig({
  plugins: [react(), landingTracks(problemsDir)],
  server: { host: "127.0.0.1", port: 5173, strictPort: true, proxy: { "/api": { target: api, changeOrigin: false } } },
  preview: { host: "127.0.0.1", port: 4173, proxy: { "/api": { target: api } } },
  build: { target: "es2022", chunkSizeWarningLimit: 5000 },
});
