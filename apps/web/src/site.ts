// Landing-only build (VITE_LANDING_ONLY=1, set by apps/web/vercel.json): the public landing page with no
// server behind it. Every route shows the landing, /api is never called, and the log-in / invite buttons
// become an "Opening soon" note. Drop the flag once the app is served by its own server.
export const LANDING_ONLY = import.meta.env.VITE_LANDING_ONLY === "1";
