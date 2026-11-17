// Dev: Vite on :5173 proxies /api to the server (pnpm server, :3000), so cookies stay same-origin.
// Build: dist/ is served by the server itself (WEB_DIR) in production, or alone on Vercel as the
// landing page (vercel.json sets VITE_LANDING_ONLY; see src/site.ts).
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import landingTracks from "./scripts/landing-tracks";

const api = process.env.API_URL ?? "http://127.0.0.1:3000";
// Link previews need an absolute og:image. The server adds APP_URL at runtime; a Vercel build has no
// server, so it is baked in from the production domain Vercel provides at build time.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null;
const problemsDir = fileURLToPath(new URL("../../problems", import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    landingTracks(problemsDir),
    { name: "og-image-url", transformIndexHtml: (html) => (siteUrl ? html.replaceAll('content="/og.png"', `content="${siteUrl}/og.png"`) : html) },
  ],
  server: { host: "127.0.0.1", port: 5173, strictPort: true, proxy: { "/api": { target: api, changeOrigin: false } } },
  preview: { host: "127.0.0.1", port: 4173, proxy: { "/api": { target: api } } },
  build: { target: "es2022", chunkSizeWarningLimit: 5000 },
});
